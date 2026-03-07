import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  ChevronLeft,
  Star,
  Users,
  TrendingUp,
  Shield,
  Clock,
  Award,
  CheckCircle,
  BarChart3,
  GraduationCap,
  DollarSign,
  FileText,
  PlayCircle,
  ArrowRight,
  Zap,
  Lock,
  Facebook,
  Instagram,
  Linkedin,
  Pause,
  Volume2,
  VolumeX,
} from "lucide-react";
import logo from "../assets/logo.png";
import abstractTechBg from "../assets/edarty_abstract_tech_bg.png";
import company1 from "../assets/partners/company1.png";
import company2 from "../assets/partners/company2.png";
import company3 from "../assets/partners/company3.png";
import company4 from "../assets/partners/company4.png";
import demoVideo from "../assets/videos/kling_20260303_Image_to_Video_Futuristic_4964_0.mp4";
import demoVideoWebm from "../assets/videos/edarty_hero_dashboard.png";
import demoPoster from "../assets/videos/edarty_hero_dashboard.png";

export default function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [isAnnual, setIsAnnual] = useState(false);

  // Video refs and state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const savedScroll = localStorage.getItem("landing_scroll_position");
    const savedSection = localStorage.getItem("landing_section");

    const timer = setTimeout(() => {
      if (savedSection) {
        const element = document.getElementById(savedSection);
        if (element) {
          element.scrollIntoView({ behavior: "smooth" });
        }
      } else if (savedScroll) {
        window.scrollTo({
          top: parseInt(savedScroll),
          behavior: "smooth",
        });
      }
      setIsFirstLoad(false);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  // Video controls
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      localStorage.setItem("landing_section", sectionId);
      localStorage.removeItem("landing_scroll_position");
      window.history.pushState({}, "", `#${sectionId}`);
    }
    setIsMenuOpen(false);
  };

  const handleFreeTrial = () => {
    navigate("/signup?trial=true");
  };

  const handleLogin = () => {
    navigate("/login");
  };

  const handleContactSales = () => {
    window.location.href =
      "mailto:sales@edarty.com?subject=استفسار عن المبيعات";
  };

  return (
    <div
      className="min-h-screen bg-slate-50 font-sans selection:bg-emerald-100 selection:text-emerald-900"
      dir="rtl"
    >
      {/* Header */}
      <header
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? "bg-white/90 backdrop-blur-lg shadow-sm py-3" : "bg-transparent py-5"}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div
              className="flex items-center cursor-pointer group relative"
              onClick={() => scrollToSection("hero")}
            >
              {/* خلفية متحركة */}
              <div className="absolute -inset-3 bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:scale-110 -z-10"></div>

              {/* اللوجو مع تأثيرات */}
              <div className="relative">
                <img
                  src={logo}
                  alt="Edarty Logo"
                  className="h-16 md:h-14 w-auto relative z-10 transition-all duration-300 group-hover:scale-105 group-hover:brightness-110"
                />

                {/* دائرة خفيفة خلف اللوجو */}
                <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              {["features", "benefits", "pricing", "testimonials"].map(
                (item) => (
                  <button
                    key={item}
                    onClick={() => scrollToSection(item)}
                    className="text-slate-600 hover:text-emerald-600 transition-colors font-medium text-sm uppercase tracking-wide"
                  >
                    {item === "features"
                      ? "المميزات"
                      : item === "benefits"
                        ? "الفوائد"
                        : item === "pricing"
                          ? "الأسعار"
                          : "آراء العملاء"}
                  </button>
                ),
              )}
            </nav>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-4">
              <button
                onClick={handleLogin}
                className="px-5 py-2 text-slate-700 hover:text-emerald-600 transition-colors font-semibold text-sm"
              >
                تسجيل الدخول
              </button>
              <button
                onClick={handleFreeTrial}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-full font-bold text-sm hover:bg-emerald-600 transition-all shadow-lg shadow-slate-900/10 hover:shadow-emerald-600/20 transform hover:-translate-y-0.5"
              >
                ابدأ الآن مجاناً
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-full bg-slate-100 text-slate-900"
            >
              {isMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-white border-t border-slate-100 shadow-xl py-6 px-6 animate-in fade-in slide-in-from-top-5">
            <nav className="flex flex-col gap-4">
              <button
                onClick={() => scrollToSection("features")}
                className="text-right py-2 text-slate-600 font-medium"
              >
                المميزات
              </button>
              <button
                onClick={() => scrollToSection("benefits")}
                className="text-right py-2 text-slate-600 font-medium"
              >
                الفوائد
              </button>
              <button
                onClick={() => scrollToSection("pricing")}
                className="text-right py-2 text-slate-600 font-medium"
              >
                الأسعار
              </button>
              <div className="h-px bg-slate-100 my-2"></div>
              <button
                onClick={handleLogin}
                className="text-right py-2 text-slate-900 font-bold"
              >
                تسجيل الدخول
              </button>
              <button
                onClick={handleFreeTrial}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold"
              >
                ابدأ تجربة مجانية
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section
        id="hero"
        className="relative pt-40 pb-24 lg:pt-52 lg:pb-40 overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: `url(${abstractTechBg})` }}
      >
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-slate-900/70"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full mb-8 border border-emerald-100 animate-bounce-slow">
              <Zap className="w-4 h-4 fill-emerald-600 text-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wider">
                مستقبل الإدارة المحاسبية هنا
              </span>
            </div>

            <h1 className="text-5xl lg:text-7xl font-black text-white mb-8 leading-[1.1]">
              أدِر عملك بذكاء مع <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-200 to-emerald-400">
                إدارتــي Edarty
              </span>
            </h1>

            <p className="text-lg lg:text-xl text-slate-200 mb-12 leading-relaxed max-w-2xl mx-auto">
              المنصة الأكثر تطوراً لإدارة المحاسبة والعمليات البرمجية. صُممت
              خصيصاً لتوفير وقتك وزيادة أرباحك بدقة متناهية.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleFreeTrial}
                className="w-full sm:w-auto px-10 py-4 bg-emerald-600 text-white rounded-full font-bold text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 transform hover:scale-105 flex items-center justify-center gap-2"
              >
                ابدأ الآن مجاناً
                <ArrowRight className="w-5 h-5 rotate-180" />
              </button>
              <button
                onClick={() => scrollToSection("features")}
                className="w-full sm:w-auto px-10 py-4 bg-white text-slate-900 border border-slate-200 rounded-full font-bold text-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
              >
                <PlayCircle className="w-5 h-5 text-emerald-600" />
                شاهد العرض
              </button>
            </div>

            {/* Hero Video - Dashboard */}
            <div className="relative w-full mt-20">
              {/* إزالة max-w-7xl للعرض الكامل */}
              <div className="relative w-full px-4 sm:px-6 lg:px-8">
                <div className="relative rounded-2xl lg:rounded-3xl overflow-hidden shadow-2xl border border-slate-700/50 bg-slate-900">
                  <div className="relative aspect-video w-full overflow-hidden">
                    <video
                      ref={videoRef}
                      className="absolute inset-0 w-full h-full object-cover scale-105 hover:scale-100 transition-transform duration-10000 ease-in-out"
                      autoPlay
                      muted
                      loop
                      playsInline
                      poster={demoPoster}
                    >
                      <source src={demoVideo} type="video/mp4" />
                      <source src={demoVideoWebm} type="video/webm" />
                      متصفحك لا يدعم تشغيل الفيديو.
                    </video>

                    {/* تراكب خفيف جداً لتحسين المظهر */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 via-transparent to-slate-900/20 pointer-events-none"></div>
                  </div>
                </div>
              </div>
              {/* تأثير الإضاءة السفلي */}
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-3/4 max-w-4xl h-20 bg-emerald-500/20 blur-3xl -z-10"></div>
            </div>

            {/* Trust Badges */}
            <div className="mt-16 pt-16 border-t border-slate-700/60">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-8">
                شركاء موثوقون يثقون في إدارتــي لتطوير أعمالهم
              </p>
              <div className="flex flex-wrap justify-center gap-8 lg:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all">
                {[company1, company2, company3, company4].map((logo, index) => (
                  <img
                    key={index}
                    src={logo}
                    alt={`partner-${index + 1}`}
                    className="h-8 w-auto object-contain transition-all duration-300 hover:opacity-100 hover:grayscale-0 hover:scale-110"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-emerald-600 font-bold text-sm uppercase tracking-widest mb-3">
              المميزات التقنية
            </h2>
            <p className="text-3xl lg:text-4xl font-black text-slate-900">
              كل ما تحتاجه في مكان واحد
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <BarChart3 />,
                title: "تقارير ذكية",
                desc: "تحليلات دقيقة لحظة بلحظة لمبيعاتك ومصروفاتك.",
              },
              {
                icon: <Shield />,
                title: "أمان فائق",
                desc: "تشفير بياناتك بأعلى المعايير العالمية لضمان الخصوصية.",
              },
              {
                icon: <Users />,
                title: "إدارة الفريق",
                desc: "توزيع الصلاحيات ومتابعة أداء الموظفين بكل سهولة.",
              },
              {
                icon: <DollarSign />,
                title: "الفواتير الآلية",
                desc: "إصدار فواتير احترافية متوافقة مع المتطلبات الضريبية.",
              },
              {
                icon: <Clock />,
                title: "توفير الوقت",
                desc: "أتمتة العمليات المتكررة لتركز على نمو عملك.",
              },
              {
                icon: <Lock />,
                title: "نسخ احتياطي",
                desc: "حفظ تلقائي لبياناتك لضمان عدم فقدان أي معلومة.",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="p-8 rounded-3xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-2xl hover:shadow-slate-200/50 transition-all group"
              >
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section - بعد قسم المميزات وقبل testimonials */}
      <section
        id="pricing"
        className="py-24 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden"
      >
        {/* خلفية زخرفية */}
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]"></div>
        <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-emerald-500/5 to-transparent"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* عنوان القسم */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full mb-6 border border-emerald-100">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">
                خطط مرنة تناسب الجميع
              </span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-slate-900 mb-4">
              اختر الخطة المناسبة لعملك
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              ابدأ مجاناً وطور عملك مع خططنا المميزة. جميع الباقات تشمل تحديثات
              مجانية ودعم فني.
            </p>

            {/* تبديل سنوي/شهري */}
            <div className="flex items-center justify-center gap-4 mt-10">
              <span
                className={`text-sm font-medium transition-colors ${!isAnnual ? "text-emerald-600" : "text-slate-400"}`}
              >
                شهري
              </span>
              <button
                onClick={() => setIsAnnual(!isAnnual)}
                className="relative w-16 h-8 bg-slate-200 rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                <div
                  className={`absolute w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${isAnnual ? "translate-x-8" : "translate-x-0"}`}
                ></div>
              </button>
              <span
                className={`text-sm font-medium transition-colors ${isAnnual ? "text-emerald-600" : "text-slate-400"}`}
              >
                سنوي
                <span className="mr-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                  وفر 20%
                </span>
              </span>
            </div>
          </div>

          {/* بطاقات الأسعار */}
          <div className="grid lg:grid-cols-4 gap-6 mb-12">
            {/* الباقة المجانية */}
            <div className="group relative bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-100 hover:border-emerald-200 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/0 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>

              {/* شريط علوي */}
              <div className="h-2 bg-gradient-to-l from-slate-400 to-slate-300"></div>

              <div className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-slate-900">مجانية</h3>
                  <span className="text-sm bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                    للبدء
                  </span>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-black text-slate-900">0</span>
                  <span className="text-slate-400 mr-2">ج.م/شهرياً</span>
                </div>

                <p className="text-slate-500 mb-8 line-clamp-2">
                  مثالية للأعمال الصغيرة جداً والبداية
                </p>

                <ul className="space-y-4 mb-8">
                  {[
                    "حتى 30 عميل",
                    "تقارير أساسية",
                    "دعم عبر البريد الإلكتروني",
                    "مساحة تخزين 1 جيجابايت",
                    "فواتير غير محدودة",
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      <span className="text-slate-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={handleFreeTrial}
                  className="w-full py-4 border-2 border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 hover:border-emerald-600 hover:text-emerald-600 transition-all group-hover:shadow-lg"
                >
                  ابدأ مجاناً
                </button>
              </div>
            </div>

            {/* الباقة الاحترافية */}
            <div className="group relative bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-emerald-500 overflow-hidden transform lg:-translate-y-4">
              {/* شريط علوي متدرج */}
              <div className="h-2 bg-gradient-to-l from-emerald-500 via-emerald-400 to-emerald-500"></div>

              {/* شارة الأكثر شهرة */}
              <div className="absolute top-6 left-6">
                <div className="bg-gradient-to-l from-emerald-500 to-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1">
                  <Star className="w-3 h-3 fill-white" />
                  الأكثر شهرة
                </div>
              </div>

              <div className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-slate-900">
                    احترافية
                  </h3>
                  <span className="text-sm bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full">
                    الأفضل مبيعاً
                  </span>
                </div>

                <div className="mb-2">
                  <span className="text-5xl font-black text-slate-900">
                    {isAnnual ? "799" : "899"}
                  </span>
                  <span className="text-slate-400 mr-2">ج.م/شهرياً</span>
                </div>

                {isAnnual && (
                  <div className="text-sm text-emerald-600 font-medium mb-4">
                    توفير 1200 ج.م سنوياً
                  </div>
                )}

                <p className="text-slate-500 mb-8">
                  كل ما تحتاجه لإدارة شركتك بكفاءة عالية
                </p>

                <ul className="space-y-4 mb-8">
                  {[
                    "عملاء غير محدودين",
                    "تقارير متقدمة وتحليلات ذكية",
                    "دعم فني على مدار الساعة",
                    "مساحة تخزين 50 جيجابايت",
                    "فواتير إلكترونية ضريبية",
                    "صلاحيات متعددة للمستخدمين",
                    "نسخ احتياطي يومي",
                    "نقطة بيع متكاملة",
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      <span className="text-slate-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={handleFreeTrial}
                  className="w-full py-4 bg-gradient-to-l from-emerald-600 to-emerald-500 text-white rounded-2xl font-bold hover:from-emerald-700 hover:to-emerald-600 transition-all shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:shadow-emerald-600/30 transform hover:-translate-y-0.5"
                >
                  ابدأ تجربتك المجانية
                </button>
              </div>
            </div>

            {/* الباقة المتقدمة */}
            <div className="group relative bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-100 hover:border-emerald-200 overflow-hidden">
              <div className="h-2 bg-gradient-to-l from-slate-600 to-slate-500"></div>

              <div className="p-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-slate-900">متقدمة</h3>
                  <span className="text-sm bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
                    للشركات
                  </span>
                </div>

                <div className="mb-2">
                  <span className="text-5xl font-black text-slate-900">
                    {isAnnual ? "1,599" : "1,799"}
                  </span>
                  <span className="text-slate-400 mr-2">ج.م/شهرياً</span>
                </div>

                {isAnnual && (
                  <div className="text-sm text-emerald-600 font-medium mb-4">
                    توفير 2400 ج.م سنوياً
                  </div>
                )}

                <p className="text-slate-500 mb-8">
                  للشركات الكبيرة التي تحتاج حلول متكاملة
                </p>

                <ul className="space-y-4 mb-8">
                  {[
                    "كل مميزات الباقة الاحترافية",
                    "API متكامل للتطوير",
                    "تقارير مخصصة",
                    "مساحة تخزين 200 جيجابايت",
                    "مدير حساب مخصص",
                    "تدريب فريق العمل",
                    "تكامل مع الأنظمة الخارجية",
                    "ضمان استمرارية الأعمال",
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      <span className="text-slate-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={handleContactSales}
                  className="w-full py-4 border-2 border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 hover:border-emerald-600 hover:text-emerald-600 transition-all"
                >
                  تواصل مع المبيعات
                </button>
              </div>
            </div>

            {/* باقة المؤسسات */}
            <div className="group relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl shadow-2xl overflow-hidden">
              <div className="absolute inset-0 bg-grid-white/10 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]"></div>

              <div className="h-2 bg-gradient-to-l from-amber-500 to-amber-400"></div>

              <div className="p-8 relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-white">مؤسسات</h3>
                  <span className="text-sm bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full border border-amber-500/30">
                    حلول مخصصة
                  </span>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-black text-white">مخصصة</span>
                </div>

                <p className="text-slate-300 mb-8">
                  حلول مصممة خصيصاً لاحتياجات مؤسستك
                </p>

                <ul className="space-y-4 mb-8">
                  {[
                    "كل المميزات السابقة",
                    "خادم خاص مخصص",
                    "دعم فني 24/7/365",
                    "تطويرات مخصصة",
                    "استشارات متقدمة",
                    "تكامل مع أنظمتك الحالية",
                    "ضمان تشغيلي 99.9%",
                    "تدريب متقدم للفريق",
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <CheckCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                      <span className="text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={handleContactSales}
                  className="w-full py-4 bg-amber-500 text-slate-900 rounded-2xl font-bold hover:bg-amber-400 transition-all shadow-lg shadow-amber-600/20"
                >
                  تواصل معنا
                </button>
              </div>
            </div>
          </div>

          {/* مقارنة المميزات */}
          <div className="bg-white rounded-3xl shadow-xl p-8 lg:p-12 border border-slate-100">
            <h3 className="text-2xl font-bold text-slate-900 mb-8 text-center">
              مقارنة شاملة للمميزات
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-right py-4 px-6 text-slate-600 font-medium">
                      الميزة
                    </th>
                    <th className="text-center py-4 px-6 text-slate-600 font-medium">
                      المجانية
                    </th>
                    <th className="text-center py-4 px-6 text-emerald-600 font-medium bg-emerald-50">
                      الاحترافية
                    </th>
                    <th className="text-center py-4 px-6 text-slate-600 font-medium">
                      المتقدمة
                    </th>
                    <th className="text-center py-4 px-6 text-slate-600 font-medium">
                      المؤسسات
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      name: "عدد العملاء",
                      free: "30",
                      pro: "غير محدود",
                      advanced: "غير محدود",
                      enterprise: "غير محدود",
                    },
                    {
                      name: "الفواتير",
                      free: "✓",
                      pro: "✓",
                      advanced: "✓",
                      enterprise: "✓",
                    },
                    {
                      name: "التقارير الأساسية",
                      free: "✓",
                      pro: "✓",
                      advanced: "✓",
                      enterprise: "✓",
                    },
                    {
                      name: "التقارير المتقدمة",
                      free: "-",
                      pro: "✓",
                      advanced: "✓",
                      enterprise: "✓",
                    },
                    {
                      name: "صلاحيات المستخدمين",
                      free: "1 مستخدم",
                      pro: "حتى 10",
                      advanced: "حتى 25",
                      enterprise: "غير محدود",
                    },
                    {
                      name: "الدعم الفني",
                      free: "بريد إلكتروني",
                      pro: "24/7",
                      advanced: "24/7",
                      enterprise: "مدير حساب",
                    },
                    {
                      name: "مساحة التخزين",
                      free: "1 جيجابايت",
                      pro: "50 جيجابايت",
                      advanced: "200 جيجابايت",
                      enterprise: "غير محدود",
                    },
                    {
                      name: "API",
                      free: "-",
                      pro: "محدود",
                      advanced: "✓",
                      enterprise: "✓",
                    },
                    {
                      name: "نسخ احتياطي",
                      free: "أسبوعي",
                      pro: "يومي",
                      advanced: "يومي",
                      enterprise: "فوري",
                    },
                  ].map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-4 px-6 text-slate-800 font-medium">
                        {row.name}
                      </td>
                      <td className="text-center py-4 px-6 text-slate-600">
                        {row.free}
                      </td>
                      <td className="text-center py-4 px-6 text-emerald-600 font-medium bg-emerald-50/50">
                        {row.pro}
                      </td>
                      <td className="text-center py-4 px-6 text-slate-600">
                        {row.advanced}
                      </td>
                      <td className="text-center py-4 px-6 text-slate-600">
                        {row.enterprise}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* شهادات الثقة */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8">
            <div className="flex items-center gap-2 text-slate-500">
              <Shield className="w-5 h-5 text-emerald-500" />
              <span className="text-sm">
                ضمان استعادة الأموال لمدة 30 يوماً
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <span className="text-sm">لا تحتاج بطاقة ائتمان للبدء</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <Clock className="w-5 h-5 text-emerald-500" />
              <span className="text-sm">إلغاء في أي وقت</span>
            </div>
          </div>

          {/* FAQ سريع */}
          <div className="mt-20 text-center">
            <h3 className="text-2xl font-bold text-slate-900 mb-4">
              لديك أسئلة؟
            </h3>
            <p className="text-slate-600 mb-6">
              فريقنا جاهز للإجابة على جميع استفساراتك
            </p>
            <button
              onClick={handleContactSales}
              className="inline-flex items-center gap-2 text-emerald-600 font-bold hover:text-emerald-700 transition-colors"
            >
              تواصل مع فريق المبيعات
              <ArrowRight className="w-4 h-4 rotate-180" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-2">
              <div className="flex items-center gap-3 mb-8">
                <img
                  src={logo}
                  alt="Logo"
                  className="h-10 w-auto brightness-0 invert"
                />
                <span className="text-2xl font-black tracking-tight">
                  إدارتــي
                </span>
              </div>
              <p className="text-slate-400 text-lg max-w-md leading-relaxed">
                نحن هنا لنغير مفهوم الإدارة المحاسبية. انضم إلى آلاف الشركات
                التي تثق في إدارتي لتطوير أعمالها.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-6">روابط سريعة</h4>
              <ul className="space-y-4">
                <li>
                  <button
                    onClick={() => scrollToSection("features")}
                    className="text-slate-400 hover:text-emerald-400 transition-colors"
                  >
                    المميزات
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("pricing")}
                    className="text-slate-400 hover:text-emerald-400 transition-colors"
                  >
                    الأسعار
                  </button>
                </li>
                <li>
                  <button
                    onClick={handleContactSales}
                    className="text-slate-400 hover:text-emerald-400 transition-colors"
                  >
                    تواصل معنا
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-lg mb-6">تابعنا</h4>
              <div className="flex gap-4">
                <a
                  href="https://www.facebook.com/profile.php?id=100087746733220"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center hover:bg-emerald-600 transition-all cursor-pointer"
                >
                  <Facebook className="w-5 h-5 text-white" />
                </a>

                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center hover:bg-emerald-600 transition-all cursor-pointer"
                >
                  <Instagram className="w-5 h-5 text-white" />
                </a>

                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center hover:bg-emerald-600 transition-all cursor-pointer"
                >
                  <Linkedin className="w-5 h-5 text-white" />
                </a>
              </div>
            </div>{" "}
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col md:row justify-between items-center gap-4">
            <p className="text-slate-500 text-sm">
              © 2026 إدارتــي Edarty. جميع الحقوق محفوظة
            </p>
            <div className="flex gap-8">
              <button className="text-slate-500 hover:text-white text-sm">
                سياسة الخصوصية
              </button>
              <button className="text-slate-500 hover:text-white text-sm">
                الشروط والأحكام
              </button>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow { animation: bounce-slow 4s ease-in-out infinite; }
      @keyframes bounce-slow {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
.animate-bounce-slow { animation: bounce-slow 4s ease-in-out infinite; }

/* أضف هذه الأنماط الجديدة */
.bg-grid-slate-100 {
  background-image: linear-gradient(to right, #f1f5f9 1px, transparent 1px),
    linear-gradient(to bottom, #f1f5f9 1px, transparent 1px);
  background-size: 24px 24px;
}

.bg-grid-white\/10 {
  background-image: linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
  background-size: 24px 24px;
}`}
      </style>
    </div>
  );
}
