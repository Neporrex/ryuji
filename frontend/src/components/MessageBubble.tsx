"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import type { Message } from "@/types";

// Custom dark theme for code blocks
const ryujiCodeTheme = {
  ...oneDark,
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    background: "rgba(0,0,0,0.7)",
    margin: 0,
    borderRadius: "0 0 10px 10px",
    fontSize: "13px",
    fontFamily: "var(--font-mono)",
  },
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    fontFamily: "var(--font-mono)",
  },
};

interface CodeBlockProps {
  language?: string;
  children?: string;
}

function CodeBlock({ language, children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const code = String(children || "").replace(/\n$/, "");

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="rounded-xl overflow-hidden my-3"
      style={{ border: "1px solid rgba(201,162,39,0.15)" }}
    >
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{
          background: "rgba(0,0,0,0.5)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <span
          className="text-xs font-mono"
          style={{ color: "var(--text-muted)", letterSpacing: "0.05em" }}
        >
          {language || "code"}
        </span>
        <button
          onClick={copy}
          className="btn-ghost p-1"
          style={{ fontSize: "11px", gap: "4px", display: "flex", alignItems: "center" }}
        >
          {copied ? <Check size={12} style={{ color: "var(--gold)" }} /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        style={ryujiCodeTheme as Record<string, React.CSSProperties>}
        language={language || "text"}
        PreTag="div"
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isStreaming = message.isStreaming;

  if (isUser) {
    return (
      <div className="flex justify-end animate-slide-up">
        <div className="bubble-user">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start animate-slide-up">
      <div className="flex gap-3 max-w-[85%]">
        {/* Ryuji avatar */}
        <div
          className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold mt-1"
          style={{
            background: "linear-gradient(135deg, #9a7a1a, #c9a227)",
            color: "#050507",
            fontFamily: "var(--font-display)",
            boxShadow: "0 0 8px rgba(201,162,39,0.3)",
          }}
        >
          R
        </div>

        <div className="bubble-assistant">
          {isStreaming ? (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <div className="loading-dots">
                <span /><span /><span />
              </div>
            </div>
          ) : (
            <div className="md-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    const isBlock = String(children).includes("\n");
                    if (isBlock || match) {
                      return (
                        <CodeBlock language={match?.[1]}>
                          {String(children)}
                        </CodeBlock>
                      );
                    }
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
