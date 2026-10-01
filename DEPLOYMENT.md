# Deployment / first-run checklist

## Requirements
- Node.js 22.12+
- PostgreSQL 16+ recommended
- Two PostgreSQL roles in production:
  - a migration/owner role
  - a restricted runtime role that does not own tables and does not have `BYPASSRLS`
- SMTP credentials for verification and reset emails

## First run
1. Copy `.env.example` to `.env` and fill all secrets.
2. Install dependencies with `npm install`.
3. Generate Prisma Client: `npm run db:generate`.
4. Create the initial Prisma migration: `npm run db:migrate -- --name init`.
5. Seed permissions and plans: `npm run db:seed`.
6. Apply `prisma/rls.sql` and then `prisma/booking-constraints.sql` with the migration/owner connection after the tables exist. The second file installs `btree_gist` and the `booking_no_overlap` exclusion constraint, so a doctor/staff member can never be double-booked even under concurrent requests.
7. Ensure `DATABASE_URL` uses the restricted runtime PostgreSQL role.
8. Run `npm run typecheck`, `npm run lint`, and `npm run build`.
9. Run acceptance/E2E tests before production traffic.

## Critical production notes
- Never use the table-owner or a `BYPASSRLS` role as the web application's `DATABASE_URL`.
- `MIGRATION_DATABASE_URL` may be privileged; keep it outside the running application environment when possible.
- Put the app behind one trusted reverse proxy/load balancer and configure Better Auth trusted proxy/IP headers for that environment; do not trust arbitrary forwarded-IP headers.
- Use object storage (S3-compatible or equivalent) for user files rather than local disk.
- Run database backups with point-in-time recovery if supported by the managed PostgreSQL provider.
- Add observability (structured logs, error tracking, uptime checks) before public launch.


## Whish add-on billing
For the implemented manual Whish transfer flow, set `WHISH_MERCHANT_RECIPIENT` to the platform merchant phone/account shown to businesses at checkout. `WHISH_PAY_API_URL` and `WHISH_PAY_API_KEY` are reserved for the official Whish Pay merchant API after onboarding; do not guess or hardcode undocumented endpoints. Manual transfers remain pending until a platform admin verifies the submitted transaction reference.


## WhatsApp booking alerts
Every confirmed online booking sends a WhatsApp message to the number the business saves under **Bookings → WhatsApp alerts**. Delivery uses the official WhatsApp Cloud API (Meta) and runs after the booking commits, so an outage never blocks a booking.

1. In Meta Business Manager, create a WhatsApp Business app and register the sending phone number. Put its phone-number ID and a permanent system-user access token in `WHATSAPP_CLOUD_PHONE_NUMBER_ID` / `WHATSAPP_CLOUD_ACCESS_TOKEN`.
2. Create and get approval for a **Utility** message template (business-initiated messages must use a template) with exactly five body variables, for example:
   `New booking: {{1}} booked {{2}} with {{3}} on {{4}}. Patient phone: {{5}}`
   Variables are: customer name, service, staff/doctor, local date/time, customer phone.
3. Set `WHATSAPP_BOOKING_TEMPLATE` to the template name and `WHATSAPP_BOOKING_TEMPLATE_LANG` to its language code (e.g. `en`, `ar`).
4. The business owner enters their number (local Lebanese format such as `03 123 456` is normalized to `+9613123456`).
