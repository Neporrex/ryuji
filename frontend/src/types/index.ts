export type UserRole = "guest" | "user" | "admin" | "creator";
export type UserPlan = "free" | "pro";

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  plan: UserPlan;
  is_pro: boolean;
  is_active: boolean;
  is_banned: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface ChatResponse {
  reply: string;
  conversation_id: string;
  message_id: string;
  remaining_messages?: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  role: UserRole;
  username: string;
  plan: UserPlan;
  is_pro: boolean;
}

export interface AdminStats {
  total_users: number;
  active_users: number;
  total_conversations: number;
  total_messages: number;
  banned_users: number;
  pro_users: number;
}
