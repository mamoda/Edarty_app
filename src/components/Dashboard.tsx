// src/components/Dashboard.tsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Briefcase,
  Crown,
  MessageCircle,
  Headphones,
  Send,
  X,
  GraduationCap,
  Bell,
  Search,
  ChevronLeft,
  ChevronRight,
  LineChart,
  Wallet,
  Activity,
  DollarSign,
  Settings,
  Home,
  Maximize2,
  UserPlus,
  Globe,
  Moon,
  Sun,
  RefreshCw,
  CreditCard,
  Landmark,
  FileText,
  School,
  Mail,
  AlertCircle,
  Shield,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useSchoolData } from "../hooks/useSchoolData";
import { supabase } from "../lib/supabase";
import type { Statistics } from "../types/database";
import StudentsManager from "./StudentsManager";
import FeesManager from "./FeesManager";
import ExpensesManager from "./ExpensesManager";
import TeachersManager from "./TeachersManager";
import ProfitReport from "./ProfitReport";
import FinancialReports from "./FinancialReports";
import UserManagement from "./UserManagement";
import logo from "../assets/logo.png";
import backgroundPattern from "../assets/background-pattern.png";
import backgroundWave from "../assets/background-wave.png";
import backgroundDots from "../assets/background-dots.png";

type View =
  | "dashboard"
  | "students"
  | "teachers"
  | "fees"
  | "expenses"
  | "reports"
  | "financial"
  | "users";

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  trend?: "up" | "down";
  trendValue?: number;
  color: string;
  isCurrency?: boolean;
  isPercentage?: boolean;
  delay?: number;
  subValue?: string;
}

interface MenuItemProps {
  label: string;
  icon: React.ElementType;
  view: View;
  count?: number;
  currentView: View;
  onClick: () => void;
}

interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  onClick: () => void;
}

interface HeaderProps {
  user: any;
  onSignOut: () => void;
  onViewChange: (view: View) => void;
  language: "ar" | "en";
  toggleLanguage: () => void;
  t: (key: string) => string;
  schoolName: string;
  schoolIdentifier: string;
  subscriptionPlan: string | null;
  subscriptionExpiresAt: string | null;
  onUpgrade: () => void;
}

interface ChatProps {
  isOpen: boolean;
  onClose: () => void;
  language: "ar" | "en";
  t: (key: string) => string;
}

interface Message {
  id: number;
  type: "user" | "bot";
  text: string;
  time: string;
}

// إحصائيات محسنة للرسوم
interface EnhancedStatistics extends Statistics {
  totalRefunds: number;
  netRevenue: number;
  paidStudents: number;
  partialPaidStudents: number;
  unpaidStudents: number;
  collectionRate: number;
  cashPayments: number;
  cardPayments: number;
  bankTransferPayments: number;
  checkPayments: number;
  todayCollections: number;
  thisWeekCollections: number;
  thisMonthCollections: number;
  totalSalaries: number; 
  activeTeachers: number; 
  totalTeachers: number; 
}

