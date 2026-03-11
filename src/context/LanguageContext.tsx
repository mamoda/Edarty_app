// src/context/LanguageContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the translations object
const translations = {
  en: {
    dashboard: 'Dashboard',
    students: 'Students',
    teachers: 'Teachers',
    fees: 'Fees',
    expenses: 'Expenses',
    profit: 'Profit',
    financial: 'Financial',
    totalStudents: 'Total Students',
    activeStudents: 'Active Students',
    totalTeachers: 'Total Teachers',
    revenue: 'Revenue',
    netProfit: 'Net Profit',
    revenueOverview: 'Revenue Overview',
    last7Days: 'Last 7 Days',
    quickActions: 'Quick Actions',
    addStudent: 'Add Student',
    addStudentDesc: 'Add a new student to the system',
    recordFee: 'Record Fee',
    recordFeeDesc: 'Record a new fee payment',
    addExpense: 'Add Expense',
    addExpenseDesc: 'Add a new expense entry',
    viewReports: 'View Reports',
    viewReportsDesc: 'View detailed financial reports',
    welcome: 'Welcome',
    search: 'Search...',
    notifications: 'Notifications',
    newUpdate: 'New Update Available',
    minAgo: '2 min ago',
    upgrade: 'Upgrade',
    freePlan: 'Free Plan',
    signOut: 'Sign Out',
    support: 'Support',
    supportDesc: 'How can we help you?',
    aiAssistant: 'Hi! I\'m your AI assistant. How can I help you today?',
    supportReply: 'Thank you for your message. Our support team will get back to you soon.',
    typeMessage: 'Type your message...',
    overview: 'Overview',
    analytics: 'Analytics',
    reports: 'Reports',
    settings: 'Settings',
    day: 'Day',
    week: 'Week',
    month: 'Month',
    year: 'Year',
    mon: 'Mon',
    tue: 'Tue',
    wed: 'Wed',
    thu: 'Thu',
    fri: 'Fri',
    sat: 'Sat',
    sun: 'Sun',
  },
  ar: {
    dashboard: 'لوحة التحكم',
    students: 'الطلاب',
    teachers: 'المعلمون',
    fees: 'الرسوم',
    expenses: 'المصروفات',
    profit: 'الربح',
    financial: 'المالية',
    totalStudents: 'إجمالي الطلاب',
    activeStudents: 'الطلاب النشطون',
    totalTeachers: 'إجمالي المعلمين',
    revenue: 'الإيرادات',
    netProfit: 'صافي الربح',
    revenueOverview: 'نظرة عامة على الإيرادات',
    last7Days: 'آخر 7 أيام',
    quickActions: 'الإجراءات السريعة',
    addStudent: 'إضافة طالب',
    addStudentDesc: 'إضافة طالب جديد إلى النظام',
    recordFee: 'تسجيل رسوم',
    recordFeeDesc: 'تسجيل دفع رسوم جديد',
    addExpense: 'إضافة مصروف',
    addExpenseDesc: 'إضافة إدخال مصروف جديد',
    viewReports: 'عرض التقارير',
    viewReportsDesc: 'عرض التقارير المالية التفصيلية',
    welcome: 'مرحباً',
    search: 'البحث...',
    notifications: 'الإشعارات',
    newUpdate: 'تحديث جديد متاح',
    minAgo: 'منذ دقيقتين',
    upgrade: 'ترقية',
    freePlan: 'الخطة المجانية',
    signOut: 'تسجيل الخروج',
    support: 'الدعم',
    supportDesc: 'كيف يمكننا مساعدتك؟',
    aiAssistant: 'مرحباً! أنا مساعدك الذكي. كيف يمكنني مساعدتك اليوم؟',
    supportReply: 'شكراً لرسالتك. سيتواصل معك فريق الدعم قريباً.',
    typeMessage: 'اكتب رسالتك...',
    overview: 'نظرة عامة',
    analytics: 'التحليلات',
    reports: 'التقارير',
    settings: 'الإعدادات',
    day: 'يوم',
    week: 'أسبوع',
    month: 'شهر',
    year: 'سنة',
    mon: 'الاثنين',
    tue: 'الثلاثاء',
    wed: 'الأربعاء',
    thu: 'الخميس',
    fri: 'الجمعة',
    sat: 'السبت',
    sun: 'الأحد',
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
  const [language, setLanguage] = useState<Language>('en'); // Default to English

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'ar' : 'en'));
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