"use client";

import { useState } from "react";
import { X, Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { authApi, setToken } from "@/lib/api";

interface AuthModalProps {
  mode: "login" | "signup";
  onClose: () => void;
  onSuccess: (role: string, username: string) => void;
  onSwitchMode: (mode: "login" | "signup") => void;
}

export default function AuthModal({ mode, onClose, onSuccess, onSwitchMode }: AuthModalProps) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Please fill in all required fields");
      return;
    }
    if (mode === "signup" && !email.trim()) {
      setError("Email is required for signup");
      return;
    }

    setLoading(true);
    try {
      let res;
      if (mode === "signup") {
        res = await authApi.signup(username, email, password);
      } else {
        res = await authApi.login(username, password);
      }
      setToken(res.access_token, res.role, res.username);
      onSuccess(res.role, res.username);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel" onKeyDown={handleKeyDown}>
        <div
          className="glass-strong rounded-2xl overflow-hidden"
          style={{ boxShadow: "var(--shadow-glass-lg, 0 20px 60px rgba(0,0,0,0.7))" }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: "1px solid var(--glass-border)" }}
          >
            <div>
              <div
                className="text-xs tracking-widest mb-1"
                style={{ color: "var(--gold)", fontFamily: "var(--font-display)" }}
              >
                RYUJI
              </div>
              <h2
                className="text-lg font-semibold"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {mode === "login" ? "Welcome Back" : "Create Account"}
              </h2>
            </div>
            <button onClick={onClose} className="btn-ghost p-2">
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-6 flex flex-col gap-4">
            {/* Error */}
            {error && (
              <div
                className="text-sm px-3 py-2 rounded-lg animate-fade-in"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  color: "#fca5a5",
                }}
              >
                {error}
              </div>
            )}

            {/* Username */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs" style={{ color: "var(--text-secondary)", letterSpacing: "0.05em" }}>
                USERNAME
              </label>
              <input
                className="input-field"
                type="text"
                placeholder="your_username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>

            {/* Email (signup only) */}
            {mode === "signup" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs" style={{ color: "var(--text-secondary)", letterSpacing: "0.05em" }}>
                  EMAIL
                </label>
                <input
                  className="input-field"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            )}

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs" style={{ color: "var(--text-secondary)", letterSpacing: "0.05em" }}>
                PASSWORD
              </label>
              <div className="relative">
                <input
                  className="input-field"
                  style={{ paddingRight: "44px" }}
                  type={showPass ? "text" : "password"}
                  placeholder={mode === "signup" ? "Min. 8 characters" : "••••••••"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 btn-ghost p-1"
                  onClick={() => setShowPass(!showPass)}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              className="btn-primary w-full mt-2"
              onClick={handleSubmit}
              disabled={loading}
              style={{ opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
            >
              {loading ? (
                <span className="loading-dots">
                  <span /><span /><span />
                </span>
              ) : mode === "login" ? (
                <><LogIn size={15} /> Sign In</>
              ) : (
                <><UserPlus size={15} /> Create Account</>
              )}
            </button>

            {/* Switch mode */}
            <p className="text-center text-sm" style={{ color: "var(--text-muted)" }}>
              {mode === "login" ? (
                <>
                  No account?{" "}
                  <button
                    onClick={() => onSwitchMode("signup")}
                    style={{ color: "var(--gold)", textDecoration: "underline" }}
                  >
                    Sign up free
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => onSwitchMode("login")}
                    style={{ color: "var(--gold)", textDecoration: "underline" }}
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
