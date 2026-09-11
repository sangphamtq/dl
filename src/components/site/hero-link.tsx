import Link from "next/link";
import { cn } from "@/lib/utils";
import { R_CTRL } from "@/lib/radius";

export function HeroLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        R_CTRL,
        "group relative inline-flex h-12 items-center px-6 text-xs font-semibold uppercase tracking-[0.16em] text-white shadow-[0_10px_28px_-10px_rgba(8,22,15,0.75)] backdrop-blur-[2px] backdrop-saturate-[1.3] [text-shadow:0_1px_3px_rgba(8,22,15,0.6),0_2px_16px_rgba(8,22,15,0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:text-[0.8125rem]",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(R_CTRL, "pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.22] via-white/[0.07] to-white/[0.02] transition-colors duration-200 group-hover:from-white/40 group-hover:via-white/20 group-hover:to-white/10 motion-reduce:transition-none")}
      />
      <span
        aria-hidden
        className={cn(R_CTRL, "pointer-events-none absolute inset-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),inset_0_-1px_0_rgba(255,255,255,0.18)] ring-1 ring-inset ring-white/40 transition-shadow duration-200 group-hover:ring-white/75 motion-reduce:transition-none")}
      />
      <span className="relative">{label}</span>
    </Link>
  );
}
