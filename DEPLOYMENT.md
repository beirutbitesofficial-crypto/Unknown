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
6. Apply `prisma/rls.sql` with the migration/owner connection after the tables exist.
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
