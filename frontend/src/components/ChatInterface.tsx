"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Plus, MessageSquare, Trash2, ChevronLeft, ChevronRight, Crown } from "lucide-react";
import { chatApi } from "@/lib/api";
import MessageBubble from "./MessageBubble";
import type { Message, Conversation, UserRole } from "@/types";

interface ChatInterfaceProps {
  role: UserRole;
  username: string;
  isAuthenticated: boolean;
  onOpenAuth?: (mode: "login" | "signup") => void;
}

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: `Hello. I'm **Ryuji** — your AI assistant.

I'm here for:
- **Questions** — complex or simple, I'll give you a straight answer
- **Code** — debugging, architecture, any language
- **Writing** — creative, technical, or somewhere between
- **Productivity** — systems, automation, clear thinking

What are you working on?`,
};

const CREATOR_WELCOME: Message = {
  id: "welcome-creator",
  role: "assistant",
  content: `Welcome back, **neporrex**.

Creator access is active. You have full system visibility and elevated capabilities.

What would you like to work on today?`,
};

export default function ChatInterface({
  role,
  username,
  isAuthenticated,
  onOpenAuth,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    role === "creator" ? CREATOR_WELCOME : WELCOME_MESSAGE,
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | undefined>();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [limitInfo, setLimitInfo] = useState<{ remaining: number; limit: number } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isAuthenticated) {
      chatApi.getConversations().then(setConversations).catch(() => {});
    }
  }, [isAuthenticated]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };

    const pendingMsg: Message = {
      id: "pending",
      role: "assistant",
      content: "",
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, pendingMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await chatApi.sendMessage(text, activeConvId);
      setActiveConvId(res.conversation_id);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === "pending"
            ? { id: res.message_id, role: "assistant", content: res.reply }
            : m
        )
      );

      // Refresh conversations
      if (isAuthenticated) {
        chatApi.getConversations().then(setConversations).catch(() => {});
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Something went wrong";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === "pending"
            ? {
                id: "error",
                role: "assistant",
                content: errMsg.includes("limit")
                  ? `Daily limit reached. ${isAuthenticated ? "Upgrade your plan or come back tomorrow." : "Create a free account for more messages."}`
                  : `An error occurred: ${errMsg}`,
              }
            : m
        )
      );
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const loadConversation = async (conv: Conversation) => {
    try {
      const msgs = await chatApi.getMessages(conv.id);
      const formatted: Message[] = msgs.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
      setMessages(formatted.length ? formatted : [WELCOME_MESSAGE]);
      setActiveConvId(conv.id);
      setSidebarOpen(false);
    } catch {
      // silently fail
    }
  };

  const startNewChat = () => {
    setMessages([role === "creator" ? CREATOR_WELCOME : WELCOME_MESSAGE]);
    setActiveConvId(undefined);
    setSidebarOpen(false);
  };

  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await chatApi.deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConvId === convId) startNewChat();
    } catch {}
  };

  const adjustTextarea = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  };

  return (
    <div className="flex h-full relative">
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      {isAuthenticated && (
        <>
          {/* Sidebar backdrop */}
          {sidebarOpen && (
            <div
              className="absolute inset-0 z-10 sm:hidden"
              style={{ background: "rgba(0,0,0,0.5)" }}
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <div
            className={`
              absolute sm:relative z-20 h-full flex flex-col
              transition-all duration-300 ease-in-out
              ${sidebarOpen ? "w-64" : "w-0 sm:w-12"}
            `}
            style={{
              borderRight: "1px solid var(--glass-border)",
              background: "rgba(5,5,7,0.6)",
              backdropFilter: "blur(20px)",
              overflow: "hidden",
            }}
          >
            {/* Sidebar header */}
            <div
              className="flex items-center justify-between p-3 flex-shrink-0"
              style={{ borderBottom: "1px solid var(--glass-border)", minHeight: "52px" }}
            >
              {sidebarOpen && (
                <span
                  className="text-xs tracking-widest font-semibold"
                  style={{ color: "var(--gold)", fontFamily: "var(--font-display)" }}
                >
                  HISTORY
                </span>
              )}
              <button
                className="btn-ghost p-1 ml-auto"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                title={sidebarOpen ? "Collapse" : "Expand"}
              >
                {sidebarOpen ? <ChevronLeft size={15} /> : <ChevronRight size={15} />}
              </button>
            </div>

            {sidebarOpen && (
              <>
                {/* New chat */}
                <div className="p-2 flex-shrink-0">
                  <button
                    onClick={startNewChat}
                    className="w-full btn-secondary"
                    style={{ fontSize: "12px", padding: "7px 12px", justifyContent: "flex-start" }}
                  >
                    <Plus size={13} />
                    New Chat
                  </button>
                </div>

                {/* Conversation list */}
                <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
                  {conversations.length === 0 ? (
                    <p className="text-xs p-2" style={{ color: "var(--text-muted)" }}>
                      No conversations yet
                    </p>
                  ) : (
                    conversations.map((conv) => (
                      <div
                        key={conv.id}
                        className={`sidebar-item group ${activeConvId === conv.id ? "active" : ""}`}
                        onClick={() => loadConversation(conv)}
                      >
                        <MessageSquare size={12} className="flex-shrink-0" />
                        <span className="flex-1 truncate text-xs">
                          {conv.title || "Untitled"}
                        </span>
                        <button
                          onClick={(e) => deleteConversation(conv.id, e)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ color: "var(--text-muted)" }}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Creator badge */}
                {role === "creator" && (
                  <div
                    className="p-3 flex-shrink-0"
                    style={{ borderTop: "1px solid var(--glass-border)" }}
                  >
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: "var(--gold-dim)" }}>
                      <Crown size={12} style={{ color: "var(--gold)" }} />
                      <span className="text-xs" style={{ color: "var(--gold)" }}>
                        Creator Access
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* ── Main chat area ────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto px-4 py-6"
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Guest CTA */}
        {!isAuthenticated && messages.length >= 4 && (
          <div
            className="mx-4 mb-3 px-4 py-3 rounded-xl text-sm flex items-center justify-between gap-4 animate-fade-in"
            style={{
              background: "rgba(201,162,39,0.08)",
              border: "1px solid var(--gold-border)",
            }}
          >
            <span style={{ color: "var(--text-secondary)" }}>
              Create a free account for unlimited history & more messages
            </span>
            <button
              onClick={() => onOpenAuth?.("signup")}
              className="btn-primary flex-shrink-0"
              style={{ padding: "6px 14px", fontSize: "12px" }}
            >
              Sign Up Free
            </button>
          </div>
        )}

        {/* Input area */}
        <div
          className="px-4 pb-4 pt-2 flex-shrink-0"
          style={{ borderTop: "1px solid var(--glass-border)" }}
        >
          <div
            className="glass rounded-2xl flex items-end gap-2 p-2"
            style={{ border: "1px solid var(--glass-border)" }}
          >
            {/* Sidebar toggle (mobile) */}
            {isAuthenticated && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="btn-ghost p-2 flex-shrink-0 sm:hidden"
              >
                <MessageSquare size={16} />
              </button>
            )}

            {/* Textarea */}
            <textarea
              ref={inputRef}
              className="flex-1 resize-none outline-none text-sm leading-relaxed"
              style={{
                background: "transparent",
                color: "var(--text-primary)",
                fontFamily: "var(--font-body)",
                fontSize: "15px",
                minHeight: "40px",
                maxHeight: "160px",
                padding: "8px 4px",
              }}
              placeholder="Ask Ryuji anything…"
              value={input}
              onChange={adjustTextarea}
              onKeyDown={handleKeyDown}
              rows={1}
            />

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
              style={{
                background: input.trim() && !loading
                  ? "linear-gradient(135deg, #9a7a1a, #c9a227)"
                  : "rgba(255,255,255,0.06)",
                color: input.trim() && !loading ? "#050507" : "var(--text-muted)",
                boxShadow: input.trim() && !loading ? "0 0 12px rgba(201,162,39,0.3)" : "none",
                cursor: input.trim() && !loading ? "pointer" : "not-allowed",
              }}
            >
              <Send size={15} />
            </button>
          </div>

          <p
            className="text-center text-xs mt-2"
            style={{ color: "var(--text-muted)" }}
          >
            Ryuji can make mistakes. Verify important information.
            {!isAuthenticated && " · "}
            {!isAuthenticated && (
              <button
                onClick={() => onOpenAuth?.("login")}
                style={{ color: "var(--gold)", textDecoration: "underline" }}
              >
                Sign in
              </button>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
