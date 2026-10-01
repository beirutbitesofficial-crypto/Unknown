/** Normalizes to the digits-only international format wa.me expects (e.g. 9613123456). Local Lebanese numbers get the 961 prefix. */
export function normalizeWhatsappNumber(raw: string) {
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = `961${digits.slice(1)}`;
  else if (digits.length <= 8) digits = `961${digits}`;
  digits = digits.replace(/\D/g, "");
  return /^\d{8,15}$/.test(digits) ? digits : null;
}

/** Click-to-chat link that opens the customer's own WhatsApp on the business number with the booking details pre-filled. */
export function bookingWhatsappLink(input: { to: string; businessName: string; customerName: string; serviceName: string; resourceName: string; startAt: Date; timezone: string; bookingCode: string; notes?: string | null }) {
  const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: input.timezone }).format(input.startAt);
  const lines = [
    `Hello ${input.businessName}, I just booked an appointment:`,
    `Name: ${input.customerName}`,
    `Service: ${input.serviceName}`,
    `With: ${input.resourceName}`,
    `Time: ${when}`,
    `Booking code: ${input.bookingCode}`
  ];
  if (input.notes) lines.push(`Notes: ${input.notes}`);
  return `https://wa.me/${input.to}?text=${encodeURIComponent(lines.join("\n"))}`;
}
