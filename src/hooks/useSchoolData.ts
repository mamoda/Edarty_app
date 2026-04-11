// src/hooks/useSchoolData.ts
import { useAuth } from "../context/AuthContext";
import { SchoolData } from "../types/database";

export const useSchoolData = (): SchoolData => {
  const { authUser: user, currentSchool, subscriptionPlan, subscriptionExpiresAt, schoolFeatures } = useAuth();
  
  return {
    id: currentSchool?.id || '',
    schoolId: currentSchool?.id || '',
    schoolName: currentSchool?.name || user?.email?.split("@")[0] || "المدرسة",
    schoolEmail: currentSchool?.email || user?.email || "",
    schoolIdentifier: currentSchool?.subdomain || user?.email?.split("@")[0] || "school",
    schoolAddress: currentSchool?.address || "العنوان غير محدد",
    schoolPhone: currentSchool?.phone || "رقم الهاتف غير محدد",
    schoolTaxNumber: currentSchool?.tax_number || "000-000-000",
    subscriptionPlan: subscriptionPlan || "free",
    subscriptionExpiresAt: subscriptionExpiresAt || undefined,
    features: schoolFeatures,
  };
};