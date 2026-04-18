// src/components/ExpensesManager.tsx
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { 
  TrendingDown, Plus, Edit2, Trash2, Search, X, Calendar, 
  Filter, Download, PieChart, AlertCircle, CheckCircle, 
  Loader2, ChevronLeft, ChevronRight, ArrowUpDown, 
  FileText, DollarSign, Percent, Layers, Clock, Zap
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Expense } from "../types/database";
import { notifyExpenseAdded } from "../lib/notifications";
import { motion, AnimatePresence } from "framer-motion";
import { toast, Toaster } from 'react-hot-toast';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// Animations variants
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } }
};

// Types
interface ExpenseWithMeta extends Expense {
  percentageOfTotal?: number;
}

interface ExpensesManagerProps {
  onUpdate: () => void;
}

// Custom hook for expenses
const useExpenses = (schoolId: string | undefined, month: number, year: number) => {
  const [expenses, setExpenses] = useState<ExpenseWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadExpenses = useCallback(async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const { data, error: fetchError } = await supabase
        .from("expenses")
        .select("*")
        .eq("school_id", schoolId)
        .gte("expense_date", startDate)
        .lte("expense_date", endDate)
        .order("expense_date", { ascending: false });

      if (fetchError) throw fetchError;
      
      const total = (data || []).reduce((sum, e) => sum + Number(e.amount), 0);
      const expensesWithPercentage = (data || []).map(expense => ({
        ...expense,
        percentageOfTotal: total > 0 ? (Number(expense.amount) / total) * 100 : 0
      }));
      
      setExpenses(expensesWithPercentage);
    } catch (err: any) {
      console.error("Error loading expenses:", err);
      setError(err.message);
      toast.error("فشل تحميل المصروفات");
    } finally {
      setLoading(false);
    }
  }, [schoolId, month, year]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  return { expenses, loading, error, refetch: loadExpenses };
};

