"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import {
  Send, Plus, MessageSquare, Trash2, LogOut,
  LayoutDashboard, Crown, ChevronLeft, Menu, X,
  Sparkles, Code2, PenLine, Zap
} from "lucide-react";
import { getToken, getStoredRole, getStoredUsername, authApi, chatApi, clearToken } from "@/lib/api";
import AuthModal from "@/components/AuthModal";
import type { UserRole, Message, Conversation } from "@/types";

const ConstellationCanvas = dynamic(() => import("@/components/ConstellationCanvas"), { ssr: false });

const WELCOME: Message = { id: "w", role: "assistant", content: "Hello. What are you working on?" };
const WELCOME_CREATOR: Message = { id: "wc", role: "assistant", content: "Welcome back, **neporrex**. Creator access is active — full depth enabled." };

const SUGGESTIONS = [
  { icon: Code2,    label: "Debug my code",        prompt: "Help me debug this code:" },
  { icon: PenLine,  label: "Write something",       prompt: "Help me write:" },
  { icon: Sparkles, label: "Explain a concept",     prompt: "Explain this to me:" },
  { icon: Zap,      label: "Automate a task",       prompt: "Help me automate:" },
];

function Dots() {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center", padding: "2px 0" }}>
      {[0,1,2].map(i => (
        <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--gold)", display: "inline-block", animation: `dot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
      ))}
    </span>
  );
}

function Avatar() {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
      background: "linear-gradient(135deg, #7a5f10, #c9a227)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 11, fontWeight: 700, color: "#0d0d0d",
      fontFamily: "var(--font)", letterSpacing: "0.05em",
      boxShadow: "0 0 0 1px rgba(201,162,39,0.2)",
    }}>R</div>
  );
}

