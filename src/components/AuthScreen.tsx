import React, { useState } from 'react';
import { Building2, KeyRound, LogIn, MapPin, Phone, ShieldCheck, UserPlus } from 'lucide-react';
import { useSociety } from '../context/SocietyContext';
import {
  EMERGENCY_CONTACTS,
  FIXED_CLEANER_SALARY,
  SOCIETY_ADDRESS,
  SOCIETY_NAME,
  TOWER_REPRESENTATIVES,
} from '../data/societyConstants';
import { formatINR, getFloorForUnit, validateSignupInput } from '../utils/billing';

const TOWER_HERO_IMAGE = '/src/assets/images/tower3_enclave_exterior_1795198231445.jpg';

export function AuthScreen() {
  const {
    unitRoster,
    pendingGoogleUser,
    authError,
    signInWithGoogle,
    signInAsAdminWithGoogle,
    completeGoogleRegistration,
    loginWithUnitPasscode,
    loginAsAdmin,
    signupWithUnit,
    signOut,
  } = useSociety();

  const [mode, setMode] = useState<'login' | 'signup' | 'admin'>('login');
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  // Resident Login state
  const [loginUnit, setLoginUnit] = useState('049');
  const [loginPasscode, setLoginPasscode] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Admin Login state
  const [adminId, setAdminId] = useState('');
  const [adminPasscode, setAdminPasscode] = useState('');
  const [adminError, setAdminError] = useState<string | null>(null);

  // Resident Signup state
  const [signupName, setSignupName] = useState('');
  const [signupUnit, setSignupUnit] = useState('049');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupPasscode, setSignupPasscode] = useState('');
  const [signupErrors, setSignupErrors] = useState<Record<string, string>>({});

  // Google first-time profile completion
  const [googleName, setGoogleName] = useState(pendingGoogleUser?.displayName ?? '');
  const [googleUnit, setGoogleUnit] = useState('049');
  const [googlePhone, setGooglePhone] = useState('');
  const [googleErrors, setGoogleErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleUnitLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    const res = loginWithUnitPasscode(loginUnit, loginPasscode);
    if (!res.ok) {
      setLoginError(res.error ?? 'Unable to sign in.');
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    const res = loginAsAdmin(adminId, adminPasscode);
    if (!res.ok) {
      setAdminError(res.error ?? 'Unable to sign in as admin.');
    }
  };

  const handleUnitSignup = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateSignupInput({
      fullName: signupName,
      unitNumber: signupUnit,
      phone: signupPhone,
      email: signupEmail,
      passcode: signupPasscode,
      requirePasscode: true,
    });
    if (!validation.valid) {
      setSignupErrors(validation.errors);
      return;
    }
    setSignupErrors({});
    signupWithUnit({
      fullName: signupName,
      unitNumber: signupUnit,
      email: signupEmail,
      phone: signupPhone,
      passcode: signupPasscode,
    });
  };

  const handleGoogleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateSignupInput({
      fullName: googleName,
      unitNumber: googleUnit,
      phone: googlePhone,
      email: pendingGoogleUser?.email ?? '',
      requirePasscode: false,
    });
    if (!validation.valid) {
      setGoogleErrors(validation.errors);
      return;
    }
    setGoogleErrors({});
    setSubmitting(true);
    try {
      await completeGoogleRegistration({
        fullName: googleName,
        unitNumber: googleUnit,
        phone: googlePhone,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F7F9] flex flex-col">
      {/* Top 3-zone header */}
      <header className="bg-white border-b border-slate-200 px-6 lg:px-10 h-16 flex items-center justify-between gap-8">
        <a
          href="#top"
          className="text-base font-bold tracking-tight text-[#0F2942] whitespace-nowrap shrink-0"
        >
          {SOCIETY_NAME}
        </a>
        <div className="hidden md:flex items-center gap-6 text-xs text-slate-600">
          <span className="whitespace-nowrap shrink-0">OIL India Ltd., Duliajan</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className="whitespace-nowrap shrink-0 font-mono tabular-nums">Units 049 – 072</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className="whitespace-nowrap shrink-0">6 Floors · 24 Residents</span>
        </div>
        <a
          href="#emergency-helplines"
          className="text-xs font-semibold text-[#C81E1E] hover:underline whitespace-nowrap shrink-0"
        >
          Emergency Helplines
        </a>
      </header>

      {/* Main 2-column split */}
      <main id="top" className="flex-1 max-w-[1280px] w-full mx-auto px-6 lg:px-10 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Complex Overview & Hero Photography */}
          <div className="lg:col-span-7 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="relative h-64 sm:h-80 lg:flex-1 min-h-[260px] bg-[#0F2942]">
              {!heroImgFailed ? (
                <img
                  src={TOWER_HERO_IMAGE}
                  alt="Tower 3, New Horizontal Enclave, Oil Housing Area, OIL India Ltd., Duliajan"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white/90 bg-gradient-to-br from-[#0F2942] to-[#1E3A5F] p-8 text-center">
                  <Building2 className="w-12 h-12 mb-3 opacity-80" />
                  <p className="text-lg font-semibold">{SOCIETY_NAME}</p>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F2942]/90 via-[#0F2942]/35 to-transparent flex flex-col justify-end p-6 sm:p-8 text-white">
                <p className="text-xs font-medium text-slate-200 mb-2">
                  OIL India Ltd. Residential Complex · Duliajan, Assam
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight max-w-xl">
                  Tower 3 Resident Portal for Bills, Notices & Building Upkeep
                </h1>
                <div className="mt-3 flex items-start gap-2 text-xs sm:text-sm text-slate-200">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-slate-300" />
                  <span>{SOCIETY_ADDRESS}</span>
                </div>
              </div>
            </div>

            {/* Key Policy Facts Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 border-t border-slate-200">
              <div className="p-5">
                <p className="text-xs text-slate-500 mb-1">Fixed Cleaner Salary</p>
                <p className="text-lg font-bold font-mono tabular-nums text-slate-900">
                  {formatINR(FIXED_CLEANER_SALARY)}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">₹458.33 equal share / 24 units</p>
              </div>
              <div className="p-5">
                <p className="text-xs text-slate-500 mb-1">Utility Policy</p>
                <p className="text-lg font-bold text-slate-900">Zero Utility Fee</p>
                <p className="text-xs text-slate-600 mt-0.5 leading-snug">
                  No electricity, water, or gas charge
                </p>
              </div>
              <div className="p-5">
                <p className="text-xs text-slate-500 mb-1">Building Layout</p>
                <p className="text-lg font-bold font-mono tabular-nums text-slate-900">
                  049 – 072
                </p>
                <p className="text-xs text-slate-600 mt-0.5">4 residents / floor · 6 floors</p>
              </div>
            </div>
          </div>

          {/* Right Column: Resident Login / Signup / Admin Login Panel */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between">
            {pendingGoogleUser ? (
              <div>
                <div className="flex items-center gap-2 text-[#0F2942] mb-2">
                  <ShieldCheck className="w-5 h-5" />
                  <span className="text-xs font-semibold">Link Your Tower 3 Unit</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">
                  Complete Resident Profile
                </h2>
                <p className="text-sm text-slate-600 mb-6">
                  Signed in as{' '}
                  <span className="font-medium text-slate-900">{pendingGoogleUser.email}</span>.
                  Select your assigned Tower 3 unit (049–072) to enter the portal.
                </p>
                <form onSubmit={handleGoogleRegistrationSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="google-name"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Unit Owner Full Name
                    </label>
                    <input
                      id="google-name"
                      type="text"
                      value={googleName}
                      onChange={(e) => setGoogleName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
                    />
                    {googleErrors.fullName && (
                      <p className="text-xs text-[#C81E1E] mt-1">{googleErrors.fullName}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="google-unit"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Unit Number (049 – 072)
                    </label>
                    <select
                      id="google-unit"
                      value={googleUnit}
                      onChange={(e) => setGoogleUnit(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
                    >
                      {unitRoster.map((u) => (
                        <option key={u.unitNumber} value={u.unitNumber}>
                          Unit {u.unitNumber} — Floor {u.floor}
                          {u.occupantName ? ` (${u.occupantName})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="google-phone"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Mobile Number
                    </label>
                    <input
                      id="google-phone"
                      type="tel"
                      value={googlePhone}
                      onChange={(e) => setGooglePhone(e.target.value)}
                      placeholder="10-digit mobile number"
                      className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
                    />
                    {googleErrors.phone && (
                      <p className="text-xs text-[#C81E1E] mt-1">{googleErrors.phone}</p>
                    )}
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-[#0F2942] rounded-lg hover:bg-[#173B5E] transition-colors disabled:opacity-60"
                    >
                      {submitting ? 'Saving Profile...' : 'Enter Tower 3 Portal'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void signOut()}
                      className="px-4 py-2.5 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div>
                <div className="mb-5">
                  <h2 className="text-xl font-bold text-slate-900">Portal Access</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Resident login (Units 049 – 072) or Society Admin login
                  </p>
                </div>

                {/* Segmented 3-Mode Toggle */}
                <div
                  role="tablist"
                  aria-label="Authentication mode"
                  className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg mb-6"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'login'}
                    onClick={() => {
                      setMode('login');
                      setLoginError(null);
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                      mode === 'login'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5 shrink-0" />
                    Resident Login
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'signup'}
                    onClick={() => {
                      setMode('signup');
                      setSignupErrors({});
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                      mode === 'signup'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5 shrink-0" />
                    Signup
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'admin'}
                    onClick={() => {
                      setMode('admin');
                      setAdminError(null);
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                      mode === 'admin'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <KeyRound className="w-3.5 h-3.5 shrink-0" />
                    Admin Login
                  </button>
                </div>

                {authError && (
                  <div
                    role="alert"
                    className="mb-4 p-3 text-xs text-[#C81E1E] bg-red-50 border border-red-200 rounded-lg"
                  >
                    {authError}
                  </div>
                )}

                {mode === 'login' && (
                  <form onSubmit={handleUnitLogin} className="space-y-4">
                    <div>
                      <label
                        htmlFor="login-unit"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Unit Number (049 – 072)
                      </label>
                      <select
                        id="login-unit"
                        value={loginUnit}
                        onChange={(e) => setLoginUnit(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
                      >
                        {unitRoster.map((u) => (
                          <option key={u.unitNumber} value={u.unitNumber}>
                            Unit {u.unitNumber} · Floor {u.floor}
                            {u.occupantName ? ` (${u.occupantName})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="login-passcode"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Resident Password / PIN
                      </label>
                      <input
                        id="login-passcode"
                        type="password"
                        value={loginPasscode}
                        onChange={(e) => setLoginPasscode(e.target.value)}
                        placeholder="Enter unit password (default: tower3)"
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
                      />
                    </div>

                    {loginError && (
                      <p role="alert" className="text-xs text-[#C81E1E]">
                        {loginError}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#0F2942] rounded-lg hover:bg-[#173B5E] transition-colors"
                    >
                      Sign In to Unit {loginUnit}
                    </button>

                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-white px-3 text-slate-500">
                          or sync via cloud account
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void signInWithGoogle()}
                      className="w-full py-2.5 px-4 text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2.5"
                    >
                      <ShieldCheck className="w-4 h-4 text-[#0F2942]" />
                      Sign in with Google
                    </button>

                    <p className="text-xs text-slate-500 leading-relaxed pt-1">
                      Units 049–072 default resident password is{' '}
                      <span className="font-mono font-medium text-slate-700">tower3</span>, or
                      register a personal owner account under Signup.
                    </p>
                  </form>
                )}

                {mode === 'signup' && (
                  <form onSubmit={handleUnitSignup} className="space-y-3.5">
                    <div>
                      <label
                        htmlFor="signup-name"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Unit Owner Full Name
                      </label>
                      <input
                        id="signup-name"
                        type="text"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        placeholder="Enter full name"
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
                      />
                      {signupErrors.fullName && (
                        <p className="text-xs text-[#C81E1E] mt-1">{signupErrors.fullName}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="signup-unit"
                          className="block text-xs font-semibold text-slate-700 mb-1"
                        >
                          Tower 3 Unit (049–072)
                        </label>
                        <select
                          id="signup-unit"
                          value={signupUnit}
                          onChange={(e) => setSignupUnit(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
                        >
                          {unitRoster.map((u) => (
                            <option key={u.unitNumber} value={u.unitNumber}>
                              Unit {u.unitNumber} (Floor {u.floor})
                            </option>
                          ))}
                        </select>
                        {signupErrors.unitNumber && (
                          <p className="text-xs text-[#C81E1E] mt-1">{signupErrors.unitNumber}</p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="signup-phone"
                          className="block text-xs font-semibold text-slate-700 mb-1"
                        >
                          Mobile Number
                        </label>
                        <input
                          id="signup-phone"
                          type="tel"
                          value={signupPhone}
                          onChange={(e) => setSignupPhone(e.target.value)}
                          placeholder="10-digit phone"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
                        />
                        {signupErrors.phone && (
                          <p className="text-xs text-[#C81E1E] mt-1">{signupErrors.phone}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="signup-email"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Email Address
                      </label>
                      <input
                        id="signup-email"
                        type="email"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        placeholder="Enter personal email address"
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
                      />
                      {signupErrors.email && (
                        <p className="text-xs text-[#C81E1E] mt-1">{signupErrors.email}</p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="signup-passcode"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Create Portal Password
                      </label>
                      <input
                        id="signup-passcode"
                        type="password"
                        value={signupPasscode}
                        onChange={(e) => setSignupPasscode(e.target.value)}
                        placeholder="Minimum 4 characters"
                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
                      />
                      {signupErrors.passcode && (
                        <p className="text-xs text-[#C81E1E] mt-1">{signupErrors.passcode}</p>
                      )}
                    </div>

                    <p className="text-xs text-slate-500">
                      Assigned Floor:{' '}
                      <span className="font-semibold text-slate-800">
                        Floor {getFloorForUnit(signupUnit)}
                      </span>{' '}
                      · Monthly Base Share:{' '}
                      <span className="font-mono font-semibold text-slate-800">₹458.33</span>
                    </p>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#0F2942] rounded-lg hover:bg-[#173B5E] transition-colors"
                    >
                      Create Unit Account
                    </button>
                  </form>
                )}

                {mode === 'admin' && (
                  <form onSubmit={handleAdminLogin} className="space-y-4">
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 leading-relaxed">
                      Administrator access enables adding, editing, and deleting resident unit names
                      (049–072), expenses, payment records, notices, maintenance requests, and
                      discussions.
                    </div>

                    <div>
                      <label
                        htmlFor="admin-id"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Admin Email ID
                      </label>
                      <input
                        id="admin-id"
                        type="email"
                        value={adminId}
                        onChange={(e) => setAdminId(e.target.value)}
                        placeholder="Enter your personal email address"
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="admin-passcode"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Admin Password
                      </label>
                      <input
                        id="admin-passcode"
                        type="password"
                        value={adminPasscode}
                        onChange={(e) => setAdminPasscode(e.target.value)}
                        placeholder="Enter admin password"
                        className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
                      />
                    </div>

                    {adminError && (
                      <p role="alert" className="text-xs text-[#C81E1E]">
                        {adminError}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#0F2942] rounded-lg hover:bg-[#173B5E] transition-colors"
                    >
                      Sign In as Administrator
                    </button>

                    <div className="relative py-2">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-white px-3 text-slate-500">
                          or Google Cloud Admin
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void signInAsAdminWithGoogle()}
                      className="w-full py-2.5 px-4 text-sm font-medium text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2.5"
                    >
                      <ShieldCheck className="w-4 h-4 text-[#0F2942]" />
                      Sign in as Admin with Google
                    </button>

                    <p className="text-xs text-slate-500 leading-relaxed pt-1">
                      Sign in with your personal email address and admin password (do not use a
                      company email ID), or use Google Admin Sign-In.
                    </p>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Emergency Contacts & Tower 3 Representatives Footer Strip */}
        <section
          id="emergency-helplines"
          aria-label="Emergency Contacts and Tower 3 Representatives"
          className="mt-8 bg-white border border-slate-200 rounded-xl p-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Emergency Helplines & Tower 3 Representatives
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Direct OIL India Ltd., Duliajan utility control rooms and Tower 3 committee contacts
              </p>
            </div>
            <span className="text-xs font-medium text-[#C81E1E]">
              24/7 Emergency Desk · Duliajan 786602
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 pt-4">
            {EMERGENCY_CONTACTS.map((contact) => (
              <div key={contact.id} className="space-y-1">
                <p className="text-xs font-semibold text-slate-500">{contact.service}</p>
                <div className="flex flex-col gap-0.5">
                  {contact.numbers.map((num) => (
                    <a
                      key={num}
                      href={`tel:${num.replace(/[^0-9+]/g, '')}`}
                      className="inline-flex items-center gap-1.5 text-sm font-mono font-semibold tabular-nums text-[#C81E1E] hover:underline"
                    >
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      {num}
                    </a>
                  ))}
                </div>
              </div>
            ))}

            {TOWER_REPRESENTATIVES.map((rep) => (
              <div key={rep.id} className="space-y-1">
                <p className="text-xs font-semibold text-slate-500">Tower 3 Rep</p>
                <p className="text-sm font-semibold text-slate-900">{rep.name}</p>
                <a
                  href={`tel:${rep.phone}`}
                  className="inline-flex items-center gap-1.5 text-sm font-mono font-semibold tabular-nums text-[#0F2942] hover:underline"
                >
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  {rep.phone}
                </a>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
