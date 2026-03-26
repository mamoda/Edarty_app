import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Eye,
  EyeOff,
  AlertCircle,
  Shield,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from 'jspdf-autotable';

// ==================== إعدادات اللغة العربية ====================
// تعريب الأرقام
const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const toArabicNumber = (num: number | string): string => {
  return num.toString().replace(/[0-9]/g, (d) => arabicNumbers[parseInt(d)]);
};

// تنسيق العملة بالعربية
const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

// تنسيق النسبة المئوية بالعربية
const formatPercentage = (num: number): string => {
  return new Intl.NumberFormat('ar-EG', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(num / 100);
};

// تنسيق التاريخ بالعربية
const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// تنسيق الشهر بالعربية
const formatMonth = (date: Date): string => {
  return date.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
  });
};

// ==================== أنواع البيانات المحسنة ====================
interface FinancialReport {
  period: string;
  startDate: string;
  endDate: string;
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    cashFlow: number;
    accountsReceivable: number;
    accountsPayable: number;
    workingCapital: number;
    cashInBank: number;
    operatingCashFlow: number;
    investingCashFlow: number;
    financingCashFlow: number;
    collectionRate: number;
    expectedRevenue: number;
  };
  revenueByCategory: {
    category: string;
    amount: number;
    percentage: number;
    count: number;
    type: 'payment' | 'refund' | 'discount' | 'late_fee';
  }[];
  expensesByCategory: {
    category: string;
    amount: number;
    percentage: number;
    count: number;
  }[];
  dailyTransactions: {
    date: string;
    revenue: number;
    expenses: number;
    profit: number;
    cumulativeProfit: number;
    payments: number;
    refunds: number;
  }[];
  topStudents: {
    student_name: string;
    total_paid: number;
    total_refunded: number;
    net_paid: number;
    last_payment: string;
    payments_count: number;
    average_payment: number;
    status: string;
  }[];
  paymentMethods: {
    method: string;
    amount: number;
    count: number;
    percentage: number;
    icon?: string;
  }[];
  projections: {
    month: string;
    projectedRevenue: number;
    projectedExpenses: number;
    projectedProfit: number;
    projectedRefunds: number;
    projectedNet: number;
    confidence: 'high' | 'medium' | 'low';
    seasonalFactor: number;
    expectedStudents: number;
    expectedPerStudent: number;
  }[];
  ratios: {
    // نسب السيولة
    currentRatio: number;
    quickRatio: number;
    cashRatio: number;
    
    // نسب الربحية
    profitMargin: number;
    returnOnAssets: number;
    returnOnEquity: number;
    operatingMargin: number;
    grossMargin: number;
    
    // نسب النشاط والتحصيل
    assetTurnover: number;
    receivableTurnover: number;
    averageCollectionPeriod: number;
    collectionRate: number;
    averagePerStudent: number;
    expectedPerStudent: number;
    
    // نسب المديونية
    debtRatio: number;
    debtToEquity: number;
    interestCoverage: number;
    
    // نسب النمو
    revenueGrowth: number;
    profitGrowth: number;
    expenseGrowth: number;
  };
  alerts: {
    type: 'warning' | 'danger' | 'info' | 'success';
    message: string;
    metric: string;
    threshold: number;
    currentValue: number;
  }[];
  receivables: {
    total: number;
    overdue: number;
    byStudent: {
      studentId: string;
      studentName: string;
      grade: string;
      totalRequired: number;
      totalPaid: number;
      totalRefunded: number;
      netPaid: number;
      outstanding: number;
      paymentRatio: number;
      status: string;
      paymentsByType: any;
      lastPaymentDate?: string;
    }[];
  };
  payables: {
    total: number;
    shortTerm: number;
    longTerm: number;
    breakdown: {
      salaries: number;
      expenses: number;
      bills: number;
    };
  };
  feesBreakdown: {
    requiredFees: { [key: string]: number };
    totalRequiredPerStudent: number;
    collectedByType: { [key: string]: number };
    pendingByType: { [key: string]: number };
  };
}

// ==================== دوال مساعدة محسنة ====================

