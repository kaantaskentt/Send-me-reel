"use client";

import { usePathname } from "next/navigation";
import { Home, CheckSquare, MessageSquare, User } from "lucide-react";
import { useTheme } from "@/lib/theme";

interface Props {
  onProfileTap: () => void;
  isPremium?: boolean;
}

export default function MobileBottomNav({ onProfileTap, isPremium }: Props) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const ORANGE   = "#f97316";
  const INACTIVE = "#a8a29e";
  const BG       = isDark ? "rgba(10,10,10,0.94)"   : "rgba(250,248,245,0.94)";
  const BORDER   = isDark ? "rgba(255,255,255,0.08)" : "#e7e2d9";

  const tabs = [
    { id: "feed",    label: "Feed",    Icon: Home,          href: "/dashboard", match: "/dashboard" },
    { id: "tasks",   label: "Tasks",   Icon: CheckSquare,   href: "/tasks",     match: "/tasks"     },
    { id: "chat",    label: "Chat",    Icon: MessageSquare, href: "/chat",      match: "/chat"      },
    { id: "profile", label: "Profile", Icon: User,          href: null,         match: null         },
  ] as const;

  return (
    <>
      <style>{`@media (min-width: 1024px) { .cd-bottom-nav { display: none !important; } }`}</style>
      <nav
        className="cd-bottom-nav"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          zIndex: 60,
          display: "flex", alignItems: "stretch",
          background: BG,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderTop: `1px solid ${BORDER}`,
          paddingBottom: "env(safe-area-inset-bottom)",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.match ? pathname === tab.match : false;
          const color = isActive ? ORANGE : INACTIVE;
          const showDot = tab.id === "chat" && !isPremium;

          const content = (
            <>
              <div style={{ position: "relative", display: "inline-flex" }}>
                <tab.Icon style={{ width: 22, height: 22 }} />
                {showDot && (
                  <span style={{
                    position: "absolute", top: -2, right: -2,
                    width: 7, height: 7, borderRadius: "50%",
                    background: ORANGE, border: `1.5px solid ${BG}`,
                  }} />
                )}
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, marginTop: 3, lineHeight: 1 }}>
                {tab.label}
              </span>
            </>
          );

          const sharedStyle: React.CSSProperties = {
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "10px 0 8px", color,
            background: "none", border: "none", cursor: "pointer",
            textDecoration: "none", transition: "color 0.15s",
          };

          if (tab.id === "profile") {
            return <button key="profile" onClick={onProfileTap} style={sharedStyle}>{content}</button>;
          }
          return <a key={tab.id} href={tab.href!} style={sharedStyle}>{content}</a>;
        })}
      </nav>
    </>
  );
}
