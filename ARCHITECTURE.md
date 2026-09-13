# Ledgerly SaaS Architecture

## 1. Product boundary

Ledgerly is one shared application serving many independent businesses. A `Business` is the tenant boundary. A `User` is an identity and may belong to one or more businesses through `BusinessMember`, which keeps future multi-business ownership possible without duplicating identities.

The first market is Lebanon, so Arabic/RTL, USD + LBP, configurable USD/LBP rates, customer credit, supplier payables and WhatsApp-oriented workflows are first-class domain concerns rather than afterthoughts.

## 2. Technology baseline

- Next.js App Router + React + TypeScript.
- Tailwind CSS with shadcn-compatible UI primitives.
- PostgreSQL.
- Prisma ORM pinned to the stable v7 line used by the generated client.
- Better Auth with email/password, verification, password reset, sessions and database-backed rate limiting.
- Zod at all untrusted input boundaries.
- Recharts for dashboards.
- Lucide icons.
- PWA manifest from the first release.

## 3. Layering

```text
Browser / PWA
  -> Next.js Server Components / Route Handlers / Server Actions
    -> auth + tenant context + RBAC + subscription entitlement guards
      -> domain services
        -> tenant-scoped Prisma transaction
          -> PostgreSQL + RLS
```

The UI never decides authorization. Client-side feature hiding is convenience only. Every mutation and private read must resolve the authenticated session, active tenant, member role and required permission on the server.

## 4. Tenant isolation

Tenant isolation uses multiple independent controls:

1. Every tenant-owned domain row carries `businessId` where practical.
2. Composite unique constraints include `businessId` for tenant-unique values such as SKU, barcode and invoice number.
3. Repository/service queries always receive a `BusinessContext`; business IDs never come from an untrusted request body.
4. Sensitive operations run through `withTenantTransaction`, which sets PostgreSQL transaction-local `app.current_business_id` and `app.current_user_id`.
5. `prisma/rls.sql` adds PostgreSQL Row Level Security to tenant tables as defense-in-depth.
6. The production runtime database user must not be the migration/table-owner user.

`Business` itself contains platform-level profile metadata and is intentionally not RLS-protected so the super-admin can list accounts without financial access. Private child tables remain isolated.

## 5. Identity and workspace provisioning

Signup is intentionally split:

1. The signup form validates business fields and stores a signed HttpOnly `business_signup_draft` cookie. Passwords are never stored in that draft.
2. Account creation goes directly through Better Auth, preserving its rate-limited client endpoint.
3. Email verification is required.
4. After the first verified sign-in, `ensureBusinessForCurrentUser()` provisions the business once, transactionally.
5. Provisioning creates settings, a Starter trial, system roles, permissions and default expense categories.

Provisioning is idempotent: an existing active membership wins over creating a second tenant.

## 6. Authorization

RBAC is data-driven:

- `Permission`: global stable permission keys (`sales.create`, `profits.view`, etc.).
- `Role`: business-scoped role.
- `RolePermission`: many-to-many role permissions.
- `BusinessMember`: connects user, business and role.

System roles are seeded per business: Owner, Manager, Cashier and Employee. The schema supports custom roles later without redesign.

## 7. Money and exchange rates

Never use floating point for money. PostgreSQL `numeric` / Prisma `Decimal` is used for amounts, prices and rates.

Each monetary record stores its original currency. Cross-currency operations snapshot the configured USD/LBP exchange rate at the moment of the transaction. Historical reporting therefore does not silently change when the owner edits today's exchange rate.

Outstanding debts are current exposures; dashboard conversion of open balances can use the current configured rate while the debt itself remains denominated in its original currency.

## 8. Sales consistency

`createSale()` is one database transaction:

- validates customer belongs to the tenant;
- validates every product/service belongs to the tenant;
- converts item prices into the selected sale currency using a required rate when needed;
- creates immutable sale-item name/type/price/cost snapshots;
- atomically decrements tracked stock and rejects insufficient stock;
- records inventory movements;
- records payments and financial ledger transactions;
- automatically creates a receivable debt for unpaid balances;
- atomically advances the invoice sequence and creates an invoice;
- writes an audit record.

If any step fails, no partial sale survives.

## 9. Financial ledger

`Transaction` is the normalized cash-movement ledger. Sales, expenses and debt payments remain rich domain entities, while the ledger supports consistent cashflow/payment-method reporting. Ledger rows should be voided/reversed rather than physically deleted.

Profit is not equal to revenue. The dashboard computes gross profit from captured sale-item cost snapshots and then subtracts expenses. Missing product costs are surfaced as a data-quality warning.

## 10. Inventory

Products can opt into stock tracking by having a stock quantity; services never use inventory. `InventoryTransaction` is the append-only movement history, while `Product.stockQuantity` is the transactionally maintained current balance for fast reads.

Quantities use decimals to support weighted goods, not only integer units.

## 11. Debts

A single `Debt` model supports:

- `RECEIVABLE`: customer owes the business.
- `PAYABLE`: business owes supplier.

It stores principal, amount paid, remaining balance, currency, due date and status. `DebtPayment` preserves partial-payment history. Sale partial payments create a receivable automatically.

