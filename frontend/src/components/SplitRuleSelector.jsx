import React, { useState, useEffect } from 'react';
import { Users, Percent, DollarSign, Activity, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { formatRupee } from '../utils/currency';
import { api } from '../services/api';

export function SplitRuleSelector({ totalPrice, members, splitType, setSplitType, memberValues, setMemberValues, onCalculated }) {
  const [preview, setPreview] = useState(null);
  const [calculating, setCalculating] = useState(false);

  // Split options
  const splitModes = [
    { id: 'equal', title: 'Equal Split', desc: 'Divide cost evenly among all members', icon: Users },
    { id: 'percentage', title: 'Percentage Split', desc: 'Assign custom % (must equal 100%)', icon: Percent },
    { id: 'custom', title: 'Custom Amount', desc: 'Assign exact fixed amounts in ₹', icon: DollarSign },
    { id: 'usage', title: 'Usage-Based', desc: 'Weight by screens or slots (e.g. 2, 1, 1)', icon: Activity },
  ];

  // Request preview whenever values change
  useEffect(() => {
    async function updatePreview() {
      if (!totalPrice || !members || members.length === 0) return;
      setCalculating(true);
      try {
        const payload = {
          total_price: Number(totalPrice),
          split_type: splitType,
          members: members.map((m, idx) => ({
            user_id: m.user_id,
            email: m.email,
            name: m.name || `Member ${idx + 1}`,
            role: m.role || 'member',
            value: memberValues[m.user_id || m.email || idx] !== undefined 
              ? Number(memberValues[m.user_id || m.email || idx])
              : (splitType === 'equal' ? null : (splitType === 'percentage' ? 100 / members.length : 1))
          }))
        };

        const res = await api.previewSplit(payload);
        setPreview(res);
        if (onCalculated && res.is_valid) {
          onCalculated(res.allocations);
        }
      } catch (e) {
        console.error("Preview error:", e);
      } finally {
        setCalculating(false);
      }
    }
    const t = setTimeout(updatePreview, 150);
    return () => clearTimeout(t);
  }, [totalPrice, members, splitType, memberValues]);

  const handleValueChange = (key, val) => {
    setMemberValues(prev => ({
      ...prev,
      [key]: val
    }));
  };

  // Validation metrics for custom & percentage
  const currentTotal = Object.values(memberValues).reduce((acc, v) => acc + (Number(v) || 0), 0);
  const pctValid = Math.abs(currentTotal - 100) < 0.1;
  const customValid = Math.abs(currentTotal - Number(totalPrice)) < 1;

  return (
    <div className="space-y-6">
      {/* Split Mode Selector Tabs */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
          Choose Splitting Method
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {splitModes.map((mode) => {
            const Icon = mode.icon;
            const isSelected = splitType === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => {
                  setSplitType(mode.id);
                  // Initialize reasonable defaults if switching
                  if (mode.id === 'percentage') {
                    const even = Math.floor(100 / members.length);
                    const initVals = {};
                    members.forEach((m, idx) => {
                      const key = m.user_id || m.email || idx;
                      initVals[key] = idx === 0 ? (100 - even * (members.length - 1)) : even;
                    });
                    setMemberValues(initVals);
                  } else if (mode.id === 'usage') {
                    const initVals = {};
                    members.forEach((m, idx) => {
                      const key = m.user_id || m.email || idx;
                      initVals[key] = 1;
                    });
                    setMemberValues(initVals);
                  } else if (mode.id === 'custom') {
                    const even = Math.floor(totalPrice / members.length);
                    const initVals = {};
                    members.forEach((m, idx) => {
                      const key = m.user_id || m.email || idx;
                      initVals[key] = idx === 0 ? (totalPrice - even * (members.length - 1)) : even;
                    });
                    setMemberValues(initVals);
                  }
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                  isSelected 
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-600' 
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{mode.title}</h4>
                    <p className="text-2xs text-slate-500 leading-tight mt-0.5">{mode.desc}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Member Value Configuration Inputs (if not equal) */}
      {splitType !== 'equal' && (
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              {splitType === 'percentage' && 'Assign Member Percentages'}
              {splitType === 'custom' && 'Assign Custom Amounts (in ₹)'}
              {splitType === 'usage' && 'Assign Screen / Usage Weight'}
            </span>
            {splitType === 'percentage' && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pctValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                Total: {currentTotal}% / 100%
              </span>
            )}
            {splitType === 'custom' && (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${customValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                Total: {formatRupee(currentTotal)} / {formatRupee(totalPrice)}
              </span>
            )}
          </div>

          <div className="space-y-2">
            {members.map((m, idx) => {
              const key = m.user_id || m.email || idx;
              const val = memberValues[key] !== undefined ? memberValues[key] : '';
              return (
                <div key={key} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                      {(m.name || 'M')[0].toUpperCase()}
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-slate-800">{m.name || m.email}</span>
                      {m.role === 'owner' && <span className="ml-1.5 text-3xs font-bold text-indigo-600 uppercase bg-indigo-50 px-1 py-0.2 rounded">Owner</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {splitType === 'percentage' && (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={val}
                          onChange={(e) => handleValueChange(key, e.target.value)}
                          className="w-20 px-2 py-1 text-right text-xs font-semibold border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className="text-xs font-bold text-slate-500">%</span>
                      </div>
                    )}
                    {splitType === 'custom' && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-bold text-slate-500">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={val}
                          onChange={(e) => handleValueChange(key, e.target.value)}
                          className="w-24 px-2 py-1 text-right text-xs font-semibold border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    )}
                    {splitType === 'usage' && (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={val}
                          onChange={(e) => handleValueChange(key, e.target.value)}
                          className="w-16 px-2 py-1 text-center text-xs font-semibold border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className="text-xs text-slate-500 font-medium">screens</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Real-time Calculation Breakdown Preview */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Exact Contribution Breakdown</h4>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Total: <strong className="text-slate-900">{formatRupee(totalPrice)}</strong>
          </span>
        </div>

        {preview && !preview.is_valid ? (
          <div className="mt-3 p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{preview.error_message || "Calculation invalid."}</span>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {preview?.allocations.map((alloc, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-slate-50/80 border border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800">{alloc.name}</span>
                  <span className="text-3xs text-slate-400">({alloc.share_description})</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {alloc.percentage}%
                  </span>
                  <span className="font-bold text-slate-900 font-mono text-sm">
                    {formatRupee(alloc.amount)}
                  </span>
                </div>
              </div>
            ))}

            <div className="pt-2 flex justify-between items-center text-xs font-semibold text-slate-600 border-t border-slate-100">
              <span>Allocated Sum (Conservation Invariant):</span>
              <span className="font-bold text-emerald-600 font-mono">
                {formatRupee(preview?.allocations.reduce((acc, a) => acc + a.amount, 0) || totalPrice)}
              </span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
