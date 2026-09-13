# Ledgerly

Production-oriented multi-tenant SaaS foundation for Lebanese SMBs: sales, USD/LBP, debts, expenses, inventory, invoices, staff permissions and subscription architecture.

## Current checkpoint

This repository contains the Phase 1 architecture and a substantial Phase 2 foundation, plus the first Phase 3 pieces:

- complete commercial domain schema;
- Better Auth wiring with email verification/reset and database-backed rate limiting;
- signed signup-to-business provisioning flow;
- tenant context + RBAC;
- PostgreSQL RLS policy script;
- one $10/month Business OS subscription with optional paid add-ons;
- provider-neutral billing interface;
- transactional sale service (payments, debt, stock, invoice, ledger, audit);
- Arabic/English document direction and dictionaries;
- onboarding flow with configurable USD/LBP rate;
- real-data responsive dashboard and PWA manifest.

The remaining CRUD/reporting/admin/payment-provider screens are intentionally tracked as later phases rather than represented by fake production functionality.

## Local setup

1. Use Node 22+ and PostgreSQL.
2. Copy `.env.example` to `.env` and configure database + SMTP.
3. Install dependencies: `npm install`.
4. Generate client: `npm run db:generate`.
5. Create migration: `npm run db:migrate -- --name init`.
6. Seed global permissions, the $10 core plan and add-ons: `npm run db:seed`.
7. Apply `prisma/rls.sql` with the migration/table-owner database role.
8. Run the application with the non-owner runtime `DATABASE_URL`: `npm run dev`.

For production, use `MIGRATION_DATABASE_URL` for schema migrations and a separate restricted `DATABASE_URL` for the web app.

## Important deployment requirement

Do not deploy with the table-owner PostgreSQL role as the runtime user. Forced RLS is a defense layer only when runtime credentials are appropriately restricted.

See `ARCHITECTURE.md` and `SECURITY.md` before extending the system.

## Project checkpoint
See `PROJECT_STATUS.md` for the exact implementation boundary and `DEPLOYMENT.md` for the first-run and production checklist.


## Vertical add-ons
The same tenant workspace can activate public-facing modules without a separate application: Digital Menu, Online Ordering, Online Store, Online Booking and Business Website. The current implementation includes public catalog/order routes, clinic/barber-style booking resources and availability, website templates, add-on pricing, and a manual Whish payment-verification flow. See `ARCHITECTURE.md` and `PROJECT_STATUS.md` for boundaries and launch status.


## Commercial pricing

The commercial model is intentionally simple:

- **Business OS:** $10/month per business workspace after a 14-day trial.
- **Digital Menu:** +$5/month.
- **Online Ordering:** +$10/month.
- **Online Store:** +$15/month.
- **Online Booking:** +$8/month.
- **Business Website:** +$10/month.

There are no Starter/Pro/Business tiers. Core ERP features live in the single base subscription; vertical public-facing services are optional add-ons.
