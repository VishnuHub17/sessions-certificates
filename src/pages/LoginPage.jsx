import React, { useState, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { sendOtp, verifyOtp, normalizePhoneIN, isValidOtp, isTestAuthEnabled } from '../lib/phoneAuthService.js';

const formatE164ForDisplay = (e164) => {
  // +919876543210 -> +91 98765 43210
  const digits = e164.replace('+91', '');
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
};

const LoginPage = () => {
  const navigate = useNavigate();
  const { session, testSession, loading: sessionLoading, refreshTestSession } = useAuth();
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('');
  const [normalizedPhone, setNormalizedPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const otpInputRef = useRef(null);

  if (!sessionLoading && (session || testSession)) {
    return <Navigate to="/sessions" replace />;
  }

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError(null);
    const normalized = normalizePhoneIN(phone);
    if (!normalized.ok) {
      setError(normalized.error);
      return;
    }
    setSending(true);
    const result = await sendOtp(phone);
    setSending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNormalizedPhone(result.e164);
    setStep('otp');
    setOtp('');
    setTimeout(() => otpInputRef.current?.focus(), 0);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError(null);
    if (!isValidOtp(otp)) {
      setError('Enter the 6-digit OTP.');
      return;
    }
    setVerifying(true);
    const result = await verifyOtp(normalizedPhone, otp);
    setVerifying(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    refreshTestSession();
    navigate('/sessions', { replace: true });
  };

  const handleChangeNumber = () => {
    setStep('phone');
    setOtp('');
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-body-md text-body-md relative overflow-hidden">
      <div className="absolute inset-0 bg-radial-gradient pointer-events-none" />
      <div className="absolute inset-0 bg-noise opacity-20 pointer-events-none" />

      <div className="hidden md:flex flex-col w-2/3 p-12 relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-title-md font-title-md font-bold text-on-surface">Pathwisse</span>
        </div>
        <div className="mt-32 max-w-xl">
          <h1 className="text-display-lg font-display-lg mb-6">
            Your Pathwisse sessions.<br />
            <span className="primary-gradient-text">certificates</span>.
          </h1>
          <p className="text-body-lg text-on-surface-variant max-w-md">
            Sign in to access certificates from the Pathwisse sessions you've attended. Verify your achievements and download high‑resolution copies.
          </p>
        </div>
        <div className="mt-auto text-label-sm text-on-surface-variant/50">
          © 2026 Pathwisse. Secure credential issuance.
        </div>
      </div>

      <div className="w-full md:w-1/3 flex items-center justify-center p-6 md:p-12 relative z-10 bg-[#0B0B10]/80 md:bg-transparent backdrop-blur-md md:backdrop-blur-none border-l border-white/5">
        <div className="absolute inset-0 bg-glow opacity-30 pointer-events-none" />
        <div className="glass-panel rounded-xl p-8 w-full" style={{ width: '420px' }}>
          <div className="flex items-center gap-2 mb-8 md:hidden">
            <span className="text-title-md font-title-md font-bold text-on-surface">Pathwisse</span>
          </div>
          <div className="mb-8 text-center">
            <h2 className="text-headline-lg font-headline-lg mb-2">Certificate Portal</h2>
            <p className="text-body-md text-on-surface-variant">
              Enter your mobile number to access your participation certificates.
            </p>
          </div>

          {isTestAuthEnabled() && (
            <div className="mb-6 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-center text-label-sm text-primary">
              Test mode: any 6-digit OTP is accepted.
            </div>
          )}

          {step === 'phone' && (
            <form className="space-y-6" onSubmit={handleSendOtp}>
              <div className="space-y-2">
                <label htmlFor="phone" className="block text-label-sm font-label-sm text-on-surface-variant mb-1">
                  Mobile number
                </label>
                <div className="relative flex items-center input-field rounded-lg pr-4 focus-within:ring-0">
                  <span className="pl-3 pr-2 text-on-surface-variant border-r border-white/10 text-body-md">+91</span>
                  <input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="98765 43210"
                    className="w-full bg-transparent pl-3 py-3 text-body-md outline-none"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>
              {error && <p className="text-error text-sm">{error}</p>}
              <button
                type="submit"
                disabled={sending}
                className="btn-primary w-full py-3 rounded-full text-body-md font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {sending ? 'Sending…' : 'Send OTP'}
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form className="space-y-6" onSubmit={handleVerifyOtp}>
              <p className="text-center text-body-md text-on-surface-variant">
                OTP sent to <span className="text-on-surface font-semibold">{formatE164ForDisplay(normalizedPhone)}</span>
              </p>
              <div className="space-y-2">
                <label htmlFor="otp" className="block text-label-sm font-label-sm text-on-surface-variant mb-1">
                  Enter OTP
                </label>
                <input
                  id="otp"
                  ref={otpInputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="••••••"
                  maxLength={6}
                  className="input-field w-full rounded-lg px-4 py-3 text-center text-2xl tracking-[0.5em] focus:ring-0"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                />
              </div>
              {error && <p className="text-error text-sm">{error}</p>}
              <button
                type="submit"
                disabled={verifying || !isValidOtp(otp)}
                className="btn-primary w-full py-3 rounded-full text-body-md font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {verifying ? 'Verifying…' : 'Verify & Continue'}
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
              <button
                type="button"
                onClick={handleChangeNumber}
                className="w-full text-center text-label-sm text-primary hover:text-primary-fixed-dim transition-colors"
              >
                Change number
              </button>
            </form>
          )}

          <div className="mt-8 text-center border-t border-white/5 pt-6">
            <p className="text-label-sm text-on-surface-variant">
              Need help accessing your certificates?<br />
              <a href="#" className="text-primary hover:text-primary-fixed-dim transition-colors">Contact support</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
