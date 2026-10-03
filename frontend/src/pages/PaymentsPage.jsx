import React, { useState, useEffect } from 'react';
import { Wallet, QrCode, Search, CheckCircle2, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { formatRupee, formatDate } from '../utils/currency';
import { StatusBadge } from '../components/StatusBadge';
import { UPIQRModal } from '../components/UPIQRModal';
import { useAuth } from '../context/AuthContext';

export function PaymentsPage() {
  const { user } = useAuth();
  const [obligations, setObligations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(''); // '' | 'pending' | 'overdue' | 'paid'
  const [activePaymentModal, setActivePaymentModal] = useState(null);

  const fetchObligations = async () => {
    setLoading(true);
    try {
      const data = await api.getObligations(statusFilter || undefined);
      setObligations(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObligations();
  }, [statusFilter, user]);

  const handlePay = async (ob) => {
    try {
      const initData = await api.initiatePayment(ob.id);
      setActivePaymentModal({
        obligation: ob,
        initData: initData
      });
    } catch (e) {
      alert(e.message || "Failed to initiate payment");
    }
  };

  const pendingCount = obligations.filter(o => o.status === 'pending' || o.status === 'overdue').length;
  const totalPendingAmount = obligations
    .filter(o => o.status === 'pending' || o.status === 'overdue')
    .reduce((acc, o) => acc + o.amount, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            My Payment Obligations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track your personal subscription shares and pay instantly via UPI.
          </p>
        </div>

        {totalPendingAmount > 0 && (
          <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-2xl flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-600" />
            <div>
              <span className="text-2xs font-bold uppercase tracking-wider text-amber-800 block">Total Due</span>
              <span className="font-black font-mono text-amber-900 text-base">{formatRupee(totalPendingAmount)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs w-fit">
        {[
          { id: '', label: 'All Obligations' },
          { id: 'pending', label: 'Pending' },
          { id: 'overdue', label: 'Overdue' },
          { id: 'paid', label: 'Paid History' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              statusFilter === tab.id
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Obligations List */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs font-semibold text-slate-500">Loading payment obligations...</p>
        </div>
      ) : obligations.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No payment obligations</h3>
          <p className="text-xs text-slate-500 mt-1">
            You have no obligations matching this filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {obligations.map((ob) => {
            const isUnpaid = ob.status !== "paid";
            return (
              <div 
                key={ob.id}
                className="bg-white rounded-3xl border border-slate-200 hover:shadow-md transition-all p-6 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900">{ob.subscription_name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Pay to: <strong>{ob.receiver_name}</strong></p>
                    </div>
                    <StatusBadge status={ob.status} size="sm" />
                  </div>

                  <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-3xs font-bold uppercase text-slate-400 block tracking-wider">Your Share</span>
                      <span className="font-black font-mono text-2xl text-slate-900 block mt-0.5">
                        {formatRupee(ob.amount)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-3xs font-bold uppercase text-slate-400 block tracking-wider">Due Date</span>
                      <span className="font-bold text-xs text-slate-700 block mt-0.5">
                        {formatDate(ob.due_date)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 text-3xs font-mono text-slate-400 flex items-center justify-between">
                    <span>Ref: {ob.payment_reference}</span>
                    <span>VPA: {ob.receiver_upi_id}</span>
                  </div>
                </div>

                {isUnpaid ? (
                  <button
                    onClick={() => handlePay(ob)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Pay with UPI</span>
                  </button>
                ) : (
                  <div className="py-2 text-center text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Settled via UPI</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Payment Modal */}
      {activePaymentModal && (
        <UPIQRModal
          obligation={activePaymentModal.obligation}
          initData={activePaymentModal.initData}
          onClose={() => setActivePaymentModal(null)}
          onPaymentSuccess={() => {
            setActivePaymentModal(null);
            fetchObligations();
          }}
        />
      )}

    </div>
  );
}
