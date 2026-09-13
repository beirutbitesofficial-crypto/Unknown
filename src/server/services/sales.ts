import { Prisma, type Currency } from "@/generated/prisma/client";
import { withTenantTransaction } from "@/server/tenancy/transaction";
import type { BusinessContext } from "@/server/tenancy/context";
import type { CreateSaleInput } from "@/lib/validation/sale";

const D = (value: Prisma.Decimal | string | number) => new Prisma.Decimal(value);

function convertCurrency(
  amount: Prisma.Decimal,
  from: Currency,
  to: Currency,
  usdToLbpRate: Prisma.Decimal | null
) {
  if (from === to) return amount;
  if (!usdToLbpRate || usdToLbpRate.lte(0)) {
    throw new Error("USD/LBP exchange rate must be configured before a cross-currency transaction.");
  }
  return from === "USD" ? amount.mul(usdToLbpRate) : amount.div(usdToLbpRate);
}

export async function createSale(context: BusinessContext, input: CreateSaleInput) {
  return withTenantTransaction({
    businessId: context.businessId,
    userId: context.userId,
    fn: async (tx) => {
      const settings = await tx.businessSettings.findUnique({
        where: { businessId: context.businessId },
        select: {
          usdToLbpRate: true,
          taxEnabled: true,
          taxRatePercent: true,
          invoicePrefix: true,
          invoiceNextNumber: true
        }
      });
      if (!settings) throw new Error("Business settings are missing.");

      if (input.customerId) {
        const customer = await tx.customer.findFirst({
          where: { id: input.customerId, businessId: context.businessId, deletedAt: null },
          select: { id: true }
        });
        if (!customer) throw new Error("Customer not found in this business.");
      }

      const ids = [...new Set(input.items.map((item) => item.productId))];
      const products = await tx.product.findMany({
        where: {
          businessId: context.businessId,
          id: { in: ids },
          isActive: true,
          deletedAt: null
        }
      });
      if (products.length !== ids.length) throw new Error("One or more products/services are unavailable.");
      const byId = new Map(products.map((p) => [p.id, p]));

      let subtotal = D(0);
      const lines = input.items.map((item) => {
        const product = byId.get(item.productId)!;
        const quantity = D(item.quantity);
        if (quantity.lte(0)) throw new Error("Quantity must be greater than zero.");
        const unitPrice = convertCurrency(product.sellingPrice, product.currency, input.currency, settings.usdToLbpRate);
        const lineTotal = unitPrice.mul(quantity);
        subtotal = subtotal.add(lineTotal);
        return { product, quantity, unitPrice, lineTotal };
      });

      const discount = D(input.discountAmount);
      if (discount.lt(0) || discount.gt(subtotal)) throw new Error("Invalid discount amount.");
      const taxable = subtotal.sub(discount);
      const taxRate = settings.taxEnabled && settings.taxRatePercent ? settings.taxRatePercent : D(0);
      const taxAmount = taxable.mul(taxRate).div(100);
      const total = taxable.add(taxAmount);

      let paidInSaleCurrency = D(0);
      for (const payment of input.payments) {
        paidInSaleCurrency = paidInSaleCurrency.add(
          convertCurrency(D(payment.amount), payment.currency, input.currency, settings.usdToLbpRate)
        );
      }
      if (paidInSaleCurrency.gt(total)) throw new Error("Payments cannot exceed the sale total.");

      const balanceDue = total.sub(paidInSaleCurrency);
      if (balanceDue.gt(0) && !input.customerId) {
        throw new Error("A customer is required when any amount will remain unpaid.");
      }

      const paymentStatus = balanceDue.eq(0)
        ? "PAID"
        : paidInSaleCurrency.eq(0)
          ? "UNPAID"
          : "PARTIALLY_PAID";

      const sale = await tx.sale.create({
        data: {
          businessId: context.businessId,
          customerId: input.customerId ?? null,
          createdByMemberId: context.memberId,
          status: "COMPLETED",
          paymentStatus,
          currency: input.currency,
          exchangeRateSnapshot: settings.usdToLbpRate,
          subtotal,
          discountAmount: discount,
          taxAmount,
          total,
          amountPaid: paidInSaleCurrency,
          balanceDue,
          notes: input.notes,
          items: {
            create: lines.map(({ product, quantity, unitPrice, lineTotal }) => ({
              productId: product.id,
              itemNameSnapshot: product.name,
              itemTypeSnapshot: product.type,
              itemCurrencySnapshot: product.currency,
              exchangeRateSnapshot: product.currency === input.currency ? null : settings.usdToLbpRate,
              quantity,
              unitPrice,
              unitCostSnapshot: product.cost
                ? convertCurrency(product.cost, product.currency, input.currency, settings.usdToLbpRate)
                : null,
              lineTotal
            }))
          }
        }
      });

      for (const { product, quantity } of lines) {
        if (product.type !== "PRODUCT" || product.stockQuantity === null) continue;

        const changed = await tx.product.updateMany({
          where: {
            id: product.id,
            businessId: context.businessId,
            stockQuantity: { gte: quantity },
            deletedAt: null
          },
          data: { stockQuantity: { decrement: quantity } }
        });
        if (changed.count !== 1) throw new Error(`Insufficient stock for ${product.name}.`);

        const updated = await tx.product.findUniqueOrThrow({
          where: { id: product.id },
          select: { stockQuantity: true }
        });
        const after = updated.stockQuantity ?? D(0);

        await tx.inventoryTransaction.create({
          data: {
            businessId: context.businessId,
            productId: product.id,
            type: "SALE",
            quantityDelta: quantity.neg(),
            quantityBefore: after.add(quantity),
            quantityAfter: after,
            unitCost: product.cost,
            currency: product.currency,
            referenceSaleId: sale.id,
            createdByMemberId: context.memberId
          }
        });
      }

      for (const payment of input.payments) {
        const paymentAmount = D(payment.amount);
        await tx.payment.create({
          data: {
            businessId: context.businessId,
            saleId: sale.id,
            amount: paymentAmount,
            currency: payment.currency,
            exchangeRateSnapshot: settings.usdToLbpRate,
            method: payment.method,
            reference: payment.reference
          }
        });
        await tx.transaction.create({
          data: {
            businessId: context.businessId,
            createdByMemberId: context.memberId,
            saleId: sale.id,
            type: "SALE_PAYMENT",
            direction: "IN",
            amount: paymentAmount,
            currency: payment.currency,
            exchangeRateSnapshot: settings.usdToLbpRate,
            paymentMethod: payment.method,
            description: `Payment for sale ${sale.id}`
          }
        });
      }

      if (balanceDue.gt(0)) {
        await tx.debt.create({
          data: {
            businessId: context.businessId,
            direction: "RECEIVABLE",
            customerId: input.customerId!,
            sourceSaleId: sale.id,
            principalAmount: balanceDue,
            balanceRemaining: balanceDue,
            currency: input.currency,
            status: paidInSaleCurrency.eq(0) ? "UNPAID" : "PARTIALLY_PAID",
            debtDate: sale.soldAt
          }
        });
      }

      const bumpedSettings = await tx.businessSettings.update({
        where: { businessId: context.businessId },
        data: { invoiceNextNumber: { increment: 1 } },
        select: { invoiceNextNumber: true }
      });
      const usedNumber = bumpedSettings.invoiceNextNumber - 1;
      const invoiceNumber = `${settings.invoicePrefix}-${String(usedNumber).padStart(6, "0")}`;

      const invoice = await tx.invoice.create({
        data: {
          businessId: context.businessId,
          saleId: sale.id,
          invoiceNumber,
          status: "ISSUED",
          shareToken: crypto.randomUUID().replaceAll("-", "")
        }
      });

      await tx.auditLog.create({
        data: {
          businessId: context.businessId,
          memberId: context.memberId,
          action: "sale.created",
          entityType: "Sale",
          entityId: sale.id,
          metadata: { invoiceNumber, paymentStatus }
        }
      });

      return {
        saleId: sale.id,
        invoiceId: invoice.id,
        invoiceNumber,
        total: total.toString(),
        amountPaid: paidInSaleCurrency.toString(),
        balanceDue: balanceDue.toString(),
        paymentStatus
      };
    }
  });
}
