import { useState, useEffect } from "react";
import {
  Users,
  DollarSign,
  TrendingDown,
  TrendingUp,
  LogOut,
  UserPlus,
  Receipt,
  FileText,
  BarChart3,
  Briefcase,
  Crown,
  MessageCircle,
  Headphones,
  Send,
  X,
  Menu,
  Bell,
  Settings,
  Home,
  PieChart,
  Wallet,
  CreditCard,
  Calendar,
  Clock,
  Award,
  Target,
  CheckCircle,
  AlertTriangle,
  Info,
  BookOpen,
  GraduationCap,
  Gift,
  Sun,
  Moon,
  RefreshCw,
  Download,
  Printer,
  Filter,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { Statistics } from "../types/database";
import StudentsManager from "./StudentsManager";
import FeesManager from "./FeesManager";
import ExpensesManager from "./ExpensesManager";
import TeachersManager from "./TeachersManager";
import ProfitReport from "./ProfitReport";
import FinancialReports from "./FinancialReports";
import logo from "../assets/logo.png";

type View =
  | "dashboard"
  | "students"
  | "teachers"
  | "fees"
  | "expenses"
  | "reports"
  | "financial";

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

interface Activity {
  id: string;
  type: 'fee' | 'expense';
  description: string;
  amount: number;
  date: string;
  icon: any;
  color: string;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [darkMode, setDarkMode] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      text: "مرحباً! كيف يمكنني مساعدتك اليوم؟",
      time: new Date().toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);

  const [stats, setStats] = useState<Statistics>({
    totalStudents: 0,
    activeStudents: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalTeachers: 0,
    activeTeachers: 0,
    totalSalaries: 0,
  });

  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "success",
      title: "مرحباً بك في إدارتي",
      message: "نظام إدارة متكامل لمؤسستك التعليمية",
      timestamp: new Date(),
      read: false,
    },
  ]);

  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);

  useEffect(() => {
    loadStatistics();
    loadRecentActivities();
  }, []);

  // دالة آمنة لتنسيق الأرقام
  const formatNumber = (num: number | undefined | null): string => {
    if (num === undefined || num === null) return "0.00";
    return num.toLocaleString("ar-EG", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // قيم آمنة مع قيم افتراضية
  const safeStats = {
    totalRevenue: stats.totalRevenue || 0,
    totalExpenses: stats.totalExpenses || 0,
    netProfit: stats.netProfit || 0,
    totalStudents: stats.totalStudents || 0,
    activeStudents: stats.activeStudents || 0,
    totalTeachers: stats.totalTeachers || 0,
    activeTeachers: stats.activeTeachers || 0,
    totalSalaries: stats.totalSalaries || 0,
  };

  // حساب نسبة الربح بأمان
  const profitPercentage = safeStats.totalRevenue > 0 
    ? (safeStats.netProfit / safeStats.totalRevenue) * 100 
    : 0;

  const loadStatistics = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [studentsRes, feesRes, expensesRes, teachersRes] =
        await Promise.all([
          supabase
            .from("students")
            .select("*", { count: "exact" })
            .eq("user_id", user.id),
          supabase.from("fees").select("amount").eq("user_id", user.id),
          supabase.from("expenses").select("amount").eq("user_id", user.id),
          supabase.from("teachers").select("*").eq("user_id", user.id),
        ]);

      const totalStudents = studentsRes.count || 0;
      const activeStudents =
        studentsRes.data?.filter((s) => s.status === "active").length || 0;
      const totalRevenue =
        feesRes.data?.reduce((sum, fee) => sum + Number(fee.amount), 0) || 0;
      const totalExpenses =
        expensesRes.data?.reduce((sum, exp) => sum + Number(exp.amount), 0) ||
        0;
      const totalTeachers = teachersRes.data?.length || 0;
      const activeTeachers =
        teachersRes.data?.filter((t) => t.status === "active").length || 0;
      const totalSalaries =
        teachersRes.data
          ?.filter((t) => t.status === "active")
          .reduce((sum, t) => sum + Number(t.salary), 0) || 0;

      setStats({
        totalStudents,
        activeStudents,
        totalRevenue,
        totalExpenses,
        netProfit: totalRevenue - totalExpenses,
        totalTeachers,
        activeTeachers,
        totalSalaries,
      });

      // إضافة إشعار عند تحميل البيانات
      if (totalStudents > 0) {
        addNotification({
          type: 'info',
          title: 'مرحباً بعودتك',
          message: `لديك ${totalStudents} طالب و ${totalTeachers} معلم في النظام`,
        });
      }
    } catch (error) {
      console.error("Error loading statistics:", error);
      addNotification({
        type: 'error',
        title: 'خطأ في التحميل',
        message: 'حدث خطأ أثناء تحميل البيانات',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivities = async () => {
    if (!user) return;

    try {
      const [recentFees, recentExpenses] = await Promise.all([
        supabase
          .from("fees")
          .select("*, student:students(full_name)")
          .eq("user_id", user.id)
          .order("payment_date", { ascending: false })
          .limit(5),
        supabase
          .from("expenses")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .limit(5),
      ]);

      const activities: Activity[] = [
        ...(recentFees.data?.map(fee => ({
          id: fee.id,
          type: 'fee' as const,
          description: `دفعة جديدة من ${(fee.student as any)?.full_name || 'طالب'}`,
          amount: fee.amount,
          date: fee.payment_date,
          icon: DollarSign,
          color: 'green'
        })) || []),
        ...(recentExpenses.data?.map(exp => ({
          id: exp.id,
          type: 'expense' as const,
          description: exp.description,
          amount: -exp.amount,
          date: exp.date,
          icon: TrendingDown,
          color: 'red'
        })) || [])
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
       .slice(0, 5);

      setRecentActivities(activities);
    } catch (error) {
      console.error("Error loading activities:", error);
    }
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false,
      ...notification
    };
    setNotifications(prev => [newNotification, ...prev]);
  };

  const handleViewChange = (view: View) => {
    setCurrentView(view);
    setShowSidebar(false);
    if (view === "dashboard") {
      loadStatistics();
      loadRecentActivities();
    }
  };

  const handleUpgrade = () => {
    window.location.href = "/upgrade";
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      type: "user",
      text: message,
      time: new Date().toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages([...messages, userMessage]);
    setMessage("");

    setTimeout(() => {
      const botMessage = {
        id: messages.length + 2,
        type: "bot",
        text: "شكراً لتواصلك معنا. أحد ممثلي الدعم سيرد عليك قريباً.",
        time: new Date().toLocaleTimeString("ar-EG", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, botMessage]);
    }, 1000);
  };

  const unreadNotifications = notifications.filter(n => !n.read).length;

  return (
    <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 ${darkMode ? 'dark' : ''}`}>
      {/* خلفية متحركة */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-emerald-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* الهيدر العلوي المحسن */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* القسم الأيسر - الشعار والقائمة */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div
                className="relative group cursor-pointer"
                onClick={() => handleViewChange("dashboard")}
              >
                {/* خلفية متوهجة متحركة */}
                <div className="absolute -inset-3 bg-gradient-to-r from-emerald-400 to-blue-400 rounded-full blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-700"></div>
                
                <div className="flex items-center gap-3 relative">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-xl blur-lg opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
                    <img
                      src={logo}
                      alt="إدارتي"
                      className="h-16 w-auto relative z-10 drop-shadow-lg group-hover:drop-shadow-2xl group-hover:scale-105 transition-all duration-500"
                    />
                  </div>
                  
                  <div className="hidden sm:block">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                      إدارتي
                    </h1>
                    <p className="text-xs text-gray-500">نظام إدارة متكامل</p>
                  </div>
                </div>
              </div>
            </div>

            {/* القسم الأيمن - الإجراءات السريعة */}
            <div className="flex items-center gap-3">
              {/* مؤشرات سريعة */}
              <div className="hidden md:flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {formatNumber(safeStats.totalRevenue)} ج.م
                  </span>
                </div>
                
                <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {formatNumber(safeStats.totalExpenses)} ج.م
                  </span>
                </div>
              </div>

              {/* زر الوضع الليلي */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all hidden sm:block"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* الإشعارات */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 hover:bg-gray-100 rounded-lg transition-all group"
                >
                  <Bell className="w-5 h-5 text-gray-600 group-hover:text-gray-900" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
                      {unreadNotifications}
                    </span>
                  )}
                </button>

                {/* قائمة الإشعارات */}
                {showNotifications && (
                  <div className="absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-2xl overflow-hidden z-50">
                    <div className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white px-4 py-3 flex items-center justify-between">
                      <h3 className="font-bold">الإشعارات</h3>
                      {unreadNotifications > 0 && (
                        <button
                          onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                          className="text-xs text-white/80 hover:text-white"
                        >
                          تحديد الكل كمقروء
                        </button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p>لا توجد إشعارات</p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition-all ${
                              !notification.read ? 'bg-blue-50/50' : ''
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
                                {notification.type === 'error' && <X className="w-4 h-4" />}
                                {notification.type === 'info' && <Info className="w-4 h-4" />}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{notification.title}</p>
                                <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {notification.timestamp.toLocaleTimeString('ar-EG')}
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

              {/* زر الأبجريد */}
              <button
                onClick={handleUpgrade}
                className="hidden sm:flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group"
              >
                <Crown className="w-4 h-4 group-hover:scale-110 group-hover:rotate-12 transition-all" />
                <span className="font-bold text-sm">الأبجريد</span>
              </button>

              {/* معلومات المستخدم */}
              <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-gray-50 to-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="text-right">
                  <p className="text-xs text-gray-500">مرحباً</p>
                  <p className="text-sm font-bold text-gray-800">
                    {user?.email?.split("@")[0] || "مستخدم"}
                  </p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md">
                  {user?.email?.charAt(0).toUpperCase() || "م"}
                </div>
              </div>

              {/* زر الخروج */}
              <button
                onClick={() => signOut()}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all group"
                title="تسجيل الخروج"
              >
                <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* الشريط الجانبي المحسن */}
      <div className={`fixed lg:static inset-y-0 right-0 z-40 w-64 lg:w-auto transform transition-transform duration-300 ${
        showSidebar ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
      }`}>
        <div className="h-full lg:h-auto bg-white/90 backdrop-blur-md lg:bg-transparent shadow-2xl lg:shadow-none p-4">
          <div className="lg:hidden flex justify-end mb-4">
            <button
              onClick={() => setShowSidebar(false)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => handleViewChange("dashboard")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                currentView === "dashboard"
                  ? "bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-md"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="flex-1 text-right font-medium">لوحة التحكم</span>
            </button>

            <button
              onClick={() => handleViewChange("students")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                currentView === "students"
                  ? "bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-md"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <Users className="w-5 h-5" />
              <span className="flex-1 text-right font-medium">الطلاب</span>
              {safeStats.activeStudents > 0 && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                  currentView === "students" ? "bg-white/20" : "bg-gray-200 text-gray-700"
                }`}>
                  {safeStats.activeStudents}
                </span>
              )}
            </button>

            <button
              onClick={() => handleViewChange("teachers")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                currentView === "teachers"
                  ? "bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-md"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <Briefcase className="w-5 h-5" />
              <span className="flex-1 text-right font-medium">المعلمين</span>
            </button>

            <button
              onClick={() => handleViewChange("fees")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                currentView === "fees"
                  ? "bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-md"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <DollarSign className="w-5 h-5" />
              <span className="flex-1 text-right font-medium">المصاريف</span>
            </button>

            <button
              onClick={() => handleViewChange("expenses")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                currentView === "expenses"
                  ? "bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-md"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <TrendingDown className="w-5 h-5" />
              <span className="flex-1 text-right font-medium">التكاليف</span>
            </button>

            <button
              onClick={() => handleViewChange("reports")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                currentView === "reports"
                  ? "bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-md"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span className="flex-1 text-right font-medium">تقرير الأرباح</span>
            </button>

            <button
              onClick={() => handleViewChange("financial")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                currentView === "financial"
                  ? "bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-md"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <PieChart className="w-5 h-5" />
              <span className="flex-1 text-right font-medium">التقارير المالية</span>
            </button>
          </div>
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === "dashboard" && (
          <div className="space-y-6">
            {/* الترحيب والإحصائيات السريعة */}
            <div className="bg-gradient-to-r from-emerald-600 to-blue-600 rounded-2xl shadow-xl p-8 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold mb-2">
                    مرحباً، {user?.email?.split("@")[0] || "مستخدم"} 👋
                  </h2>
                  <p className="text-white/80">
                    إليك نظرة عامة على أداء مؤسستك التعليمية
                  </p>
                </div>
                <div className="hidden md:flex gap-4">
                  <div className="text-center">
                    <p className="text-4xl font-bold">{safeStats.activeStudents}</p>
                    <p className="text-sm text-white/80">طالب نشط</p>
                  </div>
                  <div className="w-px h-12 bg-white/20"></div>
                  <div className="text-center">
                    <p className="text-4xl font-bold">{safeStats.activeTeachers}</p>
                    <p className="text-sm text-white/80">معلم نشط</p>
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                {/* بطاقات الإحصائيات الرئيسية */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl shadow-md p-6 border-r-4 border-emerald-600 hover:shadow-lg transition-all transform hover:-translate-y-1">
                    <div className="flex items-center justify-between mb-2">
                      <Wallet className="w-8 h-8 text-emerald-600" />
                      <span className="text-xs text-gray-500">الإيرادات</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(safeStats.totalRevenue)} ج.م
                    </p>
                    <div className="mt-2 flex items-center text-sm text-green-600">
                      <TrendingUp className="w-4 h-4 ml-1" />
                      <span>+12.5% عن الشهر الماضي</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-md p-6 border-r-4 border-red-600 hover:shadow-lg transition-all transform hover:-translate-y-1">
                    <div className="flex items-center justify-between mb-2">
                      <TrendingDown className="w-8 h-8 text-red-600" />
                      <span className="text-xs text-gray-500">التكاليف</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(safeStats.totalExpenses)} ج.م
                    </p>
                    <div className="mt-2 flex items-center text-sm text-red-600">
                      <TrendingDown className="w-4 h-4 ml-1" />
                      <span>-8.3% عن الشهر الماضي</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-md p-6 border-r-4 border-blue-600 hover:shadow-lg transition-all transform hover:-translate-y-1">
                    <div className="flex items-center justify-between mb-2">
                      <Users className="w-8 h-8 text-blue-600" />
                      <span className="text-xs text-gray-500">الطلاب</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {safeStats.totalStudents}
                    </p>
                    <div className="mt-2 text-sm text-gray-600">
                      {safeStats.activeStudents} طالب نشط
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-md p-6 border-r-4 border-purple-600 hover:shadow-lg transition-all transform hover:-translate-y-1">
                    <div className="flex items-center justify-between mb-2">
                      <Briefcase className="w-8 h-8 text-purple-600" />
                      <span className="text-xs text-gray-500">المعلمين</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {safeStats.totalTeachers}
                    </p>
                    <div className="mt-2 text-sm text-gray-600">
                      إجمالي الرواتب: {formatNumber(safeStats.totalSalaries)} ج.م
                    </div>
                  </div>
                </div>

                {/* بطاقة صافي الربح */}
                <div className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">صافي الربح</h3>
                    <div className={`p-3 rounded-full ${
                      safeStats.netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {safeStats.netProfit >= 0 ? (
                        <TrendingUp className={`w-6 h-6 ${safeStats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                      ) : (
                        <TrendingDown className={`w-6 h-6 ${safeStats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                      )}
                    </div>
                  </div>
                  
                  <div className={`text-4xl font-bold mb-4 ${
                    safeStats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {safeStats.netProfit >= 0 ? '+' : ''}{formatNumber(safeStats.netProfit)} ج.م
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                        <span className="text-sm text-gray-600">الإيرادات</span>
                      </div>
                      <p className="text-xl font-bold text-green-600">
                        {formatNumber(safeStats.totalRevenue)} ج.م
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                        <span className="text-sm text-gray-600">التكاليف</span>
                      </div>
                      <p className="text-xl font-bold text-red-600">
                        {formatNumber(safeStats.totalExpenses)} ج.م
                      </p>
                    </div>
                  </div>

                  {/* شريط التقدم */}
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">نسبة الربح</span>
                      <span className="font-medium">
                        {profitPercentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${safeStats.netProfit >= 0 ? 'bg-green-600' : 'bg-red-600'}`}
                        style={{ 
                          width: `${Math.min(100, Math.abs(profitPercentage))}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* النشاطات الأخيرة والاختصارات */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* النشاطات الأخيرة */}
                  <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900">آخر النشاطات</h3>
                      <button 
                        onClick={() => loadRecentActivities()}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                      >
                        <RefreshCw className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      {recentActivities.length > 0 ? (
                        recentActivities.map((activity) => (
                          <div
                            key={activity.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${
                                activity.color === 'green' ? 'bg-green-100' : 'bg-red-100'
                              }`}>
                                <activity.icon className={`w-4 h-4 text-${activity.color}-600`} />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {activity.description}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(activity.date).toLocaleDateString('ar-EG')}
                                </p>
                              </div>
                            </div>
                            <span className={`font-bold ${
                              activity.amount > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {activity.amount > 0 ? '+' : ''}{formatNumber(Math.abs(activity.amount))} ج.م
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p>لا توجد نشاطات حديثة</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* الاختصارات السريعة */}
                  <div className="bg-white rounded-xl shadow-md p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">إجراءات سريعة</h3>
                    
                    <div className="space-y-3">
                      <button
                        onClick={() => handleViewChange("students")}
                        className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl hover:from-blue-100 hover:to-indigo-100 transition-all group"
                      >
                        <div className="p-2 bg-blue-600 rounded-lg text-white">
                          <UserPlus className="w-4 h-4" />
                        </div>
                        <div className="flex-1 text-right">
                          <p className="font-medium text-gray-900">إضافة طالب جديد</p>
                          <p className="text-xs text-gray-600">تسجيل طالب جديد في النظام</p>
                        </div>
                      </button>

                      <button
                        onClick={() => handleViewChange("fees")}
                        className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl hover:from-emerald-100 hover:to-green-100 transition-all group"
                      >
                        <div className="p-2 bg-emerald-600 rounded-lg text-white">
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <div className="flex-1 text-right">
                          <p className="font-medium text-gray-900">تسديد مصاريف</p>
                          <p className="text-xs text-gray-600">تسجيل دفعة جديدة</p>
                        </div>
                      </button>

                      <button
                        onClick={() => handleViewChange("expenses")}
                        className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl hover:from-red-100 hover:to-orange-100 transition-all group"
                      >
                        <div className="p-2 bg-red-600 rounded-lg text-white">
                          <TrendingDown className="w-4 h-4" />
                        </div>
                        <div className="flex-1 text-right">
                          <p className="font-medium text-gray-900">تسجيل تكلفة</p>
                          <p className="text-xs text-gray-600">إضافة مصروف جديد</p>
                        </div>
                      </button>

                      <button
                        onClick={() => handleViewChange("teachers")}
                        className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl hover:from-purple-100 hover:to-pink-100 transition-all group"
                      >
                        <div className="p-2 bg-purple-600 rounded-lg text-white">
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <div className="flex-1 text-right">
                          <p className="font-medium text-gray-900">إضافة معلم</p>
                          <p className="text-xs text-gray-600">تسجيل معلم جديد</p>
                        </div>
                      </button>

                      <button
                        onClick={() => handleViewChange("reports")}
                        className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl hover:from-amber-100 hover:to-yellow-100 transition-all group"
                      >
                        <div className="p-2 bg-amber-600 rounded-lg text-white">
                          <BarChart3 className="w-4 h-4" />
                        </div>
                        <div className="flex-1 text-right">
                          <p className="font-medium text-gray-900">تقرير الأرباح</p>
                          <p className="text-xs text-gray-600">عرض تقرير مفصل</p>
                        </div>
                      </button>
                    </div>

                    {/* مؤشرات سريعة */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">نسبة الإنجاز اليوم</span>
                        <span className="text-sm font-medium text-emerald-600">75%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-600 rounded-full" style={{ width: '75%' }} />
                      </div>
                      
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-sm text-gray-600">الهدف الشهري</span>
                        <span className="text-sm font-medium text-blue-600">
                          {formatNumber(safeStats.totalRevenue)} / 100,000 ج.م
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* باقي الصفحات */}
        {currentView === "students" && <StudentsManager onUpdate={loadStatistics} />}
        {currentView === "teachers" && <TeachersManager onUpdate={loadStatistics} />}
        {currentView === "fees" && <FeesManager onUpdate={loadStatistics} />}
        {currentView === "expenses" && <ExpensesManager onUpdate={loadStatistics} />}
        {currentView === "reports" && <ProfitReport />}
        {currentView === "financial" && <FinancialReports />}
      </div>

      {/* زر الدردشة العائم المحسن */}
      <div className="fixed bottom-6 left-6 z-50">
        {isChatOpen && (
          <div className="absolute bottom-20 left-0 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden mb-4 animate-slideUp">
            <div className="bg-gradient-to-r from-emerald-600 to-blue-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Headphones className="w-5 h-5" />
                  <h3 className="font-bold">الدعم الفني</h3>
                </div>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="hover:bg-white/20 rounded-lg p-1 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-white/80 mt-1">نحن هنا لمساعدتك 24/7</p>
            </div>

            <div className="h-80 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.type === "user" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-3 ${
                      msg.type === "user"
                        ? "bg-gray-200 text-gray-800 rounded-br-none"
                        : "bg-gradient-to-r from-emerald-600 to-blue-600 text-white rounded-bl-none"
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                    <p
                      className={`text-xs mt-1 ${msg.type === "user" ? "text-gray-500" : "text-white/70"}`}
                    >
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="اكتب رسالتك هنا..."
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
                <button
                  type="submit"
                  className="bg-gradient-to-r from-emerald-600 to-blue-600 text-white p-2 rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!message.trim()}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>
        )}

        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="relative group flex items-center justify-center w-14 h-14 bg-gradient-to-r from-emerald-600 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
        >
          <div className="absolute -inset-2 bg-gradient-to-r from-emerald-400 to-blue-400 rounded-full blur-xl opacity-0 group-hover:opacity-75 transition-opacity duration-500 animate-pulse"></div>
          <MessageCircle className="relative w-6 h-6 transition-transform duration-300 group-hover:rotate-12" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
          <Headphones className="absolute -bottom-1 -left-1 w-4 h-4 text-white/80" />
        </button>
      </div>

      {/* CSS للأنيميشن */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}