import { Fee, Student } from '../types/database';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useRef } from 'react';

interface PaymentReceiptProps {
  fee: Fee;
  student: Student;
  onClose: () => void;
  onPrint: () => void;
}

export default function PaymentReceipt({ fee, student, onClose, onPrint }: PaymentReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd MMMM yyyy - hh:mm a', { locale: ar });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full" dir="rtl">
        {/* شريط الأدوات */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">إيصال سداد</h2>
          <div className="flex gap-2">
            <button
              onClick={onPrint}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              طباعة
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>

        {/* محتوى الإيصال */}
        <div ref={receiptRef} className="p-8" id="payment-receipt">
          {/* الهيدر مع الشعار */}
          <div className="text-center mb-8 border-b pb-6">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">مدرسة النور</h1>
            <p className="text-gray-600">إيصال سداد المصاريف الدراسية</p>
          </div>

          {/* رقم الإيصال والتاريخ */}
          <div className="flex justify-between items-center mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div>
              <span className="text-gray-600 text-sm">رقم الإيصال:</span>
              <span className="font-bold text-gray-900 mr-2">{fee.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <div>
              <span className="text-gray-600 text-sm">تاريخ الإصدار:</span>
              <span className="font-bold text-gray-900 mr-2">{formatDate(fee.created_at)}</span>
            </div>
          </div>

          {/* بيانات الطالب */}
          <div className="mb-6">
            <h3 className="font-bold text-gray-900 mb-3 text-lg flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              بيانات الطالب
            </h3>
            <div className="grid grid-cols-2 gap-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
              <div>
                <p className="text-gray-600 text-sm">الاسم</p>
                <p className="font-bold text-gray-900">{student.full_name}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">الفصل</p>
                <p className="font-bold text-gray-900">{student.grade}</p>
              </div>
              {student.parent_name && (
                <div>
                  <p className="text-gray-600 text-sm">وليّ الأمر</p>
                  <p className="font-bold text-gray-900">{student.parent_name}</p>
                </div>
              )}
              {student.parent_phone && (
                <div>
                  <p className="text-gray-600 text-sm">رقم الهاتف</p>
                  <p className="font-bold text-gray-900" dir="ltr">{student.parent_phone}</p>
                </div>
              )}
            </div>
          </div>

          {/* تفاصيل الدفع */}
          <div className="mb-6">
            <h3 className="font-bold text-gray-900 mb-3 text-lg flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              تفاصيل الدفع
            </h3>
            <table className="w-full border border-gray-200 rounded-xl overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-right p-3 text-sm font-medium text-gray-700">البيان</th>
                  <th className="text-right p-3 text-sm font-medium text-gray-700">المبلغ</th>
                  <th className="text-right p-3 text-sm font-medium text-gray-700">ملاحظات</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="p-3">
                    <span className="font-medium">{fee.payment_type}</span>
                    {fee.notes && (
                      <span className="block text-sm text-gray-600 mt-1">{fee.notes}</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="font-bold text-green-600 text-lg">{fee.amount.toFixed(2)}</span>
                    <span className="text-gray-600 mr-1">ج.م</span>
                  </td>
                  <td className="p-3 text-gray-600">نقداً</td>
                </tr>
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td className="p-3 font-bold text-gray-900">الإجمالي</td>
                  <td className="p-3" colSpan={2}>
                    <span className="font-bold text-green-600 text-lg">{fee.amount.toFixed(2)}</span>
                    <span className="text-gray-600 mr-1">ج.م</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* السنة الدراسية */}
          <div className="mb-4 text-center">
            <span className="inline-block bg-gray-100 px-4 py-2 rounded-lg text-gray-700">
              السنة الدراسية: <span className="font-bold">{fee.academic_year}</span>
            </span>
          </div>

          {/* الختم الإلكتروني والتوقيع */}
          <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between items-center">
            <div className="text-center">
              <div className="w-24 h-24 rounded-full border-2 border-green-600 flex items-center justify-center opacity-70 bg-green-50">
                <div className="text-center">
                  <svg className="w-12 h-12 text-green-600 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  <span className="text-xs text-green-600 font-bold">معتمد إلكترونياً</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2">الختم الإلكتروني</p>
            </div>
            
            <div className="text-center">
              <div className="border-t-2 border-gray-400 w-48 pt-2">
                <p className="text-gray-900 font-bold">المسؤول المالي</p>
              </div>
              <p className="text-sm text-gray-600 mt-2">التوقيع</p>
            </div>
          </div>

          {/* تذييل */}
          <div className="mt-8 text-center text-sm text-gray-500 border-t border-gray-200 pt-4">
            <p>تم إنشاء هذا الإيصال إلكترونياً وهو معتمد بدون توقيع</p>
            <p className="mt-1">للاستفسار: info@school.com | 0123456789</p>
            <p className="mt-1 text-xs text-gray-400">نظام إدارتي لإدارة المدارس</p>
          </div>
        </div>
      </div>
    </div>
  );
}