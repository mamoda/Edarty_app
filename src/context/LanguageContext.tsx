// src/context/LanguageContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'ar' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: 'rtl' | 'ltr';
}

const translations = {
  ar: {
    // عام
    'dashboard': 'لوحة التحكم',
    'students': 'الطلاب',
    'teachers': 'المعلمين',
    'fees': 'المصاريف',
    'expenses': 'التكاليف',
    'profit': 'الأرباح',
    'financial': 'التقارير المالية',
    'settings': 'الإعدادات',
    'signOut': 'تسجيل الخروج',
    'upgrade': 'الترقية',
    'notifications': 'الإشعارات',
    'search': 'بحث...',
    'welcomeBack': 'مرحباً بعودتك',
    'freePlan': 'خطة مجانية',
    'quickActions': 'إجراءات سريعة',
    'revenueOverview': 'نظرة عامة على الإيرادات',
    'last7Days': 'آخر 7 أيام',
    
    // الإحصائيات
    'totalStudents': 'إجمالي الطلاب',
    'activeStudents': 'الطلاب النشطون',
    'totalTeachers': 'إجمالي المعلمين',
    'activeTeachers': 'المعلمين النشطين',
    'revenue': 'الإيرادات',
    'netProfit': 'صافي الربح',
    'vsLastMonth': 'مقارنة بالشهر الماضي',
    
    // الإجراءات السريعة
    'addStudent': 'إضافة طالب',
    'addStudentDesc': 'تسجيل طالب جديد',
    'recordFee': 'تسجيل مصروف',
    'recordFeeDesc': 'تحصيل دفعة',
    'addExpense': 'إضافة تكلفة',
    'addExpenseDesc': 'تسجيل مصروف',
    'viewReports': 'عرض التقارير',
    'viewReportsDesc': 'تحقق من التحليلات',
    
    // القائمة العلوية
    'overview': 'نظرة عامة',
    'analytics': 'تحليلات',
    'reports': 'تقارير',
    
    // الدعم
    'support': 'الدعم الفني',
    'supportDesc': 'عادةً يرد خلال 5 دقائق',
    'typeMessage': 'اكتب رسالتك...',
    'aiAssistant': 'مرحباً! أنا مساعدك الذكي. كيف يمكنني مساعدتك اليوم؟',
    'supportReply': 'شكراً لتواصلك! فريق الدعم سيرد عليك قريباً',
    
    // أيام الأسبوع
    'mon': 'الإثنين',
    'tue': 'الثلاثاء',
    'wed': 'الأربعاء',
    'thu': 'الخميس',
    'fri': 'الجمعة',
    'sat': 'السبت',
    'sun': 'الأحد',
    
    // الفترات
    'day': 'يوم',
    'week': 'أسبوع',
    'month': 'شهر',
    'year': 'سنة',
  },
  en: {
    // General
    'dashboard': 'Dashboard',
    'students': 'Students',
    'teachers': 'Teachers',
    'fees': 'Fees',
    'expenses': 'Expenses',
    'profit': 'Profit',
    'financial': 'Financial Reports',
    'settings': 'Settings',
    'signOut': 'Sign Out',
    'upgrade': 'Upgrade',
    'notifications': 'Notifications',
    'search': 'Search...',
    'welcomeBack': 'Welcome back',
    'freePlan': 'Free plan',
    'quickActions': 'Quick actions',
    'revenueOverview': 'Revenue overview',
    'last7Days': 'Last 7 days',
    
    // Statistics
    'totalStudents': 'Total Students',
    'activeStudents': 'Active Students',
    'totalTeachers': 'Total Teachers',
    'activeTeachers': 'Active Teachers',
    'revenue': 'Revenue',
    'netProfit': 'Net Profit',
    'vsLastMonth': 'vs last month',
    
    // Quick actions
    'addStudent': 'Add Student',
    'addStudentDesc': 'Register a new student',
    'recordFee': 'Record Fee',
    'recordFeeDesc': 'Collect payment',
    'addExpense': 'Add Expense',
    'addExpenseDesc': 'Record a cost',
    'viewReports': 'View Reports',
    'viewReportsDesc': 'Check analytics',
    
    // Top navigation
    'overview': 'Overview',
    'analytics': 'Analytics',
    'reports': 'Reports',
    
    // Support
    'support': 'Support',
    'supportDesc': 'Typically replies in 5min',
    'typeMessage': 'Type your message...',
    'aiAssistant': "Hi! I'm your AI assistant. How can I help you today?",
    'supportReply': "Thanks for your message! Our support team will get back to you shortly.",
    
    // Days
    'mon': 'Mon',
    'tue': 'Tue',
    'wed': 'Wed',
    'thu': 'Thu',
    'fri': 'Fri',
    'sat': 'Sat',
    'sun': 'Sun',
    
    // Periods
    'day': 'Day',
    'week': 'Week',
    'month': 'Month',
    'year': 'Year',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language') as Language;
    return saved || 'ar';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['ar']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir: language === 'ar' ? 'rtl' : 'ltr' }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};