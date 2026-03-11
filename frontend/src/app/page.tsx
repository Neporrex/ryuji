"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import {
  Send, Plus, MessageSquare, Trash2, LogOut,
  LayoutDashboard, Crown, Menu, X,
  Sparkles, Code2, PenLine, Zap,
  Copy, Check, ThumbsUp, ThumbsDown, RefreshCw,
  Eye, EyeOff, UserPlus, LogIn
} from "lucide-react";
import { getToken, getStoredRole, getStoredUsername, getIsPro, getStoredPlan, authApi, chatApi, billingApi, clearToken, setToken } from "@/lib/api";
import type { UserRole, Message, Conversation } from "@/types";

function UpgradeWall({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const upgrade = async () => {
    setLoading(true);
    try { const { url } = await billingApi.checkout(); window.location.href = url; }
    catch { window.location.href = "/pricing"; }
    finally { setLoading(false); }
  };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }} onClick={onClose} />
      <div style={{ position: "relative", background: "var(--bg-2)", border: "1px solid rgba(201,162,39,0.25)", borderRadius: 20, padding: "36px 32px", maxWidth: 400, width: "100%", textAlign: "center", boxShadow: "0 0 60px rgba(201,162,39,0.08)", animation: "in 0.25s ease" }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: "var(--gold-dim)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Zap size={20} style={{ color: "var(--gold)" }} />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "var(--text-1)" }}>Daily limit reached</h2>
        <p style={{ fontSize: 14, color: "var(--text-3)", marginBottom: 24, lineHeight: 1.6 }}>
          You've used all your free messages for today.<br />Upgrade to Pro for unlimited access.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={upgrade} disabled={loading} style={{ padding: "11px", background: "var(--gold)", border: "none", borderRadius: 10, color: "#0d0d0d", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font)", boxShadow: "0 0 20px rgba(201,162,39,0.2)" }}>
            {loading ? "Loading…" : "Upgrade to Pro — $9.99/mo"}
          </button>
          <Link href="/pricing" style={{ fontSize: 13, color: "var(--text-3)", textDecoration: "none" }} onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "var(--text-1)")} onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "var(--text-3)")}>
            See all plans →
          </Link>
        </div>
        <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 16 }}>Or wait until tomorrow — limit resets at midnight.</p>
      </div>
    </div>
  );
}

const ConstellationCanvas = dynamic(() => import("@/components/ConstellationCanvas"), { ssr: false });

const WELCOME: Message = { id: "w", role: "assistant", content: "Hello. What are you working on?" };
const WELCOME_CREATOR: Message = { id: "wc", role: "assistant", content: "Welcome back, **neporrex**. Creator access is active." };

const SUGGESTIONS = [
  { icon: Code2,    label: "Debug my code",     prompt: "Help me debug this code:\n\n" },
  { icon: PenLine,  label: "Write something",    prompt: "Help me write:\n\n" },
  { icon: Sparkles, label: "Explain a concept",  prompt: "Explain this concept to me:\n\n" },
  { icon: Zap,      label: "Automate a task",    prompt: "Help me automate this task:\n\n" },
];

function Dots() {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center", padding: "4px 0" }}>
      {[0,1,2].map(i => (
        <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--gold)", display: "inline-block", animation: `dot 1.2s ease-in-out ${i*0.2}s infinite` }} />
      ))}
    </span>
  );
}

function Avatar() {
  return (
    <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: "linear-gradient(135deg,#7a5f10,#c9a227)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#0d0d0d", fontFamily: "var(--font)", boxShadow: "0 0 0 1px rgba(201,162,39,0.2)" }}>R</div>
  );
}

