import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { BarChart3, TrendingUp, DollarSign, PieChart as PieIcon, CheckCircle2, Shield } from 'lucide-react';
import { api } from '../services/api';
import { formatRupee } from '../utils/currency';
import { StatCard } from '../components/StatCard';
import { useAuth } from '../context/AuthContext';

export function AnalyticsPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await api.getDashboardAnalytics();
        setAnalytics(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const CATEGORY_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Compiling financial analytics...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Financial Analytics & Group Insights
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Visual spending breakdowns, group settlement metrics, and cost optimization insights.
        </p>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Active Subscriptions"
          value={analytics?.active_subscriptions_count || 0}
          subtitle="Managed in current cycles"
          icon={BarChart3}
          color="indigo"
        />
        <StatCard
          title="Total Monthly Split"
          value={formatRupee(analytics?.monthly_contribution_total)}
          subtitle="Aggregate commitment"
          icon={TrendingUp}
          color="blue"
        />
        <StatCard
          title="Collection Efficiency"
          value={`${analytics?.payment_completion_rate}%`}
          subtitle="Paid vs Requested Obligations"
          icon={CheckCircle2}
          color="emerald"
          badge="High"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Monthly Trend Area Chart */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">4-Month Expenditure Trend</h3>
              <p className="text-xs text-slate-500">Track total obligations generated vs settled</p>
            </div>
            <span className="text-3xs font-extrabold uppercase bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg">
              INR
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.monthly_trend || []}>
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip 
                  formatter={(v) => [formatRupee(v), 'Amount']}
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="amount" name="Total Bill" fill="#6366F1" radius={[8, 8, 0, 0]} />
                <Bar dataKey="collected" name="Settled" fill="#10B981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown Donut */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Category Allocation</h3>
              <p className="text-xs text-slate-500">Proportional spend across services</p>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics?.category_breakdown || []}
                  dataKey="amount"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={4}
                >
                  {analytics?.category_breakdown?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(v) => [formatRupee(v), 'Spend']}
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Savings & Optimization Banner */}
      <div className="p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 rounded-3xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
        <div>
          <h4 className="text-lg font-black tracking-tight">Smart Group Optimization Impact</h4>
          <p className="text-xs text-emerald-100 max-w-xl mt-1 leading-relaxed">
            By sharing these 4 subscriptions via SplitSub instead of individual standalone plans, you and your friend circle save approximately <strong>₹1,450 every month (₹17,400/year)</strong>!
          </p>
        </div>
        <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-center shrink-0">
          <span className="text-3xs uppercase font-extrabold tracking-wider block text-emerald-200">Total Group Savings</span>
          <span className="font-mono text-2xl font-black text-white">~68%</span>
        </div>
      </div>

    </div>
  );
}
