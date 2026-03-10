"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, LogOut, Settings, LayoutDashboard, User as UserIcon } from "lucide-react";
import { clearToken, getStoredRole, getStoredUsername } from "@/lib/api";
import type { UserRole } from "@/types";

interface NavbarProps {
  onOpenAuth?: (mode: "login" | "signup") => void;
  isAuthenticated?: boolean;
  role?: UserRole;
}

export default function Navbar({ onOpenAuth, isAuthenticated, role }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const username = getStoredUsername();
  const currentRole = role || (getStoredRole() as UserRole);

  const handleLogout = () => {
    clearToken();
    window.location.reload();
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-40 glass"
      style={{ borderBottom: "1px solid var(--glass-border)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{
              background: "linear-gradient(135deg, #9a7a1a, #c9a227)",
              color: "#050507",
              fontFamily: "var(--font-display)",
              boxShadow: "0 0 12px rgba(201,162,39,0.3)",
            }}
          >
            R
          </div>
          <span
            className="text-lg tracking-wider font-semibold"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--gold-light)",
              letterSpacing: "0.15em",
            }}
          >
            RYUJI
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-2">
          {isAuthenticated ? (
            <>
              {/* Role badge */}
              <span className={`role-badge ${currentRole}`}>
                {currentRole}
              </span>
              <span
                className="text-sm ml-2"
                style={{ color: "var(--text-secondary)" }}
              >
                {username}
              </span>

              {/* Admin link */}
              {(currentRole === "admin" || currentRole === "creator") && (
                <Link href="/admin" className="btn-ghost">
                  <LayoutDashboard size={14} />
                  Dashboard
                </Link>
              )}

              <button onClick={handleLogout} className="btn-ghost">
                <LogOut size={14} />
                Sign Out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onOpenAuth?.("login")}
                className="btn-ghost"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth?.("signup")}
                className="btn-primary"
                style={{ padding: "7px 18px", fontSize: "13px" }}
              >
                Get Started
              </button>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button
          className="sm:hidden btn-ghost p-2"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="sm:hidden glass-strong"
          style={{ borderTop: "1px solid var(--glass-border)", padding: "12px 16px" }}
        >
          {isAuthenticated ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 py-2">
                <span className={`role-badge ${currentRole}`}>{currentRole}</span>
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{username}</span>
              </div>
              {(currentRole === "admin" || currentRole === "creator") && (
                <Link href="/admin" className="btn-ghost justify-start">
                  <LayoutDashboard size={14} />
                  Admin Dashboard
                </Link>
              )}
              <button onClick={handleLogout} className="btn-ghost justify-start">
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button onClick={() => { onOpenAuth?.("login"); setMenuOpen(false); }} className="btn-ghost">
                Sign In
              </button>
              <button onClick={() => { onOpenAuth?.("signup"); setMenuOpen(false); }} className="btn-primary">
                Get Started
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
