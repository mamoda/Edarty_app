import { useState, useEffect } from "react";
import {
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  Search,
  X,
  Printer,
  FileText,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  CreditCard,
  Receipt,
  CheckCircle,
  PieChart,
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  Users,
  RefreshCw,
  AlertTriangle,
  Info,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Fee, Student } from "../types/database";

interface FeesManagerProps {
  onUpdate: () => void;
}

interface StudentBalance {
  student_id: string;
  student_name: string;
  grade: string;
  parent_name: string;
  parent_phone: string;
  total_paid: number;
  total_required: number;
  balance: number;
  last_payment_date: string | null;
  status: "مدين" | "دائن" | "متوازن";
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  type: "deposit" | "withdrawal" | "fee" | "refund";
  amount: number;
  balance_after: number;
  reference_id?: string;
  payment_type?: string;
}

export default function FeesManager({ onUpdate }: FeesManagerProps) {
  const { user } = useAuth();

  // الحالة الأساسية
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFee, setEditingFee] = useState<Fee | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedView, setSelectedView] = useState<
    "dashboard" | "transactions" | "students"
  >("dashboard");
  const [selectedPeriod, setSelectedPeriod] = useState<
    "today" | "week" | "month" | "year" | "all"
  >("month");

  // البيانات
  const [fees, setFees] = useState<Fee[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentBalances, setStudentBalances] = useState<StudentBalance[]>([]);
  const [studentTransactions, setStudentTransactions] = useState<Transaction[]>(
    [],
  );

  // الإحصائيات
  const [statistics, setStatistics] = useState({
    total_collected: 0,
    expected_revenue: 0,
    outstanding_balance: 0,
    active_students: 0,
    paid_students: 0,
    overdue_students: 0,
    average_per_student: 0,
  });

  // نموذج الدفع
  const [formData, setFormData] = useState({
    student_id: "",
    amount: "",
    payment_type: "رسوم دراسية",
    payment_date: new Date().toISOString().split("T")[0],
    academic_year: new Date().getFullYear().toString(),
    notes: "",
    transaction_type: "deposit" as "deposit" | "refund",
  });

  // المصاريف المطلوبة (مثال - يمكن جلبها من قاعدة البيانات)
  const requiredFees = {
    "رسوم دراسية": 5000,
    "رسوم الكتب": 500,
    "رسوم الأنشطة": 300,
    "رسوم الزي المدرسي": 400,
    "رسوم الباص": 800,
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    calculateBalances();
  }, [fees, students]);

  useEffect(() => {
    if (selectedStudent) {
      loadStudentTransactions(selectedStudent.id);
    }
  }, [selectedStudent, fees]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [feesRes, studentsRes] = await Promise.all([
        supabase
          .from("fees")
          .select("*, student:students(*)")
          .eq("user_id", user.id)
          .order("payment_date", { ascending: false }),
        supabase
          .from("students")
          .select("*")
          .eq("user_id", user.id)
          .order("full_name"),
      ]);

      if (feesRes.error) throw feesRes.error;
      if (studentsRes.error) throw studentsRes.error;

      setFees(feesRes.data || []);
      setStudents(studentsRes.data || []);

      calculateStatistics(feesRes.data || [], studentsRes.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStatistics = (feesData: Fee[], studentsData: Student[]) => {
    const total_collected = feesData.reduce((sum, fee) => sum + fee.amount, 0);
    const active_students = studentsData.filter(
      (s) => s.status === "active",
    ).length;

    // حساب المستحق التقريبي
    const expected_revenue =
      active_students * Object.values(requiredFees).reduce((a, b) => a + b, 0);

    // حساب الطلاب الذين دفعوا كاملاً (تقديري)
    const paid_students = studentsData.filter((s) => {
      const studentFees = feesData.filter((f) => f.student_id === s.id);
      const totalPaid = studentFees.reduce((sum, f) => sum + f.amount, 0);
      return totalPaid >= 3000; // قيمة تقديرية
    }).length;

    setStatistics({
      total_collected,
      expected_revenue,
      outstanding_balance: expected_revenue - total_collected,
      active_students,
      paid_students,
      overdue_students: active_students - paid_students,
      average_per_student:
        active_students > 0 ? total_collected / active_students : 0,
    });
  };

  const calculateBalances = () => {
    const balances: StudentBalance[] = students.map((student) => {
      const studentFees = fees.filter((f) => f.student_id === student.id);
      const total_paid = studentFees.reduce((sum, fee) => sum + fee.amount, 0);

      // حساب المطلوب (تقديري - يمكن تعديله حسب النظام الفعلي)
      const total_required = Object.values(requiredFees).reduce(
        (a, b) => a + b,
        0,
      );

      const balance = total_paid - total_required;
      const last_payment =
        studentFees.length > 0
          ? studentFees.sort(
              (a, b) =>
                new Date(b.payment_date).getTime() -
                new Date(a.payment_date).getTime(),
            )[0].payment_date
          : null;

      let status: "مدين" | "دائن" | "متوازن" = "متوازن";
      if (balance < -100) status = "مدين";
      if (balance > 100) status = "دائن";

      return {
        student_id: student.id,
        student_name: student.full_name,
        grade: student.grade,
        parent_name: student.parent_name,
        parent_phone: student.parent_phone,
        total_paid,
        total_required,
        balance,
        last_payment_date: last_payment,
        status,
      };
    });

    setStudentBalances(balances);
  };

  const loadStudentTransactions = (studentId: string) => {
    const studentFees = fees.filter((f) => f.student_id === studentId);

    let runningBalance = 0;
    const transactions: Transaction[] = studentFees
      .sort(
        (a, b) =>
          new Date(a.payment_date).getTime() -
          new Date(b.payment_date).getTime(),
      )
      .map((fee) => {
        runningBalance += fee.amount;
        return {
          id: fee.id,
          date: fee.payment_date,
          description: fee.payment_type,
          type: fee.amount > 0 ? "deposit" : "withdrawal",
          amount: Math.abs(fee.amount),
          balance_after: runningBalance,
          payment_type: fee.payment_type,
        };
      });

    setStudentTransactions(transactions);
  };

  // ✅ الكود المصحح - نرسل فقط الحقول الموجودة في قاعدة البيانات
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("الرجاء تسجيل الدخول أولاً");
      return;
    }

    // التحقق من صحة البيانات
    if (!formData.student_id) {
      alert("الرجاء اختيار الطالب");
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      alert("الرجاء إدخال مبلغ صحيح");
      return;
    }

    try {
      // ✅ إنشاء كائن يطابق هيكل قاعدة البيانات فقط
      const finalAmount =
        formData.transaction_type === "refund" ? -amount : amount;

      const feeData = {
        student_id: formData.student_id,
        amount: finalAmount,
        payment_type: formData.payment_type,
        payment_date: formData.payment_date,
        academic_year: formData.academic_year,
        notes: formData.notes || null, // تحويل السلسلة الفارغة إلى null
        user_id: user.id,
      };

      console.log("بيانات الإرسال:", feeData); // للتتبع

      if (editingFee) {
        const { error } = await supabase
          .from("fees")
          .update(feeData)
          .eq("id", editingFee.id);

        if (error) {
          console.error("خطأ في التحديث:", error);
          throw error;
        }
      } else {
        const { error } = await supabase.from("fees").insert([feeData]);

        if (error) {
          console.error("خطأ في الإدراج:", error);
          throw error;
        }
      }

      resetForm();
      await loadData(); // انتظار تحميل البيانات
      onUpdate();

      alert(editingFee ? "تم تحديث الدفعة بنجاح" : "تم إضافة الدفعة بنجاح");
    } catch (error: any) {
      console.error("Error saving fee:", error);

      // رسائل خطأ مخصصة
      let errorMessage = "حدث خطأ أثناء حفظ البيانات";

      if (error.code === "23503") {
        errorMessage = "الطالب المحدد غير موجود";
      } else if (error.code === "23502") {
        errorMessage = "جميع الحقول المطلوبة يجب أن تكون مليئة";
      } else if (error.code === "42P01") {
        errorMessage = "جدول المصاريف غير موجود. الرجاء الاتصال بالدعم الفني";
      } else if (error.message) {
        errorMessage = error.message;
      }

      alert(errorMessage);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الدفعة؟")) return;

    try {
      const { error } = await supabase.from("fees").delete().eq("id", id);

      if (error) throw error;
      loadData();
      onUpdate();
      alert("تم حذف الدفعة بنجاح");
    } catch (error) {
      console.error("Error deleting fee:", error);
      alert("حدث خطأ أثناء حذف الدفعة");
    }
  };

  const handleEdit = (fee: Fee) => {
    setEditingFee(fee);
    setFormData({
      student_id: fee.student_id,
      amount: Math.abs(fee.amount).toString(),
      payment_type: fee.payment_type,
      payment_date: fee.payment_date,
      academic_year: fee.academic_year,
      notes: fee.notes || "",
      transaction_type: fee.amount >= 0 ? "deposit" : "refund", // ✅ هذا فقط للواجهة
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      student_id: "",
      amount: "",
      payment_type: "رسوم دراسية",
      payment_date: new Date().toISOString().split("T")[0],
      academic_year: new Date().getFullYear().toString(),
      notes: "",
      transaction_type: "deposit", // ✅ هذا فقط للواجهة
    });
    setEditingFee(null);
    setShowForm(false);
  };

  const handlePrintStatement = (student: Student) => {
    const balances = studentBalances.find((b) => b.student_id === student.id);
    const transactions = studentTransactions;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const formatDate = (date: string) =>
      new Date(date).toLocaleDateString("ar-EG");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>كشف حساب - ${student.full_name}</title>
        <style>
          body { font-family: 'Arial', sans-serif; background: #f3f4f6; padding: 20px; }
          .statement { max-width: 900px; margin: 0 auto; background: white; border-radius: 20px; padding: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; }
          .bank-name { font-size: 28px; font-weight: bold; color: #059669; }
          .branch-name { font-size: 16px; color: #6b7280; }
          .account-info { background: #f0fdf4; padding: 20px; border-radius: 12px; margin-bottom: 30px; }
          .balance-info { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
          .balance-card { background: linear-gradient(135deg, #f8fafc, #f1f5f9); padding: 15px; border-radius: 10px; text-align: center; }
          .balance-label { font-size: 14px; color: #6b7280; }
          .balance-value { font-size: 24px; font-weight: bold; color: #059669; }
          .transactions-table { width: 100%; border-collapse: collapse; }
          .transactions-table th { background: #059669; color: white; padding: 12px; }
          .transactions-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
          .deposit { color: #059669; }
          .withdrawal { color: #dc2626; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 2px dashed #e5e7eb; text-align: center; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="statement">
          <div class="header">
<div class="bank-name">
  <svg class="inline-block w-10 h-10 ml-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 10L12 3L21 10L20 11L19 10.5V19H17V12H7V19H5V10.5L4 11L3 10Z" fill="url(#gradient)" />
    <rect x="8" y="14" width="8" height="5" fill="url(#gradient2)" />
    <path d="M12 6L6 10V12H18V10L12 6Z" fill="url(#gradient3)" />
    <circle cx="12" cy="16.5" r="1.5" fill="white" />
    <defs>
      <linearGradient id="gradient" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
        <stop stop-color="#059669"/>
        <stop offset="1" stop-color="#2563EB"/>
      </linearGradient>
      <linearGradient id="gradient2" x1="8" y1="14" x2="16" y2="19" gradientUnits="userSpaceOnUse">
        <stop stop-color="#047857"/>
        <stop offset="1" stop-color="#1D4ED8"/>
      </linearGradient>
      <linearGradient id="gradient3" x1="6" y1="6" x2="18" y2="12" gradientUnits="userSpaceOnUse">
        <stop stop-color="#10B981"/>
        <stop offset="1" stop-color="#3B82F6"/>
      </linearGradient>
    </defs>
  </svg>
  <span class="bg-gradient-to-l from-emerald-600 to-blue-600 bg-clip-text text-transparent">
    بنك إدارتي التعليمي
  </span>
</div>            <div class="branch-name">فرع المصاريف الدراسية</div>
          </div>
          
          <div class="account-info">
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
              <div><strong>اسم صاحب الحساب:</strong> ${student.full_name}</div>
              <div><strong>رقم الحساب:</strong> STU-${student.id.slice(0, 8).toUpperCase()}</div>
              <div><strong>الصف الدراسي:</strong> ${student.grade}</div>
              <div><strong>تاريخ الكشف:</strong> ${new Date().toLocaleDateString("ar-EG")}</div>
            </div>
          </div>

          <div class="balance-info">
            <div class="balance-card">
              <div class="balance-label">إجمالي المدفوعات</div>
              <div class="balance-value">${balances?.total_paid.toFixed(2)} ج.م</div>
            </div>
            <div class="balance-card">
              <div class="balance-label">إجمالي المستحق</div>
              <div class="balance-value">${balances?.total_required.toFixed(2)} ج.م</div>
            </div>
            <div class="balance-card">
              <div class="balance-label">الرصيد الحالي</div>
              <div class="balance-value" style="color: ${balances && balances.balance >= 0 ? "#059669" : "#dc2626"}">
                ${balances?.balance.toFixed(2)} ج.م
              </div>
            </div>
          </div>

          <h3 style="margin-bottom: 15px;">📋 حركات الحساب</h3>
          <table class="transactions-table">
            <thead>
              <tr>
                <th>التاريخ</th>
                <th>البيان</th>
                <th>نوع العملية</th>
                <th>المبلغ</th>
                <th>الرصيد بعد العملية</th>
              </tr>
            </thead>
            <tbody>
              ${transactions
                .map(
                  (t) => `
                <tr>
                  <td>${formatDate(t.date)}</td>
                  <td>${t.description}</td>
                  <td>${t.type === "deposit" ? "إيداع" : t.type === "refund" ? "استرداد" : "مصروفات"}</td>
                  <td class="${t.type === "deposit" ? "deposit" : "withdrawal"}">
                    ${t.type === "deposit" ? "+" : "-"}${t.amount.toFixed(2)} ج.م
                  </td>
                  <td>${t.balance_after.toFixed(2)} ج.م</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>

          <div class="footer">
            <p>هذا الكشف معتمد إلكترونياً ويعتبر بمثابة كشف حساب رسمي</p>
            <p style="font-size: 12px; margin-top: 10px;">نظام إدارتي - إدارة المصاريف الدراسية</p>
          </div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const paymentTypes = [
    "رسوم دراسية",
    "رسوم الكتب",
    "رسوم الأنشطة",
    "رسوم الزي المدرسي",
    "رسوم الباص",
    "دفعة مقدمة",
    "تسوية رصيد",
    "استرداد مبلغ",
  ];

  const filteredBalances = studentBalances.filter(
    (b) =>
      b.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.grade.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.parent_name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "دائن":
        return "text-green-600 bg-green-100";
      case "مدين":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <div className="space-y-6">
      {/* العنوان والإجراءات السريعة */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            النظام البنكي للتحصيل
          </h2>
          <p className="text-sm text-gray-600">
            إدارة حسابات الطلاب والعمليات المالية
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-2 rounded-lg transition-all shadow-md"
          >
            <Plus className="w-5 h-5" />
            <span>عملية مالية جديدة</span>
          </button>
          <button
            onClick={() => loadData()}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
            title="تحديث البيانات"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* تبويبات العرض */}
      <div className="bg-white rounded-xl shadow-md p-2 flex gap-2 overflow-x-auto">
        <button
          onClick={() => setSelectedView("dashboard")}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
            selectedView === "dashboard"
              ? "bg-green-600 text-white"
              : "hover:bg-gray-100"
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>لوحة المعلومات</span>
        </button>
        <button
          onClick={() => setSelectedView("students")}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
            selectedView === "students"
              ? "bg-green-600 text-white"
              : "hover:bg-gray-100"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>أرصدة الطلاب</span>
        </button>
        <button
          onClick={() => setSelectedView("transactions")}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
            selectedView === "transactions"
              ? "bg-green-600 text-white"
              : "hover:bg-gray-100"
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>سجل العمليات</span>
        </button>
      </div>

      {selectedView === "dashboard" && (
        <>
          {/* بطاقات الإحصائيات */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-md p-6 border-r-4 border-green-600">
              <div className="flex items-center justify-between mb-2">
                <Wallet className="w-8 h-8 text-green-600" />
                <span className="text-xs text-gray-500">إجمالي التحصيل</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {Number(statistics.total_collected).toLocaleString("ar-EG", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                ج.م
              </p>{" "}
              <p className="text-xs text-green-600 mt-1">
                من {statistics.active_students} طالب نشط
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-r-4 border-blue-600">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-8 h-8 text-blue-600" />
                <span className="text-xs text-gray-500">المستحق</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {Number(statistics.expected_revenue).toLocaleString("ar-EG", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                ج.م{" "}
              </p>
              <p className="text-xs text-blue-600 mt-1">المتوقع تحصيله</p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-r-4 border-yellow-600">
              <div className="flex items-center justify-between mb-2">
                <TrendingDown className="w-8 h-8 text-yellow-600" />
                <span className="text-xs text-gray-500">المتبقي</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {Number(statistics.outstanding_balance).toLocaleString(
                  "ar-EG",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  },
                )}{" "}
                ج.م{" "}
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                مستحق على {statistics.overdue_students} طالب
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-r-4 border-purple-600">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle className="w-8 h-8 text-purple-600" />
                <span className="text-xs text-gray-500">متوسط السداد</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {Number(statistics.average_per_student).toLocaleString(
                  "ar-EG",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  },
                )}{" "}
                ج.م{" "}
              </p>
              <p className="text-xs text-purple-600 mt-1">لكل طالب</p>
            </div>
          </div>

          {/* قائمة الطلاب المميزة */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              أبرز الأرصدة
            </h3>
            <div className="space-y-3">
              {studentBalances.slice(0, 5).map((balance) => (
                <div
                  key={balance.student_id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {balance.student_name}
                    </p>
                    <p className="text-sm text-gray-600">{balance.grade}</p>
                  </div>
                  <div className="text-left">
                    <p
                      className={`font-bold ${balance.balance >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {Number(balance.balance).toLocaleString("ar-EG", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      ج.م{" "}
                    </p>
                    <p
                      className={`text-xs px-2 py-1 rounded-full ${getStatusColor(balance.status)}`}
                    >
                      {balance.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {selectedView === "students" && (
        <>
          {/* بحث وتصفية */}
          <div className="bg-white rounded-xl shadow-md p-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="البحث في حسابات الطلاب..."
                className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* قائمة حسابات الطلاب */}
          <div className="grid gap-4">
            {filteredBalances.map((balance) => (
              <div
                key={balance.student_id}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all cursor-pointer"
                onClick={() =>
                  setSelectedStudent(
                    students.find((s) => s.id === balance.student_id) || null,
                  )
                }
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        {balance.student_name}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(balance.status)}`}
                      >
                        {balance.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">الصف:</span>
                        <span className="font-medium text-gray-900 mr-2">
                          {balance.grade}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">ولي الأمر:</span>
                        <span className="font-medium text-gray-900 mr-2">
                          {balance.parent_name}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">الهاتف:</span>
                        <span
                          className="font-medium text-gray-900 mr-2"
                          dir="ltr"
                        >
                          {balance.parent_phone}
                        </span>
                      </div>
                      {balance.last_payment_date && (
                        <div>
                          <span className="text-gray-600">آخر دفعة:</span>
                          <span className="font-medium text-gray-900 mr-2">
                            {balance.last_payment_date}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="text-left">
                      <p className="text-sm text-gray-600">الرصيد الحالي</p>
                      <p
                        className={`text-2xl font-bold ${balance.balance >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {Number(balance.balance).toLocaleString("ar-EG", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        ج.م
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const student = students.find(
                            (s) => s.id === balance.student_id,
                          );
                          if (student) {
                            setSelectedStudent(student);
                            loadStudentTransactions(student.id);
                            handlePrintStatement(student);
                          }
                        }}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                        title="طباعة كشف حساب"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData({
                            ...formData,
                            student_id: balance.student_id,
                          });
                          setShowForm(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="تسديد"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* شريط تقدم السداد */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">تم السداد</span>
                    <span className="font-medium">
                      {Math.min(
                        100,
                        (balance.total_paid / balance.total_required) * 100,
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-l from-green-500 to-green-600"
                      style={{
                        width: `${Math.min(100, (balance.total_paid / balance.total_required) * 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-gray-600">
                      المدفوع:{" "}
                      {Number(balance.total_paid).toLocaleString("ar-EG", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      ج.م
                    </span>
                    <span className="text-gray-600">
                      المستحق:{" "}
                      {Number(balance.total_required).toLocaleString("ar-EG", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      ج.م
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {selectedView === "transactions" && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            جميع العمليات المالية
          </h3>
          <div className="space-y-3">
            {fees.map((fee) => (
              <div
                key={fee.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all"
              >
                <div className="flex items-center gap-3">
                  {fee.amount > 0 ? (
                    <ArrowUpCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <ArrowDownCircle className="w-6 h-6 text-red-600" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">
                      {fee.student?.full_name}
                    </p>
                    <p className="text-sm text-gray-600">{fee.payment_type}</p>
                    <p className="text-xs text-gray-500">{fee.payment_date}</p>
                  </div>
                </div>
                <div className="text-left">
                  <p
                    className={`font-bold ${fee.amount >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {fee.amount >= 0 ? "+" : "-"}
                    {Number(Math.abs(fee.amount)).toLocaleString("ar-EG", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    ج.م{" "}
                  </p>
                  <p className="text-xs text-gray-500">{fee.academic_year}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* نموذج إضافة/تعديل العملية المالية */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingFee ? "تعديل العملية" : "عملية مالية جديدة"}
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
                  الطالب
                </label>
                <select
                  value={formData.student_id}
                  onChange={(e) =>
                    setFormData({ ...formData, student_id: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="">اختر الطالب</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.full_name} - {student.grade}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نوع العملية
                </label>
                <select
                  value={formData.transaction_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      transaction_type: e.target.value as "deposit" | "refund",
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                >
                  <option value="deposit">إيداع / سداد</option>
                  <option value="refund">استرداد / خصم</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نوع الدفعة
                </label>
                <select
                  value={formData.payment_type}
                  onChange={(e) =>
                    setFormData({ ...formData, payment_type: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="">اختر نوع الدفعة</option>
                  {paymentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  تاريخ العملية
                </label>
                <input
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) =>
                    setFormData({ ...formData, payment_date: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  السنة الدراسية
                </label>
                <input
                  type="text"
                  value={formData.academic_year}
                  onChange={(e) =>
                    setFormData({ ...formData, academic_year: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  placeholder="2024"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none"
                  rows={3}
                  placeholder="إضافة ملاحظات حول العملية..."
                />
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  بعد إتمام العملية سيتم تحديث رصيد الطالب تلقائياً
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-2 px-4 rounded-lg transition-all"
                >
                  {editingFee ? "حفظ التعديلات" : "تنفيذ العملية"}
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
    </div>
  );
}
