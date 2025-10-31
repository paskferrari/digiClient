"use client";
import * as React from "react";

type IconProps = {
  size?: number;
  className?: string;
} & React.SVGProps<SVGSVGElement>;

const base = (size?: number) => ({
  width: size ?? 18,
  height: size ?? 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export function MailIcon({ size, className, ...rest }: IconProps) {
  return (
    <svg {...base(size)} className={className} {...rest}>
      <path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <path d="m22 6-10 7L2 6" />
    </svg>
  );
}

export function LockIcon({ size, className, ...rest }: IconProps) {
  return (
    <svg {...base(size)} className={className} {...rest}>
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function EyeIcon({ size, className, ...rest }: IconProps) {
  return (
    <svg {...base(size)} className={className} {...rest}>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function EyeOffIcon({ size, className, ...rest }: IconProps) {
  return (
    <svg {...base(size)} className={className} {...rest}>
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.91 21.91 0 0 1 6.05-6.09" />
      <path d="M9.88 9.88A3 3 0 0 0 12 15a3 3 0 0 0 2.12-5.12" />
      <path d="M1 1l22 22" />
    </svg>
  );
}

export function UserIcon({ size, className, ...rest }: IconProps) {
  return (
    <svg {...base(size)} className={className} {...rest}>
      <circle cx="12" cy="7" r="4" />
      <path d="M5.5 21a8.5 8.5 0 0 1 13 0" />
    </svg>
  );
}

export function PhoneIcon({ size, className, ...rest }: IconProps) {
  return (
    <svg {...base(size)} className={className} {...rest}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.1 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.77.62 2.61a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.47-1.17a2 2 0 0 1 2.11-.45c.84.29 1.71.5 2.61.62A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export function BuildingIcon({ size, className, ...rest }: IconProps) {
  return (
    <svg {...base(size)} className={className} {...rest}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M7 7h2v2H7zM11 7h2v2h-2zM15 7h2v2h-2z" />
      <path d="M7 11h2v2H7zM11 11h2v2h-2zM15 11h2v2h-2z" />
      <path d="M7 15h2v2H7zM11 15h2v2h-2zM15 15h2v2h-2z" />
    </svg>
  );
}

export function NoteIcon({ size, className, ...rest }: IconProps) {
  return (
    <svg {...base(size)} className={className} {...rest}>
      <path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <path d="M13 3v6h6" />
      <path d="M9 13h6M9 17h6" />
    </svg>
  );
}

export function SearchIcon({ size, className, ...rest }: IconProps) {
  return (
    <svg {...base(size)} className={className} {...rest}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

export function AlertCircleIcon({ size, className, ...rest }: IconProps) {
  return (
    <svg {...base(size)} className={className} {...rest}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v5" />
      <path d="M12 16h.01" />
    </svg>
  );
}

export function InfoIcon({ size, className, ...rest }: IconProps) {
  return (
    <svg {...base(size)} className={className} {...rest}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8h.01" />
      <path d="M11 12h2v4h-2" />
    </svg>
  );
}

export function ChevronDownIcon({ size, className, ...rest }: IconProps) {
  return (
    <svg {...base(size)} className={className} {...rest}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function ChevronUpIcon({ size, className, ...rest }: IconProps) {
  return (
    <svg {...base(size)} className={className} {...rest}>
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

export function ChevronRightIcon({ size, className, ...rest }: IconProps) {
  return (
    <svg {...base(size)} className={className} {...rest}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export function CheckIcon({ size, className, ...rest }: IconProps) {
  return (
    <svg {...base(size)} className={className} {...rest}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function XIcon({ size, className, ...rest }: IconProps) {
  return (
    <svg {...base(size)} className={className} {...rest}>
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

export function AlertTriangleIcon({ size, className, ...rest }: IconProps) {
  return (
    <svg {...base(size)} className={className} {...rest}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export default {
  MailIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  UserIcon,
  PhoneIcon,
  BuildingIcon,
  NoteIcon,
  SearchIcon,
  AlertCircleIcon,
  InfoIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronRightIcon,
  CheckIcon,
  XIcon,
  AlertTriangleIcon,
};