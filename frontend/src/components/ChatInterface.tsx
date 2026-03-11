"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Plus, MessageSquare, Trash2, X, Copy, Check, ThumbsUp, ThumbsDown, RefreshCw, Code2, PenLine, Sparkles, Zap } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { chatApi } from "@/lib/api";
import type { Message, Conversation, UserRole } from "@/types";

interface Props {
  role: UserRole;
  username: string;
  isAuthenticated: boolean;
  onOpenAuth?: (mode: "login" | "signup") => void;
}

const SUGGESTIONS = [
  { icon: Code2,    label: "Debug my code",    prompt: "Help me debug this code:\n\n" },
  { icon: PenLine,  label: "Write something",   prompt: "Help me write:\n\n" },
  { icon: Sparkles, label: "Explain a concept", prompt: "Explain this to me:\n\n" },
  { icon: Zap,      label: "Automate a task",   prompt: "Help me automate:\n\n" },
];

function Dots() {
  return (
    <span style={{ display: "inline-flex", gap: 4, padding: "4px 0" }}>
      {[0,1,2].map(i => (
        <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--gold)", display: "inline-block", animation: `dot 1.2s ease-in-out ${i*0.2}s infinite` }} />
      ))}
    </span>
  );
}

function MsgActions({ content, onRegen, isLast }: { content: string; onRegen: () => void; isLast: boolean }) {
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<null|"up"|"down">(null);
  const copy = async () => { await navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const btn: React.CSSProperties = { background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: "4px 6px", borderRadius: 6, display: "flex", alignItems: "center", transition: "color 0.15s", fontFamily: "var(--font)" };
  return (
    <div style={{ display: "flex", gap: 2, marginTop: 8 }}>
      <button style={{ ...btn, color: copied ? "var(--gold)" : "var(--text-3)" }} onClick={copy} onMouseEnter={e => (e.currentTarget.style.color = "var(--text-1)")} onMouseLeave={e => (e.currentTarget.style.color = copied ? "var(--gold)" : "var(--text-3)")}>
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
      {isLast && (
        <button style={btn} onClick={onRegen} onMouseEnter={e => (e.currentTarget.style.color = "var(--text-1)")} onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}>
          <RefreshCw size={13} />
        </button>
      )}
      <button style={{ ...btn, color: liked === "up" ? "var(--gold)" : "var(--text-3)" }} onClick={() => setLiked(l => l === "up" ? null : "up")} onMouseEnter={e => (e.currentTarget.style.color = "var(--text-1)")} onMouseLeave={e => (e.currentTarget.style.color = liked === "up" ? "var(--gold)" : "var(--text-3)")}>
        <ThumbsUp size={13} />
      </button>
      <button style={{ ...btn, color: liked === "down" ? "#f87171" : "var(--text-3)" }} onClick={() => setLiked(l => l === "down" ? null : "down")} onMouseEnter={e => (e.currentTarget.style.color = "var(--text-1)")} onMouseLeave={e => (e.currentTarget.style.color = liked === "down" ? "#f87171" : "var(--text-3)")}>
        <ThumbsDown size={13} />
      </button>
    </div>
  );
}

