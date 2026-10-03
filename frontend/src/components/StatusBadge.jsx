import React from 'react';
import { CheckCircle2, Clock, AlertCircle, XCircle, ArrowUpRight } from 'lucide-react';

export function StatusBadge({ status, size = "md" }) {
  const s = (status || "").toLowerCase();
  
  const sizeClasses = size === "sm" 
    ? "px-2 py-0.5 text-xs font-medium gap-1"
    : "px-2.5 py-1 text-xs font-semibold gap-1.5";

  if (s === "paid" || s === "successful" || s === "completed") {
    return (
      <span className={`inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-xs ${sizeClasses}`}>
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        Paid
      </span>
    );
  }

  if (s === "overdue") {
    return (
      <span className={`inline-flex items-center rounded-full bg-rose-50 text-rose-700 border border-rose-200 shadow-xs ${sizeClasses}`}>
        <AlertCircle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
        Overdue
      </span>
    );
  }

  if (s === "pending" || s === "requested") {
    return (
      <span className={`inline-flex items-center rounded-full bg-amber-50 text-amber-700 border border-amber-200 shadow-xs ${sizeClasses}`}>
        <Clock className="w-3.5 h-3.5 text-amber-600" />
        Pending
      </span>
    );
  }

  if (s === "initiated") {
    return (
      <span className={`inline-flex items-center rounded-full bg-blue-50 text-blue-700 border border-blue-200 shadow-xs ${sizeClasses}`}>
        <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
        Initiated
      </span>
    );
  }

  if (s === "failed") {
    return (
      <span className={`inline-flex items-center rounded-full bg-red-50 text-red-700 border border-red-200 shadow-xs ${sizeClasses}`}>
        <XCircle className="w-3.5 h-3.5 text-red-600" />
        Failed
      </span>
    );
  }

  if (s === "active") {
    return (
      <span className={`inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        Active
      </span>
    );
  }

  if (s === "paused") {
    return (
      <span className={`inline-flex items-center rounded-full bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses}`}>
        Paused
      </span>
    );
  }

  if (s === "cancelled") {
    return (
      <span className={`inline-flex items-center rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 ${sizeClasses}`}>
        Cancelled
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center rounded-full bg-slate-100 text-slate-600 border border-slate-200 ${sizeClasses}`}>
      {status || "Unknown"}
    </span>
  );
}
