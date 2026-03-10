"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { getToken, getStoredRole, getStoredUsername, authApi } from "@/lib/api";
import Navbar from "@/components/Navbar";
import ChatInterface from "@/components/ChatInterface";
import AuthModal from "@/components/AuthModal";
import type { UserRole } from "@/types";

const ConstellationCanvas = dynamic(
  () => import("@/components/ConstellationCanvas"),
  { ssr: false }
);

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState<UserRole>("guest");
  const [username, setUsername] = useState("");
  const [authModal, setAuthModal] = useState<"login" | "signup" | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const token = getToken();
    if (token) {
      const storedRole = getStoredRole() as UserRole;
      const storedUser = getStoredUsername();
      setIsAuthenticated(true);
      setRole(storedRole);
      setUsername(storedUser);

      // Verify token is still valid
      authApi.me().catch(() => {
        setIsAuthenticated(false);
        setRole("guest");
        setUsername("");
      });
    }
  }, []);

  const handleAuthSuccess = (newRole: string, newUsername: string) => {
    setIsAuthenticated(true);
    setRole(newRole as UserRole);
    setUsername(newUsername);
    setAuthModal(null);
  };

  if (!hydrated) {
    return (
      <div
        style={{
          background: "var(--obsidian-900)",
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="loading-dots">
          <span /><span /><span />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--obsidian-900)",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Constellation background */}
      <ConstellationCanvas />

      {/* Radial gradient overlays */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(201,162,39,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "radial-gradient(ellipse 40% 40% at 80% 80%, rgba(201,162,39,0.04) 0%, transparent 60%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Navbar */}
      <div style={{ position: "relative", zIndex: 40 }}>
        <Navbar
          onOpenAuth={setAuthModal}
          isAuthenticated={isAuthenticated}
          role={role}
        />
      </div>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          position: "relative",
          zIndex: 10,
          paddingTop: "56px", // navbar height
        }}
      >
        {/* Hero header - shown when not focused on chat */}
        <div
          className="text-center animate-fade-in"
          style={{ padding: "32px 16px 16px" }}
        >
          <div
            className="text-xs tracking-widest mb-3"
            style={{
              color: "var(--gold)",
              fontFamily: "var(--font-display)",
              letterSpacing: "0.3em",
            }}
          >
            AI ASSISTANT
          </div>
          <h1
            className="text-4xl sm:text-5xl font-bold mb-2"
            style={{
              fontFamily: "var(--font-display)",
              background: "linear-gradient(135deg, #e8c84a 0%, #c9a227 50%, #9a7a1a 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              letterSpacing: "0.1em",
            }}
          >
            RYUJI
          </h1>
          <p
            className="text-sm tracking-wide"
            style={{ color: "var(--text-secondary)", letterSpacing: "0.15em" }}
          >
            Sharp mind. Calm presence.
          </p>
        </div>

        {/* Gold divider */}
        <div style={{ padding: "0 16px", maxWidth: "800px", margin: "0 auto", width: "100%" }}>
          <div className="gold-line" />
        </div>

        {/* Chat container */}
        <div
          style={{
            flex: 1,
            maxWidth: "800px",
            width: "100%",
            margin: "0 auto",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            className="glass-strong animate-slide-up"
            style={{
              borderRadius: "20px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              height: "calc(100dvh - 280px)",
              minHeight: "400px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,162,39,0.1)",
            }}
          >
            <ChatInterface
              role={role}
              username={username}
              isAuthenticated={isAuthenticated}
              onOpenAuth={setAuthModal}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          position: "relative",
          zIndex: 10,
          textAlign: "center",
          padding: "16px",
          borderTop: "1px solid var(--glass-border)",
        }}
      >
        <p
          className="text-xs"
          style={{ color: "var(--text-muted)", letterSpacing: "0.05em" }}
        >
          Ryuji — Created by{" "}
          <span style={{ color: "var(--gold)" }}>neporrex</span>
          {" · "}
          <a href="/privacy" style={{ color: "var(--text-muted)", textDecoration: "underline" }}>
            Privacy
          </a>
          {" · "}
          <a href="/terms" style={{ color: "var(--text-muted)", textDecoration: "underline" }}>
            Terms
          </a>
        </p>
      </footer>

      {/* Auth modal */}
      {authModal && (
        <AuthModal
          mode={authModal}
          onClose={() => setAuthModal(null)}
          onSuccess={handleAuthSuccess}
          onSwitchMode={setAuthModal}
        />
      )}
    </div>
  );
}
