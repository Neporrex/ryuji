"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users, MessageSquare, BarChart3, Settings,
  Shield, Ban, Crown, RefreshCw, ChevronLeft
} from "lucide-react";
import { adminApi, getToken, getStoredRole, getStoredUsername } from "@/lib/api";
import type { AdminStats, User, UserRole } from "@/types";
import Link from "next/link";
import dynamic from "next/dynamic";

const ConstellationCanvas = dynamic(() => import("@/components/ConstellationCanvas"), { ssr: false });

const ROLE_OPTIONS: UserRole[] = ["user", "admin", "creator"];

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "settings">("overview");
  const [settings, setSettings] = useState<Array<{ key: string; value: string; description: string }>>([]);
  const [editSetting, setEditSetting] = useState<{ key: string; value: string } | null>(null);

  const role = getStoredRole() as UserRole;
  const username = getStoredUsername();
  const isCreator = role === "creator";

  useEffect(() => {
    const token = getToken();
    if (!token || !["admin", "creator"].includes(role)) {
      router.replace("/");
      return;
    }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, u] = await Promise.all([
        adminApi.getStats(),
        adminApi.getUsers(),
      ]);
      setStats(s);
      setUsers(u);
      if (isCreator) {
        const sett = await adminApi.getSettings();
        setSettings(sett);
      }
    } catch {
      router.replace("/");
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async (userId: string, isBanned: boolean) => {
    try {
      if (isBanned) {
        await adminApi.unbanUser(userId);
      } else {
        await adminApi.banUser(userId);
      }
      loadData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Action failed");
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await adminApi.updateRole(userId, newRole);
      loadData();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Action failed");
    }
  };

  const handleSaveSetting = async () => {
    if (!editSetting) return;
    try {
      await adminApi.updateSetting(editSetting.key, editSetting.value);
      setEditSetting(null);
      const sett = await adminApi.getSettings();
      setSettings(sett);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Save failed");
    }
  };

  if (loading) {
    return (
      <div style={{ background: "var(--obsidian-900)", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="loading-dots"><span /><span /><span /></div>
      </div>
    );
  }

  const statCards = [
    { label: "Total Users", value: stats?.total_users ?? 0, icon: Users },
    { label: "Active Users", value: stats?.active_users ?? 0, icon: Shield },
    { label: "Conversations", value: stats?.total_conversations ?? 0, icon: MessageSquare },
    { label: "Messages", value: stats?.total_messages ?? 0, icon: BarChart3 },
  ];

  return (
    <div style={{ background: "var(--obsidian-900)", minHeight: "100dvh", color: "var(--text-primary)" }}>
      <ConstellationCanvas />

      <div style={{ position: "relative", zIndex: 10, display: "flex", minHeight: "100dvh" }}>
        {/* Sidebar */}
        <div
          className="glass-strong"
          style={{ width: "220px", flexShrink: 0, borderRight: "1px solid var(--glass-border)", display: "flex", flexDirection: "column" }}
        >
          <div style={{ padding: "20px 16px 12px", borderBottom: "1px solid var(--glass-border)" }}>
            <div className="text-xs tracking-widest mb-1" style={{ color: "var(--gold)", fontFamily: "var(--font-display)" }}>RYUJI</div>
            <div className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)" }}>Dashboard</div>
            <div className="flex items-center gap-2 mt-2">
              <span className={`role-badge ${role}`}>{role}</span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{username}</span>
            </div>
          </div>

          <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: "4px" }}>
            {[
              { id: "overview", label: "Overview", icon: BarChart3 },
              { id: "users", label: "Users", icon: Users },
              ...(isCreator ? [{ id: "settings", label: "Settings", icon: Settings }] : []),
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`sidebar-item ${activeTab === id ? "active" : ""}`}
                onClick={() => setActiveTab(id as typeof activeTab)}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </nav>

          <div style={{ padding: "12px 8px", borderTop: "1px solid var(--glass-border)" }}>
            <Link href="/" className="sidebar-item">
              <ChevronLeft size={14} />
              Back to Chat
            </Link>
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, padding: "24px", overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "20px", letterSpacing: "0.1em" }}>
              {activeTab === "overview" && "Overview"}
              {activeTab === "users" && "User Management"}
              {activeTab === "settings" && "System Settings"}
            </h1>
            <button onClick={loadData} className="btn-ghost" style={{ fontSize: "12px" }}>
              <RefreshCw size={12} />
              Refresh
            </button>
          </div>

          {/* Overview tab */}
          {activeTab === "overview" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px", marginBottom: "24px" }}>
                {statCards.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="glass" style={{ padding: "20px", borderRadius: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                      <Icon size={14} style={{ color: "var(--gold)" }} />
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{label}</span>
                    </div>
                    <div style={{ fontSize: "28px", fontWeight: "700", fontFamily: "var(--font-display)", color: "var(--gold-light)" }}>
                      {value.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
              {stats && (
                <div className="glass" style={{ padding: "20px", borderRadius: "16px" }}>
                  <div className="text-xs mb-3" style={{ color: "var(--gold)", letterSpacing: "0.1em", fontFamily: "var(--font-display)" }}>
                    PLATFORM HEALTH
                  </div>
                  <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    Banned users: <span style={{ color: "#fca5a5" }}>{stats.banned_users}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Users tab */}
          {activeTab === "users" && (
            <div className="glass" style={{ borderRadius: "16px", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--glass-border)" }}>
                    {["Username", "Email", "Role", "Status", "Actions"].map((h) => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "var(--gold)", fontFamily: "var(--font-display)", fontSize: "10px", letterSpacing: "0.1em", fontWeight: 600 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {u.role === "creator" && <Crown size={12} style={{ color: "var(--gold)" }} />}
                          {u.username}
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>{u.email}</td>
                      <td style={{ padding: "12px 16px" }}>
                        {isCreator && u.role !== "creator" ? (
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                            style={{ background: "var(--obsidian-600)", color: "var(--text-primary)", border: "1px solid var(--glass-border)", borderRadius: "6px", padding: "4px 8px", fontSize: "12px" }}
                          >
                            {ROLE_OPTIONS.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`role-badge ${u.role}`}>{u.role}</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ color: u.is_banned ? "#fca5a5" : u.is_active ? "#86efac" : "var(--text-muted)", fontSize: "11px" }}>
                          {u.is_banned ? "Banned" : u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {u.role !== "creator" && (
                          <button
                            onClick={() => handleBan(u.id, u.is_banned)}
                            className="btn-ghost"
                            style={{ fontSize: "11px", color: u.is_banned ? "#86efac" : "#fca5a5" }}
                          >
                            <Ban size={11} />
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

          {/* Settings tab (creator only) */}
          {activeTab === "settings" && isCreator && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {settings.map((s) => (
                <div key={s.key} className="glass" style={{ padding: "16px 20px", borderRadius: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
                    <div style={{ flex: 1 }}>
                      <div className="text-xs mb-1" style={{ color: "var(--gold)", fontFamily: "var(--font-mono)" }}>{s.key}</div>
                      {editSetting?.key === s.key ? (
                        <input
                          className="input-field"
                          style={{ fontSize: "13px", padding: "8px 12px" }}
                          value={editSetting.value}
                          onChange={(e) => setEditSetting({ ...editSetting, value: e.target.value })}
                        />
                      ) : (
                        <div className="text-sm" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>{s.value}</div>
                      )}
                      {s.description && (
                        <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{s.description}</div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                      {editSetting?.key === s.key ? (
                        <>
                          <button onClick={handleSaveSetting} className="btn-primary" style={{ padding: "6px 14px", fontSize: "12px" }}>Save</button>
                          <button onClick={() => setEditSetting(null)} className="btn-secondary" style={{ padding: "6px 14px", fontSize: "12px" }}>Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => setEditSetting({ key: s.key, value: s.value })} className="btn-ghost" style={{ fontSize: "12px" }}>
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
