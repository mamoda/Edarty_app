// src/hooks/useFeatureGate.ts

import { useAuth } from "../context/AuthContext";

interface FeatureGate {
  hasFeature: (feature: string) => boolean;
  canAddStudent: (currentCount: number) => boolean;
  canAddTeacher: (currentCount: number) => boolean;
  canAddUser: (currentCount: number) => boolean;
  showUpgradePrompt: (feature: string) => boolean;
  limits: {
    maxStudents: number;
    maxTeachers: number;
    maxUsers: number;
  };
}

export const useFeatureGate = (): FeatureGate => {
  const { hasFeature, subscriptionPlan } = useAuth();

  // ✅ limits based on plan
  const limitsMap: Record<
    string,
    { maxStudents: number; maxTeachers: number; maxUsers: number }
  > = {
    free: { maxStudents: 50, maxTeachers: 10, maxUsers: 5 },
    basic: { maxStudents: 200, maxTeachers: 30, maxUsers: 15 },
    pro: { maxStudents: 1000, maxTeachers: 100, maxUsers: 50 },
    enterprise: {
      maxStudents: Infinity,
      maxTeachers: Infinity,
      maxUsers: Infinity,
    },
  };

  const plan = subscriptionPlan || "free";
  const limits = limitsMap[plan] || limitsMap.free;

  // ✅ resource checks
  const canAddStudent = (currentCount: number) =>
    currentCount < limits.maxStudents;

  const canAddTeacher = (currentCount: number) =>
    currentCount < limits.maxTeachers;

  const canAddUser = (currentCount: number) =>
    currentCount < limits.maxUsers;

  const showUpgradePrompt = (feature: string): boolean => {
    return !hasFeature(feature);
  };

  return {
    hasFeature,
    canAddStudent,
    canAddTeacher,
    canAddUser,
    showUpgradePrompt,
    limits,
  };
};