export default function ChatInterface({ role, username, isAuthenticated, onOpenAuth }: Props) {
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [convs, setConvs]         = useState<Conversation[]>([]);
  const [activeId, setActiveId]   = useState<string|undefined>();
  const [sidebar, setSidebar]     = useState(false);
  const [lastUserMsg, setLast]    = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const taRef     = useRef<HTMLTextAreaElement>(null);

  const scrollBottom = useCallback(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, []);
  useEffect(() => { scrollBottom(); }, [messages, scrollBottom]);
  useEffect(() => { if (isAuthenticated) chatApi.getConversations().then(setConvs).catch(() => {}); }, [isAuthenticated]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setLast(msg);
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
      if (isAuthenticated) chatApi.getConversations().then(setConvs).catch(() => {});
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : "Error";
      setMessages(p => p.map(m => m.id === "pending"
        ? { id: "err", role: "assistant", content: err.includes("limit") ? "Daily limit reached. Sign in or try tomorrow." : `Error: ${err}` }
        : m));
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

  const loadConv = async (c: Conversation) => {
    try {
      const msgs = await chatApi.getMessages(c.id);
      setMessages(msgs.map(m => ({ id: m.id, role: m.role as "user"|"assistant", content: m.content })));
      setActiveId(c.id); setSidebar(false);
    } catch {}
  };

  const newChat = () => { setMessages([]); setActiveId(undefined); setSidebar(false); setTimeout(() => taRef.current?.focus(), 100); };

  const delConv = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await chatApi.deleteConversation(id).catch(() => {});
    setConvs(p => p.filter(c => c.id !== id));
    if (activeId === id) newChat();
  };

  const isEmpty = messages.length === 0;
  const lastAsstIdx = messages.map((m,i) => m.role === "assistant" ? i : -1).filter(i => i >= 0).pop() ?? -1;

  return (
    <div style={{ display: "flex", height: "100%", position: "relative", fontFamily: "var(--font)" }}>

      {/* Sidebar */}
      {isAuthenticated && (
        <div style={{ width: sidebar ? 240 : 0, flexShrink: 0, overflow: "hidden", transition: "width 0.22s ease", borderRight: sidebar ? "1px solid var(--border)" : "none", background: "rgba(8,8,10,0.98)", display: "flex", flexDirection: "column" }}>
          <div style={{ width: 240, height: "100%", display: "flex", flexDirection: "column", padding: "12px 8px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 11, color: "var(--text-3)", letterSpacing: "0.1em", textTransform: "uppercase", paddingLeft: 4 }}>History</span>
              <button onClick={() => setSidebar(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 4, display: "flex", borderRadius: 6 }}><X size={13} /></button>
            </div>
            <button onClick={newChat} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-2)", fontSize: 12, cursor: "pointer", marginBottom: 10, fontFamily: "var(--font)" }}>
              <Plus size={12} /> New chat
            </button>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1 }}>
              {convs.map(c => (
                <div key={c.id} onClick={() => loadConv(c)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 7, cursor: "pointer", fontSize: 12, color: activeId === c.id ? "var(--gold-light)" : "var(--text-2)", background: activeId === c.id ? "var(--gold-dim)" : "transparent", transition: "all 0.12s", overflow: "hidden" }}
                  onMouseEnter={e => { if (activeId !== c.id) e.currentTarget.style.background = "var(--bg-hover)"; }}
                  onMouseLeave={e => { if (activeId !== c.id) e.currentTarget.style.background = "transparent"; }}
                >
                  <MessageSquare size={11} style={{ flexShrink: 0, opacity: 0.5 }} />
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title || "Untitled"}</span>
                  <button onClick={e => delConv(c.id, e)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 2, display: "flex", flexShrink: 0 }}><Trash2 size={10} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Messages / Empty state */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {isEmpty ? (
            <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 20px", gap: 28, animation: "fadeIn 0.4s ease" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#7a5f10,#c9a227)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#0d0d0d", margin: "0 auto 14px", boxShadow: "0 0 0 1px rgba(201,162,39,0.2),0 8px 24px rgba(201,162,39,0.12)" }}>R</div>
                <h2 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-1)", marginBottom: 4 }}>
                  {role === "creator" ? `Welcome back, ${username}` : "How can I help you?"}
                </h2>
                <p style={{ fontSize: 13, color: "var(--text-3)" }}>
                  {role === "creator" ? "Creator access active." : "Ask anything — code, write, think."}
                </p>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 420 }}>
                {SUGGESTIONS.map(({ icon: Icon, label, prompt }) => (
                  <button key={label} onClick={() => { setInput(prompt); taRef.current?.focus(); }}
                    style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 100, color: "var(--text-2)", fontSize: 12, cursor: "pointer", fontFamily: "var(--font)", transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-3)"; e.currentTarget.style.color = "var(--text-1)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "var(--bg-2)"; e.currentTarget.style.color = "var(--text-2)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                  >
                    <Icon size={12} style={{ color: "var(--gold)", opacity: 0.8 }} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 20px 16px", display: "flex", flexDirection: "column", gap: 24 }}>
              {messages.map((msg, idx) => (
                <div key={msg.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", animation: "in 0.25s ease forwards" }}>
                  {msg.role === "assistant" && (
                    <div style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, background: "linear-gradient(135deg,#7a5f10,#c9a227)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#0d0d0d", marginTop: 2, boxShadow: "0 0 0 1px rgba(201,162,39,0.15)" }}>R</div>
                  )}
                  <div style={{ maxWidth: msg.role === "user" ? "75%" : "84%" }}>
                    <div style={{ padding: msg.role === "user" ? "10px 14px" : "2px 0", background: msg.role === "user" ? "var(--bg-3)" : "transparent", border: msg.role === "user" ? "1px solid var(--border)" : "none", borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : 0, fontSize: 14, lineHeight: 1.75, color: "var(--text-1)" }}>
                      {msg.isStreaming ? <Dots /> :
                        msg.role === "assistant" ? (
                          <div className="md"><ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown></div>
                        ) : msg.content}
                    </div>
                    {msg.role === "assistant" && !msg.isStreaming && (
                      <MsgActions content={msg.content} onRegen={regen} isLast={idx === lastAsstIdx} />
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Guest CTA */}
        {!isAuthenticated && messages.length >= 4 && (
          <div style={{ margin: "0 16px 10px", padding: "8px 14px", background: "rgba(201,162,39,0.05)", border: "1px solid rgba(201,162,39,0.12)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
            <span style={{ color: "var(--text-3)" }}>Sign in to save conversations & get more messages</span>
            <button onClick={() => onOpenAuth?.("signup")} style={{ background: "none", border: "none", color: "var(--gold)", fontSize: 12, cursor: "pointer", fontFamily: "var(--font)", fontWeight: 500 }}>Sign up free →</button>
          </div>
        )}

        {/* Input */}
        <div style={{ padding: "10px 16px 16px", borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 14, padding: "8px 10px" }}>
            {isAuthenticated && (
              <button onClick={() => setSidebar(s => !s)} style={{ background: "none", border: "none", cursor: "pointer", color: sidebar ? "var(--gold)" : "var(--text-3)", padding: "4px", display: "flex", flexShrink: 0, transition: "color 0.15s", borderRadius: 6 }}>
                <MessageSquare size={15} />
              </button>
            )}
            <textarea ref={taRef} value={input} onChange={resize} onKeyDown={handleKey} placeholder="Message Ryuji…" rows={1}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--text-1)", fontSize: 14, fontFamily: "var(--font)", resize: "none", lineHeight: 1.65, minHeight: 22, maxHeight: 160, paddingTop: 2 }}
            />
            <button onClick={() => send()} disabled={!input.trim() || loading}
              style={{ width: 30, height: 30, borderRadius: 8, border: "none", flexShrink: 0, background: input.trim() && !loading ? "var(--gold)" : "var(--bg-3)", color: input.trim() && !loading ? "#0d0d0d" : "var(--text-3)", cursor: input.trim() && !loading ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.18s", boxShadow: input.trim() && !loading ? "0 0 14px rgba(201,162,39,0.2)" : "none" }}>
              <Send size={13} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes dot { 0%,80%,100%{transform:translateY(0);opacity:.35} 40%{transform:translateY(-4px);opacity:1} }
        @keyframes in { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .md h1,.md h2,.md h3{color:var(--text-1);margin:1em 0 0.4em;font-weight:600}
        .md h1{font-size:1.15em}.md h2{font-size:1.05em}.md h3{font-size:0.97em}
        .md p{margin-bottom:0.7em;line-height:1.75}.md p:last-child{margin-bottom:0}
        .md ul,.md ol{padding-left:1.4em;margin-bottom:0.7em}
        .md li{margin-bottom:0.2em}
        .md a{color:var(--gold)}
        .md strong{color:var(--text-1);font-weight:600}
        .md code{font-family:var(--mono);font-size:0.82em;background:rgba(255,255,255,0.06);color:#e2b93b;padding:2px 6px;border-radius:5px}
        .md pre{background:#111!important;border:1px solid var(--border);border-radius:10px;margin:0.8em 0;overflow-x:auto;padding:12px 16px}
        .md pre code{background:none;color:inherit;padding:0;font-size:0.83em}
        .md blockquote{border-left:2px solid var(--gold);padding-left:1em;color:var(--text-2);margin:0.7em 0}
        .md table{width:100%;border-collapse:collapse;font-size:0.9em;margin:0.8em 0}
        .md th{padding:8px 12px;background:rgba(255,255,255,0.04);border:1px solid var(--border);color:var(--text-2);font-weight:500;text-align:left;font-size:0.85em}
        .md td{padding:8px 12px;border:1px solid rgba(255,255,255,0.04)}
      `}</style>
    </div>
  );
}