interface MsgActionsProps {
  content: string;
  onRegen: () => void;
  isLast: boolean;
}
function MsgActions({ content, onRegen, isLast }: MsgActionsProps) {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<null|"up"|"down">(null);

  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const btnStyle: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: "4px 6px", borderRadius: 6, display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontFamily: "var(--font)", transition: "all 0.15s" };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 8, opacity: 0, transition: "opacity 0.2s" }} className="msg-actions">
      <button style={{ ...btnStyle, color: copied ? "var(--gold)" : "var(--text-3)" }} onClick={copy}
        onMouseEnter={e => (e.currentTarget.style.color = "var(--text-1)")}
        onMouseLeave={e => (e.currentTarget.style.color = copied ? "var(--gold)" : "var(--text-3)")}
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
      {isLast && (
        <button style={btnStyle} onClick={onRegen}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text-1)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
        >
          <RefreshCw size={13} />
        </button>
      )}
      <button style={{ ...btnStyle, color: liked === "up" ? "var(--gold)" : "var(--text-3)" }} onClick={() => setLiked(l => l === "up" ? null : "up")}
        onMouseEnter={e => (e.currentTarget.style.color = "var(--text-1)")}
        onMouseLeave={e => (e.currentTarget.style.color = liked === "up" ? "var(--gold)" : "var(--text-3)")}
      >
        <ThumbsUp size={13} />
      </button>
      <button style={{ ...btnStyle, color: liked === "down" ? "#f87171" : "var(--text-3)" }} onClick={() => setLiked(l => l === "down" ? null : "down")}
        onMouseEnter={e => (e.currentTarget.style.color = "var(--text-1)")}
        onMouseLeave={e => (e.currentTarget.style.color = liked === "down" ? "#f87171" : "var(--text-3)")}
      >
        <ThumbsDown size={13} />
      </button>
    </div>
  );
}

