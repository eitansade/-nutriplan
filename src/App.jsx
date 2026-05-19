// NutriPlan App.jsx - MVP v7
// ATTORNEY REVIEW REQUIRED before full commercial launch.
// Legal text is placeholder only and has not been reviewed by counsel.
// Supabase: email+password auth + plan storage integrated.
// Paid access is verified through Supabase profiles after the PayPal webhook updates payment_status.

import { useMemo, useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase ─────────────────────────────────────────────────────────────
// Uses Vercel frontend env vars only. No service_role key is ever exposed here.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_READY = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const SUPABASE_CONFIG_ERROR = { message: "Supabase is not configured. Check Vercel frontend env vars." };
function disabledSupabaseQuery() {
  return {
    select() { return this; },
    eq() { return this; },
    ilike() { return this; },
    limit() { return this; },
    maybeSingle: async () => ({ data: null, error: SUPABASE_CONFIG_ERROR }),
    upsert: async () => ({ data: null, error: SUPABASE_CONFIG_ERROR }),
  };
}
const supabase = SUPABASE_READY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : {
  auth: {
    getSession: async () => ({ data: { session: null }, error: SUPABASE_CONFIG_ERROR }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
    signInWithPassword: async () => ({ data: null, error: SUPABASE_CONFIG_ERROR }),
    signUp: async () => ({ data: null, error: SUPABASE_CONFIG_ERROR }),
    signOut: async () => ({ error: null }),
  },
  from: () => disabledSupabaseQuery(),
};

// ─── Constants ────────────────────────────────────────────────────────────
const STORAGE_KEY = "nutriplan_v7_mvp";
const SUPPORT_EMAIL = "hello.nutriplan@gmail.com";

const PAYPAL = {
  basic: "https://www.paypal.com/ncp/payment/XDWATET936BTS",
  pro: "https://www.paypal.com/ncp/payment/UWQCJ46HF8KHU",
  elite: "https://www.paypal.com/ncp/payment/L97A998HWV2ZW",
};

const PLANS = [
  { id: "free", name: "Free", price: "$0", badge: "Try it free", desc: "Preview the experience before you commit.", features: ["1 full day of meals", "Preview 2 locked days", "Set your own calories", "No credit card needed"] },
  { id: "basic", name: "Basic", price: "$12", badge: "Full plan", desc: "A complete 7-day nutrition structure built around your body and goal.", features: ["Full 7-day meal plan", "Smart calorie estimate", "Daily macro targets", "Body-fat estimate"] },
  { id: "pro", name: "Pro", price: "$27", badge: "Most popular", desc: "The flexible version most people need: full plan, swaps, recipes, and tools.", features: ["Everything in Basic", "Swap meals you dislike", "Food label calculator", "Full recipe instructions"], recommended: true },
  { id: "elite", name: "Elite", price: "$49", badge: "Food + Training", desc: "Food and training together for people who want structure beyond meals.", features: ["Everything in Pro", "Custom weekly workouts", "Gym or home options", "Built around your schedule"], premium: true },
];

const FAQS = [
  ["What happens after I pay?", "Create or sign in to your NutriPlan account using the same email you used at PayPal checkout. PayPal sends the payment to our webhook, your Supabase profile is marked active, and the Refresh access button unlocks your plan."],
  ["Is this a strict diet?", "No. NutriPlan is built around normal meals, moderate targets, and practical consistency. It gives structure without asking you to eat perfectly."],
  ["Are the calories exact?", "No food estimate is perfect. Calories and macros are practical estimates to help you make better choices, not medical numbers or a guarantee."],
  ["Can I use this with allergies or medical conditions?", "Only with care and professional guidance. NutriPlan does not screen for allergies, intolerances, pregnancy, eating disorders, diabetes, or medical diets."],
  ["Do results vary?", "Yes. Results depend on consistency, body size, activity, sleep, stress, health history, and many factors outside the app."],
  ["Why is there a launch timer?", "It highlights the current founding launch offer. The PayPal checkout price is the source of truth, and launch pricing may change later."],
];

const isPaid = (t) => t !== "free";
const PAID_TIERS = ["basic", "pro", "elite"];
const isPaidTier = (t) => PAID_TIERS.includes(t);
const canSwap = (t) => ["pro", "elite"].includes(t);
const hasWorkouts = (t) => t === "elite";
const hasCalc = (t) => ["pro", "elite"].includes(t);
const hasBFP = (t) => ["basic", "pro", "elite"].includes(t);
const hasRecipes = (t) => ["pro", "elite"].includes(t);

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const ACT = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 };
const FALLBACK_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='400'%3E%3Crect fill='%230c0e18' width='800' height='400'/%3E%3C/svg%3E";

const IMG = {
  chicken: "https://images.unsplash.com/photo-1604909052743-94e838986d24?w=800&q=80",
  eggs: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&q=80",
  steak: "https://images.unsplash.com/photo-1558030006-450675393462?w=800&q=80",
  pasta: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&q=80",
  salmon: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&q=80",
  yogurt: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=80",
  wrap: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&q=80",
  sandwich: "https://images.unsplash.com/photo-1553909489-cd47e0907980?w=800&q=80",
  burger: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80",
  oats: "https://images.unsplash.com/photo-1517673408076-a2f27a2c0edf?w=800&q=80",
  apple: "https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=800&q=80",
  nuts: "https://images.unsplash.com/photo-1508747703725-719777637510?w=800&q=80",
  pancakes: "https://images.unsplash.com/photo-1575853121743-60c24f0a7502?w=800&q=80",
  burrito: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&q=80",
  tacos: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&q=80",
  potato: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=800&q=80",
  cottage: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=80",
  smoothie: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80",
  turkey: "https://images.unsplash.com/photo-1553909489-cd47e0907980?w=800&q=80",
  teriyaki: "https://images.unsplash.com/photo-1604909052743-94e838986d24?w=800&q=80",
  mac: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&q=80",
  pizza: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80",
  honey: "https://images.unsplash.com/photo-1604909052743-94e838986d24?w=800&q=80",
  pudding: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=80",
  popcorn: "https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=800&q=80",
  ricecake: "https://images.unsplash.com/photo-1517673408076-a2f27a2c0edf?w=800&q=80",
};

// ─── Unit helpers ─────────────────────────────────────────────────────────
const lbsToKg = (lbs) => Math.round(lbs * 0.453592 * 10) / 10;
const kgToLbs = (kg) => Math.round(kg * 2.20462);
const inchesToCm = (inches) => Math.round(inches * 2.54);
const cmToInches = (cm) => Math.round((cm / 2.54) * 10) / 10;

// ─── Storage ──────────────────────────────────────────────────────────────
function loadState() { try { const r = window.localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; } catch { return null; } }
function saveState(s) { try { const safe = { ...s }; delete safe.email; delete safe.password; window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safe)); } catch { } }

// ─── Styles ───────────────────────────────────────────────────────────────
const S = {
  page: { minHeight: "100vh", background: "radial-gradient(circle at top left,#24384b,#0b1220 44%,#05070d)", color: "#f8fafc", fontFamily: "Inter,system-ui,sans-serif" },
  wrap: { width: "min(1100px, calc(100% - 32px))", margin: "0 auto" },
  card: { background: "rgba(15,23,42,.8)", border: "1px solid rgba(148,163,184,.15)", borderRadius: 24, boxShadow: "0 20px 60px rgba(0,0,0,.25)" },
  inp: { width: "100%", boxSizing: "border-box", background: "rgba(2,6,23,.75)", color: "#fff", border: "1px solid rgba(148,163,184,.22)", borderRadius: 14, padding: "14px", fontSize: 16, outline: "none" },
  btn: { border: 0, borderRadius: 14, padding: "14px 18px", background: "linear-gradient(135deg,#f8fafc,#b7d7c2)", color: "#07111f", fontWeight: 900, cursor: "pointer", fontSize: 15, boxShadow: "0 12px 30px rgba(183,215,194,.18)" },
  sec: { border: "1px solid rgba(148,163,184,.2)", borderRadius: 14, padding: "14px 18px", background: "rgba(15,23,42,.72)", color: "#e2e8f0", fontWeight: 700, cursor: "pointer", fontSize: 15 },
  authBtn: { border: "1px solid rgba(183,215,194,.5)", borderRadius: 999, padding: "10px 16px", background: "linear-gradient(135deg,rgba(248,250,252,.96),rgba(183,215,194,.92))", color: "#07111f", fontWeight: 900, cursor: "pointer", fontSize: 13, boxShadow: "0 12px 28px rgba(183,215,194,.18)" },
};

// ─── Legal ────────────────────────────────────────────────────────────────
const LEGAL = {
  terms: { title: "Terms of Service", body: `Last updated: ${new Date().getFullYear()}\n\nATTORNEY REVIEW PENDING - Draft placeholder only. To be finalized before launch.\n\n1. ACCEPTANCE OF TERMS\nBy using NutriPlan, you agree to these Terms. You must be 18 years of age or older, or have explicit parent or guardian permission, to use this service.\n\n2. NOT MEDICAL ADVICE\nNutriPlan provides general nutrition, fitness, and wellness information for educational purposes only. Nothing on this platform constitutes medical advice, diagnosis, or treatment. This service is not for emergency or medical use. Always consult a qualified healthcare professional before making changes to your diet, exercise, or health routine.\n\n3. ALLERGY AND FOOD SAFETY WARNING\nNutriPlan does not account for food allergies, intolerances, or medical dietary restrictions. You are solely responsible for reviewing all ingredients and meals for allergens. Do not rely on this app if you have serious food allergies.\n\n4. USER RESPONSIBILITY\nYou are solely responsible for all food choices you make based on this app. NutriPlan accepts no liability for any adverse health outcomes resulting from following suggestions provided.\n\n5. NO GUARANTEES\nResults vary by individual. NutriPlan does not guarantee any specific weight loss, body composition changes, or fitness results. Individual outcomes depend on many factors outside our control.\n\n6. PAYMENTS\nPayments are handled by PayPal, a third-party payment processor. NutriPlan does not store your payment information.\n\n7. DIGITAL PRODUCT / REFUNDS\nNutriPlan delivers digital content. Once access is granted, all sales are final and non-refundable, except in cases of verified technical failure.\n\n8. GOVERNING LAW\nTo be finalized before launch.\n\n9. CONTACT\n${SUPPORT_EMAIL}` },
  privacy: { title: "Privacy Policy", body: `Last updated: ${new Date().getFullYear()}\n\nATTORNEY REVIEW PENDING - Draft placeholder only. To be finalized before launch.\n\n1. INFORMATION WE COLLECT\nWe collect your email address for account creation and the health data you voluntarily enter (age, weight, height, activity level, goals). We do not collect payment information.\n\n2. HOW WE STORE IT\nAccount data is stored securely via Supabase. Non-sensitive plan preferences may also be stored in your browser's local storage. Passwords are never stored in plain text.\n\n3. PAYMENTS\nPayments are processed by PayPal. We do not receive or store your credit card or payment details.\n\n4. WHAT WE DO NOT DO\nWe do not sell your personal information. We do not share it with advertisers or third parties.\n\n5. RESULTS VARY\nThis app provides estimates only. Results vary by individual.\n\n6. GOVERNING LAW\nTo be finalized before launch.\n\n7. CONTACT\n${SUPPORT_EMAIL}` },
  refund: { title: "Refund Policy", body: `Last updated: ${new Date().getFullYear()}\n\nATTORNEY REVIEW PENDING - Draft placeholder only. To be finalized before launch.\n\nDIGITAL PRODUCT - ALL SALES FINAL\nNutriPlan provides digital wellness content. Once access to your plan is granted, all sales are final and non-refundable.\n\nTECHNICAL ISSUES\nIf you experience a verified technical issue preventing access, contact us within 48 hours at ${SUPPORT_EMAIL} with your PayPal receipt.\n\nNO RESULTS GUARANTEE\nRefunds are not issued based on individual results or failure to achieve personal goals.\n\nPAYMENT PROCESSOR\nPayments are handled by PayPal, a third-party processor.\n\nGOVERNING LAW\nTo be finalized before launch.\n\nCONTACT\n${SUPPORT_EMAIL}` },
};

