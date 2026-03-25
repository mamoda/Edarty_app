// src/context/AuthContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useMemo,
} from "react";
import { supabase } from "../lib/supabase";
import { CustomUser, UserSchoolRole, School, Plan } from "../types/database";

interface AuthContextType {
  user: CustomUser | null;
  loading: boolean;
  currentSchool: School | null;
  currentRole: string | null;
  userRoles: UserSchoolRole[];
  subscriptionPlan: string | null;
  subscriptionExpiresAt: string | null;
  schoolFeatures: string[];
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  switchSchool: (schoolId: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasFeature: (feature: string) => boolean;
  getLimits: () => {
    maxStudents: number;
    maxTeachers: number;
    maxUsers: number;
  };
  canAccessResource: (resource: string, currentCount: number) => boolean;
  refreshSchoolData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<UserSchoolRole[]>([]);
  const [currentSchool, setCurrentSchool] = useState<School | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<string | null>(null);
  const [schoolFeatures, setSchoolFeatures] = useState<string[]>([]);

  // ✅ تحميل بيانات المدرسة الحالية (بما فيها الاشتراك)
  const loadCurrentSchoolData = useCallback(async (schoolId: string) => {
    if (!schoolId) return;

    try {
      const { data: school, error } = await supabase
        .from("schools")
        .select("*")
        .eq("id", schoolId)
        .single();

      if (error) throw error;

      setCurrentSchool(school);
      setSubscriptionPlan(school.subscription_plan);
      setSubscriptionExpiresAt(school.subscription_expires_at);
      setSchoolFeatures(school.features || []);
      
      console.log("✅ School data loaded:", school.name);
    } catch (error) {
      console.error("Error loading school data:", error);
    }
  }, []);

  // ✅ تحميل بيانات المستخدم
  const loadUserData = useCallback(async (supabaseUser: any) => {
    if (!supabaseUser) return;

    try {
      console.log("📥 Loading user data for:", supabaseUser.email);

      const [{ data: profile, error: profileError }, { data: roles, error: rolesError }] =
        await Promise.all([
          supabase
            .from("users")
            .select("*")
            .eq("id", supabaseUser.id)
            .maybeSingle(),
          supabase
            .from("user_school_roles")
            .select("*, school:schools(*)")
            .eq("user_id", supabaseUser.id),
        ]);

      if (profileError) console.error("Profile error:", profileError);
      if (rolesError) console.error("Roles error:", rolesError);

      const customUser: CustomUser = {
        ...supabaseUser,
        school_id: profile?.school_id,
        full_name: profile?.full_name || supabaseUser.user_metadata?.full_name,
        schoolName: profile?.school_name,
        schoolAddress: profile?.school_address,
        schoolPhone: profile?.school_phone,
        taxNumber: profile?.tax_number,
      };

      setUser(customUser);

      if (roles && roles.length > 0) {
        setUserRoles(roles);

        const savedSchoolId = localStorage.getItem(
          `current_school_${supabaseUser.id}`
        );

        const selectedRole =
          roles.find((r) => r.school_id === savedSchoolId) ||
          roles.find((r) => r.is_primary) ||
          roles[0];

        if (selectedRole?.school) {
          setCurrentSchool(selectedRole.school);
          setCurrentRole(selectedRole.role);
          setSubscriptionPlan(selectedRole.school.subscription_plan);
          setSubscriptionExpiresAt(selectedRole.school.subscription_expires_at);
          setSchoolFeatures(selectedRole.school.features || []);
        }
      } else {
        setUserRoles([]);
        setCurrentSchool(null);
        setCurrentRole(null);
      }

      console.log("✅ User data loaded");
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  }, []);

  // ✅ تحديث بيانات المدرسة
  const refreshSchoolData = useCallback(async () => {
    if (currentSchool?.id) {
      await loadCurrentSchoolData(currentSchool.id);
    }
  }, [currentSchool?.id, loadCurrentSchoolData]);

  // ✅ التحقق من الميزات (Feature Gating)
  const hasFeature = useCallback(
    (feature: string): boolean => {
      // Super admin لديه كل الميزات
      if (currentRole === "super_admin") return true;
      
      // التحقق من الميزات المتاحة للمدرسة
      return schoolFeatures.includes(feature);
    },
    [currentRole, schoolFeatures]
  );

  // ✅ الحصول على حدود الخطة
  const getLimits = useCallback(() => {
    const limits = {
      free: { maxStudents: 50, maxTeachers: 10, maxUsers: 5 },
      basic: { maxStudents: 200, maxTeachers: 30, maxUsers: 15 },
      pro: { maxStudents: 1000, maxTeachers: 100, maxUsers: 50 },
      enterprise: { maxStudents: Infinity, maxTeachers: Infinity, maxUsers: Infinity },
    };

    const plan = subscriptionPlan as keyof typeof limits || "free";
    return limits[plan] || limits.free;
  }, [subscriptionPlan]);

  // ✅ التحقق من إمكانية إضافة مورد جديد
  const canAccessResource = useCallback(
    (resource: string, currentCount: number): boolean => {
      const limits = getLimits();
      
      switch (resource) {
        case "students":
          return currentCount < limits.maxStudents;
        case "teachers":
          return currentCount < limits.maxTeachers;
        case "users":
          return currentCount < limits.maxUsers;
        default:
          return true;
      }
    },
    [getLimits]
  );

  // ✅ تسجيل النشاطات (Audit Log)
  const logActivity = useCallback(async (
    action: string,
    entityType: string,
    entityId: string,
    oldData: any = null,
    newData: any = null
  ) => {
    if (!user || !currentSchool) return;

    try {
      await supabase.from("activity_logs").insert({
        user_id: user.id,
        school_id: currentSchool.id,
        action,
        entity_type: entityType,
        entity_id: entityId,
        old_data: oldData,
        new_data: newData,
        ip_address: null, // يمكن إضافة IP من request
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  }, [user, currentSchool]);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        console.log("🔐 Initializing auth...");

        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) console.error("Session error:", error);

        if (session?.user) {
          await loadUserData(session.user);
        } else {
          setUser(null);
          setUserRoles([]);
          setCurrentSchool(null);
          setCurrentRole(null);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔄 Auth event:", event);

      if (!isMounted) return;

      if (event === "SIGNED_IN" && session?.user) {
        setLoading(true);
        await loadUserData(session.user);
        setLoading(false);
      } else if (
        event === "SIGNED_OUT" ||
        (event === "TOKEN_REFRESHED" && !session)
      ) {
        setUser(null);
        setUserRoles([]);
        setCurrentSchool(null);
        setCurrentRole(null);
        setSubscriptionPlan(null);
        setSubscriptionExpiresAt(null);
        setSchoolFeatures([]);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    return { error };
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (!error && data.user) {
      const { error: insertError } = await supabase.from("users").upsert(
        [
          {
            id: data.user.id,
            email,
            full_name: fullName,
            school_id: null,
            created_at: new Date().toISOString(),
          },
        ],
        { onConflict: "id" }
      );

      if (insertError) console.error("Error creating user profile:", insertError);
    }

    setLoading(false);
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserRoles([]);
    setCurrentSchool(null);
    setCurrentRole(null);
    setSubscriptionPlan(null);
    setSubscriptionExpiresAt(null);
    setSchoolFeatures([]);
  };

  const switchSchool = async (schoolId: string) => {
    const role = userRoles.find((r) => r.school_id === schoolId);

    if (role && role.school && user) {
      setCurrentSchool(role.school);
      setCurrentRole(role.role);
      setSubscriptionPlan(role.school.subscription_plan);
      setSubscriptionExpiresAt(role.school.subscription_expires_at);
      setSchoolFeatures(role.school.features || []);
      localStorage.setItem(`current_school_${user.id}`, schoolId);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!currentRole) return false;
    if (currentRole === "super_admin") return true;
    if (currentRole === "admin") return true;

    const rolePermissions: Record<string, string[]> = {
      accountant: [
        "view_financials",
        "manage_fees",
        "manage_expenses",
        "view_reports",
        "add_fees",
        "edit_fees",
        "delete_fees",
        "add_expenses",
        "edit_expenses",
        "delete_expenses",
      ],
      moderator: [
        "view_students",
        "view_teachers",
        "edit_students",
        "edit_teachers",
        "add_students",
        "delete_students",
      ],
    };

    return rolePermissions[currentRole]?.includes(permission) || false;
  };

  const value = useMemo(() => ({
    user,
    loading,
    currentSchool,
    currentRole,
    userRoles,
    subscriptionPlan,
    subscriptionExpiresAt,
    schoolFeatures,
    signIn,
    signUp,
    signOut,
    switchSchool,
    hasPermission,
    hasFeature,
    getLimits,
    canAccessResource,
    refreshSchoolData,
  }), [user, loading, currentSchool, currentRole, userRoles, subscriptionPlan, subscriptionExpiresAt, schoolFeatures]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}