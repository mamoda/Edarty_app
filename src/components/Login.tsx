// src/components/Login.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  School,
  MapPin,
  Phone,
  CreditCard,
  User,
  CheckCircle,
  Shield,
  ChevronLeft,
  AlertCircle,
} from "lucide-react";
import logo from "../assets/logo.png";
import bg from "../assets/background-wave.png";

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp, isAuthenticated } = useAuth();
  const hasRedirected = useRef(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminCode, setAdminCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);   
  const [schoolData, setSchoolData] = useState({
    fullName: "",
    schoolName: "",
    schoolAddress: "",
    schoolPhone: "",
    taxNumber: "",
  });

  const ADMIN_SECRET_CODE = "Mahmoud17237ESD@";

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    if (isAuthenticated && !hasRedirected.current) {
      hasRedirected.current = true;
      timeoutId = setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 100);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isAuthenticated, navigate]);

  const handleAdminAccess = () => {
    if (adminCode === ADMIN_SECRET_CODE) {
      setIsAdminAuthenticated(true);
      setShowAdminPanel(true);
      setIsLogin(false);
      setCurrentStep(1);
      setAdminCode("");
      setError("");
      setSuccess("✅ تم التحقق من كود المسؤول");
      setTimeout(() => setSuccess(""), 2000);
    } else {
      setError("❌ الكود السري غير صحيح");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);

        if (error) {
          setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
          setLoading(false);
        } else {
          setSuccess("جاري تسجيل الدخول...");
          setLoading(true);
        }
      } else {
        if (!isAdminAuthenticated) {
          setError("⚠️ لا يمكن إنشاء حساب جديد. يرجى إدخال كود المسؤول أولاً");
          setLoading(false);
          return;
        }

        if (!schoolData.fullName || !schoolData.schoolName) {
          setError("يرجى إكمال جميع البيانات المطلوبة");
          setLoading(false);
          return;
        }

        const { error: signUpError } = await signUp(
          email,
          password,
          schoolData.fullName
        );

        if (signUpError) {
          setError("فشل في إنشاء الحساب. البريد الإلكتروني قد يكون مستخدماً بالفعل");
          setLoading(false);
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const { error: rpcError } = await supabase.rpc(
            "create_school_for_user",
            {
              school_name: schoolData.schoolName,
              user_full_name: schoolData.fullName,
            }
          );

          if (rpcError) {
            console.error("RPC error:", rpcError);
            setError("فشل في إنشاء المدرسة");
            setLoading(false);
            return;
          }
        }

        setSuccess("✅ تم إنشاء الحساب بنجاح! جاري التوجيه...");
        setTimeout(() => {
          setIsLogin(true);
          setCurrentStep(1);
          setIsAdminAuthenticated(false);
          setShowAdminPanel(false);
          setEmail("");
          setPassword("");
          setSchoolData({
            fullName: "",
            schoolName: "",
            schoolAddress: "",
            schoolPhone: "",
            taxNumber: "",
          });
          setSuccess("");
        }, 2000);

        setLoading(false);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("حدث خطأ. يرجى المحاولة مرة أخرى");
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (!email || !password || password.length < 6) {
        setError("يرجى إدخال بريد إلكتروني صالح وكلمة مرور لا تقل عن 6 أحرف");
        return;
      }
      if (!schoolData.fullName) {
        setError("يرجى إدخال اسم المستخدم");
        return;
      }
    }
    setError("");
    setCurrentStep(2);
  };

  const prevStep = () => {
    setCurrentStep(1);
    setError("");
  };

  const inputClasses = (fieldName: string) => `
    w-full pr-12 pl-12 py-3.5 
    border-2 rounded-xl 
    transition-all duration-200 
    outline-none
    ${focusedField === fieldName 
      ? 'border-blue-500 ring-4 ring-blue-500/10 bg-white/90' 
      : 'border-gray-200 bg-white/60 hover:bg-white/80'
    }
    focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 focus:bg-white/90
  `;

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center p-4 relative overflow-hidden"
      dir="rtl"
      style={{ 
        backgroundImage: `url(${bg})`,
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-indigo-900/10 to-purple-900/20 backdrop-blur-[2px] -z-0" />
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-400/10 rounded-full blur-3xl animate-pulse delay-2000" />
      </div>

      <div className="w-full max-w-md animate-fadeIn relative z-10">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50">
          <div className="flex flex-col items-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-2xl opacity-30 animate-pulse" />
              <img src={logo} alt="شعار التطبيق" className="h-28 w-auto mb-3 relative" />
            </div>
            <p className="text-gray-600 text-center text-sm mt-2 font-medium">
              بيانات أكثر • تقارير أدق • سهولة استخدام
            </p>
          </div>

          {success && (
            <div className="mb-4 p-4 bg-green-50/90 backdrop-blur-sm border border-green-200 rounded-xl animate-slideDown">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{success}</span>
              </div>
            </div>
          )}

          {!isLogin && !isAdminAuthenticated && (
            <div className="mb-6 p-4 bg-amber-50/90 backdrop-blur-sm border border-amber-200 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Shield className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800">مطلوب كود المسؤول</p>
                  <p className="text-xs text-amber-600">لإنشاء حساب جديد، يرجى إدخال كود المسؤول أولاً</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 mb-8 bg-gray-100/80 backdrop-blur-sm p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setError("");
              }}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all duration-200 relative ${
                isLogin
                  ? "bg-white text-blue-600 shadow-md"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <span className="relative z-10">تسجيل الدخول</span>
              {isLogin && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!isAdminAuthenticated) {
                  setError("⚠️ يرجى إدخال كود المسؤول أولاً للوصول إلى إنشاء الحساب");
                  setTimeout(() => setError(""), 3000);
                  return;
                }
                setIsLogin(false);
                setError("");
                setCurrentStep(1);
              }}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all duration-200 ${
                !isLogin
                  ? "bg-white text-purple-600 shadow-md"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              حساب جديد
            </button>
          </div>

          {showAdminPanel && (
            <div className="mb-6 p-4 bg-gradient-to-r from-green-50/90 to-emerald-50/90 backdrop-blur-sm border border-green-200 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-green-100 rounded-lg">
                  <Shield className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="font-bold text-green-800">✅ تم التحقق من المسؤول</h3>
              </div>
              <p className="text-sm text-green-700">
                يمكنك الآن إنشاء حساب جديد للمدرسة
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isLogin ? (
              <>
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    البريد الإلكتروني
                  </label>
                  <div className="relative">
                    <Mail className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 transition-colors group-focus-within:text-blue-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      className={inputClasses('email')}
                      placeholder="example@school.com"
                      required
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <Lock className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      className={inputClasses('password')}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">تذكرني</span>
                  </label>
                  <button
                    type="button"
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    نسيت كلمة المرور؟
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>جاري التحميل...</span>
                    </div>
                  ) : (
                    "تسجيل الدخول"
                  )}
                </button>
              </>
            ) : (
              <>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                        currentStep === 1 
                          ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md"
                          : "bg-gray-200 text-gray-500"
                      }`}>
                        1
                      </div>
                      <span className={`text-sm font-medium ${
                        currentStep === 1 ? "text-blue-600" : "text-gray-400"
                      }`}>
                        بيانات الدخول
                      </span>
                    </div>
                    <div className="flex-1 h-0.5 bg-gray-200 mx-4">
                      <div className={`h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ${
                        currentStep === 2 ? "w-full" : "w-0"
                      }`} />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                        currentStep === 2 
                          ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md"
                          : "bg-gray-200 text-gray-500"
                      }`}>
                        2
                      </div>
                      <span className={`text-sm font-medium ${
                        currentStep === 2 ? "text-purple-600" : "text-gray-400"
                      }`}>
                        بيانات المدرسة
                      </span>
                    </div>
                  </div>
                </div>

                {currentStep === 1 ? (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        الاسم الكامل
                      </label>
                      <div className="relative">
                        <User className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="text"
                          value={schoolData.fullName}
                          onChange={(e) => setSchoolData({ ...schoolData, fullName: e.target.value })}
                          onFocus={() => setFocusedField('fullName')}
                          onBlur={() => setFocusedField(null)}
                          className={inputClasses('fullName')}
                          placeholder="أحمد محمد"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        البريد الإلكتروني
                      </label>
                      <div className="relative">
                        <Mail className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onFocus={() => setFocusedField('signupEmail')}
                          onBlur={() => setFocusedField(null)}
                          className={inputClasses('signupEmail')}
                          placeholder="example@school.com"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        كلمة المرور
                      </label>
                      <div className="relative">
                        <Lock className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onFocus={() => setFocusedField('signupPassword')}
                          onBlur={() => setFocusedField(null)}
                          className={inputClasses('signupPassword')}
                          placeholder="••••••••"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        كلمة المرور يجب أن تكون 6 أحرف على الأقل
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={nextStep}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3.5 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                    >
                      التالي: بيانات المدرسة
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={prevStep}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 font-medium transition-colors mb-4"
                    >
                      <ChevronLeft className="w-5 h-5" />
                      العودة
                    </button>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        اسم المدرسة <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <School className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="text"
                          value={schoolData.schoolName}
                          onChange={(e) => setSchoolData({ ...schoolData, schoolName: e.target.value })}
                          onFocus={() => setFocusedField('schoolName')}
                          onBlur={() => setFocusedField(null)}
                          className={inputClasses('schoolName')}
                          placeholder="مدارس الإدارة التعليمية"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        عنوان المدرسة
                      </label>
                      <div className="relative">
                        <MapPin className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="text"
                          value={schoolData.schoolAddress}
                          onChange={(e) => setSchoolData({ ...schoolData, schoolAddress: e.target.value })}
                          onFocus={() => setFocusedField('schoolAddress')}
                          onBlur={() => setFocusedField(null)}
                          className={inputClasses('schoolAddress')}
                          placeholder="القاهرة، مصر"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        هاتف المدرسة
                      </label>
                      <div className="relative">
                        <Phone className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="tel"
                          value={schoolData.schoolPhone}
                          onChange={(e) => setSchoolData({ ...schoolData, schoolPhone: e.target.value })}
                          onFocus={() => setFocusedField('schoolPhone')}
                          onBlur={() => setFocusedField(null)}
                          className={inputClasses('schoolPhone')}
                          placeholder="01234567890"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        الرقم الضريبي <span className="text-gray-400 text-xs">(اختياري)</span>
                      </label>
                      <div className="relative">
                        <CreditCard className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="text"
                          value={schoolData.taxNumber}
                          onChange={(e) => setSchoolData({ ...schoolData, taxNumber: e.target.value })}
                          onFocus={() => setFocusedField('taxNumber')}
                          onBlur={() => setFocusedField(null)}
                          className={inputClasses('taxNumber')}
                          placeholder="123-456-789"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all duration-200 disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>جاري إنشاء الحساب...</span>
                        </div>
                      ) : (
                        "إنشاء الحساب"
                      )}
                    </button>
                  </>
                )}
              </>
            )}

            {error && (
              <div className="p-4 bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-xl animate-shake">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </div>
            )}
          </form>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="relative">
              <input
                type="password"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAdminAccess()}
                placeholder="كود المسؤول (مطلوب لإنشاء حساب جديد)"
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white/60 backdrop-blur-sm"
              />
              <button
                type="button"
                onClick={handleAdminAccess}
                className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1.5 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
              >
                {isAdminAuthenticated ? "✓ تم التحقق" : "تحقق"}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              ⚠️ كود المسؤول مطلوب لإنشاء حساب جديد للمدرسة
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-white/80 font-medium drop-shadow-lg">
            نظام إدارتــي لحسابات المدارس والمؤسسات التعليمية
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
        
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
        
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
        
        .delay-1000 {
          animation-delay: 1s;
        }
        
        .delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}