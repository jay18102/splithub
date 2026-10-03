import React, { useState, useEffect } from 'react';
import { History, Search, Download, ArrowUpRight, ArrowDownLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { formatRupee, formatDateTime } from '../utils/currency';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

export function TransactionsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const data = await api.getTransactions({ status: statusFilter || undefined });
      setTransactions(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [statusFilter, user]);

  const filteredTxns = transactions.filter(t => 
    t.subscription_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.payer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.receiver_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.upi_txn_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Transaction History & Audit
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Complete financial audit trail with NPCI UPI Reference Numbers (RRNs).
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-colors shadow-2xs self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export / Print</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {[
            { id: '', label: 'All Transactions' },
            { id: 'successful', label: 'Successful' },
            { id: 'failed', label: 'Failed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                statusFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, UPI RRN, service..."
            className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs font-semibold text-slate-500">Loading ledger...</p>
          </div>
        ) : filteredTxns.length === 0 ? (
          <div className="p-12 text-center max-w-lg mx-auto">
            <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <History className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No transactions recorded</h3>
            <p className="text-xs text-slate-500 mt-1">
              Payments completed via UPI will show up here with full bank reference numbers.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase text-3xs font-bold tracking-wider">
                <tr>
                  <th className="py-3.5 px-6 font-bold">UPI RRN / Txn ID</th>
                  <th className="py-3.5 px-4 font-bold">Subscription</th>
                  <th className="py-3.5 px-4 font-bold">Payer & Receiver</th>
                  <th className="py-3.5 px-4 font-bold">Date & Time</th>
                  <th className="py-3.5 px-4 font-bold text-right">Amount</th>
                  <th className="py-3.5 px-6 font-bold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTxns.map((t) => {
                  const isPayer = t.payer_id === user?.id;
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 text-xs">
                            {t.upi_txn_id}
                          </span>
                        </div>
                        <span className="text-3xs text-slate-400 block font-mono mt-0.5">Method: {t.payment_method}</span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="font-bold text-slate-900 block">{t.subscription_name}</span>
                        {t.notes && <span className="text-3xs text-slate-500 block truncate max-w-xs">{t.notes}</span>}
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <span className={isPayer ? "font-bold text-indigo-700" : ""}>{t.payer_name}</span>
                          <span className="text-slate-400">&rarr;</span>
                          <span className={!isPayer ? "font-bold text-emerald-700" : ""}>{t.receiver_name}</span>
                        </div>
                        <span className="text-3xs font-mono text-slate-400 block mt-0.5">
                          {t.upi_vpa_payer || 'VPA'} &bull; {t.upi_vpa_receiver || 'VPA'}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-slate-500 text-xs">
                        {formatDateTime(t.timestamp)}
                      </td>

                      <td className="py-4 px-4 text-right">
                        <span className="font-mono font-extrabold text-sm text-slate-900">
                          {formatRupee(t.amount)}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <StatusBadge status={t.status} size="sm" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
