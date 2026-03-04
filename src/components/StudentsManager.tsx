import { useState, useEffect } from 'react';
import { UserPlus, Edit2, Trash2, Search, X, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Student } from '../types/database';

interface StudentsManagerProps {
  onUpdate: () => void;
}

export default function StudentsManager({ onUpdate }: StudentsManagerProps) {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGrades, setExpandedGrades] = useState<Set<string>>(new Set());
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [formData, setFormData] = useState({
    full_name: '',
    grade: '',
    parent_name: '',
    parent_phone: '',
    status: 'active' as 'active' | 'inactive',
  });

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .order('grade', { ascending: true })
        .order('full_name', { ascending: true });

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingStudent) {
        const { error } = await supabase
          .from('students')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', editingStudent.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('students')
          .insert([{ ...formData, user_id: user.id }]);

        if (error) throw error;
      }

      resetForm();
      loadStudents();
      onUpdate();
    } catch (error) {
      console.error('Error saving student:', error);
      alert('حدث خطأ أثناء حفظ البيانات');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الطالب؟')) return;

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadStudents();
      onUpdate();
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('حدث خطأ أثناء حذف الطالب');
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      full_name: student.full_name,
      grade: student.grade,
      parent_name: student.parent_name,
      parent_phone: student.parent_phone,
      status: student.status,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      grade: '',
      parent_name: '',
      parent_phone: '',
      status: 'active',
    });
    setEditingStudent(null);
    setShowForm(false);
  };

  const toggleGrade = (grade: string) => {
    const newExpanded = new Set(expandedGrades);
    if (newExpanded.has(grade)) {
      newExpanded.delete(grade);
    } else {
      newExpanded.add(grade);
    }
    setExpandedGrades(newExpanded);
  };

  const expandAll = () => {
    const allGrades = new Set(gradeStats.map(stat => stat.grade));
    setExpandedGrades(allGrades);
  };

  const collapseAll = () => {
    setExpandedGrades(new Set());
  };

  // Group students by grade
  const studentsByGrade = students.reduce((acc, student) => {
    const grade = student.grade || 'غير محدد';
    if (!acc[grade]) {
      acc[grade] = [];
    }
    acc[grade].push(student);
    return acc;
  }, {} as Record<string, Student[]>);

  // Calculate statistics for each grade
  const gradeStats = Object.entries(studentsByGrade).map(([grade, students]) => ({
    grade,
    count: students.length,
    activeCount: students.filter(s => s.status === 'active').length,
    inactiveCount: students.filter(s => s.status === 'inactive').length,
  })).sort((a, b) => a.grade.localeCompare(b.grade, 'ar'));

  // Filter students by search term and selected grade
  const filteredStudents = selectedGrade
    ? studentsByGrade[selectedGrade]?.filter(student =>
        student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.parent_name.toLowerCase().includes(searchTerm.toLowerCase())
      ) || []
    : students;

  const filteredByGrade = selectedGrade
    ? { [selectedGrade]: filteredStudents }
    : studentsByGrade;

  const totalStudents = students.length;
  const totalActive = students.filter(s => s.status === 'active').length;
  const totalInactive = students.filter(s => s.status === 'inactive').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">إدارة الطلاب</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all shadow-md w-full sm:w-auto justify-center"
        >
          <UserPlus className="w-5 h-5" />
          <span>إضافة طالب</span>
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-md p-4 border-r-4 border-blue-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">إجمالي الطلاب</p>
              <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
            </div>
            <BookOpen className="w-8 h-8 text-blue-600 opacity-75" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4 border-r-4 border-green-600">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">الطلاب النشطون</p>
              <p className="text-2xl font-bold text-green-600">{totalActive}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-green-600 font-bold">✓</span>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4 border-r-4 border-gray-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">الطلاب غير النشطين</p>
              <p className="text-2xl font-bold text-gray-600">{totalInactive}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-gray-600 font-bold">○</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-md p-4 space-y-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="البحث عن طالب..."
            className="w-full pr-10 pl-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        {/* Grade Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700">تصفية حسب الصف:</span>
          <button
            onClick={() => setSelectedGrade('')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
              selectedGrade === ''
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            الكل
          </button>
          {gradeStats.map(({ grade }) => (
            <button
              key={grade}
              onClick={() => setSelectedGrade(grade)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                selectedGrade === grade
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {grade}
            </button>
          ))}
        </div>

        {/* Expand/Collapse Controls */}
        {!selectedGrade && (
          <div className="flex justify-end gap-2">
            <button
              onClick={expandAll}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              فتح الكل
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={collapseAll}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              إغلاق الكل
            </button>
          </div>
        )}
      </div>

      {/* Students List by Grade */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : students.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد بيانات</h3>
          <p className="text-gray-600 mb-6">لم يتم إضافة أي طلاب بعد</p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-all"
          >
            إضافة أول طالب
          </button>
        </div>
      ) : selectedGrade ? (
        // Single Grade View
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900">{selectedGrade}</h3>
                <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs">
                  {filteredStudents.length} طالب
                </span>
              </div>
            </div>
          </div>
          <StudentList
            students={filteredStudents}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      ) : (
        // Grouped by Grade View
        <div className="space-y-4">
          {gradeStats.map(({ grade, count, activeCount }) => {
            const isExpanded = expandedGrades.has(grade);
            const gradeStudents = studentsByGrade[grade] || [];

            return (
              <div key={grade} className="bg-white rounded-xl shadow-md overflow-hidden">
                {/* Grade Header */}
                <div
                  onClick={() => toggleGrade(grade)}
                  className="bg-gradient-to-l from-gray-50 to-white px-6 py-4 border-b cursor-pointer hover:bg-gray-50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                        <BookOpen className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{grade}</h3>
                        <div className="flex items-center gap-3 mt-1 text-sm">
                          <span className="text-gray-600">إجمالي: {count}</span>
                          <span className="text-green-600">نشط: {activeCount}</span>
                          <span className="text-gray-400">غير نشط: {count - activeCount}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedGrade(grade);
                      }}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      عرض الكل
                    </button>
                  </div>
                </div>

                {/* Grade Students */}
                {isExpanded && (
                  <div className="p-4">
                    <StudentList
                      students={gradeStudents}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Student Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingStudent ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">اسم الطالب</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الصف الدراسي</label>
                <input
                  type="text"
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="مثال: الصف الأول الابتدائي"
                  required
                  list="grades"
                />
                <datalist id="grades">
                  {gradeStats.map(({ grade }) => (
                    <option key={grade} value={grade} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">اسم ولي الأمر</label>
                <input
                  type="text"
                  value={formData.parent_name}
                  onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">رقم الهاتف</label>
                <input
                  type="tel"
                  value={formData.parent_phone}
                  onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="01xxxxxxxxx"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">الحالة</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="active">نشط</option>
                  <option value="inactive">غير نشط</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-all"
                >
                  {editingStudent ? 'حفظ التعديلات' : 'إضافة الطالب'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded-lg transition-all"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Separate component for student list to avoid duplication
function StudentList({ students, onEdit, onDelete }: { 
  students: Student[], 
  onEdit: (student: Student) => void,
  onDelete: (id: string) => void 
}) {
  return (
    <div className="grid gap-3">
      {students.map((student) => (
        <div key={student.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-all">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-bold text-gray-900">{student.full_name}</h4>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  student.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {student.status === 'active' ? 'نشط' : 'غير نشط'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">ولي الأمر:</span>
                  <span className="font-medium text-gray-900 mr-2">{student.parent_name}</span>
                </div>
                <div>
                  <span className="text-gray-600">الهاتف:</span>
                  <span className="font-medium text-gray-900 mr-2" dir="ltr">{student.parent_phone}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-1 mr-4">
              <button
                onClick={() => onEdit(student)}
                className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(student.id)}
                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}