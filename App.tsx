import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { useQuery, useMutation } from 'convex/react';
import { api } from './convex/_generated/api';

import { Customer, Loan, InterestType, AppSettings, UserPasskey } from './types';
import {
  isBiometricSupported,
  registerDevicePasskey,
  authenticateWithBiometrics,
  saveLocalBiometricState,
  getLocalBiometricState,
} from './utils/webauthn';
import { calculateLoanDetails, formatCurrency, formatDate } from './utils/calculations';
import {
  createLoan,
  deleteLoan as deleteLoanById,
  resetAllData,
  saveSettings,
  updateLoanStatus,
  seedDemoData,
} from './utils/api';
import {
  saveCachedSnapshot,
  getCachedSnapshot,
  saveDraftEntry,
  getDraftEntry,
  clearDraftEntry,
  saveThemePreference,
  getThemePreference,
  clearAllDeviceStorage,
} from './utils/storage';
import { useConvexAuth, useAuthActions } from "@convex-dev/auth/react";


// Icons
const Icons = {
  Menu: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>,
  Search: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  Plus: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>,
  Camera: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>,
  Users: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  Settings: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.39a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>,
  TrendingUp: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>,
  X: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  Check: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
  Trash: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>,
  Pen: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>,
  FileText: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>,
  ArrowLeft: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>,
  Moon: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>,
  Sun: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>,
  Refresh: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>,
  Lock: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>,
  Unlock: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>,
  LogOut: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>,
  Save: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>,
  GitHub: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>,
  Google: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/></svg>,
  SwitchCamera: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v3"/><path d="m16 19 3 3 3-3"/><path d="m19 22v-6"/></svg>,
  Upload: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  Sparkles: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>,
  RotateCcw: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>,
  CheckCircle: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>,
  Smartphone: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>,
  Share: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>,
  Fingerprint: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/></svg>,
  Shield: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>,
  Key: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21 2-2 2m-1.5 1.5L14 9l-1.5-1.5L11 9l-1.5-1.5L8 9c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5c0-.64-.13-1.25-.35-1.81L21 4V2z"/><circle cx="7.5" cy="14.5" r="1.5"/></svg>,
};

const DEFAULT_SETTINGS: AppSettings = {
  globalInitialInterestRate: 50,
  globalInterestRate: 30,
  globalCompoundMonthly: true,
  isBiometricLockEnabled: false,
};


// Data source is the local API backend.

