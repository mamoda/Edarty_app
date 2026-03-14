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
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Fee, Student } from "../types/database";
import { useSchoolData } from "../hooks/useSchoolData";


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
  total_refunded: number;
  net_paid: number;
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

export default function FeesManager({ onUpdate }: FeesManagerProps) {
  const { user } = useAuth();
  const { schoolName, schoolEmail, schoolAddress, schoolPhone, schoolTaxNumber } = useSchoolData();

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

  // البيانات
  const [fees, setFees] = useState<Fee[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentBalances, setStudentBalances] = useState<StudentBalance[]>([]);
  const [studentTransactions, setStudentTransactions] = useState<Transaction[]>([]);
  const [currentReceipt, setCurrentReceipt] = useState<any>(null);

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
    { value: "cash", label: "نقدي", icon: Banknote },
    { value: "card", label: "بطاقة ائتمان", icon: CreditCard },
    { value: "bank_transfer", label: "تحويل بنكي", icon: Landmark },
    { value: "check", label: "شيك", icon: FileText },
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
    } finally {
      setLoading(false);
    }
  };

  const calculateStatistics = (feesData: Fee[], studentsData: Student[]) => {
    // إجمالي التحصيل = المدفوعات - الاستردادات
    const total_payments = feesData
      .filter(f => f.amount > 0)
      .reduce((sum, fee) => sum + fee.amount, 0);
    
    const total_refunds = feesData
      .filter(f => f.amount < 0)
      .reduce((sum, fee) => sum + Math.abs(fee.amount), 0);
    
    const total_collected = total_payments - total_refunds;
    
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
      const total_paid = studentFees
        .filter(f => f.amount > 0)
        .reduce((sum, f) => sum + f.amount, 0);
      const total_refunded = studentFees
        .filter(f => f.amount < 0)
        .reduce((sum, f) => sum + Math.abs(f.amount), 0);
      const net_paid = total_paid - total_refunded;
      
      if (net_paid >= 3000) {
        paid_students++;
      } else if (net_paid > 0) {
        partial_paid_students++;
      } else {
        unpaid_students++;
      }
    });

    // حساب تحصيلات اليوم (صافي)
    const today = new Date().toISOString().split('T')[0];
    const today_payments = feesData
      .filter(f => f.payment_date === today && f.amount > 0)
      .reduce((sum, f) => sum + f.amount, 0);
    const today_refunds = feesData
      .filter(f => f.payment_date === today && f.amount < 0)
      .reduce((sum, f) => sum + Math.abs(f.amount), 0);
    const today_collections = today_payments - today_refunds;

    // حساب تحصيلات هذا الأسبوع (صافي)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const week_payments = feesData
      .filter(f => new Date(f.payment_date) >= oneWeekAgo && f.amount > 0)
      .reduce((sum, f) => sum + f.amount, 0);
    const week_refunds = feesData
      .filter(f => new Date(f.payment_date) >= oneWeekAgo && f.amount < 0)
      .reduce((sum, f) => sum + Math.abs(f.amount), 0);
    const this_week_collections = week_payments - week_refunds;

    // حساب تحصيلات هذا الشهر (صافي)
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const month_payments = feesData
      .filter(f => new Date(f.payment_date) >= oneMonthAgo && f.amount > 0)
      .reduce((sum, f) => sum + f.amount, 0);
    const month_refunds = feesData
      .filter(f => new Date(f.payment_date) >= oneMonthAgo && f.amount < 0)
      .reduce((sum, f) => sum + Math.abs(f.amount), 0);
    const this_month_collections = month_payments - month_refunds;

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
    }));
  };

  const calculatePaymentMethodStats = () => {
    let cash = 0, card = 0, bank = 0, check = 0;

    fees.forEach(fee => {
      // نأخذ القيمة المطلقة للمبلغ لأننا نريد إجمالي المبالغ بغض النظر عن الإشارة
      const amount = Math.abs(fee.amount);
      
      if (fee.notes) {
        try {
          const notes = JSON.parse(fee.notes);
          const method = notes.payment_method;
          if (method === 'cash') cash += amount;
          else if (method === 'card') card += amount;
          else if (method === 'bank_transfer') bank += amount;
          else if (method === 'check') check += amount;
        } catch {
          // إذا لم يتم العثور على method، نفترض أنها cash
          cash += amount;
        }
      } else {
        cash += amount;
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
      
      // حساب إجمالي المدفوعات (العمليات الموجبة فقط)
      const total_paid = studentFees
        .filter(f => f.amount > 0)
        .reduce((sum, fee) => sum + fee.amount, 0);
      
      // حساب إجمالي الاستردادات والخصومات (العمليات السالبة)
      const total_refunded = studentFees
        .filter(f => f.amount < 0)
        .reduce((sum, fee) => sum + Math.abs(fee.amount), 0);

      // صافي المدفوعات = المدفوعات - الاستردادات
      const net_paid = total_paid - total_refunded;

      const installments_count = studentFees
        .filter(f => f.payment_type === "قسط شهري")
        .length;

      // الرصيد = صافي المدفوعات - إجمالي المستحق
      const balance = net_paid - totalRequired;
      
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
        total_refunded,
        net_paid,
        total_required: totalRequired,
        balance,
        last_payment_date: last_payment?.payment_date || null,
        last_payment_method,
        status,
        payment_percentage: totalRequired > 0 ? (net_paid / totalRequired) * 100 : 0,
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
      alert("الرجاء تسجيل الدخول أولاً");
      return;
    }

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
      // التحقق من رصيد الطالب في حالة الاسترداد
      if (formData.transaction_type === "refund") {
        const studentBalance = studentBalances.find(
          b => b.student_id === formData.student_id
        );
        
        if (!studentBalance) {
          alert("لم يتم العثور على بيانات الطالب");
          return;
        }

        if (amount > studentBalance.net_paid) {
          alert(`لا يمكن استرداد مبلغ أكبر من صافي المدفوعات (${studentBalance.net_paid.toFixed(2)} ج.م)`);
          return;
        }

        if (!confirm(`هل أنت متأكد من استرداد مبلغ ${amount.toFixed(2)} ج.م؟`)) {
          return;
        }
      }

      let finalAmount = amount;
      let transactionDescription = "";
      
      // تحديد المبلغ النهائي ووصف العملية حسب نوعها
      switch (formData.transaction_type) {
        case "refund":
          finalAmount = -amount;
          transactionDescription = "استرداد مبلغ";
          break;
        case "discount":
          finalAmount = -amount;
          transactionDescription = "خصم";
          break;
        case "late_fee":
          finalAmount = amount;
          transactionDescription = "غرامة تأخير";
          break;
        default: // deposit
          finalAmount = amount;
          transactionDescription = "دفع";
      }

      // تطبيق الخصم إذا وجد (لعملية الدفع فقط)
      if (formData.discount_percentage > 0 && formData.transaction_type === "deposit") {
        finalAmount = finalAmount * (1 - formData.discount_percentage / 100);
      }

      // إنشاء رقم إيصال فريد
      const receiptNumber = formData.receipt_number || generateReceiptNumber();

      // تخزين معلومات إضافية في حقل notes
      const notesData: any = {
        text: formData.notes,
        payment_method: formData.payment_method,
        receipt_number: receiptNumber,
        discount_percentage: formData.discount_percentage,
        discount_reason: formData.discount_reason,
        late_fee_reason: formData.late_fee_reason,
        is_installment: formData.is_installment,
        installment_number: formData.installment_number,
        total_installments: formData.total_installments,
        transaction_type: formData.transaction_type,
        original_amount: amount,
        timestamp: new Date().toISOString(),
      };

      // إضافة سبب الاسترداد إذا كان موجوداً
      if (formData.transaction_type === "refund" && formData.notes) {
        notesData.refund_reason = formData.notes;
      }

      const feeData = {
        student_id: formData.student_id,
        amount: finalAmount,
        payment_type: formData.transaction_type === "refund" ? "استرداد مبلغ" : formData.payment_type,
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
      } else {
        const { error } = await supabase.from("fees").insert([feeData]);
        if (error) throw error;
      }

      resetForm();
      await loadData();
      onUpdate();

      // عرض الإيصال المناسب حسب نوع العملية
      if (formData.transaction_type === "refund") {
        showRefundReceipt(formData, finalAmount, receiptNumber);
      } else if (formData.transaction_type === "deposit") {
        showPaymentReceipt(formData, finalAmount, receiptNumber);
      }

      alert(editingFee ? "تم تحديث العملية بنجاح" : "تم إضافة العملية بنجاح");
    } catch (error: any) {
      console.error("Error saving fee:", error);
      alert(error.message || "حدث خطأ أثناء حفظ البيانات");
    }
  };

  // دالة عرض إيصال الدفع
  const showPaymentReceipt = (data: typeof formData, finalAmount: number, receiptNumber: string) => {
    const student = students.find(s => s.id === data.student_id);
    if (!student) return;

    const receipt = {
      receipt_number: receiptNumber,
      student_name: student.full_name,
      grade: student.grade,
      amount: finalAmount,
      payment_date: data.payment_date,
      payment_method: data.payment_method,
      payment_type: data.payment_type,
      school_name: schoolName,
      school_email: schoolEmail,
      school_address: schoolAddress,
      school_phone: schoolPhone,
      school_tax: schoolTaxNumber,
    };

    setCurrentReceipt(receipt);
    setShowReceiptModal(true);
  };

  // دالة عرض إيصال الاسترداد
  const showRefundReceipt = (data: typeof formData, finalAmount: number, receiptNumber: string) => {
    const student = students.find(s => s.id === data.student_id);
    if (!student) return;

    const receipt = {
      receipt_number: receiptNumber,
      student_name: student.full_name,
      grade: student.grade,
      amount: Math.abs(finalAmount),
      refund_amount: Math.abs(finalAmount),
      payment_date: data.payment_date,
      payment_method: data.payment_method,
      refund_reason: data.notes || "استرداد مبلغ",
      original_payment_type: data.payment_type,
      is_refund: true,
      school_name: schoolName,
      school_email: schoolEmail,
      school_address: schoolAddress,
      school_phone: schoolPhone,
      school_tax: schoolTaxNumber,
    };

    setCurrentReceipt(receipt);
    setShowReceiptModal(true);
  };

  // دالة طباعة الإيصال المحسنة
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

    const isRefund = currentReceipt.is_refund === true;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${isRefund ? 'إيصال استرداد' : 'إيصال دفع'} - ${currentReceipt.student_name}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body { 
            font-family: 'Cairo', sans-serif; 
            background: #f3f4f6; 
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }
          
          .receipt { 
            max-width: 400px; 
            width: 100%;
            margin: 0 auto; 
            background: white; 
            border-radius: 20px; 
            padding: 30px; 
            box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
            border: 1px solid rgba(0,0,0,0.05);
          }
          
          .header { 
            text-align: center; 
            margin-bottom: 20px; 
            border-bottom: 2px dashed #e5e7eb; 
            padding-bottom: 20px; 
          }
          
          .school-name { 
            font-size: 28px; 
            font-weight: 800; 
            background: ${isRefund ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : 'linear-gradient(135deg, #059669, #047857)'};
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 5px;
          }
          
          .school-info {
            font-size: 12px;
            color: #6b7280;
            margin-top: 5px;
            line-height: 1.6;
          }
          
          .school-info div {
            margin: 2px 0;
          }
          
          .receipt-title { 
            font-size: 18px; 
            color: #6b7280; 
            margin-top: 5px;
            font-weight: 600;
          }
          
          .receipt-number { 
            background: ${isRefund ? '#fef2f2' : '#f0fdf4'}; 
            padding: 15px; 
            border-radius: 12px; 
            text-align: center; 
            margin-bottom: 20px;
            border: 1px solid ${isRefund ? '#fee2e2' : '#dcfce7'};
          }
          
          .receipt-number .label { 
            font-size: 12px; 
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .receipt-number .value { 
            font-size: 20px; 
            font-weight: 800; 
            ${isRefund ? 'color: #dc2626;' : 'color: #059669;'}
            font-family: monospace;
            letter-spacing: 1px;
          }
          
          .details { 
            margin-bottom: 20px; 
            background: #f9fafb;
            padding: 15px;
            border-radius: 12px;
          }
          
          .detail-row { 
            display: flex; 
            justify-content: space-between; 
            padding: 10px 0; 
            border-bottom: 1px solid #f3f4f6; 
          }
          
          .detail-row:last-child {
            border-bottom: none;
          }
          
          .detail-label { 
            color: #6b7280; 
            font-weight: 500;
          }
          
          .detail-value { 
            font-weight: 700; 
            color: #1f2937; 
          }
          
          .amount-section { 
            background: ${isRefund ? 'linear-gradient(135deg, #fef2f2, #fee2e2)' : 'linear-gradient(135deg, #f0fdf4, #dcfce7)'}; 
            padding: 20px; 
            border-radius: 12px; 
            text-align: center; 
            margin: 20px 0;
            border: 1px solid ${isRefund ? '#fecaca' : '#bbf7d0'};
          }
          
          .amount-section .label { 
            font-size: 14px; 
            ${isRefund ? 'color: #991b1b;' : 'color: #166534;'}
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .amount-section .value { 
            font-size: 42px; 
            font-weight: 800; 
            ${isRefund ? 'color: #dc2626;' : 'color: #059669;'}
            line-height: 1.2;
          }
          
          .amount-section .currency {
            font-size: 16px;
            ${isRefund ? 'color: #991b1b;' : 'color: #166534;'}
            margin-right: 5px;
          }
          
          .refund-reason { 
            background: #f3f4f6; 
            padding: 15px; 
            border-radius: 8px; 
            margin: 15px 0; 
            font-size: 14px; 
            text-align: center;
            border-right: 4px solid #dc2626;
          }
          
          .footer { 
            text-align: center; 
            margin-top: 20px; 
            padding-top: 20px; 
            border-top: 2px dashed #e5e7eb; 
            font-size: 11px; 
            color: #9ca3af;
          }
          
          .footer .school-signature {
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid #e5e7eb;
            font-weight: 600;
            color: ${isRefund ? '#dc2626' : '#059669'};
          }
          
          .watermark {
            position: relative;
            opacity: 0.1;
            font-size: 80px;
            font-weight: 900;
            color: ${isRefund ? '#dc2626' : '#059669'};
            text-align: center;
            margin-top: -30px;
            margin-bottom: -40px;
            pointer-events: none;
            user-select: none;
          }
          
          @media print {
            body { background: white; padding: 0; }
            .receipt { box-shadow: none; border: 1px solid #e5e7eb; }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="watermark">
            ${isRefund ? 'REFUND' : 'PAID'}
          </div>
          
          <div class="header">
            <div class="school-name">${currentReceipt.school_name || schoolName}</div>
            <div class="school-info">
              <div>📧 ${currentReceipt.school_email || schoolEmail}</div>
              ${currentReceipt.school_phone ? `<div>📞 ${currentReceipt.school_phone}</div>` : ''}
              ${currentReceipt.school_address ? `<div>📍 ${currentReceipt.school_address}</div>` : ''}
              ${currentReceipt.school_tax ? `<div>🧾 الرقم الضريبي: ${currentReceipt.school_tax}</div>` : ''}
            </div>
            <div class="receipt-title">${isRefund ? '📄 إيصال استرداد مبلغ' : '💰 إيصال دفع المصاريف الدراسية'}</div>
          </div>
          
          <div class="receipt-number">
            <div class="label">رقم الإيصال</div>
            <div class="value">${currentReceipt.receipt_number}</div>
          </div>

          <div class="details">
            <div class="detail-row">
              <span class="detail-label">👤 اسم الطالب:</span>
              <span class="detail-value">${currentReceipt.student_name}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">📚 الصف الدراسي:</span>
              <span class="detail-value">${currentReceipt.grade}</span>
            </div>
            ${!isRefund ? `
            <div class="detail-row">
              <span class="detail-label">🏷️ نوع الدفعة:</span>
              <span class="detail-value">${currentReceipt.payment_type}</span>
            </div>
            ` : ''}
            <div class="detail-row">
              <span class="detail-label">📅 تاريخ ${isRefund ? 'الاسترداد' : 'الدفع'}:</span>
              <span class="detail-value">${formatDate(currentReceipt.payment_date)}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">💳 طريقة ${isRefund ? 'الاسترداد' : 'الدفع'}:</span>
              <span class="detail-value">${paymentMethodLabel}</span>
            </div>
          </div>

          ${isRefund && currentReceipt.refund_reason ? `
          <div class="refund-reason">
            <strong>سبب الاسترداد:</strong><br>
            ${currentReceipt.refund_reason}
          </div>
          ` : ''}

          <div class="amount-section">
            <div class="label">${isRefund ? 'المبلغ المسترد' : 'المبلغ المدفوع'}</div>
            <div>
              <span class="value">${currentReceipt.amount.toFixed(2)}</span>
              <span class="currency">ج.م</span>
            </div>
          </div>

          <div class="footer">
            <p>${isRefund ? 'هذا الإيصال يثبت عملية استرداد مبلغ للطالب' : 'هذا الإيصال معتمد إلكترونياً ويعتبر بمثابة سداد رسمي'}</p>
            <p style="margin-top: 5px;">نظام إدارتي - إدارة المصاريف الدراسية</p>
            <div class="school-signature">
              ${currentReceipt.school_name || schoolName}
            </div>
          </div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
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
          .bank-name { font-size: 28px; font-weight: bold; color: #059669; }
          .branch-name { font-size: 16px; color: #6b7280; }
          .account-info { background: #f0fdf4; padding: 20px; border-radius: 12px; margin-bottom: 30px; }
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
            <div class="bank-name">${schoolName}</div>
            <div class="branch-name">نظام إدارة المصاريف الدراسية</div>
            <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">
              📧 ${schoolEmail} | 📞 ${schoolPhone || 'رقم الهاتف غير محدد'}
            </div>
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
              <div class="balance-label">إجمالي المسترد</div>
              <div class="balance-value">${balances?.total_refunded.toFixed(2)} ج.م</div>
            </div>
            <div class="balance-card">
              <div class="balance-label">صافي المدفوعات</div>
              <div class="balance-value">${balances?.net_paid.toFixed(2)} ج.م</div>
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
            <div class="balance-card">
              <div class="balance-label">نسبة السداد</div>
              <div class="balance-value">${balances?.payment_percentage.toFixed(1)}%</div>
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

  const getPaymentMethodIcon = (method?: string) => {
    switch (method) {
      case 'cash': return <Banknote className="w-4 h-4 text-green-600" />;
      case 'card': return <CreditCard className="w-4 h-4 text-blue-600" />;
      case 'bank_transfer': return <Landmark className="w-4 h-4 text-purple-600" />;
      case 'check': return <FileText className="w-4 h-4 text-orange-600" />;
      default: return null;
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
        <div className="flex gap-2 flex-wrap">
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
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
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
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
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
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
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
          {/* بطاقات الإحصائيات المحسنة */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-md p-6 border-r-4 border-green-600">
              <div className="flex items-center justify-between mb-2">
                <Wallet className="w-8 h-8 text-green-600" />
                <span className="text-xs text-gray-500">صافي التحصيل</span>
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
                ج.م
              </p>
              <p className="text-xs text-blue-600 mt-2">المتوقع تحصيله</p>
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
                ج.م
              </p>
              <p className="text-xs text-yellow-600 mt-2">
                {statistics.unpaid_students} طالب غير مسدد
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-r-4 border-purple-600">
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

          {/* بطاقات طرق الدفع */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-md p-4 border-r-4 border-green-600">
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
            </div>

            <div className="bg-white rounded-xl shadow-md p-4 border-r-4 border-blue-600">
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
            </div>

            <div className="bg-white rounded-xl shadow-md p-4 border-r-4 border-purple-600">
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
            </div>

            <div className="bg-white rounded-xl shadow-md p-4 border-r-4 border-orange-600">
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
            </div>
          </div>

          {/* تحصيلات اليوم والأسبوع */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">صافي تحصيلات اليوم</p>
                  <p className="text-lg font-bold text-gray-900">
                    {statistics.today_collections.toLocaleString("ar-EG", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} ج.م
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">صافي تحصيلات الأسبوع</p>
                  <p className="text-lg font-bold text-gray-900">
                    {statistics.this_week_collections.toLocaleString("ar-EG", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} ج.م
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">صافي تحصيلات الشهر</p>
                  <p className="text-lg font-bold text-gray-900">
                    {statistics.this_month_collections.toLocaleString("ar-EG", {
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
                      {balance.installments_count > 0 && (
                        <span className="px-3 py-1 bg-purple-100 text-purple-600 rounded-full text-xs font-medium">
                          {balance.installments_count} قسط
                        </span>
                      )}
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
                          <span className="font-medium text-gray-900 mr-2 flex items-center gap-1">
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
                    </div>
                  </div>
                </div>

                {/* شريط تقدم السداد */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">تم السداد</span>
                    <span className="font-medium">
                      {balance.payment_percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
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
                      {Number(balance.net_paid).toLocaleString("ar-EG", {
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
            {fees.map((fee) => {
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
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all"
                >
                  <div className="flex items-center gap-3">
                    {fee.amount > 0 ? (
                      <ArrowUpCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <ArrowDownCircle className="w-6 h-6 text-red-600" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">
                          {fee.student?.full_name}
                        </p>
                        <span className="text-xs px-2 py-1 bg-gray-200 rounded-full">
                          {paymentMethod === 'cash' ? '💰 نقدي' :
                           paymentMethod === 'card' ? '💳 بطاقة' :
                           paymentMethod === 'bank_transfer' ? '🏦 تحويل' : '📄 شيك'}
                        </span>
                      </div>
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
                      ج.م
                    </p>
                    <p className="text-xs text-gray-500">{fee.academic_year}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* نموذج إضافة/تعديل العملية المالية المحسن */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                    <option value="deposit">إيداع / سداد</option>
                    <option value="refund">استرداد</option>
                    <option value="discount">خصم</option>
                    <option value="late_fee">غرامة تأخير</option>
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
                  <label className="flex items-center gap-2">
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

      {/* نافذة عرض الإيصال */}
      {showReceiptModal && currentReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">تمت العملية بنجاح</h3>
                <p className="text-gray-600 mt-1">رقم الإيصال: {currentReceipt.receipt_number}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">الطالب:</span>
                    <span className="font-medium">{currentReceipt.student_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">الصف:</span>
                    <span className="font-medium">{currentReceipt.grade}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">المبلغ:</span>
                    <span className="font-bold text-xl text-green-600">
                      {currentReceipt.amount.toFixed(2)} ج.م
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">التاريخ:</span>
                    <span>{new Date(currentReceipt.payment_date).toLocaleDateString('ar-EG')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">طريقة الدفع:</span>
                    <span className="flex items-center gap-1">
                      {currentReceipt.payment_method === 'cash' && <Banknote className="w-4 h-4 text-green-600" />}
                      {currentReceipt.payment_method === 'card' && <CreditCard className="w-4 h-4 text-blue-600" />}
                      {currentReceipt.payment_method === 'bank_transfer' && <Landmark className="w-4 h-4 text-purple-600" />}
                      {currentReceipt.payment_method === 'check' && <FileText className="w-4 h-4 text-orange-600" />}
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
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Printer className="w-5 h-5" />
                  <span>طباعة الإيصال</span>
                </button>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-4 rounded-lg transition-all"
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