"use client";

import { Search } from "lucide-react";

interface Props { value: string; onChange: (v: string) => void; }

export default function SearchBar({ value, onChange }: Props) {
  return (
    <div style={{ position: "relative", fontFamily: "'DM Sans', sans-serif" }}>
      <Search style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "#c4bdb5", pointerEvents: "none" }} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search your feed…"
        style={{ width: "100%", paddingLeft: 40, paddingRight: 16, paddingTop: 10, paddingBottom: 10, fontSize: 13, background: "#fff", border: "1px solid #e7e2d9", borderRadius: 12, outline: "none", color: "#1c1917", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box", transition: "border-color 0.15s" }}
        onFocus={(e) => (e.target.style.borderColor = "#f97316")}
        onBlur={(e) => (e.target.style.borderColor = "#e7e2d9")}
      />
    </div>
  );
}