export default function App() {
  const [view, setView] = useState<'dashboard' | 'loans' | 'entry' | 'settings'>('dashboard');
  const [entryMode, setEntryMode] = useState<'manual' | 'scan'>('manual');

  // Theme & Menu State
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Convex Auth Hooks
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();

  // Authentication State
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authOtpCode, setAuthOtpCode] = useState('');
  const [authStep, setAuthStep] = useState<'credentials' | 'otp-signin' | 'otp-verify' | 'forgot-password' | 'reset-verify'>('credentials');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [authError, setAuthError] = useState('');
  const [resendStatus, setResendStatus] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [isUrlCodePending, setIsUrlCodePending] = useState(() => {
    return typeof window !== 'undefined' && window.location.search.includes('code=');
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.search.includes('code=')) {
      setIsUrlCodePending(true);
      const timer = setTimeout(() => {
        setIsUrlCodePending(false);
        if (window.location.search.includes('code=')) {
          const url = new URL(window.location.href);
          url.searchParams.delete('code');
          window.history.replaceState(null, '', url.pathname + url.search + url.hash);
        }
      }, 4000);
      return () => clearTimeout(timer);
    } else {
      setIsUrlCodePending(false);
    }
  }, [isAuthenticated]);

  // Reset Confirmation State
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetPinInput, setResetPinInput] = useState('');
  const [resetError, setResetError] = useState('');

  // App Data State
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeviceHydrated, setIsDeviceHydrated] = useState(false);
  const liveData = useQuery(api.bootstrap.get, isAuthenticated ? undefined : "skip");

  // Passkeys & Biometric Security State
  const passkeysList = useQuery(api.passkeys.list, isAuthenticated ? undefined : "skip");
  const savePasskeyMutation = useMutation(api.passkeys.savePasskey);
  const removePasskeyMutation = useMutation(api.passkeys.removePasskey);

  const [isDeviceBiometricAvailable, setIsDeviceBiometricAvailable] = useState(false);
  const [isAppShieldLocked, setIsAppShieldLocked] = useState(() => {
    if (typeof window === 'undefined') return false;
    return getLocalBiometricState().enabled;
  });
  const [biometricAuthError, setBiometricAuthError] = useState('');
  const [isVerifyingBiometric, setIsVerifyingBiometric] = useState(false);
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [passkeyActionStatus, setPasskeyActionStatus] = useState('');
  const [passkeyActionError, setPasskeyActionError] = useState('');

  // Check hardware biometric availability on load
  useEffect(() => {
    isBiometricSupported().then((supported) => {
      setIsDeviceBiometricAvailable(supported);
    });
  }, []);

  // Update biometric lock if settings dictate and auto-trigger verification
  useEffect(() => {
    if (settings.isBiometricLockEnabled) {
      setIsAppShieldLocked(true);
    }
  }, [settings.isBiometricLockEnabled]);

  // 1. Instant On-Device IndexedDB Hydration (0ms load)
  useEffect(() => {
    let isMounted = true;
    async function hydrate() {
      try {
        // Hydrate Theme
        const savedTheme = await getThemePreference();
        if (savedTheme && isMounted) setTheme(savedTheme);

        // Hydrate Cached Snapshot
        const cached = await getCachedSnapshot();
        if (cached && isMounted) {
          if (cached.settings) setSettings(cached.settings);
          if (cached.customers?.length) setCustomers(cached.customers);
          if (cached.loans?.length) setLoans(cached.loans);
          setLoading(false);
        }

        // Hydrate Unsaved Form Draft
        const draft = await getDraftEntry();
        if (draft && isMounted) {
          if (draft.formData) setFormData(draft.formData);
          if (draft.scannedImage) setScannedImage(draft.scannedImage);
          if (draft.scanClarification) setScanClarification(draft.scanClarification);
        }
      } catch (err) {
        console.warn('Device storage hydration skipped:', err);
      } finally {
        if (isMounted) setIsDeviceHydrated(true);
      }
    }
    hydrate();
    return () => { isMounted = false; };
  }, []);

  // 2. Sync Live Convex Data to state and asynchronously mirror to IndexedDB
  useEffect(() => {
    if (liveData) {
      setSettings(liveData.settings);
      setCustomers(liveData.customers);
      setLoans(liveData.loans as any[]);
      setLoading(false);

      // Cache snapshot to on-device IndexedDB
      saveCachedSnapshot({
        settings: liveData.settings,
        customers: liveData.customers,
        loans: liveData.loans as any[],
      }).catch((e) => console.warn('Failed to mirror to device storage:', e));
    }
  }, [liveData]);

  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // Temporary Settings State (for the Settings View)
  const [tempSettings, setTempSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Unified Form State
  const [formData, setFormData] = useState({
    customerName: '',
    principal: '' as any,
    initialInterestRate: DEFAULT_SETTINGS.globalInitialInterestRate as any,
    interestRate: DEFAULT_SETTINGS.globalInterestRate as any,
    startDate: new Date().toISOString().split('T')[0],
    interestType: InterestType.COMPOUND,
    isFixedRate: true,
    notes: ''
  });

  // Scanner & Live Camera State
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanClarification, setScanClarification] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // 3. Debounced Draft Auto-Save to IndexedDB
  useEffect(() => {
    if (!isDeviceHydrated) return;
    if (formData.customerName || formData.principal || formData.notes || scannedImage) {
      const timer = setTimeout(() => {
        saveDraftEntry({ formData, scannedImage, scanClarification }).catch(() => {});
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [formData, scannedImage, scanClarification, isDeviceHydrated]);

  // 4. PWA Installation State
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [isStandaloneApp, setIsStandaloneApp] = useState(false);
  const [showIosInstallModal, setShowIosInstallModal] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
      setIsStandaloneApp(isStandalone);

      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setDeferredInstallPrompt(e);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);
      return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    }
  }, []);

  const handleInstallApp = async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredInstallPrompt(null);
        setIsStandaloneApp(true);
      }
    } else {
      const isIos = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIos) {
        setShowIosInstallModal(true);
      } else {
        alert('To install Money Shark on your device:\n\n1. Open your browser menu (⋮ or ⋯)\n2. Select "Install App" or "Add to Home screen"');
      }
    }
  };

  // Apply Theme Effect & Persist
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Sync Form Data with Fixed Rate Setting change
  useEffect(() => {
    if (formData.isFixedRate) {
      setFormData(prev => ({
        ...prev,
        initialInterestRate: settings.globalInitialInterestRate,
        interestRate: settings.globalInterestRate
      }));
    }
  }, [formData.isFixedRate, settings]);

  // Sync Temp Settings when entering Settings view
  useEffect(() => {
    if (view === 'settings') {
      setTempSettings({ ...settings });
      setSettingsSuccess(false);
    }
  }, [view, settings]);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      saveThemePreference(next).catch(() => {});
      return next;
    });
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setAuthError('');
    setResendStatus('');
    setIsSubmittingAuth(true);

    try {
      if (authStep === 'otp-verify') {
        // Verify 6-digit email code (handles both Password email-verification and direct Email OTP)
        try {
          await signIn("password", {
            email: authEmail.trim().toLowerCase(),
            code: authOtpCode.trim(),
            flow: "email-verification",
          });
        } catch (pwErr) {
          await signIn("resend", {
            email: authEmail.trim().toLowerCase(),
            code: authOtpCode.trim(),
          });
        }
        setAuthOtpCode('');
        setAuthStep('credentials');
      } else if (authStep === 'reset-verify') {
        // Verify Password Reset code and set new password
        await signIn("password", {
          email: authEmail.trim().toLowerCase(),
          code: authOtpCode.trim(),
          newPassword: authPassword,
          flow: "reset-verification",
        });
        setAuthOtpCode('');
        setAuthPassword('');
        setAuthStep('credentials');
      } else if (isRegisterMode) {
        // Registration: creates account and sends verification email (user is NOT logged in until verified)
        const res = await signIn("password", {
          name: authName.trim(),
          email: authEmail.trim().toLowerCase(),
          password: authPassword,
          flow: "signUp",
        });
        setAuthStep('otp-verify');
        setResendStatus(`Verification email sent to ${authEmail}`);
      } else {
        // Standard Password Sign-in
        const res = await signIn("password", {
          email: authEmail.trim().toLowerCase(),
          password: authPassword,
          flow: "signIn",
        });
        if (res && res.signingIn === false) {
          setAuthStep('otp-verify');
          setResendStatus(`Account pending verification. A 6-digit code was sent to ${authEmail}`);
        } else {
          setAuthPassword('');
        }
      }
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : 'Authentication failed';
      setAuthError(msg);
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleSendEmailOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!authEmail.trim()) {
      setAuthError('Please enter your email address');
      return;
    }
    setAuthError('');
    setResendStatus('');
    setIsSubmittingAuth(true);
    try {
      await signIn("resend", {
        email: authEmail.trim().toLowerCase(),
      });
      setAuthStep('otp-verify');
      setResendStatus(`Verification email sent to ${authEmail}`);
    } catch (err: any) {
      setAuthError(err instanceof Error ? err.message : 'Failed to send verification email');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleResendOtp = async () => {
    setAuthError('');
    setResendStatus('');
    setIsSubmittingAuth(true);
    try {
      if (authPassword && isRegisterMode) {
        await signIn("password", {
          name: authName.trim(),
          email: authEmail.trim().toLowerCase(),
          password: authPassword,
          flow: "signUp",
        });
      } else {
        await signIn("resend", {
          email: authEmail.trim().toLowerCase(),
        });
      }
      setResendStatus(`A fresh verification email was sent to ${authEmail}`);
    } catch (err: any) {
      setAuthError(err instanceof Error ? err.message : 'Failed to resend verification email');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleSendPasswordReset = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!authEmail.trim()) {
      setAuthError('Please enter your email address');
      return;
    }
    setAuthError('');
    setResendStatus('');
    setIsSubmittingAuth(true);
    try {
      await signIn("password", {
        email: authEmail.trim().toLowerCase(),
        flow: "reset",
      });
      setAuthStep('reset-verify');
      setResendStatus(`Password reset code sent to ${authEmail}`);
    } catch (err: any) {
      setAuthError(err instanceof Error ? err.message : 'Failed to send reset code');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "github") => {
    setAuthError('');
    setIsSubmittingAuth(true);
    try {
      await signIn(provider);
    } catch (err: any) {
      setAuthError(err instanceof Error ? err.message : `${provider} sign in failed`);
      setIsSubmittingAuth(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    setIsMenuOpen(false);
    setCustomers([]);
    setLoans([]);
    setSettings(DEFAULT_SETTINGS);
    setTempSettings(DEFAULT_SETTINGS);
    await clearAllDeviceStorage();
  };

  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'Unknown';

  const handleResetRequest = () => {
    setShowResetConfirm(true);
    setResetPinInput('');
    setResetError('');
  };

  const handleConfirmReset = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (resetPinInput.trim().toUpperCase() === 'RESET') {
      try {
        await resetAllData();
        await clearAllDeviceStorage();

        setCustomers([]);
        setLoans([]);
        setSettings(DEFAULT_SETTINGS);
        setTempSettings(DEFAULT_SETTINGS);

        setView('dashboard');
        setIsMenuOpen(false);
        setShowResetConfirm(false);
      } catch (err) {
        console.error("Reset failed", err);
        setResetError('System Error during reset');
      }
    } else {
      setResetError('Type RESET to confirm');
      setResetPinInput('');
    }
  };

  const handleSaveSettings = async () => {
    try {
      const saved = await saveSettings(tempSettings);
      setSettings(saved);
      setTempSettings(saved);

      // Mirror biometric setting locally
      if (tempSettings.isBiometricLockEnabled !== undefined) {
        saveLocalBiometricState(tempSettings.isBiometricLockEnabled);
      }

      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save settings", err);
      alert("Failed to save settings to database.");
    }
  };

  // --- Biometric & Passkey Handlers ---
  const handleUnlockWithBiometrics = async () => {
    setBiometricAuthError('');
    setIsVerifyingBiometric(true);
    try {
      const local = getLocalBiometricState();
      await authenticateWithBiometrics(local.credentialId || undefined);
      setIsAppShieldLocked(false);
    } catch (err: any) {
      console.warn("Biometric unlock failed:", err);
      setBiometricAuthError(err.message || 'Biometric verification failed. Please try again.');
    } finally {
      setIsVerifyingBiometric(false);
    }
  };

  const handleRegisterDevicePasskey = async () => {
    setPasskeyActionError('');
    setPasskeyActionStatus('');
    setIsRegisteringPasskey(true);
    try {
      const res = await registerDevicePasskey(
        authEmail || 'user_portfolio',
        authEmail || 'user@example.com',
        authName || 'Money Shark Admin'
      );
      if (res) {
        await savePasskeyMutation({
          credentialId: res.credentialId,
          deviceName: res.deviceName,
        });
        saveLocalBiometricState(true, res.credentialId);
        setSettings((prev) => ({ ...prev, isBiometricLockEnabled: true }));
        setTempSettings((prev) => ({ ...prev, isBiometricLockEnabled: true }));
        setPasskeyActionStatus(`Enrolled ${res.deviceName} successfully!`);
        setTimeout(() => setPasskeyActionStatus(''), 4000);
      }
    } catch (err: any) {
      console.warn("Passkey registration failed:", err);
      setPasskeyActionError(err.message || 'Could not create device passkey.');
    } finally {
      setIsRegisteringPasskey(false);
    }
  };

  const handleRemovePasskey = async (id: any) => {
    if (!confirm("Are you sure you want to remove this device passkey?")) return;
    try {
      await removePasskeyMutation({ id });
      saveLocalBiometricState(false);
      setPasskeyActionStatus('Passkey removed.');
      setTimeout(() => setPasskeyActionStatus(''), 3000);
    } catch (err: any) {
      setPasskeyActionError(err.message || 'Failed to remove passkey');
    }
  };

  const handlePasskeySignInOnLogin = async () => {
    setAuthError('');
    setIsSubmittingAuth(true);
    try {
      const local = getLocalBiometricState();
      const res = await authenticateWithBiometrics(local.credentialId || undefined);
      if (res && res.success) {
        setIsAppShieldLocked(false);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Passkey verification failed. Please sign in with password or email code.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // --- Calculations ---
  const activeLoans = loans.filter(l => l.status === 'ACTIVE');
  const totalPrincipal = activeLoans.reduce((sum, l) => sum + l.principal, 0);

  const loanCalculations = activeLoans.map(l => {
    return calculateLoanDetails(l, settings.globalInitialInterestRate, settings.globalInterestRate);
  });

  const totalInterest = loanCalculations.reduce((sum, c) => sum + c.interestAccrued, 0);
  const totalValue = totalPrincipal + totalInterest;

  // Filter Active Loans based on Search Term
  const filteredActiveLoans = activeLoans.filter(loan => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const customerName = getCustomerName(loan.customerId).toLowerCase();
    const dateRaw = loan.startDate;
    const dateFormatted = formatDate(loan.startDate).toLowerCase();
    return customerName.includes(term) || dateRaw.includes(term) || dateFormatted.includes(term);
  });

  // --- Live Camera & AI Image Handling ---
  const startCamera = async (facing: 'environment' | 'user' = cameraFacing) => {
    stopCamera();
    setCameraError(null);
    setIsCameraActive(true);
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Direct camera is not supported in this browser. Use gallery upload instead.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Live camera error:', err);
      setIsCameraActive(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission denied. Please allow camera access in your browser or select a photo.');
      } else {
        setCameraError('Could not start live camera viewfinder. You can still upload or take a photo via the gallery.');
      }
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const toggleCameraFacing = () => {
    const next = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(next);
    startCamera(next);
  };

  const takePhotoSnap = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64DataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setScannedImage(base64DataUrl);
      stopCamera();
      analyzeImage(base64DataUrl.split(',')[1], 'image/jpeg');
    }
  };

  // Ensure camera streams are cleaned up when navigating away
  useEffect(() => {
    if (view !== 'entry' || entryMode !== 'scan') {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [view, entryMode]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    stopCamera();
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setScannedImage(base64String);
      analyzeImage(base64String.split(',')[1], file.type);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async (base64Data: string, mimeType: string) => {
    setIsAnalyzing(true);
    setScanClarification(null);

    try {
      const getGeminiApiKey = () => {
        if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
          return process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        }
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) {
          // @ts-ignore
          return import.meta.env.VITE_GEMINI_API_KEY;
        }
        return "AIzaSyC91Rq8uH4CWzeU0lYBT6sviDd0tuGk-4c";
      };
      const apiKey = getGeminiApiKey();
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `Analyze this image of a debt ledger, promissory note, handwritten loan notebook, or receipt.
      Extract:
      1. customerName: Full name of the borrower/customer.
      2. amount: Principal amount borrowed (numeric number only, e.g. 1500).
      3. date: Date of loan/transaction formatted as YYYY-MM-DD (e.g. 2026-08-21). If only day/month given, use current year.
      4. initialInterestRate: Immediate markup percentage if explicitly mentioned (e.g. 50).
      5. interestRate: Monthly interest percentage if mentioned (e.g. 30).
      6. notes: Any collateral details, terms, phone numbers, or ledger annotations.
      7. clarification: Brief 1-sentence note summarizing what was detected or any uncertainty.
      Return JSON only matching the schema.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: prompt }
          ]
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              customerName: { type: Type.STRING },
              amount: { type: Type.NUMBER },
              date: { type: Type.STRING },
              initialInterestRate: { type: Type.NUMBER },
              interestRate: { type: Type.NUMBER },
              notes: { type: Type.STRING },
              clarification: { type: Type.STRING }
            }
          }
        }
      });

      const textVal = response.text;
      const result = JSON.parse(textVal as string);

      // Pre-fill Form
      setFormData(prev => ({
        ...prev,
        customerName: result.customerName || prev.customerName || '',
        principal: result.amount !== undefined && result.amount !== null ? result.amount : prev.principal,
        startDate: result.date && result.date.length === 10 ? result.date : prev.startDate,
        initialInterestRate: result.initialInterestRate || settings.globalInitialInterestRate,
        interestRate: result.interestRate || settings.globalInterestRate,
        isFixedRate: !result.initialInterestRate && !result.interestRate,
        notes: (result.notes ? `${result.notes}. ` : '') + 'Scanned from camera receipt.'
      }));
      setScanClarification(result.clarification || 'Record successfully scanned from device camera.');
      setEntryMode('manual');

    } catch (error) {
      console.error("AI Error:", error);
      setScanClarification("Could not read all details automatically. Please verify the pre-filled fields.");
      setEntryMode('manual');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveLoan = async () => {
    if (!formData.customerName || !formData.principal) {
      alert("Please fill in Customer Name and Amount.");
      return;
    }

    setLoading(true);
    try {
      const loanPayload = {
        customerName: formData.customerName,
        principal: parseFloat(formData.principal),
        initial_interest_rate: parseFloat(formData.initialInterestRate),
        interest_rate: parseFloat(formData.interestRate),
        start_date: formData.startDate,
        interest_type: formData.interestType,
        is_fixed_rate: formData.isFixedRate,
        status: 'ACTIVE',
        notes: formData.notes + (scanClarification ? ` [AI Note: ${scanClarification}]` : '')
      };

      const { customer, loan } = await createLoan({
        customerName: loanPayload.customerName,
        principal: loanPayload.principal,
        initialInterestRate: loanPayload.initial_interest_rate,
        interestRate: loanPayload.interest_rate,
        startDate: loanPayload.start_date,
        interestType: loanPayload.interest_type,
        isFixedRate: loanPayload.is_fixed_rate,
        notes: loanPayload.notes,
      });

      if (!customers.some(c => c.id === customer.id)) {
        setCustomers(prev => [customer, ...prev]);
      }

      setLoans(prev => [loan, ...prev]);

      // Reset Form
      setFormData({
        customerName: '',
        principal: '',
        initialInterestRate: settings.globalInitialInterestRate,
        interestRate: settings.globalInterestRate,
        startDate: new Date().toISOString().split('T')[0],
        interestType: InterestType.COMPOUND,
        isFixedRate: true,
        notes: ''
      });
      setScannedImage(null);
      setScanClarification(null);
      clearDraftEntry().catch(() => {});
      setView('dashboard');

    } catch (err) {
      console.error("Error saving loan:", err);
      alert("Failed to save record.");
    } finally {
      setLoading(false);
    }
  };

  const deleteLoan = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      await deleteLoanById(id);
      setLoans(loans.filter(l => l.id !== id));
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const changeLoanStatus = async (id: string, status: Loan['status']) => {
    try {
      await updateLoanStatus(id, status);
      setLoans(loans.map(l => l.id === id ? { ...l, status } : l));
    } catch (err) {
      console.error("Status update failed", err);
      alert("Failed to update status.");
    }
  };

  const NavItem = ({ id, icon: Icon, label }: any) => (
    <button
      onClick={() => { setView(id); setIsMenuOpen(false); }}
      className={`flex items-center space-x-3 p-3 w-full rounded-xl transition-all duration-200 ${view === id
        ? 'bg-money-600 text-white shadow-lg shadow-money-900/20'
        : 'text-slate-500 hover:bg-slate-200 dark:text-shark-400 dark:hover:bg-shark-800 dark:hover:text-white'
        }`}
    >
      <Icon />
      <span className="font-medium">{label}</span>
    </button>
  );

  // --- Auth Render ---
  if (authLoading || (isUrlCodePending && !isAuthenticated)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-shark-900 text-white font-sans space-y-4">
        <div className="w-12 h-12 border-4 border-money-500/20 border-t-money-500 rounded-full animate-spin"></div>
        <div className="text-sm font-medium text-shark-300">
          {isUrlCodePending ? 'Verifying authentication...' : 'Loading secure workspace...'}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-shark-900 text-white font-sans">
        <div className="w-full max-w-md p-8 bg-shark-800 rounded-3xl shadow-2xl border border-shark-700 mx-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              <span className="text-money-500">Money</span>-Shark
            </h1>
            <p className="text-shark-400 text-sm uppercase tracking-widest">
              {authStep === 'otp-signin' || authStep === 'otp-verify'
                ? 'Email OTP Sign-In'
                : authStep === 'forgot-password' || authStep === 'reset-verify'
                ? 'Password Recovery'
                : isRegisterMode
                ? 'Create New Account'
                : 'Secure Access'}
            </p>
          </div>

          {/* VIEW: EMAIL OTP / HYBRID VERIFICATION */}
          {authStep === 'otp-verify' && (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="p-4 rounded-2xl bg-money-500/10 border border-money-500/20 text-center space-y-1.5">
                <div className="w-10 h-10 rounded-full bg-money-500/20 text-money-400 flex items-center justify-center mx-auto mb-2">
                  <Icons.Unlock />
                </div>
                <p className="text-xs text-slate-300">We sent a verification email to:</p>
                <p className="text-sm font-bold text-money-400 font-mono">{authEmail}</p>
                <p className="text-[11px] text-slate-400 pt-1">
                  You can enter the 6-digit code below <strong>or</strong> click the <strong>Verify & Sign In</strong> button in the email.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-shark-500 uppercase mb-2 text-center">
                  Enter 6-Digit Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={authOtpCode}
                  onChange={(e) => setAuthOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="123456"
                  className="w-full bg-shark-900 border-2 border-money-500/50 focus:border-money-400 rounded-xl p-4 text-center font-mono text-3xl font-bold tracking-[0.5em] text-white outline-none transition-all shadow-inner"
                  required
                  autoFocus
                />
              </div>

              {resendStatus && (
                <div className="text-emerald-400 text-xs text-center bg-emerald-900/20 p-3 rounded-lg border border-emerald-900/50">
                  {resendStatus}
                </div>
              )}

              {authError && (
                <div className="text-red-400 text-xs text-center bg-red-900/20 p-3 rounded-lg border border-red-900/50">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingAuth || authOtpCode.length < 6}
                className="w-full py-4 bg-money-600 hover:bg-money-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg shadow-money-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmittingAuth ? (
                  <span className="animate-spin"><Icons.Refresh /></span>
                ) : (
                  <Icons.CheckCircle />
                )}
                <span>Verify Code & Sign In</span>
              </button>

              <div className="flex items-center justify-between text-xs pt-2">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isSubmittingAuth}
                  className="text-money-500 hover:text-money-400 hover:underline cursor-pointer"
                >
                  Resend Email
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthStep('credentials');
                    setAuthError('');
                    setResendStatus('');
                  }}
                  className="text-shark-400 hover:text-white hover:underline cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* VIEW: PASSWORD RESET VERIFICATION */}
          {authStep === 'reset-verify' && (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="p-4 rounded-2xl bg-money-500/10 border border-money-500/20 text-center space-y-1">
                <p className="text-xs text-slate-300">Enter the 6-digit code sent to:</p>
                <p className="text-sm font-bold text-money-400 font-mono">{authEmail}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-shark-500 uppercase mb-2 text-center">
                  6-Digit Reset Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={authOtpCode}
                  onChange={(e) => setAuthOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="123456"
                  className="w-full bg-shark-900 border-2 border-money-500/50 focus:border-money-400 rounded-xl p-4 text-center font-mono text-3xl font-bold tracking-[0.5em] text-white outline-none transition-all shadow-inner"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-shark-500 uppercase mb-2">New Password</label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Enter new strong password"
                  className="w-full bg-shark-900 border border-shark-600 rounded-xl p-4 text-white focus:border-money-500 outline-none transition-colors"
                  required
                />
              </div>

              {resendStatus && (
                <div className="text-emerald-400 text-xs text-center bg-emerald-900/20 p-3 rounded-lg border border-emerald-900/50">
                  {resendStatus}
                </div>
              )}

              {authError && (
                <div className="text-red-400 text-xs text-center bg-red-900/20 p-3 rounded-lg border border-red-900/50">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingAuth || authOtpCode.length < 6 || !authPassword}
                className="w-full py-4 bg-money-600 hover:bg-money-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-lg shadow-lg shadow-money-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmittingAuth ? (
                  <span className="animate-spin"><Icons.Refresh /></span>
                ) : (
                  <Icons.CheckCircle />
                )}
                <span>Reset Password & Sign In</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthStep('credentials');
                    setAuthError('');
                    setResendStatus('');
                  }}
                  className="text-xs text-shark-400 hover:text-white hover:underline cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* VIEW: FORGOT PASSWORD REQUEST */}
          {authStep === 'forgot-password' && (
            <form onSubmit={handleSendPasswordReset} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-shark-500 uppercase mb-2">Your Account Email</label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-shark-900 border border-shark-600 rounded-xl p-4 text-white focus:border-money-500 outline-none transition-colors"
                  required
                  autoFocus
                />
                <p className="text-xs text-shark-400 mt-2">
                  We will send a 6-digit verification code to reset your password.
                </p>
              </div>

              {authError && (
                <div className="text-red-400 text-xs text-center bg-red-900/20 p-3 rounded-lg border border-red-900/50">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingAuth}
                className="w-full py-4 bg-money-600 hover:bg-money-500 disabled:opacity-60 text-white rounded-xl font-bold text-lg shadow-lg shadow-money-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmittingAuth ? (
                  <span className="animate-spin"><Icons.Refresh /></span>
                ) : (
                  <Icons.Unlock />
                )}
                <span>Send Reset Code</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthStep('credentials');
                    setAuthError('');
                    setResendStatus('');
                  }}
                  className="text-xs text-shark-400 hover:text-white hover:underline cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* VIEW: PASSWORDLESS EMAIL OTP REQUEST */}
          {authStep === 'otp-signin' && (
            <form onSubmit={handleSendEmailOtp} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-shark-500 uppercase mb-2">Email Address</label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-shark-900 border border-shark-600 rounded-xl p-4 text-white focus:border-money-500 outline-none transition-colors"
                  required
                  autoFocus
                />
                <p className="text-xs text-shark-400 mt-2">
                  We will send an instant 6-digit sign-in code to your inbox. No password needed.
                </p>
              </div>

              {authError && (
                <div className="text-red-400 text-xs text-center bg-red-900/20 p-3 rounded-lg border border-red-900/50">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingAuth}
                className="w-full py-4 bg-money-600 hover:bg-money-500 disabled:opacity-60 text-white rounded-xl font-bold text-lg shadow-lg shadow-money-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmittingAuth ? (
                  <span className="animate-spin"><Icons.Refresh /></span>
                ) : (
                  <Icons.Unlock />
                )}
                <span>Send 6-Digit Code</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthStep('credentials');
                    setAuthError('');
                  }}
                  className="text-xs text-shark-400 hover:text-white hover:underline cursor-pointer"
                >
                  Sign in with Password instead
                </button>
              </div>
            </form>
          )}

          {/* VIEW: STANDARD PASSWORD SIGN IN / REGISTRATION */}
          {authStep === 'credentials' && (
            <>
              <form onSubmit={handleLogin} className="space-y-6">
                {isRegisterMode && (
                  <div>
                    <label className="block text-xs font-bold text-shark-500 uppercase mb-2">Full Name</label>
                    <input
                      type="text"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="e.g. Melville Doe"
                      className="w-full bg-shark-900 border border-shark-600 rounded-xl p-4 text-white focus:border-money-500 outline-none transition-colors"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-shark-500 uppercase mb-2">Email</label>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-shark-900 border border-shark-600 rounded-xl p-4 text-white focus:border-money-500 outline-none transition-colors"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-shark-500 uppercase">Password</label>
                    {!isRegisterMode && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthStep('forgot-password');
                          setAuthError('');
                        }}
                        className="text-[11px] text-money-500 hover:text-money-400 hover:underline cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="••••••••••"
                    className="w-full bg-shark-900 border border-shark-600 rounded-xl p-4 text-white focus:border-money-500 outline-none transition-colors"
                    required
                  />
                  {isRegisterMode && (
                    <div className="text-xs text-shark-400 mt-2 space-y-1 bg-shark-900/50 p-3 rounded-lg border border-shark-700">
                      <span className="block font-bold text-shark-500 uppercase text-[10px] mb-1">Password Requirements:</span>
                      <span className={authPassword.length >= 8 ? 'text-green-400 block' : 'text-shark-400 block'}>• At least 8 characters</span>
                    </div>
                  )}
                </div>

                {authError && (
                  <div className="text-red-400 text-sm text-center bg-red-900/20 p-3 rounded-lg border border-red-900/50">
                    {authError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingAuth}
                  className="w-full py-4 bg-money-600 hover:bg-money-500 disabled:opacity-60 text-white rounded-xl font-bold text-lg shadow-lg shadow-money-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmittingAuth ? (
                    <span className="animate-spin"><Icons.Refresh /></span>
                  ) : (
                    <Icons.Unlock />
                  )}
                  <span>{isRegisterMode ? 'Create Account & Verify Email' : 'Access System'}</span>
                </button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-shark-700/50"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-shark-800 px-2 text-shark-400">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => handleOAuthSignIn("github")}
                  disabled={isSubmittingAuth}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-shark-900 hover:bg-shark-950 border border-shark-700 rounded-xl text-white font-medium text-sm transition-all duration-200 cursor-pointer disabled:opacity-50"
                >
                  <Icons.GitHub /> GitHub
                </button>
                <button
                  type="button"
                  onClick={() => handleOAuthSignIn("google")}
                  disabled={isSubmittingAuth}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-shark-900 hover:bg-shark-950 border border-shark-700 rounded-xl text-white font-medium text-sm transition-all duration-200 cursor-pointer disabled:opacity-50"
                >
                  <Icons.Google /> Google
                </button>
              </div>

              {!isRegisterMode && isDeviceBiometricAvailable && (
                <div className="mb-3 text-center">
                  <button
                    type="button"
                    onClick={handlePasskeySignInOnLogin}
                    disabled={isSubmittingAuth}
                    className="w-full py-3 px-4 bg-money-500/10 hover:bg-money-500/20 border border-money-500/30 rounded-xl text-money-400 font-medium text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Icons.Fingerprint />
                    <span>Unlock / Sign in with Device Passkey</span>
                  </button>
                </div>
              )}

              {!isRegisterMode && (
                <div className="mb-4 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthStep('otp-signin');
                      setAuthError('');
                    }}
                    className="text-xs text-money-500 hover:text-money-400 hover:underline cursor-pointer"
                  >
                    ✉️ Sign in with 6-Digit Email Code instead
                  </button>
                </div>
              )}

              <div className="mt-4 text-center text-sm border-t border-shark-700/40 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegisterMode((prev) => !prev);
                    setAuthError('');
                  }}
                  className="text-money-500 hover:text-money-400 cursor-pointer"
                >
                  {isRegisterMode ? 'Already have an account? Sign in' : 'No account? Create one'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // --- Biometric App Shield Lock Screen ---
  if (isAppShieldLocked && (settings.isBiometricLockEnabled || getLocalBiometricState().enabled)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-shark-950 text-white font-sans px-4 relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute w-96 h-96 bg-money-500/10 rounded-full blur-3xl pointer-events-none -top-20 -left-20"></div>
        <div className="absolute w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20"></div>

        <div className="w-full max-w-md p-8 bg-shark-900/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-money-500/20 text-center space-y-6 animate-in fade-in zoom-in-95 duration-200 z-10">
          {/* Glowing Shield Icon */}
          <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 rounded-3xl bg-money-500/20 animate-ping opacity-25"></div>
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-money-500/20 to-emerald-600/30 border border-money-500/40 flex items-center justify-center text-money-400 shadow-xl shadow-money-500/10">
              <Icons.Fingerprint />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
              Money Shark Vault Locked
            </h2>
            <p className="text-sm text-shark-300">
              Biometric verification required to access your financial records.
            </p>
          </div>

          {biometricAuthError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center font-medium">
              {biometricAuthError}
            </div>
          )}

          <div className="space-y-3 pt-2">
            <button
              onClick={handleUnlockWithBiometrics}
              disabled={isVerifyingBiometric}
              className="w-full py-4 bg-gradient-to-r from-money-600 to-emerald-600 hover:from-money-500 hover:to-emerald-500 active:scale-[0.98] text-white rounded-2xl font-bold text-lg shadow-xl shadow-money-900/40 transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              {isVerifyingBiometric ? (
                <>
                  <span className="animate-spin"><Icons.Refresh /></span>
                  <span>Verifying Device...</span>
                </>
              ) : (
                <>
                  <Icons.Fingerprint />
                  <span>Unlock with Biometrics</span>
                </>
              )}
            </button>

            <button
              onClick={() => {
                signOut().catch(() => {});
                setIsAppShieldLocked(false);
              }}
              className="w-full py-3 bg-shark-800/80 hover:bg-shark-700 text-shark-300 hover:text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Icons.LogOut /> Switch Account / Sign Out
            </button>
          </div>

          <div className="text-[11px] text-shark-500 flex items-center justify-center gap-1.5 pt-2">
            <Icons.Shield />
            <span>Hardware-Backed WebAuthn Biometric Shield</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-shark-900 text-slate-900 dark:text-slate-200 font-sans overflow-hidden transition-colors duration-300 relative">

      {/* HEADER - VISIBLE ALWAYS */}
      <header className="absolute top-0 left-0 right-0 h-16 bg-white dark:bg-shark-900 border-b border-slate-200 dark:border-shark-800 z-20 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={toggleMenu} className="p-2 -ml-2 rounded-lg text-slate-600 dark:text-white hover:bg-slate-100 dark:hover:bg-shark-800 transition-colors">
            <Icons.Menu />
          </button>
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-money-600 dark:text-money-500">Money</span>
            <span className="text-slate-900 dark:text-white">-Shark</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {!isStandaloneApp && (
            <button
              onClick={handleInstallApp}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-money-500/10 hover:bg-money-500/20 border border-money-500/30 text-money-600 dark:text-money-400 text-xs font-semibold transition-all cursor-pointer shadow-sm"
              title="Install App on Device"
            >
              <Icons.Smartphone />
              <span className="hidden sm:inline">Install App</span>
              <span className="sm:hidden">Install</span>
            </button>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="hidden sm:inline">On-Device Cache Active</span>
            <span className="sm:hidden">Local DB</span>
          </div>
        </div>
      </header>

      {/* SIDEBAR DRAWER - COLLAPSIBLE MENU */}
      <div
        className={`fixed inset-y-0 left-0 w-72 bg-white dark:bg-shark-900 border-r border-slate-200 dark:border-shark-800 z-50 transform transition-transform duration-300 ease-in-out shadow-2xl flex flex-col ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="h-16 flex items-center px-4 border-b border-slate-200 dark:border-shark-800">
          <h2 className="text-sm font-bold text-slate-400 dark:text-shark-500 uppercase tracking-widest">Navigation</h2>
          <button onClick={toggleMenu} className="ml-auto p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white">
            <Icons.X />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-6">
          {!isStandaloneApp && (
            <button
              onClick={() => {
                setIsMenuOpen(false);
                handleInstallApp();
              }}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-money-600/20 via-money-500/10 to-transparent border border-money-500/30 hover:border-money-500 text-money-600 dark:text-money-400 transition-all text-left group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-money-500 text-white shadow-md shadow-money-500/30 group-hover:scale-110 transition-transform">
                  <Icons.Smartphone />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">Install App</div>
                  <div className="text-[11px] text-slate-500 dark:text-shark-400">Home Screen / Desktop</div>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-money-600 dark:text-money-400 bg-money-500/10 px-2 py-0.5 rounded-full border border-money-500/20">PWA</span>
            </button>
          )}

          <nav className="space-y-2">
            <NavItem id="dashboard" icon={Icons.TrendingUp} label="Overview" />
            <NavItem id="loans" icon={Icons.Users} label="Loans & Customers" />
            <NavItem id="entry" icon={Icons.Plus} label="New Entry" />
            <NavItem id="settings" icon={Icons.Settings} label="Global Settings" />
          </nav>

          <div className="h-px bg-slate-200 dark:bg-shark-800"></div>

          <div>
            <h3 className="px-3 mb-3 text-xs font-bold text-slate-400 dark:text-shark-500 uppercase">Input Preferences</h3>
            <div className="space-y-2">
              {/* Use Fixed Rates Toggle - Moved here from Form */}
              <button
                onClick={() => setFormData(prev => ({ ...prev, isFixedRate: !prev.isFixedRate }))}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${formData.isFixedRate
                  ? 'bg-money-50 dark:bg-money-900/10 border-money-200 dark:border-money-900/30'
                  : 'bg-slate-50 dark:bg-shark-800 border-slate-200 dark:border-shark-700'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={formData.isFixedRate ? 'text-money-600 dark:text-money-500' : 'text-slate-400'}>
                    {formData.isFixedRate ? <Icons.Lock /> : <Icons.Unlock />}
                  </div>
                  <div className="text-left">
                    <div className={`text-sm font-medium ${formData.isFixedRate ? 'text-money-700 dark:text-money-400' : 'text-slate-600 dark:text-shark-300'}`}>Use Fixed Rates</div>
                    <div className="text-[10px] text-slate-400 dark:text-shark-500">Lock entry inputs to global defaults</div>
                  </div>
                </div>
                <div className="w-10 h-5 rounded-full relative transition-colors bg-slate-300 dark:bg-shark-600" style={{ backgroundColor: formData.isFixedRate ? 'var(--money-600, #10b981)' : '' }}>
                  <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${formData.isFixedRate ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </div>
              </button>

              {/* Theme Toggle in Menu */}
              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-shark-800 border border-slate-200 dark:border-shark-700 hover:bg-slate-100 dark:hover:bg-shark-700 transition-colors text-slate-600 dark:text-shark-300"
              >
                {theme === 'dark' ? <Icons.Sun /> : <Icons.Moon />}
                <span className="text-sm font-medium">{theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-shark-950 border-t border-slate-200 dark:border-shark-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Total Capital</span>
            <span className="font-mono font-bold text-money-600 dark:text-money-500">{formatCurrency(totalPrincipal)}</span>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 p-2 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold transition-colors">
            <Icons.LogOut /> Log Out
          </button>
        </div>
      </div>

      {/* BACKDROP */}
      {isMenuOpen && (
        <div onClick={toggleMenu} className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm transition-opacity"></div>
      )}

      {/* RESET CONFIRMATION MODAL */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-shark-900/80 backdrop-blur-sm" onClick={() => setShowResetConfirm(false)}></div>
          <div className="relative bg-white dark:bg-shark-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 dark:border-shark-700">
            <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-500">
              <Icons.Trash />
              <h3 className="text-lg font-bold">Confirm Reset</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-shark-300 mb-4">
              This will permanently erase all customers and loan records. This action cannot be undone.
            </p>
            <form onSubmit={handleConfirmReset}>
              <label className="block text-xs font-bold text-slate-500 dark:text-shark-500 uppercase mb-1">Type RESET to confirm</label>
              <input
                type="text"
                value={resetPinInput}
                onChange={(e) => setResetPinInput(e.target.value)}
                className="w-full bg-slate-50 dark:bg-shark-900 border border-slate-300 dark:border-shark-600 rounded-lg p-3 text-center tracking-widest text-slate-900 dark:text-white focus:border-red-500 outline-none transition-colors mb-2"
                placeholder="RESET"
                autoFocus
              />
              {resetError && <div className="text-xs text-red-500 mb-2 font-medium text-center">{resetError}</div>}

              <div className="flex gap-2 mt-4">
                <button type="button" onClick={() => setShowResetConfirm(false)} className="flex-1 py-2 bg-slate-100 dark:bg-shark-700 rounded-lg text-slate-600 dark:text-shark-300 font-medium hover:bg-slate-200 dark:hover:bg-shark-600 transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition-colors">Reset Everything</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto pt-16 pb-20 md:pb-6 relative">
        <div className="p-6 max-w-6xl mx-auto space-y-8">

          {/* VIEW: DASHBOARD */}
          {view === 'dashboard' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-white dark:bg-shark-800 p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-shark-700 shadow-xl shadow-slate-200/50 dark:shadow-none transition-colors duration-300">
                  <h3 className="text-slate-400 dark:text-shark-400 text-xs md:text-sm font-medium uppercase tracking-wider mb-2">Total Deployed</h3>
                  <div className="text-xl md:text-3xl font-bold text-slate-900 dark:text-white">{formatCurrency(totalPrincipal)}</div>
                </div>
                <div className="bg-white dark:bg-shark-800 p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-shark-700 shadow-xl shadow-slate-200/50 dark:shadow-none transition-colors duration-300">
                  <h3 className="text-slate-400 dark:text-shark-400 text-xs md:text-sm font-medium uppercase tracking-wider mb-2">Accrued Interest</h3>
                  <div className="text-xl md:text-3xl font-bold text-money-600 dark:text-money-500">+{formatCurrency(totalInterest)}</div>
                  <div className="text-[10px] md:text-xs text-slate-400 dark:text-shark-500 mt-1">Based on current rates</div>
                </div>
                <div className="bg-white dark:bg-shark-800 p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-shark-700 shadow-xl shadow-slate-200/50 dark:shadow-none transition-colors duration-300 col-span-2 md:col-span-1">
                  <h3 className="text-slate-400 dark:text-shark-400 text-xs md:text-sm font-medium uppercase tracking-wider mb-2">Total Value</h3>
                  <div className="text-xl md:text-3xl font-bold text-slate-900 dark:text-white">{formatCurrency(totalValue)}</div>
                </div>
              </div>

              <div className="mt-8">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Active Loans</h2>

                  <div className="flex flex-1 w-full md:w-auto gap-3">
                    <div className="relative flex-1 md:max-w-md ml-auto">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Icons.Search />
                      </div>
                      <input
                        type="text"
                        placeholder="Search name or date..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-shark-800 border border-slate-200 dark:border-shark-700 rounded-xl text-slate-900 dark:text-white focus:border-money-500 outline-none transition-colors text-sm"
                      />
                    </div>
                    <button onClick={() => setView('entry')} className="bg-money-600 hover:bg-money-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-money-900/20 whitespace-nowrap">
                      <Icons.Plus /> <span className="hidden sm:inline">New Record</span>
                    </button>
                  </div>
                </div>

                <div className="grid gap-4">
                  {filteredActiveLoans.map((loan) => {
                    const calc = calculateLoanDetails(loan, settings.globalInitialInterestRate, settings.globalInterestRate);
                    const activeInitialRate = loan.isFixedRate ? settings.globalInitialInterestRate : loan.initialInterestRate;
                    const activeMonthlyRate = loan.isFixedRate ? settings.globalInterestRate : loan.interestRate;

                    return (
                      <div key={loan.id} className="bg-white dark:bg-shark-800 p-4 md:p-5 rounded-xl border border-slate-200 dark:border-shark-700 hover:border-money-500 dark:hover:border-shark-600 transition-colors shadow-sm flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white leading-tight">{getCustomerName(loan.customerId)}</h3>
                              <span className="text-[10px] md:text-xs bg-slate-100 dark:bg-shark-900 text-slate-500 dark:text-shark-400 px-1.5 py-0.5 rounded border border-slate-200 dark:border-shark-700">
                                {activeMonthlyRate}%/mo
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-shark-400 mt-1">
                              Started {formatDate(loan.startDate)} • Initial: {activeInitialRate}%
                            </div>
                          </div>

                          <div className="flex gap-1 md:gap-2">
                            <button 
                              onClick={() => changeLoanStatus(loan.id, 'PAID')} 
                              title="Mark as Paid"
                              className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-100/50 dark:hover:bg-green-950/30 rounded-lg transition-colors"
                            >
                              <Icons.Check />
                            </button>
                            <button 
                              onClick={() => changeLoanStatus(loan.id, 'DEFAULTED')} 
                              title="Mark as Defaulted"
                              className="p-1.5 text-orange-600 dark:text-orange-400 hover:bg-orange-100/50 dark:hover:bg-orange-950/30 rounded-lg transition-colors"
                            >
                              <Icons.X />
                            </button>
                            <button 
                              onClick={() => deleteLoan(loan.id)} 
                              title="Delete Record"
                              className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100/50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                            >
                              <Icons.Trash />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 w-full pt-3 border-t border-slate-100 dark:border-shark-800/80 md:border-t-0 md:pt-0 md:flex md:items-center md:justify-end md:gap-8 md:w-auto ml-auto">
                          <div className="text-left md:text-right">
                            <div className="text-[10px] md:text-xs text-slate-400 dark:text-shark-500 uppercase tracking-wider">Principal</div>
                            <div className="text-sm md:text-base text-slate-600 dark:text-shark-300 font-mono font-medium">{formatCurrency(loan.principal)}</div>
                          </div>
                          <div className="text-left md:text-right">
                            <div className="text-[10px] md:text-xs text-slate-400 dark:text-shark-500 uppercase tracking-wider">Interest</div>
                            <div className="text-sm md:text-base text-money-600 dark:text-money-500 font-mono font-bold">+{formatCurrency(calc.interestAccrued)}</div>
                          </div>
                          <div className="text-right border-l border-slate-100 dark:border-shark-800 pl-4 md:pl-6 md:border-l-2">
                            <div className="text-[10px] md:text-xs text-slate-400 dark:text-shark-500 uppercase tracking-wider">Total Due</div>
                            <div className="text-base md:text-xl font-bold text-slate-900 dark:text-white font-mono">{formatCurrency(calc.totalAmount)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredActiveLoans.length === 0 && (
                    <div className="text-center py-12 text-slate-400 dark:text-shark-500 bg-slate-50 dark:bg-shark-800/50 rounded-xl border border-slate-200 dark:border-shark-700 border-dashed">
                      {searchTerm ? 'No loans matching your search.' : 'No active loans found.'}
                    </div>
                  )}
                </div>
              </div>

              {/* History / Closed Loans Section */}
              <div className="mt-12 border-t border-slate-200 dark:border-shark-800 pt-8">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">Closed & History Records</h2>
                <div className="grid gap-4">
                  {loans.filter(l => l.status !== 'ACTIVE').map((loan) => {
                    const calc = calculateLoanDetails(loan, settings.globalInitialInterestRate, settings.globalInterestRate);
                    return (
                      <div key={loan.id} className="bg-white dark:bg-shark-800 p-4 md:p-5 rounded-xl border border-slate-200 dark:border-shark-700 flex flex-col gap-4 opacity-75 shadow-sm hover:opacity-100 transition-all duration-300">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white leading-tight">{getCustomerName(loan.customerId)}</h3>
                              <span className={`text-[10px] md:text-xs px-2 py-0.5 rounded font-bold uppercase ${
                                loan.status === 'PAID' 
                                  ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/30'
                                  : 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-900/30'
                              }`}>
                                {loan.status}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-shark-400 mt-1">
                              Started {formatDate(loan.startDate)} • Notes: {loan.notes || "None"}
                            </div>
                          </div>

                          <div className="flex gap-1 md:gap-2">
                            <button 
                              onClick={() => changeLoanStatus(loan.id, 'ACTIVE')} 
                              title="Re-activate Loan"
                              className="p-1.5 text-money-600 dark:text-money-400 hover:bg-money-100/50 dark:hover:bg-money-950/30 rounded-lg transition-colors"
                            >
                              <Icons.Refresh />
                            </button>
                            <button 
                              onClick={() => deleteLoan(loan.id)} 
                              title="Delete Record"
                              className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100/50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                            >
                              <Icons.Trash />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 w-full pt-3 border-t border-slate-100 dark:border-shark-800/80 md:border-t-0 md:pt-0 md:flex md:items-center md:justify-end md:gap-8 md:w-auto ml-auto">
                          <div className="text-left md:text-right">
                            <div className="text-[10px] md:text-xs text-slate-400 dark:text-shark-500 uppercase tracking-wider">Principal</div>
                            <div className="text-sm md:text-base text-slate-600 dark:text-shark-300 font-mono font-medium">{formatCurrency(loan.principal)}</div>
                          </div>
                          <div className="text-left md:text-right">
                            <div className="text-[10px] md:text-xs text-slate-400 dark:text-shark-500 uppercase tracking-wider">Interest</div>
                            <div className="text-sm md:text-base text-slate-600 dark:text-shark-300 font-mono">{formatCurrency(calc.interestAccrued)}</div>
                          </div>
                          <div className="text-right border-l border-slate-100 dark:border-shark-800 pl-4 md:pl-6 md:border-l-2">
                            <div className="text-[10px] md:text-xs text-slate-400 dark:text-shark-500 uppercase tracking-wider">Total Due</div>
                            <div className="text-base md:text-xl font-bold text-slate-900 dark:text-white font-mono">{formatCurrency(calc.totalAmount)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {loans.filter(l => l.status !== 'ACTIVE').length === 0 && (
                    <div className="text-center py-6 text-slate-400 dark:text-shark-500 bg-slate-50 dark:bg-shark-800/30 rounded-xl border border-slate-200 dark:border-shark-700 border-dashed text-xs">
                      No closed or archived loans.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* VIEW: LOANS & CUSTOMERS */}
          {view === 'loans' && (
            <div className="bg-white dark:bg-shark-800 rounded-2xl border border-slate-200 dark:border-shark-700 p-6 shadow-xl shadow-slate-200/50 dark:shadow-none transition-colors duration-300">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Customer Directory</h2>
              <div className="space-y-4">
                {customers.map(c => (
                  <div key={c.id} className="p-4 bg-slate-50 dark:bg-shark-900 rounded-lg border border-slate-200 dark:border-shark-700 flex justify-between items-center">
                    <span className="font-medium text-lg text-slate-900 dark:text-slate-200">{c.name}</span>
                    <span className="text-sm text-slate-500 dark:text-shark-500">{loans.filter(l => l.customerId === c.id).length} Active Loans</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: ENTRY (MANUAL & SCAN) */}
          {view === 'entry' && (
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => setView('dashboard')}
                  className="p-2 hover:bg-slate-200 dark:hover:bg-shark-800 rounded-lg text-slate-400 hover:text-slate-900 dark:text-shark-400 dark:hover:text-white transition-colors"
                  aria-label="Back to dashboard"
                >
                  <Icons.ArrowLeft />
                </button>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Create New Entry</h2>
              </div>

              {/* Tabs */}
              <div className="flex space-x-2 mb-6 bg-white dark:bg-shark-800 p-1 rounded-xl border border-slate-200 dark:border-shark-700 inline-flex">
                <button
                  onClick={() => setEntryMode('manual')}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-colors ${entryMode === 'manual' ? 'bg-shark-600 text-white' : 'text-slate-500 hover:text-slate-900 dark:text-shark-400 dark:hover:text-white'}`}
                >
                  <Icons.Pen /> Manual Input
                </button>
                <button 
                  onClick={() => setEntryMode('scan')}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-colors ${entryMode === 'scan' ? 'bg-money-600 text-white' : 'text-slate-500 hover:text-slate-900 dark:text-shark-400 dark:hover:text-white'}`}
                >
                  <Icons.Camera /> Scan Receipt / Ledger
                </button>
              </div>

              {/* Mode: Scan / Camera Viewfinder */}
              {entryMode === 'scan' && (
                <div className="space-y-6 mb-6">
                  {/* Hidden fallback file input (supports camera capture on mobile) */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                  />

                  {/* 1. Live Camera Viewfinder Stream */}
                  {isCameraActive && (
                    <div className="bg-black rounded-3xl overflow-hidden shadow-2xl border-2 border-money-500 relative flex flex-col items-center">
                      <div className="relative w-full aspect-[4/3] max-h-[460px] bg-black flex items-center justify-center overflow-hidden">
                        <video
                          ref={videoRef}
                          playsInline
                          autoPlay
                          muted
                          className="w-full h-full object-cover"
                        />

                        {/* Document Alignment Frame Guidelines */}
                        <div className="absolute inset-8 pointer-events-none border border-white/20 rounded-2xl flex flex-col justify-between p-2">
                          <div className="flex justify-between">
                            <div className="w-6 h-6 border-t-2 border-l-2 border-money-400 rounded-tl"></div>
                            <div className="w-6 h-6 border-t-2 border-r-2 border-money-400 rounded-tr"></div>
                          </div>
                          <div className="text-center">
                            <span className="bg-black/60 backdrop-blur text-white text-xs font-medium px-3 py-1 rounded-full border border-white/10 shadow-lg">
                              Align ledger or receipt in frame
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <div className="w-6 h-6 border-b-2 border-l-2 border-money-400 rounded-bl"></div>
                            <div className="w-6 h-6 border-b-2 border-r-2 border-money-400 rounded-br"></div>
                          </div>
                        </div>
                      </div>

                      {/* Viewfinder Controls Bar */}
                      <div className="w-full bg-shark-950/95 px-6 py-5 flex items-center justify-between border-t border-shark-800">
                        {/* Switch Front/Back Camera */}
                        <button
                          type="button"
                          onClick={toggleCameraFacing}
                          className="p-3 bg-shark-800 hover:bg-shark-700 text-slate-200 rounded-full transition-colors flex items-center justify-center"
                          title="Flip camera"
                        >
                          <Icons.SwitchCamera />
                        </button>

                        {/* Shutter Snap Button */}
                        <button
                          type="button"
                          onClick={takePhotoSnap}
                          className="relative p-1 rounded-full bg-money-500/30 hover:bg-money-500/40 active:scale-95 transition-transform"
                          title="Take Photo Snap"
                        >
                          <div className="w-16 h-16 rounded-full border-4 border-white bg-money-500 flex items-center justify-center shadow-lg shadow-money-500/50">
                            <div className="w-6 h-6 rounded-full bg-white"></div>
                          </div>
                        </button>

                        {/* Close Camera Viewfinder */}
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="p-3 bg-shark-800 hover:bg-shark-700 text-slate-200 rounded-full transition-colors flex items-center justify-center"
                          title="Close camera"
                        >
                          <Icons.X />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 2. Processing & Scanning Animation State */}
                  {isAnalyzing && (
                    <div className="bg-white dark:bg-shark-800 rounded-3xl p-8 border border-slate-200 dark:border-shark-700 text-center shadow-xl relative overflow-hidden">
                      {scannedImage && (
                        <div className="relative w-48 h-48 mx-auto rounded-2xl overflow-hidden border border-slate-300 dark:border-shark-600 mb-6 shadow-inner">
                          <img src={scannedImage} alt="Scanning" className="w-full h-full object-cover opacity-70" />
                          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-money-400 to-transparent shadow-[0_0_20px_#10b981] animate-pulse"></div>
                        </div>
                      )}
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="animate-spin text-money-500"><Icons.Refresh /></span>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Gemini AI Analyzing Record</h3>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-shark-400 max-w-md mx-auto">
                        Extracting customer name, principal amounts, transaction dates, and interest rates...
                      </p>
                    </div>
                  )}

                  {/* 3. Camera Selection Hub (When camera is closed and not analyzing) */}
                  {!isCameraActive && !isAnalyzing && (
                    <div className="bg-white dark:bg-shark-800 rounded-3xl p-8 border border-slate-200 dark:border-shark-700 shadow-xl space-y-6">
                      {cameraError && (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm flex items-start gap-3">
                          <Icons.Lock />
                          <div>
                            <p className="font-semibold">Camera Notice</p>
                            <p className="text-xs mt-0.5">{cameraError}</p>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Primary Option: Live Snap */}
                        <button
                          type="button"
                          onClick={() => startCamera('environment')}
                          className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-money-500/40 bg-gradient-to-b from-money-500/10 to-transparent hover:from-money-500/20 hover:border-money-500 transition-all text-center group"
                        >
                          <div className="w-16 h-16 rounded-2xl bg-money-500/20 text-money-600 dark:text-money-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Icons.Camera />
                          </div>
                          <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Take Photo Snap</h4>
                          <p className="text-xs text-slate-500 dark:text-shark-400">Launch live viewfinder using device camera</p>
                        </button>

                        {/* Secondary Option: File / Gallery Upload */}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-slate-200 dark:border-shark-700 bg-slate-50 dark:bg-shark-900/50 hover:border-slate-400 dark:hover:border-shark-500 transition-all text-center group"
                        >
                          <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-shark-800 text-slate-700 dark:text-slate-300 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Icons.Upload />
                          </div>
                          <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Upload from Files</h4>
                          <p className="text-xs text-slate-500 dark:text-shark-400">Choose an existing receipt photo or screenshot</p>
                        </button>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-shark-900 border border-slate-200 dark:border-shark-700 flex items-center gap-3 text-xs text-slate-500 dark:text-shark-400">
                        <span className="text-money-500 text-base"><Icons.Sparkles /></span>
                        <span>Powered by <strong>Google Gemini 2.5 Flash</strong> OCR engine for high-accuracy handwriting and paper ledger recognition.</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mode: Manual Form (Also shown after scan) */}
              {entryMode === 'manual' && (
                <div className="bg-white dark:bg-shark-800 p-8 rounded-2xl border border-slate-200 dark:border-shark-700 shadow-xl shadow-slate-200/50 dark:shadow-none transition-colors duration-300">
                  {/* Scan Context (if any) */}
                  {scannedImage && (
                    <div className="mb-6 bg-slate-50 dark:bg-shark-900 p-4 rounded-xl border border-slate-200 dark:border-shark-700 flex gap-4 items-start">
                      <img src={scannedImage} alt="Reference" className="w-20 h-20 object-cover rounded-lg border border-slate-300 dark:border-shark-600" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-money-500"><Icons.CheckCircle /></span>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">AI Scanned Record</h4>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-shark-400 mb-2">The form below was automatically populated from your camera snap.</p>
                        {scanClarification && (
                          <div className="text-xs text-money-700 dark:text-money-300 bg-money-100/50 dark:bg-money-900/20 p-2 rounded border border-money-200 dark:border-money-900/50 mb-2">
                            <strong>AI Summary:</strong> {scanClarification}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setScannedImage(null);
                            setEntryMode('scan');
                            startCamera('environment');
                          }}
                          className="inline-flex items-center gap-1.5 text-xs text-money-600 dark:text-money-500 hover:underline font-medium"
                        >
                          <Icons.RotateCcw /> Take another photo snap
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-5">
                    {/* Customer Name with Datalist */}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-shark-500 uppercase mb-1">Customer Name</label>
                      <input
                        list="customer-list"
                        type="text"
                        value={formData.customerName}
                        onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                        placeholder="e.g. Tony Spilotro"
                        className="w-full bg-slate-50 dark:bg-shark-900 border border-slate-300 dark:border-shark-600 rounded-lg p-3 text-slate-900 dark:text-white focus:border-money-500 outline-none transition-colors"
                      />
                      <datalist id="customer-list">
                        {customers.map(c => <option key={c.id} value={c.name} />)}
                      </datalist>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-shark-500 uppercase mb-1">Principal (R)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.principal}
                          onChange={(e) => setFormData({ ...formData, principal: e.target.value })}
                          placeholder="0.00"
                          className="w-full bg-slate-50 dark:bg-shark-900 border border-slate-300 dark:border-shark-600 rounded-lg p-3 text-slate-900 dark:text-white focus:border-money-500 outline-none font-mono transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-shark-500 uppercase mb-1">Start Date</label>
                        <input
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-shark-900 border border-slate-300 dark:border-shark-600 rounded-lg p-3 text-slate-900 dark:text-white focus:border-money-500 outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-shark-500 uppercase mb-1">Initial Interest (%)</label>
                        <div className={`relative ${formData.isFixedRate ? 'opacity-80' : ''}`}>
                          <input
                            type="number"
                            step="0.01"
                            disabled={formData.isFixedRate}
                            value={formData.isFixedRate ? settings.globalInitialInterestRate : formData.initialInterestRate}
                            onChange={(e) => setFormData({ ...formData, initialInterestRate: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-shark-900 border border-slate-300 dark:border-shark-600 rounded-lg p-3 text-slate-900 dark:text-white focus:border-money-500 outline-none font-mono transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-shark-500 uppercase mb-1">Monthly Compounding (%)</label>
                        <div className={`relative ${formData.isFixedRate ? 'opacity-80' : ''}`}>
                          <input
                            type="number"
                            step="0.01"
                            disabled={formData.isFixedRate}
                            value={formData.isFixedRate ? settings.globalInterestRate : formData.interestRate}
                            onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                            className="w-full bg-slate-50 dark:bg-shark-900 border border-slate-300 dark:border-shark-600 rounded-lg p-3 text-slate-900 dark:text-white focus:border-money-500 outline-none font-mono transition-colors"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 dark:text-shark-400 uppercase font-bold mr-2">Compounding Mode:</span>
                        <select
                          value={formData.interestType}
                          onChange={(e) => setFormData({ ...formData, interestType: e.target.value as InterestType })}
                          className="bg-slate-50 dark:bg-shark-900 border border-slate-300 dark:border-shark-600 rounded-lg p-1 text-xs text-slate-900 dark:text-white focus:border-money-500 outline-none transition-colors"
                        >
                          <option value={InterestType.COMPOUND}>Compound Monthly</option>
                          <option value={InterestType.SIMPLE}>Simple Interest</option>
                        </select>
                      </div>
                    </div>

                    {/* Note on Fixed Rates */}
                    {formData.isFixedRate && (
                      <div className="text-xs text-center text-slate-400 dark:text-shark-500 italic">
                        Using global fixed rates. Unlock in menu to edit custom rates.
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-shark-500 uppercase mb-1">Notes</label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        rows={3}
                        className="w-full bg-slate-50 dark:bg-shark-900 border border-slate-300 dark:border-shark-600 rounded-lg p-3 text-slate-900 dark:text-white focus:border-money-500 outline-none resize-none transition-colors"
                        placeholder="Additional details..."
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={handleSaveLoan}
                        className="w-full py-4 bg-money-600 hover:bg-money-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-money-900/50 transition-all flex items-center justify-center gap-2"
                      >
                        <Icons.Check /> Save Record
                      </button>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW: SETTINGS */}
          {view === 'settings' && (
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Global Configuration</h2>
              <div className="bg-white dark:bg-shark-800 rounded-2xl border border-slate-200 dark:border-shark-700 p-6 space-y-6 shadow-xl shadow-slate-200/50 dark:shadow-none transition-colors duration-300">

                {/* Interest Rate Settings */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-slate-900 dark:text-white">Default Initial Interest</h3>
                    <p className="text-sm text-slate-500 dark:text-shark-400">The immediate markup applied (e.g., 50% = 500 becomes 750).</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={tempSettings.globalInitialInterestRate}
                      onChange={(e) => setTempSettings({ ...tempSettings, globalInitialInterestRate: parseFloat(e.target.value) })}
                      className="bg-slate-50 dark:bg-shark-900 border border-slate-300 dark:border-shark-600 text-slate-900 dark:text-white rounded-lg p-2 w-24 text-right font-mono transition-colors focus:border-money-500 outline-none"
                    />
                    <span className="text-slate-500 dark:text-shark-400">%</span>
                  </div>
                </div>

                <div className="h-px bg-slate-200 dark:bg-shark-700 my-4"></div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-slate-900 dark:text-white">Default Monthly Compounding</h3>
                    <p className="text-sm text-slate-500 dark:text-shark-400">The rate applied every 30 days after the first month.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={tempSettings.globalInterestRate}
                      onChange={(e) => setTempSettings({ ...tempSettings, globalInterestRate: parseFloat(e.target.value) })}
                      className="bg-slate-50 dark:bg-shark-900 border border-slate-300 dark:border-shark-600 text-slate-900 dark:text-white rounded-lg p-2 w-24 text-right font-mono transition-colors focus:border-money-500 outline-none"
                    />
                    <span className="text-slate-500 dark:text-shark-400">%</span>
                  </div>
                </div>

                <div className="h-px bg-slate-200 dark:bg-shark-700 my-4"></div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-slate-900 dark:text-white">Compound Interest Mode</h3>
                    <p className="text-sm text-slate-500 dark:text-shark-400">If disabled, simple interest will be used by default.</p>
                  </div>
                  <button
                    onClick={() => setTempSettings({ ...tempSettings, globalCompoundMonthly: !tempSettings.globalCompoundMonthly })}
                    className={`w-12 h-6 rounded-full transition-colors relative ${tempSettings.globalCompoundMonthly ? 'bg-money-600' : 'bg-slate-300 dark:bg-shark-600'}`}
                  >
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${tempSettings.globalCompoundMonthly ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
                </div>

                <div className="h-px bg-slate-200 dark:bg-shark-700 my-4"></div>

                {/* BIOMETRIC & PASSKEY SECURITY CARD */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-money-500"><Icons.Fingerprint /></span>
                        <h3 className="font-bold text-slate-900 dark:text-white">Biometric Passkey & App Shield</h3>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-shark-400 mt-1">
                        Lock the application with hardware-backed Face ID, Touch ID, or Windows Hello.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setTempSettings({ ...tempSettings, isBiometricLockEnabled: !tempSettings.isBiometricLockEnabled })}
                      className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${tempSettings.isBiometricLockEnabled ? 'bg-money-600' : 'bg-slate-300 dark:bg-shark-600'}`}
                    >
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${tempSettings.isBiometricLockEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                  </div>

                  {/* Device Biometrics Status */}
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-shark-900 border border-slate-200 dark:border-shark-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${isDeviceBiometricAvailable ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {isDeviceBiometricAvailable ? 'Biometrics Available (Face ID / Touch ID / Windows Hello)' : 'Biometrics Not Detected (Using fallback)'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleRegisterDevicePasskey}
                      disabled={isRegisteringPasskey}
                      className="px-3.5 py-2 rounded-lg bg-money-600 hover:bg-money-500 disabled:opacity-50 text-white font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
                    >
                      {isRegisteringPasskey ? (
                        <span className="animate-spin"><Icons.Refresh /></span>
                      ) : (
                        <Icons.Key />
                      )}
                      <span>Register Device Passkey</span>
                    </button>
                  </div>

                  {passkeyActionStatus && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                      {passkeyActionStatus}
                    </div>
                  )}

                  {passkeyActionError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                      {passkeyActionError}
                    </div>
                  )}

                  {/* Registered Passkeys List */}
                  {passkeysList && passkeysList.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-shark-400">
                        Registered Device Passkeys ({passkeysList.length})
                      </span>
                      <div className="space-y-1.5">
                        {passkeysList.map((p: any) => (
                          <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-shark-900/60 border border-slate-200 dark:border-shark-700/60 text-xs">
                            <div className="flex items-center gap-2.5">
                              <span className="text-money-500"><Icons.Shield /></span>
                              <div>
                                <p className="font-semibold text-slate-800 dark:text-white">{p.deviceName}</p>
                                <p className="text-[10px] text-slate-400 dark:text-shark-400">
                                  Enrolled on {new Date(p.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemovePasskey(p.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                              title="Remove Passkey"
                            >
                              <Icons.Trash />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-px bg-slate-200 dark:bg-shark-700 my-4"></div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveSettings}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all shadow-lg ${settingsSuccess ? 'bg-green-600 shadow-green-900/30' : 'bg-money-600 hover:bg-money-500 shadow-money-900/30'}`}
                  >
                    {settingsSuccess ? <Icons.Check /> : <Icons.Save />}
                    <span>{settingsSuccess ? 'Settings Saved!' : 'Save Changes'}</span>
                  </button>
                </div>

                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl p-5 mt-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-red-600 dark:text-red-400">Danger Zone</h3>
                      <p className="text-sm text-slate-500 dark:text-shark-400">Reset all application data to default state.</p>
                    </div>
                    <button
                      onClick={handleResetRequest}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50 transition-colors"
                    >
                      <Icons.Refresh />
                      <span>Reset Data</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* USER MANUAL */}
              <div className="bg-white dark:bg-shark-800 rounded-2xl border border-slate-200 dark:border-shark-700 p-6 shadow-xl shadow-slate-200/50 dark:shadow-none transition-colors duration-300 mt-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Icons.FileText /> User Manual
                </h2>
                <div className="space-y-4 text-sm text-slate-600 dark:text-shark-300">
                  <div className="p-3 bg-slate-50 dark:bg-shark-900 rounded-lg border border-slate-200 dark:border-shark-700">
                    <strong className="block text-shark-800 dark:text-white mb-1">1. Dashboard Overview</strong>
                    View total deployed capital, accrued interest, and list of all active loans. Use the search bar to find specific debts.
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-shark-900 rounded-lg border border-slate-200 dark:border-shark-700">
                    <strong className="block text-shark-800 dark:text-white mb-1">2. Creating Entries</strong>
                    You can manually input loan details or use the <strong>Scan Receipt</strong> feature. Scanning uploads the image temporarily for analysis, extracts the data, and then deletes the image for privacy.
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-shark-900 rounded-lg border border-slate-200 dark:border-shark-700">
                    <strong className="block text-shark-800 dark:text-white mb-1">3. Managing Customers</strong>
                    The "Loans & Customers" view lists all active clients. Deleting a loan removes it from the database permanently.
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-shark-900 rounded-lg border border-slate-200 dark:border-shark-700">
                    <strong className="block text-shark-800 dark:text-white mb-1">4. Global Settings</strong>
                    Configure default interest rates here. "Initial Interest" is the upfront fee (vig), and "Monthly Compounding" applies every 30 days thereafter.
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Bottom Navigation Bar for Mobile */}
      <nav className={`md:hidden fixed bottom-4 left-4 right-4 h-16 bg-white/90 dark:bg-shark-950/90 backdrop-blur-lg border border-slate-200/80 dark:border-shark-800/80 rounded-2xl flex items-center justify-around z-30 px-2 shadow-2xl transition-all duration-300 ${isMenuOpen ? 'translate-y-24 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
        {/* Overview */}
        <button
          onClick={() => setView('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-300 ${
            view === 'dashboard' 
              ? 'text-money-600 dark:text-money-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]' 
              : 'text-slate-500 dark:text-shark-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Icons.TrendingUp />
          <span className="text-[10px] mt-1 font-medium">Overview</span>
        </button>

        {/* Loans */}
        <button
          onClick={() => setView('loans')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-300 ${
            view === 'loans' 
              ? 'text-money-600 dark:text-money-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]' 
              : 'text-slate-500 dark:text-shark-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Icons.Users />
          <span className="text-[10px] mt-1 font-medium">Loans</span>
        </button>

        {/* New Entry */}
        <button
          onClick={() => setView('entry')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-300 ${
            view === 'entry' 
              ? 'text-money-600 dark:text-money-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]' 
              : 'text-slate-500 dark:text-shark-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Icons.Plus />
          <span className="text-[10px] mt-1 font-medium">New Entry</span>
        </button>

        {/* Settings */}
        <button
          onClick={() => setView('settings')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-all duration-300 ${
            view === 'settings' 
              ? 'text-money-600 dark:text-money-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]' 
              : 'text-slate-500 dark:text-shark-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Icons.Settings />
          <span className="text-[10px] mt-1 font-medium">Settings</span>
        </button>
      </nav>

      {/* iOS PWA INSTALL INSTRUCTIONS MODAL */}
      {showIosInstallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-shark-900 border border-slate-200 dark:border-shark-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-money-500/20 text-money-600 dark:text-money-400 flex items-center justify-center mx-auto shadow-inner">
              <Icons.Smartphone />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Install on iPhone / iPad</h3>
              <p className="text-xs text-slate-500 dark:text-shark-400 mt-1">Install Money Shark as a native full-screen app on your home screen.</p>
            </div>

            <div className="space-y-3 text-left bg-slate-50 dark:bg-shark-800/60 p-4 rounded-2xl border border-slate-200 dark:border-shark-700 text-xs">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-money-500/20 text-money-600 dark:text-money-400 font-bold flex items-center justify-center shrink-0">1</span>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Tap the Share Button</p>
                  <p className="text-slate-500 dark:text-shark-400">At the bottom bar in Safari, tap the <strong>Share</strong> icon (square with arrow pointing up).</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-money-500/20 text-money-600 dark:text-money-400 font-bold flex items-center justify-center shrink-0">2</span>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Add to Home Screen</p>
                  <p className="text-slate-500 dark:text-shark-400">Scroll down the menu and tap <strong>"Add to Home Screen"</strong>.</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosInstallModal(false)}
              className="w-full py-3 bg-money-600 hover:bg-money-500 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-money-900/30"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
}