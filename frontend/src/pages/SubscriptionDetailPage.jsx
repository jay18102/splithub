import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, CreditCard, Users, Calendar, ShieldCheck, 
  Send, Plus, Trash2, PauseCircle, PlayCircle, RefreshCw, 
  QrCode, AlertTriangle, CheckCircle2, ChevronRight, History, 
  Percent, Sparkles, Copy, Check
} from 'lucide-react';
import { api } from '../services/api';
import { formatRupee, formatDate } from '../utils/currency';
import { StatusBadge } from '../components/StatusBadge';
import { UPIQRModal } from '../components/UPIQRModal';
import { useAuth } from '../context/AuthContext';

export function SubscriptionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [subscription, setSubscription] = useState(null);
  const [settlement, setSettlement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  // Add member state
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('member');

  // Payment modal state
  const [paymentModalData, setPaymentModalData] = useState(null);

  const fetchDetails = async () => {
    try {
      const data = await api.getSubscription(id);
      setSubscription(data);

      try {
        const settleData = await api.getSubscriptionSettlement(id);
        setSettlement(settleData);
      } catch (se) {
        console.warn("Settlement fetch:", se);
      }
    } catch (err) {
      setError(err.message || "Failed to load subscription details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id, user]);

  const isOwner = subscription?.owner_id === user?.id;

  const handlePayMyShare = async (member) => {
    try {
      // Find the obligation id for this member in the active cycle
      const obligations = await api.getObligations();
      const myOb = obligations.find(o => o.subscription_id === Number(id) && o.status !== "paid");
      if (!myOb) {
        alert("No pending obligation found for this subscription.");
        return;
      }
      const initData = await api.initiatePayment(myOb.id);
      setPaymentModalData({
        obligation: myOb,
        initData: initData
      });
    } catch (e) {
      alert(e.message || "Failed to initiate payment");
    }
  };

  const handleSendReminders = async () => {
    try {
      const res = await api.sendReminders(id);
      setActionMsg(res.message || "Reminders sent successfully!");
      setTimeout(() => setActionMsg(''), 4000);
      fetchDetails();
    } catch (e) {
      alert(e.message || "Failed to send reminders");
    }
  };

  const handleTogglePause = async () => {
    try {
      if (subscription.status === 'paused') {
        await api.resumeSubscription(id);
      } else {
        await api.pauseSubscription(id);
      }
      fetchDetails();
    } catch (e) {
      alert(e.message || "Failed to toggle status");
    }
  };

  const handleAdvanceCycle = async () => {
    if (!confirm("Are you sure you want to advance to the next billing cycle? New payment obligations will be generated for all members.")) return;
    try {
      await api.generateNextCycle(id);
      setActionMsg("Successfully advanced to next billing cycle!");
      setTimeout(() => setActionMsg(''), 4000);
      fetchDetails();
    } catch (e) {
      alert(e.message || "Failed to advance cycle");
    }
  };

  const handleAddMemberSubmit = async (e) => {
    e.preventDefault();
    if (!memberEmail.trim()) return;
    try {
      await api.addMember(id, memberEmail.trim(), memberRole);
      setMemberEmail('');
      setShowAddMember(false);
      setActionMsg("Member added successfully!");
      setTimeout(() => setActionMsg(''), 4000);
      fetchDetails();
    } catch (e) {
      alert(e.message || "Failed to add member");
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm("Remove this member from the subscription?")) return;
    try {
      await api.removeMember(id, memberId);
      setActionMsg("Member removed.");
      setTimeout(() => setActionMsg(''), 4000);
      fetchDetails();
    } catch (e) {
      alert(e.message || "Failed to remove member");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500">Loading subscription details...</p>
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">{error || "Subscription not found"}</h3>
        <Link to="/subscriptions" className="inline-block text-xs font-semibold text-indigo-600 hover:text-indigo-800">
          &larr; Back to all subscriptions
        </Link>
      </div>
    );
  }

  // Calculate settlement progress percentage
  const totalBill = settlement?.total_bill_amount || subscription.total_price;
  const totalCollected = settlement?.total_collected || 0;
  const settlementPct = Math.min(100, Math.round((totalCollected / totalBill) * 100));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Back Link */}
      <Link 
        to="/subscriptions" 
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Subscriptions</span>
      </Link>

      {/* Action Notification Message */}
      {actionMsg && (
        <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Main Subscription Hero Header */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="text-3xs uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-400/20">
                {subscription.category}
              </span>
              <StatusBadge status={subscription.status} size="sm" />
              <span className="text-3xs font-mono text-slate-300 bg-white/10 px-2 py-0.5 rounded-full">
                Split: {subscription.split_rule?.split_type || 'equal'}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{subscription.name}</h1>
            {subscription.description && (
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                {subscription.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-400" />
                Next Due: <strong>{formatDate(subscription.next_billing_date)}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Owner UPI: <strong className="font-mono">{subscription.owner?.upi_id || 'Platform'}</strong>
              </span>
            </div>
          </div>

          {/* Pricing Box */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 text-right min-w-[200px]">
            <span className="text-3xs uppercase tracking-wider text-indigo-300 font-bold block">
              Total Subscription Bill
            </span>
            <span className="text-3xl font-black font-mono text-emerald-400 block mt-0.5">
              {formatRupee(subscription.total_price)}
            </span>
            <span className="text-xs text-slate-300 capitalize">
              billed {subscription.billing_frequency}
            </span>

            {/* Quick Actions for Owner */}
            {isOwner && (
              <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-2">
                <button
                  onClick={handleSendReminders}
                  className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Reminders</span>
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={handleTogglePause}
                    className="flex-1 py-1.5 px-2 bg-white/10 hover:bg-white/20 text-xs font-semibold rounded-lg text-slate-200 transition-colors"
                  >
                    {subscription.status === 'paused' ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    onClick={handleAdvanceCycle}
                    className="flex-1 py-1.5 px-2 bg-indigo-500 hover:bg-indigo-600 text-xs font-semibold rounded-lg text-white transition-colors"
                    title="Generate next billing cycle"
                  >
                    + Next Cycle
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Settlement Overview Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-base text-slate-900">Settlement System Overview</h3>
            <p className="text-xs text-slate-500">
              {isOwner 
                ? "You paid the primary subscription bill. Below is what group members have settled vs owe you."
                : `Owner (${subscription.owner?.name}) fronted the bill. Settle your contribution below.`}
            </p>
          </div>
          <span className="text-xs font-extrabold font-mono text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 self-start sm:self-auto">
            Cycle #{subscription.active_cycle?.cycle_number || 1}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="text-2xs uppercase font-bold text-slate-400 block tracking-wider">Owner Fronted</span>
            <span className="text-xl font-bold font-mono text-slate-900 mt-1 block">
              {formatRupee(totalBill)}
            </span>
            <span className="text-3xs text-emerald-600 font-semibold">Primary Bill Paid</span>
          </div>

          <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100">
            <span className="text-2xs uppercase font-bold text-emerald-600 block tracking-wider">Total Collected</span>
            <span className="text-xl font-bold font-mono text-emerald-700 mt-1 block">
              {formatRupee(totalCollected)}
            </span>
            <span className="text-3xs text-emerald-600 font-semibold">{settlementPct}% Collected</span>
          </div>

          <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-100">
            <span className="text-2xs uppercase font-bold text-amber-600 block tracking-wider">Remaining Outstanding</span>
            <span className="text-xl font-bold font-mono text-amber-700 mt-1 block">
              {formatRupee(settlement?.total_pending || 0)}
            </span>
            <span className="text-3xs text-amber-600 font-semibold">
              {settlement?.is_fully_settled ? 'Fully Settled!' : 'Pending Settlement'}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="pt-2">
          <div className="flex justify-between text-2xs font-bold text-slate-600 mb-1">
            <span>Settlement Collection Progress</span>
            <span>{settlementPct}%</span>
          </div>
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${settlementPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Members & Contributions Table */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Group Members & Obligations</h3>
              <p className="text-xs text-slate-500">Track individual payments and due dates</p>
            </div>
          </div>

          {isOwner && (
            <button
              onClick={() => setShowAddMember(!showAddMember)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Friend</span>
            </button>
          )}
        </div>

        {/* Add Member Dropdown Form */}
        {showAddMember && (
          <form onSubmit={handleAddMemberSubmit} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              placeholder="Friend's email address..."
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              className="flex-1 px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={memberRole}
              onChange={(e) => setMemberRole(e.target.value)}
              className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-semibold text-slate-700 focus:outline-none"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
            >
              Confirm Add
            </button>
          </form>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase text-3xs font-bold tracking-wider">
                <th className="pb-3 font-bold">Member</th>
                <th className="pb-3 font-bold">Role</th>
                <th className="pb-3 font-bold">Allocated Share</th>
                <th className="pb-3 font-bold">Payment Status</th>
                <th className="pb-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscription.members.map((m) => {
                const isMe = m.user_id === user?.id;
                const isPending = m.payment_status !== "paid";
                return (
                  <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-100 to-indigo-200 text-indigo-700 font-bold text-xs flex items-center justify-center shadow-2xs">
                          {m.name ? m.name[0].toUpperCase() : 'M'}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">
                            {m.name} {isMe && <span className="text-indigo-600 font-medium">(You)</span>}
                          </span>
                          <span className="text-3xs text-slate-400 font-mono">{m.upi_id || m.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-3xs font-bold uppercase ${
                        m.role === 'owner' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {m.role}
                      </span>
                    </td>

                    <td className="py-3.5">
                      <span className="font-mono font-extrabold text-slate-900 text-sm">
                        {formatRupee(m.contribution_amount)}
                      </span>
                    </td>

                    <td className="py-3.5">
                      <StatusBadge status={m.payment_status} size="sm" />
                    </td>

                    <td className="py-3.5 text-right space-x-2">
                      {/* If me and pending, show Pay Now */}
                      {isMe && isPending && (
                        <button
                          onClick={() => handlePayMyShare(m)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-2xs transition-colors"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Pay UPI</span>
                        </button>
                      )}

                      {/* Remove member option for owner */}
                      {isOwner && m.role !== 'owner' && (
                        <button
                          onClick={() => handleRemoveMember(m.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Remove member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Billing Cycles History */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-4">
        <h3 className="font-extrabold text-base text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-600" />
          <span>Billing Cycles Ledger</span>
        </h3>

        <div className="space-y-2">
          {subscription.all_cycles?.map((cycle) => (
            <div key={cycle.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">
                  Cycle #{cycle.cycle_number}
                </span>
                <div>
                  <span className="font-semibold text-slate-800">
                    {formatDate(cycle.start_date)} &rarr; {formatDate(cycle.due_date)}
                  </span>
                  <span className="text-3xs text-slate-400 block mt-0.5">
                    Total: {formatRupee(cycle.total_amount)}
                  </span>
                </div>
              </div>

              <StatusBadge status={cycle.status} size="sm" />
            </div>
          ))}
        </div>
      </div>

      {/* Payment Modal */}
      {paymentModalData && (
        <UPIQRModal
          obligation={paymentModalData.obligation}
          initData={paymentModalData.initData}
          onClose={() => setPaymentModalData(null)}
          onPaymentSuccess={() => {
            setPaymentModalData(null);
            fetchDetails();
          }}
        />
      )}

    </div>
  );
}
