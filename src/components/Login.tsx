// src/components/Login.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff,
  School,
  MapPin,
  Phone,
  CreditCard,
  User
} from 'lucide-react';
import logo from '../assets/logo.png';
import bg from '../assets/background-wave.png';

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp, isAuthenticated, loading: authLoading } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  
  const [schoolData, setSchoolData] = useState({
    fullName: '',
    schoolName: '',
    schoolAddress: '',
    schoolPhone: '',
    taxNumber: '',
  });

  const ADMIN_SECRET_CODE = 'Mahmoud17237ESD@';

  // ✅ التوجيه التلقائي عند تسجيل الدخول
useEffect(() => {
  let timeoutId: NodeJS.Timeout;
  
  if (isAuthenticated) {
    // تأخير بسيط لتجنب throttle
    timeoutId = setTimeout(() => {
      navigate('/dashboard', { replace: true });
    }, 50);
  }
  
  return () => {
    if (timeoutId) clearTimeout(timeoutId);
  };
}, [isAuthenticated, navigate]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        console.log("🔐 Attempting login for:", email);
        const { error } = await signIn(email, password);
        
        if (error) {
          console.error("Login error:", error);
          setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
          setLoading(false);
        } else {
          console.log("✅ Login successful, waiting for redirect...");
          // لا نحتاج لـ navigate هنا لأن useEffect سيتولى الأمر
          setLoading(false);
        }
      } else {
        // تسجيل مستخدم جديد
        if (!schoolData.fullName || !schoolData.schoolName) {
          setError('يرجى إكمال جميع البيانات المطلوبة');
          setLoading(false);
          return;
        }

        console.log("📝 Attempting signup for:", email);
        const { error: signUpError } = await signUp(email, password, schoolData.fullName);
        
        if (signUpError) {
          setError('فشل في إنشاء الحساب. البريد الإلكتروني قد يكون مستخدماً بالفعل');
          setLoading(false);
          return;
        }
        
        // الحصول على المستخدم بعد التسجيل
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;
        
        if (userId) {
          // إنشاء مدرسة جديدة
          const { data: newSchool } = await supabase
            .from('schools')
            .insert({
              name: schoolData.schoolName,
              address: schoolData.schoolAddress,
              phone: schoolData.schoolPhone,
              email: email,
              tax_number: schoolData.taxNumber,
              status: 'active',
              subscription_plan: 'free'
            })
            .select()
            .single();

          if (newSchool) {
            // تحديث المستخدم
            await supabase
              .from('users')
              .update({
                school_id: newSchool.id,
                school_name: schoolData.schoolName,
                school_address: schoolData.schoolAddress,
                school_phone: schoolData.schoolPhone,
                tax_number: schoolData.taxNumber,
                full_name: schoolData.fullName,
                role: 'admin'
              })
              .eq('id', userId);
            
            // إضافة دور المستخدم
            await supabase
              .from('user_school_roles')
              .insert({
                user_id: userId,
                school_id: newSchool.id,
                role: 'admin',
                is_primary: true,
                permissions: []
              });
          }
        }

        alert('✅ تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول');
        setIsLogin(true);
        setCurrentStep(1);
        setEmail('');
        setPassword('');
        setSchoolData({
          fullName: '',
          schoolName: '',
          schoolAddress: '',
          schoolPhone: '',
          taxNumber: '',
        });
        setLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('حدث خطأ. يرجى المحاولة مرة أخرى');
      setLoading(false);
    }
  };
  
  const handleAdminAccess = () => {
    if (adminCode === ADMIN_SECRET_CODE) {
      setShowAdminPanel(true);
      setIsLogin(false);
      setCurrentStep(1);
      setAdminCode('');
    } else {
      alert('❌ الكود السري غير صحيح');
    }
  };

  const nextStep = () => {
    if (currentStep === 1) {
      if (!email || !password || password.length < 6) {
        setError('يرجى إدخال بريد إلكتروني صالح وكلمة مرور لا تقل عن 6 أحرف');
        return;
      }
      if (!schoolData.fullName) {
        setError('يرجى إدخال اسم المستخدم');
        return;
      }
    }
    setError('');
    setCurrentStep(2);
  };

  const prevStep = () => {
    setCurrentStep(1);
    setError('');
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center p-4"
      dir="rtl"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex flex-col items-center mb-8">
            <img
              src={logo}
              alt="شعار التطبيق"
              className="h-28 w-auto mb-3"
            />
            <p className="text-gray-600 text-center text-lg">
              بيانات أكثر وتقارير أدق وسهولة استخدام
            </p>
          </div>

          {/* أزرار التبديل */}
          {!showAdminPanel && (
            <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-3 px-4 rounded-md font-medium transition-all text-base ${
                  isLogin
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                تسجيل الدخول
              </button>
            </div>
          )}

          {/* لوحة المسؤول */}
          {showAdminPanel && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="w-5 h-5 text-yellow-600" />
                <h3 className="font-medium text-yellow-800">لوحة تحكم المسؤول</h3>
              </div>
              <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(true);
                    setCurrentStep(1);
                  }}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                    isLogin
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  تسجيل الدخول
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(false);
                    setCurrentStep(1);
                  }}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                    !isLogin
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  إنشاء حساب جديد
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isLogin ? (
              /* نموذج تسجيل الدخول */
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    البريد الإلكتروني
                  </label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      placeholder="example@school.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    كلمة المرور
                  </label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pr-10 pl-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  {loading ? 'جارٍ التحميل...' : 'تسجيل الدخول'}
                </button>
              </>
            ) : (
              /* نموذج إنشاء حساب جديد */
              <>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${currentStep === 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                      الخطوة 1: بيانات الدخول
                    </span>
                    <span className="text-gray-300">→</span>
                    <span className={`text-sm font-medium ${currentStep === 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                      الخطوة 2: بيانات المدرسة
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: currentStep === 1 ? '50%' : '100%' }}
                    />
                  </div>
                </div>

                {currentStep === 1 ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الاسم الكامل
                      </label>
                      <div className="relative">
                        <User className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="text"
                          value={schoolData.fullName}
                          onChange={(e) => setSchoolData({...schoolData, fullName: e.target.value})}
                          className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                          placeholder="أحمد محمد"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        البريد الإلكتروني
                      </label>
                      <div className="relative">
                        <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                          placeholder="example@school.com"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        كلمة المرور
                      </label>
                      <div className="relative">
                        <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pr-10 pl-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                          placeholder="••••••••"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">كلمة المرور يجب أن تكون 6 أحرف على الأقل</p>
                    </div>

                    <button
                      type="button"
                      onClick={nextStep}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-all shadow-lg hover:shadow-xl"
                    >
                      التالي: بيانات المدرسة
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        اسم المدرسة <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <School className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="text"
                          value={schoolData.schoolName}
                          onChange={(e) => setSchoolData({...schoolData, schoolName: e.target.value})}
                          className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                          placeholder="مدارس الإدارة التعليمية"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        عنوان المدرسة
                      </label>
                      <div className="relative">
                        <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="text"
                          value={schoolData.schoolAddress}
                          onChange={(e) => setSchoolData({...schoolData, schoolAddress: e.target.value})}
                          className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                          placeholder="القاهرة، مصر"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        هاتف المدرسة
                      </label>
                      <div className="relative">
                        <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="tel"
                          value={schoolData.schoolPhone}
                          onChange={(e) => setSchoolData({...schoolData, schoolPhone: e.target.value})}
                          className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                          placeholder="01234567890"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الرقم الضريبي (اختياري)
                      </label>
                      <div className="relative">
                        <CreditCard className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="text"
                          value={schoolData.taxNumber}
                          onChange={(e) => setSchoolData({...schoolData, taxNumber: e.target.value})}
                          className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                          placeholder="123-456-789"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={prevStep}
                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-3 px-4 rounded-lg transition-all"
                      >
                        السابق
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
                      >
                        {loading ? 'جارٍ الإنشاء...' : 'إنشاء الحساب'}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
          </form>

          {!showAdminPanel && (
            <div className="mt-4">
              <div className="relative">
                <input
                  type="password"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  placeholder="كود المسؤول"
                  className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={handleAdminAccess}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors"
                >
                  دخول
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>نظام إدارتــي لحسابات المدارس والمؤسسات التعليمية</p>
        </div>
      </div>
    </div>
  );
}