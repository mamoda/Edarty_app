// src/components/TeachersManager.tsx
import { useState, useEffect, useMemo } from "react";
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
  Filter,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  Calendar,
  FileText,
  AlertCircle,
  Download,
  RefreshCw,
  MoreVertical,
  UserCheck,
  Award,
  Clock,
  Menu,
  LayoutGrid,
  List,
  SlidersHorizontal,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Teacher, TeacherSalary } from "../types/database";
import { Menu as HeadlessMenu } from "@headlessui/react";
import { toast } from "react-hot-toast";
import * as XLSX from 'xlsx';
import { format, parseISO } from "date-fns";
import { ar } from "date-fns/locale";
import { notifyTeacherAdded, notifyTeacherDeleted, notifySalaryPaid } from "../lib/notifications";


interface TeachersManagerProps {
  onUpdate: () => void;
  onSalaryProcessed?: () => void;
}

// أنواع العرض
type ViewMode = 'grid' | 'list' | 'compact';
type FilterStatus = 'all' | 'active' | 'inactive' | 'pending_salary' | 'paid_salary';
type SortField = 'name' | 'salary' | 'hire_date' | 'specialization';
type SortOrder = 'asc' | 'desc';

// تنسيق الأرقام
const formatNumber = (num: number, fractionDigits: number = 2) => {
  return Number(num).toLocaleString("ar-EG", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};

// مكون البطاقة الإحصائية
const StatCard = ({ title, value, icon: Icon, color, trend }: { 
  title: string; 
  value: string | number; 
  icon: any; 
  color: string; 
  trend?: number;
}) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-300">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        {trend !== undefined && (
          <div className="flex items-center gap-1 mt-2">
            {trend > 0 ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
            <span className={`text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {Math.abs(trend)}% عن الشهر الماضي
            </span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

// مكون المعلم المضغوط
const TeacherCompactCard = ({ 
  teacher, 
  onEdit, 
  onDelete, 
  salaryStatus 
}: { 
  teacher: Teacher; 
  onEdit: (teacher: Teacher) => void; 
  onDelete: (id: string) => void; 
  salaryStatus: Record<string, TeacherSalary>;
}) => (
  <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          teacher.status === 'active' ? 'bg-green-100' : 'bg-gray-100'
        }`}>
          <Users className={`w-5 h-5 ${
            teacher.status === 'active' ? 'text-green-600' : 'text-gray-600'
          }`} />
        </div>
        <div>
          <h4 className="font-medium text-gray-900">{teacher.name}</h4>
          <p className="text-sm text-gray-500">{teacher.specialization}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="font-bold text-orange-600">{formatNumber(teacher.salary)} ج.م</span>
        <SalaryStatusBadge status={salaryStatus[teacher.id]?.status} />
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(teacher)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(teacher.id)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
);

// مكون حالة الراتب
const SalaryStatusBadge = ({ status }: { status?: string }) => {
  if (status === 'paid') {
    return (
      <div className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full">
        <CheckCircle className="w-3 h-3" />
        <span className="text-xs font-medium">تم الصرف</span>
      </div>
    );
  }
  if (status === 'pending') {
    return (
      <div className="flex items-center gap-1 px-2 py-1 bg-yellow-50 text-yellow-700 rounded-full">
        <Clock className="w-3 h-3" />
        <span className="text-xs font-medium">معلق</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-600 rounded-full">
      <AlertCircle className="w-3 h-3" />
      <span className="text-xs font-medium">لم يصرف</span>
    </div>
  );
};

// قائمة منسدلة مخصصة
const CustomSelect = ({ 
  value, 
  onChange, 
  options, 
  icon: Icon 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  options: Array<{ value: string; label: string }>; 
  icon?: any;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
      >
        {Icon && <Icon className="w-4 h-4 text-gray-500" />}
        <span className="text-sm">{selectedOption?.label}</span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[200px]">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full text-right px-4 py-2 hover:bg-gray-50 transition-all ${
                option.value === value ? 'bg-blue-50 text-blue-600' : ''
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// نافذة التأكيد
const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'تأكيد', 
  cancelText = 'إلغاء', 
  type = 'warning' 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  title: string; 
  message: string; 
  confirmText?: string; 
  cancelText?: string; 
  type?: 'warning' | 'danger' | 'info';
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
            type === 'warning' ? 'bg-yellow-100' : 
            type === 'danger' ? 'bg-red-100' : 
            'bg-blue-100'
          }`}>
            <AlertCircle className={`w-6 h-6 ${
              type === 'warning' ? 'text-yellow-600' : 
              type === 'danger' ? 'text-red-600' : 
              'text-blue-600'
            }`} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 mb-6">{message}</p>
          <div className="flex gap-3">
            <button
              onClick={onConfirm}
              className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-all ${
                type === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white' :
                'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {confirmText}
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-all"
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// المكون الرئيسي
export default function TeachersManager({ onUpdate, onSalaryProcessed }: TeachersManagerProps) {
  const { authUser, currentSchool, hasPermission } = useAuth();
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
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedTeachers, setSelectedTeachers] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [expandedTeacher, setExpandedTeacher] = useState<string | null>(null);
  const [salaryRange, setSalaryRange] = useState<[number, number]>([0, 20000]);
  const [refreshing, setRefreshing] = useState(false);
  
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

  // تحميل البيانات
  useEffect(() => {
    if (currentSchool) {
      loadTeachers();
      loadSalaryStatus();
    }
  }, [selectedMonth, selectedYear, currentSchool]);

  // الحصول على اسم الشهر
  const getMonthName = (month: number) => {
    const months = [
      'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    return months[month - 1];
  };

  // تحميل المعلمين
  const loadTeachers = async () => {
    if (!currentSchool) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("teachers")
        .select("*")
        .eq("school_id", currentSchool.id)
        .order("name", { ascending: true });

      if (error) throw error;
      setTeachers(data || []);
    } catch (error) {
      console.error("Error loading teachers:", error);
      toast.error("حدث خطأ أثناء تحميل بيانات المعلمين");
    } finally {
      setLoading(false);
    }
  };

  // تحميل حالة الرواتب
  const loadSalaryStatus = async () => {
    if (!currentSchool) return;

    try {
      const { data: salaryData, error: salaryError } = await supabase
        .from("teacher_salaries")
        .select("*")
        .eq("school_id", currentSchool.id)
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
        .eq("school_id", currentSchool.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (pendingError) throw pendingError;
      setPendingSalaries(pending || []);
    } catch (error) {
      console.error("Error loading salary status:", error);
    }
  };

  // تحديث البيانات
  const refreshData = async () => {
    setRefreshing(true);
    await Promise.all([loadTeachers(), loadSalaryStatus()]);
    setRefreshing(false);
    toast.success("تم تحديث البيانات");
  };

  // إلغاء صرف الراتب
  const cancelSalary = async (salaryId: string) => {
    try {
      const { error } = await supabase
        .from("teacher_salaries")
        .update({ 
          status: 'cancelled',
          payment_date: null 
        })
        .eq("id", salaryId)
        .eq("school_id", currentSchool?.id);

      if (error) throw error;

      toast.success("تم إلغاء صرف الراتب");
      await loadSalaryStatus();
    } catch (error) {
      console.error("Error cancelling salary:", error);
      toast.error("حدث خطأ أثناء إلغاء صرف الراتب");
    }
  };

  // تصفية وفرز المعلمين
  const filteredAndSortedTeachers = useMemo(() => {
    let filtered = teachers.filter(teacher => {
      // تصفية البحث
      const matchesSearch = 
        teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        teacher.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
        teacher.phone.includes(searchTerm);
      
      // تصفية الحالة
      const matchesStatus = 
        filterStatus === 'all' ? true :
        filterStatus === 'active' ? teacher.status === 'active' :
        filterStatus === 'inactive' ? teacher.status === 'inactive' :
        filterStatus === 'pending_salary' ? salaryStatus[teacher.id]?.status === 'pending' :
        filterStatus === 'paid_salary' ? salaryStatus[teacher.id]?.status === 'paid' :
        true;
      
      // تصفية نطاق الراتب
      const matchesSalary = 
        teacher.salary >= salaryRange[0] && teacher.salary <= salaryRange[1];
      
      return matchesSearch && matchesStatus && matchesSalary;
    });

    // الترتيب
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'salary':
          comparison = a.salary - b.salary;
          break;
        case 'hire_date':
          comparison = new Date(a.hire_date).getTime() - new Date(b.hire_date).getTime();
          break;
        case 'specialization':
          comparison = a.specialization.localeCompare(b.specialization);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [teachers, searchTerm, filterStatus, salaryRange, sortField, sortOrder, salaryStatus]);

  // الإحصائيات
  const stats = useMemo(() => {
    const activeTeachers = teachers.filter(t => t.status === "active").length;
    const totalSalaries = teachers.filter(t => t.status === "active").reduce((sum, t) => sum + t.salary, 0);
    const paidCount = Object.values(salaryStatus).filter(s => s?.status === "paid").length;
    const pendingCount = Object.values(salaryStatus).filter(s => s?.status === "pending").length;
    const avgSalary = activeTeachers > 0 ? totalSalaries / activeTeachers : 0;
    
    return {
      activeTeachers,
      totalSalaries,
      paidCount,
      pendingCount,
      avgSalary,
      totalTeachers: teachers.length
    };
  }, [teachers, salaryStatus]);

  // صرف الرواتب
  const processSalaries = async () => {
    if (!authUser || !currentSchool) {
      toast.error("لم يتم تحديد المدرسة");
      return;
    }

    const activeTeachers = teachers.filter(t => t.status === "active");

    if (activeTeachers.length === 0) {
      toast.error("لا يوجد معلمون نشطون لصرف رواتبهم");
      return;
    }

    setProcessing(true);
    try {
      const teachersToProcess = activeTeachers.filter(t => !salaryStatus[t.id]);

      if (teachersToProcess.length === 0) {
        toast.error("جميع المعلمين تم صرف رواتبهم لهذا الشهر");
        return;
      }

      const salaryRecords = teachersToProcess.map(teacher => ({
        teacher_id: teacher.id,
        user_id: authUser.id,
        school_id: currentSchool.id,
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
            school_id: currentSchool.id,
          }]);

        if (expenseError) throw expenseError;
      }

      toast.success("تم صرف الرواتب بنجاح");
      await loadSalaryStatus();
      if (onSalaryProcessed) onSalaryProcessed();
      setShowSalaryForm(false);
    } catch (error) {
      console.error("Error processing salaries:", error);
      toast.error("حدث خطأ أثناء صرف الرواتب");
    } finally {
      setProcessing(false);
    }
  };

  // تأكيد صرف راتب
  const confirmSalary = async (salaryId: string, teacherName: string) => {
    try {
      const { error } = await supabase
        .from("teacher_salaries")
        .update({
          status: 'paid',
          payment_date: new Date().toISOString().split('T')[0]
        })
        .eq("id", salaryId)
        .eq("school_id", currentSchool?.id);

      if (error) throw error;

      toast.success(`تم تأكيد صرف راتب ${teacherName}`);
      
      // ✅ إرسال إشعار للأدمن
      if (currentSchool) {
        await notifySalaryPaid(currentSchool.id, teacherName, 0); // المبلغ موجود في الكائن
      }
      
      await loadSalaryStatus();
      if (onSalaryProcessed) onSalaryProcessed();
    } catch (error) {
      console.error("Error confirming salary:", error);
      toast.error("حدث خطأ أثناء تأكيد صرف الراتب");
    }
  };

  // حفظ المعلم
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !currentSchool) {
      toast.error("لم يتم تحديد المدرسة");
      return;
    }

    const loadingToast = toast.loading(editingTeacher ? "جاري تحديث البيانات..." : "جاري إضافة المعلم...");

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
        school_id: currentSchool.id,
      };

      if (editingTeacher) {
        const { error } = await supabase
          .from("teachers")
          .update(teacherData)
          .eq("id", editingTeacher.id)
          .eq("school_id", currentSchool.id);

        if (error) throw error;
        toast.success("تم تحديث بيانات المعلم بنجاح", { id: loadingToast });
      } else {
        const { error } = await supabase
          .from("teachers")
          .insert([teacherData]);

        if (error) throw error;
        toast.success("تم إضافة المعلم بنجاح", { id: loadingToast });
        
        // ✅ إرسال إشعار للأدمن عند إضافة معلم جديد
        await notifyTeacherAdded(currentSchool.id, formData.name);
      }

      resetForm();
      await loadTeachers();
      onUpdate();
    } catch (error: any) {
      console.error("Error saving teacher:", error);
      toast.error(error?.message || "حدث خطأ أثناء حفظ البيانات", { id: loadingToast });
    }
  };

  // حذف معلم
  const handleDelete = async (id: string) => {
    if (!hasPermission('delete_teachers')) {
      toast.error("ليس لديك صلاحية لحذف المعلمين");
      return;
    }

    // ✅ جلب اسم المعلم قبل الحذف للإشعار
    const teacherToDelete = teachers.find(t => t.id === id);
    const teacherName = teacherToDelete?.name || "معلم";

    try {
      const { error } = await supabase
        .from("teachers")
        .delete()
        .eq("id", id)
        .eq("school_id", currentSchool?.id);

      if (error) throw error;
      
      toast.success("تم حذف المعلم بنجاح");
      
      // ✅ إرسال إشعار للأدمن عند حذف معلم
      if (currentSchool) {
        await notifyTeacherDeleted(currentSchool.id, teacherName);
      }
      
      await loadTeachers();
      onUpdate();
      setShowDeleteConfirm(null);
    } catch (error: any) {
      console.error("Error deleting teacher:", error);
      toast.error(error?.message || "حدث خطأ أثناء حذف المعلم");
    }
  };

  // تصدير البيانات
  const exportToExcel = () => {
    const exportData = filteredAndSortedTeachers.map(teacher => ({
      'الاسم': teacher.name,
      'التخصص': teacher.specialization,
      'الهاتف': teacher.phone,
      'البريد الإلكتروني': teacher.email,
      'الراتب': teacher.salary,
      'تاريخ التعيين': format(parseISO(teacher.hire_date), 'dd/MM/yyyy', { locale: ar }),
      'الحالة': teacher.status === 'active' ? 'نشط' : 'غير نشط',
      'حالة الراتب': salaryStatus[teacher.id]?.status === 'paid' ? 'تم الصرف' : 
                    salaryStatus[teacher.id]?.status === 'pending' ? 'معلق' : 'لم يصرف'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المعلمين");
    XLSX.writeFile(wb, `المعلمين_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    
    toast.success("تم تصدير البيانات بنجاح");
  };

  // إعادة تعيين النموذج
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

  // معالجة التعديل
  const handleEdit = (teacher: Teacher) => {
    if (!hasPermission('edit_teachers')) {
      toast.error("ليس لديك صلاحية لتعديل بيانات المعلمين");
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

  // تحديد/إلغاء تحديد الكل
  const toggleSelectAll = () => {
    if (selectedTeachers.size === filteredAndSortedTeachers.length) {
      setSelectedTeachers(new Set());
    } else {
      setSelectedTeachers(new Set(filteredAndSortedTeachers.map(t => t.id)));
    }
  };

  // تحديد معلم
  const toggleSelectTeacher = (id: string) => {
    const newSelected = new Set(selectedTeachers);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTeachers(newSelected);
  };

  const canAddTeacher = hasPermission('add_teachers') || hasPermission('edit_teachers');

  return (
    <div className="space-y-6">
      {/* رأس الصفحة */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">إدارة المعلمين</h2>
          <p className="text-gray-600 mt-1">إدارة بيانات المعلمين والرواتب</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {/* زر تحديث */}
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="p-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          
          {/* زر تصدير */}
          <button
            onClick={exportToExcel}
            className="p-2.5 text-green-600 hover:bg-green-50 rounded-lg transition-all"
            title="تصدير إلى Excel"
          >
            <Download className="w-5 h-5" />
          </button>
          
          {/* زر صرف الرواتب */}
          <button
            onClick={() => setShowSalaryForm(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-md"
            disabled={processing}
          >
            <DollarSign className="w-5 h-5" />
            <span className="hidden sm:inline">{processing ? "جاري المعالجة..." : "صرف الرواتب"}</span>
          </button>
          
          {/* زر إضافة معلم */}
          {canAddTeacher && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-md"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">إضافة معلم</span>
            </button>
          )}
        </div>
      </div>

      {/* البطاقات الإحصائية */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="إجمالي المعلمين"
          value={formatNumber(stats.totalTeachers, 0)}
          icon={Users}
          color="bg-blue-500"
        />
        <StatCard
          title="المعلمين النشطين"
          value={formatNumber(stats.activeTeachers, 0)}
          icon={UserCheck}
          color="bg-green-500"
        />
        <StatCard
          title="متوسط الراتب"
          value={`${formatNumber(stats.avgSalary)} ج.م`}
          icon={Award}
          color="bg-purple-500"
        />
        <StatCard
          title="تم الصرف"
          value={formatNumber(stats.paidCount, 0)}
          icon={CheckCircle}
          color="bg-emerald-500"
          trend={stats.paidCount > 0 ? 12 : 0}
        />
        <StatCard
          title="رواتب معلقة"
          value={formatNumber(stats.pendingCount, 0)}
          icon={Clock}
          color="bg-yellow-500"
        />
      </div>

      {/* شريط البحث والتصفية */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* البحث */}
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="البحث بالاسم أو التخصص أو الهاتف..."
              className="w-full pr-10 pl-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            {/* زر الفلاتر */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl transition-all ${
                showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>تصفية</span>
              {(filterStatus !== 'all' || salaryRange[0] > 0 || salaryRange[1] < 20000) && (
                <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
              )}
            </button>
            
            {/* تصفية الحالة */}
            <CustomSelect
              value={filterStatus}
              onChange={(value) => setFilterStatus(value as FilterStatus)}
              icon={Filter}
              options={[
                { value: 'all', label: 'جميع المعلمين' },
                { value: 'active', label: 'النشطين فقط' },
                { value: 'inactive', label: 'غير النشطين' },
                { value: 'pending_salary', label: 'رواتب معلقة' },
                { value: 'paid_salary', label: 'تم صرف رواتبهم' },
              ]}
            />
            
            {/* تبديل العرض */}
            <div className="flex border border-gray-300 rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2.5 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2.5 ${viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('compact')}
                className={`p-2.5 ${viewMode === 'compact' ? 'bg-blue-50 text-blue-600' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                <Menu className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        
        {/* لوحة الفلاتر المتقدمة */}
        {showFilters && (
          <div className="pt-4 mt-4 border-t grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نطاق الراتب (ج.م)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={salaryRange[0]}
                  onChange={(e) => setSalaryRange([parseFloat(e.target.value) || 0, salaryRange[1]])}
                  className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                  min={0}
                />
                <span>-</span>
                <input
                  type="number"
                  value={salaryRange[1]}
                  onChange={(e) => setSalaryRange([salaryRange[0], parseFloat(e.target.value) || 20000])}
                  className="w-24 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                  min={salaryRange[0]}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الترتيب حسب
              </label>
              <div className="flex gap-2">
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as SortField)}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="name">الاسم</option>
                  <option value="salary">الراتب</option>
                  <option value="hire_date">تاريخ التعيين</option>
                  <option value="specialization">التخصص</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {sortOrder === 'asc' ? 'تصاعدي ↑' : 'تنازلي ↓'}
                </button>
              </div>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterStatus('all');
                  setSalaryRange([0, 20000]);
                  setSortField('name');
                  setSortOrder('asc');
                }}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                إعادة ضبط الفلاتر
              </button>
            </div>
          </div>
        )}
      </div>

      {/* معلومات التحديد المتعدد */}
      {selectedTeachers.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-medium text-blue-900">
              تم تحديد {selectedTeachers.size} معلم
            </span>
            <button
              onClick={() => setSelectedTeachers(new Set())}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              إلغاء التحديد
            </button>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              إرسال إشعار
            </button>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
              صرف رواتب المحددين
            </button>
          </div>
        </div>
      )}

      {/* محتوى المعلمين */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12">
          <div className="flex flex-col items-center justify-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <Users className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-blue-600" />
            </div>
            <p className="mt-4 text-gray-600">جاري تحميل بيانات المعلمين...</p>
          </div>
        </div>
      ) : filteredAndSortedTeachers.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Users className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            لا يوجد معلمون
          </h3>
          <p className="text-gray-600 mb-6">
            {searchTerm ? "لا توجد نتائج مطابقة للبحث" : "لم يتم إضافة أي معلمين بعد"}
          </p>
          {canAddTeacher && !searchTerm && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-all shadow-md"
            >
              <Plus className="w-5 h-5 inline-block ml-2" />
              إضافة أول معلم
            </button>
          )}
        </div>
      ) : (
        <div className={`grid gap-4 ${
          viewMode === 'grid' ? 'grid-cols-1 lg:grid-cols-2' : 
          viewMode === 'list' ? 'grid-cols-1' : 
          'grid-cols-1'
        }`}>
          {/* رأس الجدول في وضع القائمة */}
          {viewMode === 'list' && (
            <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-12 gap-4 text-sm font-medium text-gray-600">
              <div className="col-span-1">
                <input
                  type="checkbox"
                  checked={selectedTeachers.size === filteredAndSortedTeachers.length}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-3">المعلم</div>
              <div className="col-span-2">التخصص</div>
              <div className="col-span-2">الراتب</div>
              <div className="col-span-2">الحالة</div>
              <div className="col-span-2">الإجراءات</div>
            </div>
          )}
          
          {filteredAndSortedTeachers.map((teacher, index) => {
            const salary = salaryStatus[teacher.id];
            const isExpanded = expandedTeacher === teacher.id;
            
            if (viewMode === 'compact') {
              return (
                <TeacherCompactCard
                  key={teacher.id}
                  teacher={teacher}
                  onEdit={handleEdit}
                  onDelete={(id: string) => setShowDeleteConfirm(id)}
                  salaryStatus={salaryStatus}
                />
              );
            }
            
            if (viewMode === 'list') {
              return (
                <div
                  key={teacher.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-1">
                      <input
                        type="checkbox"
                        checked={selectedTeachers.has(teacher.id)}
                        onChange={() => toggleSelectTeacher(teacher.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                    <div className="col-span-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          teacher.status === 'active' ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <Users className={`w-5 h-5 ${
                            teacher.status === 'active' ? 'text-green-600' : 'text-gray-600'
                          }`} />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{teacher.name}</h4>
                          <p className="text-sm text-gray-500">{teacher.email}</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-900">{teacher.specialization}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="font-bold text-orange-600">{formatNumber(teacher.salary)} ج.م</span>
                    </div>
                    <div className="col-span-2">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium w-fit ${
                          teacher.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {teacher.status === "active" ? "نشط" : "غير نشط"}
                        </span>
                        <SalaryStatusBadge status={salary?.status} />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => setExpandedTeacher(isExpanded ? null : teacher.id)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleEdit(teacher)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(teacher.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* التفاصيل الموسعة */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{teacher.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{teacher.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">
                          تاريخ التعيين: {format(parseISO(teacher.hire_date), 'dd MMMM yyyy', { locale: ar })}
                        </span>
                      </div>
                      {teacher.address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{teacher.address}</span>
                        </div>
                      )}
                      {teacher.qualifications && (
                        <div className="flex items-center gap-2 col-span-2">
                          <GraduationCap className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{teacher.qualifications}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }
            
            // وضع الشبكة (افتراضي)
            return (
              <div
                key={teacher.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedTeachers.has(teacher.id)}
                      onChange={() => toggleSelectTeacher(teacher.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{teacher.name}</h3>
                      <p className="text-sm text-gray-500">{teacher.specialization}</p>
                    </div>
                  </div>
                  <HeadlessMenu as="div" className="relative">
                    <HeadlessMenu.Button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
                      <MoreVertical className="w-5 h-5" />
                    </HeadlessMenu.Button>
                    <HeadlessMenu.Items className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 focus:outline-none z-10">
                      <HeadlessMenu.Item>
                        {({ active }: { active: boolean }) => (
                          <button
                            onClick={() => handleEdit(teacher)}
                            className={`${
                              active ? 'bg-gray-50' : ''
                            } flex items-center gap-2 w-full text-right px-4 py-2 text-sm text-gray-700`}
                          >
                            <Edit2 className="w-4 h-4" />
                            تعديل
                          </button>
                        )}
                      </HeadlessMenu.Item>
                      <HeadlessMenu.Item>
                        {({ active }: { active: boolean }) => (
                          <button
                            onClick={() => setShowDeleteConfirm(teacher.id)}
                            className={`${
                              active ? 'bg-gray-50' : ''
                            } flex items-center gap-2 w-full text-right px-4 py-2 text-sm text-red-600`}
                          >
                            <Trash2 className="w-4 h-4" />
                            حذف
                          </button>
                        )}
                      </HeadlessMenu.Item>
                    </HeadlessMenu.Items>
                  </HeadlessMenu>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <DollarSign className="w-4 h-4" />
                      <span>الراتب الشهري</span>
                    </div>
                    <span className="font-bold text-orange-600">{formatNumber(teacher.salary)} ج.م</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span>البريد الإلكتروني</span>
                    </div>
                    <span className="text-sm text-gray-900">{teacher.email}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>رقم الهاتف</span>
                    </div>
                    <span className="text-sm text-gray-900">{teacher.phone}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>تاريخ التعيين</span>
                    </div>
                    <span className="text-sm text-gray-900">
                      {format(parseISO(teacher.hire_date), 'dd/MM/yyyy')}
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      teacher.status === "active"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}>
                      {teacher.status === "active" ? "نشط" : "غير نشط"}
                    </span>
                    <SalaryStatusBadge status={salary?.status} />
                  </div>
                  <button
                    onClick={() => setExpandedTeacher(isExpanded ? null : teacher.id)}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    {isExpanded ? 'عرض أقل' : 'عرض المزيد'}
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
                
                {/* التفاصيل الإضافية */}
                {isExpanded && (
                  <div className="mt-4 space-y-3 text-sm">
                    {teacher.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <span className="font-medium text-gray-700">العنوان:</span>
                          <p className="text-gray-600">{teacher.address}</p>
                        </div>
                      </div>
                    )}
                    {teacher.qualifications && (
                      <div className="flex items-start gap-2">
                        <GraduationCap className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <span className="font-medium text-gray-700">المؤهلات:</span>
                          <p className="text-gray-600">{teacher.qualifications}</p>
                        </div>
                      </div>
                    )}
                    {teacher.notes && (
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div>
                          <span className="font-medium text-gray-700">ملاحظات:</span>
                          <p className="text-gray-600">{teacher.notes}</p>
                        </div>
                      </div>
                    )}
                    
                    {/* معلومات الراتب */}
                    {salary && (
                      <div className="bg-blue-50 rounded-lg p-3 mt-3">
                        <h4 className="font-medium text-blue-900 mb-2">معلومات الراتب</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-blue-700">الشهر:</span>
                            <span className="text-blue-900">{getMonthName(salary.month)} {salary.year}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-blue-700">المبلغ:</span>
                            <span className="font-bold text-blue-900">{formatNumber(salary.amount)} ج.م</span>
                          </div>
                          {salary.payment_date && (
                            <div className="flex justify-between">
                              <span className="text-blue-700">تاريخ الصرف:</span>
                              <span className="text-blue-900">{format(parseISO(salary.payment_date), 'dd/MM/yyyy')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* نافذة تأكيد الحذف */}
      <ConfirmDialog
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
        title="حذف المعلم"
        message="هل أنت متأكد من حذف هذا المعلم؟ لا يمكن التراجع عن هذا الإجراء."
        confirmText="حذف"
        cancelText="إلغاء"
        type="danger"
      />

      {/* نموذج إضافة/تعديل معلم */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={resetForm}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingTeacher ? "تعديل بيانات المعلم" : "إضافة معلم جديد"}
              </h3>
              <button
                onClick={resetForm}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الاسم الكامل <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="مثال: أحمد محمد"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رقم الهاتف <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="01139828833"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    البريد الإلكتروني <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="example@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    التخصص <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="مثال: الرياضيات"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الراتب الشهري (ج.م) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.salary}
                      onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      required
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">ج.م</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    تاريخ التعيين <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.hire_date}
                    onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الحالة
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as "active" | "inactive" })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  >
                    <option value="active">نشط</option>
                    <option value="inactive">غير نشط</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    العنوان
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="مثال: القاهرة - شارع طومان باي"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المؤهلات
                  </label>
                  <textarea
                    value={formData.qualifications}
                    onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="درجات علمية، شهادات، إلخ"
                    rows={2}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ملاحظات
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="ملاحظات إضافية"
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl transition-all font-medium shadow-md"
                >
                  {editingTeacher ? "حفظ التعديلات" : "إضافة المعلم"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-xl transition-all font-medium"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة صرف الرواتب */}
      {showSalaryForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowSalaryForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">صرف الرواتب الشهرية</h3>
                <p className="text-sm text-gray-600 mt-1">إدارة صرف رواتب المعلمين</p>
              </div>
              <button
                onClick={() => setShowSalaryForm(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* اختيار الشهر والسنة */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الشهر
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
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
                      className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                    >
                      {[2024, 2025, 2026].map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* ملخص الرواتب */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-green-700">إجمالي المعلمين النشطين</p>
                    <p className="text-2xl font-bold text-green-900">{stats.activeTeachers}</p>
                  </div>
                  <div>
                    <p className="text-sm text-green-700">إجمالي الرواتب</p>
                    <p className="text-2xl font-bold text-green-900">{formatNumber(stats.totalSalaries)} ج.م</p>
                  </div>
                </div>
              </div>

              {/* رواتب معلقة */}
              {pendingSalaries.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-yellow-600" />
                    رواتب معلقة ({pendingSalaries.length})
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {pendingSalaries.map((salary) => (
                      <div
                        key={salary.id}
                        className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl border border-yellow-200"
                      >
                        <div>
                          <span className="font-medium text-gray-900">{salary.teachers?.name}</span>
                          <span className="text-sm text-gray-600 mr-2">({salary.teachers?.specialization})</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-yellow-700">{formatNumber(salary.amount)} ج.م</span>
                          <button
                            onClick={() => confirmSalary(salary.id, salary.teachers?.name || "")}
                            className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-all"
                            title="تأكيد الصرف"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => cancelSalary(salary.id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all"
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

              {/* زر صرف الرواتب */}
              <button
                onClick={processSalaries}
                disabled={stats.activeTeachers === 0 || processing}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-4 px-4 rounded-xl transition-all font-medium text-lg shadow-md flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    جاري المعالجة...
                  </>
                ) : (
                  <>
                    <DollarSign className="w-5 h-5" />
                    صرف رواتب {stats.activeTeachers} معلم بقيمة {formatNumber(stats.totalSalaries)} ج.م
                  </>
                )}
              </button>

              {/* قائمة المعلمين وحالة رواتبهم */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">حالة رواتب المعلمين</h4>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {teachers.filter(t => t.status === "active").map(teacher => {
                    const salary = salaryStatus[teacher.id];
                    return (
                      <div key={teacher.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            salary?.status === 'paid' ? 'bg-green-100' :
                            salary?.status === 'pending' ? 'bg-yellow-100' :
                            'bg-gray-200'
                          }`}>
                            {salary?.status === 'paid' ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : salary?.status === 'pending' ? (
                              <Clock className="w-4 h-4 text-yellow-600" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-gray-600" />
                            )}
                          </div>
                          <div>
                            <span className="font-medium text-gray-900">{teacher.name}</span>
                            <span className="text-sm text-gray-600 mr-2">({teacher.specialization})</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-700">{formatNumber(teacher.salary)} ج.م</span>
                          {salary?.status === "paid" ? (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                              تم الصرف {salary.payment_date && format(parseISO(salary.payment_date), 'dd/MM')}
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
    </div>
  );
}