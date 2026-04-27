"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Props {
  children: string;
}

export default function Markdown({ children }: Props) {
  return (
    <div className="cd-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p style={{ margin: "0 0 8px 0", lineHeight: 1.65 }}>{children}</p>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#f97316", textDecoration: "underline", textUnderlineOffset: 2 }}
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul style={{ margin: "4px 0 8px 0", paddingLeft: 20, lineHeight: 1.65 }}>{children}</ul>
          ),
          ol: ({ children }) => (
            <ol style={{ margin: "4px 0 8px 0", paddingLeft: 20, lineHeight: 1.65 }}>{children}</ol>
          ),
          li: ({ children }) => (
            <li style={{ marginBottom: 2 }}>{children}</li>
          ),
          code: ({ children, ...rest }) => {
            const inline = !(rest as { className?: string }).className;
            if (inline) {
              return (
                <code
                  style={{
                    background: "#f5f1eb",
                    padding: "1px 6px",
                    borderRadius: 4,
                    fontSize: "0.9em",
                    fontFamily: "var(--font-jetbrains-mono), monospace",
                    color: "#1c1917",
                  }}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                style={{
                  display: "block",
                  background: "#1c1917",
                  color: "#fafaf9",
                  padding: "10px 12px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  overflowX: "auto",
                  margin: "6px 0",
                }}
              >
                {children}
              </code>
            );
          },
          strong: ({ children }) => (
            <strong style={{ fontWeight: 700 }}>{children}</strong>
          ),
          em: ({ children }) => (
            <em style={{ fontStyle: "italic" }}>{children}</em>
          ),
          h1: ({ children }) => (
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: "8px 0 4px 0" }}>{children}</h3>
          ),
          h2: ({ children }) => (
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: "8px 0 4px 0" }}>{children}</h3>
          ),
          h3: ({ children }) => (
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: "8px 0 4px 0" }}>{children}</h3>
          ),
          blockquote: ({ children }) => (
            <blockquote
              style={{
                borderLeft: "3px solid #e7e2d9",
                paddingLeft: 10,
                margin: "6px 0",
                color: "#78716c",
                fontStyle: "italic",
              }}
            >
              {children}
            </blockquote>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
