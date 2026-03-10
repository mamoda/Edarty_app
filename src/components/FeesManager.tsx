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
  Banknote,
  Landmark,
  Percent,
  Clock,
  Bell,
  XCircle,
  Sun,
  Moon,
  Filter,
  DownloadCloud,
  BarChart3,
  Target,
  Award,
  Gift,
  BookOpen,
  GraduationCap,
  Home,
  Settings,
  LogOut,
  Menu,
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
  last_payment_method?: string;
  status: "مدين" | "دائن" | "متوازن";
  payment_percentage: number;
  installments_count: number;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  type: "deposit" | "withdrawal" | "fee" | "refund" | "installment" | "discount" | "late_fee";
  amount: number;
  balance_after: number;
  reference_id?: string;
  payment_type?: string;
  payment_method?: string;
  receipt_number?: string;
}

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function FeesManager({ onUpdate }: FeesManagerProps) {
  const { user } = useAuth();

  // الحالة الأساسية
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [editingFee, setEditingFee] = useState<Fee | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedView, setSelectedView] = useState<
    "dashboard" | "transactions" | "students"
  >("dashboard");
  const [selectedPeriod, setSelectedPeriod] = useState<
    "today" | "week" | "month" | "year" | "all"
  >("month");
  const [darkMode, setDarkMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // البيانات
  const [fees, setFees] = useState<Fee[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentBalances, setStudentBalances] = useState<StudentBalance[]>([]);
  const [studentTransactions, setStudentTransactions] = useState<Transaction[]>([]);
  const [currentReceipt, setCurrentReceipt] = useState<any>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // الإحصائيات
  const [statistics, setStatistics] = useState({
    total_collected: 0,
    expected_revenue: 0,
    outstanding_balance: 0,
    active_students: 0,
    paid_students: 0,
    partial_paid_students: 0,
    unpaid_students: 0,
    overdue_students: 0,
    average_per_student: 0,
    collection_rate: 0,
    cash_payments: 0,
    card_payments: 0,
    bank_transfer_payments: 0,
    check_payments: 0,
    today_collections: 0,
    this_week_collections: 0,
    this_month_collections: 0,
    this_year_collections: 0,
    daily_target: 5000,
    monthly_target: 150000,
  });

  // نموذج الدفع المحسن
  const [formData, setFormData] = useState({
    student_id: "",
    amount: "",
    payment_type: "رسوم دراسية",
    payment_date: new Date().toISOString().split("T")[0],
    academic_year: new Date().getFullYear().toString(),
    notes: "",
    transaction_type: "deposit" as "deposit" | "refund" | "discount" | "late_fee",
    payment_method: "cash" as "cash" | "card" | "bank_transfer" | "check",
    receipt_number: "",
    discount_percentage: 0,
    discount_reason: "",
    late_fee_reason: "",
    is_installment: false,
    installment_number: 1,
    total_installments: 1,
  });

  // المصاريف المطلوبة
  const requiredFees = {
    "رسوم دراسية": 5000,
    "رسوم الكتب": 500,
    "رسوم الأنشطة": 300,
    "رسوم الزي المدرسي": 400,
    "رسوم الباص": 800,
  };

  // طرق الدفع
  const paymentMethods = [
    { value: "cash", label: "نقدي", icon: Banknote, color: "green" },
    { value: "card", label: "بطاقة ائتمان", icon: CreditCard, color: "blue" },
    { value: "bank_transfer", label: "تحويل بنكي", icon: Landmark, color: "purple" },
    { value: "check", label: "شيك", icon: FileText, color: "orange" },
  ];

  // أنواع المصاريف
  const paymentTypes = [
    "رسوم دراسية",
    "رسوم الكتب",
    "رسوم الأنشطة",
    "رسوم الزي المدرسي",
    "رسوم الباص",
    "دفعة مقدمة",
    "تسوية رصيد",
    "استرداد مبلغ",
    "قسط شهري",
    "غرامة تأخير",
    "خصم",
  ];

  // الصفوف الدراسية
  const grades = [
    "التمهيدي",
    "الصف الأول",
    "الصف الثاني", 
    "الصف الثالث",
    "الصف الرابع",
    "الصف الخامس",
    "الصف السادس",
  ];

  // إضافة إشعار جديد
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false,
      ...notification
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    calculateBalances();
    calculatePaymentMethodStats();
  }, [fees, students]);

  useEffect(() => {
    if (selectedStudent) {
      loadStudentTransactions(selectedStudent.id);
    }
  }, [selectedStudent, fees]);

  // التحقق من المواعيد النهائية والطلاب المتأخرين
  useEffect(() => {
    const checkOverduePayments = () => {
      const overdueStudents = studentBalances.filter(b => b.status === 'مدين' && b.balance < -1000);
      if (overdueStudents.length > 0) {
        addNotification({
          type: 'warning',
          title: 'طلاب متأخرين عن السداد',
          message: `يوجد ${overdueStudents.length} طالب لديهم متأخرات كبيرة`,
          action: {
            label: 'عرض القائمة',
            onClick: () => {
              setSelectedView('students');
              setSearchTerm('');
            }
          }
        });
      }
    };

    const checkDailyTarget = () => {
      if (statistics.today_collections >= statistics.daily_target) {
        addNotification({
          type: 'success',
          title: '🎉 تهانينا!',
          message: `تم تحقيق الهدف اليومي: ${statistics.today_collections.toFixed(2)} ج.م`
        });
      }
    };

    const checkMonthlyTarget = () => {
      if (statistics.this_month_collections >= statistics.monthly_target) {
        addNotification({
          type: 'success',
          title: '🏆 إنجاز شهري!',
          message: `تم تحقيق الهدف الشهري: ${statistics.this_month_collections.toFixed(2)} ج.م`
        });
      }
    };

    checkOverduePayments();
    checkDailyTarget();
    checkMonthlyTarget();
  }, [studentBalances, statistics.today_collections, statistics.this_month_collections]);

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
      calculatePaymentMethodStats();
    } catch (error) {
      console.error("Error loading data:", error);
      addNotification({
        type: 'error',
        title: 'خطأ في تحميل البيانات',
        message: 'حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى.'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStatistics = (feesData: Fee[], studentsData: Student[]) => {
    const total_collected = feesData.reduce((sum, fee) => sum + (fee.amount > 0 ? fee.amount : 0), 0);
    const active_students = studentsData.filter(
      (s) => s.status === "active",
    ).length;

    // حساب المستحق التقريبي
    const expected_revenue =
      active_students * Object.values(requiredFees).reduce((a, b) => a + b, 0);

    // حساب الطلاب حسب حالة السداد
    let paid_students = 0;
    let partial_paid_students = 0;
    let unpaid_students = 0;

    studentsData.forEach(student => {
      const studentFees = feesData.filter(f => f.student_id === student.id);
      const totalPaid = studentFees.reduce((sum, f) => sum + (f.amount > 0 ? f.amount : 0), 0);
      
      if (totalPaid >= 3000) {
        paid_students++;
      } else if (totalPaid > 0) {
        partial_paid_students++;
      } else {
        unpaid_students++;
      }
    });

    // حساب تحصيلات اليوم
    const today = new Date().toISOString().split('T')[0];
    const today_collections = feesData
      .filter(f => f.payment_date === today && f.amount > 0)
      .reduce((sum, f) => sum + f.amount, 0);

    // حساب تحصيلات هذا الأسبوع
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const this_week_collections = feesData
      .filter(f => new Date(f.payment_date) >= oneWeekAgo && f.amount > 0)
      .reduce((sum, f) => sum + f.amount, 0);

    // حساب تحصيلات هذا الشهر
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const this_month_collections = feesData
      .filter(f => new Date(f.payment_date) >= oneMonthAgo && f.amount > 0)
      .reduce((sum, f) => sum + f.amount, 0);

    // حساب تحصيلات هذه السنة
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const this_year_collections = feesData
      .filter(f => new Date(f.payment_date) >= oneYearAgo && f.amount > 0)
      .reduce((sum, f) => sum + f.amount, 0);

    setStatistics(prev => ({
      ...prev,
      total_collected,
      expected_revenue,
      outstanding_balance: expected_revenue - total_collected,
      active_students,
      paid_students,
      partial_paid_students,
      unpaid_students,
      overdue_students: unpaid_students,
      average_per_student: active_students > 0 ? total_collected / active_students : 0,
      collection_rate: expected_revenue > 0 ? (total_collected / expected_revenue) * 100 : 0,
      today_collections,
      this_week_collections,
      this_month_collections,
      this_year_collections,
    }));
  };

  const calculatePaymentMethodStats = () => {
    let cash = 0, card = 0, bank = 0, check = 0;

    fees.forEach(fee => {
      if (fee.amount > 0 && fee.notes) {
        try {
          const notes = JSON.parse(fee.notes);
          const method = notes.payment_method;
          if (method === 'cash') cash += fee.amount;
          else if (method === 'card') card += fee.amount;
          else if (method === 'bank_transfer') bank += fee.amount;
          else if (method === 'check') check += fee.amount;
        } catch {
          cash += fee.amount;
        }
      } else if (fee.amount > 0) {
        cash += fee.amount;
      }
    });

    setStatistics(prev => ({
      ...prev,
      cash_payments: cash,
      card_payments: card,
      bank_transfer_payments: bank,
      check_payments: check,
    }));
  };

  const calculateBalances = () => {
    const totalRequired = Object.values(requiredFees).reduce((a, b) => a + b, 0);

    const balances: StudentBalance[] = students.map((student) => {
      const studentFees = fees.filter((f) => f.student_id === student.id);
      const total_paid = studentFees
        .filter(f => f.amount > 0)
        .reduce((sum, fee) => sum + fee.amount, 0);

      const installments_count = studentFees
        .filter(f => f.payment_type === "قسط شهري")
        .length;

      const balance = total_paid - totalRequired;
      const last_payment = studentFees.length > 0
        ? studentFees.sort(
            (a, b) =>
              new Date(b.payment_date).getTime() -
              new Date(a.payment_date).getTime(),
          )[0]
        : null;

      let last_payment_method;
      if (last_payment?.notes) {
        try {
          const notes = JSON.parse(last_payment.notes);
          last_payment_method = notes.payment_method;
        } catch {
          last_payment_method = 'cash';
        }
      }

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
        total_required: totalRequired,
        balance,
        last_payment_date: last_payment?.payment_date || null,
        last_payment_method,
        status,
        payment_percentage: totalRequired > 0 ? (total_paid / totalRequired) * 100 : 0,
        installments_count,
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
      .map((fee, index) => {
        runningBalance += fee.amount;
        
        let type: Transaction['type'] = "deposit";
        if (fee.amount < 0) {
          if (fee.payment_type === "خصم") type = "discount";
          else if (fee.payment_type === "استرداد مبلغ") type = "refund";
          else type = "withdrawal";
        } else if (fee.payment_type === "قسط شهري") type = "installment";
        else if (fee.payment_type === "غرامة تأخير") type = "late_fee";
        
        let payment_method = 'cash';
        if (fee.notes) {
          try {
            const notes = JSON.parse(fee.notes);
            payment_method = notes.payment_method || 'cash';
          } catch {}
        }

        return {
          id: fee.id,
          date: fee.payment_date,
          description: fee.payment_type,
          type,
          amount: Math.abs(fee.amount),
          balance_after: runningBalance,
          payment_type: fee.payment_type,
          payment_method,
          receipt_number: `RCP-${new Date(fee.payment_date).getFullYear()}-${String(index + 1).padStart(5, '0')}`,
        };
      });

    setStudentTransactions(transactions);
  };

  // إنشاء رقم إيصال فريد
  const generateReceiptNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `RCP-${year}${month}${day}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      addNotification({
        type: 'error',
        title: 'خطأ في المصادقة',
        message: 'الرجاء تسجيل الدخول أولاً'
      });
      return;
    }

    if (!formData.student_id) {
      addNotification({
        type: 'error',
        title: 'بيانات ناقصة',
        message: 'الرجاء اختيار الطالب'
      });
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      addNotification({
        type: 'error',
        title: 'بيانات ناقصة',
        message: 'الرجاء إدخال مبلغ صحيح'
      });
      return;
    }

    try {
      let finalAmount = amount;
      
      // تحديد المبلغ النهائي حسب نوع العملية
      switch (formData.transaction_type) {
        case "refund":
        case "discount":
          finalAmount = -amount;
          break;
        case "late_fee":
          finalAmount = amount;
          break;
        default:
          finalAmount = amount;
      }

      // تطبيق الخصم إذا وجد
      if (formData.discount_percentage > 0 && formData.transaction_type === "deposit") {
        finalAmount = finalAmount * (1 - formData.discount_percentage / 100);
      }

      // تخزين معلومات إضافية في حقل notes
      const notesData = {
        text: formData.notes,
        payment_method: formData.payment_method,
        receipt_number: formData.receipt_number || generateReceiptNumber(),
        discount_percentage: formData.discount_percentage,
        discount_reason: formData.discount_reason,
        late_fee_reason: formData.late_fee_reason,
        is_installment: formData.is_installment,
        installment_number: formData.installment_number,
        total_installments: formData.total_installments,
        timestamp: new Date().toISOString(),
      };

      const feeData = {
        student_id: formData.student_id,
        amount: finalAmount,
        payment_type: formData.payment_type,
        payment_date: formData.payment_date,
        academic_year: formData.academic_year,
        notes: JSON.stringify(notesData),
        user_id: user.id,
      };

      if (editingFee) {
        const { error } = await supabase
          .from("fees")
          .update(feeData)
          .eq("id", editingFee.id);

        if (error) throw error;
        addNotification({
          type: 'success',
          title: 'تم التحديث بنجاح',
          message: 'تم تحديث بيانات العملية المالية'
        });
      } else {
        const { error } = await supabase.from("fees").insert([feeData]);
        if (error) throw error;
        addNotification({
          type: 'success',
          title: 'تمت الإضافة بنجاح',
          message: 'تم إضافة العملية المالية الجديدة'
        });
      }

      resetForm();
      await loadData();
      onUpdate();

      // عرض الإيصال بعد الدفع الناجح
      if (formData.transaction_type === "deposit") {
        showPaymentReceipt(formData, finalAmount);
      }

    } catch (error: any) {
      console.error("Error saving fee:", error);
      addNotification({
        type: 'error',
        title: 'خطأ في الحفظ',
        message: error.message || 'حدث خطأ أثناء حفظ البيانات'
      });
    }
  };

  // عرض إيصال الدفع
  const showPaymentReceipt = (data: typeof formData, finalAmount: number) => {
    const student = students.find(s => s.id === data.student_id);
    if (!student) return;

    const receipt = {
      receipt_number: data.receipt_number || generateReceiptNumber(),
      student_name: student.full_name,
      grade: student.grade,
      amount: finalAmount,
      payment_date: data.payment_date,
      payment_method: data.payment_method,
      payment_type: data.payment_type,
    };

    setCurrentReceipt(receipt);
    setShowReceiptModal(true);
  };

  // طباعة الإيصال
  const printReceipt = () => {
    if (!currentReceipt) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const formatDate = (date: string) =>
      new Date(date).toLocaleDateString("ar-EG");

    const paymentMethodLabel = 
      currentReceipt.payment_method === 'cash' ? 'نقدي' :
      currentReceipt.payment_method === 'card' ? 'بطاقة ائتمان' :
      currentReceipt.payment_method === 'bank_transfer' ? 'تحويل بنكي' : 'شيك';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>إيصال دفع - ${currentReceipt.student_name}</title>
        <style>
          body { font-family: 'Arial', sans-serif; background: #f3f4f6; padding: 20px; }
          .receipt { max-width: 400px; margin: 0 auto; background: white; border-radius: 20px; padding: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px dashed #e5e7eb; padding-bottom: 20px; }
          .school-name { font-size: 24px; font-weight: bold; background: linear-gradient(135deg, #059669, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          .receipt-title { font-size: 18px; color: #6b7280; margin-top: 5px; }
          .receipt-number { background: linear-gradient(135deg, #f0fdf4, #eff6ff); padding: 10px; border-radius: 10px; text-align: center; margin-bottom: 20px; }
          .receipt-number .label { font-size: 12px; color: #6b7280; }
          .receipt-number .value { font-size: 18px; font-weight: bold; color: #059669; }
          .details { margin-bottom: 20px; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
          .detail-label { color: #6b7280; }
          .detail-value { font-weight: bold; color: #1f2937; }
          .amount { background: linear-gradient(135deg, #f0fdf4, #dcfce7); padding: 15px; border-radius: 10px; text-align: center; margin: 20px 0; }
          .amount .label { font-size: 14px; color: #166534; }
          .amount .value { font-size: 32px; font-weight: bold; color: #059669; }
          .footer { text-align: center; margin-top: 20px; padding-top: 20px; border-top: 2px dashed #e5e7eb; font-size: 12px; color: #9ca3af; }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="school-name">مدارس الإدارة التعليمية</div>
            <div class="receipt-title">إيصال دفع المصاريف الدراسية</div>
          </div>
          
          <div class="receipt-number">
            <div class="label">رقم الإيصال</div>
            <div class="value">${currentReceipt.receipt_number}</div>
          </div>

          <div class="details">
            <div class="detail-row">
              <span class="detail-label">اسم الطالب:</span>
              <span class="detail-value">${currentReceipt.student_name}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">الصف الدراسي:</span>
              <span class="detail-value">${currentReceipt.grade}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">نوع الدفعة:</span>
              <span class="detail-value">${currentReceipt.payment_type}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">تاريخ الدفع:</span>
              <span class="detail-value">${formatDate(currentReceipt.payment_date)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">طريقة الدفع:</span>
              <span class="detail-value">${paymentMethodLabel}</span>
            </div>
          </div>

          <div class="amount">
            <div class="label">المبلغ المدفوع</div>
            <div class="value">${currentReceipt.amount.toFixed(2)} ج.م</div>
          </div>

          <div class="footer">
            <p>هذا الإيصال معتمد إلكترونياً ويعتبر بمثابة سداد رسمي</p>
            <p style="margin-top: 5px;">نظام إدارتي - إدارة المصاريف الدراسية</p>
          </div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الدفعة؟")) return;

    try {
      const { error } = await supabase.from("fees").delete().eq("id", id);

      if (error) throw error;
      loadData();
      onUpdate();
      addNotification({
        type: 'success',
        title: 'تم الحذف بنجاح',
        message: 'تم حذف الدفعة بنجاح'
      });
    } catch (error) {
      console.error("Error deleting fee:", error);
      addNotification({
        type: 'error',
        title: 'خطأ في الحذف',
        message: 'حدث خطأ أثناء حذف الدفعة'
      });
    }
  };

  const handleEdit = (fee: Fee) => {
    setEditingFee(fee);
    
    let transactionType: "deposit" | "refund" | "discount" | "late_fee" = "deposit";
    if (fee.amount < 0) {
      if (fee.payment_type === "خصم") transactionType = "discount";
      else transactionType = "refund";
    } else if (fee.payment_type === "غرامة تأخير") {
      transactionType = "late_fee";
    }

    let paymentMethod = "cash";
    let discountPercentage = 0;
    let discountReason = "";
    let lateFeeReason = "";
    let isInstallment = false;
    let installmentNumber = 1;
    let totalInstallments = 1;

    if (fee.notes) {
      try {
        const notes = JSON.parse(fee.notes);
        paymentMethod = notes.payment_method || "cash";
        discountPercentage = notes.discount_percentage || 0;
        discountReason = notes.discount_reason || "";
        lateFeeReason = notes.late_fee_reason || "";
        isInstallment = notes.is_installment || false;
        installmentNumber = notes.installment_number || 1;
        totalInstallments = notes.total_installments || 1;
      } catch {}
    }

    setFormData({
      student_id: fee.student_id,
      amount: Math.abs(fee.amount).toString(),
      payment_type: fee.payment_type,
      payment_date: fee.payment_date,
      academic_year: fee.academic_year,
      notes: fee.notes || "",
      transaction_type: transactionType,
      payment_method: paymentMethod as any,
      receipt_number: "",
      discount_percentage: discountPercentage,
      discount_reason: discountReason,
      late_fee_reason: lateFeeReason,
      is_installment: isInstallment,
      installment_number: installmentNumber,
      total_installments: totalInstallments,
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
      transaction_type: "deposit",
      payment_method: "cash",
      receipt_number: "",
      discount_percentage: 0,
      discount_reason: "",
      late_fee_reason: "",
      is_installment: false,
      installment_number: 1,
      total_installments: 1,
    });
    setEditingFee(null);
    setShowForm(false);
    setShowReceiptModal(false);
    setCurrentReceipt(null);
  };

  // تصدير التقارير
  const exportToExcel = () => {
    const headers = ['الطالب', 'الصف', 'المدفوع', 'المستحق', 'الرصيد', 'آخر دفعة', 'الحالة'];
    const data = studentBalances.map(b => [
      b.student_name,
      b.grade,
      b.total_paid.toFixed(2),
      b.total_required.toFixed(2),
      b.balance.toFixed(2),
      b.last_payment_date || '-',
      b.status
    ]);

    const csv = [headers, ...data].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `تقرير_الأرصدة_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    addNotification({
      type: 'success',
      title: 'تم التصدير بنجاح',
      message: 'تم تصدير التقرير إلى ملف Excel'
    });
  };

  const handlePrintStatement = (student: Student) => {
    const balances = studentBalances.find((b) => b.student_id === student.id);
    const transactions = studentTransactions;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const formatDate = (date: string) =>
      new Date(date).toLocaleDateString("ar-EG");

    const getPaymentMethodLabel = (method?: string) => {
      if (!method) return '-';
      switch(method) {
        case 'cash': return 'نقدي';
        case 'card': return 'بطاقة';
        case 'bank_transfer': return 'تحويل بنكي';
        case 'check': return 'شيك';
        default: return method;
      }
    };

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>كشف حساب - ${student.full_name}</title>
        <style>
          body { font-family: 'Arial', sans-serif; background: #f3f4f6; padding: 20px; }
          .statement { max-width: 1000px; margin: 0 auto; background: white; border-radius: 20px; padding: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; }
          .bank-name { font-size: 28px; font-weight: bold; background: linear-gradient(135deg, #059669, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          .branch-name { font-size: 16px; color: #6b7280; }
          .account-info { background: linear-gradient(135deg, #f0fdf4, #eff6ff); padding: 20px; border-radius: 12px; margin-bottom: 30px; }
          .balance-info { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
          .balance-card { background: linear-gradient(135deg, #f8fafc, #f1f5f9); padding: 15px; border-radius: 10px; text-align: center; }
          .balance-label { font-size: 14px; color: #6b7280; }
          .balance-value { font-size: 24px; font-weight: bold; color: #059669; }
          .transactions-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .transactions-table th { background: #059669; color: white; padding: 12px; }
          .transactions-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
          .deposit { color: #059669; }
          .withdrawal { color: #dc2626; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 2px dashed #e5e7eb; text-align: center; color: #6b7280; }
          .badge { display: inline-block; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; }
          .badge-cash { background: #05966920; color: #059669; }
          .badge-card { background: #3b82f620; color: #3b82f6; }
          .badge-bank { background: #8b5cf620; color: #8b5cf6; }
        </style>
      </head>
      <body>
        <div class="statement">
          <div class="header">
            <div class="bank-name">🏦 بنك إدارتي التعليمي</div>
            <div class="branch-name">فرع المصاريف الدراسية</div>
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
                <th>طريقة الدفع</th>
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
                  <td>${t.type === "deposit" ? "إيداع" : 
                       t.type === "refund" ? "استرداد" : 
                       t.type === "discount" ? "خصم" :
                       t.type === "late_fee" ? "غرامة" :
                       t.type === "installment" ? "قسط" : "مصروفات"}</td>
                  <td><span class="badge badge-${t.payment_method === 'cash' ? 'cash' : t.payment_method === 'card' ? 'card' : 'bank'}">${
                    getPaymentMethodLabel(t.payment_method)
                  }</span></td>
                  <td class="${t.type === "deposit" || t.type === "installment" ? "deposit" : "withdrawal"}">
                    ${t.type === "deposit" || t.type === "installment" ? "+" : "-"}${t.amount.toFixed(2)} ج.م
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

  const filteredBalances = studentBalances.filter(
    (b) =>
      (b.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.grade.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.parent_name.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (selectedGrade === "all" || b.grade === selectedGrade) &&
      (selectedStatus === "all" || b.status === selectedStatus)
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

  const getPaymentMethodIcon = (method?: string) => {
    switch (method) {
      case 'cash': return <Banknote className="w-4 h-4 text-green-600" />;
      case 'card': return <CreditCard className="w-4 h-4 text-blue-600" />;
      case 'bank_transfer': return <Landmark className="w-4 h-4 text-purple-600" />;
      case 'check': return <FileText className="w-4 h-4 text-orange-600" />;
      default: return null;
    }
  };

  // تصفية الإشعارات غير المقروءة
  const unreadNotifications = notifications.filter(n => !n.read).length;

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      {/* خلفية متحركة */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 right-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-float" style={{ animationDelay: '3s' }}></div>
      </div>

      {/* الهيدر العلوي مع الشعار والإشعارات */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-2xl shadow-2xl mb-8 overflow-hidden relative z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* الشعار والنظام */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="lg:hidden p-2 hover:bg-white/10 rounded-lg transition-all"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <div className="relative group">
                <div className="absolute -inset-3 bg-gradient-to-r from-emerald-400 to-blue-400 rounded-full blur-xl opacity-0 group-hover:opacity-50 transition-all duration-700"></div>
                
                <div className="flex items-center gap-3 relative cursor-pointer" onClick={() => setSelectedView("dashboard")}>
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
                    <div className="relative z-10 w-14 h-14 bg-gradient-to-br from-emerald-400 to-blue-400 rounded-xl flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-500">
                      <DollarSign className="w-7 h-7 text-white" />
                    </div>
                  </div>
                  
                  <div className="hidden sm:block">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-300 to-blue-300 bg-clip-text text-transparent">
                      إدارتي
                    </h1>
                    <p className="text-xs text-gray-400 tracking-wider">البنك التعليمي</p>
                  </div>
                </div>
              </div>
            </div>

            {/* مؤشرات الأداء السريعة */}
            <div className="hidden lg:flex items-center gap-6">
              <div className="flex items-center gap-3 bg-white/10 rounded-lg px-4 py-2 backdrop-blur-sm hover:bg-white/20 transition-all cursor-pointer">
                <div className="text-right">
                  <p className="text-xs text-gray-400">تحصيل اليوم</p>
                  <p className="text-lg font-bold text-emerald-400">
                    {statistics.today_collections.toFixed(2)} ج.م
                  </p>
                </div>
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/10 rounded-lg px-4 py-2 backdrop-blur-sm hover:bg-white/20 transition-all cursor-pointer">
                <div className="text-right">
                  <p className="text-xs text-gray-400">المتبقي</p>
                  <p className="text-lg font-bold text-yellow-400">
                    {statistics.outstanding_balance.toFixed(2)} ج.م
                  </p>
                </div>
                <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-yellow-400" />
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/10 rounded-lg px-4 py-2 backdrop-blur-sm hover:bg-white/20 transition-all cursor-pointer">
                <div className="text-right">
                  <p className="text-xs text-gray-400">نسبة التحصيل</p>
                  <p className="text-lg font-bold text-blue-400">
                    {statistics.collection_rate.toFixed(1)}%
                  </p>
                </div>
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Target className="w-5 h-5 text-blue-400" />
                </div>
              </div>
            </div>

            {/* الإشعارات والمستخدم */}
            <div className="flex items-center gap-3">
              {/* زر التبديل بين الوضع الليلي والنهاري */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 hover:bg-white/10 rounded-lg transition-all hidden sm:block"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* الإشعارات */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 hover:bg-white/10 rounded-lg transition-all group"
                >
                  <Bell className="w-5 h-5 text-gray-300 group-hover:text-white" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                      {unreadNotifications}
                    </span>
                  )}
                </button>

                {/* قائمة الإشعارات */}
                {showNotifications && (
                  <div className="absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-2xl overflow-hidden z-50">
                    <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-4 py-3 flex items-center justify-between">
                      <h3 className="font-bold">الإشعارات</h3>
                      {unreadNotifications > 0 && (
                        <button
                          onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                          className="text-xs text-gray-300 hover:text-white"
                        >
                          تحديد الكل كمقروء
                        </button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p>لا توجد إشعارات جديدة</p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-all ${
                              !notification.read ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => {
                              setNotifications(prev =>
                                prev.map(n =>
                                  n.id === notification.id ? { ...n, read: true } : n
                                )
                              );
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${
                                notification.type === 'success' ? 'bg-green-100 text-green-600' :
                                notification.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                                notification.type === 'error' ? 'bg-red-100 text-red-600' :
                                'bg-blue-100 text-blue-600'
                              }`}>
                                {notification.type === 'success' && <CheckCircle className="w-4 h-4" />}
                                {notification.type === 'warning' && <AlertTriangle className="w-4 h-4" />}
                                {notification.type === 'error' && <XCircle className="w-4 h-4" />}
                                {notification.type === 'info' && <Info className="w-4 h-4" />}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{notification.title}</p>
                                <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                                {notification.action && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      notification.action?.onClick();
                                      setShowNotifications(false);
                                    }}
                                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                                  >
                                    {notification.action.label}
                                  </button>
                                )}
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(notification.timestamp).toLocaleTimeString('ar-EG')}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* معلومات المستخدم */}
              <div className="flex items-center gap-3 bg-white/10 rounded-lg px-3 py-2 hover:bg-white/20 transition-all cursor-pointer">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium">{user?.email?.split('@')[0]}</p>
                  <p className="text-xs text-gray-400">مدير النظام</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">
                    {user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-6 relative">
        {/* الشريط الجانبي للتنقل السريع */}
        <div className={`fixed lg:static right-0 top-0 h-full lg:h-auto z-50 transition-all duration-300 ${
          showSidebar ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}>
          <div className="bg-white rounded-2xl shadow-2xl p-3 space-y-3 w-64 lg:w-auto">
            <div className="lg:hidden flex justify-end p-2">
              <button
                onClick={() => setShowSidebar(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <button
              onClick={() => {
                setSelectedView("dashboard");
                setShowSidebar(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                selectedView === "dashboard"
                  ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="font-medium">الرئيسية</span>
            </button>

            <button
              onClick={() => {
                setSelectedView("students");
                setShowSidebar(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                selectedView === "students"
                  ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="font-medium">أرصدة الطلاب</span>
            </button>

            <button
              onClick={() => {
                setSelectedView("transactions");
                setShowSidebar(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                selectedView === "transactions"
                  ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <Receipt className="w-5 h-5" />
              <span className="font-medium">سجل العمليات</span>
            </button>

            <div className="border-t my-2"></div>

            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 text-gray-700 transition-all">
              <Settings className="w-5 h-5" />
              <span className="font-medium">الإعدادات</span>
            </button>

            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 text-red-600 transition-all">
              <LogOut className="w-5 h-5" />
              <span className="font-medium">تسجيل الخروج</span>
            </button>
          </div>
        </div>

        {/* المحتوى الرئيسي */}
        <div className="flex-1 space-y-6">
          {/* العنوان والإجراءات السريعة */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-md">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                {selectedView === "dashboard" && <PieChart className="w-6 h-6 text-green-600" />}
                {selectedView === "students" && <Users className="w-6 h-6 text-green-600" />}
                {selectedView === "transactions" && <Receipt className="w-6 h-6 text-green-600" />}
                <span>
                  {selectedView === "dashboard" && "لوحة المعلومات المالية"}
                  {selectedView === "students" && "أرصدة الطلاب"}
                  {selectedView === "transactions" && "سجل العمليات المالية"}
                </span>
              </h2>
              <p className="text-sm text-gray-600">
                {selectedView === "dashboard" && "نظرة شاملة على الأداء المالي للمدرسة"}
                {selectedView === "students" && "إدارة ومتابعة حسابات الطلاب"}
                {selectedView === "transactions" && "جميع العمليات المالية المسجلة"}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {selectedView === "students" && (
                <button
                  onClick={exportToExcel}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg transition-all shadow-md"
                >
                  <DownloadCloud className="w-5 h-5" />
                  <span>تصدير التقرير</span>
                </button>
              )}
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
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-2 flex gap-2 overflow-x-auto">
            <button
              onClick={() => setSelectedView("dashboard")}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                selectedView === "dashboard"
                  ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md"
                  : "hover:bg-gray-100"
              }`}
            >
              <PieChart className="w-4 h-4" />
              <span>لوحة المعلومات</span>
            </button>
            <button
              onClick={() => setSelectedView("students")}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                selectedView === "students"
                  ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md"
                  : "hover:bg-gray-100"
              }`}
            >
              <Users className="w-4 h-4" />
              <span>أرصدة الطلاب</span>
            </button>
            <button
              onClick={() => setSelectedView("transactions")}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                selectedView === "transactions"
                  ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md"
                  : "hover:bg-gray-100"
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>سجل العمليات</span>
            </button>
          </div>

          {selectedView === "dashboard" && (
            <>
              {/* بطاقات الإحصائيات المحسنة */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-md p-6 border-r-4 border-green-600 hover:shadow-lg transition-all transform hover:-translate-y-1">
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
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-green-600">
                      من {statistics.active_students} طالب نشط
                    </p>
                    <p className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                      {statistics.collection_rate.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6 border-r-4 border-blue-600 hover:shadow-lg transition-all transform hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="w-8 h-8 text-blue-600" />
                    <span className="text-xs text-gray-500">المستحق</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {Number(statistics.expected_revenue).toLocaleString("ar-EG", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    ج.م
                  </p>
                  <p className="text-xs text-blue-600 mt-2">المتوقع تحصيله هذا العام</p>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6 border-r-4 border-yellow-600 hover:shadow-lg transition-all transform hover:-translate-y-1">
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
                    ج.م
                  </p>
                  <p className="text-xs text-yellow-600 mt-2">
                    {statistics.unpaid_students} طالب غير مسدد
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6 border-r-4 border-purple-600 hover:shadow-lg transition-all transform hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle className="w-8 h-8 text-purple-600" />
                    <span className="text-xs text-gray-500">حالة الطلاب</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>مسدد بالكامل:</span>
                      <span className="font-medium text-green-600">{statistics.paid_students}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>مسدد جزئياً:</span>
                      <span className="font-medium text-yellow-600">{statistics.partial_paid_students}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>غير مسدد:</span>
                      <span className="font-medium text-red-600">{statistics.unpaid_students}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* مؤشرات الأداء الرئيسية */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 hover:shadow-md transition-all transform hover:-translate-y-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                      <Target className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-blue-600">نسبة التحصيل</p>
                      <p className="text-xl font-bold text-blue-900">{statistics.collection_rate.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 hover:shadow-md transition-all transform hover:-translate-y-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                      <Award className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-green-600">مسدد بالكامل</p>
                      <p className="text-xl font-bold text-green-900">{statistics.paid_students}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 hover:shadow-md transition-all transform hover:-translate-y-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-600 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-yellow-600">مسدد جزئياً</p>
                      <p className="text-xl font-bold text-yellow-900">{statistics.partial_paid_students}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 hover:shadow-md transition-all transform hover:-translate-y-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-red-600">غير مسدد</p>
                      <p className="text-xl font-bold text-red-900">{statistics.unpaid_students}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* بطاقات طرق الدفع */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-md p-4 border-r-4 border-green-600 hover:shadow-lg transition-all">
                  <div className="flex items-center gap-3">
                    <Banknote className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">مدفوعات نقدية</p>
                      <p className="text-lg font-bold text-gray-900">
                        {statistics.cash_payments.toLocaleString("ar-EG", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} ج.م
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-600 rounded-full"
                      style={{ width: `${(statistics.cash_payments / statistics.total_collected) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-4 border-r-4 border-blue-600 hover:shadow-lg transition-all">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-6 h-6 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">مدفوعات بطاقة</p>
                      <p className="text-lg font-bold text-gray-900">
                        {statistics.card_payments.toLocaleString("ar-EG", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} ج.م
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${(statistics.card_payments / statistics.total_collected) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-4 border-r-4 border-purple-600 hover:shadow-lg transition-all">
                  <div className="flex items-center gap-3">
                    <Landmark className="w-6 h-6 text-purple-600" />
                    <div>
                      <p className="text-sm text-gray-600">تحويل بنكي</p>
                      <p className="text-lg font-bold text-gray-900">
                        {statistics.bank_transfer_payments.toLocaleString("ar-EG", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} ج.م
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-600 rounded-full"
                      style={{ width: `${(statistics.bank_transfer_payments / statistics.total_collected) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-4 border-r-4 border-orange-600 hover:shadow-lg transition-all">
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6 text-orange-600" />
                    <div>
                      <p className="text-sm text-gray-600">شيكات</p>
                      <p className="text-lg font-bold text-gray-900">
                        {statistics.check_payments.toLocaleString("ar-EG", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} ج.م
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-orange-600 rounded-full"
                      style={{ width: `${(statistics.check_payments / statistics.total_collected) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* تحصيلات الفترات */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-all">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">تحصيلات اليوم</p>
                      <p className="text-lg font-bold text-gray-900">
                        {statistics.today_collections.toLocaleString("ar-EG", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} ج.م
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-600 rounded-full"
                        style={{ width: `${(statistics.today_collections / statistics.daily_target) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">هدف: {statistics.daily_target} ج.م</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-all">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">تحصيلات الأسبوع</p>
                      <p className="text-lg font-bold text-gray-900">
                        {statistics.this_week_collections.toLocaleString("ar-EG", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} ج.م
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-all">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-sm text-gray-600">تحصيلات الشهر</p>
                      <p className="text-lg font-bold text-gray-900">
                        {statistics.this_month_collections.toLocaleString("ar-EG", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} ج.م
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-purple-600 rounded-full"
                        style={{ width: `${(statistics.this_month_collections / statistics.monthly_target) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">هدف: {statistics.monthly_target} ج.م</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-all">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="text-sm text-gray-600">تحصيلات السنة</p>
                      <p className="text-lg font-bold text-gray-900">
                        {statistics.this_year_collections.toLocaleString("ar-EG", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })} ج.م
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* قائمة الطلاب المميزة مع طريقة آخر دفعة */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-600" />
                  أبرز الأرصدة
                </h3>
                <div className="space-y-3">
                  {studentBalances.slice(0, 5).map((balance) => (
                    <div
                      key={balance.student_id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all cursor-pointer"
                      onClick={() => setSelectedStudent(students.find(s => s.id === balance.student_id) || null)}
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {balance.student_name}
                        </p>
                        <p className="text-sm text-gray-600">{balance.grade}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        {balance.last_payment_method && (
                          <div className="flex items-center gap-1">
                            {getPaymentMethodIcon(balance.last_payment_method)}
                          </div>
                        )}
                        <div className="text-left">
                          <p
                            className={`font-bold ${balance.balance >= 0 ? "text-green-600" : "text-red-600"}`}
                          >
                            {Number(balance.balance).toLocaleString("ar-EG", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{" "}
                            ج.م
                          </p>
                          <p
                            className={`text-xs px-2 py-1 rounded-full ${getStatusColor(balance.status)}`}
                          >
                            {balance.status}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* أحدث العمليات */}
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">أحدث العمليات</h3>
                  <button 
                    onClick={() => setSelectedView("transactions")}
                    className="text-sm text-green-600 hover:text-green-700"
                  >
                    عرض الكل
                  </button>
                </div>
                <div className="space-y-3">
                  {fees.slice(0, 5).map((fee) => {
                    let paymentMethod = 'cash';
                    if (fee.notes) {
                      try {
                        const notes = JSON.parse(fee.notes);
                        paymentMethod = notes.payment_method || 'cash';
                      } catch {}
                    }

                    return (
                      <div key={fee.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${fee.amount > 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                            {fee.amount > 0 ? <ArrowUpCircle className="w-4 h-4 text-green-600" /> : <ArrowDownCircle className="w-4 h-4 text-red-600" />}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{fee.student?.full_name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs text-gray-500">{fee.payment_type}</p>
                              <span className="text-xs px-2 py-0.5 bg-gray-200 rounded-full">
                                {paymentMethod === 'cash' ? '💰 نقدي' :
                                 paymentMethod === 'card' ? '💳 بطاقة' :
                                 paymentMethod === 'bank_transfer' ? '🏦 تحويل' : '📄 شيك'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className={`font-bold ${fee.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {fee.amount > 0 ? '+' : '-'}{Math.abs(fee.amount).toFixed(2)} ج.م
                          </p>
                          <p className="text-xs text-gray-500">{fee.payment_date}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {selectedView === "students" && (
            <>
              {/* بحث وتصفية متقدم */}
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-md p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative md:col-span-2">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="البحث بالاسم، الصف، أو ولي الأمر..."
                      className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <select
                      value={selectedGrade}
                      onChange={(e) => setSelectedGrade(e.target.value)}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    >
                      <option value="all">جميع الصفوف</option>
                      {grades.map(grade => (
                        <option key={grade} value={grade}>{grade}</option>
                      ))}
                    </select>

                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    >
                      <option value="all">جميع الحالات</option>
                      <option value="دائن">دائن</option>
                      <option value="مدين">مدين</option>
                      <option value="متوازن">متوازن</option>
                    </select>
                  </div>
                </div>

                {/* إحصائيات سريعة للفلترة */}
                <div className="flex gap-4 mt-4 text-sm">
                  <span className="text-gray-600">إجمالي النتائج: {filteredBalances.length}</span>
                  <span className="text-green-600">دائن: {filteredBalances.filter(b => b.status === 'دائن').length}</span>
                  <span className="text-red-600">مدين: {filteredBalances.filter(b => b.status === 'مدين').length}</span>
                  <span className="text-gray-600">متوازن: {filteredBalances.filter(b => b.status === 'متوازن').length}</span>
                </div>
              </div>

              {/* قائمة حسابات الطلاب */}
              <div className="grid gap-4">
                {filteredBalances.map((balance) => (
                  <div
                    key={balance.student_id}
                    className="bg-white rounded-xl shadow-md p-6 hover:shadow-2xl transition-all cursor-pointer transform hover:-translate-y-1"
                    onClick={() =>
                      setSelectedStudent(
                        students.find((s) => s.id === balance.student_id) || null,
                      )
                    }
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg font-bold text-gray-900">
                            {balance.student_name}
                          </h3>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(balance.status)}`}
                          >
                            {balance.status}
                          </span>
                          {balance.installments_count > 0 && (
                            <span className="px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-xs font-medium flex items-center gap-1">
                              <Gift className="w-3 h-3" />
                              {balance.installments_count} قسط
                            </span>
                          )}
                          {balance.payment_percentage >= 100 && (
                            <span className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-xs font-medium flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              مسدد بالكامل
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
                          <div className="flex items-center gap-1">
                            <BookOpen className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">الصف:</span>
                            <span className="font-medium text-gray-900">
                              {balance.grade}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600">ولي الأمر:</span>
                            <span className="font-medium text-gray-900">
                              {balance.parent_name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-600">الهاتف:</span>
                            <span
                              className="font-medium text-gray-900"
                              dir="ltr"
                            >
                              {balance.parent_phone}
                            </span>
                          </div>
                          {balance.last_payment_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600">آخر دفعة:</span>
                              <span className="font-medium text-gray-900 flex items-center gap-1">
                                {balance.last_payment_date}
                                {balance.last_payment_method && (
                                  <span className="mr-1">
                                    {getPaymentMethodIcon(balance.last_payment_method)}
                                  </span>
                                )}
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
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const student = students.find(s => s.id === balance.student_id);
                              if (student) {
                                // فتح نافذة تفاصيل الطالب
                              }
                            }}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                            title="التفاصيل"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* شريط تقدم السداد */}
                    <div className="mt-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          تم السداد
                        </span>
                        <span className="font-medium">
                          {balance.payment_percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            balance.payment_percentage >= 100
                              ? "bg-green-600"
                              : balance.payment_percentage >= 50
                              ? "bg-yellow-600"
                              : "bg-red-600"
                          }`}
                          style={{ width: `${Math.min(100, balance.payment_percentage)}%` }}
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

                {filteredBalances.length === 0 && (
                  <div className="bg-white rounded-xl shadow-md p-12 text-center">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-700 mb-2">لا توجد نتائج</h3>
                    <p className="text-gray-500">لم يتم العثور على طلاب مطابقين لمعايير البحث</p>
                  </div>
                )}
              </div>
            </>
          )}

          {selectedView === "transactions" && (
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-green-600" />
                  جميع العمليات المالية
                </h3>
                
                {/* فلتر الفترة */}
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                >
                  <option value="today">اليوم</option>
                  <option value="week">هذا الأسبوع</option>
                  <option value="month">هذا الشهر</option>
                  <option value="year">هذه السنة</option>
                  <option value="all">كل الفترات</option>
                </select>
              </div>

              <div className="space-y-3">
                {fees
                  .filter(fee => {
                    const feeDate = new Date(fee.payment_date);
                    const now = new Date();
                    switch (selectedPeriod) {
                      case "today":
                        return feeDate.toDateString() === now.toDateString();
                      case "week":
                        const weekAgo = new Date(now.setDate(now.getDate() - 7));
                        return feeDate >= weekAgo;
                      case "month":
                        const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
                        return feeDate >= monthAgo;
                      case "year":
                        const yearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
                        return feeDate >= yearAgo;
                      default:
                        return true;
                    }
                  })
                  .map((fee) => {
                    let paymentMethod = 'cash';
                    if (fee.notes) {
                      try {
                        const notes = JSON.parse(fee.notes);
                        paymentMethod = notes.payment_method || 'cash';
                      } catch {}
                    }

                    return (
                      <div
                        key={fee.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all group"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`p-3 rounded-xl ${
                            fee.amount > 0 
                              ? 'bg-green-100 group-hover:bg-green-200' 
                              : 'bg-red-100 group-hover:bg-red-200'
                          } transition-all`}>
                            {fee.amount > 0 ? (
                              <ArrowUpCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <ArrowDownCircle className="w-5 h-5 text-red-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-gray-900">
                                {fee.student?.full_name}
                              </p>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                paymentMethod === 'cash' ? 'bg-green-100 text-green-600' :
                                paymentMethod === 'card' ? 'bg-blue-100 text-blue-600' :
                                paymentMethod === 'bank_transfer' ? 'bg-purple-100 text-purple-600' :
                                'bg-orange-100 text-orange-600'
                              }`}>
                                {paymentMethod === 'cash' ? '💰 نقدي' :
                                 paymentMethod === 'card' ? '💳 بطاقة' :
                                 paymentMethod === 'bank_transfer' ? '🏦 تحويل' : '📄 شيك'}
                              </span>
                              {fee.payment_type === "غرامة تأخير" && (
                                <span className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded-full">
                                  ⚠️ غرامة
                                </span>
                              )}
                              {fee.payment_type === "خصم" && (
                                <span className="text-xs px-2 py-1 bg-purple-100 text-purple-600 rounded-full">
                                  🎁 خصم
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <p className="text-sm text-gray-600">{fee.payment_type}</p>
                              <span className="text-xs text-gray-400">•</span>
                              <p className="text-xs text-gray-500">{fee.payment_date}</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-left flex items-center gap-4">
                          <div>
                            <p
                              className={`font-bold text-lg ${fee.amount >= 0 ? "text-green-600" : "text-red-600"}`}
                            >
                              {fee.amount >= 0 ? "+" : "-"}
                              {Number(Math.abs(fee.amount)).toLocaleString("ar-EG", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              ج.م
                            </p>
                            <p className="text-xs text-gray-500">{fee.academic_year}</p>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEdit(fee)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="تعديل"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(fee.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {fees.length === 0 && (
                  <div className="text-center py-12">
                    <Receipt className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-700 mb-2">لا توجد عمليات</h3>
                    <p className="text-gray-500 mb-4">لم يتم تسجيل أي عمليات مالية بعد</p>
                    <button
                      onClick={() => setShowForm(true)}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all"
                    >
                      <Plus className="w-5 h-5" />
                      <span>إضافة أول عملية</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* نموذج إضافة/تعديل العملية المالية المحسن */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slideUp">
            <div className="sticky top-0 bg-gradient-to-r from-gray-900 to-gray-800 text-white px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h3 className="text-xl font-bold flex items-center gap-2">
                {editingFee ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                {editingFee ? "تعديل العملية" : "عملية مالية جديدة"}
              </h3>
              <button
                onClick={resetForm}
                className="text-gray-300 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
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
                        transaction_type: e.target.value as any,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  >
                    <option value="deposit">💰 إيداع / سداد</option>
                    <option value="refund">↩️ استرداد</option>
                    <option value="discount">🎁 خصم</option>
                    <option value="late_fee">⚠️ غرامة تأخير</option>
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
                    طريقة الدفع
                  </label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        payment_method: e.target.value as any,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  >
                    {paymentMethods.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
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

                {/* حقل الخصم */}
                {formData.transaction_type === "discount" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        نسبة الخصم (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={formData.discount_percentage}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            discount_percentage: parseFloat(e.target.value),
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        سبب الخصم
                      </label>
                      <input
                        type="text"
                        value={formData.discount_reason}
                        onChange={(e) =>
                          setFormData({ ...formData, discount_reason: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                        placeholder="أدخل سبب الخصم"
                      />
                    </div>
                  </>
                )}

                {/* حقل غرامة التأخير */}
                {formData.transaction_type === "late_fee" && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      سبب غرامة التأخير
                    </label>
                    <input
                      type="text"
                      value={formData.late_fee_reason}
                      onChange={(e) =>
                        setFormData({ ...formData, late_fee_reason: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      placeholder="أدخل سبب غرامة التأخير"
                    />
                  </div>
                )}

                {/* خيار الأقساط */}
                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_installment}
                      onChange={(e) =>
                        setFormData({ ...formData, is_installment: e.target.checked })
                      }
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      دفع على أقساط
                    </span>
                  </label>
                </div>

                {formData.is_installment && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        رقم القسط
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.installment_number}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            installment_number: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        إجمالي الأقساط
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.total_installments}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            total_installments: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                      />
                    </div>
                  </>
                )}

                <div className="md:col-span-2">
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

                <div className="md:col-span-2">
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
              </div>

              {/* ملخص العملية */}
              {formData.amount && parseFloat(formData.amount) > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg">
                  <h4 className="font-bold text-gray-900 mb-3">ملخص العملية</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">المبلغ الأساسي:</span>
                      <span className="font-medium">
                        {parseFloat(formData.amount).toFixed(2)} ج.م
                      </span>
                    </div>
                    {formData.discount_percentage > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>الخصم ({formData.discount_percentage}%):</span>
                        <span className="font-medium">
                          -{(parseFloat(formData.amount) * formData.discount_percentage / 100).toFixed(2)} ج.م
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-bold border-t pt-2 mt-2">
                      <span>المبلغ النهائي:</span>
                      <span className="text-green-600">
                        {(parseFloat(formData.amount) * (1 - formData.discount_percentage / 100)).toFixed(2)} ج.م
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  بعد إتمام العملية سيتم تحديث رصيد الطالب تلقائياً وسيتم إنشاء إيصال إلكتروني
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 px-4 rounded-lg transition-all font-medium"
                >
                  {editingFee ? "حفظ التعديلات" : "تنفيذ العملية"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-4 rounded-lg transition-all font-medium"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة عرض الإيصال */}
      {showReceiptModal && currentReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full animate-slideUp">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">تمت العملية بنجاح</h3>
                <p className="text-gray-600 mt-1">رقم الإيصال: {currentReceipt.receipt_number}</p>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 mb-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                    <span className="text-gray-600">الطالب:</span>
                    <span className="font-bold text-gray-900">{currentReceipt.student_name}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                    <span className="text-gray-600">الصف:</span>
                    <span className="font-medium">{currentReceipt.grade}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                    <span className="text-gray-600">المبلغ:</span>
                    <span className="font-bold text-2xl text-green-600">
                      {currentReceipt.amount.toFixed(2)} ج.م
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-gray-200">
                    <span className="text-gray-600">التاريخ:</span>
                    <span>{new Date(currentReceipt.payment_date).toLocaleDateString('ar-EG')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">طريقة الدفع:</span>
                    <span className="flex items-center gap-2 font-medium">
                      {currentReceipt.payment_method === 'cash' && <Banknote className="w-5 h-5 text-green-600" />}
                      {currentReceipt.payment_method === 'card' && <CreditCard className="w-5 h-5 text-blue-600" />}
                      {currentReceipt.payment_method === 'bank_transfer' && <Landmark className="w-5 h-5 text-purple-600" />}
                      {currentReceipt.payment_method === 'check' && <FileText className="w-5 h-5 text-orange-600" />}
                      <span>
                        {currentReceipt.payment_method === 'cash' ? 'نقدي' :
                         currentReceipt.payment_method === 'card' ? 'بطاقة' :
                         currentReceipt.payment_method === 'bank_transfer' ? 'تحويل بنكي' : 'شيك'}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={printReceipt}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 font-medium"
                >
                  <Printer className="w-5 h-5" />
                  <span>طباعة الإيصال</span>
                </button>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-4 rounded-lg transition-all font-medium"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}