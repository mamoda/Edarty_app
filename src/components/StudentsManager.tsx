// src/components/StudentsManager.tsx
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  UserPlus,
  Edit2,
  Trash2,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Users,
  GraduationCap,
  Phone,
  User,
  CheckCircle,
  XCircle,
  Loader2,
  Filter,
  Download,
  Printer,
  Mail,
  MessageSquare,
  MoreVertical,
  Eye,
  Archive,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertCircle,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Student } from "../types/database";
import { notifyStudentAdded, notifyStudentDeleted } from "../lib/notifications";

interface StudentsManagerProps {
  onUpdate: () => void;
}

const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
};

const useToast = () => {
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info" | "warning";
  } | null>(null);
  const showToast = useCallback(
    (
      message: string,
      type: "success" | "error" | "info" | "warning" = "info",
    ) => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 3000);
    },
    [],
  );
  return {
    toast,
    showToast,
    ToastComponent: () =>
      toast ? (
        <div
          className={`fixed bottom-20 right-4 z-50 px-4 py-3 rounded-lg shadow-lg animate-slide-up flex items-center gap-2 ${
            toast.type === "success"
              ? "bg-green-600"
              : toast.type === "error"
                ? "bg-red-600"
                : toast.type === "warning"
                  ? "bg-yellow-600"
                  : "bg-blue-600"
          } text-white text-sm`}
        >
          {toast.type === "success" && <CheckCircle className="w-4 h-4" />}
          {toast.type === "error" && <AlertCircle className="w-4 h-4" />}
          {toast.type === "warning" && <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      ) : null,
  };
};

const StudentCardSkeleton = () => (
  <div className="bg-gray-50 rounded-lg p-4 animate-pulse">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-5 w-32 bg-gray-200 rounded"></div>
          <div className="h-4 w-16 bg-gray-200 rounded-full"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="h-4 w-40 bg-gray-200 rounded"></div>
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
        </div>
      </div>
      <div className="flex gap-1">
        <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
        <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
      </div>
    </div>
  </div>
);