// دالة مخصصة لتنسيق أداة التلميح بالعربية
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 shadow-lg rounded-lg border border-gray-200" dir="rtl">
        <p className="text-sm font-bold text-gray-900 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 text-xs">
            <span style={{ color: entry.color }}>{entry.name}:</span>
            <span className="font-medium">
              {typeof entry.value === 'number' ? formatCurrency(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// التحقق من صحة البيانات
const validateData = (data: any[], requiredFields: string[]): boolean => {
  return data.every(item => 
    requiredFields.every(field => item[field] !== undefined && item[field] !== null)
  );
};

// تحليل الموسمية
const calculateSeasonalFactors = (months: number = 12): number[] => {
  const factors = [];
  for (let i = 0; i < months; i++) {
    // عامل موسمي يعتمد على الشهر
    // سبتمبر (شهر 8) أعلى نسبة تحصيل (بداية السنة)
    // يونيو ويوليو وأغسطس أقل نسبة (إجازة)
    let monthFactor = 1.0;
    
    if (i === 8) monthFactor = 1.5; // سبتمبر
    else if (i === 9) monthFactor = 1.3; // أكتوبر
    else if (i === 10) monthFactor = 1.2; // نوفمبر
    else if (i === 11) monthFactor = 1.1; // ديسمبر
    else if (i === 5 || i === 6 || i === 7) monthFactor = 0.7; // يونيو-أغسطس
    else monthFactor = 0.9; // باقي الشهور
    
    factors.push(monthFactor);
  }
  return factors;
};

export default function FinancialReports() {
  const { authUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<
    "daily" | "weekly" | "monthly" | "yearly" | "custom"
  >("monthly");
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [showProjections, setShowProjections] = useState(false);
  const [confidenceLevel, setConfidenceLevel] = useState<'high' | 'medium' | 'low'>('medium');

  const COLORS = [
    "#059669",
    "#3b82f6",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
    "#14b8a6",
    "#f97316",
  ];

  // قيم المصاريف المطلوبة من FeesManager
  const REQUIRED_FEES_MAP = {
    "رسوم دراسية": 5000,
    "رسوم الكتب": 500,
    "رسوم الأنشطة": 300,
    "رسوم الزي المدرسي": 400,
    "رسوم الباص": 800,
  };
  
  const TOTAL_REQUIRED_FEES_PER_STUDENT = Object.values(REQUIRED_FEES_MAP).reduce((a, b) => a + b, 0); // 7000

  useEffect(() => {
    if (validateDates()) {
      loadReport();
    }
  }, [reportType, startDate, endDate]);

  const validateDates = (): boolean => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      setError("تاريخ البداية يجب أن يكون قبل تاريخ النهاية");
      return false;
    }
    setError(null);
    return true;
  };

  // ==================== حساب الذمم المالية بدقة ====================

  const calculateAccountsReceivable = (fees: any[], students: any[]) => {
    try {
      // هيكل لتخزين المدفوعات والاستردادات لكل طالب
      const paymentsMap: { 
        [key: string]: { 
          paid: number; 
          refunded: number; 
          net: number;
          paymentsByType: { [key: string]: { positive: number; negative: number } };
          lastPaymentDate: string | undefined ;
        } 
      } = {};
      
      fees.forEach(fee => {
        if (!paymentsMap[fee.student_id]) {
          paymentsMap[fee.student_id] = { 
            paid: 0, 
            refunded: 0, 
            net: 0,
            paymentsByType: {},
            lastPaymentDate: undefined 
          };
        }
        
        if (fee.amount > 0) {
          // دفعة موجبة (إيداع)
          paymentsMap[fee.student_id].paid += fee.amount;
          paymentsMap[fee.student_id].net += fee.amount;
          
          // تسجيل حسب نوع الدفعة
          if (!paymentsMap[fee.student_id].paymentsByType[fee.payment_type]) {
            paymentsMap[fee.student_id].paymentsByType[fee.payment_type] = { positive: 0, negative: 0 };
          }
          paymentsMap[fee.student_id].paymentsByType[fee.payment_type].positive += fee.amount;
        } else {
          // دفعة سالبة (استرداد أو خصم)
          const absAmount = Math.abs(fee.amount);
          paymentsMap[fee.student_id].refunded += absAmount;
          paymentsMap[fee.student_id].net -= absAmount;
          
          // تسجيل حسب نوع الدفعة
          if (!paymentsMap[fee.student_id].paymentsByType[fee.payment_type]) {
            paymentsMap[fee.student_id].paymentsByType[fee.payment_type] = { positive: 0, negative: 0 };
          }
          paymentsMap[fee.student_id].paymentsByType[fee.payment_type].negative += absAmount;
        }

        // تحديث تاريخ آخر دفعة
        if (!paymentsMap[fee.student_id].lastPaymentDate || fee.payment_date > paymentsMap[fee.student_id].lastPaymentDate!) {
          paymentsMap[fee.student_id].lastPaymentDate = fee.payment_date;
        }
      });

      // حساب المستحقات
      let totalReceivable = 0;
      let overdueReceivables = 0;
      const today = new Date();
      const currentAcademicYear = new Date().getFullYear();

      students.forEach(student => {
        const studentData = paymentsMap[student.id] || { 
          paid: 0, 
          refunded: 0, 
          net: 0, 
          paymentsByType: {},
          lastPaymentDate: null 
        };
        
        const outstanding = Math.max(0, TOTAL_REQUIRED_FEES_PER_STUDENT - studentData.net);
        
        if (outstanding > 0) {
          totalReceivable += outstanding;
          
          // التحقق من التأخير
          if (studentData.lastPaymentDate) {
            const lastPaymentDate = new Date(studentData.lastPaymentDate);
            const monthsSinceLastPayment = (today.getFullYear() - lastPaymentDate.getFullYear()) * 12 +
              (today.getMonth() - lastPaymentDate.getMonth());
            
            // إذا مر أكثر من شهرين على آخر دفعة ولا يزال عليه مستحقات
            if (monthsSinceLastPayment > 2 && outstanding > 0) {
              overdueReceivables += outstanding;
            }
          } else {
            // طالب لم يدفع أي شيء
            const enrollmentDate = new Date(student.enrollment_date || today);
            const monthsSinceEnrollment = (today.getFullYear() - enrollmentDate.getFullYear()) * 12 +
              (today.getMonth() - enrollmentDate.getMonth());
            
            if (monthsSinceEnrollment > 1) {
              overdueReceivables += outstanding;
            }
          }
        }
      });

      // تحليل تفصيلي لكل طالب
      const byStudent = students.map(student => {
        const studentData = paymentsMap[student.id] || { 
          paid: 0, 
          refunded: 0, 
          net: 0, 
          paymentsByType: {},
          lastPaymentDate: null 
        };
        
        const outstanding = Math.max(0, TOTAL_REQUIRED_FEES_PER_STUDENT - studentData.net);
        const paymentRatio = TOTAL_REQUIRED_FEES_PER_STUDENT > 0 
          ? (studentData.net / TOTAL_REQUIRED_FEES_PER_STUDENT) * 100 
          : 0;
        
        return {
          studentId: student.id,
          studentName: student.full_name,
          grade: student.grade,
          totalRequired: TOTAL_REQUIRED_FEES_PER_STUDENT,
          totalPaid: studentData.paid,
          totalRefunded: studentData.refunded,
          netPaid: studentData.net,
          outstanding,
          paymentRatio,
          status: outstanding <= 0 ? 'مدفوع بالكامل' : 
                  paymentRatio >= 70 ? 'مدفوع معظمه' :
                  paymentRatio >= 30 ? 'مدفوع جزئياً' : 'غير مدفوع',
          paymentsByType: studentData.paymentsByType,
          lastPaymentDate: studentData.lastPaymentDate
        };
      });

      return {
        total: totalReceivable,
        overdue: overdueReceivables,
        byStudent
      };
    } catch (error) {
      console.error("Error calculating receivables:", error);
      return { total: 0, overdue: 0, byStudent: [] };
    }
  };

  const calculateAccountsPayable = (expenses: any[], teachers: any[], unpaidBills: any[]) => {
    try {
      // رواتب المعلمين المستحقة
      const teacherSalaries = teachers
        .filter(t => t.status === "active")
        .reduce((sum, t) => sum + (t.salary || 0), 0);

      // المصروفات غير المدفوعة
      const unpaidExpenses = expenses
        .filter(e => e.status === "unpaid")
        .reduce((sum, e) => sum + e.amount, 0);

      // الفواتير المستحقة
      const bills = unpaidBills?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0;

      // الالتزامات قصيرة الأجل (أقل من سنة)
      const shortTermLiabilities = teacherSalaries + unpaidExpenses + bills;

      // الالتزامات طويلة الأجل
      const longTermLiabilities = 0; // يمكن إضافتها لاحقاً

      return {
        total: shortTermLiabilities + longTermLiabilities,
        shortTerm: shortTermLiabilities,
        longTerm: longTermLiabilities,
        breakdown: {
          salaries: teacherSalaries,
          expenses: unpaidExpenses,
          bills: bills
        }
      };
    } catch (error) {
      console.error("Error calculating payables:", error);
      return { total: 0, shortTerm: 0, longTerm: 0, breakdown: { salaries: 0, expenses: 0, bills: 0 } };
    }
  };

  // ==================== تحسين التوقعات بعوامل موسمية ====================

  const calculateProjections = (
    fees: any[], 
    expenses: any[], 
    students: any[],
    months: number = 6
  ) => {
    try {
      const activeStudents = students.filter(s => s.status === "active").length;
      
      // الإيرادات المتوقعة بناءً على عدد الطلاب النشطين
      const expectedAnnualRevenue = activeStudents * TOTAL_REQUIRED_FEES_PER_STUDENT;
      
      // تحليل البيانات التاريخية للدفعات
      const paymentsByMonth: { [key: string]: { payments: number; refunds: number; net: number } } = {};
      
      fees.forEach(fee => {
        const month = fee.payment_date.substring(0, 7); // YYYY-MM
        if (!paymentsByMonth[month]) {
          paymentsByMonth[month] = { payments: 0, refunds: 0, net: 0 };
        }
        
        if (fee.amount > 0) {
          paymentsByMonth[month].payments += fee.amount;
          paymentsByMonth[month].net += fee.amount;
        } else {
          paymentsByMonth[month].refunds += Math.abs(fee.amount);
          paymentsByMonth[month].net -= Math.abs(fee.amount);
        }
      });

      // حساب المتوسطات الشهرية
      const months_data = Object.keys(paymentsByMonth);
      const avgMonthlyPayment = months_data.length > 0
        ? months_data.reduce((sum, m) => sum + (paymentsByMonth[m].payments || 0), 0) / months_data.length
        : expectedAnnualRevenue / 12;
      
      const avgMonthlyRefund = months_data.length > 0
        ? months_data.reduce((sum, m) => sum + (paymentsByMonth[m].refunds || 0), 0) / months_data.length
        : 0;

      // متوسط المصروفات الشهرية
      const expensesByMonth: { [key: string]: number } = {};
      expenses.forEach(expense => {
        const month = expense.expense_date.substring(0, 7);
        expensesByMonth[month] = (expensesByMonth[month] || 0) + expense.amount;
      });
      
      const avgMonthlyExpenses = Object.keys(expensesByMonth).length > 0
        ? Object.values(expensesByMonth).reduce((a, b) => a + b, 0) / Object.keys(expensesByMonth).length
        : 0;

      // عوامل موسمية
      const seasonalFactors = calculateSeasonalFactors(12);
      
      // حساب مستوى الثقة بناءً على كمية البيانات التاريخية
      const dataQuality = months_data.length / 12; // جودة البيانات (سنة كاملة = 1)
      
      const projections = [];
      const currentDate = new Date();

      for (let i = 1; i <= months; i++) {
        const nextMonth = new Date(currentDate);
        nextMonth.setMonth(nextMonth.getMonth() + i);
        
        const monthIndex = (currentDate.getMonth() + i) % 12;
        const seasonalFactor = seasonalFactors[monthIndex];
        
        // في سبتمبر (بداية السنة) نتوقع دفعات أكبر
        const isStartOfYear = monthIndex === 8; // سبتمبر
        const startOfYearFactor = isStartOfYear ? 1.5 : 1;
        
        // حساب النمو المتوقع (افتراضي 5% سنوياً)
        const growthRate = 0.05;
        const growthFactor = Math.pow(1 + growthRate, i / 12);
        
        const projectedPayments = avgMonthlyPayment * seasonalFactor * startOfYearFactor * growthFactor;
        const projectedRefunds = avgMonthlyRefund * seasonalFactor;
        const projectedExpensesAmount = avgMonthlyExpenses * seasonalFactor * growthFactor;
        
        // تحديد مستوى الثقة
        let confidence: 'high' | 'medium' | 'low' = 'medium';
        if (dataQuality > 0.8 && i <= 3) confidence = 'high';
        else if (dataQuality < 0.3 || i > 6) confidence = 'low';
        
        projections.push({
          month: formatMonth(nextMonth),
          projectedRevenue: Math.max(0, projectedPayments),
          projectedRefunds: Math.max(0, projectedRefunds),
          projectedExpenses: Math.max(0, projectedExpensesAmount),
          projectedProfit: Math.max(0, projectedPayments - projectedRefunds - projectedExpensesAmount),
          projectedNet: Math.max(0, projectedPayments - projectedRefunds),
          confidence,
          seasonalFactor,
          expectedStudents: activeStudents,
          expectedPerStudent: TOTAL_REQUIRED_FEES_PER_STUDENT,
        });
      }

      return projections;
    } catch (error) {
      console.error("Error calculating projections:", error);
      return [];
    }
  };

  // حساب معدل النمو
  const calculateGrowthRate = (data: number[]): number => {
    if (data.length < 2) return 0.05; // معدل افتراضي 5%
    
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    return firstAvg > 0 ? (secondAvg - firstAvg) / firstAvg : 0.05;
  };

  // ==================== حساب النسب المالية بدقة ====================

  const calculateFinancialRatios = (
    fees: any[],
    expenses: any[],
    teachers: any[],
    students: any[],
    receivables: any,
    payables: any
  ) => {
    try {
      const activeStudents = students.filter(s => s.status === "active").length;
      
      // إجمالي الإيرادات المتوقعة
      const expectedTotalRevenue = activeStudents * TOTAL_REQUIRED_FEES_PER_STUDENT;
      
      // صافي الإيرادات الفعلية (مدفوعات - استردادات)
      const totalPayments = fees
        .filter(f => f.amount > 0)
        .reduce((sum, f) => sum + f.amount, 0);
      
      const totalRefunds = fees
        .filter(f => f.amount < 0)
        .reduce((sum, f) => sum + Math.abs(f.amount), 0);
      
      const netRevenue = totalPayments - totalRefunds;
      
      // المصروفات
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const netProfit = netRevenue - totalExpenses;

      // الأصول المتداولة (نقدية + ذمم مدينة + مخزون)
      const cashInBank = 100000; // يجب جلبها من قاعدة البيانات
      const accountsReceivable = receivables.total || 0;
      const inventory = 50000; // يجب جلبها من قاعدة البيانات
      const currentAssets = cashInBank + accountsReceivable + inventory;

      // الالتزامات المتداولة
      const accountsPayable = payables.shortTerm || 0;
      const currentLiabilities = accountsPayable;

      // إجمالي الأصول
      const fixedAssets = 500000; // أصول ثابتة (مباني، معدات)
      const totalAssets = currentAssets + fixedAssets;

      // حقوق الملكية
      const equity = totalAssets - payables.total;

      // نسب السيولة
      const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
      const quickRatio = currentLiabilities > 0 ? (currentAssets - inventory) / currentLiabilities : 0;
      const cashRatio = currentLiabilities > 0 ? cashInBank / currentLiabilities : 0;

      // نسب الربحية
      const profitMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;
      const returnOnAssets = totalAssets > 0 ? (netProfit / totalAssets) * 100 : 0;
      const returnOnEquity = equity > 0 ? (netProfit / equity) * 100 : 0;
      const operatingMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;
      const grossMargin = netRevenue > 0 ? ((netRevenue - totalExpenses) / netRevenue) * 100 : 0;

      // نسب النشاط والتحصيل
      const assetTurnover = totalAssets > 0 ? netRevenue / totalAssets : 0;
      const receivableTurnover = accountsReceivable > 0 ? netRevenue / accountsReceivable : 0;
      const averageCollectionPeriod = receivableTurnover > 0 ? 365 / receivableTurnover : 0;
      
      // نسب تحصيل جديدة
      const collectionRate = expectedTotalRevenue > 0 ? (netRevenue / expectedTotalRevenue) * 100 : 0;
      const averagePerStudent = activeStudents > 0 ? netRevenue / activeStudents : 0;

      // نسب المديونية
      const debtRatio = totalAssets > 0 ? payables.total / totalAssets : 0;
      const debtToEquity = equity > 0 ? payables.total / equity : 0;
      const interestCoverage = 5; // يجب حسابها بدقة

      // نسب النمو (مقارنة بالفترة السابقة)
      const revenueGrowth = calculateGrowthRate(fees.filter(f => f.amount > 0).map(f => f.amount));
      const profitGrowth = 8; // يمكن تحسينها
      const expenseGrowth = 5; // يمكن تحسينها

      return {
        // نسب السيولة
        currentRatio,
        quickRatio,
        cashRatio,
        
        // نسب الربحية
        profitMargin,
        returnOnAssets,
        returnOnEquity,
        operatingMargin,
        grossMargin,
        
        // نسب النشاط والتحصيل
        assetTurnover,
        receivableTurnover,
        averageCollectionPeriod,
        collectionRate,
        averagePerStudent,
        expectedPerStudent: TOTAL_REQUIRED_FEES_PER_STUDENT,
        
        // نسب المديونية
        debtRatio,
        debtToEquity,
        interestCoverage,
        
        // نسب النمو
        revenueGrowth: revenueGrowth * 100,
        profitGrowth,
        expenseGrowth,
      };
    } catch (error) {
      console.error("Error calculating ratios:", error);
      return {
        currentRatio: 0, quickRatio: 0, cashRatio: 0,
        profitMargin: 0, returnOnAssets: 0, returnOnEquity: 0,
        operatingMargin: 0, grossMargin: 0,
        assetTurnover: 0, receivableTurnover: 0, averageCollectionPeriod: 0,
        collectionRate: 0, averagePerStudent: 0, expectedPerStudent: TOTAL_REQUIRED_FEES_PER_STUDENT,
        debtRatio: 0, debtToEquity: 0, interestCoverage: 0,
        revenueGrowth: 0, profitGrowth: 0, expenseGrowth: 0,
      };
    }
  };

  // ==================== إنشاء تنبيهات ذكية ====================

  const generateAlerts = (
    ratios: any,
    receivables: any,
    payables: any,
    projections: any[],
    fees: any[]
  ): { type: 'warning' | 'danger' | 'info' | 'success'; message: string; metric: string; threshold: number; currentValue: number; }[] => {
    const alerts: { type: 'warning' | 'danger' | 'info' | 'success'; message: string; metric: string; threshold: number; currentValue: number; }[] = [];

    // تنبيهات السيولة
    if (ratios.currentRatio < 1) {
      alerts.push({
        type: 'danger',
        message: 'نسبة السيولة الحالية أقل من 1 - خطر عدم القدرة على سداد الالتزامات',
        metric: 'currentRatio',
        threshold: 1,
        currentValue: ratios.currentRatio
      });
    } else if (ratios.currentRatio < 1.5) {
      alerts.push({
        type: 'warning',
        message: 'نسبة السيولة الحالية أقل من المعدل المثالي (1.5)',
        metric: 'currentRatio',
        threshold: 1.5,
        currentValue: ratios.currentRatio
      });
    }

    // تنبيهات الذمم المدينة
    if (receivables.total > 0) {
      const overdueRatio = (receivables.overdue / receivables.total) * 100;
      if (overdueRatio > 30) {
        alerts.push({
          type: 'warning',
          message: `نسبة المتأخرات مرتفعة (${overdueRatio.toFixed(1)}%) - تحتاج متابعة`,
          metric: 'overdueRatio',
          threshold: 30,
          currentValue: overdueRatio
        });
      }
    }

    // تنبيهات الربحية
    if (ratios.profitMargin < 10 && ratios.profitMargin > 0) {
      alerts.push({
        type: 'warning',
        message: 'هامش الربح منخفض - أقل من 10%',
        metric: 'profitMargin',
        threshold: 10,
        currentValue: ratios.profitMargin
      });
    } else if (ratios.profitMargin < 0) {
      alerts.push({
        type: 'danger',
        message: 'الشركة تعمل بخسارة - تحتاج إلى إجراءات فورية',
        metric: 'profitMargin',
        threshold: 0,
        currentValue: ratios.profitMargin
      });
    }

    // تنبيهات نسبة التحصيل
    if (ratios.collectionRate < 50) {
      alerts.push({
        type: 'danger',
        message: `نسبة التحصيل منخفضة جداً (${ratios.collectionRate.toFixed(1)}%) - أقل من 50%`,
        metric: 'collectionRate',
        threshold: 50,
        currentValue: ratios.collectionRate
      });
    } else if (ratios.collectionRate < 70) {
      alerts.push({
        type: 'warning',
        message: `نسبة التحصيل أقل من المستهدف (${ratios.collectionRate.toFixed(1)}%)`,
        metric: 'collectionRate',
        threshold: 70,
        currentValue: ratios.collectionRate
      });
    }

    // تنبيهات التوقعات
    const lastProjection = projections[projections.length - 1];
    if (lastProjection && lastProjection.confidence === 'low') {
      alerts.push({
        type: 'info',
        message: 'دقة التوقعات للأشهر القادمة منخفضة - نقص في البيانات التاريخية',
        metric: 'forecastConfidence',
        threshold: 0.5,
        currentValue: 0.3
      });
    }

    // تنبيهات النمو
    if (ratios.revenueGrowth < 0) {
      alerts.push({
        type: 'warning',
        message: `نمو الإيرادات سلبي (${ratios.revenueGrowth.toFixed(1)}%) - تراجع مقارنة بالفترة السابقة`,
        metric: 'revenueGrowth',
        threshold: 0,
        currentValue: ratios.revenueGrowth
      });
    }

    // تنبيهات أنواع المصاريف المفقودة
    const collectedTypes = new Set();
    fees.forEach(fee => {
      if (fee.amount > 0) {
        collectedTypes.add(fee.payment_type);
      }
    });

    const missingTypes = Object.keys(REQUIRED_FEES_MAP).filter(type => !collectedTypes.has(type));
    if (missingTypes.length > 0) {
      alerts.push({
        type: 'info',
        message: `بعض أنواع المصاريف لم يتم تحصيلها: ${missingTypes.slice(0, 3).join('، ')}${missingTypes.length > 3 ? '...' : ''}`,
        metric: 'missingFeeTypes',
        threshold: Object.keys(REQUIRED_FEES_MAP).length,
        currentValue: collectedTypes.size
      });
    }

    return alerts;
  };

  // ==================== تحميل التقرير الرئيسي ====================

  const loadReport = async () => {
    if (!authUser) {
      setError("الرجاء تسجيل الدخول أولاً");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // استخدام Promise.allSettled للتعامل مع الأخطاء بشكل أفضل
      const results = await Promise.allSettled([
        supabase.from("fees").select("*, student:students(*)").eq("user_id", authUser.id).gte("payment_date", startDate).lte("payment_date", endDate),
        supabase.from("expenses").select("*").eq("user_id", authUser.id).gte("expense_date", startDate).lte("expense_date", endDate),
        supabase.from("students").select("*").eq("user_id", authUser.id),
        supabase.from("teachers").select("*").eq("user_id", authUser.id),
      ]);

      // معالجة النتائج
      const feesResult = results[0];
      const expensesResult = results[1];
      const studentsResult = results[2];
      const teachersResult = results[3];

      if (feesResult.status === 'rejected' || expensesResult.status === 'rejected') {
        throw new Error("فشل في تحميل البيانات الأساسية");
      }

      const fees = feesResult.value.data || [];
      const expenses = expensesResult.value.data || [];
      const students = studentsResult.status === 'fulfilled' ? studentsResult.value.data || [] : [];
      const teachers = teachersResult.status === 'fulfilled' ? teachersResult.value.data || [] : [];

      // التحقق من صحة البيانات
      if (!validateData(fees, ['amount', 'payment_type', 'student_id'])) {
        console.warn("بعض بيانات الرسوم غير مكتملة");
      }

      // حساب الذمم المالية
      const receivables = calculateAccountsReceivable(fees, students);
      const payables = calculateAccountsPayable(expenses, teachers, []);

      // حساب الإيرادات والمصروفات
      const totalPayments = fees
        .filter(f => f.amount > 0)
        .reduce((sum, f) => sum + f.amount, 0);
      
      const totalRefunds = fees
        .filter(f => f.amount < 0)
        .reduce((sum, f) => sum + Math.abs(f.amount), 0);
      
      const totalRevenue = totalPayments - totalRefunds; // صافي الإيرادات
      
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const netProfit = totalRevenue - totalExpenses;

      // حساب الإيرادات حسب الفئة (مع تفريق المدفوعات والاستردادات)
      const revenueByCategory = calculateRevenueByCategory(fees);
      
      // حساب المصروفات حسب الفئة
      const expensesByCategory = calculateExpensesByCategory(expenses);

      // حساب المعاملات اليومية
      const dailyTransactions = calculateDailyTransactions(fees, expenses);

      // أفضل الطلاب
      const topStudents = calculateTopStudents(fees, students);

      // طرق الدفع
      const paymentMethods = calculatePaymentMethods(fees);

      // التوقعات المحسنة
      const projections = calculateProjections(fees, expenses, students, 6);

      // النسب المالية المحسنة
      const ratios = calculateFinancialRatios(fees, expenses, teachers, students, receivables, payables);

      // توليد التنبيهات
      const alerts = generateAlerts(ratios, receivables, payables, projections, fees);

      // حساب التدفقات النقدية
      const cashInBank = 100000; // يجب جلبها من قاعدة البيانات
      const operatingCashFlow = totalRevenue - totalExpenses;
      const investingCashFlow = -50000; // استثمارات (سلبية)
      const financingCashFlow = 0; // تمويل

      // حساب الإيرادات المتوقعة
      const activeStudents = students.filter(s => s.status === "active").length;
      const expectedRevenue = activeStudents * TOTAL_REQUIRED_FEES_PER_STUDENT;

      // تحليل تفصيلي للمصاريف
      const collectedByType: { [key: string]: number } = {};
      fees.forEach(fee => {
        if (fee.amount > 0) {
          collectedByType[fee.payment_type] = (collectedByType[fee.payment_type] || 0) + fee.amount;
        }
      });

      const pendingByType: { [key: string]: number } = {};
      Object.keys(REQUIRED_FEES_MAP).forEach(type => {
        const collected = collectedByType[type] || 0;
        const required = REQUIRED_FEES_MAP[type as keyof typeof REQUIRED_FEES_MAP] * activeStudents;
        pendingByType[type] = Math.max(0, required - collected);
      });

      setReport({
        period: reportType,
        startDate,
        endDate,
        summary: {
          totalRevenue,
          totalExpenses,
          netProfit,
          profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
          cashFlow: totalRevenue - totalExpenses,
          accountsReceivable: receivables.total,
          accountsPayable: payables.total,
          workingCapital: (cashInBank + receivables.total) - payables.shortTerm,
          cashInBank,
          operatingCashFlow,
          investingCashFlow,
          financingCashFlow,
          collectionRate: expectedRevenue > 0 ? (totalRevenue / expectedRevenue) * 100 : 0,
          expectedRevenue,
        },
        revenueByCategory,
        expensesByCategory,
        dailyTransactions,
        topStudents,
        paymentMethods,
        projections,
        ratios,
        alerts,
        receivables,
        payables,
        feesBreakdown: {
          requiredFees: REQUIRED_FEES_MAP,
          totalRequiredPerStudent: TOTAL_REQUIRED_FEES_PER_STUDENT,
          collectedByType,
          pendingByType,
        }
      });

    } catch (error: any) {
      console.error("Error loading report:", error);
      setError(error.message || "حدث خطأ أثناء تحميل التقرير");
    } finally {
      setLoading(false);
    }
  };

  // ==================== دوال الحساب المساعدة ====================

  const calculateRevenueByCategory = (fees: any[]) => {
    const categories: { [key: string]: { amount: number; count: number; positive: number; negative: number } } = {};
    
    fees.forEach((fee) => {
      if (!categories[fee.payment_type]) {
        categories[fee.payment_type] = { amount: 0, count: 0, positive: 0, negative: 0 };
      }
      
      if (fee.amount > 0) {
        categories[fee.payment_type].amount += fee.amount;
        categories[fee.payment_type].positive += fee.amount;
      } else {
        categories[fee.payment_type].amount += fee.amount; // سيضيف قيمة سالبة
        categories[fee.payment_type].negative += Math.abs(fee.amount);
      }
      categories[fee.payment_type].count += 1;
    });

    const total = Object.values(categories).reduce((a, b) => a + Math.abs(b.amount), 0);
    
    return Object.entries(categories).map(([category, data]) => {
      // تحديد نوع الفئة
      let type: 'payment' | 'refund' | 'discount' | 'late_fee' = 'payment';
      if (category.includes('استرداد')) type = 'refund';
      else if (category.includes('خصم')) type = 'discount';
      else if (category.includes('غرامة')) type = 'late_fee';
      
      return {
        category,
        amount: data.amount,
        count: data.count,
        percentage: total > 0 ? (Math.abs(data.amount) / total) * 100 : 0,
        type,
      };
    }).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  };

  const calculateExpensesByCategory = (expenses: any[]) => {
    const categories: { [key: string]: { amount: number; count: number } } = {};
    
    expenses.forEach((expense) => {
      if (!categories[expense.category]) {
        categories[expense.category] = { amount: 0, count: 0 };
      }
      categories[expense.category].amount += expense.amount;
      categories[expense.category].count += 1;
    });

    const total = Object.values(categories).reduce((a, b) => a + b.amount, 0);
    
    return Object.entries(categories).map(([category, data]) => ({
      category,
      amount: data.amount,
      count: data.count,
      percentage: total > 0 ? (data.amount / total) * 100 : 0,
    })).sort((a, b) => b.amount - a.amount);
  };

  const calculateDailyTransactions = (fees: any[], expenses: any[]) => {
    const dateMap: { [key: string]: { 
      revenue: number; 
      expenses: number; 
      payments: number;
      refunds: number;
    } } = {};

    fees.forEach((fee) => {
      const date = fee.payment_date;
      if (!dateMap[date]) dateMap[date] = { revenue: 0, expenses: 0, payments: 0, refunds: 0 };
      
      if (fee.amount > 0) {
        dateMap[date].revenue += fee.amount;
        dateMap[date].payments += fee.amount;
      } else {
        dateMap[date].revenue += fee.amount; // سيضيف قيمة سالبة
        dateMap[date].refunds += Math.abs(fee.amount);
      }
    });

    expenses.forEach((expense) => {
      const date = expense.expense_date;
      if (!dateMap[date]) dateMap[date] = { revenue: 0, expenses: 0, payments: 0, refunds: 0 };
      dateMap[date].expenses += expense.amount;
    });

    let cumulativeProfit = 0;
    return Object.entries(dateMap)
      .map(([date, values]) => {
        const profit = values.revenue - values.expenses;
        cumulativeProfit += profit;
        return {
          date: formatDate(date),
          revenue: values.revenue,
          expenses: values.expenses,
          profit,
          cumulativeProfit,
          payments: values.payments,
          refunds: values.refunds,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const calculateTopStudents = (fees: any[], students: any[]) => {
    const studentMap: {
      [key: string]: { 
        name: string; 
        total_paid: number; 
        total_refunded: number;
        count: number;
        lastDate: string;
        payments: number[];
      };
    } = {};

    fees.forEach((fee) => {
      if (fee.student) {
        const studentId = fee.student_id;
        if (!studentMap[studentId]) {
          studentMap[studentId] = {
            name: fee.student.full_name,
            total_paid: 0,
            total_refunded: 0,
            count: 0,
            lastDate: fee.payment_date,
            payments: [],
          };
        }
        
        if (fee.amount > 0) {
          studentMap[studentId].total_paid += fee.amount;
          studentMap[studentId].payments.push(fee.amount);
        } else {
          studentMap[studentId].total_refunded += Math.abs(fee.amount);
        }
        
        studentMap[studentId].count += 1;
        
        if (fee.payment_date > studentMap[studentId].lastDate) {
          studentMap[studentId].lastDate = fee.payment_date;
        }
      }
    });

    return Object.values(studentMap)
      .map(s => {
        const net_paid = s.total_paid - s.total_refunded;
        const status = net_paid >= TOTAL_REQUIRED_FEES_PER_STUDENT ? 'مكتمل' : 
                      net_paid >= TOTAL_REQUIRED_FEES_PER_STUDENT * 0.7 ? 'مرتفع' : 'منخفض';
        
        return {
          student_name: s.name,
          total_paid: s.total_paid,
          total_refunded: s.total_refunded,
          net_paid,
          last_payment: formatDate(s.lastDate),
          payments_count: s.count,
          average_payment: s.payments.length > 0 ? s.total_paid / s.payments.length : 0,
          status,
        };
      })
      .sort((a, b) => b.net_paid - a.net_paid)
      .slice(0, 10);
  };

  const calculatePaymentMethods = (fees: any[]) => {
    const methods: { [key: string]: { amount: number; count: number } } = {};

    fees.forEach((fee) => {
      if (fee.amount > 0) {
        let method = 'cash';
        if (fee.notes) {
          try {
            const notes = JSON.parse(fee.notes);
            method = notes.payment_method || 'cash';
          } catch {
            method = 'cash';
          }
        }

        if (!methods[method]) {
          methods[method] = { amount: 0, count: 0 };
        }
        methods[method].amount += fee.amount;
        methods[method].count += 1;
      }
    });

    const total = Object.values(methods).reduce((a, b) => a + b.amount, 0);
    
    const methodLabels: { [key: string]: string } = {
      cash: "نقدي",
      card: "بطاقة",
      bank_transfer: "تحويل بنكي",
      check: "شيك"
    };

    const methodIcons: { [key: string]: string } = {
      cash: "💰",
      card: "💳",
      bank_transfer: "🏦",
      check: "📄"
    };
    
    return Object.entries(methods).map(([method, data]) => ({
      method: methodLabels[method] || method,
      amount: data.amount,
      count: data.count,
      percentage: total > 0 ? (data.amount / total) * 100 : 0,
      icon: methodIcons[method] || "💰",
    })).sort((a, b) => b.amount - a.amount);
  };

  // ==================== التصدير المحسن ====================

  const exportToExcel = () => {
    if (!report) return;

    try {
      // إعداد المصنف
      const wb = XLSX.utils.book_new();

      // ورقة الملخص
      const summaryData = [
        ["البيان", "القيمة"],
        ["إجمالي الإيرادات", formatCurrency(report.summary.totalRevenue)],
        ["إجمالي المصروفات", formatCurrency(report.summary.totalExpenses)],
        ["صافي الربح", formatCurrency(report.summary.netProfit)],
        ["هامش الربح", formatPercentage(report.summary.profitMargin)],
        ["نسبة التحصيل", formatPercentage(report.summary.collectionRate || 0)],
        ["الإيرادات المتوقعة", formatCurrency(report.summary.expectedRevenue || 0)],
        ["الذمم المدينة", formatCurrency(report.summary.accountsReceivable)],
        ["الذمم الدائنة", formatCurrency(report.summary.accountsPayable)],
        ["رأس المال العامل", formatCurrency(report.summary.workingCapital)],
        ["النقدية في البنك", formatCurrency(report.summary.cashInBank)],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      // ضبط عرض الأعمدة
      wsSummary['!cols'] = [{ wch: 30 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, "ملخص");

      // ورقة الإيرادات
      const revenueData = report.revenueByCategory.map(r => [
        r.category,
        formatCurrency(r.amount),
        formatPercentage(r.percentage),
        r.count.toString(),
        r.type === 'payment' ? 'دفع' : r.type === 'refund' ? 'استرداد' : r.type === 'discount' ? 'خصم' : 'غرامة'
      ]);
      revenueData.unshift(["الفئة", "المبلغ", "النسبة", "عدد العمليات", "النوع"]);
      const wsRevenue = XLSX.utils.aoa_to_sheet(revenueData);
      wsRevenue['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsRevenue, "الإيرادات");

      // ورقة المصروفات
      const expensesData = report.expensesByCategory.map(e => [
        e.category,
        formatCurrency(e.amount),
        formatPercentage(e.percentage),
        e.count.toString(),
      ]);
      expensesData.unshift(["الفئة", "المبلغ", "النسبة", "عدد العمليات"]);
      const wsExpenses = XLSX.utils.aoa_to_sheet(expensesData);
      wsExpenses['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsExpenses, "المصروفات");

      // ورقة التوقعات
      const projectionsData = report.projections.map(p => [
        p.month,
        formatCurrency(p.projectedRevenue),
        formatCurrency(p.projectedRefunds || 0),
        formatCurrency(p.projectedExpenses),
        formatCurrency(p.projectedNet || p.projectedProfit),
        p.confidence === 'high' ? 'عالية' : p.confidence === 'medium' ? 'متوسطة' : 'منخفضة',
      ]);
      projectionsData.unshift(["الشهر", "الإيرادات", "الاستردادات", "المصروفات", "صافي الربح", "مستوى الثقة"]);
      const wsProjections = XLSX.utils.aoa_to_sheet(projectionsData);
      wsProjections['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsProjections, "التوقعات");

      // ورقة النسب المالية
      const ratiosData = [
        ["نسب السيولة", ""],
        ["نسبة السيولة الحالية", report.ratios.currentRatio.toFixed(2)],
        ["نسبة السيولة السريعة", report.ratios.quickRatio.toFixed(2)],
        ["نسبة النقدية", report.ratios.cashRatio.toFixed(2)],
        ["", ""],
        ["نسب الربحية", ""],
        ["هامش الربح", formatPercentage(report.ratios.profitMargin)],
        ["العائد على الأصول", formatPercentage(report.ratios.returnOnAssets)],
        ["العائد على حقوق الملكية", formatPercentage(report.ratios.returnOnEquity)],
        ["", ""],
        ["نسب التحصيل", ""],
        ["نسبة التحصيل", formatPercentage(report.ratios.collectionRate || 0)],
        ["متوسط التحصيل لكل طالب", formatCurrency(report.ratios.averagePerStudent || 0)],
        ["المستحق لكل طالب", formatCurrency(report.ratios.expectedPerStudent || 0)],
      ];
      const wsRatios = XLSX.utils.aoa_to_sheet(ratiosData);
      wsRatios['!cols'] = [{ wch: 30 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsRatios, "النسب المالية");

      // ورقة تحليل المصاريف
      const feesBreakdownData = [
        ["نوع المصاريف", "المطلوب", "المحصل", "المتبقي", "نسبة التحصيل"],
        ...Object.entries(report.feesBreakdown.requiredFees).map(([type, amount]) => {
          const collected = report.feesBreakdown.collectedByType[type] || 0;
          const required = amount * (report.summary.expectedRevenue / report.feesBreakdown.totalRequiredPerStudent);
          const remaining = Math.max(0, required - collected);
          const percentage = required > 0 ? (collected / required) * 100 : 0;
          return [
            type,
            formatCurrency(required),
            formatCurrency(collected),
            formatCurrency(remaining),
            formatPercentage(percentage)
          ];
        })
      ];
      const wsFeesBreakdown = XLSX.utils.aoa_to_sheet(feesBreakdownData);
      wsFeesBreakdown['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsFeesBreakdown, "تحليل المصاريف");

      // حفظ الملف
      const fileName = `تقرير_مالي_${startDate}_الى_${endDate}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      alert("حدث خطأ أثناء تصدير ملف Excel");
    }
  };

  const exportToPDF = () => {
    if (!report) return;

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // تعريب المستند
      doc.setFont('helvetica', 'normal');
      
      // العنوان
      doc.setFontSize(24);
      doc.setTextColor(5, 150, 105);
      doc.text("تقرير مالي شامل", 105, 20, { align: "center" });

      // الفترة
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`الفترة: ${formatDate(startDate)} إلى ${formatDate(endDate)}`, 105, 30, { align: "center" });

      // الملخص التنفيذي
      doc.setFontSize(16);
      doc.setTextColor(5, 150, 105);
      doc.text("ملخص تنفيذي", 20, 45);

      const summaryLines = [
        [`إجمالي الإيرادات:`, formatCurrency(report.summary.totalRevenue)],
        [`إجمالي المصروفات:`, formatCurrency(report.summary.totalExpenses)],
        [`صافي الربح:`, formatCurrency(report.summary.netProfit)],
        [`هامش الربح:`, formatPercentage(report.summary.profitMargin)],
        [`نسبة التحصيل:`, formatPercentage(report.summary.collectionRate || 0)],
        [`الذمم المدينة:`, formatCurrency(report.summary.accountsReceivable)],
        [`الذمم الدائنة:`, formatCurrency(report.summary.accountsPayable)],
      ];

      let yPos = 55;
      summaryLines.forEach(([label, value]) => {
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.text(label, 30, yPos);
        doc.text(value, 100, yPos);
        yPos += 8;
      });

      // التنبيهات
      if (report.alerts.length > 0) {
        doc.addPage();
        doc.setFontSize(16);
        doc.setTextColor(5, 150, 105);
        doc.text("تنبيهات وإشعارات", 20, 20);

        let alertY = 30;
        report.alerts.forEach((alert) => {
          const color = alert.type === 'danger' ? [220, 38, 38] :
                       alert.type === 'warning' ? [245, 158, 11] :
                       alert.type === 'info' ? [59, 130, 246] : [16, 185, 129];
          
          doc.setTextColor(color[0], color[1], color[2]);
          doc.setFontSize(10);
          doc.text(`• ${alert.message}`, 25, alertY);
          alertY += 8;
        });
      }

      // جدول الإيرادات
      doc.addPage();
      doc.setFontSize(16);
      doc.setTextColor(5, 150, 105);
      doc.text("تحليل الإيرادات", 20, 20);

      const revenueTableData = report.revenueByCategory.map(r => [
        r.category,
        formatCurrency(r.amount),
        formatPercentage(r.percentage),
        r.count.toString(),
        r.type === 'payment' ? 'دفع' : r.type === 'refund' ? 'استرداد' : r.type === 'discount' ? 'خصم' : 'غرامة'
      ]);

      autoTable(doc, {
        startY: 30,
        head: [['الفئة', 'المبلغ', 'النسبة', 'عدد العمليات', 'النوع']],
        body: revenueTableData,
        theme: 'grid',
        headStyles: { 
          fillColor: [5, 150, 105],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
        },
        styles: { 
          fontSize: 8,
          halign: 'right',
          font: 'helvetica',
          cellPadding: 3,
        },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 30 },
          2: { cellWidth: 20 },
          3: { cellWidth: 20 },
          4: { cellWidth: 25 },
        },
      });

      // جدول المصروفات
      doc.addPage();
      doc.setFontSize(16);
      doc.setTextColor(5, 150, 105);
      doc.text("تحليل المصروفات", 20, 20);

      const expensesTableData = report.expensesByCategory.map(e => [
        e.category,
        formatCurrency(e.amount),
        formatPercentage(e.percentage),
        e.count.toString(),
      ]);

      autoTable(doc, {
        startY: 30,
        head: [['الفئة', 'المبلغ', 'النسبة', 'عدد العمليات']],
        body: expensesTableData,
        theme: 'grid',
        headStyles: { 
          fillColor: [5, 150, 105],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
        },
        styles: { 
          fontSize: 8,
          halign: 'right',
          font: 'helvetica',
          cellPadding: 3,
        },
      });

      // أفضل الطلاب
      doc.addPage();
      doc.setFontSize(16);
      doc.setTextColor(5, 150, 105);
      doc.text("أفضل 10 طلاب من حيث السداد", 20, 20);

      const studentsTableData = report.topStudents.map(s => [
        s.student_name,
        formatCurrency(s.total_paid),
        formatCurrency(s.total_refunded),
        formatCurrency(s.net_paid),
        s.payments_count.toString(),
        formatCurrency(s.average_payment),
        s.last_payment,
        s.status,
      ]);

      autoTable(doc, {
        startY: 30,
        head: [['اسم الطالب', 'إجمالي المدفوعات', 'إجمالي الاستردادات', 'صافي المدفوعات', 'عدد الدفعات', 'متوسط الدفعة', 'آخر دفعة', 'الحالة']],
        body: studentsTableData,
        theme: 'grid',
        headStyles: { 
          fillColor: [5, 150, 105],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
        },
        styles: { 
          fontSize: 7,
          halign: 'right',
          font: 'helvetica',
          cellPadding: 2,
        },
      });

      // حفظ الملف
      const fileName = `تقرير_مالي_شامل_${startDate}.pdf`;
      doc.save(fileName);

    } catch (error) {
      console.error("Error exporting to PDF:", error);
      setError("حدث خطأ أثناء تصدير ملف PDF");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" dir="rtl">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-500 mt-4">جاري تحميل التقرير المالي...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* العنوان وأدوات التحكم */}
      <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm p-6 border border-gray-100/50">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">التقارير المالية الشاملة</h2>
            <p className="text-sm text-gray-600 mt-1">
              تحليل مالي متقدم مع نسب ومؤشرات أداء وتوقعات ذكية
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
            >
              <option value="daily">يومي</option>
              <option value="weekly">أسبوعي</option>
              <option value="monthly">شهري</option>
              <option value="yearly">سنوي</option>
              <option value="custom">مخصص</option>
            </select>

            {reportType === "custom" && (
              <>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm"
                />
              </>
            )}

            <button
              onClick={loadReport}
              className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
              title="تحديث"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            <button
              onClick={exportToExcel}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
              title="تصدير Excel"
            >
              <Download className="w-5 h-5" />
            </button>

            <button
              onClick={exportToPDF}
              className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
              title="تصدير PDF"
            >
              <FileText className="w-5 h-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border-r-4 border-red-600 p-4 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        )}
      </div>

      {report && (
        <>
          {/* التنبيهات */}
          {report.alerts.length > 0 && (
            <div className="space-y-2">
              {report.alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg flex items-start gap-3 ${
                    alert.type === 'danger' ? 'bg-red-50 text-red-800 border-r-4 border-red-600' :
                    alert.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border-r-4 border-yellow-600' :
                    alert.type === 'info' ? 'bg-blue-50 text-blue-800 border-r-4 border-blue-600' :
                    'bg-green-50 text-green-800 border-r-4 border-green-600'
                  }`}
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{alert.message}</p>
                    <p className="text-sm mt-1 opacity-75">
                      القيمة الحالية: {alert.currentValue.toFixed(1)} | 
                      الحد الأدنى: {alert.threshold}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* بطاقات المؤشرات الرئيسية */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-6 h-6 opacity-80" />
                <span className="text-xs opacity-80">صافي الإيرادات</span>
              </div>
              <p className="text-2xl font-bold">
                {formatCurrency(report.summary.totalRevenue)}
              </p>
              <div className="mt-2 flex items-center gap-1 text-sm opacity-80">
                <ArrowUpRight className="w-4 h-4" />
                <span>نسبة التحصيل: {report.summary.collectionRate?.toFixed(1)}%</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-600 to-rose-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <TrendingDown className="w-6 h-6 opacity-80" />
                <span className="text-xs opacity-80">إجمالي المصروفات</span>
              </div>
              <p className="text-2xl font-bold">
                {formatCurrency(report.summary.totalExpenses)}
              </p>
              <div className="mt-2 flex items-center gap-1 text-sm opacity-80">
                <ArrowDownRight className="w-4 h-4" />
                <span>{report.expensesByCategory.length} فئة</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-6 h-6 opacity-80" />
                <span className="text-xs opacity-80">صافي الربح</span>
              </div>
              <p className="text-2xl font-bold">
                {report.summary.netProfit >= 0 ? '+' : ''}
                {formatCurrency(report.summary.netProfit)}
              </p>
              <div className="mt-2 text-sm opacity-80">
                هامش الربح: {report.summary.profitMargin.toFixed(1)}%
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <Shield className="w-6 h-6 opacity-80" />
                <span className="text-xs opacity-80">المستحقات</span>
              </div>
              <p className="text-2xl font-bold">
                {formatCurrency(report.summary.accountsReceivable)}
              </p>
              <div className="mt-2 text-sm opacity-80">
                متأخرات: {formatCurrency(report.receivables?.overdue || 0)}
              </div>
            </div>
          </div>

          {/* الذمم المالية */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">الذمم المدينة</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-gray-600">إجمالي المستحقات</span>
                  <span className="text-xl font-bold text-gray-900">
                    {formatCurrency(report.summary.accountsReceivable)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">متأخرات</span>
                  <span className="text-red-600 font-medium">
                    {formatCurrency(report.receivables?.overdue || 0)}
                  </span>
                </div>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <AlertCircle className="w-4 h-4 inline ml-1" />
                    {report.receivables?.overdue > report.receivables?.total * 0.3 
                      ? 'نسبة المتأخرات مرتفعة - يفضل متابعة التحصيل'
                      : 'مستوى المتأخرات مقبول'}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">الذمم الدائنة</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-gray-600">إجمالي الالتزامات</span>
                  <span className="text-xl font-bold text-gray-900">
                    {formatCurrency(report.summary.accountsPayable)}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">رواتب مستحقة</span>
                    <span>{formatCurrency(report.payables?.breakdown?.salaries || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">مصروفات غير مدفوعة</span>
                    <span>{formatCurrency(report.payables?.breakdown?.expenses || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">فواتير مستحقة</span>
                    <span>{formatCurrency(report.payables?.breakdown?.bills || 0)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* تحليل المصاريف */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">تحليل المصاريف الدراسية</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {Object.entries(report.feesBreakdown.requiredFees).map(([type, amount]) => {
                const collected = report.feesBreakdown.collectedByType[type] || 0;
                const required = amount * (report.summary.expectedRevenue / report.feesBreakdown.totalRequiredPerStudent);
                const percentage = required > 0 ? (collected / required) * 100 : 0;
                
                return (
                  <div key={type} className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">{type}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>المطلوب:</span>
                        <span className="font-medium">{formatCurrency(required)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>المحصل:</span>
                        <span className="font-medium text-green-600">{formatCurrency(collected)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>المتبقي:</span>
                        <span className={`font-medium ${required - collected > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(Math.max(0, required - collected))}
                        </span>
                      </div>
                      <div className="mt-2">
                        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${percentage >= 100 ? 'bg-green-600' : percentage >= 50 ? 'bg-yellow-600' : 'bg-red-600'}`}
                            style={{ width: `${Math.min(100, percentage)}%` }}
                          />
                        </div>
                        <p className="text-xs text-center mt-1">{percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* النسب المالية المحسنة */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">النسب والمؤشرات المالية</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">نسبة السيولة</p>
                <p className="text-xl font-bold text-blue-600">
                  {report.ratios.currentRatio.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">المثالي: {'>'} 1.5</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">النسبة السريعة</p>
                <p className="text-xl font-bold text-indigo-600">
                  {report.ratios.quickRatio.toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">المثالي: {'>'} 1</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">هامش الربح</p>
                <p className={`text-xl font-bold ${
                  report.ratios.profitMargin > 20 ? 'text-green-600' :
                  report.ratios.profitMargin > 10 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {report.ratios.profitMargin.toFixed(1)}%
                </p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">نسبة التحصيل</p>
                <p className={`text-xl font-bold ${
                  (report.ratios.collectionRate || 0) > 80 ? 'text-green-600' :
                  (report.ratios.collectionRate || 0) > 50 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {(report.ratios.collectionRate || 0).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>

          {/* الرسوم البيانية */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* الإيرادات حسب الفئة */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">توزيع الإيرادات</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={report.revenueByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent = 0 }) => 
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                    outerRadius={80}
                    dataKey="amount"
                    nameKey="category"
                  >
                    {report.revenueByCategory.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>

            {/* المصروفات حسب الفئة */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">توزيع المصروفات</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={report.expensesByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent = 0 }) => 
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                    outerRadius={80}
                    dataKey="amount"
                    nameKey="category"
                  >
                    {report.expensesByCategory.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>

            {/* المعاملات اليومية */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">المعاملات اليومية</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={report.dailyTransactions}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#059669"
                    fill="#059669"
                    fillOpacity={0.3}
                    name="صافي الإيرادات"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.3}
                    name="المصروفات"
                  />
                  <Area
                    type="monotone"
                    dataKey="payments"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                    name="المدفوعات"
                  />
                  <Area
                    type="monotone"
                    dataKey="refunds"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.3}
                    name="الاستردادات"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* أفضل الطلاب */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">أفضل 10 طلاب من حيث السداد</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-right">#</th>
                    <th className="px-4 py-2 text-right">اسم الطالب</th>
                    <th className="px-4 py-2 text-right">إجمالي المدفوعات</th>
                    <th className="px-4 py-2 text-right">إجمالي الاستردادات</th>
                    <th className="px-4 py-2 text-right">صافي المدفوعات</th>
                    <th className="px-4 py-2 text-right">عدد الدفعات</th>
                    <th className="px-4 py-2 text-right">متوسط الدفعة</th>
                    <th className="px-4 py-2 text-right">آخر دفعة</th>
                    <th className="px-4 py-2 text-right">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topStudents.map((student, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">{index + 1}</td>
                      <td className="px-4 py-2 font-medium">{student.student_name}</td>
                      <td className="px-4 py-2 text-green-600">
                        {formatCurrency(student.total_paid)}
                      </td>
                      <td className="px-4 py-2 text-red-600">
                        {formatCurrency(student.total_refunded)}
                      </td>
                      <td className={`px-4 py-2 font-bold ${student.net_paid >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(student.net_paid)}
                      </td>
                      <td className="px-4 py-2">{student.payments_count}</td>
                      <td className="px-4 py-2">
                        {formatCurrency(student.average_payment)}
                      </td>
                      <td className="px-4 py-2">{student.last_payment}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          student.status === 'مكتمل' ? 'bg-green-100 text-green-700' :
                          student.status === 'مرتفع' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {student.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* التوقعات المستقبلية المحسنة */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">التوقعات المالية للأشهر القادمة</h3>
              <div className="flex items-center gap-4">
                <select
                  value={confidenceLevel}
                  onChange={(e) => setConfidenceLevel(e.target.value as any)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg"
                >
                  <option value="high">ثقة عالية</option>
                  <option value="medium">ثقة متوسطة</option>
                  <option value="low">ثقة منخفضة</option>
                </select>
                <button
                  onClick={() => setShowProjections(!showProjections)}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  {showProjections ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{showProjections ? "إخفاء" : "عرض"}</span>
                </button>
              </div>
            </div>

            {showProjections && (
              <>
                {/* الرسم البياني للتوقعات */}
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={report.projections.filter(p => 
                    confidenceLevel === 'high' ? p.confidence === 'high' :
                    confidenceLevel === 'medium' ? ['high', 'medium'].includes(p.confidence) :
                    true
                  )}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="projectedRevenue" name="الإيرادات المتوقعة" fill="#059669" />
                    <Bar dataKey="projectedRefunds" name="الاستردادات المتوقعة" fill="#f59e0b" />
                    <Bar dataKey="projectedExpenses" name="المصروفات المتوقعة" fill="#ef4444" />
                    <Bar dataKey="projectedNet" name="صافي الربح المتوقع" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>

                {/* جدول التوقعات */}
                <div className="overflow-x-auto mt-4">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-2 text-right">الشهر</th>
                        <th className="px-4 py-2 text-right">الإيرادات المتوقعة</th>
                        <th className="px-4 py-2 text-right">الاستردادات المتوقعة</th>
                        <th className="px-4 py-2 text-right">المصروفات المتوقعة</th>
                        <th className="px-4 py-2 text-right">صافي الربح المتوقع</th>
                        <th className="px-4 py-2 text-right">مستوى الثقة</th>
                        <th className="px-4 py-2 text-right">العامل الموسمي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.projections
                        .filter(p => confidenceLevel === 'high' ? p.confidence === 'high' :
                                    confidenceLevel === 'medium' ? ['high', 'medium'].includes(p.confidence) :
                                    true)
                        .map((proj, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium">{proj.month}</td>
                          <td className="px-4 py-2 text-green-600">
                            {formatCurrency(proj.projectedRevenue)}
                          </td>
                          <td className="px-4 py-2 text-yellow-600">
                            {formatCurrency(proj.projectedRefunds || 0)}
                          </td>
                          <td className="px-4 py-2 text-red-600">
                            {formatCurrency(proj.projectedExpenses)}
                          </td>
                          <td className={`px-4 py-2 ${(proj.projectedNet || proj.projectedProfit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {(proj.projectedNet || proj.projectedProfit) >= 0 ? '+' : ''}
                            {formatCurrency(proj.projectedNet || proj.projectedProfit)}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              proj.confidence === 'high' ? 'bg-green-100 text-green-700' :
                              proj.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {proj.confidence === 'high' ? 'عالية' :
                               proj.confidence === 'medium' ? 'متوسطة' : 'منخفضة'}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            {proj.seasonalFactor.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}