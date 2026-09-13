import { DateTime } from "luxon";
import { Prisma, type Currency } from "@/generated/prisma/client";
import type { BusinessContext } from "@/server/tenancy/context";
import { withTenantTransaction } from "@/server/tenancy/transaction";

const D = (value: Prisma.Decimal | string | number) => new Prisma.Decimal(value);

type MoneyConvertible = {
  amount: Prisma.Decimal;
  currency: Currency;
  rate: Prisma.Decimal | null;
};

function convert({ amount, currency, rate }: MoneyConvertible, target: Currency) {
  if (currency === target) return amount;
  if (!rate || rate.lte(0)) return null;
  return currency === "USD" ? amount.mul(rate) : amount.div(rate);
}

function roundMoney(value: Prisma.Decimal) {
  return value.toDecimalPlaces(2).toString();
}

export async function getDashboardSummary(context: BusinessContext) {
  return withTenantTransaction({
    businessId: context.businessId,
    userId: context.userId,
    fn: async (tx) => {
      const settings = await tx.businessSettings.findUniqueOrThrow({
        where: { businessId: context.businessId },
        select: { defaultCurrency: true, usdToLbpRate: true, timezone: true }
      });

      const now = DateTime.now().setZone(settings.timezone);
      const todayStart = now.startOf("day").toUTC().toJSDate();
      const monthStart = now.startOf("month").toUTC().toJSDate();
      const chartStart = now.startOf("day").minus({ days: 6 }).toUTC().toJSDate();
      const current = new Date();

      const [sales, expenses, receivableDebts, payableDebts, transactionCount, recentTransactions] = await Promise.all([
        tx.sale.findMany({
          where: {
            businessId: context.businessId,
            soldAt: { gte: monthStart, lte: current },
            status: "COMPLETED",
            deletedAt: null
          },
          select: {
            soldAt: true,
            currency: true,
            exchangeRateSnapshot: true,
            total: true,
            taxAmount: true,
            discountAmount: true,
            items: { select: { quantity: true, unitCostSnapshot: true, lineTotal: true } }
          }
        }),
        tx.expense.findMany({
          where: {
            businessId: context.businessId,
            expenseDate: { gte: monthStart, lte: current },
            deletedAt: null
          },
          select: { expenseDate: true, amount: true, currency: true, exchangeRateSnapshot: true }
        }),
        tx.debt.findMany({
          where: {
            businessId: context.businessId,
            direction: "RECEIVABLE",
            status: { in: ["UNPAID", "PARTIALLY_PAID", "OVERDUE"] },
            deletedAt: null
          },
          select: { balanceRemaining: true, currency: true }
        }),
        tx.debt.findMany({
          where: {
            businessId: context.businessId,
            direction: "PAYABLE",
            status: { in: ["UNPAID", "PARTIALLY_PAID", "OVERDUE"] },
            deletedAt: null
          },
          select: { balanceRemaining: true, currency: true }
        }),
        tx.transaction.count({
          where: { businessId: context.businessId, occurredAt: { gte: todayStart, lte: current }, voidedAt: null }
        }),
        tx.transaction.findMany({
          where: { businessId: context.businessId, voidedAt: null },
          orderBy: { occurredAt: "desc" },
          take: 8,
          select: {
            id: true,
            type: true,
            direction: true,
            amount: true,
            currency: true,
            description: true,
            occurredAt: true
          }
        })
      ]);

      let monthRevenue = D(0);
      let todayRevenue = D(0);
      let monthGrossProfit = D(0);
      let todayGrossProfit = D(0);
      let monthExpenses = D(0);
      let todayExpenses = D(0);
      let conversionWarnings = 0;
      let missingCostLines = 0;

      for (const sale of sales) {
        const convertedTotal = convert(
          { amount: sale.total, currency: sale.currency, rate: sale.exchangeRateSnapshot },
          settings.defaultCurrency
        );
        if (!convertedTotal) {
          conversionWarnings += 1;
          continue;
        }

        const isToday = sale.soldAt >= todayStart;
        monthRevenue = monthRevenue.add(convertedTotal);
        if (isToday) todayRevenue = todayRevenue.add(convertedTotal);

        let saleCogs = D(0);
        for (const item of sale.items) {
          if (item.unitCostSnapshot === null) {
            missingCostLines += 1;
            continue;
          }
          saleCogs = saleCogs.add(item.unitCostSnapshot.mul(item.quantity));
        }
        const grossProfitInSaleCurrency = sale.total.sub(sale.taxAmount).sub(saleCogs);
        const convertedProfit = convert(
          { amount: grossProfitInSaleCurrency, currency: sale.currency, rate: sale.exchangeRateSnapshot },
          settings.defaultCurrency
        );
        if (convertedProfit) {
          monthGrossProfit = monthGrossProfit.add(convertedProfit);
          if (isToday) todayGrossProfit = todayGrossProfit.add(convertedProfit);
        }
      }

      for (const expense of expenses) {
        const converted = convert(
          { amount: expense.amount, currency: expense.currency, rate: expense.exchangeRateSnapshot },
          settings.defaultCurrency
        );
        if (!converted) {
          conversionWarnings += 1;
          continue;
        }
        monthExpenses = monthExpenses.add(converted);
        if (expense.expenseDate >= todayStart) todayExpenses = todayExpenses.add(converted);
      }

      const debtToDefault = (amount: Prisma.Decimal, currency: Currency) =>
        convert({ amount, currency, rate: settings.usdToLbpRate }, settings.defaultCurrency);

      let customersOwe = D(0);
      let suppliersOwed = D(0);
      for (const debt of receivableDebts) {
        const converted = debtToDefault(debt.balanceRemaining, debt.currency);
        if (converted) customersOwe = customersOwe.add(converted);
        else conversionWarnings += 1;
      }
      for (const debt of payableDebts) {
        const converted = debtToDefault(debt.balanceRemaining, debt.currency);
        if (converted) suppliersOwed = suppliersOwed.add(converted);
        else conversionWarnings += 1;
      }

      const lowStock = await tx.$queryRaw<Array<{
        id: string;
        name: string;
        stockQuantity: Prisma.Decimal;
        minimumStock: Prisma.Decimal;
      }>>`
        SELECT id, name, "stockQuantity", "minimumStock"
        FROM "Product"
        WHERE "businessId" = ${context.businessId}
          AND type = 'PRODUCT'
          AND "isActive" = true
          AND "deletedAt" IS NULL
          AND "stockQuantity" IS NOT NULL
          AND "minimumStock" IS NOT NULL
          AND "stockQuantity" <= "minimumStock"
        ORDER BY ("minimumStock" - "stockQuantity") DESC
        LIMIT 8
      `;

      const bestSellers = await tx.$queryRaw<Array<{
        name: string;
        quantity: Prisma.Decimal;
      }>>`
        SELECT si."itemNameSnapshot" AS name, SUM(si.quantity) AS quantity
        FROM "SaleItem" si
        JOIN "Sale" s ON s.id = si."saleId"
        WHERE s."businessId" = ${context.businessId}
          AND s.status = 'COMPLETED'
          AND s."deletedAt" IS NULL
          AND s."soldAt" >= ${monthStart}
        GROUP BY si."itemNameSnapshot"
        ORDER BY quantity DESC
        LIMIT 8
      `;

      const chartSales = await tx.sale.findMany({
        where: {
          businessId: context.businessId,
          soldAt: { gte: chartStart, lte: current },
          status: "COMPLETED",
          deletedAt: null
        },
        select: {
          soldAt: true,
          total: true,
          taxAmount: true,
          currency: true,
          exchangeRateSnapshot: true,
          items: { select: { quantity: true, unitCostSnapshot: true } }
        }
      });
      const chartExpenses = await tx.expense.findMany({
        where: { businessId: context.businessId, expenseDate: { gte: chartStart, lte: current }, deletedAt: null },
        select: { expenseDate: true, amount: true, currency: true, exchangeRateSnapshot: true }
      });

      const chart = Array.from({ length: 7 }, (_, index) => {
        const day = now.startOf("day").minus({ days: 6 - index });
        return { key: day.toFormat("yyyy-LL-dd"), label: day.toFormat("ccc"), sales: D(0), expenses: D(0), profit: D(0) };
      });
      const chartMap = new Map(chart.map((d) => [d.key, d]));

      for (const sale of chartSales) {
        const key = DateTime.fromJSDate(sale.soldAt, { zone: "utc" }).setZone(settings.timezone).toFormat("yyyy-LL-dd");
        const day = chartMap.get(key);
        const converted = convert(
          { amount: sale.total, currency: sale.currency, rate: sale.exchangeRateSnapshot },
          settings.defaultCurrency
        );
        if (day && converted) {
          day.sales = day.sales.add(converted);
          let cogs = D(0);
          for (const item of sale.items) {
            if (item.unitCostSnapshot !== null) cogs = cogs.add(item.unitCostSnapshot.mul(item.quantity));
          }
          const convertedProfit = convert(
            { amount: sale.total.sub(sale.taxAmount).sub(cogs), currency: sale.currency, rate: sale.exchangeRateSnapshot },
            settings.defaultCurrency
          );
          if (convertedProfit) day.profit = day.profit.add(convertedProfit);
        }
      }
      for (const expense of chartExpenses) {
        const key = DateTime.fromJSDate(expense.expenseDate, { zone: "utc" }).setZone(settings.timezone).toFormat("yyyy-LL-dd");
        const day = chartMap.get(key);
        const converted = convert(
          { amount: expense.amount, currency: expense.currency, rate: expense.exchangeRateSnapshot },
          settings.defaultCurrency
        );
        if (day && converted) {
          day.expenses = day.expenses.add(converted);
          day.profit = day.profit.sub(converted);
        }
      }

      return {
        currency: settings.defaultCurrency,
        today: {
          sales: roundMoney(todayRevenue),
          expenses: roundMoney(todayExpenses),
          profit: roundMoney(todayGrossProfit.sub(todayExpenses)),
          transactions: transactionCount
        },
        month: {
          revenue: roundMoney(monthRevenue),
          expenses: roundMoney(monthExpenses),
          netProfit: roundMoney(monthGrossProfit.sub(monthExpenses))
        },
        receivables: roundMoney(customersOwe),
        payables: roundMoney(suppliersOwed),
        lowStock: lowStock.map((item) => ({
          id: item.id,
          name: item.name,
          stock: item.stockQuantity.toString(),
          minimum: item.minimumStock.toString()
        })),
        bestSellers: bestSellers.map((item) => ({ name: item.name, quantity: item.quantity.toString() })),
        recentTransactions: recentTransactions.map((item) => ({
          ...item,
          amount: item.amount.toString(),
          occurredAt: item.occurredAt.toISOString()
        })),
        chart: chart.map((day) => ({
          label: day.label,
          sales: Number(roundMoney(day.sales)),
          expenses: Number(roundMoney(day.expenses)),
          profit: Number(roundMoney(day.profit))
        })),
        dataQuality: { conversionWarnings, missingCostLines }
      };
    }
  });
}
