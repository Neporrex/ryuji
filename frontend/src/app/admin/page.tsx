"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users, MessageSquare, BarChart3, Settings,
  Shield, Ban, Crown, RefreshCw, ArrowLeft,
  Trash2, UserCheck
} from "lucide-react";
import { adminApi, getToken, getStoredRole, getStoredUsername } from "@/lib/api";
import type { AdminStats, User, UserRole } from "@/types";
import Link from "next/link";
import dynamic from "next/dynamic";

const ConstellationCanvas = dynamic(() => import("@/components/ConstellationCanvas"), { ssr: false });

const ROLE_OPTIONS: UserRole[] = ["user", "admin", "creator"];

function Dots() {
  return (
    <span style={{ display: "inline-flex", gap: 4 }}>
      {[0,1,2].map(i => (
        <span key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--gold)", display: "inline-block", animation: `dot 1.2s ease-in-out ${i*0.2}s infinite` }} />
      ))}
    </span>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview"|"users"|"settings">("overview");
  const [settings, setSettings] = useState<Array<{key:string;value:string;description:string}>>([]);
  const [editSetting, setEditSetting] = useState<{key:string;value:string}|null>(null);

  const role = getStoredRole() as UserRole;
  const username = getStoredUsername();
  const isCreator = role === "creator";

  useEffect(() => {
    const token = getToken();
    if (!token || !["admin","creator"].includes(role)) { router.replace("/"); return; }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, u] = await Promise.all([adminApi.getStats(), adminApi.getUsers()]);
      setStats(s); setUsers(u);
      if (isCreator) setSettings(await adminApi.getSettings());
    } catch { router.replace("/"); }
    finally { setLoading(false); }
  };

  const handleBan = async (userId: string, isBanned: boolean) => {
    try {
      isBanned ? await adminApi.unbanUser(userId) : await adminApi.banUser(userId);
      loadData();
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "Failed"); }
  };

  const handleRole = async (userId: string, newRole: UserRole) => {
    try { await adminApi.updateRole(userId, newRole); loadData(); }
    catch (e: unknown) { alert(e instanceof Error ? e.message : "Failed"); }
  };

  const handleSaveSetting = async () => {
    if (!editSetting) return;
    try {
      await adminApi.updateSetting(editSetting.key, editSetting.value);
      setEditSetting(null);
      setSettings(await adminApi.getSettings());
    } catch (e: unknown) { alert(e instanceof Error ? e.message : "Failed"); }
  };

  const navItems = [
    { id: "overview", label: "Overview",  icon: BarChart3 },
    { id: "users",    label: "Users",     icon: Users },
    ...(isCreator ? [{ id: "settings", label: "Settings", icon: Settings }] : []),
  ];

  const statCards = [
    { label: "Total Users",    value: stats?.total_users ?? 0,         icon: Users,          color: "#c9a227" },
    { label: "Active",         value: stats?.active_users ?? 0,        icon: Shield,         color: "#86efac" },
    { label: "Conversations",  value: stats?.total_conversations ?? 0, icon: MessageSquare,  color: "#93c5fd" },
    { label: "Messages",       value: stats?.total_messages ?? 0,      icon: BarChart3,      color: "#c4b5fd" },
    { label: "Banned",         value: stats?.banned_users ?? 0,        icon: Ban,            color: "#fca5a5" },
  ];

  const s: React.CSSProperties = { fontFamily: "var(--font)" };

  if (loading) return (
    <div style={{ background: "var(--bg)", height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Dots />
    </div>
  );

  return (
    <div style={{ ...s, display: "flex", height: "100dvh", background: "var(--bg)", color: "var(--text-1)", overflow: "hidden", position: "relative" }}>
      <ConstellationCanvas />

      {/* Sidebar */}
      <div style={{ width: 220, flexShrink: 0, borderRight: "1px solid var(--border)", background: "rgba(11,11,11,0.97)", display: "flex", flexDirection: "column", position: "relative", zIndex: 20 }}>
        <div style={{ padding: "20px 12px 14px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: 10, color: "var(--gold)", letterSpacing: "0.15em", marginBottom: 4 }}>RYUJI</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Dashboard</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isCreator && <Crown size={11} style={{ color: "var(--gold)" }} />}
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>{username}</span>
            <span style={{ fontSize: 10, padding: "2px 7px", background: isCreator ? "var(--gold-dim)" : "rgba(255,255,255,0.05)", color: isCreator ? "var(--gold)" : "var(--text-3)", borderRadius: 20, border: `1px solid ${isCreator ? "rgba(201,162,39,0.2)" : "var(--border)"}` }}>{role}</span>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id as typeof tab)} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontFamily: "var(--font)", transition: "all 0.15s", background: tab === id ? "var(--gold-dim)" : "transparent", color: tab === id ? "var(--gold-light)" : "var(--text-2)" }}
              onMouseEnter={e => { if (tab !== id) e.currentTarget.style.background = "var(--bg-hover)"; }}
              onMouseLeave={e => { if (tab !== id) e.currentTarget.style.background = "transparent"; }}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </nav>

        <div style={{ padding: "10px 8px", borderTop: "1px solid var(--border)" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", borderRadius: 8, color: "var(--text-2)", fontSize: 13, textDecoration: "none", transition: "all 0.15s" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
          >
            <ArrowLeft size={13} /> Back to chat
          </Link>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflowY: "auto", position: "relative", zIndex: 10 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
            <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>
              {tab === "overview" ? "Overview" : tab === "users" ? "Users" : "Settings"}
            </h1>
            <button onClick={loadData} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-2)", fontSize: 12, cursor: "pointer", fontFamily: "var(--font)", transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.color = "var(--text-1)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--text-2)"; }}
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>

          {/* ── Overview ── */}
          {tab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
                {statCards.map(({ label, value, icon: Icon, color }) => (
                  <div key={label} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
                      <Icon size={13} style={{ color }} />
                      <span style={{ fontSize: 11, color: "var(--text-3)", letterSpacing: "0.03em" }}>{label}</span>
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: "var(--text-1)" }}>{value.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Users ── */}
          {tab === "users" && (
            <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["User", "Email", "Role", "Status", "Actions"].map(h => (
                      <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 10, color: "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-3)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "11px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {u.role === "creator" && <Crown size={11} style={{ color: "var(--gold)" }} />}
                          <span style={{ fontWeight: 500, color: "var(--text-1)" }}>{u.username}</span>
                        </div>
                      </td>
                      <td style={{ padding: "11px 16px", color: "var(--text-3)", fontSize: 12 }}>{u.email}</td>
                      <td style={{ padding: "11px 16px" }}>
                        {isCreator && u.role !== "creator" ? (
                          <select value={u.role} onChange={e => handleRole(u.id, e.target.value as UserRole)}
                            style={{ background: "var(--bg-3)", color: "var(--text-1)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 8px", fontSize: 12, fontFamily: "var(--font)", cursor: "pointer" }}
                          >
                            {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        ) : (
                          <span style={{ fontSize: 11, padding: "2px 8px", background: u.role === "creator" ? "var(--gold-dim)" : "rgba(255,255,255,0.05)", color: u.role === "creator" ? "var(--gold)" : "var(--text-3)", borderRadius: 20, border: `1px solid ${u.role === "creator" ? "rgba(201,162,39,0.2)" : "var(--border)"}` }}>{u.role}</span>
                        )}
                      </td>
                      <td style={{ padding: "11px 16px" }}>
                        <span style={{ fontSize: 11, color: u.is_banned ? "#fca5a5" : "#86efac" }}>
                          {u.is_banned ? "Banned" : "Active"}
                        </span>
                      </td>
                      <td style={{ padding: "11px 16px" }}>
                        {u.role !== "creator" && (
                          <button onClick={() => handleBan(u.id, u.is_banned)}
                            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", background: "none", border: `1px solid ${u.is_banned ? "rgba(134,239,172,0.2)" : "rgba(252,165,165,0.2)"}`, borderRadius: 7, color: u.is_banned ? "#86efac" : "#fca5a5", fontSize: 11, cursor: "pointer", fontFamily: "var(--font)", transition: "all 0.15s" }}
                          >
                            {u.is_banned ? <UserCheck size={11} /> : <Ban size={11} />}
                            {u.is_banned ? "Unban" : "Ban"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Settings ── */}
          {tab === "settings" && isCreator && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {settings.map(s => (
                <div key={s.key} style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11, color: "var(--gold)", fontFamily: "var(--mono)", marginBottom: 6, letterSpacing: "0.05em" }}>{s.key}</div>
                      {editSetting?.key === s.key ? (
                        <input value={editSetting.value} onChange={e => setEditSetting({...editSetting, value: e.target.value})}
                          style={{ width: "100%", padding: "8px 12px", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-1)", fontSize: 13, outline: "none", fontFamily: "var(--font)" }}
                          onFocus={e => (e.target.style.borderColor = "rgba(201,162,39,0.4)")}
                          onBlur={e => (e.target.style.borderColor = "var(--border)")}
                        />
                      ) : (
                        <div style={{ fontSize: 13, color: "var(--text-2)", fontFamily: "var(--mono)" }}>{s.value}</div>
                      )}
                      {s.description && <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>{s.description}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      {editSetting?.key === s.key ? (
                        <>
                          <button onClick={handleSaveSetting} style={{ padding: "6px 14px", background: "var(--gold)", border: "none", borderRadius: 7, color: "#0d0d0d", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font)" }}>Save</button>
                          <button onClick={() => setEditSetting(null)} style={{ padding: "6px 14px", background: "none", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text-2)", fontSize: 12, cursor: "pointer", fontFamily: "var(--font)" }}>Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => setEditSetting({key: s.key, value: s.value})} style={{ padding: "6px 14px", background: "none", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text-2)", fontSize: 12, cursor: "pointer", fontFamily: "var(--font)", transition: "all 0.15s" }}
                          onMouseEnter={e => { e.currentTarget.style.color = "var(--text-1)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"; }}
                          onMouseLeave={e => { e.currentTarget.style.color = "var(--text-2)"; e.currentTarget.style.borderColor = "var(--border)"; }}
                        >Edit</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes dot { 0%,80%,100%{transform:translateY(0);opacity:.35} 40%{transform:translateY(-4px);opacity:1} }
      `}</style>
    </div>
  );
}
