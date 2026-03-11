"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Check, Zap, Crown, ArrowLeft, Sparkles, MessageSquare, History, Gauge } from "lucide-react";
import { getToken, getStoredRole, billingApi } from "@/lib/api";

const ConstellationCanvas = dynamic(() => import("@/components/ConstellationCanvas"), { ssr: false });

const FREE_FEATURES = [
  { icon: MessageSquare, text: "20 messages / day" },
  { icon: History,       text: "Limited conversation history" },
  { icon: Gauge,         text: "Standard speed" },
];

const PRO_FEATURES = [
  { icon: MessageSquare, text: "Unlimited messages" },
  { icon: History,       text: "Full conversation history" },
  { icon: Zap,           text: "Priority access & faster responses" },
  { icon: Sparkles,      text: "Premium AI models" },
  { icon: Crown,         text: "Early access to new features" },
];

export default function PricingPage() {
  const [isAuth, setIsAuth] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setIsAuth(!!getToken());
    const role = getStoredRole();
    setIsPro(["admin","creator"].includes(role));
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("upgrade") === "success") setSuccess(true);
    }
  }, []);

  const handleUpgrade = async () => {
    if (!isAuth) { window.location.href = "/?auth=signup"; return; }
    setLoading(true);
    try {
      const { url } = await billingApi.checkout();
      window.location.href = url;
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to start checkout");
    } finally { setLoading(false); }
  };

  const handlePortal = async () => {
    setLoading(true);
    try {
      const { url } = await billingApi.portal();
      window.location.href = url;
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)", color: "var(--text-1)", fontFamily: "var(--font)", position: "relative", overflow: "hidden" }}>
      <ConstellationCanvas />

      <div style={{ position: "relative", zIndex: 10, maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>

        {/* Back */}
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-3)", fontSize: 13, textDecoration: "none", marginBottom: 48, transition: "color 0.15s" }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "var(--text-1)")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "var(--text-3)")}
        >
          <ArrowLeft size={13} /> Back to chat
        </Link>

        {/* Success banner */}
        {success && (
          <div style={{ marginBottom: 32, padding: "14px 20px", background: "rgba(134,239,172,0.08)", border: "1px solid rgba(134,239,172,0.2)", borderRadius: 12, display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#86efac", animation: "fadeIn 0.4s ease" }}>
            <Check size={15} /> Welcome to Ryuji Pro! Your account has been upgraded.
          </div>
        )}

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ fontSize: 11, color: "var(--gold)", letterSpacing: "0.18em", marginBottom: 12 }}>RYUJI PLANS</div>
          <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 12, lineHeight: 1.1 }}>
            Simple, honest pricing.
          </h1>
          <p style={{ fontSize: 15, color: "var(--text-3)", maxWidth: 420, margin: "0 auto" }}>
            Start free. Upgrade when you need more.
          </p>
        </div>

        {/* Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 720, margin: "0 auto" }}>

          {/* Free */}
          <div style={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 18, padding: "28px 24px", display: "flex", flexDirection: "column" }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: "var(--text-3)", letterSpacing: "0.08em", marginBottom: 8 }}>FREE</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: 32, fontWeight: 700 }}>$0</span>
                <span style={{ fontSize: 13, color: "var(--text-3)" }}>/month</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-3)" }}>Get started, no credit card.</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, marginBottom: 24 }}>
              {FREE_FEATURES.map(({ icon: Icon, text }) => (
                <div key={text} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--text-2)" }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={11} style={{ color: "var(--text-3)" }} />
                  </div>
                  {text}
                </div>
              ))}
            </div>

            <Link href="/" style={{ display: "block", textAlign: "center", padding: "10px", background: "var(--bg-3)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-2)", fontSize: 13, fontWeight: 500, textDecoration: "none", transition: "all 0.15s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-3)"; }}
            >
              {isAuth ? "Current plan" : "Start free"}
            </Link>
          </div>

          {/* Pro */}
          <div style={{ background: "var(--bg-2)", border: "1px solid rgba(201,162,39,0.3)", borderRadius: 18, padding: "28px 24px", display: "flex", flexDirection: "column", position: "relative", boxShadow: "0 0 40px rgba(201,162,39,0.06)" }}>
            {/* Badge */}
            <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "var(--gold)", color: "#0d0d0d", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", padding: "4px 12px", borderRadius: 20 }}>
              MOST POPULAR
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: "var(--gold)", letterSpacing: "0.08em", marginBottom: 8 }}>PRO</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: 32, fontWeight: 700, color: "var(--gold-light)" }}>$9.99</span>
                <span style={{ fontSize: 13, color: "var(--text-3)" }}>/month</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-3)" }}>Everything you need, unlimited.</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, marginBottom: 24 }}>
              {PRO_FEATURES.map(({ icon: Icon, text }) => (
                <div key={text} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--text-1)" }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: "var(--gold-dim)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={11} style={{ color: "var(--gold)" }} />
                  </div>
                  {text}
                </div>
              ))}
            </div>

            {isPro ? (
              <button onClick={handlePortal} disabled={loading} style={{ padding: "11px", background: "var(--gold-dim)", border: "1px solid rgba(201,162,39,0.3)", borderRadius: 10, color: "var(--gold)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font)", transition: "all 0.15s" }}>
                Manage subscription →
              </button>
            ) : (
              <button onClick={handleUpgrade} disabled={loading} style={{ padding: "11px", background: loading ? "var(--bg-3)" : "var(--gold)", border: "none", borderRadius: 10, color: loading ? "var(--text-3)" : "#0d0d0d", fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "var(--font)", transition: "all 0.15s", boxShadow: "0 0 24px rgba(201,162,39,0.2)" }}>
                {loading ? "Loading…" : isAuth ? "Upgrade to Pro →" : "Get started →"}
              </button>
            )}
          </div>
        </div>

        {/* Footer note */}
        <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-3)", marginTop: 32 }}>
          Cancel anytime. Secure payments via Stripe. Created by <span style={{ color: "rgba(201,162,39,0.5)" }}>neporrex</span>.
        </p>
      </div>

      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
    </div>
  );
}
