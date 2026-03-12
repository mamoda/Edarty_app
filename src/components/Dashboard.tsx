// Dashboard.tsx - التصحيح النهائي

import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { supabase } from "../lib/supabase";
import type { Statistics } from "../types/database";
import StudentsManager from "./StudentsManager";
import FeesManager from "./FeesManager";
import ExpensesManager from "./ExpensesManager";
import TeachersManager from "./TeachersManager";
import ProfitReport from "./ProfitReport";
import FinancialReports from "./FinancialReports";
import logo from "../assets/logo.png";

type View = "dashboard" | "students" | "teachers" | "fees" | "expenses" | "reports" | "financial";

// إزالة الواجهات غير المستخدمة واستخدام any مؤقتاً للبيانات القادمة من Supabase

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  trend?: 'up' | 'down';
  trendValue?: number;
  color: string;
  prefix?: string;
  suffix?: string;
  delay?: number;
  isLoading?: boolean;
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
  language: 'ar' | 'en';
  toggleLanguage: () => void;
  t: (key: string) => string;
}

interface ChatProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'ar' | 'en';
  t: (key: string) => string;
}

interface Message {
  id: number;
  type: 'user' | 'bot';
  text: string;
  time: string;
}

interface StatisticsValidation {
  isValid: boolean;
  errors: string[];
  lastUpdated: Date;
}

// دالة مساعدة للتأكد من أن القيمة رقم
const ensureNumber = (value: any, defaultValue: number = 0): number => {
  if (typeof value === 'number' && !isNaN(value)) return value;
  const parsed = Number(value);
  return !isNaN(parsed) ? parsed : defaultValue;
};

const ModernStatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue, 
  color, 
  prefix = "", 
  suffix = "",
  delay = 0,
  isLoading = false
}) => {
  const { language } = useLanguage();
  const trendPositive = trend === 'up';
  const safeValue = ensureNumber(value);
  
  if (isLoading) {
    return (
      <div className="group relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm overflow-hidden border border-gray-100/50">
        <div className="relative p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-3 flex-1">
              <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
            </div>
            <div className="p-3.5 bg-gray-200 rounded-xl animate-pulse">
              <div className="w-5 h-5"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className="group relative bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100/50 hover:border-gray-200/80"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      <div className="absolute -inset-px bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-purple-500/5 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      
      <div className="relative p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-500 tracking-wide">{title}</p>
            <p className="text-3xl font-bold text-gray-900 tracking-tight">
              {prefix}{safeValue.toLocaleString(language === 'ar' ? "ar-EG" : "en-US", { 
                minimumFractionDigits: 2,
                maximumFractionDigits: 2 
              })}{suffix}
            </p>
            
            {trend && trendValue !== undefined && (
              <div className="flex items-center gap-2 mt-2">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  trendPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}>
                  {trendPositive ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>{trendValue}%</span>
                </div>
                <span className="text-xs text-gray-400">
                  {language === 'ar' ? 'مقارنة بالشهر الماضي' : 'vs last month'}
                </span>
              </div>
            )}
          </div>
          
          <div className="relative">
            <div className={`absolute inset-0 bg-gradient-to-br ${color} rounded-xl blur-xl opacity-30 group-hover:opacity-40 transition-opacity duration-500`}></div>
            <div className={`relative p-3.5 bg-gradient-to-br ${color} rounded-xl shadow-lg transform group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500`}>
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
  onClick 
}) => {
  const isActive = currentView === view;
  
  return (
    <button
      onClick={onClick}
      className={`relative w-full group rounded-xl transition-all duration-300 ${
        isActive ? 'scale-[1.02]' : 'hover:scale-[1.01]'
      }`}
    >
      <div className={`absolute inset-0 rounded-xl transition-all duration-300 ${
        isActive 
          ? 'bg-gradient-to-r from-blue-600/90 to-indigo-600/90 shadow-lg shadow-blue-600/20' 
          : 'bg-gray-100/50 opacity-0 group-hover:opacity-100'
      }`}></div>
      
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"></div>
      
      <div className="relative flex items-center gap-3 px-4 py-2.5">
        <div className={`p-2 rounded-lg transition-all duration-300 ${
          isActive 
            ? 'bg-white/20 text-white' 
            : 'bg-white/80 text-gray-600 group-hover:bg-white group-hover:text-blue-600'
        }`}>
          <Icon className="w-4 h-4" />
        </div>
        
        <span className={`flex-1 text-right font-medium transition-colors duration-300 ${
          isActive ? 'text-white' : 'text-gray-700'
        }`}>
          {label}
        </span>
        
        {count !== undefined && (
          <span className={`text-xs px-2 py-1 rounded-full transition-all duration-300 ${
            isActive 
              ? 'bg-white/20 text-white' 
              : 'bg-gray-200/80 text-gray-600'
          }`}>
            {count}
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
  onClick 
}) => (
  <button
    onClick={onClick}
    className="group relative bg-white/90 backdrop-blur-xl rounded-xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden border border-gray-100/50 hover:border-gray-200/80"
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-5 transition-opacity duration-700`}></div>
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
    
    <div className="relative p-5 text-right">
      <div className={`inline-flex p-2.5 bg-gradient-to-br ${color} rounded-xl shadow-lg mb-3 transform group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      
      <h4 className="font-semibold text-gray-900 mb-1">{title}</h4>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    </div>
  </button>
);

const ModernHeader: React.FC<HeaderProps> = ({ user, onSignOut, onViewChange, language, toggleLanguage, t }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
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
                className="h-8 w-auto relative z-10"
              />
            </div>
            
            <div className="h-6 w-px bg-gray-200"></div>
            
            <nav className="hidden md:flex items-center gap-1">
              <button className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100/80 transition-all duration-200">
                {t('overview')}
              </button>
              <button className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100/80 transition-all duration-200">
                {t('analytics')}
              </button>
              <button className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100/80 transition-all duration-200">
                {t('reports')}
              </button>
            </nav>
          </div>
          
          <div className="hidden md:block flex-1 max-w-md mx-8">
            <div className="relative group">
              <input
                type="text"
                placeholder={t('search')}
                className="w-full px-4 py-2 pr-10 bg-gray-100/50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300 text-sm placeholder:text-gray-400"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300" />
              
              <kbd className="absolute left-10 top-1/2 transform -translate-y-1/2 hidden group-focus-within:inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-200/80 rounded text-xs text-gray-500">
                ⌘K
              </kbd>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLanguage}
              className="p-2 hover:bg-gray-100/80 rounded-xl transition-all duration-200 flex items-center gap-1"
            >
              <Globe className="w-4 h-4 text-gray-600" />
              <span className="text-xs font-medium text-gray-600">
                {language === 'ar' ? 'English' : 'العربية'}
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
                    <h3 className="font-semibold text-gray-900">{t('notifications')}</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-3 hover:bg-gray-50/80 transition-colors duration-200 border-b border-gray-100 last:border-0">
                        <div className="flex items-start gap-3">
                          <div className="p-1.5 bg-blue-100 rounded-lg">
                            <Activity className="w-3 h-3 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-900">{t('newUpdate')}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{t('minAgo')}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <button className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium rounded-lg hover:shadow-lg hover:shadow-amber-500/25 transition-all duration-300">
              <Crown className="w-4 h-4" />
              <span>{t('upgrade')}</span>
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-medium text-sm shadow-sm hover:shadow-md transition-all duration-200"
              >
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </button>
              
              {showUserMenu && (
                <div className="absolute left-0 mt-2 w-48 bg-white/95 backdrop-blur-xl rounded-xl shadow-xl border border-gray-200/50 overflow-hidden">
                  <div className="p-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{t('freePlan')}</p>
                  </div>
                  <button
                    onClick={onSignOut}
                    className="w-full text-right p-3 text-sm text-red-600 hover:bg-red-50/80 transition-colors duration-200"
                  >
                    {t('signOut')}
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
      text: t('aiAssistant'),
      time: new Date().toLocaleTimeString(language === 'ar' ? "ar-EG" : "en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage: Message = {
      id: messages.length + 1,
      type: "user",
      text: message,
      time: new Date().toLocaleTimeString(language === 'ar' ? "ar-EG" : "en-US", {
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
        text: t('supportReply'),
        time: new Date().toLocaleTimeString(language === 'ar' ? "ar-EG" : "en-US", {
          hour: "2-digit",
          minute: "2-digit",
        }),
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
              <h3 className="font-semibold text-white">{t('support')}</h3>
              <p className="text-xs text-white/80">{t('supportDesc')}</p>
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
              <p className={`text-xs mt-1 ${
                msg.type === "user" ? "text-gray-500" : "text-white/70"
              }`}>
                {msg.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('typeMessage')}
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

// مكون مؤشر دقة البيانات
const DataAccuracyIndicator: React.FC<{ validation: StatisticsValidation; onRefresh: () => void }> = ({ validation, onRefresh }) => {
  const { language } = useLanguage();
  
  if (validation.isValid) return null;
  
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-amber-50/95 backdrop-blur-sm border border-amber-200 rounded-xl p-4 shadow-lg max-w-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Activity className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-amber-800">
              {language === 'ar' ? 'تنبيه دقة البيانات' : 'Data Accuracy Alert'}
            </h4>
            <p className="text-xs text-amber-700 mt-1">
              {validation.errors.length} {language === 'ar' ? 'مشكلة في البيانات' : 'data issues found'}
            </p>
            <button 
              onClick={onRefresh}
              className="mt-2 text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1.5 rounded-lg transition-colors"
            >
              {language === 'ar' ? 'تحديث البيانات' : 'Refresh Data'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// مكون شريط تقدم دقيق للتحميل
const PreciseLoadingBar: React.FC<{ loading: boolean }> = ({ loading }) => {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    if (loading) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + (90 - prev) * 0.1;
        });
      }, 100);
      
      return () => clearInterval(interval);
    } else {
      setProgress(100);
      const timeout = setTimeout(() => setProgress(0), 300);
      return () => clearTimeout(timeout);
    }
  }, [loading]);
  
  if (!loading && progress === 0) return null;
  
  return (
    <div className="fixed top-16 left-0 right-0 z-50 h-0.5 bg-gray-100">
      <div 
        className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

// مكون شريط حالة التحديث
const UpdateStatusBar: React.FC<{ lastUpdated: number }> = ({ lastUpdated }) => {
  const { language } = useLanguage();
  
  const getTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return language === 'ar' ? 'الآن' : 'now';
    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return language === 'ar' ? `منذ ${minutes} دقيقة` : `${minutes} min ago`;
    }
    if (seconds < 86400) {
      const hours = Math.floor(seconds / 3600);
      return language === 'ar' ? `منذ ${hours} ساعة` : `${hours} hours ago`;
    }
    const days = Math.floor(seconds / 86400);
    return language === 'ar' ? `منذ ${days} يوم` : `${days} days ago`;
  };

  return (
    <div className="absolute top-0 left-0 right-0 flex justify-center pointer-events-none">
      <div className="bg-white/80 backdrop-blur-sm px-3 py-1 rounded-b-lg text-xs text-gray-500 border border-gray-200/50">
        {language === 'ar' ? 'آخر تحديث: ' : 'Last updated: '}
        {getTimeAgo(lastUpdated)}
      </div>
    </div>
  );
};

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  
  const [currentView, setCurrentView] = useState<View>("dashboard");
  
  // تعريف Statistics مع التأكد من أن جميع القيم أرقام
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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [dataValidation, setDataValidation] = useState<StatisticsValidation>({
    isValid: true,
    errors: [],
    lastUpdated: new Date()
  });
  const [dataFreshness, setDataFreshness] = useState<number>(Date.now());
  
  // تعريف previousStats بنفس النوع Statistics
  const [previousStats, setPreviousStats] = useState<Statistics>({
    totalStudents: 0,
    activeStudents: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalTeachers: 0,
    activeTeachers: 0,
    totalSalaries: 0,
  });

  useEffect(() => {
    loadStatistics();
    
    // تحديث البيانات كل 5 دقائق
    const intervalId = setInterval(() => {
      loadStatistics(false);
    }, 5 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [user]);

  // الاستماع للتغييرات في الجداول المهمة
  useEffect(() => {
    if (!user) return;

    const subscriptions = [
      supabase
        .channel('students-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'students', filter: `user_id=eq.${user.id}` },
          () => loadStatistics(false)
        )
        .subscribe(),
        
      supabase
        .channel('fees-changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'fees', filter: `user_id=eq.${user.id}` },
          () => loadStatistics(false)
        )
        .subscribe(),
        
      supabase
        .channel('expenses-changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'expenses', filter: `user_id=eq.${user.id}` },
          () => loadStatistics(false)
        )
        .subscribe(),
        
      supabase
        .channel('teachers-changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'teachers', filter: `user_id=eq.${user.id}` },
          () => loadStatistics(false)
        )
        .subscribe()
    ];

    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
    };
  }, [user]);

  const loadStatistics = async (showLoadingIndicator = true) => {
    if (!user) return;

    if (showLoadingIndicator) setLoading(true);
    
    try {
      // حفظ الإحصائيات السابقة
      setPreviousStats({...stats});
      
      const [studentsRes, feesRes, expensesRes, teachersRes] = await Promise.all([
        supabase
          .from("students")
          .select("*")
          .eq("user_id", user.id),
        
        supabase
          .from("fees")
          .select("amount")
          .eq("user_id", user.id)
          .gte("date", new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString()),
        
        supabase
          .from("expenses")
          .select("amount")
          .eq("user_id", user.id)
          .gte("date", new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString()),
        
        supabase
          .from("teachers")
          .select("*")
          .eq("user_id", user.id)
      ]);

      // التحقق من صحة البيانات
      const validationErrors: string[] = [];
      
      const validateAmount = (amount: any): boolean => {
        const num = Number(amount);
        return !isNaN(num) && num >= 0 && num < 10000000;
      };

      const totalStudents = studentsRes.data?.length ?? 0;
      const activeStudents = studentsRes.data?.filter((s: any) => s.status === "active").length ?? 0;
      
      // معالجة الإيرادات مع التحقق من النوع
      let totalRevenue = 0;
      if (feesRes.data) {
        (feesRes.data as any[]).forEach((fee: any) => {
          const amount = Number(fee.amount);
          if (validateAmount(amount)) {
            totalRevenue += amount;
          } else {
            validationErrors.push(`Invalid fee amount: ${fee.amount}`);
          }
        });
      }
      
      // معالجة المصروفات مع التحقق من النوع
      let totalExpenses = 0;
      if (expensesRes.data) {
        (expensesRes.data as any[]).forEach((exp: any) => {
          const amount = Number(exp.amount);
          if (validateAmount(amount)) {
            totalExpenses += amount;
          } else {
            validationErrors.push(`Invalid expense amount: ${exp.amount}`);
          }
        });
      }
      
      const totalTeachers = teachersRes.data?.length ?? 0;
      const activeTeachers = teachersRes.data?.filter((t: any) => t.status === "active").length ?? 0;
      
      // معالجة الرواتب مع التحقق من النوع
      let totalSalaries = 0;
      if (teachersRes.data) {
        (teachersRes.data as any[]).forEach((teacher: any) => {
          if (teacher.status === "active") {
            const salary = Number(teacher.salary);
            if (validateAmount(salary)) {
              totalSalaries += salary;
            } else {
              validationErrors.push(`Invalid salary for teacher ${teacher.id}: ${teacher.salary}`);
            }
          }
        });
      }

      const newStats = {
        totalStudents,
        activeStudents,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        netProfit: Math.round((totalRevenue - totalExpenses) * 100) / 100,
        totalTeachers,
        activeTeachers,
        totalSalaries: Math.round(totalSalaries * 100) / 100,
      };

      setStats(newStats);

      setDataValidation({
        isValid: validationErrors.length === 0,
        errors: validationErrors,
        lastUpdated: new Date()
      });

      setDataFreshness(Date.now());

      if (validationErrors.length > 0) {
        console.warn("Data validation warnings:", validationErrors);
      }

    } catch (error) {
      console.error("Error loading statistics:", error);
      setDataValidation(prev => ({
        ...prev,
        isValid: false,
        errors: [...prev.errors, "Failed to load statistics"]
      }));
    } finally {
      if (showLoadingIndicator) setLoading(false);
    }
  };

  const handleViewChange = (view: View) => {
    setCurrentView(view);
    if (view === "dashboard") {
      loadStatistics();
    }
  };

  const calculateTrend = (currentValue: number, previousValue: number): { trend: 'up' | 'down', value: number } => {
    // التأكد من أن القيم أرقام
    const safeCurrent = ensureNumber(currentValue);
    const safePrevious = ensureNumber(previousValue);
    
    if (safePrevious === 0) return { trend: 'up', value: 0 };
    
    const change = ((safeCurrent - safePrevious) / safePrevious) * 100;
    const roundedChange = Math.min(Math.abs(Math.round(change * 100) / 100), 999.99);
    
    return {
      trend: change >= 0 ? 'up' : 'down',
      value: roundedChange
    };
  };

  const revenueData = [65, 45, 75, 55, 85, 95, 70];
  const days = language === 'ar' 
    ? [t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat'), t('sun')]
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="min-h-screen bg-gray-50/50" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <PreciseLoadingBar loading={loading} />
      
      <div className="relative">
        <ModernHeader 
          user={user} 
          onSignOut={signOut} 
          onViewChange={handleViewChange}
          language={language}
          toggleLanguage={toggleLanguage}
          t={t}
        />

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
          <UpdateStatusBar lastUpdated={dataFreshness} />
          
          <div className="flex gap-6">
            {showSidebar && (
              <aside className="w-64 flex-shrink-0">
                <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm p-2 sticky top-20 border border-gray-100/50">
                  <ModernMenuItem
                    label={t('dashboard')}
                    icon={Home}
                    view="dashboard"
                    currentView={currentView}
                    onClick={() => handleViewChange("dashboard")}
                  />
                  <ModernMenuItem
                    label={t('students')}
                    icon={GraduationCap}
                    view="students"
                    count={stats.activeStudents}
                    currentView={currentView}
                    onClick={() => handleViewChange("students")}
                  />
                  <ModernMenuItem
                    label={t('teachers')}
                    icon={Briefcase}
                    view="teachers"
                    currentView={currentView}
                    onClick={() => handleViewChange("teachers")}
                  />
                  <ModernMenuItem
                    label={t('fees')}
                    icon={Wallet}
                    view="fees"
                    currentView={currentView}
                    onClick={() => handleViewChange("fees")}
                  />
                  <ModernMenuItem
                    label={t('expenses')}
                    icon={TrendingDown}
                    view="expenses"
                    currentView={currentView}
                    onClick={() => handleViewChange("expenses")}
                  />
                  <ModernMenuItem
                    label={t('profit')}
                    icon={TrendingUp}
                    view="reports"
                    currentView={currentView}
                    onClick={() => handleViewChange("reports")}
                  />
                  <ModernMenuItem
                    label={t('financial')}
                    icon={LineChart}
                    view="financial"
                    currentView={currentView}
                    onClick={() => handleViewChange("financial")}
                  />
                  
                  <div className="h-px bg-gray-200 my-2"></div>
                  
                  <button className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100/80 transition-all duration-200">
                    <Settings className="w-4 h-4" />
                    <span className="flex-1 text-right font-medium">{t('settings')}</span>
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
              {currentView === "dashboard" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-semibold text-gray-900">{t('dashboard')}</h1>
                      <p className="text-sm text-gray-500 mt-1">
                        {t('welcome')}, {user?.email?.split('@')[0]}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-white/90 backdrop-blur-xl rounded-lg p-1 border border-gray-100/50">
                      {[t('day'), t('week'), t('month'), t('year')].map((period, index) => {
                        const periods = ['day', 'week', 'month', 'year'];
                        return (
                          <button
                            key={periods[index]}
                            onClick={() => setSelectedPeriod(periods[index])}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                              selectedPeriod === periods[index]
                                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
                                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/80"
                            }`}
                          >
                            {period}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <ModernStatCard
                          key={i}
                          title=""
                          value={0}
                          icon={Users}
                          color="from-gray-600 to-gray-600"
                          isLoading={true}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <ModernStatCard
                        title={t('totalStudents')}
                        value={stats.totalStudents}
                        icon={Users}
                        trend={calculateTrend(stats.totalStudents, previousStats.totalStudents).trend}
                        trendValue={calculateTrend(stats.totalStudents, previousStats.totalStudents).value}
                        color="from-blue-600 to-indigo-600"
                        delay={0}
                      />
                      <ModernStatCard
                        title={t('activeStudents')}
                        value={stats.activeStudents}
                        icon={Activity}
                        trend={calculateTrend(stats.activeStudents, previousStats.activeStudents).trend}
                        trendValue={calculateTrend(stats.activeStudents, previousStats.activeStudents).value}
                        color="from-emerald-600 to-teal-600"
                        delay={50}
                      />
                      <ModernStatCard
                        title={t('totalTeachers')}
                        value={stats.totalTeachers}
                        icon={Briefcase}
                        trend={calculateTrend(stats.totalTeachers, previousStats.totalTeachers).trend}
                        trendValue={calculateTrend(stats.totalTeachers, previousStats.totalTeachers).value}
                        color="from-amber-500 to-orange-600"
                        delay={100}
                      />
                      <ModernStatCard
                        title={t('revenue')}
                        value={stats.totalRevenue}
                        icon={DollarSign}
                        prefix="$"
                        trend={calculateTrend(stats.totalRevenue, previousStats.totalRevenue).trend}
                        trendValue={calculateTrend(stats.totalRevenue, previousStats.totalRevenue).value}
                        color="from-green-600 to-emerald-600"
                        delay={150}
                      />
                      <ModernStatCard
                        title={t('expenses')}
                        value={stats.totalExpenses}
                        icon={TrendingDown}
                        prefix="$"
                        trend={calculateTrend(stats.totalExpenses, previousStats.totalExpenses).trend}
                        trendValue={calculateTrend(stats.totalExpenses, previousStats.totalExpenses).value}
                        color="from-red-600 to-rose-600"
                        delay={200}
                      />
                      <ModernStatCard
                        title={t('netProfit')}
                        value={stats.netProfit}
                        icon={TrendingUp}
                        prefix="$"
                        trend={calculateTrend(stats.netProfit, previousStats.netProfit).trend}
                        trendValue={calculateTrend(stats.netProfit, previousStats.netProfit).value}
                        color="from-purple-600 to-pink-600"
                        delay={250}
                      />
                    </div>
                  )}

                  <div className="bg-white/90 backdrop-blur-xl rounded-xl shadow-sm p-6 border border-gray-100/50">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">{t('revenueOverview')}</h3>
                        <p className="text-xs text-gray-500 mt-1">{t('last7Days')}</p>
                      </div>
                      <button className="p-2 hover:bg-gray-100/80 rounded-lg transition-colors duration-200">
                        <Maximize2 className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                    
                    <div className="h-32 flex items-end gap-2">
                      {revenueData.map((value, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div 
                            className="w-full bg-gradient-to-t from-blue-600 to-indigo-600 rounded-t-lg transition-all duration-500 hover:from-blue-500 hover:to-indigo-500"
                            style={{ height: `${value}%` }}
                          ></div>
                          <span className="text-xs text-gray-500">{days[i]}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">{t('quickActions')}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      <QuickActionCard
                        title={t('addStudent')}
                        description={t('addStudentDesc')}
                        icon={UserPlus}
                        color="from-blue-600 to-indigo-600"
                        onClick={() => handleViewChange("students")}
                      />
                      <QuickActionCard
                        title={t('recordFee')}
                        description={t('recordFeeDesc')}
                        icon={Wallet}
                        color="from-emerald-600 to-teal-600"
                        onClick={() => handleViewChange("fees")}
                      />
                      <QuickActionCard
                        title={t('addExpense')}
                        description={t('addExpenseDesc')}
                        icon={TrendingDown}
                        color="from-red-600 to-rose-600"
                        onClick={() => handleViewChange("expenses")}
                      />
                      <QuickActionCard
                        title={t('viewReports')}
                        description={t('viewReportsDesc')}
                        icon={BarChart3}
                        color="from-purple-600 to-pink-600"
                        onClick={() => handleViewChange("reports")}
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentView === "students" && <StudentsManager onUpdate={() => loadStatistics(false)} />}
              {currentView === "teachers" && <TeachersManager onUpdate={() => loadStatistics(false)} />}
              {currentView === "fees" && <FeesManager onUpdate={() => loadStatistics(false)} />}
              {currentView === "expenses" && <ExpensesManager onUpdate={() => loadStatistics(false)} />}
              {currentView === "reports" && <ProfitReport />}
              {currentView === "financial" && <FinancialReports />}
            </main>
          </div>
        </div>
      </div>
      
      <DataAccuracyIndicator 
        validation={dataValidation} 
        onRefresh={() => loadStatistics(true)} 
      />
    </div>
  );
}