export default function ExpensesManager({ onUpdate }: ExpensesManagerProps) {
  const { authUser, currentSchool, hasPermission } = useAuth();
  const { expenses, loading, error, refetch } = useExpenses(
    currentSchool?.id, 
    new Date().getMonth() + 1, 
    new Date().getFullYear()
  );
  
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [sortBy, setSortBy] = useState<"date" | "amount" | "category">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    category: "",
    amount: "",
    description: "",
    expense_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // Categories with icons and colors
  const categories = [
    { name: "رواتب المعلمين", icon: "👨‍🏫", color: "bg-blue-100 text-blue-700" },
    { name: "رواتب الإداريين", icon: "👔", color: "bg-indigo-100 text-indigo-700" },
    { name: "صيانة المباني", icon: "🔧", color: "bg-orange-100 text-orange-700" },
    { name: "الكهرباء والماء", icon: "💡", color: "bg-yellow-100 text-yellow-700" },
    { name: "الإنترنت والاتصالات", icon: "📡", color: "bg-purple-100 text-purple-700" },
    { name: "القرطاسية", icon: "📚", color: "bg-green-100 text-green-700" },
    { name: "التنظيفات", icon: "🧹", color: "bg-cyan-100 text-cyan-700" },
    { name: "الأمن", icon: "🛡️", color: "bg-slate-100 text-slate-700" },
    { name: "النقل", icon: "🚌", color: "bg-amber-100 text-amber-700" },
    { name: "أخرى", icon: "📌", color: "bg-gray-100 text-gray-700" },
  ];

  // Computed values
  const totalExpenses = useMemo(() => 
    expenses.reduce((sum, e) => sum + Number(e.amount), 0), 
    [expenses]
  );

  const categoryTotals = useMemo(() => {
    const totals = categories.map(cat => ({
      ...cat,
      total: expenses
        .filter(e => e.category === cat.name)
        .reduce((sum, e) => sum + Number(e.amount), 0),
      count: expenses.filter(e => e.category === cat.name).length
    }));
    return totals.filter(c => c.total > 0).sort((a, b) => b.total - a.total);
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    let filtered = [...expenses];
    
    if (searchTerm) {
      filtered = filtered.filter(
        (expense) =>
          expense.category.includes(searchTerm) ||
          expense.description.includes(searchTerm) ||
          expense.notes?.includes(searchTerm)
      );
    }
    
    if (selectedCategory) {
      filtered = filtered.filter((expense) => expense.category === selectedCategory);
    }
    
    filtered.sort((a, b) => {
      if (sortBy === "date") {
        return sortOrder === "desc" 
          ? new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
          : new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime();
      } else if (sortBy === "amount") {
        return sortOrder === "desc" ? b.amount - a.amount : a.amount - b.amount;
      } else {
        return sortOrder === "desc"
          ? b.category.localeCompare(a.category)
          : a.category.localeCompare(b.category);
      }
    });
    
    return filtered;
  }, [expenses, searchTerm, selectedCategory, sortBy, sortOrder]);

  const stats = useMemo(() => ({
    count: expenses.length,
    average: expenses.length > 0 ? totalExpenses / expenses.length : 0,
    max: Math.max(...expenses.map(e => Number(e.amount)), 0),
    min: Math.min(...expenses.map(e => Number(e.amount)), 0),
  }), [expenses, totalExpenses]);

  const getMonthName = (month: number) => {
    const months = ['يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    return months[month - 1];
  };

  const formatNumber = (num: number, fractionDigits: number = 2) => {
    return Number(num).toLocaleString("ar-EG", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !currentSchool) {
      toast.error("لم يتم تحديد المدرسة");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const expenseData = {
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount),
        expense_date: formData.expense_date,
        notes: formData.notes,
        user_id: authUser.id,
        school_id: currentSchool.id,
      };

      if (editingExpense) {
        const { error } = await supabase
          .from("expenses")
          .update(expenseData)
          .eq("id", editingExpense.id)
          .eq("school_id", currentSchool.id);

        if (error) throw error;
        toast.success("تم تحديث المصروف بنجاح");
      } else {
        const { error } = await supabase
          .from("expenses")
          .insert([expenseData]);

        if (error) throw error;
        toast.success("تم إضافة المصروف بنجاح");
        
        await notifyExpenseAdded(currentSchool.id, formData.category, parseFloat(formData.amount));
      }

      resetForm();
      await refetch();
      onUpdate();
    } catch (error: any) {
      console.error("Error saving expense:", error);
      toast.error(error?.message || "حدث خطأ أثناء حفظ البيانات");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!hasPermission('delete_expenses')) {
      toast.error("ليس لديك صلاحية لحذف المصروفات");
      return;
    }
    
    toast.custom((t) => (
      <div className="bg-white rounded-lg shadow-lg p-4 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-3">
          <AlertCircle className="w-6 h-6 text-red-500" />
          <h3 className="font-bold text-gray-900">تأكيد الحذف</h3>
        </div>
        <p className="text-gray-600 mb-4">هل أنت متأكد من حذف هذا المصروف؟ لا يمكن التراجع عن هذا الإجراء.</p>
        <div className="flex gap-3">
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                const { error } = await supabase
                  .from("expenses")
                  .delete()
                  .eq("id", id)
                  .eq("school_id", currentSchool?.id);

                if (error) throw error;
                await refetch();
                onUpdate();
                toast.success("تم حذف المصروف بنجاح");
              } catch (error: any) {
                console.error("Error deleting expense:", error);
                toast.error(error?.message || "حدث خطأ أثناء حذف المصروف");
              }
            }}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-all"
          >
            حذف
          </button>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg transition-all"
          >
            إلغاء
          </button>
        </div>
      </div>
    ), { duration: 5000 });
  };

  const handleEdit = (expense: Expense) => {
    if (!hasPermission('edit_expenses')) {
      toast.error("ليس لديك صلاحية لتعديل المصروفات");
      return;
    }
    
    setEditingExpense(expense);
    setFormData({
      category: expense.category,
      amount: expense.amount.toString(),
      description: expense.description,
      expense_date: expense.expense_date,
      notes: expense.notes || "",
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      category: "",
      amount: "",
      description: "",
      expense_date: new Date().toISOString().split("T")[0],
      notes: "",
    });
    setEditingExpense(null);
    setShowForm(false);
  };

  const exportToCSV = () => {
    const headers = ["التاريخ", "الوصف", "الفئة", "المبلغ", "الملاحظات"];
    const rows = filteredExpenses.map(e => [
      new Date(e.expense_date).toLocaleDateString('ar-EG'),
      e.description,
      e.category,
      e.amount.toString(),
      e.notes || ""
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.join(","))
      .join("\n");
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute("download", `expenses_${selectedYear}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success("تم تصدير البيانات بنجاح");
  };

  const canAddExpense = hasPermission('add_expenses') || hasPermission('edit_expenses');

  return (
    <div className="space-y-6" dir="rtl">
      <Toaster position="top-center" reverseOrder={false} />
      
      {/* Header Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">إدارة التكاليف</h1>
          <p className="text-gray-600">مراقبة وتحليل مصروفات المدرسة</p>
        </div>
        {canAddExpense && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            <span>إضافة مصروف جديد</span>
          </motion.button>
        )}
      </motion.div>

      {/* Filters Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
              <Calendar className="w-5 h-5 text-gray-500" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="bg-transparent outline-none text-gray-700"
              >
                {[1,2,3,4,5,6,7,8,9,10,11,12].map(month => (
                  <option key={month} value={month}>{getMonthName(month)}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-transparent outline-none text-gray-700"
              >
                {[2024, 2025, 2026].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث في المصروفات..."
                className="pr-10 pl-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none w-64"
              />
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
            >
              <option value="">جميع الفئات</option>
              {categories.map(cat => (
                <option key={cat.name} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
              className="p-2 hover:bg-gray-100 rounded-lg transition-all"
            >
              {viewMode === "list" ? "📋" : "🔲"}
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all"
            >
              <Download className="w-4 h-4" />
              <span>تصدير</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
      >
        <motion.div variants={fadeInUp} className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <DollarSign className="w-8 h-8 opacity-80" />
            <span className="text-xs opacity-80">إجمالي المصروفات</span>
          </div>
          <p className="text-2xl font-bold">{formatNumber(totalExpenses)} ج.م</p>
          <p className="text-sm opacity-80 mt-2">{stats.count} مصروف</p>
        </motion.div>
        
        <motion.div variants={fadeInUp} className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <Percent className="w-8 h-8 opacity-80" />
            <span className="text-xs opacity-80">متوسط المصروف</span>
          </div>
          <p className="text-2xl font-bold">{formatNumber(stats.average)} ج.م</p>
          <p className="text-sm opacity-80 mt-2">لكل عملية</p>
        </motion.div>
        
        <motion.div variants={fadeInUp} className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <ArrowUpDown className="w-8 h-8 opacity-80" />
            <span className="text-xs opacity-80">أعلى مصروف</span>
          </div>
          <p className="text-2xl font-bold">{formatNumber(stats.max)} ج.م</p>
          <p className="text-sm opacity-80 mt-2">أكبر عملية</p>
        </motion.div>
        
        <motion.div variants={fadeInUp} className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <TrendingDown className="w-8 h-8 opacity-80" />
            <span className="text-xs opacity-80">أقل مصروف</span>
          </div>
          <p className="text-2xl font-bold">{formatNumber(stats.min)} ج.م</p>
          <p className="text-sm opacity-80 mt-2">أصغر عملية</p>
        </motion.div>
        
        <motion.div variants={fadeInUp} className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <Layers className="w-8 h-8 opacity-80" />
            <span className="text-xs opacity-80">أعلى فئة</span>
          </div>
          <p className="text-xl font-bold truncate">{categoryTotals[0]?.name || "---"}</p>
          <p className="text-sm opacity-80 mt-2">
            {categoryTotals[0]?.total ? formatNumber(categoryTotals[0].total) : "0"} ج.م
          </p>
        </motion.div>
      </motion.div>

      {/* Category Summary */}
      {categoryTotals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">تحليل المصروفات حسب الفئة</h3>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryTotals.map((cat, idx) => {
              const percentage = (cat.total / totalExpenses) * 100;
              return (
                <motion.div
                  key={cat.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group hover:shadow-md transition-all p-4 rounded-xl bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{cat.icon}</span>
                      <span className="font-medium text-gray-700">{cat.name}</span>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${cat.color}`}>
                      {cat.count} عملية
                    </span>
                  </div>
                  <div className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">{formatNumber(cat.total)} ج.م</span>
                      <span className="text-gray-500">{percentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-600"
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Expenses List/Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-red-600 animate-spin mb-4" />
          <p className="text-gray-600">جاري تحميل المصروفات...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : filteredExpenses.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-6">
            <TrendingDown className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد مصروفات</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            {searchTerm || selectedCategory 
              ? "لا توجد نتائج تطابق معايير البحث" 
              : `لم يتم تسجيل أي مصروفات لشهر ${getMonthName(selectedMonth)} ${selectedYear}`}
          </p>
          {canAddExpense && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-3 rounded-xl transition-all shadow-md"
            >
              إضافة أول مصروف
            </button>
          )}
        </motion.div>
      ) : (
        <>
          {/* Sort Controls */}
          <div className="flex items-center justify-between bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">ترتيب حسب:</span>
              <div className="flex gap-1">
                {(["date", "amount", "category"] as const).map((sort) => (
                  <button
                    key={sort}
                    onClick={() => {
                      if (sortBy === sort) {
                        setSortOrder(sortOrder === "desc" ? "asc" : "desc");
                      } else {
                        setSortBy(sort);
                        setSortOrder("desc");
                      }
                    }}
                    className={`px-3 py-1 rounded-lg text-sm transition-all ${
                      sortBy === sort
                        ? "bg-red-600 text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {sort === "date" ? "التاريخ" : sort === "amount" ? "المبلغ" : "الفئة"}
                    {sortBy === sort && (sortOrder === "desc" ? " ↓" : " ↑")}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-sm text-gray-500">
              عرض {filteredExpenses.length} من {expenses.length} مصروف
            </div>
          </div>

          {/* Items Container */}
          <AnimatePresence mode="wait">
            <motion.div
              key={viewMode}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={viewMode === "list" ? "space-y-3" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"}
            >
              {filteredExpenses.map((expense, idx) => {
                const category = categories.find(c => c.name === expense.category);
                return viewMode === "list" ? (
                  <motion.div
                    key={expense.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    whileHover={{ scale: 1.01 }}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => setSelectedExpense(expense)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-2xl">{category?.icon || "💰"}</span>
                          <h3 className="font-bold text-gray-900">{expense.description}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${category?.color || "bg-gray-100"}`}>
                            {expense.category}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500">المبلغ:</span>
                            <span className="font-bold text-red-600 mr-2">
                              {formatNumber(expense.amount)} ج.م
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">التاريخ:</span>
                            <span className="font-medium text-gray-700 mr-2">
                              {new Date(expense.expense_date).toLocaleDateString('ar-EG')}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">النسبة:</span>
                            <span className="font-medium text-gray-700 mr-2">
                              {expense.percentageOfTotal?.toFixed(1)}%
                            </span>
                          </div>
                          {expense.notes && (
                            <div className="col-span-full">
                              <span className="text-gray-500">ملاحظات:</span>
                              <span className="text-gray-600 mr-2 text-sm">{expense.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 mr-4">
                        {hasPermission('edit_expenses') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(expense);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {hasPermission('delete_expenses') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(expense.id);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={expense.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    whileHover={{ y: -4 }}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => setSelectedExpense(expense)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-3xl">{category?.icon || "💰"}</span>
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${category?.color}`}>
                        {expense.category}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{expense.description}</h3>
                    <p className="text-2xl font-bold text-red-600 mb-2">{formatNumber(expense.amount)} ج.م</p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{new Date(expense.expense_date).toLocaleDateString('ar-EG')}</span>
                      <span>{expense.percentageOfTotal?.toFixed(1)}%</span>
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      {hasPermission('edit_expenses') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(expense);
                          }}
                          className="flex-1 py-1 text-blue-600 hover:bg-blue-50 rounded-lg text-sm"
                        >
                          تعديل
                        </button>
                      )}
                      {hasPermission('delete_expenses') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(expense.id);
                          }}
                          className="flex-1 py-1 text-red-600 hover:bg-red-50 rounded-lg text-sm"
                        >
                          حذف
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </>
      )}

      {/* Modal Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={(e) => e.target === e.currentTarget && resetForm()}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden"
            >
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingExpense ? "تعديل المصروف" : "إضافة مصروف جديد"}
                </h3>
                <button
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-80px)]">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    فئة المصروف
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                    required
                  >
                    <option value="">اختر الفئة</option>
                    {categories.map((cat) => (
                      <option key={cat.name} value={cat.name}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الوصف
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                    placeholder="مثال: راتب شهر يناير"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المبلغ (ج.م)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    تاريخ المصروف
                  </label>
                  <input
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ملاحظات (اختياري)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none transition-all"
                    rows={3}
                    placeholder="أي ملاحظات إضافية..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3 rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                    {editingExpense ? "حفظ التعديلات" : "إضافة المصروف"}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl transition-all"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expense Details Modal */}
      <AnimatePresence>
        {selectedExpense && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedExpense(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">
                      {categories.find(c => c.name === selectedExpense.category)?.icon || "💰"}
                    </span>
                    <h3 className="text-xl font-bold text-gray-900">تفاصيل المصروف</h3>
                  </div>
                  <button
                    onClick={() => setSelectedExpense(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="border-b pb-3">
                    <p className="text-sm text-gray-500">الوصف</p>
                    <p className="font-medium text-gray-900">{selectedExpense.description}</p>
                  </div>
                  
                  <div className="border-b pb-3">
                    <p className="text-sm text-gray-500">الفئة</p>
                    <p className="font-medium text-gray-900">{selectedExpense.category}</p>
                  </div>
                  
                  <div className="border-b pb-3">
                    <p className="text-sm text-gray-500">المبلغ</p>
                    <p className="text-2xl font-bold text-red-600">{formatNumber(selectedExpense.amount)} ج.م</p>
                  </div>
                  
                  <div className="border-b pb-3">
                    <p className="text-sm text-gray-500">التاريخ</p>
                    <p className="font-medium text-gray-900">
                      {new Date(selectedExpense.expense_date).toLocaleDateString('ar-EG', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  
                  {selectedExpense.notes && (
                    <div className="border-b pb-3">
                      <p className="text-sm text-gray-500">الملاحظات</p>
                      <p className="text-gray-700">{selectedExpense.notes}</p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm text-gray-500">نسبة من إجمالي الشهر</p>
                    <div className="mt-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span>{((selectedExpense.amount / totalExpenses) * 100).toFixed(1)}%</span>
                        <span className="text-gray-500">{formatNumber(totalExpenses)} ج.م إجمالي</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-600 h-2 rounded-full"
                          style={{ width: `${(selectedExpense.amount / totalExpenses) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3 mt-6 pt-4 border-t">
                  <button
                    onClick={() => {
                      setSelectedExpense(null);
                      handleEdit(selectedExpense);
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl transition-all"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => {
                      setSelectedExpense(null);
                      handleDelete(selectedExpense.id);
                    }}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl transition-all"
                  >
                    حذف
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}