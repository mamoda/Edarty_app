import { useState } from "react";
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
  Send,
  X,
  Menu,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";

/**
 * Design Philosophy: Modern Minimalist Elegance
 * - Clean lines and strategic whitespace
 * - Slate blue primary with neutral grays and semantic colors
 * - Poppins for headings, Inter for body text
 * - Smooth 200ms transitions on all interactive elements
 */

interface StatData {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  prefix?: string;
}

interface Message {
  id: number;
  type: "user" | "bot";
  text: string;
  time: string;
}

export default function Dashboard() {
  const [currentView, setCurrentView] = useState<string>("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
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

  // Mock data for statistics
  const stats: StatData[] = [
    {
      title: "إجمالي الطلاب",
      value: "1,245",
      icon: <Users className="w-6 h-6" />,
      color: "#3B82F6",
      bgColor: "#DBEAFE",
      trend: { value: 12, isPositive: true },
    },
    {
      title: "الطلاب النشطون",
      value: "1,089",
      icon: <UserPlus className="w-6 h-6" />,
      color: "#10B981",
      bgColor: "#DCFCE7",
      trend: { value: 8, isPositive: true },
    },
    {
      title: "إجمالي الإيرادات",
      value: "125,450",
      icon: <DollarSign className="w-6 h-6" />,
      color: "#059669",
      bgColor: "#D1FAE5",
      prefix: "ر.س ",
      trend: { value: 15, isPositive: true },
    },
    {
      title: "إجمالي المصاريف",
      value: "45,230",
      icon: <FileText className="w-6 h-6" />,
      color: "#EF4444",
      bgColor: "#FEE2E2",
      prefix: "ر.س ",
      trend: { value: 5, isPositive: false },
    },
    {
      title: "صافي الربح",
      value: "80,220",
      icon: <TrendingUp className="w-6 h-6" />,
      color: "#F59E0B",
      bgColor: "#FEF3C7",
      prefix: "ر.س ",
      trend: { value: 22, isPositive: true },
    },
    {
      title: "إجمالي المعلمين",
      value: "45",
      icon: <Briefcase className="w-6 h-6" />,
      color: "#8B5CF6",
      bgColor: "#F3E8FF",
      trend: { value: 3, isPositive: true },
    },
  ];

  const menuItems = [
    {
      id: "dashboard",
      label: "لوحة التحكم",
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      id: "students",
      label: "إدارة الطلاب",
      icon: <Users className="w-5 h-5" />,
    },
    {
      id: "teachers",
      label: "إدارة المعلمين",
      icon: <Briefcase className="w-5 h-5" />,
    },
    {
      id: "fees",
      label: "تحصيل المصاريف",
      icon: <Receipt className="w-5 h-5" />,
    },
    {
      id: "expenses",
      label: "إدارة التكاليف",
      icon: <FileText className="w-5 h-5" />,
    },
    {
      id: "reports",
      label: "التقارير",
      icon: <TrendingUp className="w-5 h-5" />,
    },
  ];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage: Message = {
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
      const botMessage: Message = {
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

  const StatCard = ({ stat }: { stat: StatData }) => (
    <div
      className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group backdrop-blur-sm bg-opacity-95"
      style={{ borderRightColor: stat.color, borderRightWidth: "4px" }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="p-3 rounded-lg transition-all duration-200 group-hover:scale-110"
          style={{ backgroundColor: stat.bgColor }}
        >
          <div style={{ color: stat.color }}>{stat.icon}</div>
        </div>
        {stat.trend && (
          <div
            className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-lg ${
              stat.trend.isPositive
                ? "text-green-700 bg-green-50"
                : "text-red-700 bg-red-50"
            }`}
          >
            {stat.trend.isPositive ? (
              <ArrowUpRight className="w-4 h-4" />
            ) : (
              <ArrowDownLeft className="w-4 h-4" />
            )}
            {stat.trend.value}%
          </div>
        )}
      </div>
      <p className="text-gray-600 text-sm font-medium mb-1">{stat.title}</p>
      <p className="text-2xl font-bold text-gray-900">
        {stat.prefix}
        {stat.value}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl" style={{
      backgroundImage: 'url(https://d2xsxph8kpxj0f.cloudfront.net/310519663085516459/kVw5vuzmFks6tBMkJv3dvY/header-pattern-iptYN74gTTAaWYiZwXSbBc.webp)',
      backgroundAttachment: 'fixed',
    }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 lg:hidden"
            >
              <Menu className="w-5 h-5 text-gray-700" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">إدارتي</h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative group flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
              <Crown className="w-4 h-4" />
              <span className="text-sm font-medium">الأبجريد</span>
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200">
              <LogOut className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            isSidebarOpen ? "w-64" : "w-0"
          } bg-white border-l border-gray-200 transition-all duration-300 overflow-hidden lg:w-64`}
        >
          <nav className="p-4 space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-right ${
                  currentView === item.id
                    ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="flex-1">{item.label}</span>
                {currentView === item.id && (
                  <ChevronRight className="w-4 h-4" />
                )}
                <div className="text-lg">{item.icon}</div>
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8" style={{
          backgroundImage: 'url(https://d2xsxph8kpxj0f.cloudfront.net/310519663085516459/kVw5vuzmFks6tBMkJv3dvY/dashboard-hero-bg-BY56VdgbLtPREYg3WHhSh3.webp)',
          backgroundAttachment: 'fixed',
          backgroundSize: 'cover',
        }}>
          {currentView === "dashboard" && (
            <div className="space-y-8">
              {/* Page Header */}
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  مرحباً بعودتك!
                </h2>
                <p className="text-gray-600">
                  إليك ملخص أداء مؤسستك اليوم
                </p>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                {stats.map((stat, index) => (
                  <StatCard key={index} stat={stat} />
                ))}
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl p-8 shadow-md border border-gray-100 relative z-10" style={{
                backgroundImage: 'url(https://d2xsxph8kpxj0f.cloudfront.net/310519663085516459/kVw5vuzmFks6tBMkJv3dvY/stat-card-accent-K5iayvhZ5saQGojRJEp6jC.webp)',
                backgroundPosition: 'right bottom',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '300px 300px',
              }}>
                <h3 className="text-xl font-bold text-gray-900 mb-6">
                  الإجراءات السريعة
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    {
                      label: "إضافة طالب جديد",
                      icon: <UserPlus className="w-5 h-5" />,
                      color: "blue",
                    },
                    {
                      label: "تسجيل رسوم",
                      icon: <Receipt className="w-5 h-5" />,
                      color: "green",
                    },
                    {
                      label: "تسجيل مصروف",
                      icon: <FileText className="w-5 h-5" />,
                      color: "red",
                    },
                  ].map((action, index) => (
                    <button
                      key={index}
                      className={`p-4 rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-all duration-200 text-right group`}
                    >
                      <div
                        className={`inline-flex p-2 rounded-lg mb-2 transition-all duration-200 group-hover:scale-110 ${
                          action.color === "blue"
                            ? "bg-blue-50 text-blue-600"
                            : action.color === "green"
                              ? "bg-green-50 text-green-600"
                              : "bg-red-50 text-red-600"
                        }`}
                      >
                        {action.icon}
                      </div>
                      <p className="text-sm font-medium text-gray-900">
                        {action.label}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentView !== "dashboard" && (
            <div className="bg-white rounded-xl p-8 shadow-md border border-gray-100 text-center relative z-10">
              <p className="text-gray-600 text-lg">
                هذا القسم قيد التطوير. سيتم إضافة المزيد من الميزات قريباً.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Floating Chat Button */}
      <div className="fixed bottom-6 left-6 z-50">
        {isChatOpen && (
          <div className="absolute bottom-20 left-0 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 flex flex-col h-96">
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-t-2xl flex items-center justify-between">
              <h3 className="font-bold">دعم العملاء</h3>
              <button
                onClick={() => setIsChatOpen(false)}
                className="p-1 hover:bg-blue-500 rounded-lg transition-colors duration-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.type === "user" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg ${
                      msg.type === "user"
                        ? "bg-blue-50 text-gray-900"
                        : "bg-blue-600 text-white"
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.type === "user" ? "text-gray-500" : "text-blue-100"
                      }`}
                    >
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <form
              onSubmit={handleSendMessage}
              className="border-t border-gray-200 p-4 flex gap-2"
            >
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="اكتب رسالتك..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button
                type="submit"
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Chat Button */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl hover:bg-blue-700 transition-all duration-200 flex items-center justify-center group"
        >
          <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" />
        </button>
      </div>
    </div>
  );
}
