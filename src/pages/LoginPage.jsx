import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { sendOtp, verifyOtp, normalizePhoneIN, isValidOtp, isTestAuthEnabled } from '../lib/phoneAuthService.js';

const formatE164ForDisplay = (e164) => {
  // +919876543210 -> +91 98765 43210
  const digits = e164.replace('+91', '');
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
};

// 3D tilt effect on the auth card, ported 1:1 from the Stitch export's vanilla-JS
// mousemove handler (desktop only).
const useCardTilt = () => {
  const wrapperRef = useRef(null);
  const cardRef = useRef(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const card = cardRef.current;
    if (!wrapper || !card || window.innerWidth < 768) return undefined;

    const handleMouseMove = (e) => {
      const rect = wrapper.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const maxRotation = 6;
      const rotateX = -(y / (rect.height / 2)) * maxRotation;
      const rotateY = (x / (rect.width / 2)) * maxRotation;
      card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };

    const handleMouseLeave = () => {
      card.style.transition = 'transform 0.5s ease-out';
      card.style.transform = 'rotateX(0) rotateY(0)';
      setTimeout(() => {
        card.style.transition = 'transform 0.1s ease-out';
      }, 500);
    };

    wrapper.addEventListener('mousemove', handleMouseMove);
    wrapper.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      wrapper.removeEventListener('mousemove', handleMouseMove);
      wrapper.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return { wrapperRef, cardRef };
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
  const { wrapperRef, cardRef } = useCardTilt();

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
    <div className="flex flex-col md:flex-row w-full min-h-screen relative">
      <div className="ambient-glow" />

      {/* Left Column (60%) */}
      <div className="hidden md:flex flex-col w-[60%] relative p-12 z-10 overflow-hidden">
        <div className="bg-pattern" />
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 w-[800px] h-[800px] z-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage:
              "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBBXqjSwZ0WQnKJScQUtojjsqa5RtCYo0KcDcfCO7KHovQb6ZbrYAj4i04wyEoVb8_lQ3PfZR-DBNkOmb5DRRSYvYIcOApASiU1yjWR-rMTYZBOMzlcih4mroONrOJHU6hCsE4SmDl4OMFROfP05LcT0stxX6LHA8IbBk-68NRj-R2caAOQLsUvD_xrWhMY7EGWLSS6YIcftgvoTTwZB9nRrsRJwNQXNl77OhDSYF15uv1ax_izp-eMkw')",
          }}
        />
        <div className="flex items-center gap-2 mb-auto relative z-10">
          <span className="text-title-md font-title-md font-bold text-on-surface">Pathwisse</span>
        </div>
        <div className="relative z-10 max-w-xl mt-32">
          <h1 className="text-display-lg font-display-lg mb-6">
            Your Pathwisse sessions.<br />
            Your <span className="primary-gradient-text">certificates</span>.
          </h1>
          <p className="text-body-lg font-body-lg text-on-surface-variant max-w-md">
            Sign in to access certificates from the Pathwisse sessions you've attended. Verify your achievements and download high-resolution copies.
          </p>
        </div>
        <div className="mt-auto text-label-sm font-label-sm text-on-surface-variant/50 relative z-10">
          © 2024 Pathwisse. Secure credential issuance.
        </div>
      </div>

      {/* Right Column (40% - Authentication) */}
      <div className="w-full md:w-[40%] flex items-center justify-center p-6 md:p-12 z-10 min-h-screen bg-[#0B0B10]/80 md:bg-transparent backdrop-blur-md md:backdrop-blur-none border-l-0 md:border-l border-white/5 relative shadow-[-20px_0_40px_rgba(0,0,0,0.3)]">
        <div className="ambient-glow !w-[400px] !h-[400px] !opacity-50" />
        <div className="tilt-wrapper z-10" ref={wrapperRef}>
          <div className="tilt-card login-glass-panel rounded-xl p-8 md:p-10 w-full" ref={cardRef}>
            <div className="flex items-center gap-2 mb-8 md:hidden">
              <span className="text-title-md font-title-md font-bold text-on-surface">Pathwisse</span>
            </div>
            <div className="mb-8">
              <h2 className="text-headline-lg-mobile md:text-headline-lg font-headline-lg-mobile md:font-headline-lg mb-2">Welcome back</h2>
              <p className="text-body-md font-body-md text-on-surface-variant">Sign in with the mobile number used during session registration.</p>
            </div>

            {isTestAuthEnabled() && (
              <div className="mb-6 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-center text-label-sm font-label-sm text-primary">
                Test mode: any 6-digit OTP is accepted.
              </div>
            )}

            {step === 'phone' && (
              <form className="space-y-6" onSubmit={handleSendOtp}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-label-sm font-label-sm text-on-surface-variant mb-2" htmlFor="phone">Mobile number</label>
                    <input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      placeholder="+91 98765 43210"
                      className="input-field w-full rounded-lg px-4 py-3 text-body-md font-body-md focus:ring-0"
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
                  className="login-btn-primary w-full py-3 px-4 rounded-lg text-body-md font-body-md font-semibold flex justify-center items-center gap-2 disabled:opacity-60"
                >
                  {sending ? 'Sending…' : 'Send OTP'}
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </form>
            )}

            {step === 'otp' && (
              <form className="space-y-6" onSubmit={handleVerifyOtp}>
                <p className="text-center text-body-md font-body-md text-on-surface-variant">
                  OTP sent to <span className="text-on-surface font-semibold">{formatE164ForDisplay(normalizedPhone)}</span>
                </p>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-label-sm font-label-sm text-on-surface-variant" htmlFor="otp">Enter OTP</label>
                      <button
                        type="button"
                        onClick={handleChangeNumber}
                        className="text-label-sm font-label-sm text-primary hover:text-primary-fixed-dim transition-colors"
                      >
                        Change number
                      </button>
                    </div>
                    <input
                      id="otp"
                      ref={otpInputRef}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="••••••"
                      maxLength={6}
                      className="input-field w-full rounded-lg px-4 py-3 text-body-md font-body-md focus:ring-0"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                    />
                  </div>
                </div>
                {error && <p className="text-error text-sm">{error}</p>}
                <button
                  type="submit"
                  disabled={verifying || !isValidOtp(otp)}
                  className="login-btn-primary w-full py-3 px-4 rounded-lg text-body-md font-body-md font-semibold flex justify-center items-center gap-2 disabled:opacity-60"
                >
                  {verifying ? 'Verifying…' : 'Sign in'}
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </form>
            )}

            <div className="mt-8 text-center border-t border-white/5 pt-6">
              <p className="text-label-sm font-label-sm text-on-surface-variant">
                Need help accessing your certificates? <br />
                <a href="#" className="text-primary hover:text-primary-fixed-dim transition-colors">Contact support</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
