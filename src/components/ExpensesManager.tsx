import { useState, useEffect } from "react";
import { TrendingDown, Plus, Edit2, Trash2, Search, X, Calendar } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Expense } from "../types/database";

interface ExpensesManagerProps {
  onUpdate: () => void;
}

export default function ExpensesManager({ onUpdate }: ExpensesManagerProps) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [formData, setFormData] = useState({
    category: "",
    amount: "",
    description: "",
    expense_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  useEffect(() => {
    loadExpenses();
  }, [selectedMonth, selectedYear]);

  const formatNumber = (num: number, fractionDigits: number = 2) => {
    return Number(num).toLocaleString("ar-EG", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
  };

  const getMonthName = (month: number) => {
    const months = [
      'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    return months[month - 1];
  };

  const loadExpenses = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // فلترة المصروفات حسب الشهر والسنة
      const startDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`;
      const endDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-31`;

      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user.id)
        .gte("expense_date", startDate)
        .lte("expense_date", endDate)
        .order("expense_date", { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error("Error loading expenses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const expenseData = {
        category: formData.category,
        description: formData.description,
        amount: parseFloat(formData.amount),
        expense_date: formData.expense_date,
        notes: formData.notes,
        user_id: user.id,
      };

      if (editingExpense) {
        const { error } = await supabase
          .from("expenses")
          .update(expenseData)
          .eq("id", editingExpense.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("expenses").insert([expenseData]);

        if (error) throw error;
      }

      resetForm();
      loadExpenses();
      onUpdate();
    } catch (error) {
      console.error("Error saving expense:", error);
      alert("حدث خطأ أثناء حفظ البيانات");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المصروف؟")) return;

    try {
      const { error } = await supabase.from("expenses").delete().eq("id", id);

      if (error) throw error;
      loadExpenses();
      onUpdate();
    } catch (error) {
      console.error("Error deleting expense:", error);
      alert("حدث خطأ أثناء حذف المصروف");
    }
  };

  const handleEdit = (expense: Expense) => {
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

  const filteredExpenses = expenses.filter(
    (expense) =>
      expense.category.includes(searchTerm) ||
      expense.description.includes(searchTerm),
  );

  const categories = [
    "رواتب المعلمين",
    "رواتب الإداريين",
    "صيانة المباني",
    "الكهرباء والماء",
    "الإنترنت والاتصالات",
    "القرطاسية",
    "التنظيفات",
    "الأمن",
    "النقل",
    "أخرى",
  ];

  // حساب إجمالي المصروفات للشهر الحالي
  const totalExpensesThisMonth = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  // حساب المصروفات حسب الفئة للشهر الحالي
  const categoryTotals = categories
    .map((cat) => ({
      category: cat,
      total: expenses
        .filter((e) => e.category === cat)
        .reduce((sum, e) => sum + Number(e.amount), 0),
    }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total); // ترتيب تنازلي

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">إدارة التكاليف</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-all shadow-md"
        >
          <Plus className="w-5 h-5" />
          <span>إضافة مصروف</span>
        </button>
      </div>

      {/* فلتر الشهر والسنة */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">تصفية حسب:</span>
          </div>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
          >
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(month => (
              <option key={month} value={month}>{getMonthName(month)}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
          >
            {[2024, 2025, 2026].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <div className="mr-auto">
            <span className="text-sm text-gray-600 ml-2">إجمالي المصروفات:</span>
            <span className="text-lg font-bold text-red-600">
              {formatNumber(totalExpensesThisMonth)} ج.م
            </span>
          </div>
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md p-4 border-r-4 border-red-600">
          <p className="text-sm text-gray-600 mb-1">عدد المصروفات</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatNumber(expenses.length, 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4 border-r-4 border-orange-600">
          <p className="text-sm text-gray-600 mb-1">متوسط المصروف</p>
          <p className="text-2xl font-bold text-gray-900">
            {expenses.length > 0 ? formatNumber(totalExpensesThisMonth / expenses.length) : "٠"} ج.م
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4 border-r-4 border-purple-600">
          <p className="text-sm text-gray-600 mb-1">أعلى فئة</p>
          <p className="text-2xl font-bold text-gray-900">
            {categoryTotals[0]?.category || "---"}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4 border-r-4 border-green-600">
          <p className="text-sm text-gray-600 mb-1">أقل فئة</p>
          <p className="text-2xl font-bold text-gray-900">
            {categoryTotals[categoryTotals.length - 1]?.category || "---"}
          </p>
        </div>
      </div>

      {categoryTotals.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            ملخص التكاليف حسب الفئة - {getMonthName(selectedMonth)} {selectedYear}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {categoryTotals.map(({ category, total }) => {
              const percentage = (total / totalExpensesThisMonth) * 100;
              return (
                <div
                  key={category}
                  className="p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-700">{category}</span>
                    <span className="text-sm font-bold text-red-600">
                      {formatNumber(total)} ج.م
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-red-600 h-1.5 rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="text-left mt-1">
                    <span className="text-xs text-gray-500">{percentage.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingExpense ? "تعديل المصروف" : "إضافة مصروف جديد"}
              </h3>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  فئة المصروف
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="">اختر الفئة</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
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
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
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
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
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
                  onChange={(e) =>
                    setFormData({ ...formData, expense_date: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ملاحظات
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none resize-none"
                  rows={3}
                  placeholder="أي ملاحظات إضافية..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-all"
                >
                  {editingExpense ? "حفظ التعديلات" : "إضافة المصروف"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="البحث في المصروفات..."
            className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <TrendingDown className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            لا توجد مصروفات
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm ? "لا توجد نتائج للبحث" : `لم يتم تسجيل أي مصروفات لشهر ${getMonthName(selectedMonth)} ${selectedYear}`}
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-all"
          >
            إضافة أول مصروف
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredExpenses.map((expense) => (
            <div
              key={expense.id}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                    <h3 className="text-lg font-bold text-gray-900">
                      {expense.description}
                    </h3>
                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                      {expense.category}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">المبلغ:</span>
                      <span className="font-bold text-red-600 mr-2">
                        {formatNumber(expense.amount)} ج.م
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">التاريخ:</span>
                      <span className="font-medium text-gray-900 mr-2">
                        {new Date(expense.expense_date).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">نسبة من الإجمالي:</span>
                      <span className="font-medium text-gray-900 mr-2">
                        {((expense.amount / totalExpensesThisMonth) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  {expense.notes && (
                    <p className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">ملاحظات:</span>{" "}
                      {expense.notes}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(expense)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}