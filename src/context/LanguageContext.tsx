// src/context/LanguageContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the translations object
const translations = {
  en: {
    // القائمة الرئيسية
    dashboard: 'Dashboard',
    students: 'Students',
    teachers: 'Teachers',
    fees: 'Fees',
    expenses: 'Expenses',
    profit: 'Profit',
    financial: 'Financial Reports',
    
    // الإحصائيات الأساسية
    totalStudents: 'Total Students',
    activeStudents: 'Active Students',
    totalTeachers: 'Total Teachers',
    revenue: 'Revenue',
    totalExpenses: 'Total Expenses',
    netProfit: 'Net Profit',
    
    // إحصائيات محسنة للرسوم
    netRevenue: 'Net Revenue',
    afterRefunds: 'after refunds',
    collectionRate: 'Collection Rate',
    todayCollections: "Today's Collections",
    thisWeekCollections: 'This Week',
    thisMonthCollections: 'This Month',
    paidStudents: 'Paid Students',
    partialPaidStudents: 'Partial Paid',
    unpaidStudents: 'Unpaid Students',
    cashPayments: 'Cash Payments',
    cardPayments: 'Card Payments',
    bankTransferPayments: 'Bank Transfer',
    checkPayments: 'Checks',
    totalRefunds: 'Total Refunds',
    outstandingBalance: 'Outstanding Balance',
    
    // طرق الدفع
    paymentMethods: 'Payment Methods',
    cash: 'Cash',
    card: 'Card',
    bankTransfer: 'Bank Transfer',
    check: 'Check',
    
    // الرسوم البيانية
    revenueOverview: 'Revenue Overview',
    last7Days: 'Last 7 Days',
    
    // الإجراءات السريعة
    quickActions: 'Quick Actions',
    addStudent: 'Add Student',
    addStudentDesc: 'Add a new student to the system',
    recordFee: 'Record Fee',
    recordFeeDesc: 'Record a new fee payment',
    addExpense: 'Add Expense',
    addExpenseDesc: 'Add a new expense entry',
    viewReports: 'View Reports',
    viewReportsDesc: 'View detailed financial reports',
    processRefund: 'Process Refund',
    processRefundDesc: 'Handle refund requests',
    recordDiscount: 'Record Discount',
    recordDiscountDesc: 'Apply discount to student',
    lateFee: 'Late Fee',
    lateFeeDesc: 'Add late payment fee',
    
    // الترحيب والبحث
    welcome: 'Welcome',
    search: 'Search...',
    refresh: 'Refresh',
    
    // الإشعارات
    notifications: 'Notifications',
    newUpdate: 'New Update Available',
    minAgo: '2 min ago',
    
    // المستخدم
    upgrade: 'Upgrade',
    freePlan: 'Free Plan',
    signOut: 'Sign Out',
    
    // الدعم
    support: 'Support',
    supportDesc: 'How can we help you?',
    aiAssistant: 'Hi! I\'m your AI assistant. How can I help you today?',
    supportReply: 'Thank you for your message. Our support team will get back to you soon.',
    typeMessage: 'Type your message...',
    
    // التنقل
    overview: 'Overview',
    analytics: 'Analytics',
    reports: 'Reports',
    settings: 'Settings',
    
    // الفترات الزمنية
    day: 'Day',
    week: 'Week',
    month: 'Month',
    year: 'Year',
    
    // أيام الأسبوع
    mon: 'Mon',
    tue: 'Tue',
    wed: 'Wed',
    thu: 'Thu',
    fri: 'Fri',
    sat: 'Sat',
    sun: 'Sun',
    
    // حالات الطلاب
    active: 'Active',
    inactive: 'Inactive',
    paid: 'Paid',
    partial: 'Partial',
    unpaid: 'Unpaid',
    overdue: 'Overdue',
    
    // أنواع العمليات
    deposit: 'Payment',
    refund: 'Refund',
    discount: 'Discount',
    late_fee: 'Late Fee',
    installment: 'Installment',
    
    // أخطاء ورسائل
    error: 'Error',
    success: 'Success',
    confirm: 'Confirm',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    print: 'Print',
    download: 'Download',
    close: 'Close',
    
  },
  ar: {
    // القائمة الرئيسية
    dashboard: 'لوحة التحكم',
    students: 'الطلاب',
    teachers: 'المعلمون',
    fees: 'الرسوم الدراسية',
    expenses: 'المصروفات',
    profit: 'تقرير الأرباح',
    financial: 'التقارير المالية',
    
    // الإحصائيات الأساسية
    totalStudents: 'إجمالي الطلاب',
    activeStudents: 'الطلاب النشطون',
    totalTeachers: 'إجمالي المعلمين',
    revenue: 'الإيرادات',
    totalExpenses: 'إجمالي المصروفات',
    netProfit: 'صافي الربح',
    
    // إحصائيات محسنة للرسوم
    netRevenue: 'صافي الإيرادات',
    afterRefunds: 'بعد الاستردادات',
    collectionRate: 'نسبة التحصيل',
    todayCollections: 'تحصيلات اليوم',
    thisWeekCollections: 'هذا الأسبوع',
    thisMonthCollections: 'هذا الشهر',
    paidStudents: 'طلاب مسددين',
    partialPaidStudents: 'مسدد جزئياً',
    unpaidStudents: 'غير مسددين',
    cashPayments: 'مدفوعات نقدية',
    cardPayments: 'مدفوعات بطاقة',
    bankTransferPayments: 'تحويل بنكي',
    checkPayments: 'شيكات',
    totalRefunds: 'إجمالي الاستردادات',
    outstandingBalance: 'الرصيد المتبقي',
    
    // طرق الدفع
    paymentMethods: 'طرق الدفع',
    cash: 'نقدي',
    card: 'بطاقة ائتمان',
    bankTransfer: 'تحويل بنكي',
    check: 'شيك',
    
    // الرسوم البيانية
    revenueOverview: 'نظرة عامة على الإيرادات',
    last7Days: 'آخر 7 أيام',
    
    // الإجراءات السريعة
    quickActions: 'الإجراءات السريعة',
    addStudent: 'إضافة طالب',
    addStudentDesc: 'إضافة طالب جديد إلى النظام',
    recordFee: 'تسجيل رسوم',
    recordFeeDesc: 'تسجيل دفع رسوم جديد',
    addExpense: 'إضافة مصروف',
    addExpenseDesc: 'إضافة إدخال مصروف جديد',
    viewReports: 'عرض التقارير',
    viewReportsDesc: 'عرض التقارير المالية التفصيلية',
    processRefund: 'استرداد مبلغ',
    processRefundDesc: 'معالجة طلبات الاسترداد',
    recordDiscount: 'تسجيل خصم',
    recordDiscountDesc: 'تطبيق خصم للطالب',
    lateFee: 'غرامة تأخير',
    lateFeeDesc: 'إضافة غرامة تأخير للسداد',
    
    // الترحيب والبحث
    welcome: 'مرحباً',
    search: 'البحث...',
    refresh: 'تحديث',
    
    // الإشعارات
    notifications: 'الإشعارات',
    newUpdate: 'تحديث جديد متاح',
    minAgo: 'منذ دقيقتين',
    
    // المستخدم
    upgrade: 'ترقية',
    freePlan: 'الخطة المجانية',
    signOut: 'تسجيل الخروج',
    
    // الدعم
    support: 'الدعم',
    supportDesc: 'كيف يمكننا مساعدتك؟',
    aiAssistant: 'مرحباً! أنا مساعدك الذكي. كيف يمكنني مساعدتك اليوم؟',
    supportReply: 'شكراً لرسالتك. سيتواصل معك فريق الدعم قريباً.',
    typeMessage: 'اكتب رسالتك...',
    
    // التنقل
    overview: 'نظرة عامة',
    analytics: 'التحليلات',
    reports: 'التقارير',
    settings: 'الإعدادات',
    
    // الفترات الزمنية
    day: 'يوم',
    week: 'أسبوع',
    month: 'شهر',
    year: 'سنة',
    
    // أيام الأسبوع
    mon: 'الاثنين',
    tue: 'الثلاثاء',
    wed: 'الأربعاء',
    thu: 'الخميس',
    fri: 'الجمعة',
    sat: 'السبت',
    sun: 'الأحد',
    
    // حالات الطلاب
    active: 'نشط',
    inactive: 'غير نشط',
    paid: 'مسدد',
    partial: 'جزئي',
    unpaid: 'غير مسدد',
    overdue: 'متأخر',
    
    // أنواع العمليات
    deposit: 'دفع',
    refund: 'استرداد',
    discount: 'خصم',
    late_fee: 'غرامة تأخير',
    installment: 'قسط',
    
    // أخطاء ورسائل
    error: 'خطأ',
    success: 'نجاح',
    confirm: 'تأكيد',
    cancel: 'إلغاء',
    save: 'حفظ',
    delete: 'حذف',
    edit: 'تعديل',
    print: 'طباعة',
    download: 'تحميل',
    close: 'إغلاق',
  },
};

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Try to get language from localStorage, default to 'ar' for Arabic users
  const [language, setLanguage] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem('language') as Language;
    // Default to Arabic if no preference is saved
    return savedLanguage || 'ar';
  });

  const toggleLanguage = () => {
    setLanguage((prev) => {
      const newLanguage = prev === 'en' ? 'ar' : 'en';
      localStorage.setItem('language', newLanguage);
      return newLanguage;
    });
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.en] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};