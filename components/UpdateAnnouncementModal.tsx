import React, { useEffect } from 'react';

interface UpdateAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UpdateAnnouncementModal: React.FC<UpdateAnnouncementModalProps> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-announcement-title"
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-shark-900 rounded-3xl border border-slate-200 dark:border-shark-750 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-money-500 to-teal-400" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-3 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-money-500/10 text-money-600 dark:text-money-400 border border-money-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-money-500 animate-pulse" />
              <span>New Features & Updates</span>
            </div>
            <h3
              id="update-announcement-title"
              className="text-xl font-bold text-slate-900 dark:text-white"
            >
              What's New in Money-Shark
            </h3>
            <p className="text-xs text-slate-500 dark:text-shark-400">
              Here is a quick summary of what was updated. You can dismiss this anytime.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-shark-800 transition-colors cursor-pointer shrink-0"
            aria-label="Close announcement"
            title="Dismiss announcement"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Updates Body */}
        <div className="px-5 sm:px-6 py-2 overflow-y-auto space-y-3">
          {/* Update 1 */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-shark-850 border border-slate-100 dark:border-shark-750 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 text-base font-bold">
              ➕
            </div>
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Add Loan from Closed Records
              </h4>
              <p className="text-xs text-slate-600 dark:text-shark-300 leading-relaxed">
                When a returning client comes back after full repayment, click <strong>"Add Loan"</strong> directly on their closed record card—no need to create a new profile from scratch.
              </p>
            </div>
          </div>

          {/* Update 2 */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-shark-850 border border-slate-100 dark:border-shark-750 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 text-base font-bold">
              👥
            </div>
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Dedicated Client List
              </h4>
              <p className="text-xs text-slate-600 dark:text-shark-300 leading-relaxed">
                Borrower profiles now stay permanently saved in your database even after loans are repaid. Switch between <strong>All</strong>, <strong>Active</strong>, and <strong>Fully Repaid</strong> tabs anytime.
              </p>
            </div>
          </div>

          {/* Update 3 */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-shark-850 border border-slate-100 dark:border-shark-750 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 text-base font-bold">
              🛡️
            </div>
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Optional 6-Month Inactivity Archive
              </h4>
              <p className="text-xs text-slate-600 dark:text-shark-300 leading-relaxed">
                In Settings, optionally turn on auto-removal for clients with 0 active loans and over 6 months without activity. Records move safely to your <strong>30-Day Recovery Vault</strong> (off by default).
              </p>
            </div>
          </div>

          {/* Update 4 */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-shark-850 border border-slate-100 dark:border-shark-700 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 text-base font-bold">
              🔀
            </div>
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Permanent Sorting Preferences
              </h4>
              <p className="text-xs text-slate-600 dark:text-shark-300 leading-relaxed">
                Your loan and client arrangement choices (Alphabetical, Highest Balance, Compounding Soonest, Newest) now stay saved permanently across page refreshes and logins.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 sm:p-6 pt-4 border-t border-slate-100 dark:border-shark-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-shark-900/50">
          <span className="text-[11px] text-slate-400 dark:text-shark-500">
            Active for next 24 hours
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-700 active:bg-emerald-900 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-950/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span>Got it, let's work</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
