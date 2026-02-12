import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

import { Customer, Loan, InterestType, AppSettings } from './types';
import { calculateLoanDetails, formatCurrency, formatDate } from './utils/calculations';
import {
  authStore,
  createLoan,
  deleteLoan as deleteLoanById,
  getBootstrap,
  getMe,
  login,
  logout,
  refreshToken,
  register,
  resetAllData,
  saveSettings,
} from './utils/api';

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
  Save: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
};

const DEFAULT_SETTINGS: AppSettings = {
  globalInitialInterestRate: 50,
  globalInterestRate: 30,
  globalCompoundMonthly: true,
};


// Data source is the local API backend.

export default function App() {
  const [view, setView] = useState<'dashboard' | 'loans' | 'entry' | 'settings'>('dashboard');
  const [entryMode, setEntryMode] = useState<'manual' | 'scan'>('manual');

  // Theme & Menu State
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(true);

  // Reset Confirmation State
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetPinInput, setResetPinInput] = useState('');
  const [resetError, setResetError] = useState('');

  // App Data State
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial Auth + Data Fetch
  useEffect(() => {
    bootstrapApp();
  }, []);

  const bootstrapApp = async () => {
    setLoading(true);
    setAuthLoading(true);
    try {
      if (!authStore.getAccessToken()) {
        const refreshed = await refreshToken();
        if (!refreshed) {
          setIsAuthenticated(false);
          return;
        }
      }

      await getMe();
      setIsAuthenticated(true);
      await fetchData();
    } catch {
      authStore.clear();
      setIsAuthenticated(false);
    } finally {
      setAuthLoading(false);
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const data = await getBootstrap();
      setSettings(data.settings);
      setTempSettings(data.settings);
      setCustomers(data.customers);
      setLoans(data.loans);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

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

  // Scanner State
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanClarification, setScanClarification] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Apply Theme Effect
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
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setAuthError('');

    try {
      if (isRegisterMode) {
        await register({ name: authName, email: authEmail, password: authPassword });
      } else {
        await login({ email: authEmail, password: authPassword });
      }
      setIsAuthenticated(true);
      await fetchData();
      setAuthPassword('');
      setAuthEmail('');
      setAuthName('');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Authentication failed');
      setAuthPassword('');
    }
  };

  const handleLogout = async () => {
    await logout();
    setIsAuthenticated(false);
    setIsMenuOpen(false);
    setCustomers([]);
    setLoans([]);
    setSettings(DEFAULT_SETTINGS);
    setTempSettings(DEFAULT_SETTINGS);
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

      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save settings", err);
      alert("Failed to save settings to database.");
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

  // --- Gemini & Image Handling ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

    // AI Logic (Dormant)
    try {
      // @ts-ignore
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "YOUR_API_KEY_HERE";
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `Analyze this image for loan/debt information. 
      Extract: customer name, principal amount, date of transaction.
      Return JSON only.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
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
              clarification: { type: Type.STRING }
            }
          }
        }
      });

      // Fix: response.text might be a string in this SDK version
      const textVal = typeof response.text === 'function' ? response.text() : response.text;
      const result = JSON.parse(textVal as string);

      // Populate Form
      setFormData(prev => ({
        ...prev,
        customerName: result.customerName || '',
        principal: result.amount || 0,
        startDate: result.date || new Date().toISOString().split('T')[0],
        initialInterestRate: settings.globalInitialInterestRate,
        interestRate: settings.globalInterestRate,
        isFixedRate: true,
        notes: `Scanned entry.`
      }));
      setScanClarification(result.clarification);
      setEntryMode('manual');

    } catch (error) {
      console.error("AI Error:", error);
      setScanClarification("Failed to analyze image. Please enter details manually.");
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
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-shark-900 text-white font-sans">
        <div className="text-sm text-shark-300">Loading secure workspace...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-shark-900 text-white font-sans">
        <div className="w-full max-w-md p-8 bg-shark-800 rounded-3xl shadow-2xl border border-shark-700 mx-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              <span className="text-money-500">Money</span>-Shark
            </h1>
            <p className="text-shark-400 text-sm uppercase tracking-widest">Secure Access</p>
          </div>

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
              <label className="block text-xs font-bold text-shark-500 uppercase mb-2">Password</label>
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••••"
                className="w-full bg-shark-900 border border-shark-600 rounded-xl p-4 text-white focus:border-money-500 outline-none transition-colors"
                required
              />
            </div>

            {authError && (
              <div className="text-red-400 text-sm text-center bg-red-900/20 p-2 rounded-lg border border-red-900/50">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-money-600 hover:bg-money-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-money-900/20 transition-all flex items-center justify-center gap-2"
            >
              <Icons.Unlock /> {isRegisterMode ? 'Create Account' : 'Access System'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode((prev) => !prev);
                setAuthError('');
              }}
              className="text-money-500 hover:text-money-400"
            >
              {isRegisterMode ? 'Already have an account? Sign in' : 'No account? Create one'}
            </button>
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
      </header>

      {/* SIDEBAR DRAWER - COLLAPSIBLE MENU */}
      <div
        className={`fixed inset-y-0 left-0 w-72 bg-white dark:bg-shark-900 border-r border-slate-200 dark:border-shark-800 z-30 transform transition-transform duration-300 ease-in-out shadow-2xl flex flex-col ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="h-16 flex items-center px-4 border-b border-slate-200 dark:border-shark-800">
          <h2 className="text-sm font-bold text-slate-400 dark:text-shark-500 uppercase tracking-widest">Navigation</h2>
          <button onClick={toggleMenu} className="ml-auto p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white">
            <Icons.X />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-6">
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
                <div className={`w-10 h-5 rounded-full relative transition-colors ${formData.isFixedRate ? 'bg-money-600' : 'bg-slate-300 dark:bg-shark-600'}`}>
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${formData.isFixedRate ? 'left-6' : 'left-1'}`}></div>
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
        <div onClick={toggleMenu} className="fixed inset-0 bg-black/50 z-20 backdrop-blur-sm transition-opacity"></div>
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
      <div className="flex-1 overflow-auto pt-16 relative">
        <div className="p-6 max-w-6xl mx-auto space-y-8">

          {/* VIEW: DASHBOARD */}
          {view === 'dashboard' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-shark-800 p-6 rounded-2xl border border-slate-200 dark:border-shark-700 shadow-xl shadow-slate-200/50 dark:shadow-none transition-colors duration-300">
                  <h3 className="text-slate-400 dark:text-shark-400 text-sm font-medium uppercase tracking-wider mb-2">Total Deployed</h3>
                  <div className="text-3xl font-bold text-slate-900 dark:text-white">{formatCurrency(totalPrincipal)}</div>
                </div>
                <div className="bg-white dark:bg-shark-800 p-6 rounded-2xl border border-slate-200 dark:border-shark-700 shadow-xl shadow-slate-200/50 dark:shadow-none transition-colors duration-300">
                  <h3 className="text-slate-400 dark:text-shark-400 text-sm font-medium uppercase tracking-wider mb-2">Accrued Interest</h3>
                  <div className="text-3xl font-bold text-money-600 dark:text-money-500">+{formatCurrency(totalInterest)}</div>
                  <div className="text-xs text-slate-400 dark:text-shark-500 mt-1">Based on current rates</div>
                </div>
                <div className="bg-white dark:bg-shark-800 p-6 rounded-2xl border border-slate-200 dark:border-shark-700 shadow-xl shadow-slate-200/50 dark:shadow-none transition-colors duration-300">
                  <h3 className="text-slate-400 dark:text-shark-400 text-sm font-medium uppercase tracking-wider mb-2">Total Value</h3>
                  <div className="text-3xl font-bold text-slate-900 dark:text-white">{formatCurrency(totalValue)}</div>
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
                      <div key={loan.id} className="bg-white dark:bg-shark-800 p-5 rounded-xl border border-slate-200 dark:border-shark-700 flex flex-col md:flex-row md:items-center justify-between hover:border-money-500 dark:hover:border-shark-600 transition-colors shadow-sm">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{getCustomerName(loan.customerId)}</h3>
                            <span className="text-xs bg-slate-100 dark:bg-shark-900 text-slate-500 dark:text-shark-400 px-2 py-1 rounded border border-slate-200 dark:border-shark-700">
                              {activeMonthlyRate}%/mo
                            </span>
                          </div>
                          <div className="text-sm text-slate-500 dark:text-shark-400">
                            Started {formatDate(loan.startDate)} • Initial: {activeInitialRate}%
                          </div>
                        </div>

                        <div className="flex items-center gap-8 mt-4 md:mt-0">
                          <div className="text-right">
                            <div className="text-xs text-slate-400 dark:text-shark-500 uppercase">Principal</div>
                            <div className="text-slate-600 dark:text-shark-300 font-mono">{formatCurrency(loan.principal)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-slate-400 dark:text-shark-500 uppercase">Interest</div>
                            <div className="text-money-600 dark:text-money-500 font-mono font-bold">+{formatCurrency(calc.interestAccrued)}</div>
                          </div>
                          <div className="text-right border-l border-slate-200 dark:border-shark-700 pl-6">
                            <div className="text-xs text-slate-400 dark:text-shark-500 uppercase">Total Due</div>
                            <div className="text-xl font-bold text-slate-900 dark:text-white font-mono">{formatCurrency(calc.totalAmount)}</div>
                          </div>
                          <button onClick={() => deleteLoan(loan.id)} className="text-slate-400 hover:text-red-500 dark:text-shark-600 dark:hover:text-red-400 transition-colors">
                            <Icons.Trash />
                          </button>
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
                {/* AI Scan Temporarily Disabled */}
                {/* <button 
                  onClick={() => setEntryMode('scan')}
                  className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-colors ${entryMode === 'scan' ? 'bg-shark-600 text-white' : 'text-slate-500 hover:text-slate-900 dark:text-shark-400 dark:hover:text-white'}`}
                >
                  <Icons.Camera /> Scan Receipt
                </button> */}
              </div>

              {/* Mode: Scan Upload */}
              {entryMode === 'scan' && (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white dark:bg-shark-800 border-2 border-dashed border-slate-300 dark:border-shark-600 hover:border-money-500 dark:hover:border-money-500 hover:bg-slate-50 dark:hover:bg-shark-700 transition-all cursor-pointer rounded-2xl p-12 text-center mb-6"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileUpload}
                  />
                  <div className="w-16 h-16 bg-slate-100 dark:bg-shark-900 rounded-full flex items-center justify-center mx-auto mb-4 text-money-600 dark:text-money-500">
                    {isAnalyzing ? <div className="animate-spin w-8 h-8 border-4 border-money-500 border-t-transparent rounded-full"></div> : <Icons.Camera />}
                  </div>
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white">{isAnalyzing ? 'Analyzing...' : 'Click to Upload Image'}</h3>
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
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Scanned Data</h4>
                        <p className="text-xs text-slate-500 dark:text-shark-400 mb-2">The form has been pre-filled from your image.</p>
                        {scanClarification && (
                          <div className="text-xs text-orange-600 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/20 p-2 rounded border border-orange-200 dark:border-orange-900/50">
                            <strong>AI Note:</strong> {scanClarification}
                          </div>
                        )}
                        <button onClick={() => { setScannedImage(null); setEntryMode('scan'); }} className="text-xs text-money-600 dark:text-money-500 hover:underline mt-2">Scan different image</button>
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
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${tempSettings.globalCompoundMonthly ? 'left-7' : 'left-1'}`}></div>
                  </button>
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
    </div>
  );
}