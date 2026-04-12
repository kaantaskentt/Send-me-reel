"use client";

/**
 * ContextDrop Custom Icon System (from Manus)
 */

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

const defaults = { size: 20, color: "#F97316" };

export function IconSignal({ size = defaults.size, color = defaults.color, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <rect x="2" y="16" width="4" height="5" rx="1" fill={color} opacity="0.4" />
      <rect x="8" y="11" width="4" height="10" rx="1" fill={color} opacity="0.65" />
      <rect x="14" y="6" width="4" height="15" rx="1" fill={color} opacity="0.85" />
      <rect x="20" y="2" width="4" height="19" rx="1" fill={color} />
    </svg>
  );
}

export function IconBrain({ size = defaults.size, color = defaults.color, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M12 5C12 3.895 11.105 3 10 3C8.895 3 8 3.895 8 5C6.343 5 5 6.343 5 8C3.895 8 3 8.895 3 10C3 11.105 3.895 12 5 12C5 13.657 6.343 15 8 15C8 16.105 8.895 17 10 17C11.105 17 12 16.105 12 15" />
      <path d="M12 5C12 3.895 12.895 3 14 3C15.105 3 16 3.895 16 5C17.657 5 19 6.343 19 8C20.105 8 21 8.895 21 10C21 11.105 20.105 12 19 12C19 13.657 17.657 15 16 15C16 16.105 15.105 17 14 17C12.895 17 12 16.105 12 15" />
      <line x1="12" y1="5" x2="12" y2="15" />
      <path d="M8.5 9.5C8.5 9.5 9.5 10.5 10.5 9.5" />
      <path d="M13.5 9.5C13.5 9.5 14.5 10.5 15.5 9.5" />
      <line x1="9" y1="20" x2="15" y2="20" strokeWidth="1.5" opacity="0.5" />
      <line x1="12" y1="17" x2="12" y2="20" strokeWidth="1.5" />
    </svg>
  );
}

export function IconLightning({ size = defaults.size, color = defaults.color, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <path d="M13 2L4.5 13.5H11.5L10 22L20 10H13L13 2Z" fill={color} />
    </svg>
  );
}

export function IconCheck({ size = defaults.size, color = defaults.color, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <circle cx="12" cy="12" r="9.25" stroke={color} strokeWidth="1.5" />
      <path d="M7.5 12L10.5 15L16.5 9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconDashboard({ size = defaults.size, color = defaults.color, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} style={style}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" fill={color} opacity="0.9" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" fill={color} opacity="0.6" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" fill={color} opacity="0.6" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" fill={color} opacity="0.35" />
    </svg>
  );
}

export function IconEye({ size = defaults.size, color = defaults.color, className, style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      <path d="M1 12C1 12 5 5 12 5C19 5 23 12 23 12C23 12 19 19 12 19C5 19 1 12 1 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
