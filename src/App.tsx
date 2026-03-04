import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './components/LandingPage';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

// مكون لحماية المسارات الخاصة (يحتاج تسجيل دخول)
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
}

// مكون للمسارات العامة (يمنع الوصول لها بعد تسجيل الدخول)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  return !user ? <>{children}</> : <Navigate to="/dashboard" />;
}

// المكون الرئيسي للتطبيق مع المسارات
function AppRoutes() {
  return (
    <Routes>
      {/* الصفحة الرئيسية - اللاندينج بيدج (عامة) */}
      <Route path="/" element={
        <PublicRoute>
          <LandingPage />
        </PublicRoute>
      } />
      
      {/* صفحة تسجيل الدخول (عامة) */}
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      
      {/* صفحة التسجيل (عامة) - استخدام useSearchParams داخل Login بدلاً من props */}
      <Route path="/signup" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      
      {/* مسار التجربة المجانية - يعيد التوجيه للتسجيل مع باراميتر */}
      <Route path="/free-trial" element={<Navigate to="/signup?trial=true" />} />
      
      {/* مسار خطط الأسعار - يمكن إضافته لاحقاً */}
      <Route path="/pricing" element={<Navigate to="/#pricing" />} />
      
      {/* لوحة التحكم (خاصة - تحتاج تسجيل دخول) */}
      <Route path="/dashboard" element={
        <PrivateRoute>
          <Dashboard />
        </PrivateRoute>
      } />
      
      {/* مسارات إضافية للوحة التحكم */}
      <Route path="/dashboard/:section" element={
        <PrivateRoute>
          <Dashboard />
        </PrivateRoute>
      } />
      
      {/* مسار غير موجود - إعادة توجيه للصفحة الرئيسية */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

// مكون التطبيق الرئيسي
function AppContent() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  return <AppRoutes />;
}

// التطبيق الرئيسي مع BrowserRouter
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;