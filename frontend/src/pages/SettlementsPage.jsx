import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, CheckCircle2, Clock, AlertTriangle, Send, QrCode, ShieldCheck, ChevronRight } from 'lucide-react';
import { api } from '../services/api';
import { formatRupee } from '../utils/currency';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export function SettlementsPage() {
  const { user } = useAuth();
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [remindMsg, setRemindMsg] = useState('');

  const fetchSettlements = async () => {
    setLoading(true);
    try {
      const data = await api.getSettlements();
      setSettlements(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlements();
  }, [user]);

  const handleSendReminder = async (subId) => {
    try {
      const res = await api.sendReminders(subId);
      setRemindMsg(res.message || "Reminders sent successfully!");
      setTimeout(() => setRemindMsg(''), 4000);
      fetchSettlements();
    } catch (e) {
      alert(e.message || "Failed to send reminders");
    }
  };

  const totalFronted = settlements.reduce((acc, s) => acc + s.total_bill_amount, 0);
  const totalCollected = settlements.reduce((acc, s) => acc + s.total_collected, 0);
  const totalOutstanding = settlements.reduce((acc, s) => acc + s.total_pending, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Settlement Tracking Engine
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          When you pay the primary subscription upfront, SplitSub tracks exact member debts and UPI reimbursements.
        </p>
      </div>

      {remindMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{remindMsg}</span>
        </div>
      )}

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Total Fronted By You</span>
          <span className="text-2xl font-black font-mono text-slate-900 mt-1 block">{formatRupee(totalFronted)}</span>
          <p className="text-2xs text-slate-500 mt-1">Primary subscriptions you paid upfront</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-emerald-100 bg-emerald-50/30 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 block">Reimbursed To You</span>
          <span className="text-2xl font-black font-mono text-emerald-700 mt-1 block">{formatRupee(totalCollected)}</span>
          <p className="text-2xs text-emerald-600 mt-1">Settled contributions received via UPI</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-amber-100 bg-amber-50/30 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600 block">Pending To Collect</span>
          <span className="text-2xl font-black font-mono text-amber-700 mt-1 block">{formatRupee(totalOutstanding)}</span>
          <p className="text-2xs text-amber-600 mt-1">Remaining debts owed by co-members</p>
        </div>
      </div>

      {/* Settlements List by Subscription */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs font-semibold text-slate-500">Loading settlements...</p>
          </div>
        ) : settlements.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <ArrowRightLeft className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No active settlements</h3>
            <p className="text-xs text-slate-500 mt-1">
              You haven't fronted any subscriptions yet, or all your groups are fully settled.
            </p>
          </div>
        ) : (
          settlements.map((s) => {
            const progressPct = Math.min(100, Math.round((s.total_collected / s.total_bill_amount) * 100));
            return (
              <div key={s.id} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5">
                
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-lg text-slate-900">{s.subscription_name}</h3>
                      {s.is_fully_settled ? (
                        <span className="text-3xs uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Fully Settled
                        </span>
                      ) : (
                        <span className="text-3xs uppercase font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          Settlement Pending
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Cycle #{s.billing_cycle_id} • Fronted by: <strong>{s.owner_name}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {!s.is_fully_settled && (
                      <button
                        onClick={() => handleSendReminder(s.subscription_id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition-colors shadow-2xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Remind Pending</span>
                      </button>
                    )}

                    <Link
                      to={`/subscriptions/${s.subscription_id}`}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <span>Manage</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Progress bar & breakdown */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                    <span>
                      Collected {formatRupee(s.total_collected)} of {formatRupee(s.total_bill_amount)}
                    </span>
                    <span className="font-mono text-emerald-600">{progressPct}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Member Debts Breakdown */}
                <div className="space-y-2 pt-2">
                  <span className="text-2xs uppercase font-bold text-slate-400 tracking-wider block">
                    Individual Member Breakdown
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {s.debts?.map((d) => (
                      <div 
                        key={d.member_id}
                        className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between ${
                          d.status === "paid" 
                            ? "bg-emerald-50/40 border-emerald-100" 
                            : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <div>
                          <span className="font-bold text-slate-900 block">{d.name}</span>
                          <span className="text-3xs text-slate-400 truncate block">{d.email}</span>
                        </div>

                        <div className="text-right">
                          <span className="font-bold font-mono text-sm block">
                            {d.status === "paid" ? formatRupee(d.amount_paid) : formatRupee(d.amount_owed)}
                          </span>
                          <StatusBadge status={d.status} size="sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
