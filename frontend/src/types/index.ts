export type UserRole = "guest" | "user" | "admin" | "creator";

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  role: UserRole;
  isAuthenticated: boolean;
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
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  role: UserRole;
  username: string;
}

export interface AdminStats {
  total_users: number;
  active_users: number;
  total_conversations: number;
  total_messages: number;
  banned_users: number;
}
