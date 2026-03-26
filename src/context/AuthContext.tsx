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
const loadingUserRef = useRef(false);
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<UserSchoolRole[]>([]);
  const [currentSchool, setCurrentSchool] = useState<School | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<
    string | null
  >(null);
  const [schoolFeatures, setSchoolFeatures] = useState<string[]>([]);

  const initializedRef = useRef(false);

  const isAuthenticated = useMemo(() => !!authUser, [authUser]);

  // ============================================
  // Load School Data
  // ============================================
  const loadCurrentSchoolData = async (schoolId: string) => {
    const { data, error } = await supabase
      .from("schools")
      .select("*")
      .eq("id", schoolId)
      .single();

    if (!error && data) {
      setCurrentSchool(data);
      setSubscriptionPlan(data.subscription_plan);
      setSubscriptionExpiresAt(data.subscription_expires_at);
      setSchoolFeatures(data.features || []);
    }
  };

  // ============================================
  // Load User Data - بسيطة ومباشرة
  // ============================================
const loadUserData = async (user: any) => {
  // 🛑 منع التكرار (أهم جزء)
  if (loadingUserRef.current) {
    console.log("⛔ Duplicate loadUserData prevented");
    return;
  }

  loadingUserRef.current = true;

  console.log("📥 [START] Loading user data for:", user?.email);
  console.time("⏱ loadUserData");

  try {
    if (!user) {
      console.warn("⚠️ No user found");
      return;
    }

    // ============================================
    // 1. auth user
    // ============================================
    console.log("➡️ Step 1: Setting auth user");
    setAuthUser({ id: user.id, email: user.email });

    // ============================================
    // 2. profile
    // ============================================
    console.log("➡️ Step 2: Fetching profile...");
    const { data: profileData, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("❌ Profile error:", profileError);
    } else {
      console.log("✅ Profile loaded:", profileData);
    }

    setProfile(profileData || null);

    // ============================================
    // 3. roles
    // ============================================
    console.log("➡️ Step 3: Fetching roles...");
    const { data: roles, error: rolesError } = await supabase
      .from("user_school_roles")
      .select("*, school:schools(*)")
      .eq("user_id", user.id);

    if (rolesError) {
      console.error("❌ Roles error:", rolesError);
    } else {
      console.log("✅ Roles loaded:", roles);
    }

    const rolesData = roles || [];
    setUserRoles(rolesData);

    console.log("📊 Roles count:", rolesData.length);

    // ============================================
    // 4. select school
    // ============================================
    console.log("➡️ Step 4: Selecting school...");

    if (rolesData.length > 0) {
      const savedSchoolId = localStorage.getItem(
        `current_school_${user.id}`
      );

      console.log("💾 Saved schoolId:", savedSchoolId);

      const selectedRole =
        rolesData.find((r) => String(r.school_id) === savedSchoolId) ||
        rolesData.find((r: any) => r.is_primary) ||
        rolesData[0];

      console.log("🎯 Selected role:", selectedRole);

      if (selectedRole?.school) {
        console.log("🏫 Setting current school:", selectedRole.school);

        setCurrentSchool(selectedRole.school);
        setCurrentRole(selectedRole.role);
        setSubscriptionPlan(selectedRole.school.subscription_plan);
        setSubscriptionExpiresAt(
          selectedRole.school.subscription_expires_at
        );
        setSchoolFeatures(selectedRole.school.features || []);
      } else {
        console.warn("⚠️ No school found in selected role");
      }
    } else {
      console.warn("⚠️ User has NO roles");
    }

    console.log("✅ [END] User data loaded");
  } catch (error) {
    console.error("💥 loadUserData crash:", error);
  } finally {
    console.log("🛑 Stopping loading");
    console.timeEnd("⏱ loadUserData");

    // مهم: ترتيب الإنهاء
    loadingUserRef.current = false;
    setLoading(false);
  }
};  // ============================================
  // Auth Init
  // ============================================
  useEffect(() => {
    if (initializedRef.current) {
      console.log("⚠️ Auth already initialized");
      return;
    }

    initializedRef.current = true;
    console.log("🚀 Auth initializing...");

    let isMounted = true;

    const init = async () => {
      try {
        console.log("🔍 Checking session...");
        const { data } = await supabase.auth.getSession();

        console.log("📦 Session result:", data);

        if (data.session?.user && isMounted) {
          console.log("✅ Found session user");
          await loadUserData(data.session.user);
        } else {
          console.log("❌ No active session");
          if (isMounted) setLoading(false);
        }
      } catch (error) {
        console.error("💥 Init error:", error);
        if (isMounted) setLoading(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("🔔 Auth event:", event, session);

        if (!isMounted) return;

        if (event === "SIGNED_IN" && session?.user && !authUser) {
          console.log("✅ SIGNED_IN event triggered");
          await loadUserData(session.user);
        }

        if (event === "SIGNED_OUT") {
          console.log("👋 SIGNED_OUT event");

          setAuthUser(null);
          setProfile(null);
          setUserRoles([]);
          setCurrentSchool(null);
          setCurrentRole(null);
          setSubscriptionPlan(null);
          setSubscriptionExpiresAt(null);
          setSchoolFeatures([]);
          setLoading(false);
        }
      },
    );

    return () => {
      console.log("🧹 Cleaning up auth listener");
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);
  // ============================================
  // Actions
  // ============================================
  const signIn = async (email: string, password: string) => {
    console.log("🔐 Signing in:", email);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("❌ Sign in error:", error);
    } else {
      console.log("✅ Sign in success");
    }

    return { error };
  };
  const signUp = async (email: string, password: string, fullName?: string) => {
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
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const switchSchool = async (schoolId: string) => {
    const role = userRoles.find((r) => r.school_id === schoolId);

    if (role?.school && authUser) {
      setCurrentSchool(role.school);
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
    if (currentSchool?.id) {
      await loadCurrentSchoolData(currentSchool.id);
    }
  };

  const value = {
    authUser,
    profile,
    loading,
    currentSchool,
    currentRole,
    userRoles,
    subscriptionPlan,
    subscriptionExpiresAt,
    schoolFeatures,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
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
