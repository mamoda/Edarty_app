// src/context/AuthContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useMemo,
  useRef,
} from "react";
import { supabase } from "../lib/supabase";
import {
  AuthUser,
  UserProfile,
  UserSchoolRole,
  School,
} from "../types/database";

interface AuthContextType {
  authUser: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  currentSchool: School | null;
  currentSchoolId: string | null;
  currentRole: string | null;
  userRoles: UserSchoolRole[];
  subscriptionPlan: string | null;
  subscriptionExpiresAt: string | null;
  schoolFeatures: string[];
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    fullName?: string,
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  switchSchool: (schoolId: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasFeature: (feature: string) => boolean;
  refreshSchoolData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<UserSchoolRole[]>([]);
  const [currentSchool, setCurrentSchool] = useState<School | null>(null);
  const [currentSchoolId, setCurrentSchoolId] = useState<string | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);

  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<string | null>(null);
  const [schoolFeatures, setSchoolFeatures] = useState<string[]>([]);

  const loadingUserRef = useRef(false);
  const initializedRef = useRef(false);

  const isAuthenticated = useMemo(() => !!authUser, [authUser]);

  // ============================================
  // Load School Data
  // ============================================
  const loadCurrentSchoolData = async (schoolId: string) => {
    const { data } = await supabase
      .from("schools")
      .select("*")
      .eq("id", schoolId)
      .single();

    if (data) {
      setCurrentSchool(data);
      setSubscriptionPlan(data.subscription_plan);
      setSubscriptionExpiresAt(data.subscription_expires_at);
      setSchoolFeatures(data.features || []);
    }
  };

  

// ============================================
// 🔥 NEW: Auto Create School (FIXED)
// ============================================
const createSchoolForUser = async (userId: string) => {
  try {
    const { data: school, error: schoolError } = await supabase
      .from("schools")
      .insert([
        {
          name: "مدرستي",

          // القيم الافتراضية (اختياري لكن أفضل)
          status: "active",
          subscription_plan: "free",
          subscription_status: "active",
          max_students: 50,
          max_teachers: 10,
          max_users: 5,
          features: [],
          settings: {},
        },
      ])
      .select()
      .single();

    if (schoolError) throw schoolError;

    // ربط المستخدم بالمدرسة
    const { error: roleError } = await supabase
      .from("user_school_roles")
      .insert({
        user_id: userId,
        school_id: school.id,
        role: "admin",
        is_primary: true,
      });

    if (roleError) throw roleError;

    return school;
  } catch (error) {
    console.error("Error creating school:", error);
    return null;
  }
};  // ============================================
  // Load User Data
  // ============================================
  const loadUserData = async (user: any) => {
    if (loadingUserRef.current) return;
    loadingUserRef.current = true;

    try {
      if (!user) return;

      setAuthUser({ id: user.id, email: user.email });

      // profile
      const { data: profileData } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      setProfile(profileData || null);

      // roles
      const { data: roles } = await supabase
        .from("user_school_roles")
        .select("*, schools(*)")
        .eq("user_id", user.id);

      let rolesData = roles || [];

      // 🔥 FIX: لو مفيش roles → أنشئ مدرسة
      if (rolesData.length === 0) {
        console.log("🚀 Creating school for new user...");

        const newSchool = await createSchoolForUser(user.id);

        if (newSchool) {
          rolesData = [
            {
              user_id: user.id,
              school_id: newSchool.id,
              role: "admin",
              is_primary: true,
              schools: newSchool,
            } as any,
          ];
        }
      }

      setUserRoles(rolesData);

      // اختيار المدرسة
      const savedSchoolId = localStorage.getItem(`current_school_${user.id}`);

      const selectedRole =
        rolesData.find((r) => r.school_id === savedSchoolId) ||
        rolesData.find((r: any) => r.is_primary) ||
        rolesData[0];

      if (selectedRole?.school_id) {
        const schoolId = selectedRole.school_id;

        setCurrentSchoolId(schoolId);
        localStorage.setItem(`current_school_${user.id}`, schoolId);

        if (selectedRole.schools) {
          setCurrentSchool(selectedRole.schools);
          setCurrentRole(selectedRole.role);
          setSubscriptionPlan(selectedRole.schools.subscription_plan);
          setSubscriptionExpiresAt(
            selectedRole.schools.subscription_expires_at
          );
          setSchoolFeatures(selectedRole.schools.features || []);
        } else {
          await loadCurrentSchoolData(schoolId);
        }
      }
    } catch (error) {
      console.error("loadUserData error:", error);
    } finally {
      loadingUserRef.current = false;
      setLoading(false);
    }
  };

  // ============================================
  // Init Auth
  // ============================================
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      console.log("SESSION:", data.session);

      if (data.session?.user) {
        await loadUserData(data.session.user);
      } else {
        setLoading(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT") {
          setAuthUser(null);
          setProfile(null);
          setUserRoles([]);
          setCurrentSchool(null);
          setCurrentSchoolId(null);
          setCurrentRole(null);
          setLoading(false);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // ============================================
  // Switch School
  // ============================================
  const switchSchool = async (schoolId: string) => {
    const role = userRoles.find((r) => r.school_id === schoolId);

    if (role?.school && authUser) {
      setCurrentSchool(role.school);
      setCurrentSchoolId(schoolId);
      setCurrentRole(role.role);

      setSubscriptionPlan(role.school.subscription_plan);
      setSubscriptionExpiresAt(role.school.subscription_expires_at);
      setSchoolFeatures(role.school.features || []);

      localStorage.setItem(`current_school_${authUser.id}`, schoolId);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!currentRole) return false;
    if (["admin"].includes(currentRole)) return true;

    const rolePermissions: Record<string, string[]> = {
      accountant: ["view_financials", "manage_fees", "manage_expenses"],
      moderator: ["view_students", "edit_students"],
    };

    return rolePermissions[currentRole]?.includes(permission) || false;
  };

  const hasFeature = (feature: string): boolean => {
    return schoolFeatures.includes(feature);
  };

  const refreshSchoolData = async () => {
    if (currentSchoolId) {
      await loadCurrentSchoolData(currentSchoolId);
    }
  };

  const value = {
    authUser,
    profile,
    loading,
    currentSchool,
    currentSchoolId,
    currentRole,
    userRoles,
    subscriptionPlan,
    subscriptionExpiresAt,
    schoolFeatures,
    isAuthenticated,
    signIn: async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    },
    signUp: async (email: string, password: string, fullName?: string) => {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (!error && data.user) {
        await supabase.from("users").insert({
          id: data.user.id,
          email,
          full_name: fullName,
        });
      }

      setLoading(false);
      return { error };
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
    switchSchool,
    hasPermission,
    hasFeature,
    refreshSchoolData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}