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
  Home,
  PieChart,
  Wallet,
  Calendar,
  Clock,
  Award,
  Target,
  CheckCircle,
  AlertTriangle,
  Info,
  Sun,
  Moon,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Shield,
  Zap,
  Globe,
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
}

interface Activity {
  id: string;
  type: 'income' | 'expense';
  title: string;
  amount: number;
  date: string;
  studentName?: string;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [darkMode, setDarkMode] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [loading, setLoading] = useState(true);
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
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "info",
      title: "مرحباً بك في إدارتي",
      message: "نظام إدارة متكامل لمؤسستك التعليمية",
      timestamp: new Date(),
      read: false,
    },
  ]);

  // قائمة التنقل الرئيسية
  const navItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: Home, color: 'emerald' },
    { id: 'students', label: 'الطلاب', icon: Users, color: 'blue' },
    { id: 'teachers', label: 'المعلمين', icon: Briefcase, color: 'purple' },
    { id: 'fees', label: 'المصاريف', icon: DollarSign, color: 'green' },
    { id: 'expenses', label: 'التكاليف', icon: TrendingDown, color: 'red' },
    { id: 'reports', label: 'الأرباح', icon: BarChart3, color: 'amber' },
    { id: 'financial', label: 'التقارير', icon: PieChart, color: 'indigo' },
  ] as const;

  useEffect(() => {
    loadStatistics();
    loadRecentActivities();
  }, []);

  // دوال مساعدة آمنة
  const formatNumber = (num: number | undefined | null): string => {
    if (num === undefined || num === null) return "0";
    return num.toLocaleString("ar-EG");
  };

  const formatCurrency = (num: number | undefined | null): string => {
    if (num === undefined || num === null) return "0 ج.م";
    return `${num.toLocaleString("ar-EG")} ج.م`;
  };

  const formatPercent = (num: number | undefined | null): string => {
    if (num === undefined || num === null) return "0%";
    return `${num.toFixed(1)}%`;
  };

  // قيم آمنة
  const safeStats = {
    totalStudents: stats.totalStudents || 0,
    activeStudents: stats.activeStudents || 0,
    totalRevenue: stats.totalRevenue || 0,
    totalExpenses: stats.totalExpenses || 0,
    netProfit: stats.netProfit || 0,
    totalTeachers: stats.totalTeachers || 0,
    activeTeachers: stats.activeTeachers || 0,
    totalSalaries: stats.totalSalaries || 0,
  };

  const profitMargin = safeStats.totalRevenue > 0 
    ? (safeStats.netProfit / safeStats.totalRevenue) * 100 
    : 0;

  const loadStatistics = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [studentsRes, feesRes, expensesRes, teachersRes] = await Promise.all([
        supabase.from("students").select("*", { count: "exact" }).eq("user_id", user.id),
        supabase.from("fees").select("amount").eq("user_id", user.id),
        supabase.from("expenses").select("amount").eq("user_id", user.id),
        supabase.from("teachers").select("*").eq("user_id", user.id),
      ]);

      const totalStudents = studentsRes.count || 0;
      const activeStudents = studentsRes.data?.filter(s => s.status === "active").length || 0;
      const totalRevenue = feesRes.data?.reduce((sum, fee) => sum + Number(fee.amount), 0) || 0;
      const totalExpenses = expensesRes.data?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
      const totalTeachers = teachersRes.data?.length || 0;
      const activeTeachers = teachersRes.data?.filter(t => t.status === "active").length || 0;
      const totalSalaries = teachersRes.data?.filter(t => t.status === "active")
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
    } catch (error) {
      console.error("Error loading statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentActivities = async () => {
    if (!user) return;
    try {
      const [fees, expenses] = await Promise.all([
        supabase
          .from("fees")
          .select("*, student:students(full_name)")
          .eq("user_id", user.id)
          .order("payment_date", { ascending: false })
          .limit(3),
        supabase
          .from("expenses")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .limit(3),
      ]);

      const activities: Activity[] = [
        ...(fees.data?.map(fee => ({
          id: fee.id,
          type: 'income' as const,
          title: `دفعة من ${(fee.student as any)?.full_name || 'طالب'}`,
          amount: fee.amount,
          date: fee.payment_date,
        })) || []),
        ...(expenses.data?.map(exp => ({
          id: exp.id,
          type: 'expense' as const,
          title: exp.description,
          amount: -exp.amount,
          date: exp.date,
        })) || [])
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
       .slice(0, 5);

      setRecentActivities(activities);
    } catch (error) {
      console.error("Error loading activities:", error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getColorClasses = (color: string, isActive: boolean) => {
    const colors = {
      emerald: isActive ? 'bg-emerald-600 text-white' : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-600',
      blue: isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600',
      purple: isActive ? 'bg-purple-600 text-white' : 'text-gray-700 hover:bg-purple-50 hover:text-purple-600',
      green: isActive ? 'bg-green-600 text-white' : 'text-gray-700 hover:bg-green-50 hover:text-green-600',
      red: isActive ? 'bg-red-600 text-white' : 'text-gray-700 hover:bg-red-50 hover:text-red-600',
      amber: isActive ? 'bg-amber-600 text-white' : 'text-gray-700 hover:bg-amber-50 hover:text-amber-600',
      indigo: isActive ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-600',
    };
    return colors[color as keyof typeof colors] || colors.emerald;
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${darkMode ? 'dark' : ''}`}>
      {/* خلفية ثابتة ونظيفة */}
      <div className="fixed inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-50 -z-10" />
      
      {/* الشريط العلوي */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* الشعار */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <div 
                onClick={() => setCurrentView("dashboard")}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-blue-400 rounded-lg blur opacity-0 group-hover:opacity-50 transition" />
                  <img src={logo} alt="إدارتي" className="h-10 w-auto relative" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent hidden sm:block">
                  إدارتي
                </span>
              </div>
            </div>

            {/* الإجراءات السريعة */}
            <div className="flex items-center gap-2">
              {/* مؤشرات سريعة - سطح المكتب */}
              <div className="hidden md:flex items-center gap-3 ml-4">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-lg">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700">
                    {formatCurrency(safeStats.totalRevenue)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-lg">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-red-700">
                    {formatCurrency(safeStats.totalExpenses)}
                  </span>
                </div>
              </div>

              {/* الوضع الليلي */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 hover:bg-gray-100 rounded-lg hidden sm:block"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              {/* الإشعارات */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 hover:bg-gray-100 rounded-lg relative"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="px-4 py-3 border-b bg-gray-50">
                      <h3 className="font-medium">الإشعارات</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.map(n => (
                        <div key={n.id} className={`px-4 py-3 border-b hover:bg-gray-50 ${!n.read ? 'bg-blue-50/50' : ''}`}>
                          <p className="font-medium text-sm">{n.title}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {n.timestamp.toLocaleTimeString('ar-EG')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* زر الأبجريد */}
              <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:shadow-md transition">
                <Crown className="w-4 h-4" />
                <span className="text-sm font-medium">الأبجريد</span>
              </button>

              {/* صورة المستخدم */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-lg flex items-center justify-center text-white font-medium">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium hidden md:block">
                  {user?.email?.split('@')[0]}
                </span>
              </div>

              {/* زر الخروج */}
              <button
                onClick={signOut}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                title="تسجيل الخروج"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* القائمة الجانبية للموبايل */}
      {showMobileMenu && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/20" onClick={() => setShowMobileMenu(false)} />
          <div className="fixed right-0 top-0 bottom-0 w-64 bg-white shadow-xl">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <span className="font-bold">القائمة</span>
                <button onClick={() => setShowMobileMenu(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-2">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id);
                    setShowMobileMenu(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    currentView === item.id
                      ? getColorClasses(item.color, true)
                      : getColorClasses(item.color, false)
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="flex-1 text-right">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* المحتوى الرئيسي */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentView === "dashboard" ? (
          <div className="space-y-6">
            {/* شريط التنقل العلوي للداشبورد */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 hide-scrollbar">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition ${
                    currentView === item.id
                      ? getColorClasses(item.color, true)
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              ))}
            </div>

            {/* بطاقات الإحصائيات */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <Wallet className="w-8 h-8 text-emerald-600" />
                  <span className="text-xs text-gray-500">الإيرادات</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(safeStats.totalRevenue)}
                </p>
                <p className="text-xs text-emerald-600 mt-1">+12.5% عن الشهر الماضي</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <TrendingDown className="w-8 h-8 text-red-600" />
                  <span className="text-xs text-gray-500">التكاليف</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(safeStats.totalExpenses)}
                </p>
                <p className="text-xs text-red-600 mt-1">-8.3% عن الشهر الماضي</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-8 h-8 text-blue-600" />
                  <span className="text-xs text-gray-500">الطلاب</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{safeStats.totalStudents}</p>
                <p className="text-xs text-blue-600 mt-1">{safeStats.activeStudents} نشط</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <Briefcase className="w-8 h-8 text-purple-600" />
                  <span className="text-xs text-gray-500">المعلمين</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{safeStats.totalTeachers}</p>
                <p className="text-xs text-purple-600 mt-1">{safeStats.activeTeachers} نشط</p>
              </div>
            </div>

            {/* صافي الربح والنشاطات */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* بطاقة صافي الربح */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">صافي الربح</h3>
                <div className="flex items-center gap-4 mb-6">
                  <div className={`text-4xl font-bold ${safeStats.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {safeStats.netProfit >= 0 ? '+' : ''}{formatCurrency(Math.abs(safeStats.netProfit))}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm ${
                    profitMargin >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {formatPercent(profitMargin)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-emerald-600 rounded-full" />
                      <span className="text-sm text-emerald-700">الإيرادات</span>
                    </div>
                    <p className="text-xl font-bold text-emerald-700">
                      {formatCurrency(safeStats.totalRevenue)}
                    </p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-red-600 rounded-full" />
                      <span className="text-sm text-red-700">التكاليف</span>
                    </div>
                    <p className="text-xl font-bold text-red-700">
                      {formatCurrency(safeStats.totalExpenses)}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">نسبة الربح</span>
                    <span className="font-medium">{formatPercent(profitMargin)}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${safeStats.netProfit >= 0 ? 'bg-emerald-600' : 'bg-red-600'}`}
                      style={{ width: `${Math.min(100, Math.abs(profitMargin))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* آخر النشاطات */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">آخر النشاطات</h3>
                <div className="space-y-4">
                  {recentActivities.map(activity => (
                    <div key={activity.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          activity.type === 'income' ? 'bg-emerald-100' : 'bg-red-100'
                        }`}>
                          {activity.type === 'income' ? (
                            <TrendingUp className={`w-4 h-4 ${activity.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`} />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(activity.date).toLocaleDateString('ar-EG')}
                          </p>
                        </div>
                      </div>
                      <span className={`text-sm font-medium ${
                        activity.amount > 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {activity.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(activity.amount))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* روابط سريعة */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {navItems.slice(1).map(item => (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 hover:shadow-md transition group"
                >
                  <div className={`w-10 h-10 rounded-lg bg-${item.color}-100 flex items-center justify-center mb-3 group-hover:scale-110 transition`}>
                    <item.icon className={`w-5 h-5 text-${item.color}-600`} />
                  </div>
                  <p className="text-sm font-medium text-gray-900">{item.label}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            {/* عرض المدير المناسب */}
            {currentView === "students" && <StudentsManager onUpdate={loadStatistics} />}
            {currentView === "teachers" && <TeachersManager onUpdate={loadStatistics} />}
            {currentView === "fees" && <FeesManager onUpdate={loadStatistics} />}
            {currentView === "expenses" && <ExpensesManager onUpdate={loadStatistics} />}
            {currentView === "reports" && <ProfitReport />}
            {currentView === "financial" && <FinancialReports />}
          </div>
        )}
      </div>

      {/* زر الدردشة */}
      <div className="fixed bottom-6 left-6 z-50">
        {showChat && (
          <div className="absolute bottom-16 left-0 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden mb-4">
            <div className="bg-gradient-to-r from-emerald-600 to-blue-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">الدعم الفني</h3>
                <button onClick={() => setShowChat(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="h-80 p-4 bg-gray-50">
              <p className="text-center text-gray-500 mt-32">سيتم إضافة المحادثة قريباً</p>
            </div>
          </div>
        )}
        <button
          onClick={() => setShowChat(!showChat)}
          className="w-12 h-12 bg-gradient-to-r from-emerald-600 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center"
        >
          <MessageCircle className="w-5 h-5" />
        </button>
      </div>

      {/* CSS إضافي */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}