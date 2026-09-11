import Image from "next/image";
import { LoadingFlag } from "./loading-flag";

export function PageLoading() {
  return (
    <>
      <LoadingFlag />
      <div
        className="page-loading grid min-h-svh flex-1 place-items-center"
        role="status"
        aria-label="Đang tải trang"
      >
        <div className="relative grid size-[5.5rem] place-items-center">
          <svg
            aria-hidden
            viewBox="0 0 48 48"
            className="absolute inset-0 size-full animate-spin [animation-duration:1.4s] motion-reduce:animate-none"
          >
            <defs>
              <linearGradient
                id="page-loading-arc"
                gradientUnits="userSpaceOnUse"
                x1="46"
                y1="24"
                x2="21"
                y2="46"
              >
                <stop offset="0%" stopColor="var(--brand)" />
                <stop offset="100%" stopColor="var(--warm)" />
              </linearGradient>
            </defs>
            <circle
              cx="24"
              cy="24"
              r="22"
              fill="none"
              strokeWidth="1.5"
              className="stroke-border"
            />
            <circle
              cx="24"
              cy="24"
              r="22"
              fill="none"
              stroke="url(#page-loading-arc)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray="38 100"
            />
          </svg>
          <Image
            src="/logo_mark.png"
            alt=""
            width={48}
            height={56}
            priority
            className="h-12 w-auto"
          />
        </div>
      </div>
    </>
  );
}
