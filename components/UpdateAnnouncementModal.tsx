import React, { useState, useEffect } from 'react';

interface UpdateAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UpdateItem {
  id: string;
  icon: string;
  title: string;
  shortSummary: string;
  details: string;
}

const UPDATES: UpdateItem[] = [
  {
    id: 'closed-loan',
    icon: '➕',
    title: 'Add Loan from Closed Records',
    shortSummary: 'Re-lend to past borrowers with 1 click',
    details:
      'When a returning client comes back after full repayment, tap "Add Loan" directly on their closed record card. The new loan is created under their existing profile without re-entering their details.',
  },
  {
    id: 'client-list',
    icon: '👥',
    title: 'Dedicated Client List',
    shortSummary: 'Client profiles stay saved permanently',
    details:
      'Borrower profiles now stay permanently stored in your database even after loans are 100% repaid. Quickly filter between All, Active, and Fully Repaid clients in the side menu.',
  },
  {
    id: 'inactivity-vault',
    icon: '🛡️',
    title: '6-Month Inactivity Archive',
    shortSummary: 'Optional auto-cleanup in Settings',
    details:
      'In Settings, you can optionally enable auto-removal for clients with 0 active loans and no activity for >6 months. Records safely move to the 30-Day Recovery Vault (turned OFF by default).',
  },
  {
    id: 'sort-persistence',
    icon: '🔀',
    title: 'Permanent Sorting Preferences',
    shortSummary: 'Arrangement stays saved across refreshes',
    details:
      'Your sorting choices for loans (Highest Balance, Soonest, Newest, A–Z) and clients now stay saved permanently on your device and cloud account.',
  },
];

export const UpdateAnnouncementModal: React.FC<UpdateAnnouncementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-[2px] animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-summary-title"
    >
      {/* Compact Pop Up Window (max-w-sm) */}
      <div
        className="relative w-full max-w-sm bg-white dark:bg-shark-900 rounded-2xl border border-slate-200 dark:border-shark-750 shadow-xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Top Emerald Line */}
        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-money-500 to-teal-400" />

        {/* Compact Header */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-shark-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">✨</span>
            <div>
              <h3 id="update-summary-title" className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                Updates Summary
              </h3>
              <p className="text-[10px] text-slate-400 dark:text-shark-500">
                Tap any bullet point to read details
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-shark-800 transition-colors cursor-pointer"
            aria-label="Close"
            title="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Expandable Bullet Points */}
        <div className="p-3 space-y-1.5 max-h-[60vh] overflow-y-auto">
          {UPDATES.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                className="rounded-xl border border-slate-100 dark:border-shark-800/80 bg-slate-50/70 dark:bg-shark-850/60 overflow-hidden transition-all"
              >
                {/* Bullet Point Header / Toggle Button */}
                <button
                  type="button"
                  onClick={() => toggleExpand(item.id)}
                  className="w-full px-3 py-2 text-left flex items-center justify-between gap-2.5 hover:bg-slate-100/60 dark:hover:bg-shark-800/80 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs shrink-0 select-none">{item.icon}</span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-money-600 dark:group-hover:text-money-400">
                      {item.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 text-slate-400 dark:text-shark-500">
                    <span className="text-[10px] hidden sm:inline text-slate-400">
                      {isExpanded ? 'Less' : 'More'}
                    </span>
                    <svg
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180 text-money-500' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="px-3 pb-2.5 pt-0.5 text-[11px] text-slate-600 dark:text-shark-300 leading-relaxed border-t border-slate-100 dark:border-shark-800/60 animate-in fade-in duration-150">
                    <p>{item.details}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Compact Footer */}
        <div className="px-4 py-2.5 border-t border-slate-100 dark:border-shark-800 flex items-center justify-end bg-slate-50/50 dark:bg-shark-950/40">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-700 active:bg-emerald-900 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
