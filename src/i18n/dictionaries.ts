export type AppLocale = "ar" | "en";

export const dictionaries = {
  ar: {
    common: {
      appName: "Ledgerly",
      newSale: "+ عملية بيع جديدة",
      viewAll: "عرض الكل",
      menu: "القائمة"
    },
    nav: {
      dashboard: "الرئيسية",
      sales: "المبيعات",
      customers: "الزبائن",
      debts: "الديون",
      products: "المنتجات والخدمات",
      inventory: "المخزون",
      suppliers: "الموردون",
      expenses: "المصاريف",
      reports: "التقارير",
      employees: "الموظفون",
      notifications: "الإشعارات",
      settings: "الإعدادات",
      apps: "الخدمات والإضافات",
      website: "الموقع الإلكتروني",
      onlineOrders: "الطلبات الأونلاين",
      bookings: "الحجوزات"
    },
    dashboard: {
      title: "لوحة التحكم",
      todaySales: "مبيعات اليوم",
      todayExpenses: "مصاريف اليوم",
      todayProfit: "ربح اليوم",
      transactions: "عدد العمليات",
      monthRevenue: "إيرادات الشهر",
      monthExpenses: "مصاريف الشهر",
      monthProfit: "صافي ربح الشهر",
      customersOwe: "للعمل عند الزبائن",
      suppliersOwed: "مستحق للموردين",
      lowStock: "مخزون منخفض",
      bestSellers: "الأكثر مبيعاً",
      recentTransactions: "آخر العمليات",
      empty: "ما في بيانات بعد. بلّش بأول عملية بيع."
    }
  },
  en: {
    common: {
      appName: "Ledgerly",
      newSale: "+ New Sale",
      viewAll: "View all",
      menu: "Menu"
    },
    nav: {
      dashboard: "Dashboard",
      sales: "Sales",
      customers: "Customers",
      debts: "Debts",
      products: "Products & Services",
      inventory: "Inventory",
      suppliers: "Suppliers",
      expenses: "Expenses",
      reports: "Reports",
      employees: "Employees",
      notifications: "Notifications",
      settings: "Settings",
      apps: "Apps & Add-ons",
      website: "Website",
      onlineOrders: "Online Orders",
      bookings: "Bookings"
    },
    dashboard: {
      title: "Dashboard",
      todaySales: "Today's sales",
      todayExpenses: "Today's expenses",
      todayProfit: "Today's profit",
      transactions: "Transactions",
      monthRevenue: "Monthly revenue",
      monthExpenses: "Monthly expenses",
      monthProfit: "Monthly net profit",
      customersOwe: "Customers owe you",
      suppliersOwed: "You owe suppliers",
      lowStock: "Low stock",
      bestSellers: "Best sellers",
      recentTransactions: "Recent transactions",
      empty: "No data yet. Start with your first sale."
    }
  }
} as const;

export function getDictionary(locale: AppLocale) {
  return dictionaries[locale];
}