const StatsCard: React.FC<{
  title: string;
  value: number;
  icon: React.ElementType;
  iconColor: string;
  bgGradient: string;
  trend?: number;
  isLoading?: boolean;
}> = ({
  title,
  value,
  icon: Icon,
  iconColor,
  bgGradient,
  trend,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-24 bg-gray-200 rounded"></div>
            <div className="h-8 w-16 bg-gray-200 rounded"></div>
          </div>
          <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 group">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900">
              {value.toLocaleString("ar-EG")}
            </p>
            {trend !== undefined && (
              <div
                className={`flex items-center gap-1 mt-1 text-xs ${trend >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {trend >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span>{Math.abs(trend)}%</span>
                <span className="text-gray-400">عن الشهر الماضي</span>
              </div>
            )}
          </div>
          <div
            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${bgGradient} flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-all duration-500`}
          >
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
        </div>
      </div>
      <div className={`h-1 w-full bg-gradient-to-r ${bgGradient}`} />
    </div>
  );
};

const StudentCard: React.FC<{
  student: Student;
  onEdit: (student: Student) => void;
  onDelete: (id: string) => void;
  onViewDetails: (student: Student) => void;
  canEdit: boolean;
  canDelete: boolean;
}> = ({ student, onEdit, onDelete, onViewDetails, canEdit, canDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="bg-white rounded-lg p-4 hover:shadow-md transition-all duration-300 border border-gray-100 group">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h4 className="font-bold text-gray-900 text-lg">
              {student.full_name}
            </h4>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${
                student.status === "active"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {student.status === "active" ? (
                <CheckCircle className="w-3 h-3" />
              ) : (
                <XCircle className="w-3 h-3" />
              )}
              {student.status === "active" ? "نشط" : "غير نشط"}
            </span>
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              {student.grade}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-600">ولي الأمر:</span>
              <span className="font-medium text-gray-900">
                {student.parent_name}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-600">الهاتف:</span>
              <span
                className="font-medium text-gray-900 font-mono text-sm"
                dir="ltr"
              >
                {student.parent_phone}
              </span>
            </div>
          </div>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            aria-label="خيارات"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-10 animate-fade-in">
              <button
                onClick={() => {
                  onViewDetails(student);
                  setShowMenu(false);
                }}
                className="w-full text-right px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                عرض التفاصيل
              </button>
              {canEdit && (
                <button
                  onClick={() => {
                    onEdit(student);
                    setShowMenu(false);
                  }}
                  className="w-full text-right px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  تعديل
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => {
                    onDelete(student.id);
                    setShowMenu(false);
                  }}
                  className="w-full text-right px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  حذف
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StudentDetailsModal: React.FC<{
  student: Student | null;
  onClose: () => void;
}> = ({ student, onClose }) => {
  if (!student) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-scale-up">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">تفاصيل الطالب</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center justify-center mb-4">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
              {student.full_name.charAt(0).toUpperCase()}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-gray-600">الاسم الكامل</span>
              <span className="font-medium text-gray-900">
                {student.full_name}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-gray-600">الصف الدراسي</span>
              <span className="font-medium text-gray-900">{student.grade}</span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-gray-600">ولي الأمر</span>
              <span className="font-medium text-gray-900">
                {student.parent_name}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-gray-600">رقم الهاتف</span>
              <span className="font-medium text-gray-900 font-mono" dir="ltr">
                {student.parent_phone}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-gray-600">الحالة</span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  student.status === "active"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {student.status === "active" ? "نشط" : "غير نشط"}
              </span>
            </div>
            <div className="flex justify-between items-center pb-2">
              <span className="text-gray-600">تاريخ التسجيل</span>
              <span className="font-medium text-gray-900">
                {new Date(student.created_at).toLocaleDateString("ar-EG")}
              </span>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => {
                window.location.href = `tel:${student.parent_phone}`;
              }}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <Phone className="w-4 h-4" />
              اتصل
            </button>
            <button
              onClick={() => {
                window.location.href = `mailto:?subject=بيانات الطالب ${student.full_name}`;
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              إرسال بريد
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const GradeFilter: React.FC<{
  grades: { grade: string; count: number; activeCount: number }[];
  selectedGrade: string;
  onSelectGrade: (grade: string) => void;
  searchTerm: string;
  totalFilteredCount: number;
}> = ({
  grades,
  selectedGrade,
  onSelectGrade,
  searchTerm,
  totalFilteredCount,
}) => (
  <div className="flex flex-wrap items-center gap-2">
    <Filter className="w-4 h-4 text-gray-400" />
    <span className="text-sm font-medium text-gray-700">تصفية حسب الصف:</span>
    <button
      onClick={() => onSelectGrade("")}
      className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
        selectedGrade === ""
          ? "bg-blue-600 text-white shadow-md"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      الكل {searchTerm && `(${totalFilteredCount})`}
    </button>
    {grades.map(({ grade, count }) => (
      <button
        key={grade}
        onClick={() => onSelectGrade(grade)}
        className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
          selectedGrade === grade
            ? "bg-blue-600 text-white shadow-md"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        }`}
      >
        {grade} ({count})
      </button>
    ))}
  </div>
);

const GradeSection: React.FC<{
  grade: string;
  students: Student[];
  isExpanded: boolean;
  onToggle: () => void;
  onViewAll: () => void;
  onEdit: (student: Student) => void;
  onDelete: (id: string) => void;
  onViewDetails: (student: Student) => void;
  canEdit: boolean;
  canDelete: boolean;
  searchTerm: string;
}> = ({
  grade,
  students,
  isExpanded,
  onToggle,
  onViewAll,
  onEdit,
  onDelete,
  onViewDetails,
  canEdit,
  canDelete,
  searchTerm,
}) => {
  const activeCount = students.filter((s) => s.status === "active").length;

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300">
      <div
        onClick={onToggle}
        className="bg-gradient-to-l from-gray-50 to-white px-6 py-4 border-b cursor-pointer hover:bg-gray-50 transition-all duration-200"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
              <GraduationCap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{grade}</h3>
              <div className="flex items-center gap-3 mt-1 text-sm">
                <span className="text-gray-600">إجمالي: {students.length}</span>
                <span className="text-green-600">نشط: {activeCount}</span>
                <span className="text-gray-400">
                  غير نشط: {students.length - activeCount}
                </span>
                {searchTerm && (
                  <span className="text-blue-600 text-xs">(نتائج البحث)</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewAll();
            }}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
          >
            عرض الكل
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 animate-fade-in">
          <div className="grid gap-3">
            {students.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
                onEdit={onEdit}
                onDelete={onDelete}
                onViewDetails={onViewDetails}
                canEdit={canEdit}
                canDelete={canDelete}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function StudentsManager({ onUpdate }: StudentsManagerProps) {
  const { authUser, currentSchool, hasPermission } = useAuth();
  const { toast, showToast, ToastComponent } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [expandedGrades, setExpandedGrades] = useState<Set<string>>(new Set());
  const [selectedStudentDetails, setSelectedStudentDetails] =
    useState<Student | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"name" | "grade" | "date">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const debouncedSearch = useDebounce(searchTerm, 300);

  const loadStudents = useCallback(
    async (showRefreshIndicator = false) => {
      if (!currentSchool) {
        console.log("⏳ No school selected, skipping load");
        setLoading(false);
        return;
      }

      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const { data, error } = await supabase
          .from("students")
          .select("*")
          .eq("school_id", currentSchool.id)
          .order("grade", { ascending: true })
          .order("full_name", { ascending: true });

        if (error) throw error;
        setStudents(data || []);

        const grades = new Set((data || []).map((s) => s.grade || "غير محدد"));
        setExpandedGrades(grades);
      } catch (error) {
        console.error("Error loading students:", error);
        showToast("حدث خطأ في تحميل البيانات", "error");
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [currentSchool, showToast],
  );

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const studentsByGrade = useMemo(() => {
    return students.reduce(
      (acc, student) => {
        const grade = student.grade || "غير محدد";
        if (!acc[grade]) acc[grade] = [];
        acc[grade].push(student);
        return acc;
      },
      {} as Record<string, Student[]>,
    );
  }, [students]);

  const gradeStats = useMemo(() => {
    return Object.entries(studentsByGrade)
      .map(([grade, students]) => ({
        grade,
        count: students.length,
        activeCount: students.filter((s) => s.status === "active").length,
      }))
      .sort((a, b) => a.grade.localeCompare(b.grade, "ar"));
  }, [studentsByGrade]);

  const filterStudents = useCallback(
    (studentList: Student[]) => {
      if (!debouncedSearch.trim()) return studentList;
      const term = debouncedSearch.toLowerCase().trim();
      return studentList.filter(
        (student) =>
          student.full_name.toLowerCase().includes(term) ||
          student.parent_name.toLowerCase().includes(term) ||
          student.parent_phone.includes(term) ||
          student.grade.toLowerCase().includes(term),
      );
    },
    [debouncedSearch],
  );

  const sortStudents = useCallback(
    (studentList: Student[]) => {
      return [...studentList].sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case "name":
            comparison = a.full_name.localeCompare(b.full_name, "ar");
            break;
          case "grade":
            comparison = a.grade.localeCompare(b.grade, "ar");
            break;
          case "date":
            comparison =
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime();
            break;
        }
        return sortOrder === "asc" ? comparison : -comparison;
      });
    },
    [sortBy, sortOrder],
  );

  const filteredStudentsByGrade = useMemo(() => {
    const result: Record<string, Student[]> = {};
    Object.entries(studentsByGrade).forEach(([grade, gradeStudents]) => {
      const filtered = filterStudents(gradeStudents);
      const sorted = sortStudents(filtered);
      if (sorted.length > 0) {
        result[grade] = sorted;
      }
    });
    return result;
  }, [studentsByGrade, filterStudents, sortStudents]);

  const allFilteredStudents = useMemo(() => {
    const filtered = filterStudents(students);
    return sortStudents(filtered);
  }, [students, filterStudents, sortStudents]);

  const totalFilteredCount = allFilteredStudents.length;

  // Statistics
  const totalStudents = students.length;
  const totalActive = students.filter((s) => s.status === "active").length;
  const totalInactive = students.filter((s) => s.status === "inactive").length;
  const activePercentage =
    totalStudents > 0 ? (totalActive / totalStudents) * 100 : 0;

  // Permissions
  const canAddStudent =
    hasPermission("edit_students") || hasPermission("add_students");
  const canEdit = hasPermission("edit_students");
  const canDelete = hasPermission("delete_students");

  // Handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !currentSchool) return;

    try {
      if (editingStudent) {
        const { error } = await supabase
          .from("students")
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq("id", editingStudent.id)
          .eq("school_id", currentSchool.id);

        if (error) throw error;
        showToast("تم تحديث بيانات الطالب بنجاح", "success");
      } else {
        // ✅ التحقق من عدم وجود رقم هاتف مكرر
        const { data: existingStudent, error: checkError } = await supabase
          .from("students")
          .select("id, full_name")
          .eq("parent_phone", formData.parent_phone)
          .eq("school_id", currentSchool.id)
          .maybeSingle();

        if (existingStudent) {
          showToast(
            `رقم الهاتف "${formData.parent_phone}" مستخدم بالفعل للطالب ${existingStudent.full_name}`,
            "error",
          );
          return;
        }

        const { error } = await supabase.from("students").insert([
          {
            ...formData,
            user_id: authUser.id,
            school_id: currentSchool.id,
            enrollment_date: new Date().toISOString().split("T")[0],
          },
        ]);

        if (error) {
          if (error.code === "23505") {
            showToast("رقم الهاتف مستخدم بالفعل لطالب آخر", "error");
          } else {
            throw error;
          }
          return;
        }
        showToast("تم إضافة الطالب بنجاح", "success");
        
        // ✅ إرسال إشعار للأدمن
        await notifyStudentAdded(currentSchool.id, formData.full_name);
      }

      resetForm();
      loadStudents(true);
      onUpdate();
    } catch (error: any) {
      console.error("Error saving student:", error);
      if (error.code === "23505") {
        showToast("رقم الهاتف موجود بالفعل في النظام", "error");
      } else {
        showToast(error.message || "حدث خطأ أثناء حفظ البيانات", "error");
      }
    }
  };

  // ✅ دالة الحذف المعدلة - المشكلة كانت هنا
  const handleDelete = async (id: string) => {
    // 1. التحقق من الصلاحية
    if (!canDelete) {
      showToast("⚠️ ليس لديك صلاحية لحذف الطلاب", "error");
      return;
    }

    // 2. التحقق من وجود المدرسة الحالية
    if (!currentSchool) {
      showToast("⚠️ لم يتم تحديد المدرسة الحالية", "error");
      return;
    }

    // 3. البحث عن الطالب قبل الحذف
    const studentToDelete = students.find(s => s.id === id);
    if (!studentToDelete) {
      showToast("❌ الطالب غير موجود", "error");
      return;
    }

    // 4. تأكيد الحذف
    const confirmed = window.confirm(
      `⚠️ هل أنت متأكد من حذف الطالب "${studentToDelete.full_name}"؟\n\nهذا الإجراء لا يمكن التراجع عنه!`
    );
    
    if (!confirmed) return;

    // 5. محاولة الحذف
    try {
      console.log(`🗑️ محاولة حذف الطالب: ${studentToDelete.full_name} (ID: ${id}) من المدرسة: ${currentSchool.id}`);

      const { data, error } = await supabase
        .from("students")
        .delete()
        .eq("id", id)
        .eq("school_id", currentSchool.id) // مهم جداً: تأكد أن الطالب ينتمي للمدرسة الحالية
        .select(); // نعيد البيانات للتأكد من الحذف

      if (error) {
        console.error("❌ خطأ من Supabase:", error);
        
        // معالجة أخطاء محددة
        if (error.code === "42501") {
          showToast("🔒 خطأ في الصلاحيات: غير مصرح لك بحذف الطلاب", "error");
        } else if (error.code === "23503") {
          showToast("⚠️ لا يمكن حذف الطالب لأنه مرتبط ببيانات أخرى (مصروفات، غياب، إلخ)", "error");
        } else {
          showToast(`❌ فشل الحذف: ${error.message}`, "error");
        }
        return;
      }

      // التحقق من أن الحذف تم بنجاح (data应该有值)
      if (!data || data.length === 0) {
        console.warn("⚠️ لم يتم حذف أي سجل - قد يكون الطالب لا ينتمي للمدرسة الحالية");
        showToast("⚠️ لم يتم العثور على الطالب أو لا ينتمي لهذه المدرسة", "error");
        return;
      }

      // ✅ نجاح الحذف
      console.log(`✅ تم حذف الطالب بنجاح: ${studentToDelete.full_name}`);
      
      // تحديث الواجهة
      loadStudents(true);
      onUpdate();
      showToast(`✅ تم حذف الطالب "${studentToDelete.full_name}" بنجاح`, "success");
      
      // إرسال إشعار للأدمن
      try {
        await notifyStudentDeleted(currentSchool.id, studentToDelete.full_name);
      } catch (notifyError) {
        console.warn("⚠️ فشل إرسال الإشعار:", notifyError);
        // لا نعرض خطأ للمستخدم لأن الحذف تم بنجاح
      }
      
    } catch (err: any) {
      console.error("💥 خطأ غير متوقع أثناء الحذف:", err);
      showToast("❌ حدث خطأ غير متوقع أثناء حذف الطالب", "error");
    }
  };

  const handleEdit = (student: Student) => {
    if (!canEdit) {
      showToast("ليس لديك صلاحية لتعديل الطلاب", "error");
      return;
    }
    setEditingStudent(student);
    setFormData({
      full_name: student.full_name,
      grade: student.grade,
      parent_name: student.parent_name,
      parent_phone: student.parent_phone,
      status: student.status,
    });
    setShowForm(true);
  };

  const handleViewDetails = (student: Student) => {
    setSelectedStudentDetails(student);
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      grade: "",
      parent_name: "",
      parent_phone: "",
      status: "active",
    });
    setEditingStudent(null);
    setShowForm(false);
  };

  const toggleGrade = (grade: string) => {
    const newExpanded = new Set(expandedGrades);
    if (newExpanded.has(grade)) {
      newExpanded.delete(grade);
    } else {
      newExpanded.add(grade);
    }
    setExpandedGrades(newExpanded);
  };

  const expandAll = () => {
    const allGrades = new Set(Object.keys(filteredStudentsByGrade));
    setExpandedGrades(allGrades);
  };

  const collapseAll = () => {
    setExpandedGrades(new Set());
  };

  const exportToCSV = () => {
    const headers = [
      "الاسم",
      "الصف",
      "ولي الأمر",
      "الهاتف",
      "الحالة",
      "تاريخ التسجيل",
    ];
    const rows = allFilteredStudents.map((s) => [
      s.full_name,
      s.grade,
      s.parent_name,
      s.parent_phone,
      s.status === "active" ? "نشط" : "غير نشط",
      new Date(s.created_at).toLocaleDateString("ar-EG"),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute(
      "download",
      `students_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("تم تصدير البيانات بنجاح", "success");
  };

  const [formData, setFormData] = useState({
    full_name: "",
    grade: "",
    parent_name: "",
    parent_phone: "",
    status: "active" as "active" | "inactive",
  });

  const isLoading = loading && !isRefreshing;

  return (
    <div className="space-y-6">
      <ToastComponent />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">إدارة الطلاب</h2>
          <p className="text-sm text-gray-500 mt-1">
            إدارة بيانات الطلاب وملفاتهم الدراسية
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => loadStudents(true)}
            disabled={isRefreshing}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all disabled:opacity-50"
            aria-label="تحديث"
          >
            <RefreshCw
              className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-all shadow-md"
          >
            <Download className="w-5 h-5" />
            <span>تصدير Excel</span>
          </button>
          {canAddStudent && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg transition-all shadow-md"
            >
              <UserPlus className="w-5 h-5" />
              <span>إضافة طالب</span>
            </button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="إجمالي الطلاب"
          value={totalStudents}
          icon={Users}
          iconColor="text-white"
          bgGradient="from-blue-500 to-blue-600"
          isLoading={isLoading}
        />
        <StatsCard
          title="الطلاب النشطون"
          value={totalActive}
          icon={CheckCircle}
          iconColor="text-white"
          bgGradient="from-emerald-500 to-green-600"
          trend={activePercentage}
          isLoading={isLoading}
        />
        <StatsCard
          title="الطلاب غير النشطين"
          value={totalInactive}
          icon={XCircle}
          iconColor="text-white"
          bgGradient="from-gray-500 to-gray-600"
          isLoading={isLoading}
        />
        <StatsCard
          title="عدد الصفوف"
          value={Object.keys(studentsByGrade).length}
          icon={GraduationCap}
          iconColor="text-white"
          bgGradient="from-purple-500 to-purple-600"
          isLoading={isLoading}
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-md p-4 space-y-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="البحث عن طالب (بالاسم، ولي الأمر، رقم الهاتف، أو الصف)..."
            className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <GradeFilter
            grades={gradeStats}
            selectedGrade={selectedGrade}
            onSelectGrade={setSelectedGrade}
            searchTerm={searchTerm}
            totalFilteredCount={totalFilteredCount}
          />

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-blue-600" : "text-gray-500"}`}
                aria-label="عرض شبكي"
              >
                <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                  <div className="bg-current rounded-sm"></div>
                </div>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-white shadow-sm text-blue-600" : "text-gray-500"}`}
                aria-label="عرض قائمة"
              >
                <div className="w-4 h-4 flex flex-col gap-0.5">
                  <div className="h-0.5 bg-current rounded-full"></div>
                  <div className="h-0.5 bg-current rounded-full"></div>
                  <div className="h-0.5 bg-current rounded-full"></div>
                </div>
              </button>
            </div>

            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [newSortBy, newSortOrder] = e.target.value.split("-");
                setSortBy(newSortBy as "name" | "grade" | "date");
                setSortOrder(newSortOrder as "asc" | "desc");
              }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="name-asc">الاسم (أ-ي)</option>
              <option value="name-desc">الاسم (ي-أ)</option>
              <option value="grade-asc">الصف (تصاعدي)</option>
              <option value="grade-desc">الصف (تنازلي)</option>
              <option value="date-asc">الأقدم أولاً</option>
              <option value="date-desc">الأحدث أولاً</option>
            </select>
          </div>
        </div>

        {searchTerm && (
          <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded-lg flex items-center justify-between">
            <span>
              تم العثور على {totalFilteredCount} نتيجة للبحث "{searchTerm}"
            </span>
            <button
              onClick={() => setSearchTerm("")}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              مسح البحث
            </button>
          </div>
        )}

        {!selectedGrade && Object.keys(filteredStudentsByGrade).length > 0 && (
          <div className="flex justify-end gap-2">
            <button
              onClick={expandAll}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              فتح الكل
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={collapseAll}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              إغلاق الكل
            </button>
          </div>
        )}
      </div>

      {/* Students List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <StudentCardSkeleton key={i} />
          ))}
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            لا توجد بيانات
          </h3>
          <p className="text-gray-600 mb-6">لم يتم إضافة أي طلاب بعد</p>
          {canAddStudent && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-2 rounded-lg transition-all shadow-md"
            >
              إضافة أول طالب
            </button>
          )}
        </div>
      ) : selectedGrade ? (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <GraduationCap className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedGrade}
                </h3>
                <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs">
                  {allFilteredStudents.length} طالب
                </span>
              </div>
              <button
                onClick={() => setSelectedGrade("")}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                عرض الكل
              </button>
            </div>
          </div>

          <div
            className={`grid gap-3 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}
          >
            {allFilteredStudents.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onViewDetails={handleViewDetails}
                canEdit={canEdit}
                canDelete={canDelete}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(filteredStudentsByGrade).map(
            ([grade, gradeStudents]) => (
              <GradeSection
                key={grade}
                grade={grade}
                students={gradeStudents}
                isExpanded={expandedGrades.has(grade)}
                onToggle={() => toggleGrade(grade)}
                onViewAll={() => setSelectedGrade(grade)}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onViewDetails={handleViewDetails}
                canEdit={canEdit}
                canDelete={canDelete}
                searchTerm={searchTerm}
              />
            ),
          )}

          {Object.keys(filteredStudentsByGrade).length === 0 && searchTerm && (
            <div className="bg-white rounded-xl p-12 text-center">
              <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                لا توجد نتائج
              </h3>
              <p className="text-gray-600">
                لم يتم العثور على طلاب يطابقون بحث "{searchTerm}"
              </p>
              <button
                onClick={() => setSearchTerm("")}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                مسح البحث
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Student Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-scale-up">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingStudent ? "تعديل بيانات الطالب" : "إضافة طالب جديد"}
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
                  اسم الطالب *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الصف الدراسي *
                </label>
                <input
                  type="text"
                  value={formData.grade}
                  onChange={(e) =>
                    setFormData({ ...formData, grade: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="مثال: الصف الأول الابتدائي"
                  required
                  list="grades"
                />
                <datalist id="grades">
                  {gradeStats.map(({ grade }) => (
                    <option key={grade} value={grade} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  اسم ولي الأمر *
                </label>
                <input
                  type="text"
                  value={formData.parent_name}
                  onChange={(e) =>
                    setFormData({ ...formData, parent_name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رقم الهاتف *
                </label>
                <input
                  type="tel"
                  value={formData.parent_phone}
                  onChange={(e) =>
                    setFormData({ ...formData, parent_phone: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="01xxxxxxxxx"
                  required
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
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2 px-4 rounded-lg transition-all"
                >
                  {editingStudent ? "حفظ التعديلات" : "إضافة الطالب"}
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

      {/* Student Details Modal */}
      {selectedStudentDetails && (
        <StudentDetailsModal
          student={selectedStudentDetails}
          onClose={() => setSelectedStudentDetails(null)}
        />
      )}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scale-up { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.3s ease-out forwards; }
        .animate-scale-up { animation: scale-up 0.2s ease-out forwards; }
      `,
        }}
      />
    </div>
  );
}