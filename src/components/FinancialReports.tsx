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
const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const toArabicNumber = (num: number | string): string => {
  return num.toString().replace(/[0-9]/g, (d) => arabicNumbers[parseInt(d)]);
};

const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

const formatPercentage = (num: number): string => {
  return new Intl.NumberFormat('ar-EG', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(num / 100);
};

const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatMonth = (date: Date): string => {
  return date.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
  });
};

// ==================== أنواع البيانات ====================
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
    currentRatio: number;
    quickRatio: number;
    cashRatio: number;
    profitMargin: number;
    returnOnAssets: number;
    returnOnEquity: number;
    operatingMargin: number;
    grossMargin: number;
    assetTurnover: number;
    receivableTurnover: number;
    averageCollectionPeriod: number;
    collectionRate: number;
    averagePerStudent: number;
    expectedPerStudent: number;
    debtRatio: number;
    debtToEquity: number;
    interestCoverage: number;
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
    byStudent: any[];
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

const validateData = (data: any[], requiredFields: string[]): boolean => {
  return data.every(item => 
    requiredFields.every(field => item[field] !== undefined && item[field] !== null)
  );
};

const calculateSeasonalFactors = (months: number = 12): number[] => {
  const factors = [];
  for (let i = 0; i < months; i++) {
    let monthFactor = 1.0;
    if (i === 8) monthFactor = 1.5; // سبتمبر
    else if (i === 9) monthFactor = 1.3; // أكتوبر
    else if (i === 10) monthFactor = 1.2; // نوفمبر
    else if (i === 11) monthFactor = 1.1; // ديسمبر
    else if (i === 5 || i === 6 || i === 7) monthFactor = 0.7; // يونيو-أغسطس
    else monthFactor = 0.9;
    factors.push(monthFactor);
  }
  return factors;
};