## 12. Subscriptions

Plans are database records. Feature flags and numeric limits are JSON so pricing/packaging can evolve without schema migrations for every commercial change.

`BillingProvider` is a provider-neutral contract. Vendor SDKs must live only in provider adapters. Domain subscription state (`TRIALING`, `ACTIVE`, `GRACE_PERIOD`, etc.) never depends on Stripe/PayPal/another provider's enums.

Entitlements are enforced server-side.


## 13. Vertical modules, websites and add-ons

The core SaaS remains one tenant-isolated application. Industry-specific capabilities are activated as add-ons rather than separate codebases. `AddonPlan` is the platform catalogue and `BusinessAddon` is the tenant subscription state. Active add-ons are merged into server-side entitlements.

Public-facing experiences use one `BusinessWebsite` per business, optional `WebsiteTemplate` and optional `CustomDomain`. The public website reads only published catalog data after resolving the public slug to a tenant and then entering that tenant's RLS context.

Current vertical feature codes are:

- `digitalMenu` for restaurants/cafés;
- `onlineOrdering` for restaurants/cafés;
- `onlineStore` for supermarkets/retail;
- `onlineBooking` for clinics/barbers/salons/service businesses;
- `businessWebsite` for a general hosted website.

Products and services remain the single source of truth. `Product.isPublishedOnline` controls whether an item is exposed publicly, so the owner never maintains a second menu/catalog database.

## 14. Booking engine

`BookingResource` represents the person/resource being booked (doctor, barber, stylist, therapist, consultant). `BookingResourceService` maps existing SERVICE products to resources and can override duration or price. Weekly schedules, buffers and `BookingBlock` support working hours, breaks and time off.

Public availability is generated in the business IANA timezone and converted to UTC for storage. Booking creation re-validates the selected time server-side inside a serializable tenant transaction and rejects overlaps with active bookings or blocks. Client-side availability is never trusted.

## 15. Online ordering/storefront

`OnlineOrder` and `OnlineOrderItem` capture public website orders independently from completed POS sales. The public API recomputes totals from tenant products, rejects unpublished/unavailable items and checks stock at order time. Pending online orders do not mutate inventory yet; inventory remains authoritative when the order is converted into a real sale/fulfilment transaction in the operational workflow.

## 16. Whish and add-on billing

Whish is treated as a billing provider, not embedded into domain logic. The implemented Lebanon-first fallback is manual Whish transfer: the platform presents a configured recipient, records a pending `AddonPayment`, accepts the Whish transaction reference and exposes a platform-admin verification endpoint. Only an approved payment activates the add-on and starts its billing period.

Whish Pay merchant checkout can later be implemented behind the existing billing-provider boundary after merchant onboarding supplies the official API contract and credentials. No guessed vendor endpoint is hardcoded.

## 17. Super-admin privacy

`PlatformAdmin` is separate from business membership. Platform admins can manage account metadata and billing state. Access to private business financial data requires an explicit `BusinessAccessGrant` with:

- scope;
- reason;
- expiry;
- revocation state.

Admin actions must be written to `AdminAuditLog`.

## 18. Localization

Current locale is a cookie (`ar` default, `en` alternative). The root document sets `lang` and `dir`, so Arabic is full-document RTL. Dictionaries are typed and structured so `fr` can be added later without touching business logic.

Business-preferred locale is also persisted in `BusinessSettings`.

## 19. Time

Timestamps are stored in UTC. Each business has an IANA timezone (`Asia/Beirut` by default). Date filters such as “Today” and “This month” are converted from business-local boundaries to UTC before querying.

## 20. Soft deletion and auditability

Customer, supplier, product, sale, expense, debt and membership entities have `deletedAt` where deletion would otherwise damage history. Historical sale-item snapshots remain usable if a product is later archived.

Important mutations create `AuditLog` entries with member, action, entity and metadata.

## 21. PWA and future offline support

The app ships with a web manifest and mobile-first shell. V1 remains online-first. Offline mutations should later use an outbox/sync architecture with idempotency keys rather than blindly caching POST requests.

## 22. Future-safe extension points

- `businessId` model already allows branches to be added under a business later.
- Product/service split supports booking and POS expansion.
- `Transaction` and invoices support accounting integrations.
- Provider abstraction supports Lebanese/local payment integrations later.
- Permissions support attendance/payroll/CRM modules.
- Audit log and immutable snapshots support AI financial explanations without rewriting core records.

## 23. Delivery phases

- Phase 1: architecture, schema, security model — defined here.
- Phase 2: auth, multi-tenancy, RBAC, provisioning — implementation started in this repository.
- Phase 3: onboarding + production dashboard — initial implementation started.
- Phase 4: full CRUD for customers/suppliers/products/inventory/sales/expenses/debts.
- Phase 5: reports, invoice rendering/PDF/CSV/XLSX, WhatsApp tools.
- Phase 6: billing providers, subscription UI, entitlement gates everywhere.
- Phase 7: super-admin UI and support-access grant workflow.
- Phase 8: complete AR/EN copy audit and RTL visual QA.
- Phase 9: PWA polish, security/performance/load review.
- Phase 10: automated end-to-end workflow and regression suite.
