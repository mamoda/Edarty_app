// src/components/TeachersManager.tsx
import { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  DollarSign,
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
  const { authUser, currentSchool, hasPermission } = useAuth(); // ✅ إضافة currentSchool
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

  // ✅ التحقق من وجود currentSchool قبل التحميل
  useEffect(() => {
    if (currentSchool) {
      loadTeachers();
      loadSalaryStatus();
    }
  }, [selectedMonth, selectedYear, currentSchool]);

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

  // ✅ استخدام school_id بدلاً من user_id
  const loadTeachers = async () => {
    if (!currentSchool) {
      console.log("⏳ No school selected, skipping load");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("teachers")
        .select("*")
        .eq("school_id", currentSchool.id)  // ✅ استخدام school_id
        .order("name", { ascending: true });

      if (error) throw error;
      setTeachers(data || []);
    } catch (error) {
      console.error("Error loading teachers:", error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ استخدام school_id بدلاً من user_id
  const loadSalaryStatus = async () => {
    if (!currentSchool) return;

    try {
      const { data: salaryData, error: salaryError } = await supabase
        .from("teacher_salaries")
        .select("*")
        .eq("school_id", currentSchool.id)  // ✅ استخدام school_id
        .eq("month", selectedMonth)
        .eq("year", selectedYear);

      if (salaryError) throw salaryError;

      const statusMap: Record<string, TeacherSalary> = {};
      salaryData?.forEach(salary => {
        statusMap[salary.teacher_id] = salary;
      });
      setSalaryStatus(statusMap);

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
        .eq("school_id", currentSchool.id)  // ✅ استخدام school_id
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (pendingError) throw pendingError;
      setPendingSalaries(pending || []);
    } catch (error) {
      console.error("Error loading salary status:", error);
    }
  };

  // ✅ إضافة currentSchool.id و school_id
  const processSalaries = async () => {
    if (!authUser || !currentSchool) {
      alert("لم يتم تحديد المدرسة");
      return;
    }

    const activeTeachers = teachers.filter(t => t.status === "active");
    const totalAmount = activeTeachers.reduce((sum, t) => sum + t.salary, 0);

    if (activeTeachers.length === 0) {
      alert("لا يوجد معلمون نشطون لصرف رواتبهم");
      return;
    }

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
      const teachersToProcess = activeTeachers.filter(t => !salaryStatus[t.id]);

      if (teachersToProcess.length === 0) {
        alert("جميع المعلمين تم صرف رواتبهم لهذا الشهر");
        return;
      }

      const salaryRecords = teachersToProcess.map(teacher => ({
        teacher_id: teacher.id,
        user_id: authUser.id,
        school_id: currentSchool.id,  // ✅ إضافة school_id
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
            user_id: authUser.id,
            school_id: currentSchool.id,  // ✅ إضافة school_id
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

  // ✅ إضافة school_id
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !currentSchool) {
      alert("لم يتم تحديد المدرسة");
      return;
    }

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
        user_id: authUser.id,
        school_id: currentSchool.id,  // ✅ استخدام currentSchool.id
      };

      if (editingTeacher) {
        const { error } = await supabase
          .from("teachers")
          .update(teacherData)
          .eq("id", editingTeacher.id)
          .eq("school_id", currentSchool.id);  // ✅ التأكد من المدرسة

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("teachers")
          .insert([teacherData]);

        if (error) throw error;
      }

      resetForm();
      await loadTeachers();
      onUpdate();
    } catch (error: any) {
      console.error("Error saving teacher:", error);
      alert(error?.message || "حدث خطأ أثناء حفظ البيانات");
    }
  };

  const handleDelete = async (id: string) => {
    if (!hasPermission('delete_teachers')) {
      alert("ليس لديك صلاحية لحذف المعلمين");
      return;
    }

    if (!confirm("هل أنت متأكد من حذف هذا المعلم؟")) return;

    try {
      const { error } = await supabase
        .from("teachers")
        .delete()
        .eq("id", id)
        .eq("school_id", currentSchool?.id);  // ✅ التأكد من المدرسة

      if (error) throw error;
      await loadTeachers();
      onUpdate();
    } catch (error: any) {
      console.error("Error deleting teacher:", error);
      alert(error?.message || "حدث خطأ أثناء حذف المعلم");
    }
  };

  const handleEdit = (teacher: Teacher) => {
    if (!hasPermission('edit_teachers')) {
      alert("ليس لديك صلاحية لتعديل بيانات المعلمين");
      return;
    }

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

      {/* باقي JSX كما هو - لم يتغير */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-md p-6 border-r-4 border-blue-600">
          <p className="text-gray-600 text-sm mb-1">عدد المعلمين النشطين</p>
          <p className="text-3xl font-bold text-gray-900">{formatNumber(activeTeachers, 0)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 border-r-4 border-orange-600">
          <p className="text-gray-600 text-sm mb-1">إجمالي الرواتب الشهرية</p>
          <p className="text-3xl font-bold text-gray-900">{formatNumber(totalSalaries)} ج.م</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 border-r-4 border-green-600">
          <p className="text-gray-600 text-sm mb-1">تم الصرف</p>
          <p className="text-3xl font-bold text-green-600">{formatNumber(paidSalariesThisMonth, 0)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6 border-r-4 border-yellow-600">
          <p className="text-gray-600 text-sm mb-1">معلق</p>
          <p className="text-3xl font-bold text-yellow-600">{formatNumber(pendingSalariesCount, 0)}</p>
        </div>
      </div>

      {/* باقي الكود (نموذج صرف الرواتب، نموذج الإضافة، جدول المعلمين) كما هو */}
      {/* ... */}
    </div>
  );
}