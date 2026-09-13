export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard.view",
  SALES_CREATE: "sales.create",
  SALES_VIEW: "sales.view",
  SALES_EDIT: "sales.edit",
  SALES_DELETE: "sales.delete",
  PROFITS_VIEW: "profits.view",
  INVENTORY_MANAGE: "inventory.manage",
  CUSTOMERS_MANAGE: "customers.manage",
  SUPPLIERS_MANAGE: "suppliers.manage",
  EXPENSES_MANAGE: "expenses.manage",
  REPORTS_VIEW: "reports.view",
  EMPLOYEES_MANAGE: "employees.manage",
  SETTINGS_MANAGE: "settings.manage",
  DEBTS_MANAGE: "debts.manage",
  NOTIFICATIONS_MANAGE: "notifications.manage",
  APPS_MANAGE: "apps.manage",
  WEBSITE_MANAGE: "website.manage",
  ONLINE_ORDERS_MANAGE: "online_orders.manage",
  BOOKINGS_MANAGE: "bookings.manage"
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSION_KEYS = Object.values(PERMISSIONS);

export const ROLE_PERMISSION_KEYS = {
  OWNER: ALL_PERMISSION_KEYS,
  MANAGER: ALL_PERMISSION_KEYS.filter((key) => key !== PERMISSIONS.SETTINGS_MANAGE),
  CASHIER: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.SALES_CREATE,
    PERMISSIONS.SALES_VIEW,
    PERMISSIONS.CUSTOMERS_MANAGE
  ],
  EMPLOYEE: [PERMISSIONS.DASHBOARD_VIEW, PERMISSIONS.SALES_VIEW]
} as const;