export default function Page() {
  const [hydrated, setHydrated]     = useState(false);
  const [isAuth, setIsAuth]         = useState(false);
  const [role, setRole]             = useState<UserRole>("guest");
  const [username, setUsername]     = useState("");
  const [authModal, setAuthModal]   = useState<"login"|"signup"|null>(null);
  const [messages, setMessages]     = useState<Message[]>([WELCOME]);
  const [input, setInput]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [convs, setConvs]           = useState<Conversation[]>([]);
  const [activeId, setActiveId]     = useState<string|undefined>();
  const [sidebar, setSidebar]       = useState(false);
  const [mobileSidebar, setMobile]  = useState(false);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const taRef       = useRef<HTMLTextAreaElement>(null);

  const welcome = useCallback((r: UserRole) => r === "creator" ? WELCOME_CREATOR : WELCOME, []);

  useEffect(() => {
    setHydrated(true);
    const token = getToken();
    if (token) {
      const r = getStoredRole() as UserRole;
      const u = getStoredUsername();
      setIsAuth(true); setRole(r); setUsername(u);
      setMessages([welcome(r)]);
      setSidebar(true);
      authApi.me().catch(() => { setIsAuth(false); setRole("guest"); setSidebar(false); });
      chatApi.getConversations().then(setConvs).catch(() => {});
    }
  }, [welcome]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const refreshConvs = () => chatApi.getConversations().then(setConvs).catch(() => {});

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: msg };
    const pending: Message = { id: "pending", role: "assistant", content: "", isStreaming: true };
    setMessages(p => [...p, userMsg, pending]);
    setInput("");
    if (taRef.current) { taRef.current.style.height = "auto"; }
    setLoading(true);
    try {
      const res = await chatApi.sendMessage(msg, activeId);
      setActiveId(res.conversation_id);
      setMessages(p => p.map(m => m.id === "pending" ? { id: res.message_id, role: "assistant", content: res.reply } : m));
      if (isAuth) refreshConvs();
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : "Something went wrong";
      setMessages(p => p.map(m => m.id === "pending"
        ? { id: "err", role: "assistant", content: err.includes("limit") ? "You've hit the daily limit. Sign in or come back tomorrow." : `⚠️ ${err}` }
        : m));
    } finally { setLoading(false); setTimeout(() => taRef.current?.focus(), 50); }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const resize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };

  const logout = () => { clearToken(); window.location.reload(); };

  const loadConv = async (c: Conversation) => {
    try {
      const msgs = await chatApi.getMessages(c.id);
      setMessages(msgs.map(m => ({ id: m.id, role: m.role as "user"|"assistant", content: m.content })));
      setActiveId(c.id);
      setMobile(false);
    } catch {}
  };

  const newChat = () => {
    setMessages([welcome(role)]);
    setActiveId(undefined);
    setMobile(false);
    setTimeout(() => taRef.current?.focus(), 100);
  };

  const delConv = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await chatApi.deleteConversation(id).catch(() => {});
    setConvs(p => p.filter(c => c.id !== id));
    if (activeId === id) newChat();
  };

  const onAuthSuccess = (r: string, u: string) => {
    setIsAuth(true); setRole(r as UserRole); setUsername(u);
    setMessages([welcome(r as UserRole)]);
    setAuthModal(null); setSidebar(true);
    chatApi.getConversations().then(setConvs).catch(() => {});
  };

  const isEmpty = messages.length === 1 && (messages[0].id === "w" || messages[0].id === "wc");

  if (!hydrated) return (
    <div style={{ background: "var(--bg)", height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Dots />
    </div>
  );

  /* ── Sidebar content ── */
  const SidebarContent = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "12px 8px" }}>
      {/* Logo */}
      <div style={{ padding: "4px 8px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "var(--font)", fontSize: 13, fontWeight: 600, color: "var(--gold)", letterSpacing: "0.12em" }}>RYUJI</span>
        <button onClick={() => { setSidebar(false); setMobile(false); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 4, borderRadius: 6, display: "flex" }}>
          <ChevronLeft size={14} />
        </button>
      </div>

      {/* New chat */}
      <button onClick={newChat} style={{
        display: "flex", alignItems: "center", gap: 8, padding: "9px 12px",
        background: "var(--bg-3)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)", color: "var(--text-2)", fontSize: 13,
        cursor: "pointer", marginBottom: 16, width: "100%", fontFamily: "var(--font)",
        transition: "all 0.15s",
      }}
        onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-1)"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-3)"; e.currentTarget.style.color = "var(--text-2)"; }}
      >
        <Plus size={13} />
        New chat
      </button>

      {/* Conversations */}
      {convs.length > 0 && (
        <>
          <div style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "0 8px", marginBottom: 4 }}>Recent</div>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1 }}>
            {convs.map(c => (
              <div key={c.id} onClick={() => loadConv(c)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                  borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: 12,
                  color: activeId === c.id ? "var(--gold-light)" : "var(--text-2)",
                  background: activeId === c.id ? "var(--gold-dim)" : "transparent",
                  transition: "all 0.12s",
                  overflow: "hidden",
                }}
                onMouseEnter={e => { if (activeId !== c.id) e.currentTarget.style.background = "var(--bg-hover)"; }}
                onMouseLeave={e => { if (activeId !== c.id) e.currentTarget.style.background = "transparent"; }}
              >
                <MessageSquare size={11} style={{ flexShrink: 0, opacity: 0.6 }} />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title || "Untitled"}</span>
                <button onClick={e => delConv(c.id, e)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 2, flexShrink: 0, display: "flex", opacity: 0, transition: "opacity 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "0")}
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Bottom user info */}
      <div style={{ marginTop: "auto", paddingTop: 12, borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 4 }}>
        {role === "creator" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "var(--gold-dim)", borderRadius: "var(--radius-sm)", marginBottom: 4 }}>
            <Crown size={11} style={{ color: "var(--gold)" }} />
            <span style={{ fontSize: 11, color: "var(--gold)", fontWeight: 500 }}>Creator access</span>
          </div>
        )}
        <div style={{ padding: "0 10px", fontSize: 12, color: "var(--text-3)", marginBottom: 4 }}>{username}</div>
        {(role === "admin" || role === "creator") && (
          <Link href="/admin" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: "var(--radius-sm)", color: "var(--text-2)", fontSize: 12, textDecoration: "none", transition: "all 0.12s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--text-1)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-2)"; }}
          >
            <LayoutDashboard size={12} /> Dashboard
          </Link>
        )}
        <button onClick={logout} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: "var(--radius-sm)", color: "var(--text-2)", fontSize: 12, background: "none", border: "none", cursor: "pointer", width: "100%", fontFamily: "var(--font)", transition: "all 0.12s" }}
          onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-1)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-2)"; }}
        >
          <LogOut size={12} /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100dvh", background: "var(--bg)", overflow: "hidden", position: "relative" }}>
      <ConstellationCanvas />

      {/* ── Desktop Sidebar ── */}
      <div style={{
        width: sidebar ? "var(--sidebar-w)" : 0,
        flexShrink: 0, overflow: "hidden",
        transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)",
        borderRight: sidebar ? "1px solid var(--border)" : "none",
        background: "rgba(11,11,11,0.97)",
        position: "relative", zIndex: 20,
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ width: "var(--sidebar-w)", height: "100%" }}>
          {isAuth ? <SidebarContent /> : null}
        </div>
      </div>

      {/* ── Mobile Sidebar overlay ── */}
      {mobileSidebar && isAuth && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} onClick={() => setMobile(false)} />
          <div style={{ width: 260, background: "rgba(11,11,11,0.99)", borderRight: "1px solid var(--border)", position: "relative", zIndex: 1, animation: "fadeIn 0.2s ease" }}>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* ── Main ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative", zIndex: 10 }}>

        {/* Header */}
        <header style={{
          height: 52, display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "0 16px",
          borderBottom: "1px solid var(--border)",
          background: "rgba(13,13,13,0.9)", backdropFilter: "blur(16px)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Sidebar toggle */}
            <button
              onClick={() => { if (window.innerWidth < 640) setMobile(m => !m); else setSidebar(s => !s); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: "6px", borderRadius: 7, display: "flex", transition: "color 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--text-1)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
            >
              {mobileSidebar ? <X size={16} /> : <Menu size={16} />}
            </button>

            {!sidebar && (
              <span style={{ fontFamily: "var(--font)", fontSize: 13, fontWeight: 600, color: "var(--gold)", letterSpacing: "0.12em" }}>RYUJI</span>
            )}
          </div>

          {/* Right side */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isAuth ? (
              <span style={{ fontSize: 12, color: "var(--text-3)", letterSpacing: "0.02em" }}>{username}</span>
            ) : (
              <>
                <button onClick={() => setAuthModal("login")} style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-2)", fontSize: 12, cursor: "pointer", padding: "6px 14px", fontFamily: "var(--font)", transition: "all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; e.currentTarget.style.color = "var(--text-1)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-2)"; }}
                >
                  Sign in
                </button>
                <button onClick={() => setAuthModal("signup")} style={{ background: "var(--gold)", border: "none", borderRadius: "var(--radius-sm)", color: "#0d0d0d", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "6px 14px", fontFamily: "var(--font)", transition: "filter 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.1)")}
                  onMouseLeave={e => (e.currentTarget.style.filter = "brightness(1)")}
                >
                  Sign up
                </button>
              </>
            )}
          </div>
        </header>

        {/* Messages area */}
        <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>
          {isEmpty ? (
            /* ── Empty state ── */
            <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 20px", gap: 32, animation: "fadeIn 0.5s ease" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#7a5f10,#c9a227)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#0d0d0d", margin: "0 auto 16px", boxShadow: "0 0 0 1px rgba(201,162,39,0.2), 0 8px 24px rgba(201,162,39,0.15)" }}>R</div>
                <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--text-1)", marginBottom: 6, letterSpacing: "-0.01em" }}>
                  {role === "creator" ? `Welcome back, neporrex` : "How can I help you?"}
                </h1>
                <p style={{ fontSize: 14, color: "var(--text-3)" }}>
                  {role === "creator" ? "Creator access active." : "Ask anything. Code, write, think."}
                </p>
              </div>

              {/* Suggestion chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 480 }}>
                {SUGGESTIONS.map(({ icon: Icon, label, prompt }) => (
                  <button key={label} onClick={() => { setInput(prompt); taRef.current?.focus(); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 7, padding: "9px 14px",
                      background: "var(--bg-2)", border: "1px solid var(--border)",
                      borderRadius: 100, color: "var(--text-2)", fontSize: 12,
                      cursor: "pointer", fontFamily: "var(--font)", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-3)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "var(--text-1)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-2)"; e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-2)"; }}
                  >
                    <Icon size={12} style={{ color: "var(--gold)", opacity: 0.8 }} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ── Messages ── */
            <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 16px", display: "flex", flexDirection: "column", gap: 28 }}>
              {messages.map((msg) => (
                <div key={msg.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", animation: "in 0.25s ease forwards", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  {msg.role === "assistant" && <Avatar />}
                  <div style={{
                    maxWidth: msg.role === "user" ? "75%" : "82%",
                    padding: msg.role === "user" ? "10px 14px" : "3px 0",
                    background: msg.role === "user" ? "var(--bg-3)" : "transparent",
                    border: msg.role === "user" ? "1px solid var(--border)" : "none",
                    borderRadius: msg.role === "user" ? "var(--radius-lg) var(--radius-lg) 6px var(--radius-lg)" : 0,
                    fontSize: 14, lineHeight: 1.75,
                    color: "var(--text-1)",
                  }}>
                    {msg.isStreaming ? <Dots /> :
                      msg.role === "assistant" ? (
                        <div className="md"><ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown></div>
                      ) : msg.content
                    }
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div style={{ padding: "12px 20px 20px", background: "rgba(13,13,13,0.95)", backdropFilter: "blur(16px)", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
          {/* Guest banner */}
          {!isAuth && !isEmpty && (
            <div style={{ maxWidth: 720, margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", background: "rgba(201,162,39,0.05)", border: "1px solid rgba(201,162,39,0.12)", borderRadius: "var(--radius-sm)", fontSize: 12 }}>
              <span style={{ color: "var(--text-3)" }}>Sign in to save conversations and unlock more messages</span>
              <button onClick={() => setAuthModal("signup")} style={{ background: "none", border: "none", color: "var(--gold)", fontSize: 12, cursor: "pointer", fontFamily: "var(--font)", fontWeight: 500, whiteSpace: "nowrap" }}>
                Sign up free →
              </button>
            </div>
          )}

          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{
              display: "flex", alignItems: "flex-end", gap: 10,
              background: "var(--bg-2)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)", padding: "10px 12px",
              transition: "border-color 0.2s",
            }}
              onFocus={() => {}}
              onBlur={() => {}}
            >
              <textarea
                ref={taRef}
                value={input}
                onChange={resize}
                onKeyDown={handleKey}
                placeholder="Message Ryuji…"
                rows={1}
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  color: "var(--text-1)", fontSize: 14, fontFamily: "var(--font)",
                  resize: "none", lineHeight: 1.65, minHeight: 22, maxHeight: 160,
                  paddingTop: 1,
                }}
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                style={{
                  width: 32, height: 32, borderRadius: 9, border: "none", flexShrink: 0,
                  background: input.trim() && !loading ? "var(--gold)" : "var(--bg-3)",
                  color: input.trim() && !loading ? "#0d0d0d" : "var(--text-3)",
                  cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.18s",
                  boxShadow: input.trim() && !loading ? "0 0 16px rgba(201,162,39,0.25)" : "none",
                }}
              >
                <Send size={13} />
              </button>
            </div>
            <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-3)", marginTop: 8, letterSpacing: "0.01em" }}>
              Ryuji can make mistakes · Created by <span style={{ color: "rgba(201,162,39,0.5)" }}>neporrex</span>
            </p>
          </div>
        </div>
      </div>

      {authModal && (
        <AuthModal mode={authModal} onClose={() => setAuthModal(null)} onSuccess={onAuthSuccess} onSwitchMode={setAuthModal} />
      )}
    </div>
  );
}
