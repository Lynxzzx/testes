import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand via-indigo-600 to-violet-600 text-white shadow-sm ring-1 ring-brand/20",
        className
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-4" aria-hidden>
        <path
          d="M6 4.5h7.2a4.8 4.8 0 0 1 0 9.6H9.5V19.5H6V4.5Z"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <circle cx="17.5" cy="17.5" r="2.2" fill="currentColor" />
      </svg>
    </span>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}
    >
      <LogoMark />
      <span className="text-[17px]">
        Propo<span className="text-brand">z</span>
      </span>
    </Link>
  );
}
