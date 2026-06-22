import { useLocation, useNavigate } from "react-router-dom";

const TABS = [
  { path: "/home", label: "홈" },
  { path: "/transfer", label: "이체" },
  { path: "/chat", label: "AI채팅" },
  { path: "/history", label: "내역" },
];

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8Z"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TransferIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M7 7h12M19 7l-3.5-3.5M19 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 17H5M5 17l3.5-3.5M5 17l3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {active && <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.08" />}
    </svg>
  );
}

function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HistoryIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M4 6h16M4 12h10M4 18h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {active && <circle cx="20" cy="18" r="2" fill="currentColor" />}
    </svg>
  );
}

const ICONS: Record<string, (active: boolean) => JSX.Element> = {
  "/home": (active) => <HomeIcon active={active} />,
  "/transfer": (active) => <TransferIcon active={active} />,
  "/chat": (active) => <ChatIcon active={active} />,
  "/history": (active) => <HistoryIcon active={active} />,
};

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="bottom-nav" aria-label="주요 메뉴">
      {TABS.map((tab) => {
        const isActive = location.pathname === tab.path;
        return (
          <button
            key={tab.path}
            className={`bottom-nav__item${isActive ? " active" : ""}`}
            onClick={() => navigate(tab.path)}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="bottom-nav__icon">{ICONS[tab.path](isActive)}</span>
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}