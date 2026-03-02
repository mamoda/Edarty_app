import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface MonthlyData {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export default function ProfitReport() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [availableYears, setAvailableYears] = useState<string[]>([]);

  useEffect(() => {
    loadReportData();
  }, [selectedYear]);

  const loadReportData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [feesRes, expensesRes] = await Promise.all([
        supabase.from('fees').select('amount, payment_date').eq('user_id', user.id),
        supabase.from('expenses').select('amount, expense_date').eq('user_id', user.id),
      ]);

      if (feesRes.error) throw feesRes.error;
      if (expensesRes.error) throw expensesRes.error;

      const fees = feesRes.data || [];
      const expenses = expensesRes.data || [];

      const years = new Set<string>();
      fees.forEach(f => years.add(new Date(f.payment_date).getFullYear().toString()));
      expenses.forEach(e => years.add(new Date(e.expense_date).getFullYear().toString()));
      setAvailableYears(Array.from(years).sort().reverse());

      const months = [
        'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
      ];

      const monthlyStats: MonthlyData[] = months.map((month, index) => {
        const monthRevenue = fees
          .filter(f => {
            const date = new Date(f.payment_date);
            return date.getFullYear().toString() === selectedYear && date.getMonth() === index;
          })
          .reduce((sum, f) => sum + Number(f.amount), 0);

        const monthExpenses = expenses
          .filter(e => {
            const date = new Date(e.expense_date);
            return date.getFullYear().toString() === selectedYear && date.getMonth() === index;
          })
          .reduce((sum, e) => sum + Number(e.amount), 0);

        return {
          month,
          revenue: monthRevenue,
          expenses: monthExpenses,
          profit: monthRevenue - monthExpenses,
        };
      });

      setMonthlyData(monthlyStats);

      const yearRevenue = monthlyStats.reduce((sum, m) => sum + m.revenue, 0);
      const yearExpenses = monthlyStats.reduce((sum, m) => sum + m.expenses, 0);

      setTotalRevenue(yearRevenue);
      setTotalExpenses(yearExpenses);
      setNetProfit(yearRevenue - yearExpenses);
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">تقرير الأرباح والخسائر</h2>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-600" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            {availableYears.length > 0 ? (
              availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))
            ) : (
              <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
            )}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-md p-6 border-r-4 border-green-600">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">إجمالي الإيرادات</span>
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600">{totalRevenue.toFixed(2)} ر.س</p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-r-4 border-red-600">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">إجمالي التكاليف</span>
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-600">{totalExpenses.toFixed(2)} ر.س</p>
            </div>

            <div className={`bg-white rounded-xl shadow-md p-6 border-r-4 ${
              netProfit >= 0 ? 'border-blue-600' : 'border-orange-600'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">صافي الربح</span>
                <TrendingUp className={`w-5 h-5 ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
              </div>
              <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                {netProfit >= 0 ? '+' : ''}{netProfit.toFixed(2)} ر.س
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">التقرير الشهري لعام {selectedYear}</h3>
            <div className="overflow-x-auto">
              <table className="w-full" dir="rtl">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-right py-3 px-4 font-bold text-gray-700">الشهر</th>
                    <th className="text-right py-3 px-4 font-bold text-gray-700">الإيرادات</th>
                    <th className="text-right py-3 px-4 font-bold text-gray-700">التكاليف</th>
                    <th className="text-right py-3 px-4 font-bold text-gray-700">الربح/الخسارة</th>
                    <th className="text-center py-3 px-4 font-bold text-gray-700">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((data, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-900">{data.month}</td>
                      <td className="py-3 px-4 text-green-600 font-medium">{data.revenue.toFixed(2)} ر.س</td>
                      <td className="py-3 px-4 text-red-600 font-medium">{data.expenses.toFixed(2)} ر.س</td>
                      <td className={`py-3 px-4 font-bold ${
                        data.profit >= 0 ? 'text-blue-600' : 'text-orange-600'
                      }`}>
                        {data.profit >= 0 ? '+' : ''}{data.profit.toFixed(2)} ر.س
                      </td>
                      <td className="py-3 px-4 text-center">
                        {data.profit >= 0 ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            <TrendingUp className="w-3 h-3" />
                            ربح
                          </span>
                        ) : data.profit < 0 ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                            <TrendingDown className="w-3 h-3" />
                            خسارة
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                            متعادل
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr className="font-bold">
                    <td className="py-3 px-4 text-gray-900">الإجمالي</td>
                    <td className="py-3 px-4 text-green-600">{totalRevenue.toFixed(2)} ر.س</td>
                    <td className="py-3 px-4 text-red-600">{totalExpenses.toFixed(2)} ر.س</td>
                    <td className={`py-3 px-4 ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {netProfit >= 0 ? '+' : ''}{netProfit.toFixed(2)} ر.س
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">تحليل الأداء</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-700 mb-3">نسبة الربح</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">هامش الربح:</span>
                    <span className="font-bold text-gray-900">
                      {totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${netProfit >= 0 ? 'bg-blue-600' : 'bg-orange-600'}`}
                      style={{ width: `${totalRevenue > 0 ? Math.abs((netProfit / totalRevenue) * 100) : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-3">متوسط شهري</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">الإيرادات:</span>
                    <span className="font-medium text-green-600">{(totalRevenue / 12).toFixed(2)} ر.س</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">التكاليف:</span>
                    <span className="font-medium text-red-600">{(totalExpenses / 12).toFixed(2)} ر.س</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">الربح:</span>
                    <span className={`font-bold ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {(netProfit / 12).toFixed(2)} ر.س
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
