import { PageHeader } from "@/components/shared/page-header";
import { NewSaleForm } from "@/components/sales/new-sale-form";
import { requireBusinessContext } from "@/server/tenancy/context";
import { withTenantTransaction } from "@/server/tenancy/transaction";
import { PERMISSIONS } from "@/server/rbac/permissions";
import { getLocale } from "@/i18n/server";

export default async function NewSalePage() {
  const context = await requireBusinessContext(PERMISSIONS.SALES_CREATE);
  const locale = await getLocale(); const ar = locale === "ar";
  const data = await withTenantTransaction({
    businessId: context.businessId,
    userId: context.userId,
    fn: async (tx) => {
      const [products, customers, settings] = await Promise.all([
        tx.product.findMany({ where: { businessId: context.businessId, isActive: true, deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, type: true, sellingPrice: true, currency: true, stockQuantity: true } }),
        tx.customer.findMany({ where: { businessId: context.businessId, deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, phone: true } }),
        tx.businessSettings.findUniqueOrThrow({ where: { businessId: context.businessId }, select: { defaultCurrency: true, usdToLbpRate: true } })
      ]);
      return { products, customers, settings };
    }
  });

  return <div className="mx-auto max-w-7xl space-y-6"><PageHeader title={ar ? "عملية بيع جديدة" : "New Sale"} description={ar ? "بيع سريع، دفع جزئي أو آجل، مع تحديث المخزون تلقائياً." : "Fast sale with partial/pay-later support and automatic stock updates."} /><NewSaleForm locale={locale} defaultCurrency={data.settings.defaultCurrency} usdToLbpRate={Number(data.settings.usdToLbpRate ?? 0)} products={data.products.map((p) => ({ id: p.id, name: p.name, type: p.type, price: Number(p.sellingPrice), currency: p.currency, stock: p.stockQuantity === null ? null : Number(p.stockQuantity) }))} customers={data.customers} /></div>;
}
