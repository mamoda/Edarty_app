// src/context/AuthContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
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
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
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
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<string | null>(null);
  const [schoolFeatures, setSchoolFeatures] = useState<string[]>([]);

  const isLoadingRef = useRef(false);
  const initializedRef = useRef(false);

  const isAuthenticated = useMemo(() => !!authUser, [authUser]);

  // ============================================
  // Load School Data
  // ============================================

  const loadCurrentSchoolData = useCallback(async (schoolId: string) => {
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
  }, []);

  // ============================================
  // Load User Data (FIXED)
  // ============================================

  const loadUserData = useCallback(async (user: any) => {
    if (!user) {
      console.log("No user to load");
      setLoading(false);
      return;
    }
    
    if (isLoadingRef.current) {
      console.log("Already loading user data, skipping...");
      return;
    }

    isLoadingRef.current = true;
    console.log("📥 Loading user data for:", user.email);

    try {
      // 1. auth user
      const authUserData: AuthUser = {
        id: user.id,
        email: user.email,
      };
      setAuthUser(authUserData);

      // 2. profile (public.users)
      const { data: profileData } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      setProfile(profileData || null);
      console.log("✅ Profile loaded:", profileData ? profileData.full_name : "not found");

      // 3. roles + schools
      const { data: roles } = await supabase
        .from("user_school_roles")
        .select("*, school:schools(*)")
        .eq("user_id", user.id);

      const rolesData = roles || [];
      setUserRoles(rolesData);
      console.log("✅ Roles loaded:", rolesData.length);

      // 4. select school
      if (rolesData.length > 0) {
        const savedSchoolId = localStorage.getItem(`current_school_${user.id}`);

        const selectedRole =
          rolesData.find((r: any) => r.school_id === savedSchoolId) ||
          rolesData.find((r: any) => r.is_primary) ||
          rolesData[0];

        if (selectedRole?.school) {
          setCurrentSchool(selectedRole.school);
          setCurrentRole(selectedRole.role);
          setSubscriptionPlan(selectedRole.school.subscription_plan);
          setSubscriptionExpiresAt(selectedRole.school.subscription_expires_at);
          setSchoolFeatures(selectedRole.school.features || []);
          console.log("✅ School set:", selectedRole.school.name);
        } else {
          console.log("⚠️ Selected role has no school data");
        }
      } else {
        console.log("⚠️ No roles found for user");
        // ✅ لا توجد أدوار - لا توجد مدرسة
        setCurrentSchool(null);
        setCurrentRole(null);
      }

      console.log("✅ User data loaded successfully");
    } catch (error) {
      console.error("loadUserData error:", error);
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
      console.log("Loading state set to false");
    }
  }, []);

  // ============================================
  // Auth Init
  // ============================================

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let mounted = true;

    const init = async () => {
      try {
        console.log("🔐 Initializing auth...");
        const { data } = await supabase.auth.getSession();
        console.log("Session user:", data.session?.user?.email || "none");

        if (data.session?.user && mounted) {
          await loadUserData(data.session.user);
        } else if (mounted) {
          console.log("No active session, setting loading to false");
          setLoading(false);
        }
      } catch (error) {
        console.error("Init error:", error);
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        console.log("🔄 Auth event:", event);

        if (event === "SIGNED_IN" && session?.user) {
          setLoading(true);
          await loadUserData(session.user);
        }

        if (event === "SIGNED_OUT") {
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
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [loadUserData]);

  // ============================================
  // Actions
  // ============================================

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
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

  // ============================================
  // Permissions
  // ============================================

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

  // ============================================
  // Context Value
  // ============================================

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

// ============================================
// Hook
// ============================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}