// دوال التنسيق المحسنة
const formatCurrency = (num: number, language: string): string => {
  const formattedNumber = num.toLocaleString(
    language === "ar" ? "ar-EG" : "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );

  return language === "ar"
    ? `${formattedNumber} ج.م`
    : `EGP ${formattedNumber}`;
};

const formatPercentage = (num: number, language: string): string => {
  const formattedNumber = num.toLocaleString(
    language === "ar" ? "ar-EG" : "en-US",
    {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    },
  );

  return `${formattedNumber}%`;
};

const formatNumber = (num: number, language: string): string => {
  return num.toLocaleString(language === "ar" ? "ar-EG" : "en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

const ModernStatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  color,
  isCurrency = false,
  isPercentage = false,
  delay = 0,
  subValue,
}) => {
  const { language } = useLanguage();
  const trendPositive = trend === "up";

  const getDisplayValue = () => {
    if (isCurrency) {
      return formatCurrency(value, language);
    } else if (isPercentage) {
      return formatPercentage(value, language);
    } else {
      return formatNumber(value, language);
    }
  };

  return (
    <div
      className="group relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100/50 hover:border-gray-200/80"
      style={{
        animationDelay: `${delay}ms`,
        animationFillMode: "both",
        fontFamily: language === "ar" ? "Tanseek Modern Arabic" : "inherit",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      <div className="absolute -inset-px bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

      <div className="relative p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-sm font-medium text-gray-500 tracking-wide">
              {title}
            </p>

            <div className="flex items-baseline gap-1 flex-wrap">
              <span className="text-2xl font-bold text-gray-900 tracking-tight">
                {getDisplayValue()}
              </span>
              {subValue && (
                <span className="text-xs text-gray-500 mr-1">({subValue})</span>
              )}
            </div>

            {trend && trendValue !== undefined && (
              <div className="flex items-center gap-2 mt-2">
                <div
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    trendPositive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {trendPositive ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>{trendValue}%</span>
                </div>
                <span className="text-xs text-gray-400">
                  {language === "ar" ? "مقارنة بالشهر الماضي" : "vs last month"}
                </span>
              </div>
            )}
          </div>

          <div className="relative mr-3">
            <div
              className={`absolute inset-0 bg-gradient-to-br ${color} rounded-xl blur-xl opacity-30 group-hover:opacity-40 transition-opacity duration-500`}
            ></div>
            <div
              className={`relative p-3 bg-gradient-to-br ${color} rounded-xl shadow-lg transform group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500`}
            >
              <Icon className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gray-200/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left"></div>
      </div>
    </div>
  );
};

const ModernMenuItem: React.FC<MenuItemProps> = ({
  label,
  icon: Icon,
  view,
  count,
  currentView,
  onClick,
}) => {
  const isActive = currentView === view;

  return (
    <button
      onClick={onClick}
      className={`relative w-full group rounded-xl transition-all duration-300 ${
        isActive ? "scale-[1.02]" : "hover:scale-[1.01]"
      }`}
    >
      <div
        className={`absolute inset-0 rounded-xl transition-all duration-300 ${
          isActive
            ? "bg-gradient-to-r from-blue-600/90 to-indigo-600/90 shadow-lg shadow-blue-600/20"
            : "bg-gray-100/50 opacity-0 group-hover:opacity-100"
        }`}
      ></div>

      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"></div>

      <div className="relative flex items-center gap-3 px-4 py-2.5">
        <div
          className={`p-2 rounded-lg transition-all duration-300 ${
            isActive
              ? "bg-white/20 text-white"
              : "bg-white/80 text-gray-600 group-hover:bg-white group-hover:text-blue-600"
          }`}
        >
          <Icon className="w-4 h-4" />
        </div>

        <span
          className={`flex-1 text-right font-medium transition-colors duration-300 ${
            isActive ? "text-white" : "text-gray-700"
          }`}
        >
          {label}
        </span>

        {count !== undefined && (
          <span
            className={`text-xs px-2 py-1 rounded-full transition-all duration-300 ${
              isActive
                ? "bg-white/20 text-white"
                : "bg-gray-200/80 text-gray-600"
            }`}
          >
            {formatNumber(count, "ar")}
          </span>
        )}
      </div>

      {isActive && (
        <div className="absolute right-0 top-2 bottom-2 w-1 bg-white rounded-full shadow-lg shadow-white/50"></div>
      )}
    </button>
  );
};

const QuickActionCard: React.FC<QuickActionProps> = ({
  title,
  description,
  icon: Icon,
  color,
  onClick,
}) => (
  <button
    onClick={onClick}
    className="group relative bg-white/90 backdrop-blur-xl rounded-xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100/50 hover:border-gray-200/80"
  >
    <div
      className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-5 transition-opacity duration-700`}
    ></div>
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

    <div className="relative p-5 text-right">
      <div
        className={`inline-flex p-2.5 bg-gradient-to-br ${color} rounded-xl shadow-lg mb-3 transform group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500`}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>

      <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    </div>
  </button>
);

const ModernHeader: React.FC<HeaderProps> = ({
  user,
  onSignOut,
  onViewChange,
  language,
  toggleLanguage,
  t,
  subscriptionPlan,
  subscriptionExpiresAt,
  onUpgrade,
}) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // حساب الأيام المتبقية في الاشتراك
  const getDaysRemaining = () => {
    if (!subscriptionExpiresAt) return null;
    const expires = new Date(subscriptionExpiresAt);
    const today = new Date();
    const diffTime = expires.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = getDaysRemaining();
  const isExpiringSoon =
    daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0;
  const isExpired = daysRemaining !== null && daysRemaining <= 0;

  // تحديد اسم الخطة بالعربية
  const getPlanName = () => {
    const plans: Record<string, string> = {
      free: "مجاني",
      basic: "أساسي",
      pro: "احترافي",
      enterprise: "مؤسسات",
    };
    return plans[subscriptionPlan || "free"] || "مجاني";
  };

  return (
    <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <div
              className="relative group cursor-pointer"
              onClick={() => onViewChange("dashboard")}
            >
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <img
                src={logo}
                alt="إدارتي"
                className="h-16 w-auto relative z-10"
              />
            </div>

            <div className="h-6 w-px bg-gray-200"></div>

            {/* عرض الخطة الحالية */}
            <div className="hidden md:flex items-center gap-2">
              <div
                className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                  subscriptionPlan === "pro" ||
                  subscriptionPlan === "enterprise"
                    ? "bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700"
                    : subscriptionPlan === "basic"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-600"
                }`}
              >
                <span className="flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  {getPlanName()}
                </span>
              </div>

              {daysRemaining !== null && daysRemaining > 0 && (
                <div
                  className={`text-xs ${isExpiringSoon ? "text-orange-500" : "text-gray-500"}`}
                >
                  {language === "ar"
                    ? `متبقي ${daysRemaining} يوم`
                    : `${daysRemaining} days left`}
                </div>
              )}

              {isExpired && (
                <div className="text-xs text-red-500 font-medium">
                  {language === "ar" ? "انتهى الاشتراك" : "Expired"}
                </div>
              )}
            </div>

            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => onViewChange("dashboard")}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100/80 transition-all duration-200"
              >
                {t("overview")}
              </button>
              <button
                onClick={() => onViewChange("financial")}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100/80 transition-all duration-200"
              >
                {t("analytics")}
              </button>
              <button
                onClick={() => onViewChange("reports")}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100/80 transition-all duration-200"
              >
                {t("reports")}
              </button>
            </nav>
          </div>

          <div className="hidden md:block flex-1 max-w-md mx-8">
            <div className="relative group">
              <input
                type="text"
                placeholder={t("search")}
                className="w-full px-4 py-2 pr-10 bg-gray-100/50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 text-sm placeholder:text-gray-400"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleLanguage}
              className="p-2 hover:bg-gray-100/80 rounded-xl transition-all duration-200 flex items-center gap-1"
            >
              <Globe className="w-4 h-4 text-gray-600" />
              <span className="text-xs font-medium text-gray-600">
                {language === "ar" ? "English" : "العربية"}
              </span>
            </button>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 hover:bg-gray-100/80 rounded-xl transition-all duration-200"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-gray-600" />
              ) : (
                <Moon className="w-4 h-4 text-gray-600" />
              )}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 hover:bg-gray-100/80 rounded-xl transition-all duration-200 relative"
              >
                <Bell className="w-4 h-4 text-gray-600" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white"></span>
              </button>

              {showNotifications && (
                <div className="absolute left-0 mt-2 w-80 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-gray-200/50 overflow-hidden">
                  <div className="p-3 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">
                      {t("notifications")}
                    </h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {isExpiringSoon && (
                      <div className="p-3 hover:bg-gray-50/80 transition-colors duration-200 border-b border-gray-100">
                        <div className="flex items-start gap-3">
                          <div className="p-1.5 bg-orange-100 rounded-lg">
                            <AlertCircle className="w-3 h-3 text-orange-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-900">
                              {language === "ar"
                                ? `اشتراكك سينتهي بعد ${daysRemaining} يوم`
                                : `Your subscription expires in ${daysRemaining} days`}
                            </p>
                            <button
                              onClick={onUpgrade}
                              className="text-xs text-blue-600 mt-1 hover:underline"
                            >
                              {language === "ar" ? "جدد الآن" : "Renew now"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="p-3 hover:bg-gray-50/80 transition-colors duration-200 border-b border-gray-100 last:border-0"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-1.5 bg-blue-100 rounded-lg">
                            <Activity className="w-3 h-3 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-900">
                              {t("newUpdate")}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {t("minAgo")}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* زر الترقية المحسن */}
            {subscriptionPlan !== "enterprise" && (
              <button
                onClick={onUpgrade}
                className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                  isExpired
                    ? "bg-gradient-to-r from-red-500 to-rose-500 text-white animate-pulse hover:shadow-lg hover:shadow-red-500/25"
                    : subscriptionPlan === "pro"
                      ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:shadow-lg hover:shadow-purple-500/25"
                      : "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg hover:shadow-amber-500/25"
                }`}
              >
                <Crown className="w-4 h-4" />
                <span>
                  {isExpired
                    ? language === "ar"
                      ? "جدد الاشتراك"
                      : "Renew"
                    : subscriptionPlan === "pro"
                      ? language === "ar"
                        ? "ترقية المؤسسة"
                        : "Upgrade Enterprise"
                      : t("upgrade")}
                </span>
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-medium text-sm shadow-sm hover:shadow-md transition-all duration-200"
              >
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </button>

              {showUserMenu && (
                <div className="absolute left-0 mt-2 w-56 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-gray-200/50 overflow-hidden">
                  <div className="p-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.email}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-500">
                        {getPlanName()} {language === "ar" ? "باقة" : "Plan"}
                      </p>
                      {daysRemaining !== null && daysRemaining > 0 && (
                        <p
                          className={`text-xs ${isExpiringSoon ? "text-orange-500" : "text-gray-400"}`}
                        >
                          {daysRemaining}{" "}
                          {language === "ar" ? "يوم متبقي" : "days left"}
                        </p>
                      )}
                    </div>
                  </div>

                  {subscriptionPlan !== "enterprise" && (
                    <button
                      onClick={onUpgrade}
                      className="w-full text-right p-3 text-sm text-amber-600 hover:bg-amber-50/80 transition-colors duration-200 flex items-center gap-2"
                    >
                      <Crown className="w-4 h-4" />
                      {isExpired
                        ? language === "ar"
                          ? "تجديد الاشتراك"
                          : "Renew Subscription"
                        : language === "ar"
                          ? "ترقية الباقة"
                          : "Upgrade Plan"}
                    </button>
                  )}

                  <button
                    onClick={onSignOut}
                    className="w-full text-right p-3 text-sm text-red-600 hover:bg-red-50/80 transition-colors duration-200"
                  >
                    {t("signOut")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

const ModernChat: React.FC<ChatProps> = ({ isOpen, onClose, language, t }) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      type: "bot",
      text: t("aiAssistant"),
      time: new Date().toLocaleTimeString(
        language === "ar" ? "ar-EG" : "en-US",
        {
          hour: "2-digit",
          minute: "2-digit",
        },
      ),
    },
  ]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage: Message = {
      id: messages.length + 1,
      type: "user",
      text: message,
      time: new Date().toLocaleTimeString(
        language === "ar" ? "ar-EG" : "en-US",
        {
          hour: "2-digit",
          minute: "2-digit",
        },
      ),
    };
    setMessages([...messages, userMessage]);
    setMessage("");

    setTimeout(() => {
      const botMessage: Message = {
        id: messages.length + 2,
        type: "bot",
        text: t("supportReply"),
        time: new Date().toLocaleTimeString(
          language === "ar" ? "ar-EG" : "en-US",
          {
            hour: "2-digit",
            minute: "2-digit",
          },
        ),
      };
      setMessages((prev) => [...prev, botMessage]);
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 w-96 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-200/50 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Headphones className="w-5 h-5 text-white" />
              <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full ring-2 ring-white"></span>
            </div>
            <div>
              <h3 className="font-semibold text-white">{t("support")}</h3>
              <p className="text-xs text-white/80">{t("supportDesc")}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-all duration-200"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      <div className="h-96 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.type === "user" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`relative max-w-[80%] rounded-lg p-3 ${
                msg.type === "user"
                  ? "bg-gray-200 text-gray-900"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
              }`}
            >
              <p className="text-sm">{msg.text}</p>
              <p
                className={`text-xs mt-1 ${
                  msg.type === "user" ? "text-gray-500" : "text-white/70"
                }`}
              >
                {msg.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={handleSendMessage}
        className="p-4 border-t border-gray-100 bg-white"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("typeMessage")}
            className="flex-1 px-3 py-2 bg-gray-100/50 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm"
          />
          <button
            type="submit"
            className="p-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-50"
            disabled={!message.trim()}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

// مكون عرض المكونات الفرعية مع التحميل
const ViewRenderer: React.FC<{
  view: View;
  onUpdate: () => void;
  loading?: boolean;
}> = ({ view, onUpdate, loading = false }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="relative">
          <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  switch (view) {
    case "students":
      return <StudentsManager onUpdate={onUpdate} />;
    case "teachers":
      return <TeachersManager onUpdate={onUpdate} />;
    case "fees":
      return <FeesManager onUpdate={onUpdate} />;
    case "expenses":
      return <ExpensesManager onUpdate={onUpdate} />;
    case "reports":
      return <ProfitReport />;
    case "financial":
      return <FinancialReports />;
    case "users":
      return <UserManagement onUpdate={onUpdate} />;
    default:
      return null;
  }
};

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    authUser: user,
    signOut,
    currentSchool,
    currentRole,
    subscriptionPlan,
    subscriptionExpiresAt,
  } = useAuth();
  const { schoolName, schoolEmail, schoolIdentifier } = useSchoolData();
  const { language, toggleLanguage, t } = useLanguage();

  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [stats, setStats] = useState<EnhancedStatistics>({
    totalStudents: 0,
    activeStudents: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalTeachers: 0,
    activeTeachers: 0,
    totalSalaries: 0,
    totalRefunds: 0,
    netRevenue: 0,
    paidStudents: 0,
    partialPaidStudents: 0,
    unpaidStudents: 0,
    collectionRate: 0,
    cashPayments: 0,
    cardPayments: 0,
    bankTransferPayments: 0,
    checkPayments: 0,
    todayCollections: 0,
    thisWeekCollections: 0,
    thisMonthCollections: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [currentBackground, setCurrentBackground] = useState(0);
  const [dataError, setDataError] = useState<string | null>(null);

  // منع التحميل المزدوج
  const hasLoadedStatsRef = useRef(false);
  const isLoadingRef = useRef(false);

  // مجموعة الخلفيات المتاحة
  const backgrounds = [
    {
      image: backgroundPattern,
      overlay: "from-blue-50/30 to-indigo-50/30",
    },
    {
      image: backgroundWave,
      overlay: "from-emerald-50/30 to-teal-50/30",
    },
    {
      image: backgroundDots,
      overlay: "from-purple-50/30 to-pink-50/30",
    },
  ];

  // تغيير الخلفية كل 30 ثانية
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBackground((prev) => (prev + 1) % backgrounds.length);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // دالة للتعامل مع زر الترقية
  const handleUpgrade = async () => {
    // تسجيل محاولة الترقية في الـ Activity Log
    if (user && currentSchool) {
      try {
        await supabase.from("activity_logs").insert({
          user_id: user.id,
          school_id: currentSchool.id,
          action: "upgrade_clicked",
          entity_type: "subscription",
          entity_id: currentSchool.id,
          new_data: { current_plan: subscriptionPlan },
        });
      } catch (error) {
        console.error("Error logging upgrade click:", error);
      }
    }

    // التوجيه لصفحة الترقية
    navigate("/pricing");
  };

  // تحميل البيانات مرة واحدة
  const loadStatistics = async () => {
    // منع التحميل المتزامن
    if (isLoadingRef.current) {
      console.log("⏳ Statistics already loading, skipping...");
      return;
    }

if (!user || !currentSchool) {
  console.log("⏳ Waiting for auth and school...");
  return<div>Loading app...</div>;
}
    isLoadingRef.current = true;
    setLoading(true);
    setDataError(null);

    try {
      console.log(
        `📊 Loading statistics for school: ${currentSchool.name} (ID: ${currentSchool.id})`,
      );

      const results = await Promise.allSettled([
        supabase.from("students").select("*").eq("school_id", currentSchool.id),
        supabase
          .from("fees")
          .select("*, student:students(*)")
          .eq("school_id", currentSchool.id),
        supabase
          .from("expenses")
          .select("amount")
          .eq("school_id", currentSchool.id),
        supabase.from("teachers").select("*").eq("school_id", currentSchool.id),
      ]);

      const [studentsRes, feesRes, expensesRes, teachersRes] = results.map(
        (result) =>
          result.status === "fulfilled"
            ? result.value
            : { data: [], error: result.reason },
      );

      if (studentsRes.error)
        console.error("Students error:", studentsRes.error);
      if (feesRes.error) console.error("Fees error:", feesRes.error);
      if (expensesRes.error)
        console.error("Expenses error:", expensesRes.error);
      if (teachersRes.error)
        console.error("Teachers error:", teachersRes.error);

      const totalStudents = studentsRes.data?.length ?? 0;
      const activeStudents =
        studentsRes.data?.filter((s: any) => s.status === "active").length ?? 0;

      const fees = feesRes.data ?? [];
      const totalPayments = fees
        .filter((f: any) => f.amount > 0)
        .reduce((sum: number, fee: any) => sum + Number(fee.amount), 0);
      const totalRefunds = fees
        .filter((f: any) => f.amount < 0)
        .reduce(
          (sum: number, fee: any) => sum + Math.abs(Number(fee.amount)),
          0,
        );
      const netRevenue = totalPayments - totalRefunds;

      const totalExpenses =
        expensesRes.data?.reduce(
          (sum: number, exp: any) => sum + Number(exp.amount),
          0,
        ) ?? 0;

      const totalTeachers = teachersRes.data?.length ?? 0;
      const activeTeachers =
        teachersRes.data?.filter((t: any) => t.status === "active").length ?? 0;
      const totalSalaries =
        teachersRes.data
          ?.filter((t: any) => t.status === "active")
          .reduce((sum: number, t: any) => sum + Number(t.salary), 0) ?? 0;

      let paidStudents = 0;
      let partialPaidStudents = 0;
      let unpaidStudents = 0;

      studentsRes.data?.forEach((student: any) => {
        const studentFees = fees.filter(
          (f: any) => f.student_id === student.id,
        );
        const totalPaid = studentFees
          .filter((f: any) => f.amount > 0)
          .reduce((sum: number, f: any) => sum + f.amount, 0);
        const totalRefunded = studentFees
          .filter((f: any) => f.amount < 0)
          .reduce((sum: number, f: any) => sum + Math.abs(f.amount), 0);
        const netPaid = totalPaid - totalRefunded;

        if (netPaid >= 5000) {
          paidStudents++;
        } else if (netPaid > 0) {
          partialPaidStudents++;
        } else {
          unpaidStudents++;
        }
      });

      let cashPayments = 0,
        cardPayments = 0,
        bankPayments = 0,
        checkPayments = 0;
      fees.forEach((fee: any) => {
        const amount = Math.abs(fee.amount);
        if (fee.notes) {
          try {
            const notes = JSON.parse(fee.notes);
            const method = notes.payment_method;
            if (method === "cash") cashPayments += amount;
            else if (method === "card") cardPayments += amount;
            else if (method === "bank_transfer") bankPayments += amount;
            else if (method === "check") checkPayments += amount;
          } catch {
            cashPayments += amount;
          }
        } else {
          cashPayments += amount;
        }
      });

      const today = new Date().toISOString().split("T")[0];
      const todayPayments = fees
        .filter((f: any) => f.payment_date === today && f.amount > 0)
        .reduce((sum: number, f: any) => sum + f.amount, 0);
      const todayRefunds = fees
        .filter((f: any) => f.payment_date === today && f.amount < 0)
        .reduce((sum: number, f: any) => sum + Math.abs(f.amount), 0);
      const todayCollections = todayPayments - todayRefunds;

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const weekPayments = fees
        .filter(
          (f: any) => new Date(f.payment_date) >= oneWeekAgo && f.amount > 0,
        )
        .reduce((sum: number, f: any) => sum + f.amount, 0);
      const weekRefunds = fees
        .filter(
          (f: any) => new Date(f.payment_date) >= oneWeekAgo && f.amount < 0,
        )
        .reduce((sum: number, f: any) => sum + Math.abs(f.amount), 0);
      const thisWeekCollections = weekPayments - weekRefunds;

      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const monthPayments = fees
        .filter(
          (f: any) => new Date(f.payment_date) >= oneMonthAgo && f.amount > 0,
        )
        .reduce((sum: number, f: any) => sum + f.amount, 0);
      const monthRefunds = fees
        .filter(
          (f: any) => new Date(f.payment_date) >= oneMonthAgo && f.amount < 0,
        )
        .reduce((sum: number, f: any) => sum + Math.abs(f.amount), 0);
      const thisMonthCollections = monthPayments - monthRefunds;

      const expectedRevenue = activeStudents * 5000;
      const collectionRate =
        expectedRevenue > 0 ? (netRevenue / expectedRevenue) * 100 : 0;

      setStats({
        totalStudents,
        activeStudents,
        totalRevenue: totalPayments,
        totalExpenses,
        netProfit: netRevenue - totalExpenses,
        totalTeachers,
        activeTeachers,
        totalSalaries,
        totalRefunds,
        netRevenue,
        paidStudents,
        partialPaidStudents,
        unpaidStudents,
        collectionRate,
        cashPayments,
        cardPayments,
        bankTransferPayments: bankPayments,
        checkPayments,
        todayCollections,
        thisWeekCollections,
        thisMonthCollections,
      });

      console.log("✅ Statistics loaded successfully");
      hasLoadedStatsRef.current = true;
    } catch (error: any) {
      console.error(`❌ Error loading statistics:`, error);
      setDataError(error?.message || "حدث خطأ في تحميل البيانات");
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  // تحميل الإحصائيات مرة واحدة عند تحميل الصفحة
const hasInitialLoadedRef = useRef(false);

useEffect(() => {
  if (!user) return;
  if (!currentSchool) return;

  if (hasInitialLoadedRef.current) return;

  hasInitialLoadedRef.current = true;
  loadStatistics();
}, [user, currentSchool]);
  const handleViewChange = (view: View) => {
    setCurrentView(view);
  };

  // زر التحديث اليدوي
  const handleRefresh = () => {
    hasLoadedStatsRef.current = false;
    loadStatistics();
  };

  const revenueData = [65, 45, 75, 55, 85, 95, 70];
  const days =
    language === "ar"
      ? [t("mon"), t("tue"), t("wed"), t("thu"), t("fri"), t("sat"), t("sun")]
      : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const calculateTrend = (): { trend: "up" | "down"; value: number } => {
    const mockChange = Math.random() * 20 - 10;
    return {
      trend: mockChange >= 0 ? "up" : "down",
      value: Math.abs(Math.round(mockChange * 10) / 10),
    };
  };

  const [studentsTrend] = useState(calculateTrend());
  const [revenueTrend] = useState(calculateTrend());
  const [expensesTrend] = useState(calculateTrend());
  const [profitTrend] = useState(calculateTrend());

  // التحقق من صلاحية الوصول لإدارة المستخدمين
  const canManageUsers = currentRole === "admin";

  return (
    <div
      className="min-h-screen bg-gray-50/50 relative"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      {/* خلفية متحركة مع صورة */}
      <div className="fixed inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000"
          style={{
            backgroundImage: `url(${backgrounds[currentBackground].image})`,
            opacity: 0.15,
          }}
        />

        <div
          className={`absolute inset-0 bg-gradient-to-br ${backgrounds[currentBackground].overlay} transition-all duration-1000`}
        />

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.03),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(139,92,246,0.03),transparent_50%)]" />

        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
          {backgrounds.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentBackground(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                currentBackground === index
                  ? "w-6 bg-blue-600"
                  : "bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10">
        <ModernHeader
          user={user}
          onSignOut={signOut}
          onViewChange={handleViewChange}
          language={language}
          toggleLanguage={toggleLanguage}
          t={t}
          schoolName={schoolName}
          schoolIdentifier={schoolIdentifier}
          subscriptionPlan={subscriptionPlan}
          subscriptionExpiresAt={subscriptionExpiresAt}
          onUpgrade={handleUpgrade}
        />

        {/* شريط حالة المدرسة */}
        <div className="relative border-b border-gray-200/50 bg-white/40 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-gradient-to-br from-blue-600/10 to-indigo-600/10 rounded-lg">
                    <School className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-900">
                      {schoolName}
                    </span>
                    {currentRole && (
                      <span className="text-xs text-gray-500 mr-2">
                        (
                        {currentRole === "admin"
                          ? "مدير"
                          : currentRole === "accountant"
                            ? "محاسب"
                            : "مشرف"}
                        )
                      </span>
                    )}
                  </div>
                </div>

                <span className="text-gray-300 text-lg leading-none">•</span>

                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-xs text-gray-600">
                    <span className="font-medium text-gray-900">
                      {formatNumber(stats.activeStudents, language)}
                    </span>{" "}
                    طالب نشط
                  </span>
                </div>

                <span className="text-gray-300 text-lg leading-none">•</span>

                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-xs text-gray-600 truncate max-w-[180px]">
                    {schoolEmail}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">نسبة التحصيل</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-green-600">
                      {stats.collectionRate.toFixed(1)}%
                    </span>
                    <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${stats.collectionRate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-50 rounded-full border border-green-100">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-medium text-green-700">
                    مباشر
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="fixed bottom-6 left-6 z-50">
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="group relative w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:shadow-blue-600/25 transition-all duration-300 hover:scale-110"
          >
            <MessageCircle className="w-5 h-5 mx-auto transition-transform duration-300 group-hover:rotate-12" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full"></span>
          </button>
        </div>

        <ModernChat
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          language={language}
          t={t}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-6">
            {showSidebar && (
              <aside className="w-64 flex-shrink-0">
                <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm p-2 sticky top-20 border border-gray-100/50">
                  <ModernMenuItem
                    label={t("dashboard")}
                    icon={Home}
                    view="dashboard"
                    currentView={currentView}
                    onClick={() => handleViewChange("dashboard")}
                  />
                  <ModernMenuItem
                    label={t("students")}
                    icon={GraduationCap}
                    view="students"
                    count={stats.activeStudents}
                    currentView={currentView}
                    onClick={() => handleViewChange("students")}
                  />
                  <ModernMenuItem
                    label={t("teachers")}
                    icon={Briefcase}
                    view="teachers"
                    currentView={currentView}
                    onClick={() => handleViewChange("teachers")}
                  />
                  <ModernMenuItem
                    label={t("fees")}
                    icon={Wallet}
                    view="fees"
                    currentView={currentView}
                    onClick={() => handleViewChange("fees")}
                  />
                  <ModernMenuItem
                    label={t("expenses")}
                    icon={TrendingDown}
                    view="expenses"
                    currentView={currentView}
                    onClick={() => handleViewChange("expenses")}
                  />
                  <ModernMenuItem
                    label={t("profit")}
                    icon={TrendingUp}
                    view="reports"
                    currentView={currentView}
                    onClick={() => handleViewChange("reports")}
                  />
                  <ModernMenuItem
                    label={t("financial")}
                    icon={LineChart}
                    view="financial"
                    currentView={currentView}
                    onClick={() => handleViewChange("financial")}
                  />

                  <div className="h-px bg-gray-200 my-2"></div>

                  {canManageUsers && (
                    <ModernMenuItem
                      label="إدارة المستخدمين"
                      icon={Shield}
                      view="users"
                      currentView={currentView}
                      onClick={() => handleViewChange("users")}
                    />
                  )}

                  <button className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100/80 transition-all duration-200">
                    <Settings className="w-4 h-4" />
                    <span className="flex-1 text-right font-medium">
                      {t("settings")}
                    </span>
                  </button>

                  <button className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100/80 transition-all duration-200">
                    <School className="w-4 h-4" />
                    <span className="flex-1 text-right font-medium">
                      {t("schoolSettings") || "إعدادات المدرسة"}
                    </span>
                  </button>

                  <button
                    onClick={() => setShowSidebar(false)}
                    className="w-full mt-2 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100/80 rounded-lg transition-colors duration-200"
                  >
                    <ChevronRight className="w-4 h-4 mx-auto" />
                  </button>
                </div>
              </aside>
            )}

            {!showSidebar && (
              <button
                onClick={() => setShowSidebar(true)}
                className="fixed right-4 top-20 z-40 p-2 bg-white/90 backdrop-blur-xl rounded-lg shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100/50"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
            )}

            <main className="flex-1 min-w-0">
              {currentView === "dashboard" ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-semibold text-gray-900">
                        {t("dashboard")}
                      </h1>
                      <p className="text-sm text-gray-500 mt-1">
                        <span className="text-blue-600 font-medium">
                          {schoolName}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleRefresh}
                        className="p-2 hover:bg-gray-100/80 rounded-lg transition-all duration-200"
                        title={t("refresh")}
                      >
                        <RefreshCw className="w-4 h-4 text-gray-600" />
                      </button>
                      <div className="flex items-center gap-2 bg-white/90 backdrop-blur-xl rounded-lg p-1 border border-gray-100/50">
                        {[t("day"), t("week"), t("month"), t("year")].map(
                          (period, index) => {
                            const periods = ["day", "week", "month", "year"];
                            return (
                              <button
                                key={periods[index]}
                                onClick={() =>
                                  setSelectedPeriod(periods[index])
                                }
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                                  selectedPeriod === periods[index]
                                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
                                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/80"
                                }`}
                              >
                                {period}
                              </button>
                            );
                          },
                        )}
                      </div>
                    </div>
                  </div>

                  {dataError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <p className="text-sm text-red-700">{dataError}</p>
                      <button
                        onClick={handleRefresh}
                        className="mr-auto text-sm bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700"
                      >
                        إعادة المحاولة
                      </button>
                    </div>
                  )}

                  {loading ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="relative">
                        <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 xlg:grid-cols-4 gap-4">
                        <ModernStatCard
                          title={t("totalStudents")}
                          value={stats.totalStudents}
                          icon={Users}
                          trend={studentsTrend.trend}
                          trendValue={studentsTrend.value}
                          color="from-blue-600 to-indigo-600"
                          delay={0}
                          subValue={`${formatNumber(stats.activeStudents, language)} ${t("active")}`}
                        />
                        <ModernStatCard
                          title={t("netRevenue")}
                          value={stats.netRevenue}
                          icon={DollarSign}
                          isCurrency={true}
                          trend={revenueTrend.trend}
                          trendValue={revenueTrend.value}
                          color="from-emerald-600 to-teal-600"
                          delay={50}
                          subValue={t("afterRefunds")}
                        />
                        <ModernStatCard
                          title={t("totalExpenses")}
                          value={stats.totalExpenses}
                          icon={TrendingDown}
                          isCurrency={true}
                          trend={expensesTrend.trend}
                          trendValue={expensesTrend.value}
                          color="from-red-600 to-rose-600"
                          delay={100}
                        />
                        <ModernStatCard
                          title={t("netProfit")}
                          value={stats.netProfit}
                          icon={TrendingUp}
                          isCurrency={true}
                          trend={profitTrend.trend}
                          trendValue={profitTrend.value}
                          color="from-purple-600 to-pink-600"
                          delay={150}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 xlg:grid-cols-4 gap-4">
                        <ModernStatCard
                          title={t("collectionRate")}
                          value={stats.collectionRate}
                          icon={Activity}
                          isPercentage={true}
                          color="from-blue-600 to-indigo-600"
                          delay={200}
                        />
                        <ModernStatCard
                          title={t("todayCollections")}
                          value={stats.todayCollections}
                          icon={Wallet}
                          isCurrency={true}
                          color="from-amber-500 to-orange-600"
                          delay={250}
                        />
                        <ModernStatCard
                          title={t("paidStudents")}
                          value={stats.paidStudents}
                          icon={Users}
                          color="from-green-600 to-emerald-600"
                          delay={300}
                        />
                        <ModernStatCard
                          title={t("unpaidStudents")}
                          value={stats.unpaidStudents}
                          icon={Users}
                          color="from-red-600 to-rose-600"
                          delay={350}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <ModernStatCard
                          title={t("cashPayments")}
                          value={stats.cashPayments}
                          icon={Wallet}
                          isCurrency={true}
                          color="from-green-600 to-emerald-600"
                          delay={400}
                        />
                        <ModernStatCard
                          title={t("cardPayments")}
                          value={stats.cardPayments}
                          icon={CreditCard}
                          isCurrency={true}
                          color="from-blue-600 to-indigo-600"
                          delay={450}
                        />
                        <ModernStatCard
                          title={t("bankTransferPayments")}
                          value={stats.bankTransferPayments}
                          icon={Landmark}
                          isCurrency={true}
                          color="from-purple-600 to-pink-600"
                          delay={500}
                        />
                        <ModernStatCard
                          title={t("checkPayments")}
                          value={stats.checkPayments}
                          icon={FileText}
                          isCurrency={true}
                          color="from-amber-500 to-orange-600"
                          delay={550}
                        />
                      </div>
                    </>
                  )}

                  <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm p-6 border border-gray-100/50">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {t("revenueOverview")}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {t("last7Days")}
                        </p>
                      </div>
                      <button className="p-2 hover:bg-gray-100/80 rounded-lg transition-colors duration-200">
                        <Maximize2 className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>

                    <div className="h-32 flex items-end gap-2">
                      {revenueData.map((value, i) => (
                        <div
                          key={i}
                          className="flex-1 flex flex-col items-center gap-1"
                        >
                          <div
                            className="w-full bg-gradient-to-t from-blue-600 to-indigo-600 rounded-t-lg transition-all duration-500 hover:from-blue-500 hover:to-indigo-500"
                            style={{ height: `${value}%` }}
                          ></div>
                          <span className="text-xs text-gray-500">
                            {days[i]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      {t("quickActions")}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      <QuickActionCard
                        title={t("addStudent")}
                        description={t("addStudentDesc")}
                        icon={UserPlus}
                        color="from-blue-600 to-indigo-600"
                        onClick={() => handleViewChange("students")}
                      />
                      <QuickActionCard
                        title={t("recordFee")}
                        description={t("recordFeeDesc")}
                        icon={Wallet}
                        color="from-emerald-600 to-teal-600"
                        onClick={() => handleViewChange("fees")}
                      />
                      <QuickActionCard
                        title={t("addExpense")}
                        description={t("addExpenseDesc")}
                        icon={TrendingDown}
                        color="from-red-600 to-rose-600"
                        onClick={() => handleViewChange("expenses")}
                      />
                      <QuickActionCard
                        title={t("viewReports")}
                        description={t("viewReportsDesc")}
                        icon={BarChart3}
                        color="from-purple-600 to-pink-600"
                        onClick={() => handleViewChange("reports")}
                      />
                      <QuickActionCard
                        title={t("processRefund")}
                        description={t("processRefundDesc")}
                        icon={X}
                        color="from-orange-600 to-red-600"
                        onClick={() => handleViewChange("fees")}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <ViewRenderer
                  view={currentView}
                  onUpdate={handleRefresh}
                  loading={loading}
                />
              )}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
