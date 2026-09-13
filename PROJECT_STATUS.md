# Ledgerly — implementation status

## Delivered in this checkpoint

### Phase 1 — Architecture and domain design
- Complete product architecture and tenant-boundary decisions.
- PostgreSQL + Prisma domain schema with 45 models and 30 enums.
- Decimal money model with USD/LBP exchange-rate snapshots.
- Defense-in-depth tenant isolation design including PostgreSQL RLS policies.
- RBAC permission catalogue and default role model.
- Subscription plan/entitlement architecture independent of a billing provider.
- Restricted, audited platform-admin access grant model.

### Phase 2 — Foundation
- Next.js App Router + TypeScript + Tailwind + shadcn-compatible primitives.
- Better Auth email/password flow, email verification, password reset and session handling.
- Database-backed rate limiting.
- Business provisioning, membership, roles, settings and trial subscription.
- Tenant-aware transaction helper and server-side permission checks.
- Arabic/English dictionary structure and RTL/LTR root layout.
- PWA manifest and install icons.

### Phase 3 — First product experience
- Signup and authentication screens.
- Six-step onboarding experience.
- Responsive workspace shell with desktop sidebar and mobile bottom navigation.
- Real-data dashboard with today/month KPIs, debt totals, low stock, best sellers and recent transactions.
- Seven-day sales/expenses/profit chart using business timezone and cost snapshots.
- Empty states instead of seeded production data.


### Vertical business modules added
- Add-on catalogue and per-business add-on subscriptions.
- Whish manual-transfer checkout flow with transaction-reference submission and platform-admin verification endpoint.
- Provider-neutral fields reserved for Whish Pay merchant checkout once merchant credentials/API contract are available.
- Business website record, template catalogue and custom-domain model.
- Category-aware templates for restaurants/cafés, retail/supermarkets and booking businesses.
- Public catalog fed directly from the tenant's existing Product/Service records.
- Per-product online publishing controls.
- Public online-order capture for restaurants/retail with server-side price/stock validation.
- Online Orders workspace and status workflow.
- Booking resources (doctor/barber/stylist/etc.), service assignment, weekly schedules, buffers and blocked-time architecture.
- Public availability endpoint with timezone-aware slots and overlap protection.
- Public booking page and confirmed appointment creation.
- Booking workspace showing resources and appointments.

### Production vertical slice already implemented
- New Sale form and API.
- Atomic sale creation.
- Product/service item snapshots.
- Inventory decrement for products only.
- Inventory movement history.
- Multi-currency payments.
- Partial-payment / pay-later receivable debt creation.
- Invoice record and concurrency-safe invoice numbering.
- Financial transaction entries and audit trail.

## Intentionally not represented as complete yet
The following require additional implementation before a commercial launch:
- Full create/edit/archive flows for customers, suppliers, products, inventory adjustments and expenses.
- Debt repayment workflow and supplier payable creation.
- Invoice HTML/PDF renderer, public share route and WhatsApp action UI.
- Report query/export engine (PDF/CSV/XLSX).
- Employee invite flow and permission editor UI.
- Notification jobs and recurring-expense scheduler.
- Full Whish Pay gateway adapter/webhooks require merchant onboarding credentials/API contract; manual Whish verification flow is implemented.
- Full super-admin UI (the add-on payment verification backend endpoint is implemented).
- Object/file storage adapter for logos, product images and expense receipts.
- Automated integration/E2E tests for the complete acceptance workflow, public ordering and booking collision cases.
- Offline data queue/cache (architecture only; intentionally deferred).

## Validation status
Static source review was completed, including local-import resolution and syntax-level TypeScript parsing. Dependency installation could not finish in the execution environment, so Prisma generation, full dependency-aware TypeScript typecheck, lint and `next build` have **not** been claimed as passed. Run the validation sequence in `DEPLOYMENT.md` in an environment with npm registry access before deploying.
