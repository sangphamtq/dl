export type NavIconName =
  | "home"
  | "compass"
  | "map"
  | "community"
  | "account"
  | "search"
  | "menu"
  | "bell"
  | "checkin"
  | "route"
  | "overview"
  | "spot"
  | "experience"
  | "food"
  | "stay";

const OUTLINE: Record<NavIconName, React.ReactNode> = {
  home: (
    <>
      <path d="M3.6 10.9 12 4.2l8.4 6.7" />
      <path d="M5.7 9.6v9.2a1.9 1.9 0 0 0 1.9 1.9h8.8a1.9 1.9 0 0 0 1.9-1.9V9.6" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="8.3" />
      <path d="M15.7 8.3 13.4 13.4 8.3 15.7l2.3-5.1 5.1-2.3Z" />
    </>
  ),
  map: (
    <>
      <path d="M9 4.6 3.7 6.8v12.6L9 17.2l6 2.2 5.3-2.2V5.4L15 7.6 9 4.6Z" />
      <path d="M9 4.6v12.6" />
      <path d="M15 7.6v11.8" />
    </>
  ),
  community: (
    <>
      <path d="M3 12.6V8.2a3.6 3.6 0 0 1 3.6-3.6h10.8A3.6 3.6 0 0 1 21 8.2v4.4a3.6 3.6 0 0 1-3.6 3.6h-6L6.9 20.05a.6.6 0 0 1-.99-.52l.69-3.33A3.6 3.6 0 0 1 3 12.6Z" />
      <circle cx="8.2" cy="10.4" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="12" cy="10.4" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="15.8" cy="10.4" r="1.05" fill="currentColor" stroke="none" />
    </>
  ),
  account: (
    <>
      <circle cx="12" cy="8.5" r="3.75" />
      <path d="M5.4 20a6.6 6.6 0 0 1 13.2 0" />
    </>
  ),
  search: (
    <>
      <circle cx="10.9" cy="10.9" r="6.6" />
      <path d="M15.8 15.8 20.2 20.2" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7.2h16" />
      <path d="M4 12h13" />
      <path d="M4 16.8h16" />
    </>
  ),
  bell: (
    <>
      <path d="M6.4 16.1V9.9a5.6 5.6 0 0 1 11.2 0v6.2" />
      <path d="M4.7 16.1h14.6" />
      <path d="M10.1 18.9a2.05 2.05 0 0 0 3.8 0" />
    </>
  ),
  checkin: (
    <>
      <path d="M12 20.6 6.6 14.2a6.6 6.6 0 1 1 10.8 0L12 20.6Z" />
      <path d="m9.4 10.4 1.9 1.9 3.3-3.5" />
    </>
  ),
  route: (
    <>
      <circle cx="6.4" cy="6.5" r="2.3" />
      <circle cx="17.6" cy="17.5" r="2.3" />
      <path d="M8.7 6.5h3.1a2.75 2.75 0 0 1 0 5.5h-1.7a2.75 2.75 0 0 0 0 5.5h5.2" />
    </>
  ),
  overview: (
    <>
      <rect x="4.2" y="4.2" width="6.2" height="6.2" rx="1.6" />
      <rect x="13.6" y="4.2" width="6.2" height="6.2" rx="1.6" />
      <rect x="4.2" y="13.6" width="6.2" height="6.2" rx="1.6" />
      <rect x="13.6" y="13.6" width="6.2" height="6.2" rx="1.6" />
    </>
  ),
  spot: (
    <>
      <path d="M12 20.6 6.6 14.2a6.6 6.6 0 1 1 10.8 0L12 20.6Z" />
      <circle cx="12" cy="10.3" r="2.4" />
    </>
  ),
  experience: (
    <>
      <path d="M10.6 5.2A9.2 9.2 0 0 0 18.6 13.2 9.2 9.2 0 0 0 10.6 21.2 9.2 9.2 0 0 0 2.6 13.2 9.2 9.2 0 0 0 10.6 5.2Z" />
      <path d="M18.6 2.8A3.3 3.3 0 0 0 21.4 5.6 3.3 3.3 0 0 0 18.6 8.4 3.3 3.3 0 0 0 15.8 5.6 3.3 3.3 0 0 0 18.6 2.8Z" />
    </>
  ),
  food: (
    <>
      <path d="M3.4 12.2h17.2a8.6 8.6 0 0 1-17.2 0Z" />
      <path d="m9.1 9.8 7.9-5.4" />
      <path d="m12 10.9 7.9-5.4" />
    </>
  ),
  stay: (
    <>
      <path d="M3.4 4.6v15.4" />
      <path d="M3.4 9.4h14.9a2.3 2.3 0 0 1 2.3 2.3V20" />
      <path d="M3.4 16.3h17.2" />
      <path d="M7.6 9.4v6.9" />
    </>
  ),
};

