import { env } from "@/lib/env";

/**
 * WhatsApp Cloud API (Meta) adapter for business alerts.
 * Business-initiated messages must use a pre-approved template; free-form text is only
 * delivered inside a 24h customer-service window, so alerts always go through a template.
 */

/** Normalizes to the digits-only international format the Cloud API expects (e.g. 9613123456). Local Lebanese numbers get the 961 prefix. */
export function normalizeWhatsappNumber(raw: string) {
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = `961${digits.slice(1)}`;
  else if (digits.length <= 8) digits = `961${digits}`;
  digits = digits.replace(/\D/g, "");
  return /^\d{8,15}$/.test(digits) ? digits : null;
}

export function isWhatsappConfigured() {
  return Boolean(env.WHATSAPP_CLOUD_PHONE_NUMBER_ID && env.WHATSAPP_CLOUD_ACCESS_TOKEN && env.WHATSAPP_BOOKING_TEMPLATE);
}

export async function sendWhatsappTemplate(input: { to: string; template: string; language: string; bodyParams: string[] }) {
  if (!env.WHATSAPP_CLOUD_PHONE_NUMBER_ID || !env.WHATSAPP_CLOUD_ACCESS_TOKEN) throw new Error("WHATSAPP_NOT_CONFIGURED");
  const url = `https://graph.facebook.com/${env.WHATSAPP_GRAPH_API_VERSION}/${env.WHATSAPP_CLOUD_PHONE_NUMBER_ID}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${env.WHATSAPP_CLOUD_ACCESS_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: input.to,
      type: "template",
      template: {
        name: input.template,
        language: { code: input.language },
        components: [{ type: "body", parameters: input.bodyParams.map((text) => ({ type: "text", text: text.slice(0, 1000) })) }]
      }
    }),
    signal: AbortSignal.timeout(10_000)
  });
  if (!response.ok) throw new Error(`WHATSAPP_SEND_FAILED ${response.status}: ${(await response.text()).slice(0, 500)}`);
}

/** Template body params, in order: {{1}} customer, {{2}} service, {{3}} staff/doctor, {{4}} local date/time, {{5}} customer phone. */
export async function sendBookingWhatsappAlert(input: { to: string; customerName: string; serviceName: string; resourceName: string; startAt: Date; timezone: string; customerPhone: string }) {
  if (!isWhatsappConfigured()) return { sent: false as const, reason: "WHATSAPP_NOT_CONFIGURED" };
  const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: input.timezone }).format(input.startAt);
  await sendWhatsappTemplate({
    to: input.to,
    template: env.WHATSAPP_BOOKING_TEMPLATE!,
    language: env.WHATSAPP_BOOKING_TEMPLATE_LANG,
    bodyParams: [input.customerName, input.serviceName, input.resourceName, when, input.customerPhone]
  });
  return { sent: true as const };
}