// ── Inline Auth Panel ──────────────────────────────────────────────────────────
interface AuthPanelProps {
  mode: "login"|"signup";
  onSuccess: (role: string, username: string, plan?: string) => void;
  onSwitch: (m: "login"|"signup") => void;
  onClose: () => void;
}
function AuthPanel({ mode, onSuccess, onSwitch, onClose }: AuthPanelProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (!username || !password) { setError("Fill in all fields"); return; }
    if (mode === "signup" && !email) { setError("Email is required"); return; }
    setLoading(true);
    try {
      const { authApi, setToken } = await import("@/lib/api");
      let res;
      if (mode === "signup") res = await authApi.signup(username, email, password);
      else res = await authApi.login(username, password);
      setToken(res.access_token, res.role, res.username, res.plan || "free");
      onSuccess(res.role, res.username, res.plan || "free");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally { setLoading(false); }
  };

  const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-1)", fontSize: 13, outline: "none", fontFamily: "var(--font)", transition: "border-color 0.2s" };

  return (
    <div style={{ width: 320, borderLeft: "1px solid var(--border)", background: "rgba(11,11,11,0.98)", padding: "20px", display: "flex", flexDirection: "column", gap: 16, flexShrink: 0, animation: "fadeIn 0.2s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 10, color: "var(--gold)", letterSpacing: "0.15em", marginBottom: 3 }}>RYUJI</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-1)" }}>{mode === "login" ? "Welcome back" : "Create account"}</div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 4, display: "flex" }}>
          <X size={15} />
        </button>
      </div>

      {error && (
        <div style={{ fontSize: 12, padding: "8px 12px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8, color: "#fca5a5" }}>{error}</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.08em" }}>USERNAME</label>
          <input style={inp} value={username} onChange={e => setUsername(e.target.value)} placeholder="your_username" autoFocus
            onFocus={e => (e.target.style.borderColor = "rgba(201,162,39,0.4)")}
            onBlur={e => (e.target.style.borderColor = "var(--border)")}
            onKeyDown={e => e.key === "Enter" && submit()}
          />
        </div>
        {mode === "signup" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.08em" }}>EMAIL</label>
            <input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
              onFocus={e => (e.target.style.borderColor = "rgba(201,162,39,0.4)")}
              onBlur={e => (e.target.style.borderColor = "var(--border)")}
              onKeyDown={e => e.key === "Enter" && submit()}
            />
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.08em" }}>PASSWORD</label>
          <div style={{ position: "relative" }}>
            <input style={{ ...inp, paddingRight: 40 }} type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
              onFocus={e => (e.target.style.borderColor = "rgba(201,162,39,0.4)")}
              onBlur={e => (e.target.style.borderColor = "var(--border)")}
              onKeyDown={e => e.key === "Enter" && submit()}
            />
            <button onClick={() => setShowPass(s => !s)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", display: "flex" }}>
              {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
        </div>
      </div>

      <button onClick={submit} disabled={loading} style={{ width: "100%", padding: "10px", background: loading ? "var(--bg-3)" : "var(--gold)", border: "none", borderRadius: 8, color: loading ? "var(--text-3)" : "#0d0d0d", fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", fontFamily: "var(--font)", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, transition: "all 0.15s" }}>
        {loading ? <Dots /> : mode === "login" ? <><LogIn size={13} /> Sign in</> : <><UserPlus size={13} /> Create account</>}
      </button>

      <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-3)" }}>
        {mode === "login" ? "No account? " : "Already have one? "}
        <button onClick={() => onSwitch(mode === "login" ? "signup" : "login")} style={{ background: "none", border: "none", color: "var(--gold)", fontSize: 12, cursor: "pointer", fontFamily: "var(--font)" }}>
          {mode === "login" ? "Sign up" : "Sign in"}
        </button>
      </p>
    </div>
  );
}

export default function Page() {
  const [hydrated, setHydrated]   = useState(false);
  const [isAuth, setIsAuth]       = useState(false);
  const [role, setRole]           = useState<UserRole>("guest");
  const [username, setUsername]   = useState("");
  const [isPro, setIsPro]         = useState(false);
  const [showUpgrade, setUpgrade] = useState(false);
  const [authPanel, setAuthPanel] = useState<"login"|"signup"|null>(null);
  const [messages, setMessages]   = useState<Message[]>([WELCOME]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [convs, setConvs]         = useState<Conversation[]>([]);
  const [activeId, setActiveId]   = useState<string|undefined>();
  const [sidebar, setSidebar]     = useState(false);
  const [lastUserMsg, setLastUserMsg] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const taRef     = useRef<HTMLTextAreaElement>(null);

  const welcome = useCallback((r: UserRole) => r === "creator" ? WELCOME_CREATOR : WELCOME, []);

  useEffect(() => {
    setHydrated(true);
    const token = getToken();
    if (token) {
      const r = getStoredRole() as UserRole;
      const u = getStoredUsername();
      setIsAuth(true); setRole(r); setUsername(u);
      setIsPro(getIsPro());
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
    setLastUserMsg(msg);
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: msg };
    const pending: Message = { id: "pending", role: "assistant", content: "", isStreaming: true };
    setMessages(p => [...p, userMsg, pending]);
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
    setLoading(true);
    try {
      const res = await chatApi.sendMessage(msg, activeId);
      setActiveId(res.conversation_id);
      setMessages(p => p.map(m => m.id === "pending" ? { id: res.message_id, role: "assistant", content: res.reply } : m));
      if (isAuth) refreshConvs();
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : "Something went wrong";
      if (err.includes("limit") || err.includes("429")) {
        setMessages(p => p.filter(m => m.id !== "pending"));
        setUpgrade(true);
      } else {
        setMessages(p => p.map(m => m.id === "pending"
          ? { id: "err", role: "assistant", content: `Error: ${err}` }
          : m));
      }
    } finally { setLoading(false); setTimeout(() => taRef.current?.focus(), 50); }
  };

  const regen = () => { if (lastUserMsg) { setMessages(p => p.slice(0, -1)); send(lastUserMsg); } };

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
    } catch {}
  };

  const newChat = () => {
    setMessages([welcome(role)]);
    setActiveId(undefined);
    setTimeout(() => taRef.current?.focus(), 100);
  };

  const delConv = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await chatApi.deleteConversation(id).catch(() => {});
    setConvs(p => p.filter(c => c.id !== id));
    if (activeId === id) newChat();
  };

  const onAuthSuccess = (r: string, u: string, plan = "free") => {
    setIsAuth(true); setRole(r as UserRole); setUsername(u);
    setIsPro(plan === "pro" || r === "admin" || r === "creator");
    setMessages([welcome(r as UserRole)]);
    setAuthPanel(null); setSidebar(true);
    chatApi.getConversations().then(setConvs).catch(() => {});
  };

  const isEmpty = messages.length === 1 && ["w","wc"].includes(messages[0].id);
  const lastAsstIdx = messages.map((m,i) => m.role === "assistant" ? i : -1).filter(i => i >= 0).pop() ?? -1;

  if (!hydrated) return (
    <div style={{ background: "var(--bg)", height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Dots />
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100dvh", background: "var(--bg)", overflow: "hidden", position: "relative" }}>
      <ConstellationCanvas />

      {/* ── Sidebar ── */}
      <div style={{ width: sidebar ? "var(--sidebar-w)" : 0, flexShrink: 0, overflow: "hidden", transition: "width 0.22s cubic-bezier(0.4,0,0.2,1)", borderRight: sidebar ? "1px solid var(--border)" : "none", background: "rgba(11,11,11,0.97)", position: "relative", zIndex: 20, display: "flex", flexDirection: "column" }}>
        <div style={{ width: "var(--sidebar-w)", height: "100%", display: "flex", flexDirection: "column", padding: "12px 8px" }}>
          {/* Logo + close */}
          <div style={{ padding: "4px 8px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "var(--font)", fontSize: 13, fontWeight: 600, color: "var(--gold)", letterSpacing: "0.12em" }}>RYUJI</span>
            <button onClick={() => setSidebar(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 4, display: "flex", borderRadius: 6 }}>
              <X size={13} />
            </button>
          </div>

          {/* New chat */}
          <button onClick={newChat} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: "var(--text-2)", fontSize: 13, cursor: "pointer", marginBottom: 14, width: "100%", fontFamily: "var(--font)", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "var(--text-1)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-3)"; e.currentTarget.style.color = "var(--text-2)"; }}
          >
            <Plus size={12} /> New chat
          </button>

          {/* Conversations */}
          {convs.length > 0 && (
            <>
              <div style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "0 8px", marginBottom: 4 }}>Recent</div>
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1 }}>
                {convs.map(c => (
                  <div key={c.id} onClick={() => loadConv(c)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: "var(--radius-sm)", cursor: "pointer", fontSize: 12, color: activeId === c.id ? "var(--gold-light)" : "var(--text-2)", background: activeId === c.id ? "var(--gold-dim)" : "transparent", transition: "all 0.12s", overflow: "hidden" }}
                    onMouseEnter={e => { if (activeId !== c.id) e.currentTarget.style.background = "var(--bg-hover)"; }}
                    onMouseLeave={e => { if (activeId !== c.id) e.currentTarget.style.background = "transparent"; }}
                  >
                    <MessageSquare size={11} style={{ flexShrink: 0, opacity: 0.5 }} />
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title || "Untitled"}</span>
                    <button onClick={e => delConv(c.id, e)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 2, flexShrink: 0, display: "flex" }}>
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* User footer */}
          <div style={{ marginTop: "auto", paddingTop: 12, borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 2 }}>
            {role === "creator" && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: "var(--gold-dim)", borderRadius: "var(--radius-sm)", marginBottom: 4 }}>
                <Crown size={10} style={{ color: "var(--gold)" }} />
                <span style={{ fontSize: 11, color: "var(--gold)", fontWeight: 500 }}>Creator access</span>
              </div>
            )}
            {isPro && role !== "creator" && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: "var(--gold-dim)", borderRadius: "var(--radius-sm)", marginBottom: 4 }}>
                <Zap size={10} style={{ color: "var(--gold)" }} />
                <span style={{ fontSize: 11, color: "var(--gold)", fontWeight: 500 }}>Pro plan</span>
              </div>
            )}
            {!isPro && isAuth && (
              <Link href="/pricing" style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", borderRadius: "var(--radius-sm)", color: "var(--text-3)", fontSize: 12, textDecoration: "none", marginBottom: 4, border: "1px solid var(--border)", transition: "all 0.15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(201,162,39,0.25)"; (e.currentTarget as HTMLElement).style.color = "var(--gold)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.color = "var(--text-3)"; }}
              >
                <Zap size={10} /> Upgrade to Pro
              </Link>
            )}
            <div style={{ padding: "2px 10px", fontSize: 12, color: "var(--text-3)" }}>{username}</div>
            {(role === "admin" || role === "creator") && (
              <Link href="/admin" style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: "var(--radius-sm)", color: "var(--text-2)", fontSize: 12, textDecoration: "none", transition: "all 0.12s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <LayoutDashboard size={12} /> Dashboard
              </Link>
            )}
            <button onClick={logout} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: "var(--radius-sm)", color: "var(--text-2)", fontSize: 12, background: "none", border: "none", cursor: "pointer", width: "100%", fontFamily: "var(--font)", transition: "all 0.12s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-hover)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              <LogOut size={12} /> Sign out
            </button>
          </div>
        </div>
      </div>

      {/* ── Center ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative", zIndex: 10 }}>

        {/* Header */}
        <header style={{ height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", borderBottom: "1px solid var(--border)", background: "rgba(13,13,13,0.9)", backdropFilter: "blur(16px)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setSidebar(s => !s)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 6, borderRadius: 7, display: "flex", transition: "color 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--text-1)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
            >
              <Menu size={16} />
            </button>
            {!sidebar && <span style={{ fontFamily: "var(--font)", fontSize: 13, fontWeight: 600, color: "var(--gold)", letterSpacing: "0.12em" }}>RYUJI</span>}
          </div>

          {!isAuth && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => setAuthPanel(p => p === "login" ? null : "login")} style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", color: authPanel === "login" ? "var(--text-1)" : "var(--text-2)", fontSize: 12, cursor: "pointer", padding: "6px 14px", fontFamily: "var(--font)", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; e.currentTarget.style.color = "var(--text-1)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = authPanel === "login" ? "var(--text-1)" : "var(--text-2)"; }}
              >Sign in</button>
              <button onClick={() => setAuthPanel(p => p === "signup" ? null : "signup")} style={{ background: "var(--gold)", border: "none", borderRadius: "var(--radius-sm)", color: "#0d0d0d", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "6px 14px", fontFamily: "var(--font)", transition: "filter 0.15s" }}
                onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.1)")}
                onMouseLeave={e => (e.currentTarget.style.filter = "brightness(1)")}
              >Sign up</button>
            </div>
          )}
          {isAuth && <span style={{ fontSize: 12, color: "var(--text-3)" }}>{username}</span>}
        </header>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {isEmpty ? (
            <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 20px", gap: 28, animation: "fadeIn 0.4s ease" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 52, height: 52, borderRadius: 15, background: "linear-gradient(135deg,#7a5f10,#c9a227)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#0d0d0d", margin: "0 auto 16px", boxShadow: "0 0 0 1px rgba(201,162,39,0.2),0 8px 28px rgba(201,162,39,0.12)" }}>R</div>
                <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--text-1)", marginBottom: 6, letterSpacing: "-0.01em" }}>
                  {role === "creator" ? "Welcome back, neporrex" : "How can I help you?"}
                </h1>
                <p style={{ fontSize: 14, color: "var(--text-3)" }}>
                  {role === "creator" ? "Creator access active." : "Ask me anything."}
                </p>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 460 }}>
                {SUGGESTIONS.map(({ icon: Icon, label, prompt }) => (
                  <button key={label} onClick={() => { setInput(prompt); taRef.current?.focus(); }} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 100, color: "var(--text-2)", fontSize: 12, cursor: "pointer", fontFamily: "var(--font)", transition: "all 0.15s" }}
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
            <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px 16px", display: "flex", flexDirection: "column", gap: 24 }}>
              {messages.map((msg, idx) => (
                <div key={msg.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", animation: "in 0.25s ease forwards", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                  {msg.role === "assistant" && <Avatar />}
                  <div style={{ maxWidth: msg.role === "user" ? "75%" : "84%" }}>
                    <div style={{
                      padding: msg.role === "user" ? "10px 14px" : "2px 0",
                      background: msg.role === "user" ? "var(--bg-3)" : "transparent",
                      border: msg.role === "user" ? "1px solid var(--border)" : "none",
                      borderRadius: msg.role === "user" ? "var(--radius-lg) var(--radius-lg) 6px var(--radius-lg)" : 0,
                      fontSize: 14, lineHeight: 1.75, color: "var(--text-1)",
                    }}>
                      {msg.isStreaming ? <Dots /> :
                        msg.role === "assistant" ? (
                          <div className="md"><ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown></div>
                        ) : msg.content
                      }
                    </div>
                    {msg.role === "assistant" && !msg.isStreaming && (
                      <div style={{ display: "flex", alignItems: "center", gap: 2, marginTop: 6 }} className="msg-actions-wrap">
                        <MsgActions content={msg.content} onRegen={regen} isLast={idx === lastAsstIdx} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ padding: "12px 20px 20px", background: "rgba(13,13,13,0.95)", backdropFilter: "blur(16px)", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
          {!isAuth && !isEmpty && (
            <div style={{ maxWidth: 720, margin: "0 auto 10px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 14px", background: "rgba(201,162,39,0.05)", border: "1px solid rgba(201,162,39,0.1)", borderRadius: "var(--radius-sm)", fontSize: 12 }}>
              <span style={{ color: "var(--text-3)" }}>Sign in to save conversations & unlock more messages</span>
              <button onClick={() => setAuthPanel("signup")} style={{ background: "none", border: "none", color: "var(--gold)", fontSize: 12, cursor: "pointer", fontFamily: "var(--font)", fontWeight: 500 }}>Sign up free →</button>
            </div>
          )}
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10, background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "10px 12px", transition: "border-color 0.2s" }}>
              <textarea ref={taRef} value={input} onChange={resize} onKeyDown={handleKey} placeholder="Message Ryuji…" rows={1}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--text-1)", fontSize: 14, fontFamily: "var(--font)", resize: "none", lineHeight: 1.65, minHeight: 22, maxHeight: 160, paddingTop: 1 }}
              />
              <button onClick={() => send()} disabled={!input.trim() || loading} style={{ width: 32, height: 32, borderRadius: 9, border: "none", flexShrink: 0, background: input.trim() && !loading ? "var(--gold)" : "var(--bg-3)", color: input.trim() && !loading ? "#0d0d0d" : "var(--text-3)", cursor: input.trim() && !loading ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.18s", boxShadow: input.trim() && !loading ? "0 0 16px rgba(201,162,39,0.2)" : "none" }}>
                <Send size={13} />
              </button>
            </div>
            <p style={{ textAlign: "center", fontSize: 11, color: "var(--text-3)", marginTop: 8 }}>
              Ryuji can make mistakes · Created by <span style={{ color: "rgba(201,162,39,0.45)" }}>neporrex</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Auth Panel (slide in from right) ── */}
      {authPanel && !isAuth && (
        <AuthPanel mode={authPanel} onSuccess={onAuthSuccess} onSwitch={setAuthPanel} onClose={() => setAuthPanel(null)} />
      )}

      {showUpgrade && <UpgradeWall onClose={() => setUpgrade(false)} />}

      <style>{`
        @keyframes dot { 0%,80%,100%{transform:translateY(0);opacity:.35} 40%{transform:translateY(-4px);opacity:1} }
        @keyframes in { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .msg-actions-wrap:hover .msg-actions, .msg-actions:hover { opacity: 1 !important; }
        .msg-actions { opacity: 0; }
      `}</style>
    </div>
  );
}
