import React from 'react';

// Helper: Extract uppercase initials from customer name
export function getCustomerInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Helper: Deterministic gradient for avatar fallback
export function getAvatarGradient(name: string): string {
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

export interface CustomerAvatarProps {
  customer?: { name?: string; avatar?: string; address?: string } | null;
  name?: string;
  avatar?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  showHoverZoom?: boolean;
}

export const CustomerAvatar: React.FC<CustomerAvatarProps> = ({
  customer,
  name,
  avatar,
  size = 'md',
  className = '',
  onClick,
  showHoverZoom = false,
}) => {
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
          className={`${sizeClasses} rounded-full object-cover border-2 border-emerald-500/40 shadow-sm transition-transform duration-200 group-hover/avatar:scale-105`}
        />
        {showHoverZoom && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center rounded-full text-white backdrop-blur-[1px]">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
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
};
