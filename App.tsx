import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { useQuery, useMutation } from 'convex/react';
import { api } from './convex/_generated/api';

import { Customer, Loan, InterestType, AppSettings, UserPasskey, Repayment } from './types';
import {
  isBiometricSupported,
  registerDevicePasskey,
  authenticateWithBiometrics,
  saveLocalBiometricState,
  getLocalBiometricState,
} from './utils/webauthn';
import { calculateLoanDetails, formatCurrency, formatDate, LoanCalculations } from './utils/calculations';
import {
  createLoan,
  deleteLoan as deleteLoanById,
  resetAllData,
  saveSettings,
  updateLoanStatus,
  seedDemoData,
  recordPayment,
  deletePayment as deletePaymentById,
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
import { PaymentModal } from './components/PaymentModal';
import { PortfolioAnalytics } from './components/PortfolioAnalytics';
import { DuplicateCustomerModal } from './components/DuplicateCustomerModal';
import { exportPortfolioToCsv } from './utils/exportCsv';


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
  MapPin: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>,
  User: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  UserPlus: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>,
  Edit: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>,
  Phone: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  Image: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>,
  Eye: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>,
  Download: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  ZoomIn: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>,
  HelpCircle: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Lightbulb: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>,
  Archive: () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg>,
  Undo: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>,
  Clock: () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
};

