import React, { useState } from 'react';
import { X, Copy, Check, QrCode, ShieldCheck, AlertTriangle, ExternalLink, Sparkles, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatRupee } from '../utils/currency';
import { api } from '../services/api';

export function UPIQRModal({ obligation, initData, onClose, onPaymentSuccess }) {
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [paymentDone, setPaymentDone] = useState(false);
  const [txnResult, setTxnResult] = useState(null);

  const copyVPA = () => {
    navigator.clipboard.writeText(initData.receiver_upi_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulatePayment = async (status = "successful") => {
    setSimulating(true);
    setErrorMsg('');
    try {
      // Simulate realistic network delay of 900ms
      await new Promise(r => setTimeout(r, 900));

      const res = await api.confirmPayment(obligation.id, {
        simulate_status: status,
        payer_vpa: initData.payer_name ? `${initData.payer_name.toLowerCase().replace(/\s+/g, '')}@okaxis` : 'demo@okhdfc'
      });

      if (res.success) {
        setPaymentDone(true);
        setTxnResult(res);
        try {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 }
          });
        } catch (e) {
          // ignore if canvas-confetti is not available
        }
        if (onPaymentSuccess) {
          setTimeout(() => onPaymentSuccess(res), 2000);
        }
      } else {
        setErrorMsg(res.message || "Simulated payment failed.");
      }
    } catch (err) {
      setErrorMsg(err.message || "Payment simulation failed.");
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/20">
              <QrCode className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <h3 className="font-semibold text-lg leading-tight">UPI Payment Gateway</h3>
              <p className="text-xs text-indigo-200">Scan & Pay via any UPI App</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sandbox Warning Banner */}
        <div className="bg-amber-50 border-b border-amber-200/60 px-4 py-2 flex items-center gap-2 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span><strong>DEMO / SANDBOX MODE:</strong> No real bank charges occur. Use the simulator buttons below to test full settlement.</span>
        </div>

        {paymentDone ? (
          /* Payment Success State */
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-slate-900">Payment Successful!</h4>
              <p className="text-sm text-slate-500 mt-1">Your contribution has been recorded and settled.</p>
            </div>
            
            <div className="bg-slate-50 rounded-xl p-4 text-left border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Amount Paid</span>
                <span className="font-bold text-slate-900 text-sm">{formatRupee(initData.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Receiver</span>
                <span className="font-medium text-slate-800">{initData.receiver_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">UPI Ref / RRN</span>
                <span className="font-mono text-indigo-600">{txnResult?.upi_txn_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Subscription</span>
                <span className="text-slate-800">{obligation.subscription_name}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors shadow-sm"
            >
              Done & Return
            </button>
          </div>
        ) : (
          /* Payment View */
          <div className="p-6 space-y-5">
            {/* Amount Banner */}
            <div className="text-center bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              <p className="text-xs uppercase font-medium tracking-wider text-slate-500">Total Contribution</p>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                {formatRupee(initData.amount)}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                For: <span className="font-medium text-slate-700">{obligation.subscription_name}</span>
              </p>
            </div>

            {/* Dynamic QR Code */}
            <div className="flex flex-col items-center">
              <div className="p-3 bg-white border-2 border-indigo-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <img 
                  src={initData.qr_code_data_url} 
                  alt="UPI QR Code" 
                  className="w-48 h-48 rounded-lg"
                />
              </div>
              <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Supports GPay, PhonePe, Paytm, BHIM, CRED</span>
              </div>
            </div>

            {/* UPI ID Info with Copy */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <div className="truncate mr-2">
                <span className="text-slate-500 block">Payee UPI ID (VPA):</span>
                <span className="font-mono font-semibold text-slate-800 text-sm truncate">{initData.receiver_upi_id}</span>
              </div>
              <button
                onClick={copyVPA}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-700 font-medium transition-colors shrink-0 shadow-2xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            {/* Deep Link Button for Mobile */}
            <a
              href={initData.upi_uri}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-medium rounded-xl border border-slate-200 transition-colors"
            >
              <span>Open in UPI App</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Sandbox Simulation Actions */}
            <div className="border-t border-slate-200/80 pt-4 space-y-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider text-center">
                Sandbox Payment Simulator
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={simulating}
                  onClick={() => handleSimulatePayment("successful")}
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  {simulating ? "Processing..." : "Simulate Success"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={simulating}
                  onClick={() => handleSimulatePayment("failed")}
                  className="w-full py-2 px-3 bg-slate-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition-colors"
                >
                  Simulate Failure
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
