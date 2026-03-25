// src/components/Login.tsx
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { School, Lock, MapPin, Phone, CreditCard, User, Mail, Eye, EyeOff } from 'lucide-react';
import logo from '../assets/logo.png';
import bg from '../assets/background-wave.png';

export default function Login() {
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

  const { signIn, signUp } = useAuth();

  const ADMIN_SECRET_CODE = 'Mahmoud17237ESD@';

  // ✅ FIXED: async + no TS errors
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
        }
      } else {
        if (!schoolData.fullName || !schoolData.schoolName) {
          setError('يرجى إكمال جميع البيانات المطلوبة');
          setLoading(false);
          return;
        }

        const { error: signUpError } = await signUp(
          email,
          password,
          schoolData.fullName
        );

        if (signUpError) {
          setError('فشل في إنشاء الحساب. البريد الإلكتروني قد يكون مستخدماً بالفعل');
          return;
        }

        // ✅ جلب اليوزر بعد التسجيل
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const userId = session?.user?.id;

        if (userId) {
          // إنشاء مدرسة
          const { data: newSchool, error: schoolError } = await supabase
            .from('schools')
            .insert({
              name: schoolData.schoolName,
              address: schoolData.schoolAddress,
              phone: schoolData.schoolPhone,
              email: email,
              tax_number: schoolData.taxNumber,
              status: 'active',
              subscription_plan: 'free',
            })
            .select()
            .single();

          if (schoolError) {
            console.error(schoolError);
          }

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
                role: 'admin',
              })
              .eq('id', userId);

            // إضافة role
            await supabase.from('user_school_roles').insert({
              user_id: userId,
              school_id: newSchool.id,
              role: 'admin',
              is_primary: true,
              permissions: [],
            });
          }
        }

        alert('✅ تم إنشاء الحساب بنجاح!');
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
      }
    } catch (err) {
      console.error(err);
      setError('حدث خطأ. يرجى المحاولة مرة أخرى');
    } finally {
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

          {/* LOGO */}
          <div className="flex flex-col items-center mb-8">
            <img src={logo} alt="شعار التطبيق" className="h-28 w-auto mb-3" />
            <p className="text-gray-600 text-center text-lg">
              بيانات أكثر وتقارير أدق وسهولة استخدام
            </p>
          </div>

          {/* SWITCH */}
          {!showAdminPanel && (
            <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className="flex-1 py-3 bg-white text-blue-600 rounded-md"
              >
                تسجيل الدخول
              </button>
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isLogin ? (
              <>
                <input
                  type="email"
                  placeholder="البريد الإلكتروني"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                />

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="كلمة المرور"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-2 top-2"
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white p-3 rounded-lg"
                >
                  {loading ? 'جارٍ التحميل...' : 'تسجيل الدخول'}
                </button>
              </>
            ) : (
              <>
                {currentStep === 1 ? (
                  <>
                    <input
                      placeholder="الاسم"
                      value={schoolData.fullName}
                      onChange={(e) =>
                        setSchoolData({ ...schoolData, fullName: e.target.value })
                      }
                      className="w-full p-3 border rounded-lg"
                    />

                    <input
                      placeholder="الإيميل"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full p-3 border rounded-lg"
                    />

                    <input
                      placeholder="الباسورد"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full p-3 border rounded-lg"
                    />

                    <button type="button" onClick={nextStep}>
                      التالي
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      placeholder="اسم المدرسة"
                      value={schoolData.schoolName}
                      onChange={(e) =>
                        setSchoolData({
                          ...schoolData,
                          schoolName: e.target.value,
                        })
                      }
                      className="w-full p-3 border rounded-lg"
                    />

                    <button type="submit">إنشاء حساب</button>
                  </>
                )}
              </>
            )}

            {error && <p className="text-red-500">{error}</p>}
          </form>

          {/* ADMIN CODE */}
          {!showAdminPanel && (
            <div className="mt-4">
              <input
                type="password"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                placeholder="كود المسؤول"
                className="w-full p-2 border rounded"
              />
              <button onClick={handleAdminAccess}>دخول</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}