// Helper: Extract uppercase initials from customer name
function getCustomerInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Helper: Deterministic gradient for avatar fallback
function getAvatarGradient(name: string): string {
  const gradients = [
    'from-emerald-500 to-teal-700',
    'from-blue-500 to-indigo-700',
    'from-purple-500 to-pink-700',
    'from-amber-500 to-orange-700',
    'from-cyan-500 to-blue-700',
    'from-rose-500 to-red-700',
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

// Fast on-device client image compression to keep database and local cache ultra-fast
function compressImage(fileOrDataUrl: File | string, maxWidth = 360, maxHeight = 360, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context not available'));
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = (e) => reject(e);

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}

// Customer Profile Avatar Component
interface CustomerAvatarProps {
  customer?: { name?: string; avatar?: string; address?: string };
  name?: string;
  avatar?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  showHoverZoom?: boolean;
}

function CustomerAvatar({ customer, name, avatar, size = 'md', className = '', onClick, showHoverZoom = false }: CustomerAvatarProps) {
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-24 h-24 text-3xl',
    '3xl': 'w-32 h-32 text-4xl',
  }[size];

  const displayName = name || customer?.name || 'Customer';
  const displayAvatar = avatar !== undefined ? avatar : customer?.avatar;
  const initials = getCustomerInitials(displayName);
  const gradient = getAvatarGradient(displayName);
  const hasImage = Boolean(displayAvatar && displayAvatar.trim() !== '');

  if (hasImage) {
    return (
      <div
        onClick={onClick}
        title={onClick ? `View ${displayName}'s profile picture` : displayName}
        className={`relative group/avatar inline-block shrink-0 rounded-full overflow-hidden ${onClick ? 'cursor-pointer' : ''} ${className}`}
      >
        <img
          src={displayAvatar}
          alt={displayName}
          className={`${sizeClasses} rounded-full object-cover border-2 border-money-500/40 shadow-sm transition-transform duration-200 group-hover/avatar:scale-105`}
        />
        {showHoverZoom && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center rounded-full text-white backdrop-blur-[1px]">
            <Icons.Eye />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      title={onClick ? `View ${displayName}'s profile` : displayName}
      className={`${sizeClasses} rounded-full bg-gradient-to-br ${gradient} text-white font-bold flex items-center justify-center shadow-sm shrink-0 select-none border border-white/20 ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''} ${className}`}
    >
      {initials}
    </div>
  );
}

const DEFAULT_SETTINGS: AppSettings = {
  globalInitialInterestRate: 50,
  globalInterestRate: 30,
  globalCompoundMonthly: true,
  isBiometricLockEnabled: false,
  showHints: true,
};


// Data source is the local API backend.

export default function App() {
  const [view, setView] = useState<'dashboard' | 'loans' | 'entry' | 'settings' | 'trash'>('dashboard');
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
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [paymentModalLoan, setPaymentModalLoan] = useState<Loan | null>(null);
  const [loanFilterTab, setLoanFilterTab] = useState<'ALL' | 'GRACE' | 'COMPOUNDING' | 'OVERDUE'>('ALL');
  const [loanSortBy, setLoanSortBy] = useState<'BALANCE_DESC' | 'DUE_SOONEST' | 'NEWEST' | 'NAME'>('BALANCE_DESC');
  const [loading, setLoading] = useState(true);
  const [isDeviceHydrated, setIsDeviceHydrated] = useState(false);
  const liveData = useQuery(api.bootstrap.get, isAuthenticated ? undefined : "skip");

  // Passkeys & Biometric Security State
  const passkeysList = useQuery(api.passkeys.list, isAuthenticated ? undefined : "skip");
  const savePasskeyMutation = useMutation(api.passkeys.savePasskey);
  const removePasskeyMutation = useMutation(api.passkeys.removePasskey);

  // Customer Management Mutations
  const saveCustomerMutation = useMutation(api.customers.saveCustomer);
  const deleteCustomerMutation = useMutation(api.customers.deleteCustomer);

  // 30-Day Cloud Data Recovery & Trash Vault
  const trashData = useQuery(api.trash.listTrash, isAuthenticated ? undefined : "skip");
  const restoreLoanMutation = useMutation(api.trash.restoreLoan);
  const restoreCustomerMutation = useMutation(api.trash.restoreCustomer);
  const restoreAllTrashMutation = useMutation(api.trash.restoreAll);
  const emptyTrashMutation = useMutation(api.trash.emptyTrash);
  const permanentlyDeleteLoanMutation = useMutation(api.trash.permanentlyDeleteLoan);
  const permanentlyDeleteCustomerMutation = useMutation(api.trash.permanentlyDeleteCustomer);
  const [trashActionStatus, setTrashActionStatus] = useState('');
  const [isRestoringTrash, setIsRestoringTrash] = useState(false);

  // Interactive Hint & Walkthrough System State
  const [showWalkthroughModal, setShowWalkthroughModal] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState(0);
  const [dismissedDashboardHint, setDismissedDashboardHint] = useState(false);

  // Customer Management Modal State
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<{
    id?: string;
    name: string;
    address: string;
    avatar: string;
    phone: string;
    notes: string;
  }>({
    name: '',
    address: '',
    avatar: '',
    phone: '',
    notes: '',
  });
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [customerModalError, setCustomerModalError] = useState('');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');

  // Customer Profile Photo Lightbox Viewer State
  const [viewingPhotoCustomer, setViewingPhotoCustomer] = useState<{
    name: string;
    avatar: string;
    address?: string;
    phone?: string;
    id?: string;
  } | null>(null);

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
  const [showBiometricOnboardingModal, setShowBiometricOnboardingModal] = useState(false);

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

  // Prompt user to enable biometrics upon registration or entry
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isAuthenticated && isDeviceBiometricAvailable) {
      const justRegistered = sessionStorage.getItem('ms_just_registered') === 'true';
      const dismissed = localStorage.getItem('ms_biometric_prompt_dismissed') === 'true';
      const hasPasskey = getLocalBiometricState().enabled || (passkeysList && passkeysList.length > 0);

      if ((justRegistered || !dismissed) && !hasPasskey && !settings.isBiometricLockEnabled) {
        setShowBiometricOnboardingModal(true);
      }
    }
  }, [isAuthenticated, isDeviceBiometricAvailable, passkeysList, settings.isBiometricLockEnabled]);

  const handleDismissBiometricOnboarding = () => {
    setShowBiometricOnboardingModal(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ms_biometric_prompt_dismissed', 'true');
      sessionStorage.removeItem('ms_just_registered');
    }
  };

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
          if (cached.repayments?.length) setRepayments(cached.repayments);
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
      const liveRepayments = (liveData as any).repayments || [];
      setRepayments(liveRepayments);
      setLoading(false);

      // Cache snapshot to on-device IndexedDB
      saveCachedSnapshot({
        settings: liveData.settings,
        customers: liveData.customers,
        loans: liveData.loans as any[],
        repayments: liveRepayments,
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
    customerAddress: '',
    customerAvatar: '',
    customerPhone: '',
    principal: '' as any,
    initialInterestRate: DEFAULT_SETTINGS.globalInitialInterestRate as any,
    interestRate: DEFAULT_SETTINGS.globalInterestRate as any,
    startDate: new Date().toISOString().split('T')[0],
    interestType: InterestType.COMPOUND,
    isFixedRate: true,
    notes: ''
  });

  // Customer selection mode for new loan entry: 'existing' profile vs 'new' profile
  const [entryCustomerMode, setEntryCustomerMode] = useState<'existing' | 'new'>('new');
  const [selectedExistingCustomerId, setSelectedExistingCustomerId] = useState<string | null>(null);
  const [customerPickerSearch, setCustomerPickerSearch] = useState('');

  // Duplicate profile detection prompt modal
  const [duplicateCustomerPrompt, setDuplicateCustomerPrompt] = useState<{
    matchingCustomer: Customer;
    loanPayload: any;
  } | null>(null);

  // Scanner & Live Camera State
  // Camera Purpose: 'ocr_scan' (invokes Gemini AI) vs 'customer_avatar_form' | 'customer_avatar_modal' (Zero AI)
  const [cameraPurpose, setCameraPurpose] = useState<'ocr_scan' | 'customer_avatar_form' | 'customer_avatar_modal'>('ocr_scan');
  const [scannedImage, setScannedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanClarification, setScanClarification] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const formAvatarFileInputRef = useRef<HTMLInputElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // 3. Debounced Draft Auto-Save to IndexedDB
  useEffect(() => {
    if (!isDeviceHydrated) return;
    if (formData.customerName || formData.principal || formData.notes || scannedImage || formData.customerAddress) {
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
  const [iosInstallTab, setIosInstallTab] = useState<'profile' | 'safari'>('profile');

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

  const formatAuthError = (error: any, flow: 'signIn' | 'signUp' | 'otp-verify' | 'reset' | 'reset-verify' | 'oauth'): string => {
    const raw = (error?.message || (typeof error === 'string' ? error : '')).toString();
    const lower = raw.toLowerCase();

    // 1. Sign-in error (unregistered user, wrong email, wrong password, or Convex Server Error)
    if (flow === 'signIn') {
      if (
        lower.includes('invalid credentials') ||
        lower.includes('server error') ||
        lower.includes('called by client') ||
        lower.includes('could not find') ||
        lower.includes('not found') ||
        lower.includes('auth:signin') ||
        lower.includes('unauthorized') ||
        lower.includes('password') ||
        lower.includes('account') ||
        lower.includes('user')
      ) {
        return 'Account not found or password incorrect. If you are a new user, please click "Create one" below.';
      }
      return 'Invalid email or password. Please verify your credentials or create an account.';
    }

    // 2. Sign-up registration error (user already exists)
    if (flow === 'signUp') {
      if (
        lower.includes('already exists') ||
        lower.includes('duplicate') ||
        lower.includes('server error') ||
        lower.includes('account already')
      ) {
        return 'An account with this email already exists. Please sign in instead.';
      }
      if (lower.includes('invalid password') || lower.includes('short') || lower.includes('length')) {
        return 'Password must be at least 8 characters long.';
      }
      return 'Could not complete registration. Please check your email and password requirements.';
    }

    // 3. 6-digit OTP verification error
    if (flow === 'otp-verify') {
      if (
        lower.includes('invalid code') ||
        lower.includes('could not verify') ||
        lower.includes('server error') ||
        lower.includes('expired') ||
        lower.includes('called by client')
      ) {
        return 'Invalid or expired 6-digit code. Please verify the code in your email or click Resend.';
      }
      return 'Verification code is invalid. Please try again or request a new code.';
    }

    // 4. Password recovery reset errors
    if (flow === 'reset') {
      if (lower.includes('not found') || lower.includes('server error') || lower.includes('invalid') || lower.includes('called by client')) {
        return 'No account found with this email. Please check the spelling or register a new account.';
      }
      return 'Unable to send reset code. Please check your email address.';
    }

    if (flow === 'reset-verify') {
      if (lower.includes('invalid code') || lower.includes('server error') || lower.includes('called by client')) {
        return 'Invalid reset code. Please check your email or request a new code.';
      }
      return 'Could not reset password. Please try requesting a new reset code.';
    }

    // 5. OAuth
    if (flow === 'oauth') {
      return 'Sign in with provider failed or was canceled. Please try again.';
    }

    // 6. Network & Rate Limiting
    if (lower.includes('rate limit') || lower.includes('too many')) {
      return 'Too many attempts. Please wait a moment before trying again.';
    }
    if (lower.includes('failed to fetch') || lower.includes('network') || lower.includes('offline')) {
      return 'Network connection issue. Please check your internet connection and retry.';
    }

    return raw && !raw.includes('CONVEX') && !raw.includes('Server Error')
      ? raw
      : 'Authentication request failed. Please check your credentials and try again.';
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
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('ms_just_registered', 'true');
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
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('ms_just_registered', 'true');
        }
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
      const flow = authStep === 'otp-verify'
        ? 'otp-verify'
        : authStep === 'reset-verify'
        ? 'reset-verify'
        : isRegisterMode
        ? 'signUp'
        : 'signIn';
      setAuthError(formatAuthError(error, flow));
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
      setAuthError(formatAuthError(err, 'signIn'));
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
      setAuthError(formatAuthError(err, isRegisterMode ? 'signUp' : 'signIn'));
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
      setAuthError(formatAuthError(err, 'reset'));
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
      setAuthError(formatAuthError(err, 'oauth'));
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
        setShowBiometricOnboardingModal(false);
        if (typeof window !== 'undefined') {
          localStorage.setItem('ms_biometric_prompt_dismissed', 'true');
          sessionStorage.removeItem('ms_just_registered');
        }
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

  // --- Customer & Loan Helpers ---
  const getCustomer = (id: string): Customer | undefined => customers.find(c => c.id === id);
  const getCustomerName = (id: string) => getCustomer(id)?.name || 'Unknown';

  const handleSelectExistingCustomerForLoan = (customerId: string) => {
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) return;
    setSelectedExistingCustomerId(cust.id);
    setEntryCustomerMode('existing');
    setFormData((prev) => ({
      ...prev,
      customerName: cust.name,
      customerAddress: cust.address || '',
      customerAvatar: cust.avatar || '',
      customerPhone: cust.phone || '',
      principal: '',
      startDate: new Date().toISOString().split('T')[0],
      notes: '',
    }));
    setView('entry');
    setEntryMode('manual');
  };

  const handleClearSelectedCustomerForLoan = () => {
    setSelectedExistingCustomerId(null);
    setFormData((prev) => ({
      ...prev,
      customerName: '',
      customerAddress: '',
      customerAvatar: '',
      customerPhone: '',
    }));
  };

  const handleCustomerNameChange = (name: string) => {
    const existing = customers.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
    if (existing) {
      setFormData((prev) => ({
        ...prev,
        customerName: name,
        customerAddress: existing.address || prev.customerAddress,
        customerAvatar: existing.avatar || prev.customerAvatar,
        customerPhone: existing.phone || prev.customerPhone,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        customerName: name,
      }));
    }
  };

  // --- Customer Modal Management Handlers ---
  const handleOpenNewCustomerModal = () => {
    setEditingCustomer({
      name: '',
      address: '',
      avatar: '',
      phone: '',
      notes: '',
    });
    setCustomerModalError('');
    setShowCustomerModal(true);
  };

  const handleOpenEditCustomerModal = (c: Customer) => {
    setEditingCustomer({
      id: c.id,
      name: c.name,
      address: c.address || '',
      avatar: c.avatar || '',
      phone: c.phone || '',
      notes: c.notes || '',
    });
    setCustomerModalError('');
    setShowCustomerModal(true);
  };

  const handleSaveCustomerModal = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editingCustomer.name.trim()) {
      setCustomerModalError('Please enter a customer name.');
      return;
    }

    setIsSavingCustomer(true);
    setCustomerModalError('');
    try {
      const saved = await saveCustomerMutation({
        id: editingCustomer.id as any,
        name: editingCustomer.name.trim(),
        address: editingCustomer.address.trim(),
        avatar: editingCustomer.avatar,
        phone: editingCustomer.phone.trim(),
        notes: editingCustomer.notes.trim(),
      });

      setCustomers((prev) => {
        const idx = prev.findIndex((c) => c.id === saved.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = saved as any;
          return copy;
        }
        return [saved as any, ...prev];
      });

      setShowCustomerModal(false);
    } catch (err: any) {
      console.error('Failed to save customer:', err);
      setCustomerModalError(err.message || 'Could not save customer profile.');
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const handleDeleteCustomer = async (id: string, name: string) => {
    const count = loans.filter((l) => l.customerId === id).length;
    const confirmMsg = count > 0
      ? `Move ${name} and ${count} associated loan(s) to the 30-Day Recovery Vault? (You can recover them anytime within 30 days).`
      : `Move ${name} to the 30-Day Recovery Vault? (You can recover this borrower anytime within 30 days).`;

    if (!confirm(confirmMsg)) return;

    try {
      await deleteCustomerMutation({ id: id as any });
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      setLoans((prev) => prev.filter((l) => l.customerId !== id));
      setTrashActionStatus(`${name} moved to 30-Day Recovery Vault.`);
      setTimeout(() => setTrashActionStatus(''), 4000);
    } catch (err) {
      console.error('Failed to delete customer:', err);
      alert('Could not delete customer.');
    }
  };

  // --- 30-Day Cloud Recovery & Trash Vault Handlers ---
  const handleRestoreLoan = async (id: string) => {
    setIsRestoringTrash(true);
    setTrashActionStatus('');
    try {
      await restoreLoanMutation({ id: id as any });
      setTrashActionStatus('Loan restored back to your active records!');
      setTimeout(() => setTrashActionStatus(''), 3500);
    } catch (err: any) {
      console.error('Failed to restore loan:', err);
      alert('Could not restore loan record.');
    } finally {
      setIsRestoringTrash(false);
    }
  };

  const handleRestoreCustomer = async (id: string) => {
    setIsRestoringTrash(true);
    setTrashActionStatus('');
    try {
      await restoreCustomerMutation({ id: id as any });
      setTrashActionStatus('Borrower & associated loans restored to your active directory!');
      setTimeout(() => setTrashActionStatus(''), 3500);
    } catch (err: any) {
      console.error('Failed to restore customer:', err);
      alert('Could not restore borrower record.');
    } finally {
      setIsRestoringTrash(false);
    }
  };

  const handleRestoreAllTrash = async () => {
    if (!confirm('Restore all deleted records back to your active dashboard?')) return;
    setIsRestoringTrash(true);
    setTrashActionStatus('');
    try {
      await restoreAllTrashMutation();
      setTrashActionStatus('All records have been restored successfully!');
      setTimeout(() => setTrashActionStatus(''), 3500);
    } catch (err: any) {
      console.error('Failed to restore all trash:', err);
      alert('Could not restore records.');
    } finally {
      setIsRestoringTrash(false);
    }
  };

  const handleEmptyTrash = async () => {
    if (!confirm('Are you sure you want to permanently empty the recovery vault? This cannot be undone.')) return;
    try {
      await emptyTrashMutation();
      setTrashActionStatus('Recovery vault emptied.');
      setTimeout(() => setTrashActionStatus(''), 3500);
    } catch (err: any) {
      console.error('Failed to empty recovery vault:', err);
      alert('Could not empty recovery vault.');
    }
  };

  const handlePermanentlyDeleteLoan = async (id: string) => {
    if (!confirm('Permanently delete this loan record from the cloud? This action cannot be undone.')) return;
    try {
      await permanentlyDeleteLoanMutation({ id: id as any });
    } catch (err: any) {
      console.error('Failed to permanently delete loan:', err);
      alert('Could not delete record.');
    }
  };

  const handlePermanentlyDeleteCustomer = async (id: string) => {
    if (!confirm('Permanently delete this borrower and their loan history? This action cannot be undone.')) return;
    try {
      await permanentlyDeleteCustomerMutation({ id: id as any });
    } catch (err: any) {
      console.error('Failed to permanently delete customer:', err);
      alert('Could not delete borrower.');
    }
  };

  // --- Interactive Hint & Walkthrough Preference Handler ---
  const handleToggleHints = async (enable: boolean) => {
    const updated = { ...settings, showHints: enable };
    setSettings(updated);
    setTempSettings(prev => ({ ...prev, showHints: enable }));
    try {
      await saveSettings(updated);
    } catch (err) {
      console.error('Failed to update hint preference:', err);
    }
  };

  // Avatar file selection from device gallery (strictly zero AI usage)
  const handleFormAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 320, 320, 0.85);
      setFormData((prev) => ({ ...prev, customerAvatar: compressed }));
    } catch (err) {
      console.warn('Avatar compression failed:', err);
    }
  };

  const handleModalAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 320, 320, 0.85);
      setEditingCustomer((prev) => ({ ...prev, avatar: compressed }));
    } catch (err) {
      console.warn('Avatar compression failed:', err);
    }
  };

  // --- Payment Handlers ---
  const handleRecordPayment = async (data: {
    loanId: string;
    amount: number;
    paymentDate: string;
    notes: string;
  }) => {
    try {
      const res = await recordPayment({
        loanId: data.loanId,
        amount: data.amount,
        paymentDate: data.paymentDate,
        notes: data.notes,
      });

      const newRepayment: Repayment = {
        id: res.id || `repay_${Date.now()}`,
        loanId: data.loanId,
        customerId: res.customerId || '',
        amount: data.amount,
        paymentDate: data.paymentDate,
        notes: data.notes,
        createdAt: Date.now(),
      };

      const updatedRepayments = [newRepayment, ...repayments.filter((r) => r.id !== newRepayment.id)];
      setRepayments(updatedRepayments);

      let updatedLoans = loans;
      if (res.isFullyPaid) {
        updatedLoans = loans.map((l) => (l.id === data.loanId ? { ...l, status: 'PAID' as const } : l));
        setLoans(updatedLoans);
      }

      saveCachedSnapshot({
        settings,
        customers,
        loans: updatedLoans,
        repayments: updatedRepayments,
      }).catch(() => {});
    } catch (err: any) {
      console.error('Failed to record payment:', err);
      throw err;
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      await deletePaymentById(paymentId);
      const targetRepayment = repayments.find((r) => r.id === paymentId);
      const updatedRepayments = repayments.filter((r) => r.id !== paymentId);
      setRepayments(updatedRepayments);

      let updatedLoans = loans;
      if (targetRepayment) {
        const targetLoan = loans.find((l) => l.id === targetRepayment.loanId);
        if (targetLoan && targetLoan.status === 'PAID') {
          const calc = calculateLoanDetails(
            targetLoan,
            settings.globalInitialInterestRate,
            settings.globalInterestRate,
            updatedRepayments
          );
          if (calc.remainingBalance > 0.01) {
            updatedLoans = loans.map((l) => (l.id === targetLoan.id ? { ...l, status: 'ACTIVE' as const } : l));
            setLoans(updatedLoans);
            updateLoanStatus(targetLoan.id, 'ACTIVE').catch(() => {});
          }
        }
      }

      saveCachedSnapshot({
        settings,
        customers,
        loans: updatedLoans,
        repayments: updatedRepayments,
      }).catch(() => {});
    } catch (err: any) {
      console.error('Failed to delete payment:', err);
      throw err;
    }
  };

  // --- Calculations ---
  const activeLoans = loans.filter((l) => l.status === 'ACTIVE');
  const totalPrincipal = activeLoans.reduce((sum, l) => sum + l.principal, 0);

  const loanCalculations = activeLoans.map((l) => {
    return calculateLoanDetails(l, settings.globalInitialInterestRate, settings.globalInterestRate, repayments);
  });

  const totalInterest = loanCalculations.reduce((sum, c) => sum + c.interestAccrued, 0);
  const totalValue = totalPrincipal + totalInterest;

  // Filter & Sort Active Loans based on Search Term, Risk Tab, and Sort Order
  const filteredActiveLoans = activeLoans
    .filter((loan) => {
      const calc = calculateLoanDetails(
        loan,
        settings.globalInitialInterestRate,
        settings.globalInterestRate,
        repayments
      );

      // Filter Tab logic
      if (loanFilterTab === 'GRACE' && calc.riskCategory !== 'GRACE_PERIOD') return false;
      if (loanFilterTab === 'COMPOUNDING' && calc.riskCategory !== 'COMPOUNDING_1') return false;
      if (loanFilterTab === 'OVERDUE' && calc.riskCategory !== 'OVERDUE_HIGH_RISK') return false;

      // Search term logic
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      const customer = getCustomer(loan.customerId);
      const customerName = (customer?.name || '').toLowerCase();
      const customerAddress = (customer?.address || '').toLowerCase();
      const dateRaw = loan.startDate;
      const dateFormatted = formatDate(loan.startDate).toLowerCase();
      return (
        customerName.includes(term) ||
        customerAddress.includes(term) ||
        dateRaw.includes(term) ||
        dateFormatted.includes(term)
      );
    })
    .sort((a, b) => {
      const calcA = calculateLoanDetails(a, settings.globalInitialInterestRate, settings.globalInterestRate, repayments);
      const calcB = calculateLoanDetails(b, settings.globalInitialInterestRate, settings.globalInterestRate, repayments);

      if (loanSortBy === 'BALANCE_DESC') {
        return calcB.remainingBalance - calcA.remainingBalance;
      }
      if (loanSortBy === 'DUE_SOONEST') {
        return calcA.daysUntilNextCycle - calcB.daysUntilNextCycle;
      }
      if (loanSortBy === 'NEWEST') {
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      }
      if (loanSortBy === 'NAME') {
        const nameA = getCustomerName(a.customerId).toLowerCase();
        const nameB = getCustomerName(b.customerId).toLowerCase();
        return nameA.localeCompare(nameB);
      }
      return 0;
    });

  // Group active loans by customer profile so multi-loan borrowers appear under a single profile card
  const groupedActiveCustomers = React.useMemo(() => {
    const groupMap = new Map<string, {
      customerId: string;
      customer: Customer | null;
      loans: Loan[];
      totalRemainingBalance: number;
      totalPrincipal: number;
      totalAccruedInterest: number;
      totalRepaid: number;
      newestStartDate: string;
      mostUrgentDays: number;
    }>();

    filteredActiveLoans.forEach((loan) => {
      const cId = loan.customerId || `unknown_${loan.id}`;
      const calc = calculateLoanDetails(
        loan,
        settings.globalInitialInterestRate,
        settings.globalInterestRate,
        repayments
      );

      if (!groupMap.has(cId)) {
        groupMap.set(cId, {
          customerId: cId,
          customer: getCustomer(loan.customerId) || null,
          loans: [loan],
          totalRemainingBalance: calc.remainingBalance,
          totalPrincipal: loan.principal,
          totalAccruedInterest: calc.interestAccrued,
          totalRepaid: calc.totalRepaid,
          newestStartDate: loan.startDate,
          mostUrgentDays: calc.daysUntilNextCycle,
        });
      } else {
        const entry = groupMap.get(cId)!;
        entry.loans.push(loan);
        entry.totalRemainingBalance += calc.remainingBalance;
        entry.totalPrincipal += loan.principal;
        entry.totalAccruedInterest += calc.interestAccrued;
        entry.totalRepaid += calc.totalRepaid;
        if (loan.startDate > entry.newestStartDate) entry.newestStartDate = loan.startDate;
        if (calc.daysUntilNextCycle < entry.mostUrgentDays) entry.mostUrgentDays = calc.daysUntilNextCycle;
      }
    });

    const groups = Array.from(groupMap.values());

    // Within each customer profile group, sort loans chronologically by start date
    groups.forEach((g) => {
      g.loans.sort((a, b) => a.startDate.localeCompare(b.startDate));
    });

    // Sort customer profile groups according to loanSortBy
    groups.sort((a, b) => {
      if (loanSortBy === 'BALANCE_DESC') {
        return b.totalRemainingBalance - a.totalRemainingBalance;
      }
      if (loanSortBy === 'DUE_SOONEST') {
        return a.mostUrgentDays - b.mostUrgentDays;
      }
      if (loanSortBy === 'NEWEST') {
        return b.newestStartDate.localeCompare(a.newestStartDate);
      }
      if (loanSortBy === 'NAME') {
        const nameA = (a.customer?.name || '').toLowerCase();
        const nameB = (b.customer?.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      }
      return 0;
    });

    return groups;
  }, [filteredActiveLoans, repayments, settings.globalInitialInterestRate, settings.globalInterestRate, loanSortBy, customers]);


  // Filter Customers for Directory View
  const filteredCustomers = customers.filter(c => {
    if (!customerSearchTerm) return true;
    const term = customerSearchTerm.toLowerCase();
    return c.name.toLowerCase().includes(term) || (c.address || '').toLowerCase().includes(term) || (c.phone || '').toLowerCase().includes(term);
  });

  // --- Live Camera & AI Image Handling ---
  const startCamera = async (
    facing: 'environment' | 'user' = cameraFacing,
    purpose: 'ocr_scan' | 'customer_avatar_form' | 'customer_avatar_modal' = 'ocr_scan'
  ) => {
    stopCamera();
    setCameraPurpose(purpose);
    setCameraFacing(facing);
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
    startCamera(next, cameraPurpose);
  };

  const takePhotoSnap = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const rawDataUrl = canvas.toDataURL('image/jpeg', 0.92);

      if (cameraPurpose === 'ocr_scan') {
        // Document OCR scan: calls Gemini AI
        setScannedImage(rawDataUrl);
        stopCamera();
        analyzeImage(rawDataUrl.split(',')[1], 'image/jpeg');
      } else if (cameraPurpose === 'customer_avatar_form') {
        // Profile picture for loan entry form: ZERO AI usage
        try {
          const compressed = await compressImage(rawDataUrl, 320, 320, 0.85);
          setFormData((prev) => ({ ...prev, customerAvatar: compressed }));
        } catch (e) {
          setFormData((prev) => ({ ...prev, customerAvatar: rawDataUrl }));
        }
        stopCamera();
      } else if (cameraPurpose === 'customer_avatar_modal') {
        // Profile picture for customer management modal: ZERO AI usage
        try {
          const compressed = await compressImage(rawDataUrl, 320, 320, 0.85);
          setEditingCustomer((prev) => ({ ...prev, avatar: compressed }));
        } catch (e) {
          setEditingCustomer((prev) => ({ ...prev, avatar: rawDataUrl }));
        }
        stopCamera();
      }
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

  const handleSaveLoan = async (options?: { customerId?: string; forceNewCustomer?: boolean } | React.MouseEvent) => {
    const opts = options && !('nativeEvent' in options) ? (options as { customerId?: string; forceNewCustomer?: boolean }) : undefined;
    if (!formData.customerName || !formData.principal) {
      alert("Please fill in Customer Name and Amount.");
      return;
    }

    // If options not explicitly provided and user is in 'new' profile mode, check if a matching customer profile already exists
    if (!opts && entryCustomerMode === 'new') {
      const trimmedName = formData.customerName.trim().toLowerCase();
      const trimmedPhone = formData.customerPhone ? formData.customerPhone.trim() : '';
      const existingMatch = customers.find(c =>
        c.name.trim().toLowerCase() === trimmedName ||
        (trimmedPhone && c.phone && c.phone.trim() === trimmedPhone)
      );

      if (existingMatch) {
        // Intercept and ask the user if they want to put this loan under the existing profile or create a separate profile!
        const payload = {
          customerName: formData.customerName,
          customerAddress: formData.customerAddress,
          customerAvatar: formData.customerAvatar,
          customerPhone: formData.customerPhone,
          principal: parseFloat(formData.principal),
          initialInterestRate: parseFloat(formData.isFixedRate ? settings.globalInitialInterestRate : formData.initialInterestRate),
          interestRate: parseFloat(formData.isFixedRate ? settings.globalInterestRate : formData.interestRate),
          startDate: formData.startDate,
          interestType: formData.interestType,
          isFixedRate: formData.isFixedRate,
          notes: formData.notes + (scanClarification ? ` [AI Note: ${scanClarification}]` : '')
        };
        setDuplicateCustomerPrompt({
          matchingCustomer: existingMatch,
          loanPayload: payload,
        });
        return;
      }
    }

    setLoading(true);
    try {
      const targetCustomerId = opts?.customerId || (entryCustomerMode === 'existing' ? selectedExistingCustomerId : undefined);
      const isForceNew = opts?.forceNewCustomer || false;

      const loanPayload = {
        customerId: targetCustomerId || undefined,
        forceNewCustomer: isForceNew,
        customerName: formData.customerName,
        customerAddress: formData.customerAddress,
        customerAvatar: formData.customerAvatar,
        customerPhone: formData.customerPhone,
        principal: parseFloat(formData.principal),
        initialInterestRate: parseFloat(formData.isFixedRate ? settings.globalInitialInterestRate : formData.initialInterestRate),
        interestRate: parseFloat(formData.isFixedRate ? settings.globalInterestRate : formData.interestRate),
        startDate: formData.startDate,
        interestType: formData.interestType,
        isFixedRate: formData.isFixedRate,
        notes: formData.notes + (scanClarification ? ` [AI Note: ${scanClarification}]` : '')
      };

      const { customer, loan } = await createLoan(loanPayload);

      setCustomers(prev => {
        const idx = prev.findIndex(c => c.id === customer.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = customer;
          return copy;
        }
        return [customer, ...prev];
      });

      setLoans(prev => [loan, ...prev]);

      // Reset Form & Selection
      setSelectedExistingCustomerId(null);
      setEntryCustomerMode('new');
      setDuplicateCustomerPrompt(null);
      setFormData({
        customerName: '',
        customerAddress: '',
        customerAvatar: '',
        customerPhone: '',
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
    if (!confirm("Move this loan record to the 30-Day Recovery Vault? (You can recover it anytime within 30 days).")) return;
    try {
      await deleteLoanById(id);
      setLoans(loans.filter(l => l.id !== id));
      setTrashActionStatus('Loan record moved to 30-Day Recovery Vault.');
      setTimeout(() => setTrashActionStatus(''), 4000);
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

  const NavItem = ({ id, icon: Icon, label, badge }: any) => (
    <button
      onClick={() => { setView(id); setIsMenuOpen(false); }}
      className={`flex items-center justify-between p-3 w-full rounded-xl transition-all duration-200 ${view === id
        ? 'bg-money-600 text-white shadow-lg shadow-money-900/20'
        : 'text-slate-500 hover:bg-slate-200 dark:text-shark-400 dark:hover:bg-shark-800 dark:hover:text-white'
        }`}
    >
      <div className="flex items-center space-x-3">
        <Icon />
        <span className="font-medium">{label}</span>
      </div>
      {badge !== undefined && badge > 0 && (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${view === id ? 'bg-white text-money-700' : 'bg-money-500/20 text-money-400 border border-money-500/30'}`}>
          {badge}
        </span>
      )}
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
                <div className="text-red-400 text-xs sm:text-sm text-center bg-red-950/40 p-3.5 rounded-xl border border-red-500/30 leading-relaxed font-medium">
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
                <div className="text-red-400 text-xs sm:text-sm text-center bg-red-950/40 p-3.5 rounded-xl border border-red-500/30 leading-relaxed font-medium">
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
                <div className="text-red-400 text-xs sm:text-sm text-center bg-red-950/40 p-3.5 rounded-xl border border-red-500/30 leading-relaxed font-medium">
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
                <div className="text-red-400 text-xs sm:text-sm text-center bg-red-950/40 p-3.5 rounded-xl border border-red-500/30 leading-relaxed font-medium">
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
                  <div className="text-red-400 text-xs sm:text-sm text-center bg-red-950/40 p-3.5 rounded-xl border border-red-500/30 leading-relaxed font-medium">
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
          {/* 30-Day Recovery Vault Quick Link */}
          {trashData && trashData.totalCount > 0 && (
            <button
              onClick={() => setView('trash')}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold transition-all cursor-pointer shadow-sm animate-pulse"
              title="View 30-Day Recovery Vault"
            >
              <Icons.Archive />
              <span className="hidden sm:inline">Recovery Vault</span>
              <span className="px-1.5 py-0.2 bg-amber-500/20 rounded-full font-bold">{trashData.totalCount}</span>
            </button>
          )}

          {/* Interactive Guided Tour Quick Trigger */}
          <button
            onClick={() => {
              setWalkthroughStep(0);
              setShowWalkthroughModal(true);
            }}
            className="p-1.5 rounded-xl text-slate-500 hover:text-money-600 dark:hover:text-money-400 hover:bg-slate-100 dark:hover:bg-shark-800 transition-colors cursor-pointer"
            title="Interactive Setup Walkthrough & Hints"
          >
            <Icons.HelpCircle />
          </button>

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
            <NavItem
              id="trash"
              icon={Icons.Archive}
              label="30-Day Recovery Vault"
              badge={trashData?.totalCount || 0}
            />
          </nav>

          <div className="h-px bg-slate-200 dark:bg-shark-800"></div>

          <div>
            <h3 className="px-3 mb-3 text-xs font-bold text-slate-400 dark:text-shark-500 uppercase">Assistance & Hints</h3>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setWalkthroughStep(0);
                  setShowWalkthroughModal(true);
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-money-500/10 hover:bg-money-500/20 border border-money-500/30 text-money-700 dark:text-money-400 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="text-money-600 dark:text-money-400">
                    <Icons.Lightbulb />
                  </div>
                  <div>
                    <div className="text-sm font-bold">Interactive Walkthrough</div>
                    <div className="text-[10px] text-slate-500 dark:text-shark-400">System setup & features tour</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-money-600 dark:text-money-400">Start ›</span>
              </button>
            </div>
          </div>

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

      {/* HIDDEN FILE INPUTS FOR DIRECT AVATAR SELECTION (STRICTLY ZERO AI USAGE) */}
      <input
        type="file"
        ref={avatarFileInputRef}
        accept="image/*"
        onChange={handleModalAvatarFileSelect}
        className="hidden"
      />
      <input
        type="file"
        ref={formAvatarFileInputRef}
        accept="image/*"
        onChange={handleFormAvatarFileSelect}
        className="hidden"
      />

      {/* CAMERA VIEWFINDER MODAL (FOR CUSTOMER AVATAR CAPTURE - ZERO AI USAGE) */}
      {isCameraActive && (cameraPurpose === 'customer_avatar_form' || cameraPurpose === 'customer_avatar_modal') && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="relative w-full max-w-lg bg-shark-950 rounded-3xl overflow-hidden shadow-2xl border border-shark-800 flex flex-col items-center">
            {/* Top Bar */}
            <div className="w-full px-6 py-4 flex items-center justify-between border-b border-shark-800 bg-shark-900/60">
              <div className="flex items-center gap-2 text-money-400 text-sm font-bold">
                <Icons.Camera />
                <span>Customer Profile Photo</span>
              </div>
            </div>

            {/* Viewfinder Video Stream */}
            <div className="relative w-full aspect-[4/3] max-h-[440px] bg-black flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover"
              />

              {/* Circular Portrait Face Framing Guideline */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <div className="w-52 h-52 md:w-60 md:h-60 rounded-full border-2 border-dashed border-money-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] flex items-center justify-center">
                  <span className="text-[11px] font-medium text-white bg-black/75 px-3 py-1 rounded-full border border-white/10 backdrop-blur">
                    Align face inside circle
                  </span>
                </div>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="w-full bg-shark-950 px-6 py-5 flex items-center justify-between border-t border-shark-800">
              <button
                type="button"
                onClick={toggleCameraFacing}
                className="p-3 bg-shark-800 hover:bg-shark-700 text-slate-200 rounded-full transition-colors flex items-center justify-center"
                title="Flip Camera"
              >
                <Icons.SwitchCamera />
              </button>

              <button
                type="button"
                onClick={takePhotoSnap}
                className="relative p-1 rounded-full bg-money-500/30 hover:bg-money-500/40 active:scale-95 transition-transform"
                title="Capture Profile Photo"
              >
                <div className="w-16 h-16 rounded-full border-4 border-white bg-money-500 flex items-center justify-center shadow-lg shadow-money-500/50">
                  <div className="w-6 h-6 rounded-full bg-white"></div>
                </div>
              </button>

              <button
                type="button"
                onClick={stopCamera}
                className="p-3 bg-shark-800 hover:bg-shark-700 text-slate-200 rounded-full transition-colors flex items-center justify-center"
                title="Cancel"
              >
                <Icons.X />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL-SIZE CUSTOMER PROFILE PICTURE LIGHTBOX MODAL */}
      {viewingPhotoCustomer && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
          <div
            className="absolute inset-0"
            onClick={() => setViewingPhotoCustomer(null)}
          ></div>

          <div className="relative z-10 max-w-md md:max-w-lg w-full bg-shark-950 rounded-3xl border border-shark-700/80 shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="p-4 px-6 flex items-center justify-between border-b border-shark-800 bg-shark-900/60">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-money-500/10 text-money-400 rounded-xl shrink-0">
                  <Icons.User />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-white truncate">
                    {viewingPhotoCustomer.name}
                  </h3>
                  {viewingPhotoCustomer.address ? (
                    <p className="text-xs text-shark-400 flex items-center gap-1 truncate" title={viewingPhotoCustomer.address}>
                      <Icons.MapPin />
                      <span className="truncate">{viewingPhotoCustomer.address}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-shark-500">Customer Profile Picture</p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingPhotoCustomer(null)}
                className="p-2 text-shark-400 hover:text-white rounded-xl hover:bg-shark-800 transition-colors"
                title="Close photo viewer"
              >
                <Icons.X />
              </button>
            </div>

            {/* Photo Container */}
            <div className="relative p-6 flex flex-col items-center justify-center bg-black/50">
              {viewingPhotoCustomer.avatar && viewingPhotoCustomer.avatar.trim() !== '' ? (
                <div className="relative max-h-[58vh] max-w-full flex items-center justify-center rounded-2xl overflow-hidden border-2 border-money-500/40 shadow-2xl bg-shark-950">
                  <img
                    src={viewingPhotoCustomer.avatar}
                    alt={viewingPhotoCustomer.name}
                    className="max-h-[52vh] w-auto max-w-full object-contain rounded-2xl"
                  />
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center space-y-4">
                  <CustomerAvatar
                    name={viewingPhotoCustomer.name}
                    size="3xl"
                    className="ring-8 ring-money-500/20"
                  />
                  <p className="text-xs text-shark-400 text-center max-w-xs">
                    No photograph attached for {viewingPhotoCustomer.name}.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Actions Bar */}
            <div className="p-4 px-6 bg-shark-900/80 border-t border-shark-800 flex items-center justify-between gap-3">
              {viewingPhotoCustomer.avatar && viewingPhotoCustomer.avatar.trim() !== '' && (
                <a
                  href={viewingPhotoCustomer.avatar}
                  download={`${viewingPhotoCustomer.name.replace(/\s+/g, '_')}_profile.jpg`}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-shark-800 hover:bg-shark-700 text-white text-xs font-semibold rounded-xl border border-shark-700 transition-colors shadow-sm"
                >
                  <Icons.Download />
                  <span>Download</span>
                </a>
              )}

              {viewingPhotoCustomer.id && (
                <button
                  type="button"
                  onClick={() => {
                    const c = getCustomer(viewingPhotoCustomer.id!);
                    setViewingPhotoCustomer(null);
                    if (c) handleOpenEditCustomerModal(c);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-money-600/20 hover:bg-money-600/30 text-money-400 text-xs font-semibold rounded-xl border border-money-500/30 transition-colors ml-auto"
                >
                  <Icons.Edit />
                  <span>Edit Profile</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setViewingPhotoCustomer(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE MINIMALIST WALKTHROUGH TOUR MODAL */}
      {showWalkthroughModal && (
        <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => setShowWalkthroughModal(false)}
          ></div>

          <div className="relative z-10 max-w-lg w-full bg-shark-950/95 rounded-3xl border border-money-500/30 shadow-2xl p-6 sm:p-8 flex flex-col space-y-6 animate-in zoom-in-95 duration-200 text-white">
            {/* Top Bar with Step Indicators */}
            <div className="flex items-center justify-between pb-3 border-b border-shark-800">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-money-500/10 text-money-400 rounded-xl">
                  <Icons.Lightbulb />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-money-400">
                  Setup Guide • Step {walkthroughStep + 1} of 4
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowWalkthroughModal(false)}
                className="p-1.5 text-shark-400 hover:text-white rounded-lg hover:bg-shark-800 transition-colors"
                title="Close Tour"
              >
                <Icons.X />
              </button>
            </div>

            {/* Stepper Dots */}
            <div className="flex items-center justify-center gap-2">
              {[0, 1, 2, 3].map((stepIdx) => (
                <button
                  key={stepIdx}
                  type="button"
                  onClick={() => setWalkthroughStep(stepIdx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    walkthroughStep === stepIdx
                      ? 'w-8 bg-money-500'
                      : 'w-2 bg-shark-700 hover:bg-shark-600'
                  }`}
                  title={`Go to step ${stepIdx + 1}`}
                />
              ))}
            </div>

            {/* Dynamic Step Content */}
            {walkthroughStep === 0 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-money-500/20 text-money-400 rounded-2xl">
                    <Icons.Settings />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">1. Default Rates & Global Settings</h3>
                    <p className="text-xs text-shark-400">Configure your business standard profit margins</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-shark-900/80 border border-shark-800 space-y-3 text-xs text-shark-300">
                  <p>
                    In <strong className="text-white">Global Settings</strong>, you define your baseline interest rates:
                  </p>
                  <ul className="space-y-2 list-none">
                    <li className="flex items-start gap-2">
                      <span className="text-money-400 font-bold">•</span>
                      <span><strong className="text-white">Initial Markup (%):</strong> Immediate upfront fee charged on new loans (e.g. 50% means $1,000 principal becomes $1,500 total).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-money-400 font-bold">•</span>
                      <span><strong className="text-white">Monthly Compounding (%):</strong> Rate compounded every 30 days on overdue balance (e.g. 30%/month).</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setView('settings');
                    setShowWalkthroughModal(false);
                  }}
                  className="w-full py-2.5 px-4 bg-money-600/20 hover:bg-money-600/30 text-money-300 border border-money-500/30 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Icons.Settings /> <span>Take me to Global Settings</span>
                </button>
              </div>
            )}

            {walkthroughStep === 1 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-money-500/20 text-money-400 rounded-2xl">
                    <Icons.Users />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">2. Borrower Directory & Photos</h3>
                    <p className="text-xs text-shark-400">Complete borrower profiles with physical address</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-shark-900/80 border border-shark-800 space-y-3 text-xs text-shark-300">
                  <p>
                    In <strong className="text-white">Loans & Customers</strong>, maintain client records:
                  </p>
                  <ul className="space-y-2 list-none">
                    <li className="flex items-start gap-2">
                      <span className="text-money-400 font-bold">•</span>
                      <span><strong className="text-white">Portrait Camera:</strong> Take client photos using your device camera or choose pictures from your gallery.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-money-400 font-bold">•</span>
                      <span><strong className="text-white">Full-Screen Photo Zoom:</strong> Click any customer avatar anytime across the app to view full-resolution photo and download it.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-money-400 font-bold">•</span>
                      <span><strong className="text-white">Physical Address & Notes:</strong> Keep track of residence and collateral notes.</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setView('loans');
                    setShowWalkthroughModal(false);
                  }}
                  className="w-full py-2.5 px-4 bg-money-600/20 hover:bg-money-600/30 text-money-300 border border-money-500/30 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Icons.Users /> <span>Open Customer Directory</span>
                </button>
              </div>
            )}

            {walkthroughStep === 2 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-money-500/20 text-money-400 rounded-2xl">
                    <Icons.Plus />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">3. Fast Loans & Camera AI Snap</h3>
                    <p className="text-xs text-shark-400">Create records manually or scan handwritten ledgers</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-shark-900/80 border border-shark-800 space-y-3 text-xs text-shark-300">
                  <p>
                    Under <strong className="text-white">New Entry</strong>, record transactions quickly:
                  </p>
                  <ul className="space-y-2 list-none">
                    <li className="flex items-start gap-2">
                      <span className="text-money-400 font-bold">•</span>
                      <span><strong className="text-white">Manual Fast Entry:</strong> Auto-populates your global default rates or allows custom loan terms.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-money-400 font-bold">•</span>
                      <span><strong className="text-white">Camera AI Scan:</strong> Snap a photo of a ledger notebook, receipt, or promissory note to automatically extract the borrower name, date, and amount.</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setView('entry');
                    setShowWalkthroughModal(false);
                  }}
                  className="w-full py-2.5 px-4 bg-money-600/20 hover:bg-money-600/30 text-money-300 border border-money-500/30 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Icons.Plus /> <span>Try New Loan Entry</span>
                </button>
              </div>
            )}

            {walkthroughStep === 3 && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-money-500/20 text-money-400 rounded-2xl">
                    <Icons.Shield />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">4. 30-Day Recovery Vault & Security</h3>
                    <p className="text-xs text-shark-400">Zero data loss safety guarantee and biometrics</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-shark-900/80 border border-shark-800 space-y-3 text-xs text-shark-300">
                  <p>
                    Your records and financial balances are safeguarded with multi-layer protection:
                  </p>
                  <ul className="space-y-2 list-none">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">🛡️</span>
                      <span><strong className="text-white">30-Day Cloud Recovery Vault:</strong> Deleted loans and borrower files are never lost immediately. They are preserved in your cloud vault for 30 days and can be restored in 1 click.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-money-400 font-bold">🔐</span>
                      <span><strong className="text-white">Hardware Biometric Shield:</strong> Protect your system using Touch ID, Face ID, or Windows Hello passkeys.</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setView('trash');
                    setShowWalkthroughModal(false);
                  }}
                  className="w-full py-2.5 px-4 bg-money-600/20 hover:bg-money-600/30 text-money-300 border border-money-500/30 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Icons.Archive /> <span>Open 30-Day Recovery Vault</span>
                </button>
              </div>
            )}

            {/* Bottom Controls */}
            <div className="pt-2 flex items-center justify-between gap-3 border-t border-shark-800">
              <button
                type="button"
                onClick={() => handleToggleHints(false)}
                className="text-xs text-shark-400 hover:text-shark-200 transition-colors"
                title="Turn off hints"
              >
                Turn off hints
              </button>

              <div className="flex items-center gap-2">
                {walkthroughStep > 0 && (
                  <button
                    type="button"
                    onClick={() => setWalkthroughStep(prev => prev - 1)}
                    className="px-4 py-2 rounded-xl bg-shark-800 hover:bg-shark-700 text-xs font-semibold text-shark-300 hover:text-white transition-colors"
                  >
                    Back
                  </button>
                )}

                {walkthroughStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => setWalkthroughStep(prev => prev + 1)}
                    className="px-5 py-2 rounded-xl bg-money-600 hover:bg-money-500 text-xs font-bold text-white transition-all shadow-md shadow-money-900/30"
                  >
                    Next Step ›
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowWalkthroughModal(false)}
                    className="px-5 py-2 rounded-xl bg-money-600 hover:bg-money-500 text-xs font-bold text-white transition-all shadow-md shadow-money-900/30"
                  >
                    Finish Tour ✓
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER PROFILE MODAL (CREATE / EDIT CUSTOMER) */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-shark-900/80 backdrop-blur-sm" onClick={() => !isSavingCustomer && setShowCustomerModal(false)}></div>
          <div className="relative bg-white dark:bg-shark-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-shark-700 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200 dark:border-shark-700">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-money-500/10 text-money-600 dark:text-money-400 rounded-xl">
                  {editingCustomer.id ? <Icons.User /> : <Icons.UserPlus />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {editingCustomer.id ? 'Edit Customer Profile' : 'New Customer Profile'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-shark-400">
                    {editingCustomer.id ? 'Update customer information and photo' : 'Add borrower details and portrait'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomerModal(false)}
                className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors rounded-lg"
              >
                <Icons.X />
              </button>
            </div>

            {/* Profile Avatar Section */}
            <div className="flex flex-col items-center justify-center mb-6 p-5 bg-slate-50 dark:bg-shark-900/60 rounded-2xl border border-slate-200 dark:border-shark-700">
              <div className="relative mb-3">
                <CustomerAvatar
                  name={editingCustomer.name}
                  avatar={editingCustomer.avatar}
                  size="2xl"
                  showHoverZoom={Boolean(editingCustomer.avatar)}
                  onClick={() => {
                    if (editingCustomer.avatar) {
                      setViewingPhotoCustomer({
                        name: editingCustomer.name || 'Customer',
                        avatar: editingCustomer.avatar,
                        address: editingCustomer.address,
                        phone: editingCustomer.phone,
                        id: editingCustomer.id,
                      });
                    }
                  }}
                  className="ring-4 ring-money-500/30"
                />
                {editingCustomer.avatar && (
                  <button
                    type="button"
                    onClick={() => setEditingCustomer(prev => ({ ...prev, avatar: '' }))}
                    className="absolute -top-1 -right-1 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-500 shadow-md transition-transform active:scale-95 z-10"
                    title="Remove Photo"
                  >
                    <Icons.X />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => startCamera('user', 'customer_avatar_modal')}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-money-600 hover:bg-money-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all active:scale-95"
                >
                  <Icons.Camera />
                  <span>Take Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => avatarFileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-200 dark:bg-shark-700 hover:bg-slate-300 dark:hover:bg-shark-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-all active:scale-95"
                >
                  <Icons.Upload />
                  <span>Choose Image</span>
                </button>
                {editingCustomer.avatar && (
                  <button
                    type="button"
                    onClick={() => setViewingPhotoCustomer({
                      name: editingCustomer.name || 'Customer',
                      avatar: editingCustomer.avatar,
                      address: editingCustomer.address,
                      phone: editingCustomer.phone,
                      id: editingCustomer.id,
                    })}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-money-500/10 hover:bg-money-500/20 text-money-600 dark:text-money-400 text-xs font-semibold rounded-xl border border-money-500/30 transition-all active:scale-95"
                  >
                    <Icons.Eye />
                    <span>View Photo</span>
                  </button>
                )}
              </div>
            </div>

            {customerModalError && (
              <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium">
                {customerModalError}
              </div>
            )}

            <form onSubmit={handleSaveCustomerModal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-shark-500 uppercase mb-1">
                  Full Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingCustomer.name}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  placeholder="e.g. Tony Spilotro"
                  className="w-full bg-slate-50 dark:bg-shark-900 border border-slate-300 dark:border-shark-600 rounded-xl p-3 text-slate-900 dark:text-white focus:border-money-500 outline-none transition-colors text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-shark-500 uppercase mb-1">
                  Residential / Physical Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-shark-500">
                    <Icons.MapPin />
                  </div>
                  <input
                    type="text"
                    value={editingCustomer.address}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
                    placeholder="e.g. 142 Ocean View Ave, Cape Town"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-shark-900 border border-slate-300 dark:border-shark-600 rounded-xl text-slate-900 dark:text-white focus:border-money-500 outline-none transition-colors text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-shark-500 uppercase mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-shark-500">
                    <Icons.Phone />
                  </div>
                  <input
                    type="tel"
                    value={editingCustomer.phone}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                    placeholder="e.g. +27 82 123 4567"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-shark-900 border border-slate-300 dark:border-shark-600 rounded-xl text-slate-900 dark:text-white focus:border-money-500 outline-none transition-colors text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-shark-500 uppercase mb-1">
                  Notes & Collateral Details
                </label>
                <textarea
                  rows={2}
                  value={editingCustomer.notes}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, notes: e.target.value })}
                  placeholder="e.g. Employer, guarantor, or collateral notes..."
                  className="w-full bg-slate-50 dark:bg-shark-900 border border-slate-300 dark:border-shark-600 rounded-xl p-3 text-slate-900 dark:text-white focus:border-money-500 outline-none transition-colors text-sm resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  disabled={isSavingCustomer}
                  className="flex-1 py-3 bg-slate-100 dark:bg-shark-700 hover:bg-slate-200 dark:hover:bg-shark-600 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCustomer}
                  className="flex-1 py-3 bg-money-600 hover:bg-money-500 text-white font-bold rounded-xl shadow-lg shadow-money-900/30 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  {isSavingCustomer ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Icons.Check />
                      <span>Save Customer</span>
                    </>
                  )}
                </button>
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
              {/* Status Notice Toast */}
              {trashActionStatus && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <Icons.Shield />
                    <span>{trashActionStatus}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setView('trash')}
                    className="underline text-[11px] hover:text-emerald-300 ml-2"
                  >
                    View Vault
                  </button>
                </div>
              )}

              {/* Contextual Setup Hint Banner */}
              {settings.showHints !== false && !dismissedDashboardHint && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-money-500/10 via-money-500/5 to-transparent border border-money-500/30 flex items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-money-500/20 text-money-600 dark:text-money-400 rounded-xl shrink-0">
                      <Icons.Lightbulb />
                    </div>
                    <div className="text-xs text-slate-700 dark:text-shark-300 min-w-0">
                      <strong className="text-slate-900 dark:text-white font-semibold">Quick Setup Hint:</strong>{' '}
                      You can set your default 50% upfront markup & 30% compounding rate in{' '}
                      <button
                        onClick={() => setView('settings')}
                        className="text-money-600 dark:text-money-400 font-bold hover:underline inline"
                      >
                        Global Settings
                      </button>
                      . Need assistance?{' '}
                      <button
                        onClick={() => {
                          setWalkthroughStep(0);
                          setShowWalkthroughModal(true);
                        }}
                        className="text-money-600 dark:text-money-400 font-bold hover:underline inline"
                      >
                        Launch Interactive Tour
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setDismissedDashboardHint(true)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors"
                      title="Dismiss Hint"
                    >
                      <Icons.X />
                    </button>
                  </div>
                </div>
              )}

              <PortfolioAnalytics
                loans={loans}
                customers={customers}
                repayments={repayments}
                settings={settings}
                onExportCsv={() => exportPortfolioToCsv(loans, customers, repayments, settings)}
              />

              <div className="mt-8 space-y-4">
                <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Active Loan Portfolio</h2>
                    <p className="text-xs text-slate-500 dark:text-shark-400">
                      Track compounding cycles, collect installments, and monitor outstanding risk.
                    </p>
                  </div>

                  <div className="flex flex-1 w-full lg:w-auto gap-3 items-center">
                    <div className="relative flex-1 lg:max-w-xs">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Icons.Search />
                      </div>
                      <input
                        type="text"
                        placeholder="Search borrower or date..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-shark-800 border border-slate-200 dark:border-shark-700 rounded-xl text-slate-900 dark:text-white focus:border-money-500 outline-none transition-colors text-sm"
                      />
                    </div>

                    <select
                      value={loanSortBy}
                      onChange={(e) => setLoanSortBy(e.target.value as any)}
                      className="px-3 py-2 bg-white dark:bg-shark-800 border border-slate-200 dark:border-shark-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-shark-200 focus:border-money-500 outline-none transition-colors cursor-pointer"
                    >
                      <option value="BALANCE_DESC">Highest Balance</option>
                      <option value="DUE_SOONEST">Compounding Soonest</option>
                      <option value="NEWEST">Newest First</option>
                      <option value="NAME">Borrower Name (A-Z)</option>
                    </select>

                    <button
                      onClick={() => setView('entry')}
                      className="bg-money-600 hover:bg-money-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-money-900/20 whitespace-nowrap text-xs sm:text-sm font-bold active:scale-95"
                    >
                      <Icons.Plus /> <span className="hidden sm:inline">New Loan</span>
                    </button>
                  </div>
                </div>

                {/* Risk Filter Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setLoanFilterTab('ALL')}
                    className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                      loanFilterTab === 'ALL'
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md font-bold'
                        : 'bg-slate-100 dark:bg-shark-800/80 text-slate-600 dark:text-shark-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    All Active ({activeLoans.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoanFilterTab('GRACE')}
                    className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      loanFilterTab === 'GRACE'
                        ? 'bg-emerald-600 text-white shadow-md font-bold'
                        : 'bg-slate-100 dark:bg-shark-800/80 text-slate-600 dark:text-shark-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Grace Period (0–30d)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoanFilterTab('COMPOUNDING')}
                    className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      loanFilterTab === 'COMPOUNDING'
                        ? 'bg-amber-600 text-white shadow-md font-bold'
                        : 'bg-slate-100 dark:bg-shark-800/80 text-slate-600 dark:text-shark-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>Compounding (Cycle 2)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoanFilterTab('OVERDUE')}
                    className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      loanFilterTab === 'OVERDUE'
                        ? 'bg-rose-600 text-white shadow-md font-bold'
                        : 'bg-slate-100 dark:bg-shark-800/80 text-slate-600 dark:text-shark-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>High Risk (60+ days)</span>
                  </button>
                </div>

                <div className="grid gap-5">
                  {groupedActiveCustomers.map((group) => {
                    const customer = group.customer;
                    const customerName = customer?.name || 'Customer';
                    const hasMultipleLoans = group.loans.length > 1;

                    return (
                      <div
                        key={group.customerId}
                        className="bg-white dark:bg-shark-800 p-5 md:p-6 rounded-3xl border border-slate-200 dark:border-shark-700 hover:border-emerald-500/40 dark:hover:border-emerald-500/30 transition-all shadow-sm flex flex-col gap-4"
                      >
                        {/* Borrower Profile Header */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-slate-100 dark:border-shark-700/70">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <CustomerAvatar
                              customer={customer}
                              size="lg"
                              showHoverZoom={Boolean(customer?.avatar)}
                              onClick={() => {
                                if (customer?.avatar) {
                                  setViewingPhotoCustomer({
                                    name: customer.name,
                                    avatar: customer.avatar,
                                    address: customer.address,
                                    phone: customer.phone,
                                    id: customer.id,
                                  });
                                } else if (customer) {
                                  handleOpenEditCustomerModal(customer);
                                }
                              }}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (customer) handleOpenEditCustomerModal(customer);
                                  }}
                                  className="text-base md:text-lg font-bold text-slate-900 dark:text-white leading-tight hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-left truncate cursor-pointer"
                                >
                                  {customerName}
                                </button>
                                {hasMultipleLoans && (
                                  <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                                    <span>👥</span>
                                    <span>{group.loans.length} loans on profile</span>
                                  </span>
                                )}
                                {!hasMultipleLoans && (
                                  <span className="text-[10px] md:text-xs bg-slate-100 dark:bg-shark-900 text-slate-600 dark:text-shark-300 font-semibold px-2 py-0.5 rounded-md border border-slate-200 dark:border-shark-700">
                                    {group.loans[0].isFixedRate ? settings.globalInterestRate : group.loans[0].interestRate}%/mo
                                  </span>
                                )}
                              </div>
                              {customer?.address && (
                                <div className="text-[11px] text-slate-500 dark:text-shark-400 flex items-center gap-1 mt-1 truncate">
                                  <Icons.MapPin />
                                  <span className="truncate">{customer.address}</span>
                                </div>
                              )}
                              {customer?.phone && (
                                <div className="text-[11px] text-slate-500 dark:text-shark-400 flex items-center gap-1 mt-0.5">
                                  <Icons.Phone />
                                  <span>{customer.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Profile Controls & Combined Debt */}
                          <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto flex-wrap">
                            {hasMultipleLoans && (
                              <div className="text-right hidden sm:block">
                                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-shark-500 block">Total Active Balance</span>
                                <span className="font-mono font-bold text-base text-amber-600 dark:text-amber-400">
                                  {formatCurrency(group.totalRemainingBalance)}
                                </span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => handleSelectExistingCustomerForLoan(group.customerId)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-shark-900 dark:hover:bg-shark-700 text-slate-700 dark:text-shark-200 rounded-xl text-xs font-bold border border-slate-200 dark:border-shark-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                              title="Add another loan under this customer's profile"
                            >
                              <Icons.Plus />
                              <span>Add Loan</span>
                            </button>
                          </div>
                        </div>

                        {/* Individual Loans Under This Profile */}
                        <div className="space-y-3">
                          {hasMultipleLoans && (
                            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 dark:text-shark-400 px-1 pt-1">
                              <span>Loans Under This Profile ({group.loans.length})</span>
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                Individual start dates & balances
                              </span>
                            </div>
                          )}

                          {group.loans.map((loan, idx) => {
                            const calc = calculateLoanDetails(
                              loan,
                              settings.globalInitialInterestRate,
                              settings.globalInterestRate,
                              repayments
                            );
                            const activeInitialRate = loan.isFixedRate ? settings.globalInitialInterestRate : loan.initialInterestRate;
                            const activeMonthlyRate = loan.isFixedRate ? settings.globalInterestRate : loan.interestRate;

                            return (
                              <div
                                key={loan.id}
                                className={`rounded-2xl p-4 transition-all ${
                                  hasMultipleLoans
                                    ? 'bg-slate-50/80 dark:bg-shark-900/60 border border-slate-200/80 dark:border-shark-700/70'
                                    : 'bg-transparent p-0'
                                } space-y-3`}
                              >
                                {/* Loan Header & Action Controls */}
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                  <div className="flex items-center gap-2.5 flex-wrap">
                                    {hasMultipleLoans && (
                                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-500/20 font-mono">
                                        Loan #{idx + 1}
                                      </span>
                                    )}
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                      Issued {formatDate(loan.startDate)}
                                    </span>
                                    <span className="text-[11px] bg-slate-200/70 dark:bg-shark-800 text-slate-600 dark:text-shark-300 font-medium px-2 py-0.5 rounded-md">
                                      Markup: {activeInitialRate}%
                                    </span>
                                    <span className="text-[11px] bg-slate-200/70 dark:bg-shark-800 text-slate-600 dark:text-shark-300 font-medium px-2 py-0.5 rounded-md">
                                      {activeMonthlyRate}%/mo
                                    </span>
                                    {loan.notes && (
                                      <span className="text-[11px] text-slate-500 dark:text-shark-400 italic truncate max-w-xs">
                                        • {loan.notes}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => setPaymentModalLoan(loan)}
                                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-900/20 transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                                      title="Record an installment payment"
                                    >
                                      Record Payment
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => changeLoanStatus(loan.id, 'PAID')}
                                      title="Mark as Paid in Full"
                                      className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-100/50 dark:hover:bg-green-950/30 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <Icons.Check />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => changeLoanStatus(loan.id, 'DEFAULTED')}
                                      title="Mark as Defaulted"
                                      className="p-1.5 text-orange-600 dark:text-orange-400 hover:bg-orange-100/50 dark:hover:bg-orange-950/30 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <Icons.X />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deleteLoan(loan.id)}
                                      title="Delete Record (moves to 30-day recovery vault)"
                                      className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100/50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <Icons.Trash />
                                    </button>
                                  </div>
                                </div>

                                {/* Compounding Cycle Countdown & Repayment Progress */}
                                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-shark-900/80 border border-slate-100 dark:border-shark-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {calc.riskCategory === 'GRACE_PERIOD' && (
                                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-bold flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <span>Cycle 1 (Grace Period) • {calc.daysUntilNextCycle} days until Cycle 2 (+{activeMonthlyRate}%)</span>
                                      </span>
                                    )}
                                    {calc.riskCategory === 'COMPOUNDING_1' && (
                                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[11px] font-bold flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                        <span>Cycle 2 Active • Compounding (+{activeMonthlyRate}%) • {calc.daysUntilNextCycle} days until Cycle 3</span>
                                      </span>
                                    )}
                                    {calc.riskCategory === 'OVERDUE_HIGH_RISK' && (
                                      <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[11px] font-bold flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                                        <span>Cycle {calc.monthsElapsed} (High Risk) • {calc.daysUntilNextCycle} days until next compounding</span>
                                      </span>
                                    )}
                                  </div>

                                  {calc.totalRepaid > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => setPaymentModalLoan(loan)}
                                      className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold text-xs flex items-center gap-1 cursor-pointer"
                                    >
                                      <span>✓ Paid {formatCurrency(calc.totalRepaid)}</span>
                                      <span className="text-slate-400 dark:text-shark-500 font-normal">
                                        ({calc.repaymentCount} {calc.repaymentCount === 1 ? 'payment' : 'payments'})
                                      </span>
                                    </button>
                                  ) : (
                                    <span className="text-slate-400 dark:text-shark-500 text-[11px]">
                                      No payments logged yet
                                    </span>
                                  )}
                                </div>

                                {/* Financial Figures for this loan */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full pt-1 border-t border-slate-100 dark:border-shark-700/60">
                                  <div>
                                    <div className="text-[10px] text-slate-400 dark:text-shark-500 uppercase tracking-wider font-semibold">Principal</div>
                                    <div className="text-sm font-mono text-slate-700 dark:text-shark-300 font-medium">{formatCurrency(loan.principal)}</div>
                                  </div>
                                  <div>
                                    <div className="text-[10px] text-slate-400 dark:text-shark-500 uppercase tracking-wider font-semibold">Accrued Interest</div>
                                    <div className="text-sm font-mono text-money-600 dark:text-money-500 font-bold">+{formatCurrency(calc.interestAccrued)}</div>
                                  </div>
                                  <div>
                                    <div className="text-[10px] text-slate-400 dark:text-shark-500 uppercase tracking-wider font-semibold">Total Repaid</div>
                                    <div className="text-sm font-mono text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(calc.totalRepaid)}</div>
                                  </div>
                                  <div className="border-l border-slate-100 dark:border-shark-700 pl-3">
                                    <div className="text-[10px] text-slate-400 dark:text-shark-500 uppercase tracking-wider font-bold">Remaining Balance</div>
                                    <div className="text-base font-mono font-bold text-amber-600 dark:text-amber-400">{formatCurrency(calc.remainingBalance)}</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {groupedActiveCustomers.length === 0 && (
                    <div className="text-center py-12 text-slate-400 dark:text-shark-500 bg-slate-50 dark:bg-shark-800/50 rounded-2xl border border-slate-200 dark:border-shark-700 border-dashed">
                      <div className="text-3xl mb-2">🔍</div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-shark-300">
                        {searchTerm ? 'No loans matching your search.' : 'No active loans in this category.'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* History / Closed Loans Section */}
              <div className="mt-12 border-t border-slate-200 dark:border-shark-800 pt-8">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-6">Closed & History Records</h2>
                <div className="grid gap-4">
                  {loans.filter(l => l.status !== 'ACTIVE').map((loan) => {
                    const calc = calculateLoanDetails(loan, settings.globalInitialInterestRate, settings.globalInterestRate, repayments);
                    return (
                      <div key={loan.id} className="bg-white dark:bg-shark-800 p-4 md:p-5 rounded-xl border border-slate-200 dark:border-shark-700 flex flex-col gap-4 opacity-85 shadow-sm hover:opacity-100 transition-all duration-300">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <CustomerAvatar
                              customer={getCustomer(loan.customerId)}
                              size="md"
                              showHoverZoom={Boolean(getCustomer(loan.customerId)?.avatar)}
                              onClick={() => {
                                const c = getCustomer(loan.customerId);
                                if (c?.avatar) {
                                  setViewingPhotoCustomer({
                                    name: c.name,
                                    avatar: c.avatar,
                                    address: c.address,
                                    phone: c.phone,
                                    id: c.id,
                                  });
                                } else if (c) {
                                  handleOpenEditCustomerModal(c);
                                }
                              }}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const c = getCustomer(loan.customerId);
                                    if (c) handleOpenEditCustomerModal(c);
                                  }}
                                  className="text-base md:text-lg font-bold text-slate-900 dark:text-white leading-tight hover:text-money-600 dark:hover:text-money-400 transition-colors text-left truncate"
                                >
                                  {getCustomerName(loan.customerId)}
                                </button>
                                <span className={`text-[10px] md:text-xs px-2 py-0.5 rounded font-bold uppercase ${
                                  loan.status === 'PAID' 
                                    ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/30'
                                    : 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-900/30'
                                }`}>
                                  {loan.status}
                                </span>
                              </div>
                              {getCustomer(loan.customerId)?.address && (
                                <div className="text-[11px] text-slate-500 dark:text-shark-400 flex items-center gap-1 mt-0.5 truncate">
                                  <Icons.MapPin />
                                  <span className="truncate">{getCustomer(loan.customerId)?.address}</span>
                                </div>
                              )}
                              <div className="text-xs text-slate-500 dark:text-shark-400 mt-0.5">
                                Started {formatDate(loan.startDate)} • Notes: {loan.notes || "None"}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 md:gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setPaymentModalLoan(loan)}
                              title="View Payment Ledger"
                              className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-lg border border-emerald-500/20 transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <span>Payments ({calc.repaymentCount})</span>
                            </button>
                            <button 
                              onClick={() => changeLoanStatus(loan.id, 'ACTIVE')} 
                              title="Re-activate Loan"
                              className="p-1.5 text-money-600 dark:text-money-400 hover:bg-money-100/50 dark:hover:bg-money-950/30 rounded-lg transition-colors cursor-pointer"
                            >
                              <Icons.Refresh />
                            </button>
                            <button 
                              onClick={() => deleteLoan(loan.id)} 
                              title="Delete Record"
                              className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100/50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                            >
                              <Icons.Trash />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full pt-3 border-t border-slate-100 dark:border-shark-800/80">
                          <div>
                            <div className="text-[10px] text-slate-400 dark:text-shark-500 uppercase tracking-wider">Principal</div>
                            <div className="text-sm text-slate-600 dark:text-shark-300 font-mono font-medium">{formatCurrency(loan.principal)}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 dark:text-shark-500 uppercase tracking-wider">Interest</div>
                            <div className="text-sm text-slate-600 dark:text-shark-300 font-mono">{formatCurrency(calc.interestAccrued)}</div>
                          </div>
                          <div>
                            <div className="text-[10px] text-slate-400 dark:text-shark-500 uppercase tracking-wider">Total Repaid</div>
                            <div className="text-sm text-emerald-600 dark:text-emerald-400 font-mono font-bold">{formatCurrency(calc.totalRepaid)}</div>
                          </div>
                          <div className="border-l border-slate-100 dark:border-shark-800 pl-3">
                            <div className="text-[10px] text-slate-400 dark:text-shark-500 uppercase tracking-wider">Gross Debt</div>
                            <div className="text-sm font-bold text-slate-900 dark:text-white font-mono">{formatCurrency(calc.totalAmount)}</div>
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

          {/* VIEW: CUSTOMER DIRECTORY & PROFILES */}
          {view === 'loans' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Customer Directory</h2>
                  <p className="text-xs text-slate-500 dark:text-shark-400 mt-0.5">Manage borrower profiles, photos, residential addresses, and balances</p>
                </div>

                <div className="flex w-full sm:w-auto gap-3">
                  <div className="relative flex-1 sm:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Icons.Search />
                    </div>
                    <input
                      type="text"
                      placeholder="Search name or address..."
                      value={customerSearchTerm}
                      onChange={(e) => setCustomerSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white dark:bg-shark-800 border border-slate-200 dark:border-shark-700 rounded-xl text-slate-900 dark:text-white focus:border-money-500 outline-none transition-colors text-sm"
                    />
                  </div>
                  <button
                    onClick={handleOpenNewCustomerModal}
                    className="bg-money-600 hover:bg-money-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-money-900/20 whitespace-nowrap text-sm font-semibold"
                  >
                    <Icons.UserPlus /> <span>New Customer</span>
                  </button>
                </div>
              </div>

              {/* Customer Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCustomers.map(c => {
                  const customerLoans = loans.filter(l => l.customerId === c.id);
                  const activeCustLoans = customerLoans.filter(l => l.status === 'ACTIVE');
                  const totalCustPrincipal = activeCustLoans.reduce((sum, l) => sum + l.principal, 0);
                  const totalCustDebt = activeCustLoans.reduce((sum, l) => {
                    const d = calculateLoanDetails(l, settings.globalInitialInterestRate, settings.globalInterestRate);
                    return sum + d.totalAmount;
                  }, 0);

                  return (
                    <div
                      key={c.id}
                      className="bg-white dark:bg-shark-800 p-5 rounded-2xl border border-slate-200 dark:border-shark-700 shadow-sm hover:border-money-500/50 transition-all flex flex-col justify-between gap-4 group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="relative shrink-0">
                          <CustomerAvatar
                            customer={c}
                            size="xl"
                            showHoverZoom={Boolean(c.avatar)}
                            onClick={() => {
                              if (c.avatar) {
                                setViewingPhotoCustomer({
                                  name: c.name,
                                  avatar: c.avatar,
                                  address: c.address,
                                  phone: c.phone,
                                  id: c.id,
                                });
                              } else {
                                handleOpenEditCustomerModal(c);
                              }
                            }}
                          />
                          {c.avatar ? (
                            <button
                              type="button"
                              onClick={() => setViewingPhotoCustomer({
                                name: c.name,
                                avatar: c.avatar,
                                address: c.address,
                                phone: c.phone,
                                id: c.id,
                              })}
                              className="absolute -bottom-1 -left-1 p-1 bg-white dark:bg-shark-700 rounded-full border border-slate-200 dark:border-shark-600 text-slate-600 dark:text-slate-300 hover:text-money-500 shadow-sm transition-transform active:scale-95 z-10"
                              title="View full profile photo"
                            >
                              <Icons.Eye />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => handleOpenEditCustomerModal(c)}
                            className="absolute -bottom-1 -right-1 p-1 bg-white dark:bg-shark-700 rounded-full border border-slate-200 dark:border-shark-600 text-slate-600 dark:text-slate-300 hover:text-money-500 shadow-sm transition-transform active:scale-95 z-10"
                            title={c.avatar ? "Change photo" : "Add photo"}
                          >
                            <Icons.Camera />
                          </button>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3
                            onClick={() => handleOpenEditCustomerModal(c)}
                            className="font-bold text-lg text-slate-900 dark:text-white truncate cursor-pointer hover:text-money-600 dark:hover:text-money-400 transition-colors"
                          >
                            {c.name}
                          </h3>

                          {c.address ? (
                            <div className="text-xs text-slate-500 dark:text-shark-400 flex items-center gap-1 mt-1 truncate" title={c.address}>
                              <Icons.MapPin />
                              <span className="truncate">{c.address}</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleOpenEditCustomerModal(c)}
                              className="text-[11px] text-money-600 dark:text-money-400 hover:underline flex items-center gap-1 mt-1"
                            >
                              <Icons.MapPin /> + Add Address
                            </button>
                          )}

                          {c.phone && (
                            <div className="text-xs text-slate-500 dark:text-shark-400 flex items-center gap-1 mt-0.5">
                              <Icons.Phone />
                              <span>{c.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Loan Stats */}
                      <div className="grid grid-cols-2 gap-2 py-2 px-3 bg-slate-50 dark:bg-shark-900/60 rounded-xl border border-slate-100 dark:border-shark-700/50 text-xs">
                        <div>
                          <span className="text-slate-400 dark:text-shark-500 block text-[10px] uppercase">Active Loans</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{activeCustLoans.length} record(s)</span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-400 dark:text-shark-500 block text-[10px] uppercase">Total Due</span>
                          <span className="font-mono font-bold text-money-600 dark:text-money-400">
                            {formatCurrency(totalCustDebt)}
                          </span>
                        </div>
                      </div>

                      {/* Individual Loans on this Customer's Profile */}
                      {customerLoans.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-shark-750">
                          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400 dark:text-shark-500">
                            <span>Loans on this Profile ({customerLoans.length})</span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold lowercase">separate dates</span>
                          </div>
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {customerLoans.map((l, i) => {
                              const calc = calculateLoanDetails(l, settings.globalInitialInterestRate, settings.globalInterestRate, repayments);
                              return (
                                <div
                                  key={l.id}
                                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-shark-900 border border-slate-200/70 dark:border-shark-700/60 flex items-center justify-between gap-2 text-xs"
                                >
                                  <div>
                                    <div className="font-bold font-mono text-slate-800 dark:text-slate-200">
                                      Loan #{i + 1}: {formatCurrency(l.principal)}
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-shark-400 mt-0.5">
                                      Date: <strong className="text-slate-700 dark:text-shark-300">{formatDate(l.startDate)}</strong> • Due: <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(calc.remainingBalance)}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span
                                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                        l.status === 'ACTIVE'
                                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                          : 'bg-slate-200 dark:bg-shark-700 text-slate-600 dark:text-shark-300'
                                      }`}
                                    >
                                      {l.status}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setPaymentModalLoan(l)}
                                      className="px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition-colors cursor-pointer"
                                      title="Record repayment on this loan"
                                    >
                                      Pay
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-shark-700/60">
                        <button
                          type="button"
                          onClick={() => handleSelectExistingCustomerForLoan(c.id)}
                          className="flex items-center gap-1.5 text-xs font-bold text-money-600 dark:text-money-400 hover:text-money-700 dark:hover:text-money-300 py-1 cursor-pointer"
                        >
                          <Icons.Plus /> <span>Add Loan on Profile</span>
                        </button>

                        <div className="flex items-center gap-1">
                          {c.avatar && (
                            <button
                              type="button"
                              onClick={() => setViewingPhotoCustomer({
                                name: c.name,
                                avatar: c.avatar,
                                address: c.address,
                                phone: c.phone,
                                id: c.id,
                              })}
                              title="View Customer Photo"
                              className="p-1.5 text-money-600 dark:text-money-400 hover:bg-money-50 dark:hover:bg-money-950/30 rounded-lg transition-colors"
                            >
                              <Icons.Eye />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEditCustomerModal(c)}
                            title="Edit Profile"
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-shark-700 transition-colors"
                          >
                            <Icons.Edit />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomer(c.id, c.name)}
                            title="Delete Customer"
                            className="p-1.5 text-red-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          >
                            <Icons.Trash />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredCustomers.length === 0 && (
                <div className="text-center py-16 bg-white dark:bg-shark-800 rounded-2xl border border-slate-200 dark:border-shark-700 p-8 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-shark-700 text-slate-400 dark:text-shark-400 flex items-center justify-center mx-auto">
                    <Icons.User />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                      {customerSearchTerm ? 'No customers matching search' : 'No customers registered yet'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-shark-400 mt-1 max-w-sm mx-auto">
                      Add a customer profile with their photo and residential address to track their loans and credit status.
                    </p>
                  </div>
                  <button
                    onClick={handleOpenNewCustomerModal}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-money-600 hover:bg-money-500 text-white rounded-xl text-sm font-semibold shadow-md transition-colors"
                  >
                    <Icons.UserPlus /> <span>Add First Customer</span>
                  </button>
                </div>
              )}
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
                        <span>High-accuracy document scanner for recognizing handwriting, paper notes, and receipts.</span>
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
                    {/* Customer Profile Mode Switcher (Existing vs New Profile) */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-500 dark:text-shark-400 uppercase tracking-wider">
                          Borrower Profile Selection
                        </label>
                        {customers.length > 0 && (
                          <span className="text-[11px] text-slate-400 dark:text-shark-500">
                            {customers.length} profile{customers.length === 1 ? '' : 's'} on record
                          </span>
                        )}
                      </div>

                      {/* Segmented Switcher */}
                      <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-shark-900 rounded-xl border border-slate-200 dark:border-shark-700 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => {
                            setEntryCustomerMode('existing');
                          }}
                          className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            entryCustomerMode === 'existing'
                              ? 'bg-money-600 text-white shadow-md'
                              : 'text-slate-600 dark:text-shark-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <Icons.User />
                          <span>Existing Profile</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEntryCustomerMode('new');
                            handleClearSelectedCustomerForLoan();
                          }}
                          className={`py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            entryCustomerMode === 'new'
                              ? 'bg-money-600 text-white shadow-md'
                              : 'text-slate-600 dark:text-shark-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <Icons.UserPlus />
                          <span>New Borrower</span>
                        </button>
                      </div>

                      {/* MODE 1: EXISTING BORROWER PROFILE */}
                      {entryCustomerMode === 'existing' && (
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-shark-900 border border-slate-200 dark:border-shark-700 space-y-4">
                          {selectedExistingCustomerId ? (
                            /* Currently Selected Customer Summary Card */
                            (() => {
                              const selectedCustomer = getCustomer(selectedExistingCustomerId);
                              const customerLoanList = loans.filter(l => l.customerId === selectedExistingCustomerId);
                              const activeLoanCount = customerLoanList.filter(l => l.status === 'ACTIVE').length;

                              return (
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                      <span>✓</span> Selected Borrower Profile
                                    </span>
                                    <button
                                      type="button"
                                      onClick={handleClearSelectedCustomerForLoan}
                                      className="text-xs text-money-600 dark:text-money-400 hover:underline font-semibold cursor-pointer"
                                    >
                                      Switch Profile
                                    </button>
                                  </div>

                                  <div className="p-4 rounded-xl bg-white dark:bg-shark-800 border border-slate-200 dark:border-shark-700 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3.5 min-w-0">
                                      <CustomerAvatar customer={selectedCustomer} size="lg" />
                                      <div className="min-w-0">
                                        <h4 className="font-bold text-base text-slate-900 dark:text-white truncate">
                                          {selectedCustomer?.name}
                                        </h4>
                                        <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 dark:text-shark-400 mt-0.5">
                                          {selectedCustomer?.phone && (
                                            <span className="flex items-center gap-1">
                                              <Icons.Phone /> {selectedCustomer.phone}
                                            </span>
                                          )}
                                          {selectedCustomer?.address && (
                                            <span className="flex items-center gap-1 truncate max-w-xs">
                                              <Icons.MapPin /> {selectedCustomer.address}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="shrink-0 text-right">
                                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                        {activeLoanCount} active loan{activeLoanCount === 1 ? '' : 's'}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                                    <span>💡</span>
                                    <span>
                                      This new loan will be added under <strong>{selectedCustomer?.name}</strong> with its own separate date, compounding schedule, and balance.
                                    </span>
                                  </div>
                                </div>
                              );
                            })()
                          ) : (
                            /* Customer Search & Picker */
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-shark-300 mb-1.5">
                                  Select an existing customer:
                                </label>
                                <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <Icons.Search />
                                  </div>
                                  <input
                                    type="text"
                                    placeholder="Search by name, phone or address..."
                                    value={customerPickerSearch}
                                    onChange={(e) => setCustomerPickerSearch(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-shark-800 border border-slate-300 dark:border-shark-600 rounded-xl text-slate-900 dark:text-white focus:border-money-500 outline-none text-sm"
                                  />
                                </div>
                              </div>

                              {customers.length === 0 ? (
                                <div className="text-center py-6 text-slate-400 dark:text-shark-500 text-xs">
                                  <p>No customers recorded yet.</p>
                                  <button
                                    type="button"
                                    onClick={() => setEntryCustomerMode('new')}
                                    className="mt-2 text-money-600 dark:text-money-400 font-bold hover:underline inline-block"
                                  >
                                    Create a New Borrower Profile →
                                  </button>
                                </div>
                              ) : (
                                <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                                  {customers
                                    .filter((c) => {
                                      if (!customerPickerSearch) return true;
                                      const term = customerPickerSearch.toLowerCase();
                                      return (
                                        c.name.toLowerCase().includes(term) ||
                                        (c.phone && c.phone.includes(term)) ||
                                        (c.address && c.address.toLowerCase().includes(term))
                                      );
                                    })
                                    .map((cust) => {
                                      const activeCount = loans.filter((l) => l.customerId === cust.id && l.status === 'ACTIVE').length;
                                      return (
                                        <button
                                          key={cust.id}
                                          type="button"
                                          onClick={() => handleSelectExistingCustomerForLoan(cust.id)}
                                          className="w-full p-3 rounded-xl bg-white dark:bg-shark-800 hover:bg-slate-100 dark:hover:bg-shark-700 border border-slate-200 dark:border-shark-700 flex items-center justify-between gap-3 text-left transition-all group cursor-pointer"
                                        >
                                          <div className="flex items-center gap-3 min-w-0">
                                            <CustomerAvatar customer={cust} size="md" />
                                            <div className="min-w-0">
                                              <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-money-600 dark:group-hover:text-money-400 transition-colors truncate">
                                                {cust.name}
                                              </div>
                                              <div className="text-[11px] text-slate-500 dark:text-shark-400 truncate">
                                                {cust.phone ? cust.phone : cust.address ? cust.address : 'No contact details'}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="shrink-0 flex items-center gap-2">
                                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-shark-900 text-slate-600 dark:text-shark-300 font-medium border border-slate-200 dark:border-shark-700">
                                              {activeCount} active
                                            </span>
                                            <span className="text-xs text-money-600 dark:text-money-400 font-bold group-hover:translate-x-0.5 transition-transform">
                                              Select →
                                            </span>
                                          </div>
                                        </button>
                                      );
                                    })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* MODE 2: CREATE NEW BORROWER PROFILE */}
                      {entryCustomerMode === 'new' && (
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-shark-900 border border-slate-200 dark:border-shark-700 space-y-4">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            {/* Avatar Picker Preview */}
                            <div className="relative shrink-0 flex items-center gap-3">
                              <CustomerAvatar
                                name={formData.customerName}
                                avatar={formData.customerAvatar}
                                size="xl"
                                showHoverZoom={Boolean(formData.customerAvatar)}
                                onClick={() => {
                                  if (formData.customerAvatar) {
                                    setViewingPhotoCustomer({
                                      name: formData.customerName || 'Customer',
                                      avatar: formData.customerAvatar,
                                      address: formData.customerAddress,
                                      phone: formData.customerPhone,
                                    });
                                  }
                                }}
                              />
                              <div className="flex flex-col gap-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => startCamera('user', 'customer_avatar_form')}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-money-600 hover:bg-money-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
                                  >
                                    <Icons.Camera />
                                    <span>Take Photo</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => formAvatarFileInputRef.current?.click()}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-200 dark:bg-shark-700 hover:bg-slate-300 dark:hover:bg-shark-600 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-all active:scale-95 cursor-pointer"
                                  >
                                    <Icons.Upload />
                                    <span>Choose Image</span>
                                  </button>
                                  {formData.customerAvatar && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => setViewingPhotoCustomer({
                                          name: formData.customerName || 'Customer',
                                          avatar: formData.customerAvatar,
                                          address: formData.customerAddress,
                                          phone: formData.customerPhone,
                                        })}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-money-500/10 hover:bg-money-500/20 text-money-600 dark:text-money-400 text-xs font-semibold rounded-lg border border-money-500/30 transition-all active:scale-95 cursor-pointer"
                                      >
                                        <Icons.Eye />
                                        <span>View Photo</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, customerAvatar: '' }))}
                                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors text-xs cursor-pointer"
                                        title="Remove Photo"
                                      >
                                        <Icons.X />
                                      </button>
                                    </>
                                  )}
                                </div>
                                <span className="text-[10px] text-slate-400 dark:text-shark-500">
                                  Attach customer profile picture (optional)
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Customer Name with Datalist */}
                          <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-shark-500 uppercase mb-1">Customer Name *</label>
                            <input
                              list="customer-list"
                              type="text"
                              required
                              value={formData.customerName}
                              onChange={(e) => handleCustomerNameChange(e.target.value)}
                              placeholder="e.g. Tony Spilotro"
                              className="w-full bg-white dark:bg-shark-800 border border-slate-300 dark:border-shark-600 rounded-lg p-3 text-slate-900 dark:text-white focus:border-money-500 outline-none transition-colors text-sm"
                            />
                            <datalist id="customer-list">
                              {customers.map(c => <option key={c.id} value={c.name} />)}
                            </datalist>
                          </div>

                          {/* Customer Address Field */}
                          <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-shark-500 uppercase mb-1">Customer Residential Address</label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <Icons.MapPin />
                              </div>
                              <input
                                type="text"
                                value={formData.customerAddress}
                                onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                                placeholder="e.g. 142 Ocean View Ave, Cape Town"
                                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-shark-800 border border-slate-300 dark:border-shark-600 rounded-lg text-slate-900 dark:text-white focus:border-money-500 outline-none transition-colors text-sm"
                              />
                            </div>
                          </div>

                          {/* Customer Phone Field */}
                          <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-shark-500 uppercase mb-1">Customer Phone Number</label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <Icons.Phone />
                              </div>
                              <input
                                type="tel"
                                value={formData.customerPhone}
                                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                                placeholder="e.g. 082 123 4567"
                                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-shark-800 border border-slate-300 dark:border-shark-600 rounded-lg text-slate-900 dark:text-white focus:border-money-500 outline-none transition-colors text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      )}
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
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-slate-500 dark:text-shark-500 uppercase">Start Date *</label>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Separate Cycle</span>
                        </div>
                        <input
                          type="date"
                          value={formData.startDate}
                          onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-shark-900 border border-slate-300 dark:border-shark-600 rounded-lg p-3 text-slate-900 dark:text-white focus:border-money-500 outline-none transition-colors font-mono"
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
                        onClick={() => handleSaveLoan()}
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

                {/* Interest Rates Explainer Box */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-shark-900 border border-slate-200 dark:border-shark-700 space-y-2 text-xs text-slate-600 dark:text-shark-300">
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white">
                    <span className="text-money-500"><Icons.Lightbulb /></span>
                    <span>How Your Profit Calculations Work:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 bg-white dark:bg-shark-800 rounded-lg border border-slate-200 dark:border-shark-700">
                      <span className="font-bold text-money-600 dark:text-money-400 block mb-1">🏷️ Initial Markup (e.g. {tempSettings.globalInitialInterestRate}%)</span>
                      <span>Added immediately when a loan is issued. For instance, a R1,000 principal at {tempSettings.globalInitialInterestRate}% becomes R{1000 * (1 + (tempSettings.globalInitialInterestRate || 50) / 100)} total starting balance.</span>
                    </div>
                    <div className="p-3 bg-white dark:bg-shark-800 rounded-lg border border-slate-200 dark:border-shark-700">
                      <span className="font-bold text-money-600 dark:text-money-400 block mb-1">📈 Monthly Compounding (e.g. {tempSettings.globalInterestRate}%)</span>
                      <span>After the first 30 days, every additional month compounds an extra {tempSettings.globalInterestRate}% on the outstanding balance.</span>
                    </div>
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

                {/* INTERACTIVE GUIDANCE & HINTS */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-money-500"><Icons.Lightbulb /></span>
                        <h3 className="font-bold text-slate-900 dark:text-white">Interactive Setup Hints & Guidance</h3>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-shark-400 mt-1">
                        Display helpful setup reminders, rate hints, and feature tooltips throughout the app.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setTempSettings({ ...tempSettings, showHints: tempSettings.showHints === false ? true : false })}
                      className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${tempSettings.showHints !== false ? 'bg-money-600' : 'bg-slate-300 dark:bg-shark-600'}`}
                    >
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${tempSettings.showHints !== false ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-shark-900 border border-slate-200 dark:border-shark-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="text-slate-600 dark:text-shark-300">
                      Need a complete interactive walkthrough of rates, customers, AI receipts, and security?
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setWalkthroughStep(0);
                        setShowWalkthroughModal(true);
                      }}
                      className="px-3.5 py-2 rounded-lg bg-money-600 hover:bg-money-500 text-white font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
                    >
                      <Icons.Lightbulb />
                      <span>Launch Interactive Tour</span>
                    </button>
                  </div>
                </div>

                <div className="h-px bg-slate-200 dark:bg-shark-700 my-4"></div>

                {/* 30-DAY CLOUD DATA RECOVERY VAULT CARD */}
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-amber-500"><Icons.Shield /></span>
                        <h3 className="font-bold text-slate-900 dark:text-white">30-Day Cloud Data Recovery Vault</h3>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-shark-400 mt-1">
                        Zero data loss protection: All deleted loans and client records are stored safely for 30 days.
                      </p>
                    </div>

                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full shrink-0">
                      🛡️ Protected
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-shark-900 border border-slate-200 dark:border-shark-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {trashData && trashData.totalCount > 0
                          ? `Currently holding ${trashData.totalCount} recoverable record(s)`
                          : 'Recovery Vault is clean (No deleted records)'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setView('trash')}
                      className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
                    >
                      <Icons.Archive />
                      <span>Open Recovery Vault ({trashData?.totalCount || 0})</span>
                    </button>
                  </div>
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
                    <strong className="block text-shark-800 dark:text-white mb-1">1. Dashboard Overview & Real-Time Tracking</strong>
                    View total deployed capital, accrued interest, and active debt ledgers. Search by borrower name, address, or transaction date.
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-shark-900 rounded-lg border border-slate-200 dark:border-shark-700">
                    <strong className="block text-shark-800 dark:text-white mb-1">2. Creating Entries & Camera OCR</strong>
                    Input records manually or snap paper contracts/handwritten ledgers. Optical recognition extracts names, amounts, and dates automatically.
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-shark-900 rounded-lg border border-slate-200 dark:border-shark-700">
                    <strong className="block text-shark-800 dark:text-white mb-1">3. Customer Profiles & Direct Camera Photos</strong>
                    Store full borrower dossiers with residence addresses and portrait photographs. Tap any photo to zoom in full-screen or download.
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-shark-900 rounded-lg border border-slate-200 dark:border-shark-700">
                    <strong className="block text-shark-800 dark:text-white mb-1">4. Zero-Loss Data Protection & 30-Day Recovery Vault</strong>
                    Deleted records are never immediately erased. They are archived in your secure cloud recovery vault for 30 days and can be restored with 1 click.
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-shark-900 rounded-lg border border-slate-200 dark:border-shark-700">
                    <strong className="block text-shark-800 dark:text-white mb-1">5. Biometric Passkey Security</strong>
                    Protect your financial data by enrolling Touch ID, Face ID, or Windows Hello hardware passkeys.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: 30-DAY CLOUD DATA RECOVERY VAULT (TRASH BIN) */}
          {view === 'trash' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-500/20">
                    <Icons.Shield />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>30-Day Data Recovery Vault</span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-shark-400 mt-0.5">
                      Deleted loans and borrower records are safely held for 30 days before permanent purging.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {trashData && trashData.totalCount > 0 && (
                    <button
                      type="button"
                      onClick={handleRestoreAllTrash}
                      disabled={isRestoringTrash}
                      className="flex-1 sm:flex-none px-4 py-2 bg-money-600 hover:bg-money-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Icons.Undo />
                      <span>Restore Everything ({trashData.totalCount})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setView('dashboard')}
                    className="px-4 py-2 bg-slate-200 dark:bg-shark-800 hover:bg-slate-300 dark:hover:bg-shark-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Back to Overview
                  </button>
                </div>
              </div>

              {/* Status Toast */}
              {trashActionStatus && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold animate-in fade-in duration-200">
                  {trashActionStatus}
                </div>
              )}

              {/* Safety Guarantee Info Banner */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-shark-800/60 border border-slate-200 dark:border-shark-700 flex items-start gap-3">
                <div className="text-money-500 shrink-0 mt-0.5">
                  <Icons.CheckCircle />
                </div>
                <div className="text-xs text-slate-600 dark:text-shark-300 space-y-1">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Cloud Data Protection Active
                  </p>
                  <p>
                    If an entry was deleted accidentally or by mistake, you have a full 30-day window to restore it. 
                    Restoring a loan or borrower immediately brings all historical records, balances, and calculations back onto your dashboard with zero data loss.
                  </p>
                </div>
              </div>

              {/* Deleted Loans Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-shark-500 flex items-center justify-between">
                  <span>Deleted Loan Records ({trashData?.loans?.length || 0})</span>
                </h3>

                <div className="grid gap-3">
                  {trashData?.loans?.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-shark-800 p-4 rounded-2xl border border-slate-200 dark:border-shark-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="p-2.5 bg-red-500/10 text-red-500 rounded-xl shrink-0">
                          <Icons.Clock />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-base text-slate-900 dark:text-white truncate">
                              {item.customerName}
                            </span>
                            <span className="font-mono font-semibold text-money-600 dark:text-money-400 text-sm">
                              {formatCurrency(item.principal)}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-shark-400 flex items-center gap-2 mt-0.5">
                            <span>Started: {formatDate(item.startDate)}</span>
                            <span>•</span>
                            <span>Deleted: {new Date(item.deletedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                          item.daysRemaining > 10
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        }`}>
                          ⏳ {item.daysRemaining} days left to recover
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRestoreLoan(item.id)}
                          disabled={isRestoringTrash}
                          className="px-3 py-1.5 bg-money-600 hover:bg-money-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                          title="Restore this loan record"
                        >
                          <Icons.Undo />
                          <span>Restore</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePermanentlyDeleteLoan(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                          title="Permanently Purge"
                        >
                          <Icons.Trash />
                        </button>
                      </div>
                    </div>
                  ))}

                  {(!trashData?.loans || trashData.loans.length === 0) && (
                    <div className="p-6 text-center text-xs text-slate-400 dark:text-shark-500 bg-white dark:bg-shark-800/40 rounded-2xl border border-slate-200 dark:border-shark-700 border-dashed">
                      No deleted loans in the recovery vault.
                    </div>
                  )}
                </div>
              </div>

              {/* Deleted Customers Section */}
              <div className="space-y-3 pt-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-shark-500">
                  <span>Deleted Borrower Profiles ({trashData?.customers?.length || 0})</span>
                </h3>

                <div className="grid gap-3">
                  {trashData?.customers?.map((cust) => (
                    <div
                      key={cust.id}
                      className="bg-white dark:bg-shark-800 p-4 rounded-2xl border border-slate-200 dark:border-shark-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <CustomerAvatar customer={cust} size="md" />
                        <div className="min-w-0">
                          <h4 className="font-bold text-base text-slate-900 dark:text-white truncate">
                            {cust.name}
                          </h4>
                          {cust.address && (
                            <p className="text-xs text-slate-500 dark:text-shark-400 flex items-center gap-1 truncate">
                              <Icons.MapPin />
                              <span className="truncate">{cust.address}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end shrink-0">
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                          cust.daysRemaining > 10
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        }`}>
                          ⏳ {cust.daysRemaining} days left
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRestoreCustomer(cust.id)}
                          disabled={isRestoringTrash}
                          className="px-3 py-1.5 bg-money-600 hover:bg-money-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                          title="Restore borrower and associated loans"
                        >
                          <Icons.Undo />
                          <span>Restore Borrower</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePermanentlyDeleteCustomer(cust.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                          title="Permanently Purge"
                        >
                          <Icons.Trash />
                        </button>
                      </div>
                    </div>
                  ))}

                  {(!trashData?.customers || trashData.customers.length === 0) && (
                    <div className="p-6 text-center text-xs text-slate-400 dark:text-shark-500 bg-white dark:bg-shark-800/40 rounded-2xl border border-slate-200 dark:border-shark-700 border-dashed">
                      No deleted borrower profiles in the recovery vault.
                    </div>
                  )}
                </div>
              </div>

              {trashData && trashData.totalCount > 0 && (
                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={handleEmptyTrash}
                    className="text-xs text-red-500 hover:text-red-600 font-semibold flex items-center gap-1.5 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                  >
                    <Icons.Trash />
                    <span>Empty Recovery Vault Permanently</span>
                  </button>
                </div>
              )}
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

      {/* iOS PWA & PROFILE INSTALL MODAL */}
      {showIosInstallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-shark-900 border border-slate-200 dark:border-shark-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-money-500/20 text-money-600 dark:text-money-400 flex items-center justify-center mx-auto shadow-inner">
              <Icons.Smartphone />
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Install on iPhone / iPad</h3>
              <p className="text-xs text-slate-500 dark:text-shark-400 mt-1">Get full-screen native access right from your home screen.</p>
            </div>

            {/* Method Switcher Tabs */}
            <div className="flex rounded-xl bg-slate-100 dark:bg-shark-800 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setIosInstallTab('profile')}
                className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                  iosInstallTab === 'profile'
                    ? 'bg-money-600 text-white shadow-md'
                    : 'text-slate-500 dark:text-shark-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                ⚡ 1-Tap Profile (Fast)
              </button>
              <button
                type="button"
                onClick={() => setIosInstallTab('safari')}
                className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
                  iosInstallTab === 'safari'
                    ? 'bg-money-600 text-white shadow-md'
                    : 'text-slate-500 dark:text-shark-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                📤 Safari Share
              </button>
            </div>

            {/* TAB 1: 1-TAP APPLE PROFILE */}
            {iosInstallTab === 'profile' && (
              <div className="space-y-4 text-left">
                <div className="space-y-3 bg-slate-50 dark:bg-shark-800/60 p-4 rounded-2xl border border-slate-200 dark:border-shark-700 text-xs">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-money-500/20 text-money-600 dark:text-money-400 font-bold flex items-center justify-center shrink-0">1</span>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">Download Profile</p>
                      <p className="text-slate-500 dark:text-shark-400">Tap the button below and tap <strong>"Allow"</strong> when prompted.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-money-500/20 text-money-600 dark:text-money-400 font-bold flex items-center justify-center shrink-0">2</span>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">Open iPhone Settings</p>
                      <p className="text-slate-500 dark:text-shark-400">Open <strong>Settings</strong> ➔ Tap <strong>"Profile Downloaded"</strong> at the top.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-money-500/20 text-money-600 dark:text-money-400 font-bold flex items-center justify-center shrink-0">3</span>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">Tap Install</p>
                      <p className="text-slate-500 dark:text-shark-400">Tap <strong>Install</strong> in the top right corner. The app appears on your Home Screen!</p>
                    </div>
                  </div>
                </div>

                <a
                  href="/api/ios-profile"
                  download="MoneyShark.mobileconfig"
                  className="w-full py-3.5 bg-gradient-to-r from-money-600 to-emerald-600 hover:from-money-500 hover:to-emerald-500 active:scale-[0.98] text-white rounded-xl font-bold text-sm shadow-lg shadow-money-900/30 transition-all flex items-center justify-center gap-2 text-center"
                >
                  <span>⚡ Download 1-Tap App Profile</span>
                </a>
              </div>
            )}

            {/* TAB 2: SAFARI SHARE MENU */}
            {iosInstallTab === 'safari' && (
              <div className="space-y-4 text-left">
                <div className="space-y-3 bg-slate-50 dark:bg-shark-800/60 p-4 rounded-2xl border border-slate-200 dark:border-shark-700 text-xs">
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
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowIosInstallModal(false)}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-shark-800 dark:hover:bg-shark-700 text-slate-700 dark:text-shark-300 rounded-xl font-semibold text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* BIOMETRIC ENROLLMENT ONBOARDING PROMPT MODAL */}
      {showBiometricOnboardingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-shark-900 border border-money-500/30 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center space-y-5 animate-in zoom-in-95 duration-200 relative overflow-hidden">
            {/* Glowing Accent */}
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-money-500/20 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none"></div>

            <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-money-500/20 animate-ping opacity-30"></div>
              <div className="w-20 h-20 rounded-2xl bg-money-500/20 border border-money-500/40 flex items-center justify-center text-money-500 dark:text-money-400 shadow-lg shadow-money-500/20">
                <Icons.Fingerprint />
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Enable Biometric Security?</h3>
              <p className="text-xs text-slate-500 dark:text-shark-400 mt-2 leading-relaxed">
                Protect your capital records with <strong>Face ID</strong>, <strong>Touch ID</strong>, or <strong>Windows Hello</strong> for instant, 1-tap zero-password access.
              </p>
            </div>

            {passkeyActionError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-center font-medium">
                {passkeyActionError}
              </div>
            )}

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={handleRegisterDevicePasskey}
                disabled={isRegisteringPasskey}
                className="w-full py-3.5 bg-gradient-to-r from-money-600 to-emerald-600 hover:from-money-500 hover:to-emerald-500 active:scale-[0.98] text-white rounded-xl font-bold text-sm shadow-xl shadow-money-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isRegisteringPasskey ? (
                  <>
                    <span className="animate-spin"><Icons.Refresh /></span>
                    <span>Enrolling Biometrics...</span>
                  </>
                ) : (
                  <>
                    <Icons.Fingerprint />
                    <span>Enable Biometric Passkey</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDismissBiometricOnboarding}
                className="w-full py-2.5 bg-transparent hover:bg-slate-100 dark:hover:bg-shark-800 text-slate-500 dark:text-shark-400 hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Maybe Later
              </button>
            </div>

            <div className="text-[10px] text-slate-400 dark:text-shark-500 flex items-center justify-center gap-1 pt-1">
              <Icons.Shield />
              <span>You can always toggle this later in Settings.</span>
            </div>
          </div>
        </div>
      )}

      {/* LOAN INSTALLMENT LEDGER MODAL */}
      <PaymentModal
        isOpen={Boolean(paymentModalLoan)}
        onClose={() => setPaymentModalLoan(null)}
        loan={paymentModalLoan}
        customer={paymentModalLoan ? getCustomer(paymentModalLoan.customerId) || null : null}
        calculations={
          paymentModalLoan
            ? calculateLoanDetails(
                paymentModalLoan,
                settings.globalInitialInterestRate,
                settings.globalInterestRate,
                repayments
              )
            : null
        }
        repayments={repayments}
        onRecordPayment={handleRecordPayment}
        onDeletePayment={handleDeletePayment}
      />

      {/* DUPLICATE / EXISTING CUSTOMER CONFIRMATION MODAL */}
      <DuplicateCustomerModal
        isOpen={Boolean(duplicateCustomerPrompt)}
        matchingCustomer={duplicateCustomerPrompt?.matchingCustomer || null}
        newLoanDetails={
          duplicateCustomerPrompt
            ? {
                principal: duplicateCustomerPrompt.loanPayload.principal,
                startDate: duplicateCustomerPrompt.loanPayload.startDate,
                notes: duplicateCustomerPrompt.loanPayload.notes,
              }
            : null
        }
        existingLoans={
          duplicateCustomerPrompt
            ? loans.filter((l) => l.customerId === duplicateCustomerPrompt.matchingCustomer.id)
            : []
        }
        repayments={repayments}
        settings={settings}
        onConfirmAddToExisting={() => {
          if (duplicateCustomerPrompt) {
            handleSaveLoan({ customerId: duplicateCustomerPrompt.matchingCustomer.id });
          }
        }}
        onConfirmCreateSeparate={() => {
          handleSaveLoan({ forceNewCustomer: true });
        }}
        onClose={() => setDuplicateCustomerPrompt(null)}
      />
    </div>
  );
}