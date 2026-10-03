import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, CreditCard, Users, Calendar, ArrowRight, 
  Search, Shield, CheckCircle2, AlertCircle, Clock 
} from 'lucide-react';
import { api } from '../services/api';
import { formatRupee, formatDate } from '../utils/currency';
import { StatusBadge } from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';

export function SubscriptionsListPage() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState(''); // '' | 'owned' | 'member'
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const data = await api.getSubscriptions(roleFilter || undefined);
      setSubscriptions(data || []);
    } catch (e) {
      console.error("Error loading subscriptions:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [roleFilter, user]);

  const filteredSubs = subscriptions.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Shared Subscriptions
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your groups, cost splits, and recurring billing cycles.
          </p>
        </div>

        <Link
          to="/subscriptions/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-xs hover:shadow transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Subscription</span>
        </Link>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {[
            { id: '', label: 'All Subscriptions' },
            { id: 'owned', label: 'Owned by Me' },
            { id: 'member', label: 'Member Only' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRoleFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                roleFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subscriptions..."
            className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Subscriptions Grid */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-xs font-semibold text-slate-500">Loading subscriptions...</p>
        </div>
      ) : filteredSubs.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <CreditCard className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No subscriptions found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {searchQuery ? "No matches for your search query." : "You haven't joined or created any shared subscriptions yet."}
          </p>
          <Link
            to="/subscriptions/new"
            className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Split</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubs.map((sub) => {
            const isOwner = sub.owner_id === user?.id;
            return (
              <div
                key={sub.id}
                className="bg-white rounded-3xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                <div className="p-6 space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-50 to-slate-100 border border-slate-200 flex items-center justify-center font-bold text-indigo-700 text-sm shadow-2xs group-hover:scale-105 transition-transform">
                        {sub.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base leading-tight group-hover:text-indigo-600 transition-colors">
                          {sub.name}
                        </h3>
                        <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 inline-block mt-0.5">
                          {sub.category}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={sub.status} size="sm" />
                  </div>

                  {/* Pricing info */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-3xs uppercase font-bold text-slate-400 block tracking-wider">Total Bill</span>
                      <span className="font-extrabold text-slate-900 font-mono text-lg">
                        {formatRupee(sub.total_price)}
                      </span>
                      <span className="text-3xs text-slate-500 block">/ {sub.billing_frequency}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-3xs uppercase font-bold text-slate-400 block tracking-wider">
                        {isOwner ? "Owner Share" : "Your Share"}
                      </span>
                      <span className="font-extrabold text-indigo-600 font-mono text-lg">
                        {sub.my_contribution !== null ? formatRupee(sub.my_contribution) : "—"}
                      </span>
                      <div className="mt-0.5">
                        <StatusBadge status={sub.my_payment_status} size="sm" />
                      </div>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="space-y-1.5 text-xs text-slate-500">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>Members</span>
                      </span>
                      <span className="font-semibold text-slate-800">{sub.member_count} people</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Next Billing</span>
                      </span>
                      <span className="font-semibold text-slate-800">{formatDate(sub.next_billing_date)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-slate-400" />
                        <span>Owner / VPA</span>
                      </span>
                      <span className="font-mono text-3xs text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                        {sub.owner_upi_id || 'Platform'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Link */}
                <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    {isOwner ? "You are Owner" : `Managed by ${sub.owner_name || 'Admin'}`}
                  </span>
                  <Link
                    to={`/subscriptions/${sub.id}`}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 group-hover:translate-x-0.5 transition-transform"
                  >
                    <span>Manage Group</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
