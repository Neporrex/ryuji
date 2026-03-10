import Cookies from "js-cookie";
import type {
  TokenResponse, User, ChatResponse,
  Conversation, Message, AdminStats
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Token helpers ─────────────────────────────────────────────────────────────

export const getToken = (): string | undefined => Cookies.get("ryuji_token");

export const setToken = (token: string, role: string, username: string) => {
  Cookies.set("ryuji_token", token, { expires: 7, sameSite: "strict" });
  Cookies.set("ryuji_role", role, { expires: 7, sameSite: "strict" });
  Cookies.set("ryuji_user", username, { expires: 7, sameSite: "strict" });
};

export const clearToken = () => {
  Cookies.remove("ryuji_token");
  Cookies.remove("ryuji_role");
  Cookies.remove("ryuji_user");
};

export const getStoredRole = (): string => Cookies.get("ryuji_role") || "guest";
export const getStoredUsername = (): string => Cookies.get("ryuji_user") || "";

// ── Request helper ────────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = true,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  signup: (username: string, email: string, password: string): Promise<TokenResponse> =>
    request("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    }, false),

  login: (username: string, password: string): Promise<TokenResponse> =>
    request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }, false),

  me: (): Promise<User> => request("/auth/me"),

  limits: () => request<{
    role: string;
    daily_limit: number;
    used_today: number;
    remaining: number;
  }>("/auth/limits"),
};

// ── Chat ──────────────────────────────────────────────────────────────────────

export const chatApi = {
  sendMessage: (message: string, conversation_id?: string): Promise<ChatResponse> =>
    request("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message, conversation_id }),
    }),

  getConversations: (): Promise<Conversation[]> =>
    request("/api/conversations"),

  getMessages: (conversationId: string): Promise<Message[]> =>
    request(`/api/conversations/${conversationId}/messages`),

  deleteConversation: (conversationId: string): Promise<void> =>
    request(`/api/conversations/${conversationId}`, { method: "DELETE" }),
};

// ── Admin ─────────────────────────────────────────────────────────────────────

export const adminApi = {
  getStats: (): Promise<AdminStats> =>
    request("/admin/stats"),

  getUsers: (skip = 0, limit = 50): Promise<User[]> =>
    request(`/admin/users?skip=${skip}&limit=${limit}`),

  banUser: (user_id: string, reason?: string): Promise<void> =>
    request("/admin/users/ban", {
      method: "POST",
      body: JSON.stringify({ user_id, reason }),
    }),

  unbanUser: (user_id: string): Promise<void> =>
    request("/admin/users/unban", {
      method: "POST",
      body: JSON.stringify({ user_id }),
    }),

  updateRole: (user_id: string, role: string): Promise<void> =>
    request("/admin/users/role", {
      method: "POST",
      body: JSON.stringify({ user_id, role }),
    }),

  getSettings: () => request<Array<{ key: string; value: string; description: string }>>("/admin/settings"),

  updateSetting: (key: string, value: string, description?: string): Promise<void> =>
    request("/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ key, value, description }),
    }),
};
