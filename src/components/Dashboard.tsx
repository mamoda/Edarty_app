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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { Statistics } from "../types/database";
import StudentsManager from "./StudentsManager";
import FeesManager from "./FeesManager";
import ExpensesManager from "./ExpensesManager";
import TeachersManager from "./TeachersManager";
import ProfitReport from "./ProfitReport";
import logo from "../assets/logo.png";

type View =
  | "dashboard"
  | "students"
  | "teachers"
  | "fees"
  | "expenses"
  | "reports";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<View>("dashboard");
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, []);

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
    } catch (error) {
      console.error("Error loading statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewChange = (view: View) => {
    setCurrentView(view);
    if (view === "dashboard") {
      loadStatistics();
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, prefix = "" }: any) => (
    <div
      className="bg-white rounded-xl shadow-md p-6 border-r-4"
      style={{ borderColor: color }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {prefix}
            {typeof value === "number" ? value.toLocaleString("ar-EG") : value}
          </p>
        </div>
        <div
          className="p-3 rounded-full"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
      </div>
    </div>
  );

  const MenuItem = ({ label, icon: Icon, view, count }: any) => (
    <button
      onClick={() => handleViewChange(view)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
        currentView === view
          ? "bg-blue-600 text-white shadow-md"
          : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="flex-1 text-right font-medium">{label}</span>
      {count !== undefined && (
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            currentView === view ? "bg-blue-500" : "bg-gray-200 text-gray-700"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* الشعار مع تأثير متحرك */}
            <div className="flex items-center gap-4">
              <div
                className="relative group cursor-pointer"
                onClick={() => setCurrentView("dashboard")}
              >
                {/* خلفية متوهجة متحركة */}
                <div className="absolute -inset-3 bg-gradient-to-r from-emerald-400 to-blue-400 rounded-full blur-xl opacity-0 group-hover:opacity-75 transition-opacity duration-500 animate-pulse"></div>

                {/* اللوجو */}
                <div className="relative flex items-center gap-3">
                  <img
                    src={logo}
                    alt="إدارتي"
                    className="h-16 w-auto relative z-10 transform transition-all duration-500 group-hover:scale-110 group-hover:rotate-3"
                  />

                  {/* النص مع تأثير أنيق */}
                  <div className="hidden sm:block">
                    {/* <span className="text-2xl font-black bg-gradient-to-l from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                إدارتــي
              </span> */}
                    <div className="h-0.5 w-0 group-hover:w-full bg-gradient-to-l from-emerald-500 to-blue-500 transition-all duration-500"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* القسم الأيمن */}
            <div className="flex items-center gap-4">
              {/* بطاقة المستخدم */}
              <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-gray-50 to-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="text-right">
                  <p className="text-xs text-gray-500">المستخدم</p>
                  <p className="text-sm font-bold text-gray-800">
                    {user?.email?.split("@")[0] || "مستخدم"}
                  </p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-blue-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md transform rotate-3">
                  {user?.email?.charAt(0).toUpperCase() || "م"}
                </div>
              </div>

              {/* زر الخروج بتصميم مميز */}
              <button
                onClick={() => signOut()}
                className="relative group flex items-center gap-2 px-5 py-2.5 bg-white text-red-600 rounded-xl border-2 border-red-100 hover:border-red-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
              >
                {/* خلفية متحركة */}
                <div className="absolute inset-0 bg-gradient-to-l from-red-50 to-transparent translate-x-full group-hover:translate-x-0 transition-transform duration-500"></div>

                {/* المحتوى */}
                <span className="relative font-bold text-sm">مغادرة</span>
                <LogOut className="relative w-4 h-4 transition-transform group-hover:-translate-x-1" />
              </button>
            </div>
          </div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-4 space-y-2 sticky top-24">
              <MenuItem label="لوحة التحكم" icon={BarChart3} view="dashboard" />
              <MenuItem
                label="الطلاب"
                icon={Users}
                view="students"
                count={stats.activeStudents}
              />
              <MenuItem label="المعلمين" icon={Briefcase} view="teachers" />
              <MenuItem label="تحصيل المصاريف" icon={DollarSign} view="fees" />
              <MenuItem label="التكاليف" icon={TrendingDown} view="expenses" />
              <MenuItem
                label="تقرير الأرباح"
                icon={TrendingUp}
                view="reports"
              />
            </div>
          </aside>

          <main className="lg:col-span-3">
            {currentView === "dashboard" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">
                    نظرة عامة
                  </h2>
                  {loading ? (
                    <div className="text-center py-12">
                      <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <StatCard
                        title="إجمالي الطلاب"
                        value={stats.totalStudents}
                        icon={Users}
                        color="#3b82f6"
                      />
                      <StatCard
                        title="الطلاب النشطون"
                        value={stats.activeStudents}
                        icon={UserPlus}
                        color="#10b981"
                      />
                      <StatCard
                        title="إجمالي المعلمين"
                        value={stats.totalTeachers}
                        icon={Briefcase}
                        color="#f59e0b"
                      />
                      <StatCard
                        title="إجمالي الإيرادات"
                        value={`${Number(stats.totalRevenue).toLocaleString("ar-EG")} ج.م`}
                        icon={DollarSign}
                        color="#8b5cf6"
                      />
                      <StatCard
                        title="إجمالي التكاليف"
                        value={`${Number(stats.totalExpenses).toLocaleString("ar-EG")} ج.م`}
                        icon={TrendingDown}
                        color="#ef4444"
                      />
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">
                      صافي الربح
                    </h3>
                    <TrendingUp
                      className={`w-6 h-6 ${stats.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                    />
                  </div>
                  <div
                    className={`text-3xl font-bold ${stats.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {stats.netProfit >= 0 ? "+" : ""}
                    {Number(stats.netProfit).toLocaleString("ar-EG", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    ج.م
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">الإيرادات</span>
                      <span className="text-green-600 font-medium">
                        {Number(stats.totalRevenue).toLocaleString("ar-EG", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        ج.م
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">التكاليف</span>
                      <span className="text-red-600 font-medium">
                        {Number(stats.totalExpenses).toLocaleString("ar-EG", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        ج.م
                      </span>
                    </div>
                  </div>{" "}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setCurrentView("students")}
                    className="bg-white hover:bg-blue-50 rounded-xl shadow-md p-6 text-right transition-all group"
                  >
                    <UserPlus className="w-8 h-8 text-blue-600 mb-3 group-hover:scale-110 transition-transform" />
                    <h4 className="font-bold text-gray-900 mb-1">
                      إدارة الطلاب
                    </h4>
                    <p className="text-sm text-gray-600">
                      إضافة وتعديل بيانات الطلاب
                    </p>
                  </button>

                  <button
                    onClick={() => setCurrentView("fees")}
                    className="bg-white hover:bg-green-50 rounded-xl shadow-md p-6 text-right transition-all group"
                  >
                    <Receipt className="w-8 h-8 text-green-600 mb-3 group-hover:scale-110 transition-transform" />
                    <h4 className="font-bold text-gray-900 mb-1">
                      تحصيل المصاريف
                    </h4>
                    <p className="text-sm text-gray-600">
                      تسجيل المدفوعات والرسوم
                    </p>
                  </button>

                  <button
                    onClick={() => setCurrentView("expenses")}
                    className="bg-white hover:bg-red-50 rounded-xl shadow-md p-6 text-right transition-all group"
                  >
                    <FileText className="w-8 h-8 text-red-600 mb-3 group-hover:scale-110 transition-transform" />
                    <h4 className="font-bold text-gray-900 mb-1">
                      إدارة التكاليف
                    </h4>
                    <p className="text-sm text-gray-600">
                      تسجيل المصروفات والنفقات
                    </p>
                  </button>

                  <button
                    onClick={() => setCurrentView("teachers")}
                    className="bg-white hover:bg-purple-50 rounded-xl shadow-md p-6 text-right transition-all group"
                  >
                    <Briefcase className="w-8 h-8 text-purple-600 mb-3 group-hover:scale-110 transition-transform" />
                    <h4 className="font-bold text-gray-900 mb-1">
                      إدارة المعلمين
                    </h4>
                    <p className="text-sm text-gray-600">
                      إدارة بيانات المعلمين والرواتب
                    </p>
                  </button>
                </div>
              </div>
            )}

            {currentView === "students" && (
              <StudentsManager onUpdate={loadStatistics} />
            )}
            {currentView === "teachers" && (
              <TeachersManager onUpdate={loadStatistics} />
            )}
            {currentView === "fees" && (
              <FeesManager onUpdate={loadStatistics} />
            )}
            {currentView === "expenses" && (
              <ExpensesManager onUpdate={loadStatistics} />
            )}
            {currentView === "reports" && <ProfitReport />}
          </main>
        </div>
      </div>
    </div>
  );
}
