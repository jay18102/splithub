import React from 'react';

export function StatCard({ title, value, subtitle, icon: Icon, color = "indigo", badge }) {
  const colorMap = {
    indigo: {
      bg: "bg-indigo-50/70 border-indigo-100",
      iconBg: "bg-indigo-600 text-white",
      badge: "bg-indigo-100 text-indigo-700",
      accent: "text-indigo-600"
    },
    emerald: {
      bg: "bg-emerald-50/70 border-emerald-100",
      iconBg: "bg-emerald-600 text-white",
      badge: "bg-emerald-100 text-emerald-800",
      accent: "text-emerald-600"
    },
    amber: {
      bg: "bg-amber-50/70 border-amber-100",
      iconBg: "bg-amber-600 text-white",
      badge: "bg-amber-100 text-amber-800",
      accent: "text-amber-600"
    },
    rose: {
      bg: "bg-rose-50/70 border-rose-100",
      iconBg: "bg-rose-600 text-white",
      badge: "bg-rose-100 text-rose-800",
      accent: "text-rose-600"
    },
    blue: {
      bg: "bg-blue-50/70 border-blue-100",
      iconBg: "bg-blue-600 text-white",
      badge: "bg-blue-100 text-blue-800",
      accent: "text-blue-600"
    }
  };

  const scheme = colorMap[color] || colorMap.indigo;

  return (
    <div className={`p-5 rounded-2xl border ${scheme.bg} bg-white shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</span>
        {Icon && (
          <div className={`p-2.5 rounded-xl shadow-xs ${scheme.iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="mt-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900">{value}</span>
          {badge && (
            <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full ${scheme.badge}`}>
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-1 font-medium">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
