import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Download,
  PieChart,
  BarChart3,
  LineChart,
  FileText,
  Printer,
  Users,
  Briefcase,
  CreditCard,
  Landmark,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import {
  LineChart as RechartsLineChart,
  Line,
  BarChart,
  Bar,
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
} from "recharts";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
  };
  revenueByCategory: {
    category: string;
    amount: number;
    percentage: number;
  }[];
  expensesByCategory: {
    category: string;
    amount: number;
    percentage: number;
  }[];
  dailyTransactions: {
    date: string;
    revenue: number;
    expenses: number;
    profit: number;
  }[];
  topStudents: {
    student_name: string;
    total_paid: number;
    last_payment: string;
  }[];
  paymentMethods: {
    method: string;
    amount: number;
    count: number;
  }[];
  projections: {
    month: string;
    projectedRevenue: number;
    projectedExpenses: number;
    projectedProfit: number;
  }[];
  ratios: {
    currentRatio: number;
    quickRatio: number;
    debtRatio: number;
    profitMargin: number;
    returnOnAssets: number;
    operatingMargin: number;
  };
}

export default function FinancialReports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<"daily" | "weekly" | "monthly" | "yearly" | "custom">("monthly");
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [showProjections, setShowProjections] = useState(false);
  const [currency, setCurrency] = useState("ج.م");
  const [selectedChart, setSelectedChart] = useState<"all" | "revenue" | "expenses" | "profit">("all");

  const COLORS = ['#059669', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  useEffect(() => {
    loadReport();
  }, [reportType, startDate, endDate]);

  const loadReport = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // جلب المصاريف (الإيرادات)
      const { data: feesData, error: feesError } = await supabase
        .from("fees")
        .select("*, student:students(*)")
        .eq("user_id", user.id)
        .gte("payment_date", startDate)
        .lte("payment_date", endDate);

      if (feesError) throw feesError;

      // جلب التكاليف (المصروفات)
      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user.id)
        .gte("expense_date", startDate)
        .lte("expense_date", endDate);

      if (expensesError) throw expensesError;

      // جلب بيانات المعلمين للرواتب
      const { data: teachersData, error: teachersError } = await supabase
        .from("teachers")
        .select("*")
        .eq("user_id", user.id);

      if (teachersError) throw teachersError;

      // حساب الإيرادات حسب الفئة
      const revenueByCategory = calculateRevenueByCategory(feesData || []);
      
      // حساب المصروفات حسب الفئة
      const expensesByCategory = calculateExpensesByCategory(expensesData || []);
      
      // حساب المعاملات اليومية
      const dailyTransactions = calculateDailyTransactions(feesData || [], expensesData || []);
      
      // أفضل الطلاب
      const topStudents = calculateTopStudents(feesData || []);
      
      // طرق الدفع
      const paymentMethods = calculatePaymentMethods(feesData || []);
      
      // التوقعات
      const projections = calculateProjections(feesData || [], expensesData || []);
      
      // النسب المالية
      const ratios = calculateFinancialRatios(feesData || [], expensesData || [], teachersData || []);

      // حساب الملخص
      const totalRevenue = feesData?.reduce((sum, f) => sum + (f.amount > 0 ? f.amount : 0), 0) || 0;
      const totalExpenses = expensesData?.reduce((sum, e) => sum + e.amount, 0) || 0;
      const netProfit = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      // حساب الذمم
      const accountsReceivable = calculateAccountsReceivable(feesData || []);
      const accountsPayable = calculateAccountsPayable(teachersData || []);

      setReport({
        period: reportType,
        startDate,
        endDate,
        summary: {
          totalRevenue,
          totalExpenses,
          netProfit,
          profitMargin,
          cashFlow: totalRevenue - totalExpenses,
          accountsReceivable,
          accountsPayable,
          workingCapital: (totalRevenue - totalExpenses) - accountsPayable,
        },
        revenueByCategory,
        expensesByCategory,
        dailyTransactions,
        topStudents,
        paymentMethods,
        projections,
        ratios,
      });
    } catch (error) {
      console.error("Error loading report:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRevenueByCategory = (fees: any[]) => {
    const categories: { [key: string]: number } = {};
    fees.forEach(fee => {
      if (fee.amount > 0) {
        categories[fee.payment_type] = (categories[fee.payment_type] || 0) + fee.amount;
      }
    });

    const total = Object.values(categories).reduce((a, b) => a + b, 0);
    return Object.entries(categories).map(([category, amount]) => ({
      category,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
    }));
  };

  const calculateExpensesByCategory = (expenses: any[]) => {
    const categories: { [key: string]: number } = {};
    expenses.forEach(expense => {
      categories[expense.category] = (categories[expense.category] || 0) + expense.amount;
    });

    const total = Object.values(categories).reduce((a, b) => a + b, 0);
    return Object.entries(categories).map(([category, amount]) => ({
      category,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
    }));
  };

  const calculateDailyTransactions = (fees: any[], expenses: any[]) => {
    const dateMap: { [key: string]: { revenue: number; expenses: number } } = {};

    fees.forEach(fee => {
      if (fee.amount > 0) {
        const date = fee.payment_date;
        if (!dateMap[date]) dateMap[date] = { revenue: 0, expenses: 0 };
        dateMap[date].revenue += fee.amount;
      }
    });

    expenses.forEach(expense => {
      const date = expense.expense_date;
      if (!dateMap[date]) dateMap[date] = { revenue: 0, expenses: 0 };
      dateMap[date].expenses += expense.amount;
    });

    return Object.entries(dateMap)
      .map(([date, values]) => ({
        date,
        revenue: values.revenue,
        expenses: values.expenses,
        profit: values.revenue - values.expenses,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const calculateTopStudents = (fees: any[]) => {
    const studentMap: { [key: string]: { name: string; total: number; lastDate: string } } = {};

    fees.forEach(fee => {
      if (fee.amount > 0 && fee.student) {
        const studentId = fee.student_id;
        if (!studentMap[studentId]) {
          studentMap[studentId] = {
            name: fee.student.full_name,
            total: 0,
            lastDate: fee.payment_date,
          };
        }
        studentMap[studentId].total += fee.amount;
        if (fee.payment_date > studentMap[studentId].lastDate) {
          studentMap[studentId].lastDate = fee.payment_date;
        }
      }
    });

    return Object.values(studentMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map(s => ({
        student_name: s.name,
        total_paid: s.total,
        last_payment: s.lastDate,
      }));
  };

  const calculatePaymentMethods = (fees: any[]) => {
    const methods: { [key: string]: { amount: number; count: number } } = {};

    fees.forEach(fee => {
      if (fee.amount > 0 && fee.notes) {
        try {
          const notes = JSON.parse(fee.notes);
          const method = notes.payment_method || "cash";
          if (!methods[method]) {
            methods[method] = { amount: 0, count: 0 };
          }
          methods[method].amount += fee.amount;
          methods[method].count += 1;
        } catch {
          // إذا لم يكن هناك notes أو كانت غير قابلة للتحليل
          if (!methods["cash"]) {
            methods["cash"] = { amount: 0, count: 0 };
          }
          methods["cash"].amount += fee.amount;
          methods["cash"].count += 1;
        }
      }
    });

    return Object.entries(methods).map(([method, data]) => ({
      method: method === 'cash' ? 'نقدي' :
              method === 'card' ? 'بطاقة' :
              method === 'bank_transfer' ? 'تحويل بنكي' : 'شيك',
      amount: data.amount,
      count: data.count,
    }));
  };

  const calculateAccountsReceivable = (fees: any[]) => {
    // حساب الذمم المدينة (المبالغ المستحقة)
    // يمكن تحسين هذا بناءً على هيكل المصاريف
    return 0;
  };

  const calculateAccountsPayable = (teachers: any[]) => {
    // حساب الذمم الدائنة (الرواتب المستحقة)
    return teachers
      .filter(t => t.status === 'active')
      .reduce((sum, t) => sum + (t.salary || 0), 0);
  };

  const calculateProjections = (fees: any[], expenses: any[]) => {
    // توقعات بسيطة للأشهر القادمة
    const projections = [];
    const currentDate = new Date();
    
    // حساب المتوسط الشهري
    const monthlyAvgRevenue = fees.length > 0 
      ? fees.filter(f => f.amount > 0).reduce((sum, f) => sum + f.amount, 0) / 3 
      : 0;
    const monthlyAvgExpenses = expenses.length > 0 
      ? expenses.reduce((sum, e) => sum + e.amount, 0) / 3 
      : 0;

    for (let i = 1; i <= 6; i++) {
      const nextMonth = new Date(currentDate);
      nextMonth.setMonth(nextMonth.getMonth() + i);
      
      projections.push({
        month: nextMonth.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' }),
        projectedRevenue: monthlyAvgRevenue * (1 + 0.05 * i), // نمو 5% شهرياً
        projectedExpenses: monthlyAvgExpenses * (1 + 0.03 * i), // نمو 3% شهرياً
        projectedProfit: monthlyAvgRevenue * (1 + 0.05 * i) - monthlyAvgExpenses * (1 + 0.03 * i),
      });
    }

    return projections;
  };

  const calculateFinancialRatios = (fees: any[], expenses: any[], teachers: any[]) => {
    const totalRevenue = fees.reduce((sum, f) => sum + (f.amount > 0 ? f.amount : 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const currentAssets = totalRevenue; // تبسيط
    const currentLiabilities = teachers.filter(t => t.status === 'active').reduce((sum, t) => sum + (t.salary || 0), 0);
    const totalAssets = currentAssets + 100000; // قيمة تقديرية للأصول الثابتة
    const netProfit = totalRevenue - totalExpenses;

    return {
      currentRatio: currentLiabilities > 0 ? currentAssets / currentLiabilities : 0,
      quickRatio: currentLiabilities > 0 ? (currentAssets * 0.8) / currentLiabilities : 0, // تبسيط
      debtRatio: totalAssets > 0 ? currentLiabilities / totalAssets : 0,
      profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
      returnOnAssets: totalAssets > 0 ? (netProfit / totalAssets) * 100 : 0,
      operatingMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
    };
  };

  const exportToExcel = () => {
    if (!report) return;

    const wb = XLSX.utils.book_new();

    // ورقة الملخص
    const summaryData = [
      ['البيان', 'القيمة'],
      ['إجمالي الإيرادات', `${report.summary.totalRevenue.toFixed(2)} ${currency}`],
      ['إجمالي المصروفات', `${report.summary.totalExpenses.toFixed(2)} ${currency}`],
      ['صافي الربح', `${report.summary.netProfit.toFixed(2)} ${currency}`],
      ['هامش الربح', `${report.summary.profitMargin.toFixed(2)}%`],
      ['التدفق النقدي', `${report.summary.cashFlow.toFixed(2)} ${currency}`],
      ['الذمم المدينة', `${report.summary.accountsReceivable.toFixed(2)} ${currency}`],
      ['الذمم الدائنة', `${report.summary.accountsPayable.toFixed(2)} ${currency}`],
      ['رأس المال العامل', `${report.summary.workingCapital.toFixed(2)} ${currency}`],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'ملخص');

    // ورقة الإيرادات حسب الفئة
    const revenueData = report.revenueByCategory.map(r => ([
      r.category,
      r.amount.toFixed(2),
      `${r.percentage.toFixed(2)}%`,
    ]));
    revenueData.unshift(['الفئة', 'المبلغ', 'النسبة']);
    const wsRevenue = XLSX.utils.aoa_to_sheet(revenueData);
    XLSX.utils.book_append_sheet(wb, wsRevenue, 'الإيرادات');

    // ورقة المصروفات حسب الفئة
    const expensesData = report.expensesByCategory.map(e => ([
      e.category,
      e.amount.toFixed(2),
      `${e.percentage.toFixed(2)}%`,
    ]));
    expensesData.unshift(['الفئة', 'المبلغ', 'النسبة']);
    const wsExpenses = XLSX.utils.aoa_to_sheet(expensesData);
    XLSX.utils.book_append_sheet(wb, wsExpenses, 'المصروفات');

    // ورقة المعاملات اليومية
    const dailyData = report.dailyTransactions.map(d => ([
      d.date,
      d.revenue.toFixed(2),
      d.expenses.toFixed(2),
      d.profit.toFixed(2),
    ]));
    dailyData.unshift(['التاريخ', 'الإيرادات', 'المصروفات', 'الربح']);
    const wsDaily = XLSX.utils.aoa_to_sheet(dailyData);
    XLSX.utils.book_append_sheet(wb, wsDaily, 'المعاملات اليومية');

    XLSX.writeFile(wb, `تقرير_مالي_${startDate}_الى_${endDate}.xlsx`);
  };

  const exportToPDF = () => {
    if (!report) return;

    const doc = new jsPDF();
    
    // العنوان
    doc.setFontSize(20);
    doc.setTextColor(5, 150, 105);
    doc.text('تقرير مالي', 105, 20, { align: 'center' });
    
    // الفترة
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`الفترة: ${startDate} إلى ${endDate}`, 105, 30, { align: 'center' });

    // الملخص
    doc.setFillColor(240, 253, 244);
    doc.rect(20, 40, 170, 40, 'F');
    doc.setFontSize(14);
    doc.setTextColor(5, 150, 105);
    doc.text('ملخص', 105, 50, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`إجمالي الإيرادات: ${report.summary.totalRevenue.toFixed(2)} ${currency}`, 30, 60);
    doc.text(`إجمالي المصروفات: ${report.summary.totalExpenses.toFixed(2)} ${currency}`, 100, 60);
    doc.text(`صافي الربح: ${report.summary.netProfit.toFixed(2)} ${currency}`, 170, 60, { align: 'right' });

    // جدول الإيرادات
    const revenueTableData = report.revenueByCategory.map(r => [
      r.category,
      `${r.amount.toFixed(2)} ${currency}`,
      `${r.percentage.toFixed(1)}%`,
    ]);

    (doc as any).autoTable({
      startY: 90,
      head: [['الفئة', 'المبلغ', 'النسبة']],
      body: revenueTableData,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105] },
      styles: { font: 'arial', fontSize: 8 },
    });

    doc.save(`تقرير_مالي_${startDate}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* العنوان وأدوات التحكم */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">التقارير المالية</h2>
          <p className="text-sm text-gray-600">تحليل مالي متقدم ونسب ومؤشرات أداء</p>
        </div>
        <div className="flex gap-2">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
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
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
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

      {report && (
        <>
          {/* بطاقات المؤشرات الرئيسية */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-md p-6 border-r-4 border-green-600">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-6 h-6 text-green-600" />
                <span className="text-xs text-gray-500">إجمالي الإيرادات</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {report.summary.totalRevenue.toLocaleString("ar-EG", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} {currency}
              </p>
              <div className="mt-2 flex items-center gap-1 text-sm text-green-600">
                <ArrowUpRight className="w-4 h-4" />
                <span>+{report.revenueByCategory.length} فئة</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-r-4 border-red-600">
              <div className="flex items-center justify-between mb-2">
                <TrendingDown className="w-6 h-6 text-red-600" />
                <span className="text-xs text-gray-500">إجمالي المصروفات</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {report.summary.totalExpenses.toLocaleString("ar-EG", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} {currency}
              </p>
              <div className="mt-2 flex items-center gap-1 text-sm text-red-600">
                <ArrowDownRight className="w-4 h-4" />
                <span>{report.expensesByCategory.length} فئة</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-r-4 border-blue-600">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-6 h-6 text-blue-600" />
                <span className="text-xs text-gray-500">صافي الربح</span>
              </div>
              <p className={`text-2xl font-bold ${report.summary.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                {report.summary.netProfit >= 0 ? "+" : ""}
                {report.summary.netProfit.toLocaleString("ar-EG", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} {currency}
              </p>
              <div className="mt-2 text-sm text-gray-600">
                هامش الربح: {report.summary.profitMargin.toFixed(1)}%
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-r-4 border-purple-600">
              <div className="flex items-center justify-between mb-2">
                <Percent className="w-6 h-6 text-purple-600" />
                <span className="text-xs text-gray-500">النسب المالية</span>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>نسبة السيولة:</span>
                  <span className="font-medium">{report.ratios.currentRatio.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>العائد على الأصول:</span>
                  <span className="font-medium">{report.ratios.returnOnAssets.toFixed(1)}%</span>
                </div>
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
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                    nameKey="category"
                  >
                    {report.revenueByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
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
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                    nameKey="category"
                  >
                    {report.expensesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
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
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" stroke="#059669" fill="#059669" fillOpacity={0.3} name="الإيرادات" />
                  <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} name="المصروفات" />
                  <Area type="monotone" dataKey="profit" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="الربح" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* جدول أفضل الطلاب */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">أفضل 10 طلاب من حيث السداد</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-right">#</th>
                    <th className="px-4 py-2 text-right">اسم الطالب</th>
                    <th className="px-4 py-2 text-right">إجمالي المدفوعات</th>
                    <th className="px-4 py-2 text-right">آخر دفعة</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topStudents.map((student, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2">{index + 1}</td>
                      <td className="px-4 py-2 font-medium">{student.student_name}</td>
                      <td className="px-4 py-2 text-green-600">
                        {student.total_paid.toLocaleString("ar-EG", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} {currency}
                      </td>
                      <td className="px-4 py-2">{student.last_payment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* طرق الدفع */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">طرق الدفع</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {report.paymentMethods.map((method, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    {method.method === 'نقدي' && <Banknote className="w-5 h-5 text-green-600" />}
                    {method.method === 'بطاقة' && <CreditCard className="w-5 h-5 text-blue-600" />}
                    {method.method === 'تحويل بنكي' && <Landmark className="w-5 h-5 text-purple-600" />}
                    <span className="font-medium">{method.method}</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900">
                    {method.amount.toLocaleString("ar-EG", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} {currency}
                  </p>
                  <p className="text-sm text-gray-600">{method.count} عملية</p>
                </div>
              ))}
            </div>
          </div>

          {/* التوقعات المستقبلية */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">التوقعات المالية للأشهر القادمة</h3>
              <button
                onClick={() => setShowProjections(!showProjections)}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                {showProjections ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{showProjections ? "إخفاء" : "عرض"}</span>
              </button>
            </div>
            {showProjections && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2 text-right">الشهر</th>
                      <th className="px-4 py-2 text-right">الإيرادات المتوقعة</th>
                      <th className="px-4 py-2 text-right">المصروفات المتوقعة</th>
                      <th className="px-4 py-2 text-right">الربح المتوقع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.projections.map((proj, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">{proj.month}</td>
                        <td className="px-4 py-2 text-green-600">
                          {proj.projectedRevenue.toLocaleString("ar-EG", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })} {currency}
                        </td>
                        <td className="px-4 py-2 text-red-600">
                          {proj.projectedExpenses.toLocaleString("ar-EG", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })} {currency}
                        </td>
                        <td className={`px-4 py-2 ${proj.projectedProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {proj.projectedProfit >= 0 ? "+" : ""}
                          {proj.projectedProfit.toLocaleString("ar-EG", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })} {currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}