export default function FinancialReports() {
  const { authUser, currentSchool } = useAuth(); // ✅ إضافة currentSchool
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<"daily" | "weekly" | "monthly" | "yearly" | "custom">("monthly");
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [showProjections, setShowProjections] = useState(false);
  const [confidenceLevel, setConfidenceLevel] = useState<'high' | 'medium' | 'low'>('medium');

  const COLORS = ["#059669", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

  const REQUIRED_FEES_MAP = {
    "رسوم دراسية": 5000,
    "رسوم الكتب": 500,
    "رسوم الأنشطة": 300,
    "رسوم الزي المدرسي": 400,
    "رسوم الباص": 800,
  };
  
  const TOTAL_REQUIRED_FEES_PER_STUDENT = Object.values(REQUIRED_FEES_MAP).reduce((a, b) => a + b, 0);

  useEffect(() => {
    if (validateDates() && currentSchool) {
      loadReport();
    }
  }, [reportType, startDate, endDate, currentSchool]);

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

  // ==================== دوال الحساب ====================

  const calculateAccountsReceivable = (fees: any[], students: any[]) => {
    try {
      const paymentsMap: { [key: string]: { paid: number; refunded: number; net: number; paymentsByType: any; lastPaymentDate: string | undefined } } = {};
      
      fees.forEach(fee => {
        if (!paymentsMap[fee.student_id]) {
          paymentsMap[fee.student_id] = { paid: 0, refunded: 0, net: 0, paymentsByType: {}, lastPaymentDate: undefined };
        }
        
        if (fee.amount > 0) {
          paymentsMap[fee.student_id].paid += fee.amount;
          paymentsMap[fee.student_id].net += fee.amount;
          if (!paymentsMap[fee.student_id].paymentsByType[fee.payment_type]) {
            paymentsMap[fee.student_id].paymentsByType[fee.payment_type] = { positive: 0, negative: 0 };
          }
          paymentsMap[fee.student_id].paymentsByType[fee.payment_type].positive += fee.amount;
        } else {
          const absAmount = Math.abs(fee.amount);
          paymentsMap[fee.student_id].refunded += absAmount;
          paymentsMap[fee.student_id].net -= absAmount;
          if (!paymentsMap[fee.student_id].paymentsByType[fee.payment_type]) {
            paymentsMap[fee.student_id].paymentsByType[fee.payment_type] = { positive: 0, negative: 0 };
          }
          paymentsMap[fee.student_id].paymentsByType[fee.payment_type].negative += absAmount;
        }

        if (!paymentsMap[fee.student_id].lastPaymentDate || fee.payment_date > paymentsMap[fee.student_id].lastPaymentDate!) {
          paymentsMap[fee.student_id].lastPaymentDate = fee.payment_date;
        }
      });

      let totalReceivable = 0;
      let overdueReceivables = 0;
      const today = new Date();

      students.forEach(student => {
        const studentData = paymentsMap[student.id] || { paid: 0, refunded: 0, net: 0, paymentsByType: {}, lastPaymentDate: null };
        const outstanding = Math.max(0, TOTAL_REQUIRED_FEES_PER_STUDENT - studentData.net);
        
        if (outstanding > 0) {
          totalReceivable += outstanding;
          if (studentData.lastPaymentDate) {
            const lastPaymentDate = new Date(studentData.lastPaymentDate);
            const monthsSinceLastPayment = (today.getFullYear() - lastPaymentDate.getFullYear()) * 12 + (today.getMonth() - lastPaymentDate.getMonth());
            if (monthsSinceLastPayment > 2 && outstanding > 0) {
              overdueReceivables += outstanding;
            }
          } else {
            const enrollmentDate = new Date(student.enrollment_date || today);
            const monthsSinceEnrollment = (today.getFullYear() - enrollmentDate.getFullYear()) * 12 + (today.getMonth() - enrollmentDate.getMonth());
            if (monthsSinceEnrollment > 1) {
              overdueReceivables += outstanding;
            }
          }
        }
      });

      const byStudent = students.map(student => {
        const studentData = paymentsMap[student.id] || { paid: 0, refunded: 0, net: 0, paymentsByType: {}, lastPaymentDate: null };
        const outstanding = Math.max(0, TOTAL_REQUIRED_FEES_PER_STUDENT - studentData.net);
        const paymentRatio = TOTAL_REQUIRED_FEES_PER_STUDENT > 0 ? (studentData.net / TOTAL_REQUIRED_FEES_PER_STUDENT) * 100 : 0;
        
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
          status: outstanding <= 0 ? 'مدفوع بالكامل' : paymentRatio >= 70 ? 'مدفوع معظمه' : paymentRatio >= 30 ? 'مدفوع جزئياً' : 'غير مدفوع',
          paymentsByType: studentData.paymentsByType,
          lastPaymentDate: studentData.lastPaymentDate
        };
      });

      return { total: totalReceivable, overdue: overdueReceivables, byStudent };
    } catch (error) {
      console.error("Error calculating receivables:", error);
      return { total: 0, overdue: 0, byStudent: [] };
    }
  };

  const calculateAccountsPayable = (expenses: any[], teachers: any[], unpaidBills: any[]) => {
    try {
      const teacherSalaries = teachers.filter(t => t.status === "active").reduce((sum, t) => sum + (t.salary || 0), 0);
      const unpaidExpenses = expenses.filter(e => e.status === "unpaid").reduce((sum, e) => sum + e.amount, 0);
      const bills = unpaidBills?.reduce((sum, b) => sum + (b.amount || 0), 0) || 0;
      const shortTermLiabilities = teacherSalaries + unpaidExpenses + bills;
      const longTermLiabilities = 0;

      return {
        total: shortTermLiabilities + longTermLiabilities,
        shortTerm: shortTermLiabilities,
        longTerm: longTermLiabilities,
        breakdown: { salaries: teacherSalaries, expenses: unpaidExpenses, bills: bills }
      };
    } catch (error) {
      console.error("Error calculating payables:", error);
      return { total: 0, shortTerm: 0, longTerm: 0, breakdown: { salaries: 0, expenses: 0, bills: 0 } };
    }
  };

  const calculateProjections = (fees: any[], expenses: any[], students: any[], months: number = 6) => {
    try {
      const activeStudents = students.filter(s => s.status === "active").length;
      const expectedAnnualRevenue = activeStudents * TOTAL_REQUIRED_FEES_PER_STUDENT;
      
      const paymentsByMonth: { [key: string]: { payments: number; refunds: number; net: number } } = {};
      
      fees.forEach(fee => {
        const month = fee.payment_date.substring(0, 7);
        if (!paymentsByMonth[month]) paymentsByMonth[month] = { payments: 0, refunds: 0, net: 0 };
        
        if (fee.amount > 0) {
          paymentsByMonth[month].payments += fee.amount;
          paymentsByMonth[month].net += fee.amount;
        } else {
          paymentsByMonth[month].refunds += Math.abs(fee.amount);
          paymentsByMonth[month].net -= Math.abs(fee.amount);
        }
      });

      const months_data = Object.keys(paymentsByMonth);
      const avgMonthlyPayment = months_data.length > 0
        ? months_data.reduce((sum, m) => sum + (paymentsByMonth[m].payments || 0), 0) / months_data.length
        : expectedAnnualRevenue / 12;
      
      const avgMonthlyRefund = months_data.length > 0
        ? months_data.reduce((sum, m) => sum + (paymentsByMonth[m].refunds || 0), 0) / months_data.length
        : 0;

      const expensesByMonth: { [key: string]: number } = {};
      expenses.forEach(expense => {
        const month = expense.expense_date.substring(0, 7);
        expensesByMonth[month] = (expensesByMonth[month] || 0) + expense.amount;
      });
      
      const avgMonthlyExpenses = Object.keys(expensesByMonth).length > 0
        ? Object.values(expensesByMonth).reduce((a, b) => a + b, 0) / Object.keys(expensesByMonth).length
        : 0;

      const seasonalFactors = calculateSeasonalFactors(12);
      const dataQuality = months_data.length / 12;
      
      const projections = [];
      const currentDate = new Date();

      for (let i = 1; i <= months; i++) {
        const nextMonth = new Date(currentDate);
        nextMonth.setMonth(nextMonth.getMonth() + i);
        const monthIndex = (currentDate.getMonth() + i) % 12;
        const seasonalFactor = seasonalFactors[monthIndex];
        const isStartOfYear = monthIndex === 8;
        const startOfYearFactor = isStartOfYear ? 1.5 : 1;
        const growthRate = 0.05;
        const growthFactor = Math.pow(1 + growthRate, i / 12);
        
        const projectedPayments = avgMonthlyPayment * seasonalFactor * startOfYearFactor * growthFactor;
        const projectedRefunds = avgMonthlyRefund * seasonalFactor;
        const projectedExpensesAmount = avgMonthlyExpenses * seasonalFactor * growthFactor;
        
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

  const calculateGrowthRate = (data: number[]): number => {
    if (data.length < 2) return 0.05;
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    return firstAvg > 0 ? (secondAvg - firstAvg) / firstAvg : 0.05;
  };

  const calculateFinancialRatios = (fees: any[], expenses: any[], teachers: any[], students: any[], receivables: any, payables: any) => {
    try {
      const activeStudents = students.filter(s => s.status === "active").length;
      const expectedTotalRevenue = activeStudents * TOTAL_REQUIRED_FEES_PER_STUDENT;
      
      const totalPayments = fees.filter(f => f.amount > 0).reduce((sum, f) => sum + f.amount, 0);
      const totalRefunds = fees.filter(f => f.amount < 0).reduce((sum, f) => sum + Math.abs(f.amount), 0);
      const netRevenue = totalPayments - totalRefunds;
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const netProfit = netRevenue - totalExpenses;

      const cashInBank = 100000;
      const accountsReceivable = receivables.total || 0;
      const inventory = 50000;
      const currentAssets = cashInBank + accountsReceivable + inventory;
      const accountsPayable = payables.shortTerm || 0;
      const currentLiabilities = accountsPayable;
      const fixedAssets = 500000;
      const totalAssets = currentAssets + fixedAssets;
      const equity = totalAssets - payables.total;

      const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
      const quickRatio = currentLiabilities > 0 ? (currentAssets - inventory) / currentLiabilities : 0;
      const cashRatio = currentLiabilities > 0 ? cashInBank / currentLiabilities : 0;
      const profitMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;
      const returnOnAssets = totalAssets > 0 ? (netProfit / totalAssets) * 100 : 0;
      const returnOnEquity = equity > 0 ? (netProfit / equity) * 100 : 0;
      const operatingMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;
      const grossMargin = netRevenue > 0 ? ((netRevenue - totalExpenses) / netRevenue) * 100 : 0;
      const assetTurnover = totalAssets > 0 ? netRevenue / totalAssets : 0;
      const receivableTurnover = accountsReceivable > 0 ? netRevenue / accountsReceivable : 0;
      const averageCollectionPeriod = receivableTurnover > 0 ? 365 / receivableTurnover : 0;
      const collectionRate = expectedTotalRevenue > 0 ? (netRevenue / expectedTotalRevenue) * 100 : 0;
      const averagePerStudent = activeStudents > 0 ? netRevenue / activeStudents : 0;
      const debtRatio = totalAssets > 0 ? payables.total / totalAssets : 0;
      const debtToEquity = equity > 0 ? payables.total / equity : 0;
      const revenueGrowth = calculateGrowthRate(fees.filter(f => f.amount > 0).map(f => f.amount)) * 100;

      return {
        currentRatio, quickRatio, cashRatio, profitMargin, returnOnAssets, returnOnEquity,
        operatingMargin, grossMargin, assetTurnover, receivableTurnover, averageCollectionPeriod,
        collectionRate, averagePerStudent, expectedPerStudent: TOTAL_REQUIRED_FEES_PER_STUDENT,
        debtRatio, debtToEquity, interestCoverage: 5, revenueGrowth, profitGrowth: 8, expenseGrowth: 5,
      };
    } catch (error) {
      console.error("Error calculating ratios:", error);
      return {
        currentRatio: 0, quickRatio: 0, cashRatio: 0, profitMargin: 0, returnOnAssets: 0, returnOnEquity: 0,
        operatingMargin: 0, grossMargin: 0, assetTurnover: 0, receivableTurnover: 0, averageCollectionPeriod: 0,
        collectionRate: 0, averagePerStudent: 0, expectedPerStudent: TOTAL_REQUIRED_FEES_PER_STUDENT,
        debtRatio: 0, debtToEquity: 0, interestCoverage: 0, revenueGrowth: 0, profitGrowth: 0, expenseGrowth: 0,
      };
    }
  };

  const generateAlerts = (ratios: any, receivables: any, payables: any, projections: any[], fees: any[]) => {
    const alerts: any[] = [];

    if (ratios.currentRatio < 1) {
      alerts.push({ type: 'danger', message: 'نسبة السيولة الحالية أقل من 1 - خطر عدم القدرة على سداد الالتزامات', metric: 'currentRatio', threshold: 1, currentValue: ratios.currentRatio });
    } else if (ratios.currentRatio < 1.5) {
      alerts.push({ type: 'warning', message: 'نسبة السيولة الحالية أقل من المعدل المثالي (1.5)', metric: 'currentRatio', threshold: 1.5, currentValue: ratios.currentRatio });
    }

    if (receivables.total > 0) {
      const overdueRatio = (receivables.overdue / receivables.total) * 100;
      if (overdueRatio > 30) {
        alerts.push({ type: 'warning', message: `نسبة المتأخرات مرتفعة (${overdueRatio.toFixed(1)}%) - تحتاج متابعة`, metric: 'overdueRatio', threshold: 30, currentValue: overdueRatio });
      }
    }

    if (ratios.profitMargin < 10 && ratios.profitMargin > 0) {
      alerts.push({ type: 'warning', message: 'هامش الربح منخفض - أقل من 10%', metric: 'profitMargin', threshold: 10, currentValue: ratios.profitMargin });
    } else if (ratios.profitMargin < 0) {
      alerts.push({ type: 'danger', message: 'الشركة تعمل بخسارة - تحتاج إلى إجراءات فورية', metric: 'profitMargin', threshold: 0, currentValue: ratios.profitMargin });
    }

    if (ratios.collectionRate < 50) {
      alerts.push({ type: 'danger', message: `نسبة التحصيل منخفضة جداً (${ratios.collectionRate.toFixed(1)}%) - أقل من 50%`, metric: 'collectionRate', threshold: 50, currentValue: ratios.collectionRate });
    } else if (ratios.collectionRate < 70) {
      alerts.push({ type: 'warning', message: `نسبة التحصيل أقل من المستهدف (${ratios.collectionRate.toFixed(1)}%)`, metric: 'collectionRate', threshold: 70, currentValue: ratios.collectionRate });
    }

    const lastProjection = projections[projections.length - 1];
    if (lastProjection && lastProjection.confidence === 'low') {
      alerts.push({ type: 'info', message: 'دقة التوقعات للأشهر القادمة منخفضة - نقص في البيانات التاريخية', metric: 'forecastConfidence', threshold: 0.5, currentValue: 0.3 });
    }

    if (ratios.revenueGrowth < 0) {
      alerts.push({ type: 'warning', message: `نمو الإيرادات سلبي (${ratios.revenueGrowth.toFixed(1)}%) - تراجع مقارنة بالفترة السابقة`, metric: 'revenueGrowth', threshold: 0, currentValue: ratios.revenueGrowth });
    }

    const collectedTypes = new Set();
    fees.forEach(fee => { if (fee.amount > 0) collectedTypes.add(fee.payment_type); });
    const missingTypes = Object.keys(REQUIRED_FEES_MAP).filter(type => !collectedTypes.has(type));
    if (missingTypes.length > 0) {
      alerts.push({ type: 'info', message: `بعض أنواع المصاريف لم يتم تحصيلها: ${missingTypes.slice(0, 3).join('، ')}${missingTypes.length > 3 ? '...' : ''}`, metric: 'missingFeeTypes', threshold: Object.keys(REQUIRED_FEES_MAP).length, currentValue: collectedTypes.size });
    }

    return alerts;
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
        categories[fee.payment_type].amount += fee.amount;
        categories[fee.payment_type].negative += Math.abs(fee.amount);
      }
      categories[fee.payment_type].count += 1;
    });

    const total = Object.values(categories).reduce((a, b) => a + Math.abs(b.amount), 0);
    
    return Object.entries(categories).map(([category, data]) => {
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
    const dateMap: { [key: string]: { revenue: number; expenses: number; payments: number; refunds: number } } = {};

    fees.forEach((fee) => {
      const date = fee.payment_date;
      if (!dateMap[date]) dateMap[date] = { revenue: 0, expenses: 0, payments: 0, refunds: 0 };
      if (fee.amount > 0) {
        dateMap[date].revenue += fee.amount;
        dateMap[date].payments += fee.amount;
      } else {
        dateMap[date].revenue += fee.amount;
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
    const studentMap: { [key: string]: { name: string; total_paid: number; total_refunded: number; count: number; lastDate: string; payments: number[] } } = {};

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
        const status = net_paid >= TOTAL_REQUIRED_FEES_PER_STUDENT ? 'مكتمل' : net_paid >= TOTAL_REQUIRED_FEES_PER_STUDENT * 0.7 ? 'مرتفع' : 'منخفض';
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
          } catch { method = 'cash'; }
        }
        if (!methods[method]) methods[method] = { amount: 0, count: 0 };
        methods[method].amount += fee.amount;
        methods[method].count += 1;
      }
    });

    const total = Object.values(methods).reduce((a, b) => a + b.amount, 0);
    const methodLabels: { [key: string]: string } = { cash: "نقدي", card: "بطاقة", bank_transfer: "تحويل بنكي", check: "شيك" };
    const methodIcons: { [key: string]: string } = { cash: "💰", card: "💳", bank_transfer: "🏦", check: "📄" };
    
    return Object.entries(methods).map(([method, data]) => ({
      method: methodLabels[method] || method,
      amount: data.amount,
      count: data.count,
      percentage: total > 0 ? (data.amount / total) * 100 : 0,
      icon: methodIcons[method] || "💰",
    })).sort((a, b) => b.amount - a.amount);
  };

  // ==================== تحميل التقرير الرئيسي (المُصلح) ====================

  const loadReport = async () => {
    // ✅ التحقق من وجود currentSchool
    if (!currentSchool) {
      setError("لم يتم تحديد المدرسة الحالية");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // ✅ تصحيح: استخدام school_id بدلاً من user_id
      const [feesResult, expensesResult, studentsResult, teachersResult] = await Promise.all([
        supabase
          .from("fees")
          .select("*, student:students(*)")
          .eq("school_id", currentSchool.id)
          .gte("payment_date", startDate)
          .lte("payment_date", endDate),
        supabase
          .from("expenses")
          .select("*")
          .eq("school_id", currentSchool.id)
          .gte("expense_date", startDate)
          .lte("expense_date", endDate),
        supabase
          .from("students")
          .select("*")
          .eq("school_id", currentSchool.id),
        supabase
          .from("teachers")
          .select("*")
          .eq("school_id", currentSchool.id),
      ]);

      if (feesResult.error) console.error("Fees error:", feesResult.error);
      if (expensesResult.error) console.error("Expenses error:", expensesResult.error);

      const fees = feesResult.data || [];
      const expenses = expensesResult.data || [];
      const students = studentsResult.data || [];
      const teachers = teachersResult.data || [];

      if (!validateData(fees, ['amount', 'payment_type', 'student_id'])) {
        console.warn("بعض بيانات الرسوم غير مكتملة");
      }

      const receivables = calculateAccountsReceivable(fees, students);
      const payables = calculateAccountsPayable(expenses, teachers, []);

      const totalPayments = fees.filter(f => f.amount > 0).reduce((sum, f) => sum + f.amount, 0);
      const totalRefunds = fees.filter(f => f.amount < 0).reduce((sum, f) => sum + Math.abs(f.amount), 0);
      const totalRevenue = totalPayments - totalRefunds;
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
      const netProfit = totalRevenue - totalExpenses;

      const revenueByCategory = calculateRevenueByCategory(fees);
      const expensesByCategory = calculateExpensesByCategory(expenses);
      const dailyTransactions = calculateDailyTransactions(fees, expenses);
      const topStudents = calculateTopStudents(fees, students);
      const paymentMethods = calculatePaymentMethods(fees);
      const projections = calculateProjections(fees, expenses, students, 6);
      const ratios = calculateFinancialRatios(fees, expenses, teachers, students, receivables, payables);
      const alerts = generateAlerts(ratios, receivables, payables, projections, fees);

      const cashInBank = 100000;
      const operatingCashFlow = totalRevenue - totalExpenses;
      const investingCashFlow = -50000;
      const financingCashFlow = 0;
      const activeStudents = students.filter(s => s.status === "active").length;
      const expectedRevenue = activeStudents * TOTAL_REQUIRED_FEES_PER_STUDENT;

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

  // ==================== دوال التصدير ====================

  const exportToExcel = () => {
    if (!report) return;
    try {
      const wb = XLSX.utils.book_new();

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
      wsSummary['!cols'] = [{ wch: 30 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, "ملخص");

      const revenueData = report.revenueByCategory.map(r => [
        r.category, formatCurrency(r.amount), formatPercentage(r.percentage), r.count.toString(),
        r.type === 'payment' ? 'دفع' : r.type === 'refund' ? 'استرداد' : r.type === 'discount' ? 'خصم' : 'غرامة'
      ]);
      revenueData.unshift(["الفئة", "المبلغ", "النسبة", "عدد العمليات", "النوع"]);
      const wsRevenue = XLSX.utils.aoa_to_sheet(revenueData);
      wsRevenue['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsRevenue, "الإيرادات");

      const expensesData = report.expensesByCategory.map(e => [e.category, formatCurrency(e.amount), formatPercentage(e.percentage), e.count.toString()]);
      expensesData.unshift(["الفئة", "المبلغ", "النسبة", "عدد العمليات"]);
      const wsExpenses = XLSX.utils.aoa_to_sheet(expensesData);
      wsExpenses['!cols'] = [{ wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsExpenses, "المصروفات");

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
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(24);
      doc.setTextColor(5, 150, 105);
      doc.text("تقرير مالي شامل", 105, 20, { align: "center" });
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text(`الفترة: ${formatDate(startDate)} إلى ${formatDate(endDate)}`, 105, 30, { align: "center" });
      doc.setFontSize(16);
      doc.setTextColor(5, 150, 105);
      doc.text("ملخص تنفيذي", 20, 45);

      const summaryLines = [
        ["إجمالي الإيرادات:", formatCurrency(report.summary.totalRevenue)],
        ["إجمالي المصروفات:", formatCurrency(report.summary.totalExpenses)],
        ["صافي الربح:", formatCurrency(report.summary.netProfit)],
        ["هامش الربح:", formatPercentage(report.summary.profitMargin)],
        ["نسبة التحصيل:", formatPercentage(report.summary.collectionRate || 0)],
        ["الذمم المدينة:", formatCurrency(report.summary.accountsReceivable)],
        ["الذمم الدائنة:", formatCurrency(report.summary.accountsPayable)],
      ];

      let yPos = 55;
      summaryLines.forEach(([label, value]) => {
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.text(label, 30, yPos);
        doc.text(value, 100, yPos);
        yPos += 8;
      });

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
      <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm p-6 border border-gray-100/50">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">التقارير المالية الشاملة</h2>
            <p className="text-sm text-gray-600 mt-1">تحليل مالي متقدم مع نسب ومؤشرات أداء وتوقعات ذكية</p>
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
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm" />
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-sm" />
              </>
            )}

            <button onClick={loadReport} className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all" title="تحديث">
              <RefreshCw className="w-5 h-5" />
            </button>
            <button onClick={exportToExcel} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all" title="تصدير Excel">
              <Download className="w-5 h-5" />
            </button>
            <button onClick={exportToPDF} className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all" title="تصدير PDF">
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
          {report.alerts.length > 0 && (
            <div className="space-y-2">
              {report.alerts.map((alert, index) => (
                <div key={index} className={`p-4 rounded-lg flex items-start gap-3 ${
                  alert.type === 'danger' ? 'bg-red-50 text-red-800 border-r-4 border-red-600' :
                  alert.type === 'warning' ? 'bg-yellow-50 text-yellow-800 border-r-4 border-yellow-600' :
                  alert.type === 'info' ? 'bg-blue-50 text-blue-800 border-r-4 border-blue-600' :
                  'bg-green-50 text-green-800 border-r-4 border-green-600'
                }`}>
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">{alert.message}</p>
                    <p className="text-sm mt-1 opacity-75">القيمة الحالية: {alert.currentValue.toFixed(1)} | الحد الأدنى: {alert.threshold}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-6 h-6 opacity-80" />
                <span className="text-xs opacity-80">صافي الإيرادات</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(report.summary.totalRevenue)}</p>
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
              <p className="text-2xl font-bold">{formatCurrency(report.summary.totalExpenses)}</p>
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
              <p className="text-2xl font-bold">{report.summary.netProfit >= 0 ? '+' : ''}{formatCurrency(report.summary.netProfit)}</p>
              <div className="mt-2 text-sm opacity-80">هامش الربح: {report.summary.profitMargin.toFixed(1)}%</div>
            </div>

            <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-2">
                <Shield className="w-6 h-6 opacity-80" />
                <span className="text-xs opacity-80">المستحقات</span>
              </div>
              <p className="text-2xl font-bold">{formatCurrency(report.summary.accountsReceivable)}</p>
              <div className="mt-2 text-sm opacity-80">متأخرات: {formatCurrency(report.receivables?.overdue || 0)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">توزيع الإيرادات</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie data={report.revenueByCategory} cx="50%" cy="50%" labelLine={false} label={({ name, percent = 0 }) => `${name} (${(percent * 100).toFixed(0)}%)`} outerRadius={80} dataKey="amount" nameKey="category">
                    {report.revenueByCategory.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">توزيع المصروفات</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie data={report.expensesByCategory} cx="50%" cy="50%" labelLine={false} label={({ name, percent = 0 }) => `${name} (${(percent * 100).toFixed(0)}%)`} outerRadius={80} dataKey="amount" nameKey="category">
                    {report.expensesByCategory.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">التوقعات المالية للأشهر القادمة</h3>
              <div className="flex items-center gap-4">
                <select value={confidenceLevel} onChange={(e) => setConfidenceLevel(e.target.value as any)} className="px-3 py-1 text-sm border border-gray-300 rounded-lg">
                  <option value="high">ثقة عالية</option>
                  <option value="medium">ثقة متوسطة</option>
                  <option value="low">ثقة منخفضة</option>
                </select>
                <button onClick={() => setShowProjections(!showProjections)} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                  {showProjections ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  <span>{showProjections ? "إخفاء" : "عرض"}</span>
                </button>
              </div>
            </div>

            {showProjections && (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={report.projections.filter(p => confidenceLevel === 'high' ? p.confidence === 'high' : confidenceLevel === 'medium' ? ['high', 'medium'].includes(p.confidence) : true)}>
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
                      </tr>
                    </thead>
                    <tbody>
                      {report.projections.filter(p => confidenceLevel === 'high' ? p.confidence === 'high' : confidenceLevel === 'medium' ? ['high', 'medium'].includes(p.confidence) : true).map((proj, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium">{proj.month}</td>
                          <td className="px-4 py-2 text-green-600">{formatCurrency(proj.projectedRevenue)}</td>
                          <td className="px-4 py-2 text-yellow-600">{formatCurrency(proj.projectedRefunds || 0)}</td>
                          <td className="px-4 py-2 text-red-600">{formatCurrency(proj.projectedExpenses)}</td>
                          <td className={`px-4 py-2 ${(proj.projectedNet || proj.projectedProfit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {(proj.projectedNet || proj.projectedProfit) >= 0 ? '+' : ''}{formatCurrency(proj.projectedNet || proj.projectedProfit)}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded-full text-xs ${proj.confidence === 'high' ? 'bg-green-100 text-green-700' : proj.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                              {proj.confidence === 'high' ? 'عالية' : proj.confidence === 'medium' ? 'متوسطة' : 'منخفضة'}
                            </span>
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