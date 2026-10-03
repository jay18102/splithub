import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  CreditCard, Wallet, CheckCircle2, Clock, AlertTriangle, 
  ArrowUpRight, Send, Plus, BarChart3, TrendingUp, Sparkles,
  QrCode, RefreshCw, ChevronRight, Shield
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { formatRupee, formatDate } from '../utils/currency';
import { StatCard } from '../components/StatCard';
import { StatusBadge } from '../components/StatusBadge';
import { UPIQRModal } from '../components/UPIQRModal';

export function DashboardPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reminding, setReminding] = useState(false);
  const [remindMsg, setRemindMsg] = useState('');

  // Payment Modal State
  const [activePaymentModal, setActivePaymentModal] = useState(null);

  const fetchDashboard = async () => {
    try {
      const data = await api.getDashboardAnalytics();
      setAnalytics(data);
    } catch (e) {
      console.error("Dashboard analytics error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [user]);

  const handlePayNow = async (upcoming) => {
    try {
      const initData = await api.initiatePayment(upcoming.obligation_id);
      setActivePaymentModal({
        obligation: upcoming,
        initData: initData
      });
    } catch (err) {
      alert(err.message || "Failed to initiate payment");
    }
  };

  const handleSendAllReminders = async () => {
    setReminding(true);
    try {
      // Find user owned subscriptions and trigger reminders
      const subs = await api.getSubscriptions('owned');
      let count = 0;
      for (const s of subs) {
        const res = await api.sendReminders(s.id);
        count += (res.reminders_sent || 0);
      }
      setRemindMsg(`Dispatched ${count} reminder notification(s) to pending members!`);
      setTimeout(() => setRemindMsg(''), 4000);
      fetchDashboard();
    } catch (e) {
      console.error(e);
    } finally {
      setReminding(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const CATEGORY_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Loading fintech dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {getGreeting()}, {user?.name?.split(' ')[0] || 'Friend'}
            </h1>
            <span className="p-1 rounded-lg bg-emerald-100 text-emerald-800 text-3xs font-extrabold uppercase">
              Fintech Live
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Shared subscriptions, automated UPI cost allocation & transparent settlements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboard}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs"
            title="Refresh data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <Link
            to="/subscriptions/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-sm font-bold shadow-sm shadow-indigo-200 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Shared Split</span>
          </Link>
        </div>
      </div>

      {/* Overdue / Reminder Banner (if unpaid members exist) */}
      {analytics?.unpaid_members_count > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                {analytics.unpaid_members_count} member{analytics.unpaid_members_count > 1 ? 's' : ''} haven't paid their share yet
              </h4>
              <p className="text-xs text-amber-700/80">
                You can trigger automated in-app payment reminders with UPI QR deep-links.
              </p>
            </div>
          </div>

          <button
            onClick={handleSendAllReminders}
            disabled={reminding}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{reminding ? "Dispatching..." : "Send Reminders"}</span>
          </button>
        </div>
      )}

      {remindMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{remindMsg}</span>
        </div>
      )}

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Subscriptions"
          value={analytics?.active_subscriptions_count || 0}
          subtitle="Managed in your portfolio"
          icon={CreditCard}
          color="indigo"
        />
        <StatCard
          title="Monthly Contribution"
          value={formatRupee(analytics?.monthly_contribution_total)}
          subtitle="Total group allocation"
          icon={Wallet}
          color="blue"
        />
        <StatCard
          title="Paid This Month"
          value={formatRupee(analytics?.paid_this_month)}
          subtitle={`${analytics?.payment_completion_rate}% cycle completion`}
          icon={CheckCircle2}
          color="emerald"
          badge="Settled"
        />
        <StatCard
          title="Amount Pending"
          value={formatRupee(analytics?.pending_this_month)}
          subtitle={analytics?.overdue_count ? `${analytics.overdue_count} payment overdue` : 'On track for renewal'}
          icon={Clock}
          color={analytics?.pending_this_month > 0 ? "amber" : "emerald"}
          badge={analytics?.overdue_count ? "Action Needed" : "Clean"}
        />
      </div>

      {/* Main Grid: Upcoming Payments & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (2 Cols): Upcoming Payments & Monthly Trend */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Upcoming Payments Widget */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Upcoming Payments Due</h3>
                  <p className="text-xs text-slate-500">Pay your share directly with 1-click UPI</p>
                </div>
              </div>
              <Link 
                to="/payments" 
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {analytics?.upcoming_payments?.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">All caught up!</h4>
                  <p className="text-xs text-slate-500 mt-0.5">No pending payment obligations for this cycle.</p>
                </div>
              ) : (
                analytics?.upcoming_payments?.map((up) => {
                  const isOverdue = up.days_left < 0 || up.status === "overdue";
                  return (
                    <div 
                      key={up.obligation_id}
                      className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center font-bold text-indigo-700 text-sm shadow-2xs">
                          {up.subscription_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm">{up.subscription_name}</h4>
                            <StatusBadge status={up.status} size="sm" />
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {isOverdue ? (
                              <span className="text-rose-600 font-semibold">
                                Overdue by {Math.abs(up.days_left)} days
                              </span>
                            ) : (
                              <span>Due on {formatDate(up.due_date)} ({up.days_left} days left)</span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4">
                        <div className="text-right">
                          <span className="text-2xs uppercase text-slate-400 font-semibold block">Your Share</span>
                          <span className="font-extrabold text-slate-900 font-mono text-base">
                            {formatRupee(up.amount)}
                          </span>
                        </div>

                        <button
                          onClick={() => handlePayNow(up)}
                          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Pay Now</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Monthly Spend & Collection Chart (Recharts) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Subscription Spend Trend</h3>
                  <p className="text-xs text-slate-500">Historical monthly contributions & collections (INR)</p>
                </div>
              </div>
            </div>

            <div className="h-64 mt-4 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics?.monthly_trend || []}>
                  <defs>
                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip 
                    formatter={(val) => [formatRupee(val), 'Amount']}
                    contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="amount" name="Obligations" stroke="#6366F1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSpend)" />
                  <Area type="monotone" dataKey="collected" name="Collected" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCollected)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Right Column (1 Col): Category Spend & Recent Activity */}
        <div className="space-y-8">
          
          {/* Category Breakdown (Recharts Pie) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
            <h3 className="font-bold text-base text-slate-900 pb-3 border-b border-slate-100">
              Spending by Category
            </h3>
            <div className="h-52 mt-2 w-full">
              {analytics?.category_breakdown?.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No subscriptions found
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics?.category_breakdown || []}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {analytics?.category_breakdown?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(v) => formatRupee(v)}
                      contentStyle={{ backgroundColor: '#0F172A', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Recent UPI Activity</h3>
              <Link to="/transactions" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                All logs
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {analytics?.recent_transactions?.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No recent transactions recorded</p>
              ) : (
                analytics?.recent_transactions?.map((t) => (
                  <div key={t.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900">{t.payer_name}</span>
                        <span className="text-slate-400">&rarr;</span>
                        <span className="font-medium text-slate-700">{t.receiver_name}</span>
                      </div>
                      <p className="text-3xs text-slate-400 mt-0.5">
                        {t.subscription_name} • <span className="font-mono">{t.upi_txn_id}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-slate-900 font-mono text-sm block">
                        {formatRupee(t.amount)}
                      </span>
                      <StatusBadge status={t.status} size="sm" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Payment Modal */}
      {activePaymentModal && (
        <UPIQRModal
          obligation={activePaymentModal.obligation}
          initData={activePaymentModal.initData}
          onClose={() => setActivePaymentModal(null)}
          onPaymentSuccess={() => {
            setActivePaymentModal(null);
            fetchDashboard();
          }}
        />
      )}

    </div>
  );
}
