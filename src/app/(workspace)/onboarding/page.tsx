import { Check, Circle, PackagePlus, UsersRound } from "lucide-react";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ensureBusinessForCurrentUser } from "@/server/services/ensure-business";
import { requireBusinessContext } from "@/server/tenancy/context";
import { withTenantTransaction } from "@/server/tenancy/transaction";
import { getI18n } from "@/i18n/server";

const onboardingSchema = z.object({
  usdToLbpRate: z.coerce.number().positive(),
  productName: z.string().trim().max(120).optional(),
  productType: z.enum(["PRODUCT", "SERVICE"]).default("PRODUCT"),
  productPrice: z.coerce.number().positive().optional(),
  productCurrency: z.enum(["USD", "LBP"]).default("USD"),
  stockQuantity: z.coerce.number().nonnegative().optional()
}).superRefine((value, ctx) => {
  if (value.productName && !value.productPrice) {
    ctx.addIssue({ code: "custom", path: ["productPrice"], message: "Price is required when adding a product." });
  }
});

export default async function OnboardingPage() {
  await ensureBusinessForCurrentUser();
  const context = await requireBusinessContext();
  const { locale } = await getI18n();
  const ar = locale === "ar";

  const current = await withTenantTransaction({
    businessId: context.businessId,
    userId: context.userId,
    fn: async (tx) => {
      const [business, settings] = await Promise.all([
        tx.business.findUniqueOrThrow({ where: { id: context.businessId }, select: { name: true, category: true, phone: true, onboardingCompletedAt: true } }),
        tx.businessSettings.findUniqueOrThrow({ where: { businessId: context.businessId }, select: { defaultCurrency: true, usdToLbpRate: true } })
      ]);
      return { business, settings };
    }
  });

  if (current.business.onboardingCompletedAt) redirect("/dashboard");

  async function finishOnboarding(formData: FormData) {
    "use server";
    const context = await requireBusinessContext();
    const raw = {
      usdToLbpRate: formData.get("usdToLbpRate"),
      productName: String(formData.get("productName") ?? "").trim() || undefined,
      productType: formData.get("productType"),
      productPrice: String(formData.get("productPrice") ?? "").trim() || undefined,
      productCurrency: formData.get("productCurrency"),
      stockQuantity: String(formData.get("stockQuantity") ?? "").trim() || undefined
    };
    const parsed = onboardingSchema.parse(raw);

    await withTenantTransaction({
      businessId: context.businessId,
      userId: context.userId,
      fn: async (tx) => {
        await tx.businessSettings.update({
          where: { businessId: context.businessId },
          data: { usdToLbpRate: parsed.usdToLbpRate }
        });

        if (parsed.productName && parsed.productPrice) {
          await tx.product.create({
            data: {
              businessId: context.businessId,
              name: parsed.productName,
              type: parsed.productType,
              sellingPrice: parsed.productPrice,
              currency: parsed.productCurrency,
              stockQuantity: parsed.productType === "PRODUCT" ? (parsed.stockQuantity ?? 0) : null,
              minimumStock: parsed.productType === "PRODUCT" ? 0 : null
            }
          });
        }

        await tx.business.update({
          where: { id: context.businessId },
          data: { onboardingCompletedAt: new Date() }
        });

        await tx.auditLog.create({
          data: {
            businessId: context.businessId,
            memberId: context.memberId,
            action: "business.onboarding_completed",
            entityType: "Business",
            entityId: context.businessId
          }
        });
      }
    });
    redirect("/dashboard");
  }

  const steps = [
    [ar ? "معلومات العمل" : "Business information", `${current.business.name} · ${current.business.phone ?? "—"}`, true],
    [ar ? "نوع العمل" : "Business category", current.business.category, true],
    [ar ? "العملة وسعر الصرف" : "Currency & exchange rate", current.settings.defaultCurrency, Boolean(current.settings.usdToLbpRate)],
    [ar ? "أول منتج أو خدمة" : "First product or service", ar ? "اختياري" : "Optional", false],
    [ar ? "الموظفون" : "Employees", ar ? "اختياري — فيك تضيفن لاحقاً" : "Optional — add them later", false],
    [ar ? "لوحة التحكم" : "Dashboard", ar ? "جاهزة بعد الإنهاء" : "Ready after setup", false]
  ] as const;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-slate-500">{ar ? "إعداد الحساب" : "Workspace setup"}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{ar ? "خلّينا نجهّز شغلك" : "Let’s set up your business"}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{ar ? "المعلومات الأساسية محفوظة. ضيف سعر الصرف الحالي، وإذا بتحب أول منتج أو خدمة، وبعدها بتفوت عالداشبورد." : "Your basics are saved. Set the current exchange rate, optionally add your first product or service, then open the dashboard."}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {steps.map(([title, description, done], index) => (
          <Card key={title}>
            <CardContent className="flex items-start gap-3 pt-5">
              <span className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{done ? <Check className="size-4" /> : <Circle className="size-4" />}</span>
              <div><p className="text-sm font-semibold">{index + 1}. {title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{description}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <form action={finishOnboarding} className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{ar ? "سعر صرف الدولار" : "USD / LBP exchange rate"}</CardTitle></CardHeader>
          <CardContent>
            <Label htmlFor="usdToLbpRate">{ar ? "1 USD = كم ليرة لبنانية؟" : "1 USD equals how many LBP?"}</Label>
            <Input id="usdToLbpRate" name="usdToLbpRate" inputMode="decimal" type="number" step="0.0001" min="0.0001" defaultValue={current.settings.usdToLbpRate?.toString() ?? ""} required />
            <p className="mt-2 text-xs leading-5 text-slate-500">{ar ? "إنت بتحدد السعر وبتقدر تغيّره بأي وقت. كل عملية بتحفظ السعر المستخدم وقتها." : "You control this rate and can change it anytime. Each transaction stores the rate used at that moment."}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><PackagePlus className="size-4" />{ar ? "أول منتج أو خدمة (اختياري)" : "First product/service (optional)"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>{ar ? "الاسم" : "Name"}</Label><Input name="productName" placeholder={ar ? "مثلاً: قهوة لاتيه" : "e.g. Latte"} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{ar ? "النوع" : "Type"}</Label><Select name="productType"><option value="PRODUCT">{ar ? "منتج" : "Product"}</option><option value="SERVICE">{ar ? "خدمة" : "Service"}</option></Select></div>
              <div><Label>{ar ? "العملة" : "Currency"}</Label><Select name="productCurrency" defaultValue={current.settings.defaultCurrency}><option value="USD">USD</option><option value="LBP">LBP</option></Select></div>
            </div>
            <div className="grid grid-cols-2 gap-3"><div><Label>{ar ? "السعر" : "Price"}</Label><Input name="productPrice" type="number" min="0" step="0.0001" /></div><div><Label>{ar ? "المخزون" : "Stock"}</Label><Input name="stockQuantity" type="number" min="0" step="0.001" /></div></div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3"><span className="rounded-xl bg-slate-100 p-2"><UsersRound className="size-5" /></span><div><p className="font-semibold">{ar ? "الموظفون" : "Employees"}</p><p className="mt-1 text-sm text-slate-500">{ar ? "تقدر تضيف الموظفين وتحدد صلاحياتهم بعد ما تفوت. ما في داعي توقف الإعداد هون." : "You can invite employees and assign permissions after setup. This step is optional."}</p></div></div>
            <Button type="submit" size="lg">{ar ? "إنهاء وفتح لوحة التحكم" : "Finish & open dashboard"}</Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
