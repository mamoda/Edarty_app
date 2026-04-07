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
} from "lucide-react";

import logo from "../assets/logo.png";
import bg from "../assets/background-wave.png";

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signUp, isAuthenticated } = useAuth();
  const hasRedirected = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const [isLogin, setIsLogin] = useState(true);
  const [currentStep, setCurrentStep] = useState(1);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [fieldErrors, setFieldErrors] = useState({
    email: "",
    password: "",
    fullName: "",
  });

  const [schoolData, setSchoolData] = useState({
    fullName: "",
    schoolName: "",
    schoolAddress: "",
    schoolPhone: "",
    taxNumber: "",
  });

  // 🔁 Auto focus
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  // 🔁 Redirect بعد تسجيل الدخول
  useEffect(() => {
    if (isAuthenticated && !hasRedirected.current) {
      hasRedirected.current = true;
      setSuccess("✅ جارٍ تحويلك للوحة التحكم...");
      setTimeout(() => {
        navigate("/dashboard", { replace: true });
      }, 800);
    }
  }, [isAuthenticated, navigate]);

  // ✅ Validation
  const validateFields = () => {
    const errors = {
      email: "",
      password: "",
      fullName: "",
    };

    if (!email.includes("@")) {
      errors.email = "بريد إلكتروني غير صالح";
    }

    if (password.length < 6) {
      errors.password = "كلمة المرور يجب أن تكون 6 أحرف على الأقل";
    }

    if (!isLogin && currentStep === 1 && !schoolData.fullName) {
      errors.fullName = "الاسم مطلوب";
    }

    setFieldErrors(errors);

    return !errors.email && !errors.password && !errors.fullName;
  };

  // 🚀 Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateFields()) return;

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);

        if (error) {
          setError("❌ بيانات الدخول غير صحيحة");
          setLoading(false);
          return;
        }

        setSuccess("✅ تم تسجيل الدخول بنجاح");
      } else {
        const { error: signUpError } = await signUp(
          email,
          password,
          schoolData.fullName
        );

        if (signUpError) {
          setError("❌ البريد مستخدم بالفعل");
          setLoading(false);
          return;
        }

        // إنشاء مدرسة
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          await supabase.rpc("create_school_for_user", {
            school_name: schoolData.schoolName,
            user_full_name: schoolData.fullName,
          });
        }

        setSuccess("✅ تم إنشاء الحساب بنجاح");

        // Reset
        setIsLogin(true);
        setCurrentStep(1);
        setEmail("");
        setPassword("");
        setSchoolData({
          fullName: "",
          schoolName: "",
          schoolAddress: "",
          schoolPhone: "",
          taxNumber: "",
        });
      }
    } catch {
      setError("❌ حدث خطأ غير متوقع");
    }

    setLoading(false);
  };

  const nextStep = () => {
    if (!validateFields()) return;
    setCurrentStep(2);
  };

  const prevStep = () => setCurrentStep(1);

  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center p-4"
      dir="rtl"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">

          {/* 🔷 Logo */}
          <div className="flex flex-col items-center mb-6">
            <img src={logo} className="h-24 mb-2" />
            <p className="text-gray-600 text-sm text-center">
              بيانات أكثر وتقارير أدق وسهولة استخدام
            </p>
          </div>

          {/* 🔵 Title */}
          <h2 className="text-lg font-bold text-center mb-4">
            {isLogin ? "تسجيل الدخول" : "إنشاء حساب جديد"}
          </h2>

          {/* 🔴 Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-3 text-sm">
              {error}
            </div>
          )}

          {/* 🟢 Success */}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-3 text-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Step 1 */}
            {!isLogin && currentStep === 1 && (
              <>
                <input
                  type="text"
                  placeholder="الاسم الكامل"
                  value={schoolData.fullName}
                  disabled={loading}
                  onChange={(e) =>
                    setSchoolData({ ...schoolData, fullName: e.target.value })
                  }
                  className="w-full p-3 border rounded-lg"
                />
                {fieldErrors.fullName && (
                  <p className="text-red-500 text-xs">
                    {fieldErrors.fullName}
                  </p>
                )}
              </>
            )}

            {/* Email */}
            <input
              ref={emailRef}
              type="email"
              placeholder="example@school.com"
              value={email}
              disabled={loading}
              onChange={(e) => {
                setEmail(e.target.value);
                validateFields();
              }}
              className={`w-full p-3 border rounded-lg ${
                fieldErrors.email ? "border-red-500" : ""
              }`}
            />
            {fieldErrors.email && (
              <p className="text-red-500 text-xs">{fieldErrors.email}</p>
            )}

            {/* Password */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="كلمة المرور"
                value={password}
                disabled={loading}
                onChange={(e) => {
                  setPassword(e.target.value);
                  validateFields();
                }}
                className={`w-full p-3 border rounded-lg ${
                  fieldErrors.password ? "border-red-500" : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-3"
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-red-500 text-xs">{fieldErrors.password}</p>
            )}

            {/* Step 2 */}
            {!isLogin && currentStep === 2 && (
              <>
                <input
                  type="text"
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
              </>
            )}

            {/* Buttons */}
            {isLogin ? (
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white p-3 rounded-lg"
              >
                {loading ? "⏳ جاري التحميل..." : "تسجيل الدخول"}
              </button>
            ) : currentStep === 1 ? (
              <button
                type="button"
                onClick={nextStep}
                className="w-full bg-blue-600 text-white p-3 rounded-lg"
              >
                التالي
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={prevStep}
                  className="w-full bg-gray-300 p-3 rounded-lg"
                >
                  رجوع
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-600 text-white p-3 rounded-lg"
                >
                  {loading ? "⏳ جاري الإنشاء..." : "إنشاء حساب"}
                </button>
              </div>
            )}
          </form>

          {/* Switch */}
          <p className="text-center text-sm mt-4">
            {isLogin ? "ليس لديك حساب؟" : "لديك حساب بالفعل؟"}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 mr-2"
            >
              {isLogin ? "إنشاء حساب" : "تسجيل الدخول"}
            </button>
          </p>
        </div>

        <div className="mt-6 text-center text-sm text-gray-600">
          نظام إداري لحسابات المدارس
        </div>
      </div>
    </div>
  );
}