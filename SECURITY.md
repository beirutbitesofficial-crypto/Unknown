# Security model

## Non-negotiable rules

- Never accept `businessId`, `memberId`, role or permission claims from the client as authority.
- Resolve tenant context from the authenticated user + server-side membership.
- Every private domain query is tenant-scoped.
- Financial writes run inside a tenant-bound database transaction.
- Runtime DB credentials are separate from migration-owner credentials.
- Enable and force PostgreSQL RLS using `prisma/rls.sql` after the base migration.
- Do not disable RLS to solve an application bug.
- Do not hard-delete posted financial history; void/reverse it.
- Do not use JavaScript `number` for stored monetary arithmetic.
- Never log passwords, auth tokens, reset tokens or full payment-provider secrets.

## Web security

- Better Auth owns password hashing and session handling.
- Email verification is required.
- Better Auth rate limits are database-backed for multi-instance deployments.
- Mutating custom endpoints validate the browser `Origin` where relevant.
- Cookies use HttpOnly/SameSite/Secure where applicable.
- Zod validates untrusted payloads.
- Security headers are configured in `next.config.ts`.

A production deployment should also add a strict Content-Security-Policy tailored to the chosen storage, analytics and billing hosts rather than using a generic permissive CSP.

## Super-admin

Business metadata access is not equivalent to financial access. Financial support access requires a scoped, expiring grant and must be audited.
