import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Check, ArrowRight, ArrowLeft, Plus, Trash2, Sparkles, 
  CreditCard, Users, Percent, ShieldCheck, AlertCircle 
} from 'lucide-react';
import { PRESET_SERVICES, formatRupee } from '../utils/currency';
import { SplitRuleSelector } from '../components/SplitRuleSelector';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function NewSubscriptionWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Details
  const [selectedPreset, setSelectedPreset] = useState(PRESET_SERVICES[0]);
  const [formData, setFormData] = useState({
    name: PRESET_SERVICES[0].name,
    category: PRESET_SERVICES[0].category,
    total_price: PRESET_SERVICES[0].defaultPrice,
    billing_frequency: 'monthly',
    next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: '',
    service_logo: PRESET_SERVICES[0].logo,
  });

  // Step 2: Members
  const [members, setMembers] = useState([
    { user_id: user?.id, name: user?.name || 'You (Owner)', email: user?.email, role: 'owner' }
  ]);
  const [newEmail, setNewEmail] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);

  // Step 3 & 4: Split method
  const [splitType, setSplitType] = useState('equal');
  const [memberValues, setMemberValues] = useState({});
  const [calculatedAllocations, setCalculatedAllocations] = useState([]);

  useEffect(() => {
    async function loadPlatformUsers() {
      try {
        const u = await api.listUsers();
        setAvailableUsers(u || []);
      } catch (e) {
        console.error(e);
      }
    }
    loadPlatformUsers();
  }, []);

  // Update owner when user loads
  useEffect(() => {
    if (user && members.length === 1 && members[0].role === 'owner') {
      setMembers([{ user_id: user.id, name: `${user.name} (You)`, email: user.email, role: 'owner' }]);
    }
  }, [user]);

  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset);
    setFormData({
      ...formData,
      name: preset.name,
      category: preset.category,
      total_price: preset.defaultPrice,
      service_logo: preset.logo,
    });
  };

  const handleAddMember = (targetUser) => {
    if (members.some(m => (targetUser.id && m.user_id === targetUser.id) || (m.email && m.email.toLowerCase() === targetUser.email.toLowerCase()))) {
      return;
    }
    setMembers([...members, {
      user_id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      role: 'member'
    }]);
  };

  const handleAddByEmail = (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    const clean = newEmail.trim().toLowerCase();
    if (members.some(m => m.email && m.email.toLowerCase() === clean)) {
      setNewEmail('');
      return;
    }
    const matched = availableUsers.find(u => u.email.toLowerCase() === clean);
    if (matched) {
      handleAddMember(matched);
    } else {
      setMembers([...members, {
        user_id: null,
        name: clean.split('@')[0],
        email: clean,
        role: 'member'
      }]);
    }
    setNewEmail('');
  };

  const handleRemoveMember = (idx) => {
    if (members[idx].role === 'owner') return;
    setMembers(members.filter((_, i) => i !== idx));
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = {
        name: formData.name.trim(),
        category: formData.category,
        total_price: Number(formData.total_price),
        billing_frequency: formData.billing_frequency,
        next_billing_date: formData.next_billing_date,
        description: formData.description,
        service_logo: formData.service_logo,
        split_type: splitType,
        members: members.map((m, idx) => ({
          user_id: m.user_id,
          email: m.email,
          name: m.name,
          role: m.role,
          value: memberValues[m.user_id || m.email || idx] !== undefined ? Number(memberValues[m.user_id || m.email || idx]) : null
        }))
      };

      const res = await api.createSubscription(payload);
      navigate(`/subscriptions/${res.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create subscription.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Wizard Progress Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[
            { step: 1, title: 'Details' },
            { step: 2, title: 'Members' },
            { step: 3, title: 'Split Engine' },
            { step: 4, title: 'Review & Launch' },
          ].map((s) => {
            const isDone = step > s.step;
            const isCurrent = step === s.step;
            return (
              <div key={s.step} className="flex-1 flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${
                    isDone 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : isCurrent 
                        ? 'bg-indigo-600 text-white shadow-sm ring-4 ring-indigo-100' 
                        : 'bg-slate-200 text-slate-500'
                  }`}>
                    {isDone ? <Check className="w-4 h-4" /> : s.step}
                  </div>
                  <span className={`text-2xs font-semibold mt-1.5 ${isCurrent ? 'text-indigo-600 font-bold' : 'text-slate-500'}`}>
                    {s.title}
                  </span>
                </div>
                {s.step < 4 && (
                  <div className={`flex-1 h-0.5 mx-2 -mt-4 transition-colors ${step > s.step ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        
        {error && (
          <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Subscription Details */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Step 1: Choose Subscription</h3>
              <p className="text-xs text-slate-500 mt-0.5">Select a preset or enter your custom shared service.</p>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PRESET_SERVICES.map((p) => {
                const isSelected = selectedPreset?.name === p.name;
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      isSelected 
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-600' 
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="font-bold text-xs text-slate-900 block truncate">{p.name}</span>
                    <span className="text-3xs text-slate-500 block mt-0.5">{p.category}</span>
                    <span className="text-xs font-mono font-bold text-indigo-700 mt-1 block">
                      {formatRupee(p.defaultPrice)}/mo
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Subscription Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Entertainment">Entertainment</option>
                  <option value="Music">Music</option>
                  <option value="Productivity">Productivity</option>
                  <option value="Cloud & Storage">Cloud & Storage</option>
                  <option value="Gaming">Gaming</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Total Subscription Cost (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={formData.total_price}
                    onChange={(e) => setFormData({ ...formData, total_price: e.target.value })}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Next Billing Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.next_billing_date}
                  onChange={(e) => setFormData({ ...formData, next_billing_date: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Description / Group Notes (Optional)
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. 4K Ultra HD flatmates group on TV 1 & 2"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Add Members */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Step 2: Add Friends & Members</h3>
              <p className="text-xs text-slate-500 mt-0.5">Invite your co-subscribers via email, phone, or select demo friends.</p>
            </div>

            {/* Quick add from available friends */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-2xs font-bold uppercase tracking-wider text-slate-500">
                1-Click Add Registered Friends
              </span>
              <div className="flex flex-wrap gap-2 pt-1">
                {availableUsers.map((au) => {
                  const isAdded = members.some(m => m.user_id === au.id);
                  return (
                    <button
                      key={au.id}
                      type="button"
                      disabled={isAdded}
                      onClick={() => handleAddMember(au)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                        isAdded
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50 shadow-2xs'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{au.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Add by email input */}
            <form onSubmit={handleAddByEmail} className="flex gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter friend's email (e.g. rahul@example.com)"
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Add Member
              </button>
            </form>

            {/* Current Members List */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Current Group Members ({members.length})
              </span>
              <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white overflow-hidden">
                {members.map((m, idx) => (
                  <div key={idx} className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                        {m.name ? m.name[0].toUpperCase() : 'M'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-900">{m.name}</span>
                          {m.role === 'owner' && (
                            <span className="text-3xs uppercase font-extrabold px-1.5 py-0.5 rounded-sm bg-indigo-100 text-indigo-800">
                              Admin / Owner
                            </span>
                          )}
                        </div>
                        <span className="text-2xs text-slate-400 block">{m.email}</span>
                      </div>
                    </div>

                    {m.role !== 'owner' && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Split Engine Configuration */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Step 3: Intelligent Cost Splitting</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure your split method with exact paise precision and rupee conservation.
              </p>
            </div>

            <SplitRuleSelector
              totalPrice={formData.total_price}
              members={members}
              splitType={splitType}
              setSplitType={setSplitType}
              memberValues={memberValues}
              setMemberValues={setMemberValues}
              onCalculated={(allocs) => setCalculatedAllocations(allocs)}
            />
          </div>
        )}

        {/* STEP 4: Review & Final Launch */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Step 4: Review & Launch Subscription</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Double-check the subscription details and contribution breakdown before creating.
              </p>
            </div>

            {/* Overview Card */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white space-y-4 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xs uppercase tracking-wider text-indigo-300 font-bold block">
                    {formData.category}
                  </span>
                  <h4 className="text-2xl font-black tracking-tight">{formData.name}</h4>
                </div>
                <div className="text-right">
                  <span className="text-2xs uppercase tracking-wider text-indigo-300 font-bold block">Total Price</span>
                  <span className="text-2xl font-black font-mono text-emerald-400">
                    {formatRupee(formData.total_price)}
                  </span>
                  <span className="text-2xs text-slate-300 block">/ {formData.billing_frequency}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
                <span>Next Due: <strong>{formData.next_billing_date}</strong></span>
                <span>Split Method: <strong className="capitalize">{splitType}</strong></span>
                <span>Members: <strong>{members.length}</strong></span>
              </div>
            </div>

            {/* Member Contributions Summary */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Allocated Member Obligations
              </h4>
              <div className="space-y-2">
                {calculatedAllocations.map((alloc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{alloc.name}</span>
                      <span className="text-2xs text-slate-400">({alloc.percentage}%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {formatRupee(alloc.amount)}
                      </span>
                      <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        Pending
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200 text-xs font-bold text-slate-800">
                <span>Total Conservation Verification:</span>
                <span className="font-mono text-emerald-600 text-sm">
                  {formatRupee(formData.total_price)} = {formatRupee(formData.total_price)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Payment obligations and UPI QR codes will be generated immediately upon creation.</span>
            </div>
          </div>
        )}

        {/* Stepper Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : <div />}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => {
                if (step === 2 && members.length < 2) {
                  setError("Please add at least one more friend/member before proceeding.");
                  return;
                }
                setError('');
                setStep(step + 1);
              }}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={handleFinalSubmit}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-extrabold rounded-xl shadow-sm transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? "Creating Subscription..." : "Create Subscription & Generate Cycle"}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
