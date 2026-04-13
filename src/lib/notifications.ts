import { supabase } from "./supabase";

interface NotificationData {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  schoolId: string;
  userId?: string;
  link?: string;
}

export const createNotification = async (data: NotificationData) => {
  try {
    if (data.userId) {
      await supabase.from("notifications").insert({
        user_id: data.userId,
        school_id: data.schoolId,
        title: data.title,
        message: data.message,
        type: data.type,
        link: data.link || null,
        created_at: new Date().toISOString(),
      });
      return;
    }

    const { data: admins, error: adminsError } = await supabase
      .from("user_school_roles")
      .select("user_id")
      .eq("school_id", data.schoolId)
      .eq("role", "admin");

    if (adminsError) {
      console.error("Error fetching admins:", adminsError);
      return;
    }

    if (!admins || admins.length === 0) return;

    const notifications = admins.map(admin => ({
      user_id: admin.user_id,
      school_id: data.schoolId,
      title: data.title,
      message: data.message,
      type: data.type,
      link: data.link || null,
      created_at: new Date().toISOString(),
    }));

    await supabase.from("notifications").insert(notifications);
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

export const notifyStudentAdded = (schoolId: string, studentName: string, userId?: string) => {
  return createNotification({
    title: "📚 تم إضافة طالب جديد",
    message: `تم إضافة الطالب "${studentName}" إلى النظام`,
    type: "success",
    schoolId,
    userId,
  });
};

export const notifyStudentDeleted = (schoolId: string, studentName: string, userId?: string) => {
  return createNotification({
    title: "⚠️ تم حذف طالب",
    message: `تم حذف الطالب "${studentName}" من النظام`,
    type: "warning",
    schoolId,
    userId,
  });
};

export const notifyTeacherAdded = (schoolId: string, teacherName: string, userId?: string) => {
  return createNotification({
    title: "👨‍🏫 تم إضافة معلم جديد",
    message: `تم إضافة المعلم "${teacherName}" إلى النظام`,
    type: "success",
    schoolId,
    userId,
  });
};

export const notifyTeacherDeleted = (schoolId: string, teacherName: string, userId?: string) => {
  return createNotification({
    title: "⚠️ تم حذف معلم",
    message: `تم حذف المعلم "${teacherName}" من النظام`,
    type: "warning",
    schoolId,
    userId,
  });
};

export const notifySalaryPaid = (schoolId: string, teacherName: string, amount: number, userId?: string) => {
  return createNotification({
    title: "💰 تم صرف راتب",
    message: `تم صرف راتب للمعلم "${teacherName}" بقيمة ${amount.toLocaleString()} ج.م`,
    type: "info",
    schoolId,
    userId,
  });
};

export const notifyExpenseAdded = (schoolId: string, category: string, amount: number, userId?: string) => {
  return createNotification({
    title: "💸 تم إضافة مصروف",
    message: `تم إضافة مصروف جديد (${category}) بقيمة ${amount.toLocaleString()} ج.م`,
    type: "info",
    schoolId,
    userId,
  });
};

export const notifyFeeAdded = (schoolId: string, studentName: string, amount: number, userId?: string) => {
  return createNotification({
    title: "💰 تم تسجيل دفعة",
    message: `تم تسجيل دفعة للطالب "${studentName}" بقيمة ${amount.toLocaleString()} ج.م`,
    type: "success",
    schoolId,
    userId,
  });
};