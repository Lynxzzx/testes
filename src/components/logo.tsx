import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-violet-500 text-white shadow-sm",
        className
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-4" aria-hidden>
        <path d="M7 3h7l5 5v13H7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M10 13h6M10 17h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <LogoMark />
      <span>
        Proposta<span className="text-brand">AI</span>
      </span>
    </Link>
  );
}