// ─── UI Components ────────────────────────────────────────────────────────
function Pill({ children, color }) {
  return <span style={{ display: "inline-flex", border: "1px solid rgba(148,163,184,.18)", background: "rgba(15,23,42,.72)", color: color || "#cbd5e1", borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 800 }}>{children}</span>;
}
function MacroBox({ icon, val, label }) {
  return (
    <div style={{ ...S.card, padding: 12, textAlign: "center" }}>
      <div style={{ fontSize: 18 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 900 }}>{val}</div>
      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700 }}>{label}</div>
    </div>
  );
}
function Field({ label, error, children }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em" }}>{label}</label>
      {children}
      {error && <div style={{ color: "#fca5a5", fontSize: 12 }}>{error}</div>}
    </div>
  );
}
function SafeImg({ src, alt, style }) {
  const [err, setErr] = useState(false);
  return <img src={err ? FALLBACK_IMG : src} alt={alt || ""} style={style} onError={() => setErr(true)} />;
}

function SliderField({ label, error, value, onChange, min, max, step = 1, unit, altUnit, toAlt, fromAlt, altMin, altMax, defaultAlt = false }) {
  const [useAlt, setUseAlt] = useState(defaultAlt);
  const numVal = Number(value) || min;
  const displayVal = useAlt ? toAlt(numVal) : numVal;
  const displayMin = useAlt ? (altMin !== undefined ? altMin : toAlt(min)) : min;
  const displayMax = useAlt ? (altMax !== undefined ? altMax : toAlt(max)) : max;
  const safeRange = (displayMax - displayMin) || 1;
  const pct = Math.min(100, Math.max(0, ((displayVal - displayMin) / safeRange) * 100));
  function handleSlider(e) {
    const v = Number(e.target.value);
    onChange(useAlt ? String(fromAlt(v)) : String(v));
  }
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <label style={{ color: "#94a3b8", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em" }}>{label}</label>
        {altUnit && (
          <button type="button" onClick={() => setUseAlt(u => !u)} style={{ background: "rgba(183,215,194,.12)", border: "1px solid rgba(183,215,194,.3)", borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 800, color: "#b7d7c2", cursor: "pointer" }}>
            {useAlt ? altUnit : unit} / {useAlt ? unit : altUnit}
          </button>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <input type="range" min={displayMin} max={displayMax} step={step} value={displayVal} onChange={handleSlider}
          style={{ flex: 1, height: 6, borderRadius: 999, outline: "none", cursor: "pointer", appearance: "none", WebkitAppearance: "none", background: `linear-gradient(to right,#b7d7c2 ${pct}%,rgba(148,163,184,.18) ${pct}%)` }} />
        <div style={{ minWidth: 68, textAlign: "right", fontSize: 22, fontWeight: 900, color: "#f8fafc" }}>
          {displayVal}<span style={{ fontSize: 12, color: "#64748b", marginLeft: 3 }}>{useAlt ? altUnit : unit}</span>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", color: "#475569", fontSize: 11 }}>
        <span>{displayMin} {useAlt ? altUnit : unit}</span>
        <span>{displayMax} {useAlt ? altUnit : unit}</span>
      </div>
      {error && <div style={{ color: "#fca5a5", fontSize: 12 }}>{error}</div>}
      <style>{`input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#f8fafc,#b7d7c2);border:2px solid #020617;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.4)}input[type=range]::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#f8fafc,#b7d7c2);border:2px solid #020617;cursor:pointer}`}</style>
    </div>
  );
}

function LaunchBanner() {
  const [secsLeft, setSecsLeft] = useState(900);
  useEffect(() => {
    if (secsLeft <= 0) return;
    const t = setTimeout(() => setSecsLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secsLeft]);
  if (secsLeft <= 0) return null;
  const mins = String(Math.floor(secsLeft / 60)).padStart(2, "0");
  const secs = String(secsLeft % 60).padStart(2, "0");
  return (
    <div style={{ marginTop: 18, marginBottom: 24, borderRadius: 18, padding: "16px 18px", background: "linear-gradient(135deg,rgba(183,215,194,.18),rgba(96,165,250,.12),rgba(251,191,36,.08))", border: "1px solid rgba(183,215,194,.36)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap", boxShadow: "0 18px 45px rgba(0,0,0,.22)" }}>
      <div style={{ minWidth: 220, flex: "1 1 260px" }}>
        <div style={{ fontSize: 12, fontWeight: 900, color: "#dbeafe", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>Founding launch pricing</div>
        <div style={{ fontSize: 15, fontWeight: 900, color: "#f8fafc", marginBottom: 2 }}>Early access rates are live now</div>
        <div style={{ fontSize: 12, color: "#9fb3c8" }}>Premium nutrition planning for real life. Launch pricing may change anytime.</div>
      </div>
      <div style={{ fontVariantNumeric: "tabular-nums", fontSize: 26, fontWeight: 900, color: "#07111f", letterSpacing: 1, background: "linear-gradient(135deg,#f8fafc,#b7d7c2)", borderRadius: 14, padding: "10px 16px", minWidth: 96, textAlign: "center" }}>{mins}:{secs}</div>
    </div>
  );
}

function FAQSection() {
  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ color: "#b7d7c2", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 12, textAlign: "center" }}>Questions before you start</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12 }}>
        {FAQS.map(([question, answer]) => (
          <details key={question} style={{ ...S.card, padding: "16px 18px", borderRadius: 18, background: "rgba(15,23,42,.58)" }}>
            <summary style={{ cursor: "pointer", color: "#f8fafc", fontWeight: 900, fontSize: 14 }}>{question}</summary>
            <p style={{ color: "#9fb3c8", fontSize: 13, lineHeight: 1.6, margin: "10px 0 0" }}>{answer}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

function LegalModal({ type, onClose }) {
  if (!type || !LEGAL[type]) return null;
  const { title, body } = LEGAL[type];
  return (
    <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.85)", display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div style={{ ...S.card, width: "100%", maxWidth: 640, maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", borderRadius: "24px 24px 0 0" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px 16px", borderBottom: "1px solid rgba(148,163,184,.12)" }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>{title}</h2>
          <button aria-label="Close" onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 26, cursor: "pointer", lineHeight: 1 }}>x</button>
        </div>
        <div style={{ overflowY: "auto", padding: "20px 24px 32px", color: "#94a3b8", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{body}</div>
      </div>
    </div>
  );
}

function LegalFooter({ onOpen }) {
  const lk = { color: "#475569", fontSize: 12, cursor: "pointer", textDecoration: "underline" };
  return (
    <footer style={{ borderTop: "1px solid rgba(148,163,184,.08)", marginTop: 48, padding: "24px 0 40px", textAlign: "center" }}>
      <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <span style={lk} onClick={() => onOpen("terms")}>Terms of Service</span>
        <span style={lk} onClick={() => onOpen("privacy")}>Privacy Policy</span>
        <span style={lk} onClick={() => onOpen("refund")}>Refund Policy</span>
        <a href={"mailto:" + SUPPORT_EMAIL} style={{ ...lk, textDecoration: "none" }}>Contact Us</a>
      </div>
      <p style={{ color: "#334155", fontSize: 11, margin: 0, lineHeight: 1.6 }}>
        NutriPlan is not a medical service. Results vary by individual. Always consult a healthcare professional.<br />
        {"(c) " + new Date().getFullYear() + " NutriPlan. All rights reserved."}
      </p>
    </footer>
  );
}

// ─── Food helpers ─────────────────────────────────────────────────────────
function food(name, amount, cal, protein, carbs, fat) { return { name, amount, cal, protein, carbs, fat }; }
function totals(items) { return items.reduce((a, x) => ({ cal: a.cal + x.cal, protein: a.protein + x.protein, carbs: a.carbs + x.carbs, fat: a.fat + x.fat }), { cal: 0, protein: 0, carbs: 0, fat: 0 }); }
function meal(title, img, items) { return { title, img, items, totals: totals(items) }; }
function scaleMeal(m, targetCal) {
  const f = Math.max(0.75, Math.min(1.25, targetCal / (m.totals.cal || 1)));
  const items = m.items.map(x => ({ ...x, cal: Math.round(x.cal * f), protein: Math.round(x.protein * f), carbs: Math.round(x.carbs * f), fat: Math.round(x.fat * f), amount: f > 1.1 ? x.amount + " (larger)" : f < 0.9 ? x.amount + " (smaller)" : x.amount }));
  return { ...m, items, totals: totals(items) };
}

// ─── Food data ────────────────────────────────────────────────────────────
const FOODS = {
  breakfast: [
    meal("Protein Pancakes", IMG.pancakes, [food("Protein pancake mix", "1 cup", 280, 28, 36, 4), food("Greek yogurt", "1/2 cup", 90, 14, 5, 0), food("Berries", "1/2 cup", 40, 1, 10, 0), food("Maple syrup", "1 tbsp", 52, 0, 13, 0)]),
    meal("Breakfast Burrito", IMG.burrito, [food("Eggs", "3 large", 220, 18, 1, 15), food("Turkey sausage", "2 links", 120, 14, 2, 6), food("Flour tortilla", "1 large", 220, 7, 36, 6), food("Salsa", "3 tbsp", 22, 1, 5, 0)]),
    meal("Greek Yogurt Parfait", IMG.yogurt, [food("Greek yogurt", "1 cup", 210, 30, 12, 3), food("Berries", "1/2 cup", 40, 1, 10, 0), food("Granola", "1/4 cup", 120, 3, 20, 3), food("Honey", "1 tsp", 21, 0, 6, 0)]),
    meal("Overnight Oats", IMG.oats, [food("Oats", "1 cup dry", 307, 10, 54, 6), food("Protein yogurt", "1/2 cup", 90, 14, 5, 0), food("Banana", "1 medium", 105, 1, 27, 0), food("Peanut butter", "1 tbsp", 95, 4, 3, 8)]),
    meal("Egg White Breakfast Sandwich", IMG.sandwich, [food("English muffin", "1 whole", 130, 5, 25, 1), food("Egg whites", "4 large", 70, 15, 1, 0), food("Cheese", "1 slice", 70, 5, 0, 5), food("Turkey bacon", "2 strips", 70, 10, 0, 3)]),
    meal("Avocado Egg Toast", IMG.eggs, [food("Sourdough", "2 slices", 220, 8, 40, 2), food("Eggs", "2 large", 145, 12, 1, 10), food("Avocado", "1/2", 160, 2, 8, 15)]),
    meal("Cottage Cheese Bowl", IMG.cottage, [food("Cottage cheese", "1 cup", 206, 28, 8, 5), food("Pineapple chunks", "1/2 cup", 40, 0, 10, 0), food("Almonds", "15 pieces", 105, 4, 4, 9)]),
    meal("Protein French Toast", IMG.sandwich, [food("Bread", "2 slices", 180, 6, 34, 2), food("Egg whites", "3 large", 53, 11, 1, 0), food("Greek yogurt topping", "1/4 cup", 45, 7, 3, 0), food("Maple syrup", "1 tbsp", 52, 0, 13, 0)]),
    meal("Salmon Bagel", IMG.sandwich, [food("Bagel", "1 medium", 280, 10, 56, 2), food("Smoked salmon", "3 oz", 140, 19, 0, 6), food("Cream cheese", "1 tbsp", 90, 2, 2, 8)]),
    meal("Smoothie Bowl", IMG.smoothie, [food("Protein yogurt", "1 cup", 180, 25, 12, 3), food("Frozen fruit", "1 cup", 80, 1, 20, 0), food("Granola", "1/4 cup", 120, 3, 20, 3)]),
    meal("PB Banana Oats", IMG.oats, [food("Oats", "1 cup dry", 307, 10, 54, 6), food("Banana", "1 medium", 105, 1, 27, 0), food("Peanut butter", "2 tbsp", 190, 8, 6, 16), food("Cinnamon", "1/2 tsp", 3, 0, 1, 0)]),
  ],
  lunch: [
    meal("Chipotle Chicken Bowl", IMG.chicken, [food("Chicken breast", "7 oz", 330, 62, 0, 7), food("White rice", "1 cup cooked", 240, 5, 53, 0), food("Salsa", "3 tbsp", 22, 1, 5, 0), food("Corn", "1/4 cup", 35, 1, 7, 0), food("Lettuce", "1 cup", 8, 1, 1, 0)]),
    meal("Buffalo Chicken Wrap", IMG.wrap, [food("Chicken breast", "6 oz", 280, 53, 0, 6), food("Flour tortilla", "1 large", 220, 7, 36, 6), food("Buffalo sauce", "2 tbsp", 20, 0, 2, 0), food("Lettuce", "1 cup", 8, 1, 1, 0), food("Light ranch", "1 tbsp", 30, 0, 2, 2)]),
    meal("Turkey Sandwich Plate", IMG.turkey, [food("Turkey breast", "4 oz", 130, 28, 0, 2), food("Bread", "2 slices", 180, 6, 34, 2), food("Cheese", "1 slice", 70, 5, 0, 5), food("Pickles", "3 slices", 5, 0, 1, 0), food("Baked chips", "1 oz", 120, 2, 22, 2)]),
    meal("Steak Rice Bowl", IMG.steak, [food("Lean steak", "6 oz", 380, 46, 0, 20), food("White rice", "1 cup cooked", 240, 5, 53, 0), food("Bell peppers", "1/2 cup", 30, 1, 7, 0), food("Onions", "1/4 cup", 16, 0, 4, 0)]),
    meal("Chicken Caesar Wrap", IMG.wrap, [food("Chicken breast", "6 oz", 280, 53, 0, 6), food("Flour tortilla", "1 large", 220, 7, 36, 6), food("Caesar salad mix", "1 cup", 80, 2, 6, 5)]),
    meal("Ground Beef Tacos", IMG.tacos, [food("Lean ground beef", "5 oz", 280, 34, 0, 14), food("Corn tortillas", "3 small", 195, 5, 42, 3), food("Salsa", "3 tbsp", 22, 1, 5, 0)]),
    meal("Sushi Salmon Bowl", IMG.salmon, [food("Salmon", "5 oz", 290, 34, 0, 17), food("White rice", "1 cup cooked", 240, 5, 53, 0), food("Cucumber", "1/2 cup", 16, 1, 3, 0), food("Avocado", "1/4", 80, 1, 4, 7)]),
    meal("BBQ Chicken Potato", IMG.potato, [food("Chicken breast", "7 oz", 330, 62, 0, 7), food("Baked potato", "1 large", 290, 6, 63, 0), food("BBQ sauce", "2 tbsp", 60, 0, 14, 0)]),
    meal("High-Protein Pasta Bowl", IMG.pasta, [food("Lean turkey", "5 oz", 225, 40, 0, 6), food("Pasta", "2 cups cooked", 390, 14, 78, 2), food("Marinara sauce", "1/2 cup", 70, 2, 14, 1)]),
    meal("Crispy Chicken Bowl", IMG.chicken, [food("Crispy chicken", "6 oz", 320, 40, 18, 10), food("White rice", "1 cup cooked", 240, 5, 53, 0), food("Side salad", "1 cup", 25, 1, 5, 0)]),
    meal("Burger Bowl", IMG.burger, [food("Lean beef patties", "6 oz", 380, 42, 0, 22), food("Potatoes", "1 medium", 160, 4, 37, 0), food("Pickles", "3 slices", 5, 0, 1, 0), food("Light sauce", "1 tbsp", 30, 0, 3, 2)]),
  ],
  dinner: [
    meal("Steak and Potatoes", IMG.steak, [food("Steak", "8 oz", 610, 58, 0, 39), food("Potatoes", "2 medium", 270, 6, 60, 0), food("Butter", "2 tsp", 75, 0, 0, 8)]),
    meal("Salmon Rice Plate", IMG.salmon, [food("Salmon", "7 oz", 420, 44, 0, 26), food("White rice", "1 cup", 285, 5, 63, 1), food("Avocado", "1/2", 160, 2, 8, 15)]),
    meal("Chicken Alfredo Light", IMG.pasta, [food("Chicken breast", "7 oz", 330, 62, 0, 7), food("Pasta", "2 cups cooked", 390, 14, 78, 2), food("Light Alfredo sauce", "1/4 cup", 80, 3, 6, 5), food("Broccoli", "1 cup", 55, 4, 11, 1)]),
    meal("Protein Mac and Cheese", IMG.mac, [food("Chicken breast", "5 oz", 235, 44, 0, 5), food("Mac and cheese", "1 cup cooked", 310, 11, 48, 8), food("Broccoli", "1 cup", 55, 4, 11, 1)]),
    meal("Smash Burger Plate", IMG.burger, [food("Lean ground beef", "6 oz", 380, 42, 0, 22), food("Burger bun", "1 whole", 180, 6, 34, 2), food("Air-fryer potatoes", "1 cup", 160, 3, 36, 0), food("Pickles and light sauce", "2 tbsp", 35, 0, 4, 2)]),
    meal("Teriyaki Beef Rice", IMG.teriyaki, [food("Lean beef", "6 oz", 380, 42, 0, 22), food("White rice", "1 cup", 240, 5, 53, 0), food("Mixed vegetables", "1 cup", 50, 3, 10, 0), food("Teriyaki sauce", "2 tbsp", 60, 1, 14, 0)]),
    meal("Chicken Parmesan Bowl", IMG.pasta, [food("Chicken breast", "7 oz", 330, 62, 0, 7), food("Pasta", "2 cups cooked", 390, 14, 78, 2), food("Marinara sauce", "1/2 cup", 70, 2, 14, 1), food("Mozzarella", "1 oz", 80, 6, 1, 6)]),
    meal("Taco Bowl Dinner", IMG.tacos, [food("Lean ground beef", "6 oz", 380, 42, 0, 22), food("White rice", "1 cup", 240, 5, 53, 0), food("Black beans", "1/2 cup", 110, 7, 20, 1), food("Salsa", "3 tbsp", 22, 1, 5, 0)]),
    meal("Pizza Wrap Plate", IMG.pizza, [food("Large tortilla", "1 whole", 220, 7, 36, 6), food("Turkey pepperoni", "1.5 oz", 70, 9, 1, 3), food("Mozzarella", "1 oz", 80, 6, 1, 6), food("Side salad", "1 cup", 25, 1, 5, 0)]),
    meal("Honey Garlic Chicken", IMG.honey, [food("Chicken thighs", "7 oz", 385, 48, 0, 20), food("White rice", "1 cup", 240, 5, 53, 0), food("Honey garlic sauce", "2 tbsp", 70, 0, 16, 0)]),
    meal("Loaded Baked Potato", IMG.potato, [food("Lean ground turkey", "5 oz", 210, 36, 0, 6), food("Baked potato", "1 large", 290, 6, 63, 0), food("Greek yogurt topping", "1/4 cup", 35, 5, 2, 0), food("Cheese", "1 oz", 80, 6, 1, 6)]),
  ],
  snack: [
    meal("Yogurt and Berries", IMG.yogurt, [food("Protein yogurt", "3/4 cup", 180, 25, 12, 3), food("Mixed berries", "1/2 cup", 50, 1, 12, 0)]),
    meal("Apple and Almond Butter", IMG.apple, [food("Apple", "1 large", 115, 1, 30, 0), food("Almond butter", "1 tbsp", 120, 4, 4, 10)]),
    meal("Mixed Nuts and Chocolate", IMG.nuts, [food("Mixed nuts", "small handful", 210, 5, 6, 19), food("Dark chocolate", "1 small square", 80, 1, 9, 5)]),
    meal("Hard-Boiled Eggs", IMG.eggs, [food("Boiled eggs", "2 large", 145, 12, 1, 10), food("Piece of fruit", "1 serving", 100, 1, 25, 0)]),
    meal("Protein Pudding", IMG.pudding, [food("Protein pudding", "1 cup", 130, 22, 10, 2), food("Greek yogurt", "1/4 cup", 45, 7, 3, 0), food("Oreo crumbs", "2 cookies", 85, 1, 13, 3)]),
    meal("Cottage Cheese Honey Bowl", IMG.cottage, [food("Cottage cheese", "3/4 cup", 155, 21, 6, 4), food("Berries", "1/2 cup", 40, 1, 10, 0), food("Honey", "1 tsp", 21, 0, 6, 0), food("Almonds", "10 pieces", 70, 3, 3, 6)]),
    meal("Popcorn and Chocolate", IMG.popcorn, [food("Popcorn", "3 cups", 90, 3, 18, 1), food("Dark chocolate", "1 oz", 160, 2, 18, 10)]),
    meal("Rice Cakes and PB", IMG.ricecake, [food("Rice cakes", "2 cakes", 70, 1, 15, 0), food("Peanut butter", "1 tbsp", 95, 4, 3, 8), food("Banana", "1/2 medium", 53, 1, 14, 0)]),
    meal("Turkey Roll-Ups", IMG.turkey, [food("Turkey slices", "4 oz", 130, 28, 0, 2), food("Cheese", "1 slice", 70, 5, 0, 5), food("Pickles", "3 slices", 5, 0, 1, 0)]),
  ],
};

// ─── Recipes ──────────────────────────────────────────────────────────────
const RECIPES = [
  { id: 1, title: "Protein Pancakes with Berry Yogurt", category: "Breakfast", cal: 520, protein: 35, carbs: 65, fat: 12, prepTime: "15 min", desc: "A weekend-style breakfast that still gives you a strong protein base and real satisfaction.", ingredients: ["1 cup protein pancake mix", "1/2 cup plain Greek yogurt", "1/2 cup berries", "1 tbsp maple syrup", "Nonstick spray or 1 tsp butter"], steps: ["Mix pancake batter according to the package, keeping it thick enough to hold shape.", "Cook small pancakes over medium heat until bubbles form, then flip once.", "Stir Greek yogurt until smooth and spoon it over the pancakes.", "Top with berries and a small drizzle of maple syrup."], note: "Swap berries for banana slices, or use sugar-free syrup if you want a lower-carb version.", img: IMG.pancakes },
  { id: 2, title: "Busy Morning Breakfast Burrito", category: "Breakfast", cal: 540, protein: 38, carbs: 45, fat: 20, prepTime: "12 min", desc: "A warm, filling wrap you can make before work without feeling like you are eating diet food.", ingredients: ["2 eggs plus 2 egg whites", "2 turkey sausage links", "1 large flour tortilla", "2 tbsp salsa", "Optional: 1/4 cup shredded cheese"], steps: ["Cook turkey sausage until browned, then slice into small pieces.", "Scramble eggs and egg whites over medium heat until just set.", "Warm the tortilla for 10-15 seconds so it folds without tearing.", "Add eggs, sausage, salsa, and optional cheese, then wrap tightly."], note: "Make two at once and refrigerate one for tomorrow. Reheat wrapped in a paper towel.", img: IMG.burrito },
  { id: 3, title: "Greek Yogurt Crunch Bowl", category: "Breakfast", cal: 430, protein: 32, carbs: 48, fat: 10, prepTime: "5 min", desc: "Fast, creamy, and high-protein with enough crunch to feel like a real breakfast.", ingredients: ["1 cup plain Greek yogurt", "1/2 cup berries", "1/4 cup granola", "1 tsp honey", "Pinch of cinnamon"], steps: ["Add Greek yogurt to a bowl and stir in cinnamon.", "Layer berries over the top so every bite has fruit.", "Sprinkle granola right before eating to keep it crunchy.", "Finish with honey if you want a little sweetness."], note: "Use high-protein yogurt and measure granola; granola is easy to overpour.", img: IMG.yogurt },
  { id: 4, title: "Chicken Burrito Bowl", category: "Lunch", cal: 720, protein: 58, carbs: 78, fat: 16, prepTime: "20 min", desc: "A takeout-style bowl built around lean protein, rice, salsa, and simple toppings.", ingredients: ["6-7 oz cooked chicken breast", "1 cup cooked white or brown rice", "1/4 cup corn", "1/2 cup shredded lettuce", "3 tbsp salsa", "2 tbsp Greek yogurt"], steps: ["Season chicken with taco seasoning, salt, pepper, and lime if you have it.", "Add warm rice to a bowl as the base.", "Top with sliced chicken, corn, lettuce, and salsa.", "Use Greek yogurt as a creamy topping instead of sour cream."], note: "For meal prep, keep lettuce and salsa separate until eating so the bowl stays fresh.", img: IMG.chicken },
  { id: 5, title: "Buffalo Chicken Wrap", category: "Lunch", cal: 590, protein: 52, carbs: 48, fat: 18, prepTime: "10 min", desc: "Spicy, creamy, and portable for the days when lunch needs to happen fast.", ingredients: ["6 oz cooked chicken breast", "1 large tortilla", "2 tbsp buffalo sauce", "1 cup romaine or shredded lettuce", "1 tbsp light ranch", "Optional: celery or cucumber slices"], steps: ["Slice or shred cooked chicken.", "Toss chicken with buffalo sauce until evenly coated.", "Spread light ranch on the tortilla, then add lettuce and chicken.", "Fold the sides in first, roll tightly, and slice in half."], note: "Use rotisserie chicken in a pinch; choose mostly breast meat to keep protein high.", img: IMG.wrap },
  { id: 6, title: "Turkey Sandwich Plate", category: "Lunch", cal: 560, protein: 42, carbs: 58, fat: 14, prepTime: "10 min", desc: "A normal lunch plate that fits a fat-loss plan without feeling strict or weird.", ingredients: ["4 oz deli turkey or roasted turkey breast", "2 slices whole-grain bread", "1 slice cheese", "Pickles, tomato, or lettuce", "1 oz baked chips", "Mustard or light mayo"], steps: ["Build the sandwich with turkey, cheese, and crunchy vegetables.", "Use mustard freely or measure light mayo if you want it creamy.", "Serve with baked chips on the side instead of eating from the bag.", "Add fruit or extra vegetables if you need more volume."], note: "A simple plate like this is useful because it is repeatable, affordable, and easy to track.", img: IMG.turkey },
  { id: 7, title: "Lean Smash Burger Plate", category: "Dinner", cal: 760, protein: 50, carbs: 65, fat: 32, prepTime: "20 min", desc: "Burger-night energy with measured portions, lean beef, and crispy potatoes.", ingredients: ["6 oz 90/10 lean ground beef", "1 burger bun", "1 medium potato or 1 cup air-fryer potatoes", "Pickles and lettuce", "1 tbsp light burger sauce"], steps: ["Form beef into two thin patties and season both sides.", "Cook in a hot pan, pressing once for a crisp edge.", "Toast the bun and add pickles, lettuce, and light sauce.", "Serve with air-fried or baked potatoes on the side."], note: "If calories are tight, use one patty open-faced and add a bigger salad.", img: IMG.burger },
  { id: 8, title: "Creamy Chicken Alfredo Light", category: "Dinner", cal: 740, protein: 60, carbs: 82, fat: 18, prepTime: "25 min", desc: "Creamy comfort food with enough protein to feel like dinner, not a cheat meal.", ingredients: ["6-7 oz chicken breast", "2 cups cooked pasta", "1/4 cup light Alfredo sauce", "1 cup broccoli", "Garlic, pepper, and parsley"], steps: ["Cook pasta and broccoli; save a splash of pasta water.", "Season and cook chicken until done, then slice.", "Warm Alfredo sauce with a little pasta water to coat the pasta lightly.", "Combine pasta, broccoli, and sauce, then top with chicken."], note: "The sauce is for flavor, not drowning the bowl. Add garlic and pepper for more taste.", img: IMG.pasta },
  { id: 9, title: "Weeknight Taco Bowl", category: "Dinner", cal: 700, protein: 48, carbs: 74, fat: 22, prepTime: "20 min", desc: "A flexible dinner bowl for nights when you want something warm, salty, and satisfying.", ingredients: ["5-6 oz lean ground beef or turkey", "1 cup cooked rice", "1/2 cup black beans", "3 tbsp salsa", "Lettuce, hot sauce, and lime"], steps: ["Brown meat in a skillet and season with taco seasoning.", "Add rice and black beans to a bowl.", "Top with meat, salsa, lettuce, and hot sauce.", "Finish with lime juice if you have it."], note: "Swap rice for potatoes or tortillas. Keep the protein portion steady.", img: IMG.tacos },
  { id: 10, title: "Chocolate Protein Pudding Cup", category: "Snack", cal: 260, protein: 30, carbs: 24, fat: 5, prepTime: "5 min", desc: "A sweet snack for nighttime cravings that still supports your protein goal.", ingredients: ["1 cup protein pudding or high-protein yogurt", "1/4 cup Greek yogurt", "1 crushed Oreo or 2 tbsp cookie crumbs", "Pinch of salt"], steps: ["Mix protein pudding and Greek yogurt until smooth.", "Add a tiny pinch of salt to make the chocolate flavor stronger.", "Top with cookie crumbs instead of mixing them in.", "Chill for 10 minutes if you want it thicker."], note: "This is a craving tool, not a magic food. Portion the topping and enjoy it slowly.", img: IMG.pudding },
  { id: 11, title: "Cottage Cheese Honey Bowl", category: "Snack", cal: 310, protein: 28, carbs: 30, fat: 9, prepTime: "5 min", desc: "Creamy, sweet, and filling with simple ingredients you can keep in the fridge.", ingredients: ["3/4 cup cottage cheese", "1/2 cup berries", "1 tsp honey", "10 almonds", "Optional: cinnamon"], steps: ["Add cottage cheese to a bowl and smooth the top.", "Add berries and cinnamon.", "Drizzle honey over the fruit.", "Crush or chop almonds for better crunch in every bite."], note: "If texture is not your thing, blend the cottage cheese first for a cheesecake-style bowl.", img: IMG.cottage },
];

// ─── RecipeCard ───────────────────────────────────────────────────────────
function RecipeCard({ recipe, locked, onUpgrade }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ ...S.card, overflow: "hidden", position: "relative" }}>
      {locked && (
        <div style={{ position: "absolute", inset: 0, zIndex: 5, background: "rgba(2,6,23,.9)", backdropFilter: "blur(10px)", display: "grid", placeItems: "center", padding: 20, textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
            <Pill>Pro / Elite</Pill>
            <h3 style={{ margin: "12px 0 8px", fontSize: 18 }}>Recipe locked</h3>
            <p style={{ color: "#cbd5e1", marginBottom: 16, fontSize: 14, lineHeight: 1.6 }}>Upgrade to Pro to unlock all 11 recipes with full instructions.</p>
            <button onClick={onUpgrade} style={{ ...S.btn, width: "100%" }}>Unlock Recipes</button>
          </div>
        </div>
      )}
      <div style={{ height: 140, position: "relative" }}>
        <SafeImg src={recipe.img} alt={recipe.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(2,6,23,.95),rgba(2,6,23,.1))" }} />
        <div style={{ position: "absolute", left: 14, bottom: 14 }}>
          <Pill color="#b7d7c2">{recipe.category}</Pill>
          <h3 style={{ margin: "6px 0 0", fontSize: 18, lineHeight: 1.2 }}>{recipe.title}</h3>
        </div>
      </div>
      <div style={{ padding: 16 }}>
        <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 12px", lineHeight: 1.55 }}>{recipe.desc}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
          <MacroBox icon="🔥" val={recipe.cal} label="cal" />
          <MacroBox icon="🥩" val={recipe.protein + "g"} label="protein" />
          <MacroBox icon="🍚" val={recipe.carbs + "g"} label="carbs" />
          <MacroBox icon="🥑" val={recipe.fat + "g"} label="fat" />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ color: "#64748b", fontSize: 12 }}>Prep: {recipe.prepTime}</span>
          <button onClick={() => setOpen(o => !o)} style={{ ...S.sec, padding: "8px 14px", fontSize: 13, borderRadius: 999 }}>
            {open ? "Hide recipe" : "See recipe"}
          </button>
        </div>
        {open && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#b7d7c2", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 6 }}>Ingredients</div>
              {recipe.ingredients.map((ing, i) => (
                <div key={i} style={{ color: "#cbd5e1", fontSize: 13, padding: "5px 0", borderTop: "1px solid rgba(148,163,184,.08)", display: "flex", gap: 8 }}>
                  <span style={{ color: "#475569" }}>-</span>{ing}
                </div>
              ))}
            </div>
            <div>
              <div style={{ color: "#b7d7c2", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 6 }}>Instructions</div>
              {recipe.steps.map((step, i) => (
                <div key={i} style={{ color: "#cbd5e1", fontSize: 13, padding: "6px 0", borderTop: "1px solid rgba(148,163,184,.08)", display: "flex", gap: 10 }}>
                  <span style={{ color: "#b7d7c2", fontWeight: 900, flexShrink: 0, minWidth: 18 }}>{i + 1}.</span>{step}
                </div>
              ))}
            </div>
            {recipe.note && (
              <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 12, background: "rgba(183,215,194,.08)", border: "1px solid rgba(183,215,194,.18)", color: "#dbeafe", fontSize: 13, lineHeight: 1.55 }}>
                <strong style={{ color: "#b7d7c2" }}>Practical note:</strong> {recipe.note}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Calculation helpers ──────────────────────────────────────────────────
function calcBMR(kg, cm, age, gender) {
  return gender === "female" ? Math.round(10 * kg + 6.25 * cm - 5 * age - 161) : Math.round(10 * kg + 6.25 * cm - 5 * age + 5);
}
function mealDistribution(slots) {
  return slots.length === 3
    ? { breakfast: 0.28, lunch: 0.38, dinner: 0.34 }
    : { breakfast: 0.24, lunch: 0.34, dinner: 0.32, snack: 0.1 };
}
function calcBFP(waist, neck, height, gender, hip) {
  try {
    if (gender === "male") {
      const d = waist - neck;
      if (d <= 0 || height <= 0) return null;
      const r = 495 / (1.0324 - 0.19077 * Math.log10(d) + 0.15456 * Math.log10(height)) - 450;
      return r < 2 || r > 70 ? null : r.toFixed(1);
    }
    const s = waist + (hip || 0) - neck;
    if (s <= 0 || height <= 0 || !hip) return null;
    const r = 495 / (1.29579 - 0.35004 * Math.log10(s) + 0.221 * Math.log10(height)) - 450;
    return r < 2 || r > 70 ? null : r.toFixed(1);
  } catch { return null; }
}
function pickMeal(options, seed) { return options[Math.abs(seed) % options.length]; }

function buildMealPlan(tier, form) {
  const age = Number(form.age) || 30;
  const kg = Number(form.weight) || 75;
  const cm = Number(form.height) || 175;
  let cal = Number(form.calories) || 2000;
  if (isPaid(tier)) {
    const maint = Math.round(calcBMR(kg, cm, age, form.gender) * (ACT[form.activity] || 1.375));
    const def = form.lossSpeed === "gentle" ? 200 : form.lossSpeed === "steady" ? 400 : 550;
    cal = form.goal === "lose" ? maint - def : form.goal === "gain" ? maint + 250 : maint;
  }
  const minCal = form.gender === "female" ? 1200 : 1500;
  cal = Math.max(minCal, Math.min(5000, cal));
  const slots = Number(form.mealsPerDay) === 3 ? ["breakfast", "lunch", "dinner"] : ["breakfast", "lunch", "dinner", "snack"];
  const dist = mealDistribution(slots);
  const protein = Math.max(Math.round(kg * 1.6), Math.round((cal * 0.28) / 4));
  const fat = Math.round((cal * 0.28) / 9);
  const carbs = Math.max(80, Math.round((cal - protein * 4 - fat * 9) / 4));
  return {
    cal, slots, protein, carbs, fat,
    days: DAYS.map((day, di) => {
      const locked = tier === "free" && di >= 1 && di < 3;
      const hidden = tier === "free" && di >= 3;
      const meals = {};
      slots.forEach((slot, si) => {
        const seed = di * 17 + si * 9 + (form.biggestStruggle || "").length + (form.goal || "").length;
        meals[slot] = scaleMeal(pickMeal(FOODS[slot], seed), cal * dist[slot]);
      });
      return { day, locked, hidden, isTraining: false, meals };
    }).filter(d => !d.hidden),
  };
}

const WORKOUT_BANK = {
  "Full Body A": { gym: ["Squat", "Bench press", "Lat pulldown", "Romanian deadlift"], home: ["Push-ups", "Squats", "Rows", "Plank"] },
  "Full Body B": { gym: ["Deadlift", "Incline press", "Seated row", "Leg press"], home: ["Pull-ups", "Split squats", "Dips", "Leg raises"] },
  "Upper Body": { gym: ["Bench press", "Lat pulldown", "Shoulder press", "Cable row"], home: ["Push-ups", "Pull-ups", "Pike push-ups", "Rows"] },
  "Lower Body": { gym: ["Squat", "Romanian deadlift", "Leg press", "Leg curl"], home: ["Squats", "Lunges", "Glute bridge", "Calf raises"] },
  Push: { gym: ["Bench press", "Incline press", "Shoulder press", "Tricep dips"], home: ["Push-ups", "Decline push-ups", "Pike push-ups", "Chair dips"] },
  Pull: { gym: ["Pull-ups", "Barbell row", "Lat pulldown", "Bicep curls"], home: ["Pull-ups", "Inverted rows", "Towel rows", "Backpack curls"] },
  Legs: { gym: ["Squat", "Leg press", "Romanian deadlift", "Calf raises"], home: ["Squats", "Lunges", "Jump squats", "Calf raises"] },
};
const SPLITS = { fullBody: ["Full Body A", "Full Body B", "Full Body A"], upperLower: ["Upper Body", "Lower Body", "Upper Body", "Lower Body"], ppl: ["Push", "Pull", "Legs", "Push", "Pull"] };

function buildWorkouts(form) {
  const count = Math.min(Number(form.workoutsPerWeek) || 3, 5);
  const sets = form.level === "beginner" ? 3 : form.level === "intermediate" ? 4 : 5;
  const reps = form.level === "beginner" ? "8-10" : form.level === "intermediate" ? "8-12" : "6-12";
  const rest = form.level === "advanced" ? "90-150s" : "60-90s";
  const place = form.trainingPlace === "home" ? "home" : "gym";
  const split = SPLITS[form.workoutStyle] || SPLITS.fullBody;
  return Array.from({ length: count }, (_, i) => {
    const title = split[i % split.length];
    const exList = (WORKOUT_BANK[title] || WORKOUT_BANK["Full Body A"])[place];
    return { day: DAYS[i], title, notes: form.level + " - " + place + " - Keep 1-2 reps in reserve", exercises: exList.map(name => ({ name, sets, rest, reps: name.toLowerCase().includes("plank") || name.toLowerCase().includes("hold") ? "30-60s" : reps })) };
  });
}

// ─── MealCard ─────────────────────────────────────────────────────────────
function MealCard({ slot, mealObj, locked, allowSwap, onSwap, onUpgrade }) {
  return (
    <div style={{ ...S.card, overflow: "hidden", position: "relative" }}>
      {locked && (
        <div style={{ position: "absolute", inset: 0, zIndex: 5, background: "rgba(2,6,23,.88)", backdropFilter: "blur(10px)", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🔒</div>
            <Pill>Day locked</Pill>
            <h3 style={{ margin: "14px 0 8px", fontSize: 20 }}>This day is part of the full plan</h3>
            <p style={{ color: "#cbd5e1", marginBottom: 18, lineHeight: 1.65, fontSize: 14 }}>Upgrade to unlock all 7 days, meal swaps, and smart calorie tracking.</p>
            <button onClick={onUpgrade} style={{ ...S.btn, width: "100%" }}>Unlock Full Plan</button>
          </div>
        </div>
      )}
      <div style={{ height: 160, position: "relative" }}>
        <SafeImg src={mealObj.img} alt={mealObj.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(2,6,23,.95),rgba(2,6,23,.1))" }} />
        <div style={{ position: "absolute", left: 14, right: 14, bottom: 14, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10 }}>
          <div>
            <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 800, textTransform: "capitalize" }}>{slot}</div>
            <h3 style={{ margin: "3px 0 0", fontSize: 20, lineHeight: 1.2 }}>{mealObj.title}</h3>
          </div>
          {allowSwap && <button onClick={onSwap} style={{ ...S.sec, padding: "8px 14px", borderRadius: 999, fontSize: 13 }}>Swap</button>}
        </div>
      </div>
      <div style={{ padding: 16 }}>
        {mealObj.items.map(item => (
          <div key={item.name + item.amount} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderTop: "1px solid rgba(148,163,184,.09)" }}>
            <div>
              <strong style={{ fontSize: 14 }}>{item.name}</strong>
              <div style={{ color: "#94a3b8", fontSize: 12 }}>{item.amount}</div>
              <div style={{ color: "#64748b", fontSize: 11 }}>{item.protein}g protein - {item.carbs}g carbs - {item.fat}g fat</div>
            </div>
            <strong style={{ color: "#b7d7c2", whiteSpace: "nowrap" }}>{item.cal} cal</strong>
          </div>
        ))}
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
          <MacroBox icon="🔥" val={mealObj.totals.cal} label="cal" />
          <MacroBox icon="🥩" val={mealObj.totals.protein + "g"} label="protein" />
          <MacroBox icon="🍚" val={mealObj.totals.carbs + "g"} label="carbs" />
          <MacroBox icon="🥑" val={mealObj.totals.fat + "g"} label="fat" />
        </div>
      </div>
    </div>
  );
}

function CalorieCalculator() {
  const [c, setC] = useState({ name: "", grams: "", cal100: "", p100: "", c100: "", f100: "" });
  const g = Number(c.grams) / 100 || 0;
  const r = { cal: Math.round((Number(c.cal100) || 0) * g), p: Math.round((Number(c.p100) || 0) * g), carb: Math.round((Number(c.c100) || 0) * g), fat: Math.round((Number(c.f100) || 0) * g) };
  return (
    <div style={{ ...S.card, padding: 20, marginTop: 20 }}>
      <Pill color="#38bdf8">Pro tool</Pill>
      <h3 style={{ margin: "10px 0 4px" }}>Food Calculator</h3>
      <p style={{ color: "#94a3b8", margin: "0 0 14px", fontSize: 14 }}>Look up any food using the label on the package.</p>
      <div style={{ display: "grid", gap: 10 }}>
        {[["Food name", "text", "name", "e.g. Cottage cheese"], ["Grams eaten", "number", "grams", "150"], ["Calories per 100g", "number", "cal100", "100"], ["Protein per 100g", "number", "p100", "12"], ["Carbs per 100g", "number", "c100", "4"], ["Fat per 100g", "number", "f100", "5"]].map(([lbl, type, key, ph]) => (
          <input key={key} aria-label={lbl} style={S.inp} type={type} placeholder={ph} value={c[key]} onChange={e => setC(prev => ({ ...prev, [key]: e.target.value }))} />
        ))}
      </div>
      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
        <MacroBox icon="🔥" val={r.cal} label="cal" />
        <MacroBox icon="🥩" val={r.p + "g"} label="protein" />
        <MacroBox icon="🍚" val={r.carb + "g"} label="carbs" />
        <MacroBox icon="🥑" val={r.fat + "g"} label="fat" />
      </div>
    </div>
  );
}

function WorkoutCard({ w }) {
  return (
    <div style={{ ...S.card, padding: 18 }}>
      <div style={{ color: "#b7d7c2", fontSize: 12, fontWeight: 800 }}>{w.day}</div>
      <h3 style={{ margin: "4px 0 6px" }}>{w.title}</h3>
      <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 10px" }}>{w.notes}</p>
      {w.exercises.map(ex => (
        <div key={ex.name} style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(148,163,184,.09)", padding: "9px 0" }}>
          <div><strong style={{ fontSize: 14 }}>{ex.name}</strong><div style={{ color: "#64748b", fontSize: 12 }}>Rest: {ex.rest}</div></div>
          <strong style={{ color: "#f8fafc" }}>{ex.sets} x {ex.reps}</strong>
        </div>
      ))}
    </div>
  );
}

const COACH_COPY = {
  free: "You have seen what one day looks like. The full system is 7 days, personalized to your body, with meals you can swap when life gets in the way.",
  basic: "Your plan is built around your numbers. When you are ready for real-life flexibility - swaps and a food calculator - Pro has you covered.",
  pro: "Pro is where most people find their groove. If you are also ready to train, Elite adds a custom weekly workout program.",
  elite: "You have the full picture: food and training in one place. Consistency beats perfection every single time.",
};
const STRUGGLE_MAP = { late_night: "late-night cravings", takeout: "too much takeout", dont_know: "not knowing what to eat", training_no_results: "training without seeing results", busy: "a busy schedule", boring_diets: "boring diets that never stick" };

function NutriCoach({ tier, struggle, onUpgrade }) {
  const struggleText = STRUGGLE_MAP[struggle] || (struggle || "").replace(/_/g, " ");
  return (
    <div style={{ ...S.card, padding: 20, background: "linear-gradient(135deg,rgba(183,215,194,.08),rgba(15,23,42,.8))", marginTop: 20 }}>
      <Pill color="#b7d7c2">Your coach says</Pill>
      <h3 style={{ margin: "10px 0 8px" }}>Built for real people</h3>
      <p style={{ color: "#dbeafe", lineHeight: 1.7, margin: "0 0 8px" }}>{COACH_COPY[tier]}</p>
      {struggleText && <p style={{ color: "#94a3b8", fontSize: 14, margin: "0 0 14px", lineHeight: 1.6 }}>Your biggest challenge is <em style={{ color: "#e2e8f0" }}>{struggleText}</em>. That usually means you need flexibility, not a stricter plan.</p>}
      {tier !== "elite" && <button onClick={onUpgrade} style={S.btn}>{tier === "free" ? "Get the full plan" : "Unlock the next level"}</button>}
    </div>
  );
}

// ─── Auth Modal ───────────────────────────────────────────────────────────
function AuthModal({ mode, onClose, onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isLogin, setIsLogin] = useState(mode === "login");

  async function handleSubmit() {
    if (!email.trim() || !password.trim()) { setError("Please enter your email and password."); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError("Please enter a valid email address."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true); setError("");
    try {
      let result;
      if (isLogin) {
        result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      } else {
        result = await supabase.auth.signUp({ email: email.trim(), password });
      }
      if (result.error) { setError(result.error.message); setLoading(false); return; }
      onSuccess(result.data.user, email.trim());
    } catch (e) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ ...S.card, width: "100%", maxWidth: 420, padding: 28 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>{isLogin ? "Sign in" : "Create account"}</h2>
            <p style={{ margin: "5px 0 0", color: "#9fb3c8", fontSize: 13, lineHeight: 1.45 }}>{isLogin ? "Refresh your paid access and saved plan." : "Use the same email you used at PayPal checkout so your payment can unlock automatically."}</p>
          </div>
          <button aria-label="Close" onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 26, cursor: "pointer" }}>x</button>
        </div>
        <div style={{ display: "grid", gap: 14 }}>
          <Field label="Email">
            <input style={S.inp} type="email" placeholder="you@email.com" value={email} onChange={e => { setEmail(e.target.value); setError(""); }} />
          </Field>
          <Field label="Password">
            <input style={S.inp} type="password" placeholder={isLogin ? "Your password" : "At least 6 characters"} value={password} onChange={e => { setPassword(e.target.value); setError(""); }} />
          </Field>
          {error && <p style={{ color: "#fca5a5", fontSize: 13, margin: 0 }}>{error}</p>}
          <button onClick={handleSubmit} style={{ ...S.btn, opacity: loading ? 0.7 : 1 }} disabled={loading}>
            {loading ? "Please wait..." : isLogin ? "Sign in" : "Create account"}
          </button>
          <p style={{ color: "#64748b", fontSize: 13, textAlign: "center", margin: 0, cursor: "pointer" }} onClick={() => { setIsLogin(l => !l); setError(""); }}>
            {isLogin ? "No account yet? Create one" : "Already have an account? Sign in"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("home");
  const [selectedTier, setSelTier] = useState("pro");
  const [accessTier, setAccess] = useState("free");
  const [errors, setErrors] = useState({});
  const [openDay, setOpenDay] = useState(0);
  const [plan, setPlan] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [planReady, setPlanReady] = useState(false);
  const [agreedToTerms, setAgreed] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [legalModal, setLegalModal] = useState(null);
  const [activeTab, setActiveTab] = useState("meals");
  const [authModal, setAuthModal] = useState(null); // "login" | "signup" | null
  const [user, setUser] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [savingPlan, setSavingPlan] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [accessMsg, setAccessMsg] = useState("");

  const [form, setForm] = useState({
    calories: "2000", gender: "male", age: "30", weight: "75", height: "175", // internal: kg/cm
    waist: "", neck: "", hip: "", activity: "light", goal: "lose", mealsPerDay: "4",
    biggestStruggle: "late_night", foodPreference: "balanced", lossSpeed: "steady",
    workoutsPerWeek: "3", workoutStyle: "fullBody", trainingPlace: "gym", level: "beginner",
  });

  async function refreshPaymentAccess(currentUser = user, opts = {}) {
    const email = (currentUser?.email || userEmail || "").trim().toLowerCase();
    if (!email) {
      setAccess("free");
      if (opts.showMessage) setAccessMsg("Sign in first, then refresh your access after checkout.");
      return "free";
    }

    setCheckingAccess(true);
    if (opts.showMessage) setAccessMsg("");
    try {
      // RISK: Frontend access depends on the PayPal webhook writing profiles.payment_status="active".
      // Never expose service_role here; this only reads the logged-in user's public profile access state.
      const { data, error } = await supabase
        .from("profiles")
        .select("plan, payment_status")
        .ilike("email", email)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      const profilePlan = String(data?.plan || "").trim().toLowerCase();
      const paymentStatus = String(data?.payment_status || "").trim().toLowerCase();
      const activeTier = paymentStatus === "active" && isPaidTier(profilePlan) ? profilePlan : "free";

      setAccess(activeTier);
      if (activeTier !== "free") setSelTier(activeTier);

      if (opts.showMessage) {
        setAccessMsg(
          activeTier !== "free"
            ? `${activeTier.charAt(0).toUpperCase() + activeTier.slice(1)} access is active.`
            : "No active payment found yet. If you just paid, wait a few seconds and refresh again."
        );
      }

      return activeTier;
    } catch {
      setAccess("free");
      if (opts.showMessage) setAccessMsg("Could not refresh access right now. Please try again.");
      return "free";
    } finally {
      setCheckingAccess(false);
    }
  }

  // Check for existing Supabase session on load
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); setUserEmail(session.user.email || ""); refreshPaymentAccess(session.user); }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) { setUser(session.user); setUserEmail(session.user.email || ""); refreshPaymentAccess(session.user); }
      else { setUser(null); setUserEmail(""); setAccess("free"); }
    });
    return () => subscription.unsubscribe();
  }, []);

  const selPlan = useMemo(() => PLANS.find(p => p.id === selectedTier) || PLANS[1], [selectedTier]);

  function setVal(k, v) { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: "" })); }

  function choosePlan(id) {
    const tier = id === "eliteMonthly" ? "elite" : id;
    setSelTier(tier);
    if (tier === "free") { if (user) refreshPaymentAccess(user); else setAccess("free"); setScreen("onboarding"); }
    else setScreen("unlock");
  }

  function upgradeFrom() {
    if (accessTier === "free" || accessTier === "basic") choosePlan("pro");
    else if (accessTier === "pro") choosePlan("elite");
  }

  function validate() {
    const errs = {};
    if (!isPaid(accessTier)) { const cal = Number(form.calories); if (!cal || cal < 1200 || cal > 5000) errs.calories = "Enter a number between 1200 and 5000."; }
    if (isPaid(accessTier)) {
      const age = Number(form.age), kg = Number(form.weight), cm = Number(form.height);
      if (!age || age < 16 || age > 99) errs.age = "Age must be 16-99.";
      if (!kg || kg < 30 || kg > 250) errs.weight = "Weight must be 30-250 kg.";
      if (!cm || cm < 120 || cm > 220) errs.height = "Height must be 120-220 cm.";
    }
    setErrors(errs); return Object.keys(errs).length === 0;
  }

  function swapMeal(dayIdx, slot) {
    if (!plan || !canSwap(plan.tier)) return;
    const dist = mealDistribution(plan.slots);
    const updated = plan.days.map((d, i) => {
      if (i !== dayIdx) return d;
      const options = FOODS[slot];
      const cur = d.meals[slot];
      const others = options.filter(m => m.title !== cur.title);
      const next = others.length ? others[Math.floor(Math.random() * others.length)] : options[0];
      return { ...d, meals: { ...d.meals, [slot]: scaleMeal(next, plan.cal * (dist[slot] || (1 / plan.slots.length))) } };
    });
    setPlan({ ...plan, days: updated });
  }

  function generate() {
    if (!agreedToTerms) { setTermsError(true); return; }
    setTermsError(false);
    if (!validate()) return;
    setGenerating(true);
    setTimeout(() => {
      const mealPlan = buildMealPlan(accessTier, form);
      const workouts = hasWorkouts(accessTier) ? buildWorkouts(form) : [];
      workouts.forEach(w => { const idx = DAYS.indexOf(w.day); if (idx >= 0 && mealPlan.days[idx]) mealPlan.days[idx].isTraining = true; });
      const bfp = hasBFP(accessTier) && form.waist && form.neck ? calcBFP(Number(form.waist), Number(form.neck), Number(form.height), form.gender, Number(form.hip) || 0) : null;
      const newPlan = { ...mealPlan, workouts, bfp, tier: accessTier };
      setPlan(newPlan);
      saveState({ form, accessTier });
      setOpenDay(0); setActiveTab("meals"); setGenerating(false); setPlanReady(true); setScreen("results");
    }, 800);
  }

  async function savePlanToSupabase() {
    if (!user) { setAuthModal("signup"); return; }
    setSavingPlan(true); setSaveMsg("");
    try {
      const payload = { user_id: user.id, tier: accessTier, form_data: form, plan_summary: { cal: plan.cal, protein: plan.protein, carbs: plan.carbs, fat: plan.fat }, updated_at: new Date().toISOString() };
      const { error } = await supabase.from("plans").upsert(payload, { onConflict: "user_id" });
      if (error) { setSaveMsg("Could not save. Please try again."); }
      else { setSaveMsg("Plan saved to your account!"); }
    } catch { setSaveMsg("Could not save. Please try again."); }
    setSavingPlan(false);
    setTimeout(() => setSaveMsg(""), 4000);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null); setUserEmail(""); setAccess("free"); setAccessMsg("");
  }

  function reset() { setPlan(null); if (user) refreshPaymentAccess(user); else setAccess("free"); setScreen("home"); setPlanReady(false); setAgreed(false); setAccessMsg(""); try { window.localStorage.removeItem(STORAGE_KEY); } catch { } }

  // ── HOME ──────────────────────────────────────────────────────────────────
  if (screen === "home") return (
    <div style={S.page}>
      <div style={{ ...S.wrap, padding: "28px 0 70px" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 10, position: "sticky", top: 0, zIndex: 20, padding: "10px 0", backdropFilter: "blur(14px)" }}>
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>NutriPlan</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Pill>Real food. Realistic progress.</Pill>
            {user ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ color: "#9fb3c8", fontSize: 12 }}>{userEmail}</span>
                <button onClick={() => refreshPaymentAccess(user, { showMessage: true })} style={{ ...S.sec, padding: "8px 14px", borderRadius: 999, fontSize: 13, opacity: checkingAccess ? 0.7 : 1 }} disabled={checkingAccess}>{checkingAccess ? "Checking..." : "Refresh access"}</button>
                <button onClick={handleSignOut} style={{ ...S.sec, padding: "8px 14px", borderRadius: 999, fontSize: 13 }}>Sign out</button>
              </div>
            ) : (
              <button onClick={() => setAuthModal("signup")} style={S.authBtn}>Sign up / log in</button>
            )}
            <button onClick={reset} style={{ ...S.sec, padding: "8px 14px", borderRadius: 999, fontSize: 13 }}>Reset</button>
          </div>
        </header>
        {accessMsg && <div style={{ borderRadius: 12, padding: "10px 14px", background: accessMsg.includes("active") ? "rgba(183,215,194,.12)" : "rgba(96,165,250,.1)", border: "1px solid " + (accessMsg.includes("active") ? "rgba(183,215,194,.32)" : "rgba(96,165,250,.25)"), marginBottom: 14, fontSize: 13, color: accessMsg.includes("active") ? "#dff3e6" : "#dbeafe" }}>{accessMsg}</div>}
        <LaunchBanner />
        <section style={{ textAlign: "center", marginBottom: 40, paddingTop: 12 }}>
          <h1 style={{ fontSize: "clamp(34px,8vw,80px)", lineHeight: 0.93, letterSpacing: -3, margin: "0 auto 20px", maxWidth: 860 }}>
            Eat better. Look better. Stay consistent.
          </h1>
          <p style={{ color: "#94a3b8", fontSize: 18, lineHeight: 1.65, maxWidth: 600, margin: "0 auto 30px" }}>
            Real nutrition for real life: simple meals, flexible structure, and sustainable fat-loss habits for people who already care about feeling good.
          </p>
          <button onClick={() => choosePlan("pro")} style={{ ...S.btn, padding: "16px 36px", fontSize: 17 }}>Get My Plan - $27</button>
          <div style={{ marginTop: 10, color: "#475569", fontSize: 12 }}>Or try the free preview below. No credit card needed.</div>
        </section>

        {/* Trust strip */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px 24px", marginBottom: 40 }}>
          {["No extreme diets", "Real food meals", "Built for busy people", "Results vary", "Not medical advice"].map(t => (
            <span key={t} style={{ color: "#64748b", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "#b7d7c2" }}>✓</span>{t}
            </span>
          ))}
        </div>

        {/* Who this is for */}
        <div style={{ ...S.card, padding: "22px 26px", marginBottom: 36, background: "rgba(15,23,42,.6)" }}>
          <div style={{ color: "#b7d7c2", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Who this is for</div>
          <p style={{ color: "#f8fafc", fontSize: 17, fontWeight: 700, margin: "0 0 14px" }}>NutriPlan is for people who:</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "8px 24px" }}>
            {["Feel stuck even though they are trying", "Hate boring diets that never last", "Want simple meals, not complicated recipes", "Want realistic progress, not overnight miracles", "Need structure and guidance, not shame"].map(item => (
              <div key={item} style={{ color: "#cbd5e1", fontSize: 14, display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ color: "#b7d7c2", flexShrink: 0, marginTop: 1 }}>-&gt;</span>{item}
              </div>
            ))}
          </div>
        </div>

        {/* Product value */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ color: "#b7d7c2", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 12, textAlign: "center" }}>What you get inside</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
            {[
              ["A real 7-day structure", "Meals are organized by day so you know what to eat without starting over every morning."],
              ["Calories and macros", "Targets are estimated from your body, goal, and activity level, then paired with practical meals."],
              ["Flexible food swaps", "Pro and Elite let you swap meals when life, cravings, or leftovers change the plan."],
              ["Recipes that feel normal", "Simple American-friendly meals with ingredients, steps, and practical notes."],
            ].map(([title, body]) => (
              <div key={title} style={{ ...S.card, padding: 18, borderRadius: 18, background: "rgba(15,23,42,.58)" }}>
                <h3 style={{ margin: "0 0 8px", fontSize: 17 }}>{title}</h3>
                <p style={{ margin: 0, color: "#9fb3c8", fontSize: 14, lineHeight: 1.6 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 14 }}>
          {PLANS.map(p => (
            <div key={p.id} style={{ ...S.card, padding: 20, position: "relative", border: p.recommended ? "1px solid rgba(183,215,194,.5)" : p.premium ? "1px solid rgba(147,197,253,.45)" : S.card.border, background: p.recommended ? "linear-gradient(180deg,rgba(183,215,194,.11),rgba(15,23,42,.8))" : p.premium ? "linear-gradient(180deg,rgba(147,197,253,.1),rgba(15,23,42,.8))" : S.card.background }}>
              {p.recommended && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: "#b7d7c2", color: "#07111f", fontSize: 11, fontWeight: 900, padding: "4px 14px", borderRadius: 999, whiteSpace: "nowrap" }}>MOST POPULAR</div>}
              <Pill>{p.badge}</Pill>
              <h2 style={{ margin: "10px 0 2px", fontSize: 24 }}>{p.name}</h2>
              <div style={{ fontSize: 34, fontWeight: 900, marginBottom: 4 }}>{p.price}</div>
              <p style={{ color: "#94a3b8", minHeight: 48, fontSize: 14, margin: "0 0 14px", lineHeight: 1.55 }}>{p.desc}</p>
              {p.features.map(f => <div key={f} style={{ color: "#cbd5e1", fontSize: 13, marginBottom: 8, display: "flex", gap: 8, alignItems: "flex-start" }}><span style={{ color: "#b7d7c2", flexShrink: 0 }}>✓</span>{f}</div>)}
              <button onClick={() => choosePlan(p.id)} style={{ ...(p.id === "free" ? S.sec : S.btn), width: "100%", marginTop: 16 }}>
                {p.id === "free" ? "Try free preview" : "Get " + p.name + " - " + p.price}
              </button>
            </div>
          ))}
        </div>
        <div style={{ ...S.card, padding: "22px 26px", marginTop: 24, background: "rgba(15,23,42,.58)" }}>
          <div style={{ color: "#b7d7c2", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Good to know</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
            {[
              ["No extreme dieting", "NutriPlan uses moderate calorie targets and normal meals. It is built for consistency, not punishment."],
              ["Estimates, not medical advice", "Calories and macros are practical estimates. Individual needs vary by body, history, training, and health."],
              ["Real-life flexibility", "Use the plan as a starting point, swap meals when needed, and adjust based on hunger, energy, and progress."],
            ].map(([title, body]) => (
              <div key={title}>
                <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>{title}</h3>
                <p style={{ margin: 0, color: "#9fb3c8", fontSize: 13, lineHeight: 1.6 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
        <FAQSection />
        <LegalFooter onOpen={setLegalModal} />
      </div>
      <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />
      {authModal && <AuthModal mode={authModal} onClose={() => setAuthModal(null)} onSuccess={(u, em) => { setUser(u); setUserEmail(em); setAuthModal(null); refreshPaymentAccess(u, { showMessage: true }); }} />}
    </div>
  );

  // ── UNLOCK / CHECKOUT ─────────────────────────────────────────────────────
  if (screen === "unlock") return (
    <div style={S.page}>
      <div style={{ ...S.wrap, maxWidth: 540, padding: "28px 0 70px" }}>
        <button onClick={() => setScreen("home")} style={S.sec}>Back</button>
        <LaunchBanner />
        <div style={{ ...S.card, padding: 28, marginTop: 18 }}>
          <Pill>{selPlan.badge}</Pill>
          <h1 style={{ fontSize: 32, letterSpacing: -1, margin: "14px 0 6px" }}>{selPlan.name} Plan - {selPlan.price}</h1>
          <p style={{ color: "#94a3b8", lineHeight: 1.65, margin: "0 0 20px" }}>Your plan is built around your body and your life. No extreme diets. No shame.</p>
          <div style={{ background: "rgba(2,6,23,.5)", borderRadius: 14, padding: "14px 16px", marginBottom: 22 }}>
            {selPlan.features.map(f => <div key={f} style={{ color: "#cbd5e1", fontSize: 14, marginBottom: 8, display: "flex", gap: 8 }}><span style={{ color: "#b7d7c2" }}>✓</span>{f}</div>)}
          </div>
          <a href={PAYPAL[selectedTier] || "#"} target="_blank" rel="noreferrer noopener" style={{ ...S.btn, display: "block", textAlign: "center", textDecoration: "none", fontSize: 16, padding: "16px", marginBottom: 8 }}>
            Secure Checkout - {selPlan.price}
          </a>
          <p style={{ color: "#475569", fontSize: 12, textAlign: "center", margin: "0 0 10px", lineHeight: 1.5 }}>Secure payment. Card, Apple Pay, and other options may be available at checkout.</p>
          <p style={{ color: "#475569", fontSize: 11, textAlign: "center", margin: "0 0 22px", lineHeight: 1.55, padding: "10px 14px", background: "rgba(2,6,23,.4)", borderRadius: 10, border: "1px solid rgba(148,163,184,.08)" }}>
            Your payment is processed securely by a trusted third-party checkout provider. NutriPlan does not store your payment details.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginBottom: 22 }}>
            {[
              ["1", "Pay securely with PayPal"],
              ["2", "Sign in with the same email"],
              ["3", "Refresh access and build your plan"],
            ].map(([num, text]) => (
              <div key={num} style={{ border: "1px solid rgba(148,163,184,.12)", borderRadius: 14, padding: 12, background: "rgba(15,23,42,.5)" }}>
                <div style={{ width: 26, height: 26, borderRadius: 999, display: "grid", placeItems: "center", background: "rgba(183,215,194,.16)", color: "#dff3e6", fontWeight: 900, marginBottom: 8 }}>{num}</div>
                <div style={{ color: "#cbd5e1", fontSize: 12, lineHeight: 1.45, fontWeight: 800 }}>{text}</div>
              </div>
            ))}
          </div>
          <div style={{ height: 1, background: "rgba(148,163,184,.1)", marginBottom: 22 }} />
          <div style={{ borderRadius: 14, padding: "14px 16px", background: "rgba(96,165,250,.08)", border: "1px solid rgba(96,165,250,.18)", marginBottom: 16 }}>
            <div style={{ color: "#dbeafe", fontSize: 13, fontWeight: 900, marginBottom: 5 }}>After checkout, sign in and refresh access.</div>
            <div style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.55 }}>Use the same email you used at PayPal checkout. PayPal updates your Supabase profile through the webhook, then Refresh access unlocks your paid plan automatically.</div>
          </div>
          {user ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ color: "#9fb3c8", fontSize: 12 }}>Signed in as {userEmail}</div>
              <button onClick={() => refreshPaymentAccess(user, { showMessage: true })} style={{ ...S.btn, width: "100%", opacity: checkingAccess ? 0.7 : 1 }} disabled={checkingAccess}>
                {checkingAccess ? "Checking payment..." : "Check payment / refresh access"}
              </button>
              {accessMsg && <p style={{ color: accessMsg.includes("active") ? "#dff3e6" : "#dbeafe", fontSize: 13, margin: 0, lineHeight: 1.5 }}>{accessMsg}</p>}
              {isPaid(accessTier) && <button onClick={() => setScreen("onboarding")} style={{ ...S.sec, width: "100%", borderColor: "rgba(183,215,194,.35)", color: "#f8fafc" }}>Continue with {accessTier.charAt(0).toUpperCase() + accessTier.slice(1)}</button>}
            </div>
          ) : (
            <button onClick={() => setAuthModal("signup")} style={{ ...S.authBtn, width: "100%", borderRadius: 14, padding: "14px 18px" }}>Create account / log in to activate access</button>
          )}
          <p style={{ color: "#475569", fontSize: 11, textAlign: "center", margin: "12px 0 0", lineHeight: 1.55 }}>Need help? Email {SUPPORT_EMAIL} with your PayPal receipt and the email you used at checkout.</p>
        </div>
      </div>
      <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />
      {authModal && <AuthModal mode={authModal} onClose={() => setAuthModal(null)} onSuccess={(u, em) => { setUser(u); setUserEmail(em); setAuthModal(null); refreshPaymentAccess(u, { showMessage: true }); }} />}
    </div>
  );

  // ── ONBOARDING ────────────────────────────────────────────────────────────
  if (screen === "onboarding") return (
    <div style={S.page}>
      <div style={{ ...S.wrap, maxWidth: 620, padding: "28px 0 80px" }}>
        <button onClick={() => setScreen("home")} style={S.sec}>Back</button>
        <LaunchBanner />
        <h1 style={{ fontSize: 40, letterSpacing: -2, margin: "22px 0 6px", lineHeight: 1.05 }}>Tell us about your life.</h1>
        <p style={{ color: "#94a3b8", lineHeight: 1.65, margin: "0 0 24px" }}>No judgment. We use this to build a plan that actually fits you.</p>
        <div style={{ ...S.card, padding: 24, display: "grid", gap: 20 }}>
          {!isPaid(accessTier) && (
            <Field label="Daily calorie target" error={errors.calories}>
              <input style={S.inp} inputMode="numeric" value={form.calories} placeholder="2000" onChange={e => setVal("calories", e.target.value)} />
              <div style={{ color: "#64748b", fontSize: 12 }}>Not sure? 2000 cal is a reasonable starting point.</div>
            </Field>
          )}
          {isPaid(accessTier) && (<>
            <Field label="My main goal">
              <select style={S.inp} value={form.goal} onChange={e => setVal("goal", e.target.value)}>
                <option value="lose">Lose weight and feel lighter</option>
                <option value="maintain">Eat better and maintain my weight</option>
                <option value="gain">Build muscle and get stronger</option>
              </select>
            </Field>
            {form.goal === "lose" && (
              <Field label="How fast do you want to lose?">
                <select style={S.inp} value={form.lossSpeed} onChange={e => setVal("lossSpeed", e.target.value)}>
                  <option value="gentle">Slow and steady - ~200 cal deficit</option>
                  <option value="steady">Moderate - ~400 cal deficit (recommended)</option>
                  <option value="faster">Faster - ~550 cal deficit</option>
                </select>
              </Field>
            )}
            <Field label="Gender">
              <select style={S.inp} value={form.gender} onChange={e => setVal("gender", e.target.value)}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </Field>
            <SliderField label="Age" error={errors.age} value={form.age} onChange={v => setVal("age", v)} min={16} max={99} unit="yrs" />
            <SliderField label="Weight" error={errors.weight} value={form.weight} onChange={v => setVal("weight", v)} min={30} max={250} unit="kg" altUnit="lbs" toAlt={kgToLbs} fromAlt={lbsToKg} altMin={66} altMax={550} defaultAlt={true} />
            <SliderField label="Height" error={errors.height} value={form.height} onChange={v => setVal("height", v)} min={120} max={220} unit="cm" altUnit="in" toAlt={cmToInches} fromAlt={inchesToCm} altMin={47} altMax={87} defaultAlt={true} />
            <Field label="How active are you day-to-day?">
              <select style={S.inp} value={form.activity} onChange={e => setVal("activity", e.target.value)}>
                <option value="sedentary">Not very active - mostly sitting</option>
                <option value="light">A little active - walks, gym 1-2x week</option>
                <option value="moderate">Moderately active - gym 3-5x week</option>
                <option value="active">Very active - training most days</option>
              </select>
            </Field>
            {hasBFP(accessTier) && (
              <div style={{ borderTop: "1px solid rgba(148,163,184,.1)", paddingTop: 16, display: "grid", gap: 14 }}>
                <div style={{ color: "#64748b", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em" }}>Optional - Body Fat Estimate</div>
                <Field label="Waist (cm) - optional"><input style={S.inp} inputMode="numeric" value={form.waist} placeholder="e.g. 85" onChange={e => setVal("waist", e.target.value)} /></Field>
                <Field label="Neck (cm) - optional"><input style={S.inp} inputMode="numeric" value={form.neck} placeholder="e.g. 38" onChange={e => setVal("neck", e.target.value)} /></Field>
                {form.gender === "female" && <Field label="Hip (cm)"><input style={S.inp} inputMode="numeric" value={form.hip} placeholder="e.g. 95" onChange={e => setVal("hip", e.target.value)} /></Field>}
              </div>
            )}
          </>)}
          <Field label="Meals per day">
            <select style={S.inp} value={form.mealsPerDay} onChange={e => setVal("mealsPerDay", e.target.value)}>
              <option value="3">3 meals - breakfast, lunch, dinner</option>
              <option value="4">3 meals plus a snack</option>
            </select>
          </Field>
          <Field label="What is your biggest challenge right now?">
            <select style={S.inp} value={form.biggestStruggle} onChange={e => setVal("biggestStruggle", e.target.value)}>
              <option value="late_night">Late-night cravings</option>
              <option value="takeout">Too much takeout</option>
              <option value="dont_know">I don't know what to eat</option>
              <option value="training_no_results">I'm training but not seeing results</option>
              <option value="busy">Busy schedule - no time to cook</option>
              <option value="boring_diets">I hate boring diets</option>
            </select>
          </Field>
          <Field label="What kind of food do you actually enjoy?">
            <select style={S.inp} value={form.foodPreference} onChange={e => setVal("foodPreference", e.target.value)}>
              <option value="balanced">Balanced real food - just normal meals</option>
              <option value="highProtein">High protein - I like meat and protein</option>
              <option value="comfort">Comfort food made smarter</option>
              <option value="budget">Budget-friendly meals</option>
              <option value="mealPrep">Simple meal prep - cook once, eat multiple times</option>
            </select>
          </Field>
          {hasWorkouts(accessTier) && (
            <div style={{ borderTop: "1px solid rgba(148,163,184,.1)", paddingTop: 16, display: "grid", gap: 14 }}>
              <div style={{ color: "#64748b", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em" }}>Your Training Setup</div>
              <Field label="How many days per week can you train?">
                <select style={S.inp} value={form.workoutsPerWeek} onChange={e => setVal("workoutsPerWeek", e.target.value)}>
                  <option value="2">2 days</option><option value="3">3 days</option><option value="4">4 days</option><option value="5">5 days</option>
                </select>
              </Field>
              <Field label="Training style">
                <select style={S.inp} value={form.workoutStyle} onChange={e => setVal("workoutStyle", e.target.value)}>
                  <option value="fullBody">Full Body - hit everything each session</option>
                  <option value="upperLower">Upper / Lower split</option>
                  <option value="ppl">Push / Pull / Legs</option>
                </select>
              </Field>
              <Field label="Where do you train?">
                <select style={S.inp} value={form.trainingPlace} onChange={e => setVal("trainingPlace", e.target.value)}>
                  <option value="gym">Gym - I have equipment</option>
                  <option value="home">Home - bodyweight only</option>
                </select>
              </Field>
              <Field label="Your experience level?">
                <select style={S.inp} value={form.level} onChange={e => setVal("level", e.target.value)}>
                  <option value="beginner">Beginner - less than 1 year</option>
                  <option value="intermediate">Intermediate - 1-3 years</option>
                  <option value="advanced">Advanced - 3+ years</option>
                </select>
              </Field>
            </div>
          )}
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: 16, background: "rgba(2,6,23,.5)", borderRadius: 12, border: termsError ? "1px solid #f87171" : "1px solid rgba(148,163,184,.12)" }}>
            <input type="checkbox" id="terms-agree" checked={agreedToTerms} onChange={e => { setAgreed(e.target.checked); setTermsError(false); }} style={{ marginTop: 3, accentColor: "#b7d7c2", width: 18, height: 18, flexShrink: 0, cursor: "pointer" }} />
            <label htmlFor="terms-agree" style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.6, cursor: "pointer" }}>
              I understand that NutriPlan is not medical advice. Results vary and there is no guarantee of weight loss. I am responsible for my own health decisions and will consult a healthcare professional before making significant changes to my diet or exercise routine. I agree to the{" "}
              <span style={{ color: "#b7d7c2", textDecoration: "underline", cursor: "pointer" }} onClick={() => setLegalModal("terms")}>Terms of Service</span>{" "}and{" "}
              <span style={{ color: "#b7d7c2", textDecoration: "underline", cursor: "pointer" }} onClick={() => setLegalModal("privacy")}>Privacy Policy</span>.
            </label>
          </div>
          {termsError && <p style={{ color: "#f87171", fontSize: 13, margin: 0 }}>Please read and agree to the terms before continuing.</p>}
          <button onClick={generate} style={{ ...S.btn, opacity: generating ? 0.7 : 1, fontSize: 16, padding: "16px" }} disabled={generating}>
            {generating ? "Building your plan..." : "Build My Plan"}
          </button>
        </div>
      </div>
      <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />
    </div>
  );

  // ── RESULTS ───────────────────────────────────────────────────────────────
  if (screen === "results" && plan) {
    const day = plan.days[openDay] || plan.days[0];
    const tabs = ["meals", ...(plan.workouts && plan.workouts.length > 0 ? ["workout"] : []), "recipes"];

    return (
      <div style={S.page}>
        <div style={{ ...S.wrap, padding: "24px 0 80px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
            <button onClick={() => setScreen("home")} style={S.sec}>Home</button>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {user ? (
                <>
                  <span style={{ color: "#64748b", fontSize: 12 }}>{userEmail}</span>
                  <button onClick={savePlanToSupabase} style={{ ...S.btn, padding: "8px 16px", fontSize: 13, opacity: savingPlan ? 0.7 : 1 }} disabled={savingPlan}>
                    {savingPlan ? "Saving..." : "Save plan"}
                  </button>
                </>
              ) : (
                <button onClick={() => setAuthModal("signup")} style={{ ...S.sec, padding: "8px 16px", fontSize: 13 }}>Save plan</button>
              )}
            </div>
          </div>
          {saveMsg && <div style={{ borderRadius: 12, padding: "10px 16px", background: saveMsg.includes("saved") ? "rgba(183,215,194,.1)" : "rgba(248,113,113,.1)", border: "1px solid " + (saveMsg.includes("saved") ? "rgba(183,215,194,.3)" : "rgba(248,113,113,.3)"), marginBottom: 14, fontSize: 13, color: saveMsg.includes("saved") ? "#dff3e6" : "#fca5a5" }}>{saveMsg}</div>}
          <LaunchBanner />
          <div style={{ marginTop: 16, marginBottom: 18 }}>
            <Pill color="#b7d7c2">{plan.tier.charAt(0).toUpperCase() + plan.tier.slice(1)} plan</Pill>
            <h1 style={{ fontSize: "clamp(30px,6vw,48px)", letterSpacing: -2, margin: "14px 0 6px", lineHeight: 1.05 }}>Your plan for real life.</h1>
            <p style={{ color: "#94a3b8", margin: 0 }}>Consistency over perfection. Normal food, smarter portions.</p>
          </div>
          {planReady && (
            <div style={{ borderRadius: 14, padding: "14px 18px", background: "rgba(183,215,194,.08)", border: "1px solid rgba(183,215,194,.25)", marginBottom: 16, fontSize: 14, color: "#dff3e6", display: "flex", alignItems: "center", gap: 10 }}>
              <span>✓</span> Your plan is ready. Scroll down to see your meals.
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(80px,1fr))", gap: 10, marginBottom: 12 }}>
            <MacroBox icon="🔥" val={plan.cal} label="cal/day" />
            <MacroBox icon="🥩" val={plan.protein + "g"} label="protein" />
            <MacroBox icon="🍚" val={plan.carbs + "g"} label="carbs" />
            <MacroBox icon="🥑" val={plan.fat + "g"} label="fat" />
            {plan.bfp && <MacroBox icon="📏" val={plan.bfp + "%"} label="body fat" />}
          </div>
          <p style={{ color: "#475569", fontSize: 11, lineHeight: 1.55, margin: "0 0 20px", padding: "10px 14px", background: "rgba(15,23,42,.5)", borderRadius: 10, border: "1px solid rgba(148,163,184,.08)" }}>
            Calories and macros are estimates for educational purposes only. Individual needs vary. Consult a qualified professional before making major diet or fitness changes.
          </p>
          <div style={{ ...S.card, padding: 18, marginBottom: 20, background: "rgba(15,23,42,.58)" }}>
            <Pill color="#b7d7c2">How to use this</Pill>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginTop: 12 }}>
              {[
                ["Start with the plan", "Follow the meals closely for a few days so you have a clear baseline."],
                ["Adjust like a human", "If hunger, energy, or training feels off, adjust portions instead of forcing perfection."],
                ["Track the trend", "Use weekly progress, not one scale day, to decide whether calories need changing."],
              ].map(([title, body]) => (
                <div key={title}>
                  <strong style={{ color: "#f8fafc", fontSize: 14 }}>{title}</strong>
                  <p style={{ color: "#9fb3c8", fontSize: 13, lineHeight: 1.55, margin: "5px 0 0" }}>{body}</p>
                </div>
              ))}
            </div>
          </div>
          {plan.tier === "free" && (
            <div style={{ ...S.card, padding: 22, marginBottom: 24, background: "linear-gradient(135deg,rgba(183,215,194,.08),rgba(15,23,42,.8))", border: "1px solid rgba(183,215,194,.3)" }}>
              <Pill>Free preview</Pill>
              <h3 style={{ margin: "12px 0 8px", fontSize: 20 }}>You are seeing 1 day. The full plan is 7.</h3>
              <p style={{ color: "#94a3b8", margin: "0 0 16px", lineHeight: 1.65, fontSize: 14 }}>Upgrade to get your full 7-day plan, smart calorie calculation, meal swaps, and the food calculator.</p>
              <button onClick={() => choosePlan("pro")} style={S.btn}>Get the full plan - $27</button>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {tabs.map(t => (
              <button key={t} onClick={() => setActiveTab(t)} style={{ flex: "1 1 80px", minWidth: 80, background: activeTab === t ? "#b7d7c2" : "rgba(15,23,42,.72)", color: activeTab === t ? "#07111f" : "#cbd5e1", border: "1px solid " + (activeTab === t ? "#b7d7c2" : "rgba(148,163,184,.16)"), borderRadius: 14, padding: "12px 8px", fontWeight: 800, cursor: "pointer", fontSize: 14, textTransform: "capitalize" }}>
                {t === "meals" ? "Meal Plan" : t === "workout" ? "Workouts" : "Recipes"}
              </button>
            ))}
          </div>

          {/* Workout tab */}
          {activeTab === "workout" && plan.workouts && plan.workouts.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
              {plan.workouts.map((w, i) => <WorkoutCard key={w.title + i} w={w} />)}
            </div>
          )}

          {/* Meals tab */}
          {activeTab === "meals" && (<>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, marginBottom: 20, WebkitOverflowScrolling: "touch" }}>
              {plan.days.map((d, i) => (
                <button key={d.day} onClick={() => setOpenDay(i)} style={{ flexShrink: 0, background: openDay === i ? "#b7d7c2" : "rgba(15,23,42,.72)", color: openDay === i ? "#07111f" : "#cbd5e1", border: "1px solid " + (openDay === i ? "#b7d7c2" : "rgba(148,163,184,.16)"), borderRadius: 999, padding: "10px 16px", fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap", fontSize: 14 }}>
                  {d.day.slice(0, 3)}{d.locked ? " 🔒" : d.isTraining ? " ⚡" : ""}
                </button>
              ))}
            </div>
            <h2 style={{ margin: "0 0 16px", fontSize: 26 }}>{day.day}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 16 }}>
              {plan.slots.map(slot => (
                <MealCard key={slot} slot={slot} mealObj={day.meals[slot]} locked={day.locked} allowSwap={canSwap(plan.tier) && !day.locked} onSwap={() => swapMeal(openDay, slot)} onUpgrade={() => choosePlan("pro")} />
              ))}
            </div>
          </>)}

          {/* Recipes tab */}
          {activeTab === "recipes" && (
            <div>
              {!hasRecipes(plan.tier) && (
                <div style={{ ...S.card, padding: 22, marginBottom: 20, background: "linear-gradient(135deg,rgba(183,215,194,.08),rgba(15,23,42,.8))", border: "1px solid rgba(183,215,194,.3)" }}>
                  <Pill>Pro feature</Pill>
                  <h3 style={{ margin: "12px 0 8px" }}>11 full recipes with instructions</h3>
                  <p style={{ color: "#94a3b8", margin: "0 0 16px", lineHeight: 1.6, fontSize: 14 }}>Step-by-step cooking instructions for every meal type. Upgrade to Pro to unlock all recipes.</p>
                  <button onClick={() => choosePlan("pro")} style={S.btn}>Upgrade to Pro - $27</button>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(290px,1fr))", gap: 16 }}>
                {RECIPES.map((recipe, idx) => (
                  <RecipeCard key={recipe.id} recipe={recipe} locked={!hasRecipes(plan.tier) && idx > 0} onUpgrade={() => choosePlan("pro")} />
                ))}
              </div>
            </div>
          )}

          <NutriCoach tier={plan.tier} struggle={form.biggestStruggle} onUpgrade={upgradeFrom} />

          {hasCalc(plan.tier) ? <CalorieCalculator /> : (
            <div style={{ ...S.card, padding: 22, marginTop: 20 }}>
              <Pill>Locked</Pill>
              <h3 style={{ margin: "12px 0 6px" }}>Food Calculator</h3>
              <p style={{ color: "#94a3b8", margin: "0 0 16px", lineHeight: 1.6, fontSize: 14 }}>Look up any food using the label on the package. Unlocks with Pro.</p>
              <button onClick={() => choosePlan("pro")} style={S.btn}>Upgrade to Pro - $27</button>
            </div>
          )}

          {/* Final results reminder */}
          <p style={{ color: "#475569", fontSize: 12, lineHeight: 1.6, margin: "24px 0 0", padding: "14px 16px", background: "rgba(15,23,42,.5)", borderRadius: 12, border: "1px solid rgba(148,163,184,.08)" }}>
            This plan is a starting point, not a medical prescription. Adjust based on your body, preferences, and professional guidance.
          </p>

          <LegalFooter onOpen={setLegalModal} />
        </div>
        <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />
        {authModal && <AuthModal mode={authModal} onClose={() => setAuthModal(null)} onSuccess={(u, em) => { setUser(u); setUserEmail(em); setAuthModal(null); refreshPaymentAccess(u, { showMessage: true }); }} />}
      </div>
    );
  }

  return null;
}

