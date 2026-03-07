import { useState, useEffect } from "react";
import {
  Users,
  Plus,
  CreditCard as Edit2,
  Trash2,
  Search,
  X,
  DollarSign,
  Calendar,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Teacher, TeacherSalary } from "../types/database";

interface TeachersManagerProps {
  onUpdate: () => void;
  onSalaryProcessed?: () => void;
}

export default function TeachersManager({ onUpdate, onSalaryProcessed }: TeachersManagerProps) {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showSalaryForm, setShowSalaryForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [salaryStatus, setSalaryStatus] = useState<Record<string, TeacherSalary>>({});
  const [pendingSalaries, setPendingSalaries] = useState<(TeacherSalary & { teachers: Teacher })[]>([]);
  const [processing, setProcessing] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    specialization: "",
    salary: "",
    hire_date: new Date().toISOString().split("T")[0],
    status: "active" as "active" | "inactive",
    address: "",
    qualifications: "",
    notes: "",
  });

  useEffect(() => {
    loadTeachers();
    loadSalaryStatus();
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

  const loadTeachers = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("teachers")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) throw error;
      setTeachers(data || []);
    } catch (error) {
      console.error("Error loading teachers:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSalaryStatus = async () => {
    if (!user) return;

    try {
      // تحميل حالة الرواتب للشهر المحدد
      const { data: salaryData, error: salaryError } = await supabase
        .from("teacher_salaries")
        .select("*")
        .eq("user_id", user.id)
        .eq("month", selectedMonth)
        .eq("year", selectedYear);

      if (salaryError) throw salaryError;

      const statusMap: Record<string, TeacherSalary> = {};
      salaryData?.forEach(salary => {
        statusMap[salary.teacher_id] = salary;
      });
      setSalaryStatus(statusMap);

      // تحميل الرواتب المعلقة مع بيانات المعلمين
      const { data: pending, error: pendingError } = await supabase
        .from("teacher_salaries")
        .select(`
          *,
          teachers:teacher_id (
            name,
            specialization,
            phone,
            email
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (pendingError) throw pendingError;
      setPendingSalaries(pending || []);
    } catch (error) {
      console.error("Error loading salary status:", error);
    }
  };

  const processSalaries = async () => {
    if (!user) return;

    const activeTeachers = teachers.filter(t => t.status === "active");
    const totalAmount = activeTeachers.reduce((sum, t) => sum + t.salary, 0);

    if (activeTeachers.length === 0) {
      alert("لا يوجد معلمون نشطون لصرف رواتبهم");
      return;
    }

    // التحقق من عدم وجود رواتب مدفوعة مسبقاً لهذا الشهر
    const alreadyProcessed = activeTeachers.some(t => salaryStatus[t.id]?.status === "paid");
    if (alreadyProcessed) {
      if (!confirm("بعض المعلمين تم صرف رواتبهم بالفعل لهذا الشهر. هل تريد متابعة صرف رواتب الباقين؟")) {
        return;
      }
    }

    if (!confirm(`سيتم صرف رواتب ${activeTeachers.length} معلم بقيمة إجمالية ${formatNumber(totalAmount)} ج.م. هل أنت متأكد؟`)) {
      return;
    }

    setProcessing(true);
    try {
      // تصفية المعلمين الذين لم يصرف لهم راتب هذا الشهر
      const teachersToProcess = activeTeachers.filter(t => !salaryStatus[t.id]);

      if (teachersToProcess.length === 0) {
        alert("جميع المعلمين تم صرف رواتبهم لهذا الشهر");
        return;
      }

      const salaryRecords = teachersToProcess.map(teacher => ({
        teacher_id: teacher.id,
        user_id: user.id,
        month: selectedMonth,
        year: selectedYear,
        amount: teacher.salary,
        status: 'pending',
        notes: `راتب شهر ${getMonthName(selectedMonth)} ${selectedYear}`
      }));

      const { error: salaryError } = await supabase
        .from("teacher_salaries")
        .insert(salaryRecords);

      if (salaryError) throw salaryError;

      // إضافة المصروف فقط إذا تم صرف رواتب جديدة
      if (teachersToProcess.length > 0) {
        const amountToProcess = teachersToProcess.reduce((sum, t) => sum + t.salary, 0);
        const { error: expenseError } = await supabase
          .from("expenses")
          .insert([{
            category: "رواتب المعلمين",
            description: `رواتب المعلمين لشهر ${getMonthName(selectedMonth)} ${selectedYear}`,
            amount: amountToProcess,
            expense_date: new Date().toISOString().split('T')[0],
            notes: `صرف رواتب ${teachersToProcess.length} معلم`,
            user_id: user.id
          }]);

        if (expenseError) throw expenseError;
      }

      alert("تم صرف الرواتب بنجاح");
      await loadSalaryStatus();
      if (onSalaryProcessed) onSalaryProcessed();
    } catch (error) {
      console.error("Error processing salaries:", error);
      alert("حدث خطأ أثناء صرف الرواتب");
    } finally {
      setProcessing(false);
    }
  };

  const confirmSalary = async (salaryId: string, teacherName: string, amount: number) => {
    if (!confirm(`تأكيد صرف راتب ${teacherName} بقيمة ${formatNumber(amount)} ج.م؟`)) return;

    try {
      const { error } = await supabase
        .from("teacher_salaries")
        .update({
          status: 'paid',
          payment_date: new Date().toISOString().split('T')[0]
        })
        .eq("id", salaryId);

      if (error) throw error;

      alert("تم تأكيد صرف الراتب");
      await loadSalaryStatus();
      if (onSalaryProcessed) onSalaryProcessed();
    } catch (error) {
      console.error("Error confirming salary:", error);
      alert("حدث خطأ أثناء تأكيد صرف الراتب");
    }
  };

  const cancelSalary = async (salaryId: string) => {
    if (!confirm("هل أنت متأكد من إلغاء صرف هذا الراتب؟")) return;

    try {
      const { error } = await supabase
        .from("teacher_salaries")
        .update({ 
          status: 'cancelled',
          payment_date: null 
        })
        .eq("id", salaryId);

      if (error) throw error;

      await loadSalaryStatus();
    } catch (error) {
      console.error("Error cancelling salary:", error);
      alert("حدث خطأ أثناء إلغاء صرف الراتب");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const teacherData = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        specialization: formData.specialization,
        salary: parseFloat(formData.salary),
        hire_date: formData.hire_date,
        status: formData.status,
        address: formData.address || null,
        qualifications: formData.qualifications || null,
        notes: formData.notes || null,
        user_id: user.id,
      };

      if (editingTeacher) {
        const { error } = await supabase
          .from("teachers")
          .update(teacherData)
          .eq("id", editingTeacher.id)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("teachers").insert([teacherData]);

        if (error) throw error;
      }

      resetForm();
      await loadTeachers();
      onUpdate();
    } catch (error: any) {
      console.error("Error saving teacher:", error);
      const errorMessage = error?.message || "حدث خطأ أثناء حفظ البيانات";
      alert(errorMessage);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المعلم؟")) return;

    try {
      const { error } = await supabase.from("teachers").delete().eq("id", id);

      if (error) throw error;
      await loadTeachers();
      onUpdate();
    } catch (error: any) {
      console.error("Error deleting teacher:", error);
      const errorMessage = error?.message || "حدث خطأ أثناء حذف المعلم";
      alert(errorMessage);
    }
  };

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      name: teacher.name,
      phone: teacher.phone,
      email: teacher.email,
      specialization: teacher.specialization,
      salary: teacher.salary.toString(),
      hire_date: new Date(teacher.hire_date).toISOString().split("T")[0],
      status: teacher.status,
      address: teacher.address || "",
      qualifications: teacher.qualifications || "",
      notes: teacher.notes || "",
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      specialization: "",
      salary: "",
      hire_date: new Date().toISOString().split("T")[0],
      status: "active",
      address: "",
      qualifications: "",
      notes: "",
    });
    setEditingTeacher(null);
    setShowForm(false);
  };

  const filteredTeachers = teachers.filter(
    (teacher) =>
      teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.phone.includes(searchTerm),
  );

  const activeTeachers = teachers.filter((t) => t.status === "active").length;
  const totalSalaries = teachers
    .filter((t) => t.status === "active")
    .reduce((sum, t) => sum + t.salary, 0);

  const paidSalariesThisMonth = Object.values(salaryStatus).filter(
    s => s?.status === "paid"
  ).length;
  
  const pendingSalariesCount = Object.values(salaryStatus).filter(
    s => s?.status === "pending"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">إدارة المعلمين</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSalaryForm(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-all shadow-md"
            disabled={processing}
          >
            <DollarSign className="w-5 h-5" />
            <span>{processing ? "جاري المعالجة..." : "صرف الرواتب"}</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all shadow-md"
          >
            <Plus className="w-5 h-5" />
            <span>إضافة معلم</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6 border-r-4 border-blue-600">
          <p className="text-gray-600 text-sm mb-1">عدد المعلمين النشطين</p>
          <p className="text-3xl font-bold text-gray-900">
            {formatNumber(activeTeachers, 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 border-r-4 border-orange-600">
          <p className="text-gray-600 text-sm mb-1">إجمالي الرواتب الشهرية</p>
          <p className="text-3xl font-bold text-gray-900">
            {formatNumber(totalSalaries)} ج.م
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 border-r-4 border-green-600">
          <p className="text-gray-600 text-sm mb-1">تم الصرف</p>
          <p className="text-3xl font-bold text-green-600">
            {formatNumber(paidSalariesThisMonth, 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 border-r-4 border-yellow-600">
          <p className="text-gray-600 text-sm mb-1">معلق</p>
          <p className="text-3xl font-bold text-yellow-600">
            {formatNumber(pendingSalariesCount, 0)}
          </p>
        </div>
      </div>

      {showSalaryForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">صرف الرواتب الشهرية</h3>
              <button
                onClick={() => setShowSalaryForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الشهر
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  >
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(month => (
                      <option key={month} value={month}>{getMonthName(month)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    السنة
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  >
                    {[2024, 2025, 2026].map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>

              {pendingSalaries.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">رواتب معلقة</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {pendingSalaries.map((salary) => (
                      <div key={salary.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div>
                          <span className="font-medium text-gray-900">{salary.teachers?.name}</span>
                          <span className="text-sm text-gray-600 mr-2">({salary.teachers?.specialization})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-yellow-700">{formatNumber(salary.amount)} ج.م</span>
                          <button
                            onClick={() => confirmSalary(salary.id, salary.teachers?.name || "", salary.amount)}
                            className="p-1 text-green-600 hover:bg-green-100 rounded"
                            title="تأكيد الصرف"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => cancelSalary(salary.id)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                            title="إلغاء"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t">
                <button
                  onClick={processSalaries}
                  disabled={activeTeachers === 0 || processing}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg transition-all font-medium"
                >
                  {processing ? "جاري المعالجة..." : `صرف رواتب ${formatNumber(activeTeachers, 0)} معلم بقيمة ${formatNumber(totalSalaries)} ج.م`}
                </button>
              </div>

              <div className="mt-4">
                <h4 className="font-medium text-gray-700 mb-3">حالة رواتب المعلمين</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {teachers.filter(t => t.status === "active").map(teacher => {
                    const salary = salaryStatus[teacher.id];
                    return (
                      <div key={teacher.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <span className="font-medium text-gray-900">{teacher.name}</span>
                          <span className="text-sm text-gray-600 mr-2">({teacher.specialization})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-700">{formatNumber(teacher.salary)} ج.م</span>
                          {salary?.status === "paid" ? (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                              تم الصرف {salary.payment_date && new Date(salary.payment_date).toLocaleDateString('ar-EG')}
                            </span>
                          ) : salary?.status === "pending" ? (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                              معلق
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                              لم يصرف
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingTeacher ? "تعديل بيانات المعلم" : "إضافة معلم جديد"}
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
                  الاسم الكامل
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="مثال: أحمد محمد"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رقم الهاتف
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="01139828833"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="example@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  التخصص
                </label>
                <input
                  type="text"
                  value={formData.specialization}
                  onChange={(e) =>
                    setFormData({ ...formData, specialization: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="مثال: الرياضيات"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الراتب الشهري (ج.م)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.salary}
                  onChange={(e) =>
                    setFormData({ ...formData, salary: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تاريخ التعيين
                </label>
                <input
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) =>
                    setFormData({ ...formData, hire_date: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  العنوان (اختياري)
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="مثال: القاهرة - شارع طومان باي"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  المؤهلات (اختياري)
                </label>
                <textarea
                  value={formData.qualifications}
                  onChange={(e) =>
                    setFormData({ ...formData, qualifications: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="درجات علمية، شهادات، إلخ"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ملاحظات (اختياري)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="ملاحظات إضافية"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الحالة
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as "active" | "inactive",
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-all"
                >
                  {editingTeacher ? "حفظ التعديلات" : "إضافة المعلم"}
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
            placeholder="البحث بالاسم أو التخصص أو الهاتف..."
            className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredTeachers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            لا يوجد معلمون
          </h3>
          <p className="text-gray-600 mb-6">لم يتم إضافة أي معلمين بعد</p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-all"
          >
            إضافة أول معلم
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredTeachers.map((teacher) => {
            const salary = salaryStatus[teacher.id];
            return (
              <div
                key={teacher.id}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-bold text-gray-900">
                        {teacher.name}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          teacher.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {teacher.status === "active" ? "نشط" : "غير نشط"}
                      </span>
                      {salary?.status === "paid" && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          تم صرف راتب {getMonthName(selectedMonth)}
                        </span>
                      )}
                      {salary?.status === "pending" && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                          راتب معلق
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">التخصص:</span>
                        <span className="font-medium text-gray-900 mr-2">
                          {teacher.specialization}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">الراتب:</span>
                        <span className="font-bold text-orange-600 mr-2">
                          {formatNumber(teacher.salary)} ج.م
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">الهاتف:</span>
                        <span className="font-medium text-gray-900 mr-2">
                          {teacher.phone}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">تاريخ التعيين:</span>
                        <span className="font-medium text-gray-900 mr-2">
                          {new Date(teacher.hire_date).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      <span className="font-medium">البريد:</span> {teacher.email}
                    </p>
                    {teacher.address && (
                      <p className="mt-1 text-sm text-gray-600">
                        <span className="font-medium">العنوان:</span>{" "}
                        {teacher.address}
                      </p>
                    )}
                    {teacher.qualifications && (
                      <p className="mt-1 text-sm text-gray-600">
                        <span className="font-medium">المؤهلات:</span>{" "}
                        {teacher.qualifications}
                      </p>
                    )}
                    {teacher.notes && (
                      <p className="mt-1 text-sm text-gray-600">
                        <span className="font-medium">ملاحظات:</span>{" "}
                        {teacher.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(teacher)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(teacher.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}