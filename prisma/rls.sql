-- Apply AFTER Prisma migrations using the table-owner/migration role.
-- Runtime DATABASE_URL should use a separate non-owner application role.
-- These policies are defense-in-depth in addition to server authorization.

CREATE OR REPLACE FUNCTION app_business_id() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_business_id', true), '')
$$;

CREATE OR REPLACE FUNCTION app_user_id() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')
$$;

-- Direct business-scoped tables.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'BusinessSettings','Role','Category','Customer','Supplier','Product',
    'InventoryTransaction','Sale','Payment','Expense','Debt','DebtPayment',
    'Invoice','Transaction','Subscription','Notification','AuditLog',
    'BusinessAddon','AddonPayment','OnlineOrder','BookingResource',
    'BookingResourceService','Booking','BookingBlock'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING ("businessId" = app_business_id()) WITH CHECK ("businessId" = app_business_id())',
      t
    );
  END LOOP;
END $$;

-- A user may discover only their own memberships before a business is selected.
ALTER TABLE "BusinessMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BusinessMember" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS membership_isolation ON "BusinessMember";
CREATE POLICY membership_isolation ON "BusinessMember"
USING ("userId" = app_user_id() OR "businessId" = app_business_id())
WITH CHECK ("businessId" = app_business_id());

-- Join tables inherit tenant context through their parents.
ALTER TABLE "RolePermission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RolePermission" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS role_permission_isolation ON "RolePermission";
CREATE POLICY role_permission_isolation ON "RolePermission"
USING (EXISTS (
  SELECT 1 FROM "Role" r
  WHERE r.id = "RolePermission"."roleId" AND r."businessId" = app_business_id()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM "Role" r
  WHERE r.id = "RolePermission"."roleId" AND r."businessId" = app_business_id()
));

ALTER TABLE "SaleItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SaleItem" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sale_item_isolation ON "SaleItem";
CREATE POLICY sale_item_isolation ON "SaleItem"
USING (EXISTS (
  SELECT 1 FROM "Sale" s
  WHERE s.id = "SaleItem"."saleId" AND s."businessId" = app_business_id()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM "Sale" s
  WHERE s.id = "SaleItem"."saleId" AND s."businessId" = app_business_id()
));

ALTER TABLE "SubscriptionPayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SubscriptionPayment" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS subscription_payment_isolation ON "SubscriptionPayment";
CREATE POLICY subscription_payment_isolation ON "SubscriptionPayment"
USING (EXISTS (
  SELECT 1 FROM "Subscription" s
  WHERE s.id = "SubscriptionPayment"."subscriptionId" AND s."businessId" = app_business_id()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM "Subscription" s
  WHERE s.id = "SubscriptionPayment"."subscriptionId" AND s."businessId" = app_business_id()
));


ALTER TABLE "OnlineOrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OnlineOrderItem" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS online_order_item_isolation ON "OnlineOrderItem";
CREATE POLICY online_order_item_isolation ON "OnlineOrderItem"
USING (EXISTS (
  SELECT 1 FROM "OnlineOrder" o
  WHERE o.id = "OnlineOrderItem"."onlineOrderId" AND o."businessId" = app_business_id()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM "OnlineOrder" o
  WHERE o.id = "OnlineOrderItem"."onlineOrderId" AND o."businessId" = app_business_id()
));

-- Intentionally not RLS-protected here:
-- User/Session/Account/Verification (Better Auth owns access patterns)
-- Permission (global catalog)
-- SubscriptionPlan/AddonPlan/WebsiteTemplate/SystemAnnouncement (global catalog)
-- Business/BusinessWebsite/CustomDomain (public routing/basic metadata; private child tables are protected)
-- PlatformAdmin/BusinessAccessGrant/AdminAuditLog (platform-admin-only service layer)
