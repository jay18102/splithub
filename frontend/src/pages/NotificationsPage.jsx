import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Clock, AlertTriangle, Sparkles, CreditCard, Shield } from 'lucide-react';
import { api } from '../services/api';
import { formatDateTime } from '../utils/currency';
import { useAuth } from '../context/AuthContext';

export function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications();
      setNotifications(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, [user]);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkSingleRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const getNotifIcon = (type) => {
    if (type === 'reminder') return <Clock className="w-4 h-4 text-amber-600" />;
    if (type === 'payment_success') return <Check className="w-4 h-4 text-emerald-600" />;
    if (type === 'payment_failed') return <AlertTriangle className="w-4 h-4 text-rose-600" />;
    if (type === 'invitation') return <Sparkles className="w-4 h-4 text-indigo-600" />;
    return <Bell className="w-4 h-4 text-slate-500" />;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Notification Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Payment reminders, contribution confirmations, and cycle alerts.
          </p>
        </div>

        {notifications.some(n => !n.is_read) && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-indigo-700 text-xs font-bold rounded-xl transition-colors shadow-2xs"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs font-semibold text-slate-500">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            No notifications available.
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors ${
                !n.is_read ? 'bg-indigo-50/30' : 'hover:bg-slate-50/70'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 bg-white rounded-2xl border border-slate-200 shadow-2xs mt-0.5">
                  {getNotifIcon(n.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-slate-900">{n.title}</h4>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                  <span className="text-3xs text-slate-400 mt-2 block font-medium">
                    {formatDateTime(n.created_at)}
                  </span>
                </div>
              </div>

              {!n.is_read && (
                <button
                  onClick={() => handleMarkSingleRead(n.id)}
                  className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-white transition-colors shrink-0"
                  title="Mark as read"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