const FILLED: Record<NavIconName, React.ReactNode> = {
  home: (
    <path d="M11.06 3.28a1.5 1.5 0 0 1 1.88 0l8.4 6.7a1 1 0 0 1-1.12 1.4l-.42-.33v7.35a2.7 2.7 0 0 1-2.7 2.7H6.9a2.7 2.7 0 0 1-2.7-2.7v-7.35l-.42.33a1 1 0 0 1-1.12-1.4l8.4-6.7Z" />
  ),
  compass: (
    <path
      fillRule="evenodd"
      d="M12 3.7a8.3 8.3 0 1 0 0 16.6 8.3 8.3 0 0 0 0-16.6Zm3.7 4.6-2.3 5.1-5.1 2.3 2.3-5.1 5.1-2.3Z"
    />
  ),
  map: (
    <>
      <path d="M8.55 4.8 3.5 6.9v12.35l5.05-2.05V4.8Z" />
      <path d="M9.45 5.1 14.55 7.5v11.85l-5.1-2.15V5.1Z" />
      <path d="M15.45 7.75 20.5 5.65V18l-5.05 2.05V7.75Z" />
    </>
  ),
  community: (
    <path
      fillRule="evenodd"
      d="M3 12.6V8.2a3.6 3.6 0 0 1 3.6-3.6h10.8A3.6 3.6 0 0 1 21 8.2v4.4a3.6 3.6 0 0 1-3.6 3.6h-6L6.9 20.05a.6.6 0 0 1-.99-.52l.69-3.33A3.6 3.6 0 0 1 3 12.6Zm5.2-3.25a1.05 1.05 0 1 0 0 2.1 1.05 1.05 0 0 0 0-2.1Zm3.8 0a1.05 1.05 0 1 0 0 2.1 1.05 1.05 0 0 0 0-2.1Zm3.8 0a1.05 1.05 0 1 0 0 2.1 1.05 1.05 0 0 0 0-2.1Z"
    />
  ),
  account: (
    <>
      <circle cx="12" cy="8.5" r="4" />
      <path d="M5.2 20.4a6.8 6.8 0 0 1 13.6 0 .9.9 0 0 1-.9.9H6.1a.9.9 0 0 1-.9-.9Z" />
    </>
  ),
  search: (
    <>
      <circle cx="10.9" cy="10.9" r="6.9" />
      <path d="M16.4 15.1a1.1 1.1 0 0 0-1.56 1.56l3.4 3.4a1.1 1.1 0 0 0 1.56-1.56Z" />
    </>
  ),
  menu: (
    <>
      <rect x="4" y="6.2" width="16" height="2" rx="1" />
      <rect x="4" y="11" width="13" height="2" rx="1" />
      <rect x="4" y="15.8" width="16" height="2" rx="1" />
    </>
  ),
  bell: (
    <>
      <path d="M12 3.5a6.2 6.2 0 0 0-6.2 6.2v5.45H4.9a.95.95 0 0 0 0 1.9h14.2a.95.95 0 0 0 0-1.9h-.9V9.7A6.2 6.2 0 0 0 12 3.5Z" />
      <path d="M9.9 19.05a2.1 2.1 0 0 0 4.2 0Z" />
    </>
  ),
  checkin: (
    <path
      fillRule="evenodd"
      d="M12 20.6 6.6 14.2a6.6 6.6 0 1 1 10.8 0L12 20.6Zm2.03-12.57a.95.95 0 0 1 1.34 1.34l-4.05 4.05a.95.95 0 0 1-1.34 0l-1.9-1.9a.95.95 0 0 1 1.34-1.34l1.23 1.23 3.38-3.38Z"
    />
  ),
  route: (
    <>
      <circle cx="6.4" cy="6.5" r="2.7" />
      <circle cx="17.6" cy="17.5" r="2.7" />
      <path
        d="M8.7 6.5h3.1a2.75 2.75 0 0 1 0 5.5h-1.7a2.75 2.75 0 0 0 0 5.5h5.2"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </>
  ),
  overview: (
    <>
      <rect x="4" y="4" width="6.6" height="6.6" rx="1.8" />
      <rect x="13.4" y="4" width="6.6" height="6.6" rx="1.8" />
      <rect x="4" y="13.4" width="6.6" height="6.6" rx="1.8" />
      <rect x="13.4" y="13.4" width="6.6" height="6.6" rx="1.8" />
    </>
  ),
  spot: (
    <path
      fillRule="evenodd"
      d="M12 20.6 6.6 14.2a6.6 6.6 0 1 1 10.8 0L12 20.6Zm0-13.2a2.9 2.9 0 1 0 0 5.8 2.9 2.9 0 0 0 0-5.8Z"
    />
  ),
  experience: (
    <>
      <path d="M10.6 5.2A9.2 9.2 0 0 0 18.6 13.2 9.2 9.2 0 0 0 10.6 21.2 9.2 9.2 0 0 0 2.6 13.2 9.2 9.2 0 0 0 10.6 5.2Z" />
      <path d="M18.6 2.8A3.3 3.3 0 0 0 21.4 5.6 3.3 3.3 0 0 0 18.6 8.4 3.3 3.3 0 0 0 15.8 5.6 3.3 3.3 0 0 0 18.6 2.8Z" />
    </>
  ),
  food: (
    <>
      <path d="M3.4 12.2h17.2a8.6 8.6 0 0 1-17.2 0Z" />
      <path
        d="m9.1 9.8 7.9-5.4M12 10.9l7.9-5.4"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.9}
        strokeLinecap="round"
      />
    </>
  ),
  stay: (
    <g fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.4 4.6v15.4" />
      <path d="M3.4 9.4h14.9a2.3 2.3 0 0 1 2.3 2.3V20" />
      <path d="M3.4 16.3h17.2" />
      <path d="M7.6 9.4v6.9" />
    </g>
  ),
};

export function NavIcon({
  name,
  active,
  className,
}: {
  name: NavIconName;
  active: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      focusable="false"
      {...(active
        ? { fill: "currentColor" }
        : {
            fill: "none",
            stroke: "currentColor",
            strokeWidth: 1.7,
            strokeLinecap: "round" as const,
            strokeLinejoin: "round" as const,
          })}
    >
      {active ? FILLED[name] : OUTLINE[name]}
    </svg>
  );
}
