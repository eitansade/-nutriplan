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
const LAUNCH_TIMER_KEY = STORAGE_KEY + "_launch_deadline";
const EMAIL_CAPTURE_KEY = STORAGE_KEY + "_email_offer_seen";
const SUPPORT_EMAIL = "hello.nutriplan@gmail.com";
const TIKTOK_PIXEL_ID = import.meta.env.VITE_TIKTOK_PIXEL_ID;

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
  ["Is this a monthly subscription?", "Not right now. These are founding launch prices for digital access through the PayPal checkout links shown on this page. If subscriptions are added later, the checkout will say that clearly before you pay."],
  ["Is this a strict diet?", "No. NutriPlan is built around normal meals, moderate targets, and practical consistency. It gives structure without asking you to eat perfectly."],
  ["Are the calories exact?", "No food estimate is perfect. Calories and macros are practical estimates to help you make better choices, not medical numbers or a guarantee."],
  ["Can I use this with allergies or medical conditions?", "Only with care and professional guidance. NutriPlan does not screen for allergies, intolerances, pregnancy, eating disorders, diabetes, or medical diets."],
  ["Do results vary?", "Yes. Results depend on consistency, body size, activity, sleep, stress, health history, and many factors outside the app."],
  ["Why is there a launch timer?", "It highlights the current founding launch offer for this visit. It does not secretly change your checkout. The PayPal checkout price is always the source of truth before you pay."],
];

const HOME_PROBLEM_POINTS = [
  "You work, train, and try to eat better, but still feel stuck.",
  "You start strong, restrict too hard, get tired, and restart next Monday.",
  "You do not need another impossible diet. You need a plan that fits your real life.",
];

const HOME_AUDIENCE = [
  "You want to lose weight but hate extreme diets.",
  "You train but feel stuck at the last level.",
  "You eat pretty healthy but still feel tired, bloated, or inconsistent.",
  "You want to build muscle without guessing what to eat.",
  "You want health to feel simple again.",
  "You want a plan that feels human, not robotic.",
];

const HOW_IT_WORKS = [
  ["Tell NutriPlan about your life", "Choose your goal, schedule, meals per day, activity level, and food preferences."],
  ["Get a realistic food structure", "Your calories, macros, meals, and recipes are organized into a plan you can actually follow."],
  ["Use it in the real world", "Swap meals, adjust portions, and keep moving without turning food into punishment."],
];

const REAL_FOOD_EXAMPLES = [
  "Garlic butter steak with crispy potatoes",
  "Creamy scrambled eggs on sourdough",
  "Chicken rice bowls with yogurt garlic sauce",
  "High-protein pasta with tomato, parmesan, and basil",
  "Greek yogurt bowls with berries and peanut butter drizzle",
  "Turkey burgers with caramelized onions and oven fries",
];

const VALUE_STACK = [
  ["A 7-day food structure", "Meals are organized by day so you are not deciding from scratch every morning."],
  ["Calorie and macro targets", "Practical estimates for fat loss, maintenance, or muscle gain without pretending food math is perfect."],
  ["Real recipe direction", "Home-style meals with normal ingredients, simple prep, and portions that feel realistic."],
  ["Flexibility tools", "Pro and Elite add meal swaps, recipes, and a food label calculator for real-world choices."],
  ["Workout structure in Elite", "A simple weekly training plan for people who want food and movement in one place."],
  ["A calmer way to stay consistent", "The product is built around repeatable weeks, not guilt, restriction, or perfect behavior."],
];

const RECIPE_PREVIEWS = [
  ["Garlic Butter Steak Plate", "Lean steak, crispy potatoes, cucumber salad, and a small garlic butter finish.", "Satisfying dinner energy without turning health into plain chicken."],
  ["Creamy Eggs on Sourdough", "Soft scrambled eggs, avocado, cherry tomatoes, and toasted sourdough.", "A calm morning meal that feels warm, normal, and high protein."],
  ["Chicken Rice Bowl", "Roasted vegetables, seasoned chicken, rice, and yogurt garlic sauce.", "Meal-prep friendly, but still tastes like something you want to eat."],
  ["High-Protein Pasta", "Slow tomato sauce, lean turkey, parmesan, olive oil, and basil.", "Comfort food made smarter, not removed from your life."],
];

const MICRO_TRUST = [
  ["Built for normal weeks", "Work, training, cravings, restaurants, and tired nights are part of the plan, not reasons to quit."],
  ["No miracle claims", "NutriPlan gives practical estimates and structure. Your results depend on consistency, health, sleep, stress, and life."],
  ["Food you recognize", "Meals are built around eggs, chicken, rice, potatoes, yogurt, pasta, salmon, tacos, burgers, and simple groceries."],
  ["You stay in control", "Use the plan as a guide, adjust portions, and consult a professional when your health situation needs it."],
];

const TESTIMONIALS = [
  "Finally, a meal plan that does not feel like punishment.",
  "Real food, simple structure, and no extreme diet energy.",
  "This feels like something I could actually follow.",
  "The meals feel normal - not like boring fitness food.",
  "I wanted something that helps me stay consistent without obsessing.",
];

const TRANSFORMATIONS = [
  ["Before", "Skipping breakfast, random lunches, late-night cravings, and no clear structure."],
  ["During", "Simple meals, realistic calories, higher protein, flexible swaps, and less guessing."],
  ["After", "More consistent weeks, calmer food choices, better energy, and a plan that feels livable."],
];

const DAILY_SUPPORT = [
  ["Today's habit", "Pick one simple win: protein at breakfast, a 10-minute walk, water with lunch, or planning dinner before you are starving."],
  ["Weekly check-in", "Look at the trend, not one perfect day. Energy, hunger, workouts, sleep, and consistency all matter."],
  ["Streak mindset", "A missed meal does not restart the week. The next choice is where consistency is rebuilt."],
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
function getLaunchDeadline() {
  const fallback = Date.now() + 15 * 60 * 1000;
  try {
    const stored = Number(window.localStorage.getItem(LAUNCH_TIMER_KEY));
    if (stored && stored > Date.now()) return stored;
    window.localStorage.setItem(LAUNCH_TIMER_KEY, String(fallback));
  } catch { }
  return fallback;
}
function trackTikTok(eventName, payload = {}) {
  try {
    if (window.ttq && eventName) window.ttq.track(eventName, payload);
  } catch { }
}

// ─── Styles ───────────────────────────────────────────────────────────────
const S = {
  page: { minHeight: "100vh", overflowX: "hidden", background: "radial-gradient(circle at top left,#334844,#121c22 44%,#f4f1e8)", color: "#f8fafc", fontFamily: "Inter,system-ui,sans-serif" },
  wrap: { width: "min(1100px, calc(100% - 32px))", margin: "0 auto" },
  card: { background: "rgba(23,34,38,.78)", border: "1px solid rgba(148,163,184,.15)", borderRadius: 24, boxShadow: "0 20px 60px rgba(0,0,0,.25)" },
  inp: { width: "100%", boxSizing: "border-box", background: "rgba(10,20,22,.75)", color: "#fff", border: "1px solid rgba(148,163,184,.22)", borderRadius: 14, padding: "14px", fontSize: 16, outline: "none" },
  btn: { border: 0, borderRadius: 14, padding: "14px 18px", background: "linear-gradient(135deg,#f8fafc,#c8dcc8)", color: "#10201d", fontWeight: 900, cursor: "pointer", fontSize: 15, boxShadow: "0 12px 30px rgba(200,220,200,.18)" },
  sec: { border: "1px solid rgba(148,163,184,.2)", borderRadius: 14, padding: "14px 18px", background: "rgba(23,34,38,.72)", color: "#e2e8f0", fontWeight: 700, cursor: "pointer", fontSize: 15 },
  authBtn: { border: "1px solid rgba(200,220,200,.5)", borderRadius: 999, padding: "10px 16px", background: "linear-gradient(135deg,rgba(248,250,252,.96),rgba(200,220,200,.92))", color: "#10201d", fontWeight: 900, cursor: "pointer", fontSize: 13, boxShadow: "0 12px 28px rgba(200,220,200,.18)" },
};

const sectionLabel = { color: "#c8dcc8", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 };

// ─── Legal ────────────────────────────────────────────────────────────────
const LEGAL = {
  terms: { title: "Terms of Service", body: `Last updated: ${new Date().getFullYear()}\n\nATTORNEY REVIEW PENDING - Draft placeholder only. To be finalized before launch.\n\n1. ACCEPTANCE OF TERMS\nBy using NutriPlan, you agree to these Terms. You must be 18 years of age or older, or have explicit parent or guardian permission, to use this service.\n\n2. NOT MEDICAL ADVICE\nNutriPlan provides general nutrition, fitness, and wellness information for educational purposes only. Nothing on this platform constitutes medical advice, diagnosis, or treatment. This service is not for emergency or medical use. Always consult a qualified healthcare professional before making changes to your diet, exercise, or health routine.\n\n3. ALLERGY AND FOOD SAFETY WARNING\nNutriPlan does not account for food allergies, intolerances, or medical dietary restrictions. You are solely responsible for reviewing all ingredients and meals for allergens. Do not rely on this app if you have serious food allergies.\n\n4. USER RESPONSIBILITY\nYou are solely responsible for all food choices you make based on this app. NutriPlan accepts no liability for any adverse health outcomes resulting from following suggestions provided.\n\n5. NO GUARANTEES\nResults vary by individual. NutriPlan does not guarantee any specific weight loss, body composition changes, or fitness results. Individual outcomes depend on many factors outside our control.\n\n6. PAYMENTS\nPayments are handled by PayPal, a third-party payment processor. NutriPlan does not store your payment information.\n\n7. DIGITAL PRODUCT / REFUNDS\nNutriPlan delivers digital content. Once access is granted, all sales are final and non-refundable, except in cases of verified technical failure.\n\n8. GOVERNING LAW\nTo be finalized before launch.\n\n9. CONTACT\n${SUPPORT_EMAIL}` },
  privacy: { title: "Privacy Policy", body: `Last updated: ${new Date().getFullYear()}\n\nATTORNEY REVIEW PENDING - Draft placeholder only. To be finalized before launch.\n\n1. INFORMATION WE COLLECT\nWe collect your email address for account creation and the health data you voluntarily enter (age, weight, height, activity level, goals). We do not collect payment information.\n\n2. HOW WE STORE IT\nAccount data is stored securely via Supabase. Non-sensitive plan preferences may also be stored in your browser's local storage. Passwords are never stored in plain text.\n\n3. PAYMENTS\nPayments are processed by PayPal. We do not receive or store your credit card or payment details.\n\n4. WHAT WE DO NOT DO\nWe do not sell your personal information. We do not share it with advertisers or third parties.\n\n5. RESULTS VARY\nThis app provides estimates only. Results vary by individual.\n\n6. GOVERNING LAW\nTo be finalized before launch.\n\n7. CONTACT\n${SUPPORT_EMAIL}` },
  refund: { title: "Refund Policy", body: `Last updated: ${new Date().getFullYear()}\n\nATTORNEY REVIEW PENDING - Draft placeholder only. To be finalized before launch.\n\nDIGITAL PRODUCT - ALL SALES FINAL\nNutriPlan provides digital wellness content. Once access to your plan is granted, all sales are final and non-refundable.\n\nTECHNICAL ISSUES\nIf you experience a verified technical issue preventing access, contact us within 48 hours at ${SUPPORT_EMAIL} with your PayPal receipt.\n\nNO RESULTS GUARANTEE\nRefunds are not issued based on individual results or failure to achieve personal goals.\n\nPAYMENT PROCESSOR\nPayments are handled by PayPal, a third-party processor.\n\nGOVERNING LAW\nTo be finalized before launch.\n\nCONTACT\n${SUPPORT_EMAIL}` },
};

// ─── UI Components ────────────────────────────────────────────────────────
function Pill({ children, color }) {
  return <span style={{ display: "inline-flex", border: "1px solid rgba(148,163,184,.18)", background: "rgba(23,34,38,.72)", color: color || "#cbd5e1", borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 800 }}>{children}</span>;
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
          <button type="button" onClick={() => setUseAlt(u => !u)} style={{ background: "rgba(200,220,200,.12)", border: "1px solid rgba(200,220,200,.3)", borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 800, color: "#c8dcc8", cursor: "pointer" }}>
            {useAlt ? altUnit : unit} / {useAlt ? unit : altUnit}
          </button>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <input type="range" min={displayMin} max={displayMax} step={step} value={displayVal} onChange={handleSlider}
          style={{ flex: 1, height: 6, borderRadius: 999, outline: "none", cursor: "pointer", appearance: "none", WebkitAppearance: "none", background: `linear-gradient(to right,#c8dcc8 ${pct}%,rgba(148,163,184,.18) ${pct}%)` }} />
        <div style={{ minWidth: 68, textAlign: "right", fontSize: 22, fontWeight: 900, color: "#f8fafc" }}>
          {displayVal}<span style={{ fontSize: 12, color: "#64748b", marginLeft: 3 }}>{useAlt ? altUnit : unit}</span>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", color: "#475569", fontSize: 11 }}>
        <span>{displayMin} {useAlt ? altUnit : unit}</span>
        <span>{displayMax} {useAlt ? altUnit : unit}</span>
      </div>
      {error && <div style={{ color: "#fca5a5", fontSize: 12 }}>{error}</div>}
      <style>{`input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#f8fafc,#c8dcc8);border:2px solid #020617;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.4)}input[type=range]::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:linear-gradient(135deg,#f8fafc,#c8dcc8);border:2px solid #020617;cursor:pointer}`}</style>
    </div>
  );
}

function LaunchBanner() {
  const [deadline] = useState(getLaunchDeadline);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const secsLeft = Math.max(0, Math.ceil((deadline - now) / 1000));
  const expired = secsLeft <= 0;
  const mins = String(Math.floor(secsLeft / 60)).padStart(2, "0");
  const secs = String(secsLeft % 60).padStart(2, "0");
  return (
    <div style={{ marginTop: 18, marginBottom: 24, borderRadius: 18, padding: "16px 18px", background: "linear-gradient(135deg,rgba(200,220,200,.18),rgba(125,167,174,.12),rgba(251,191,36,.08))", border: "1px solid rgba(200,220,200,.36)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap", boxShadow: "0 18px 45px rgba(0,0,0,.22)" }}>
      <div style={{ minWidth: 220, flex: "1 1 260px" }}>
        <div style={{ fontSize: 12, fontWeight: 900, color: "#e9f3ef", textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 4 }}>Founding launch pricing</div>
        <div style={{ fontSize: 15, fontWeight: 900, color: "#f8fafc", marginBottom: 2 }}>{expired ? "Founding rates are still shown below" : "Early access rates are live now"}</div>
        <div style={{ fontSize: 12, color: "#b6c4bf" }}>{expired ? "PayPal checkout shows the final price before you pay." : "Your visit timer stays consistent. Checkout price is always final before payment."}</div>
      </div>
      <div style={{ fontVariantNumeric: "tabular-nums", fontSize: expired ? 17 : 26, fontWeight: 900, color: "#10201d", letterSpacing: expired ? 0 : 1, background: "linear-gradient(135deg,#f8fafc,#c8dcc8)", borderRadius: 14, padding: "10px 16px", minWidth: 96, textAlign: "center" }}>{expired ? "Check price" : mins + ":" + secs}</div>
    </div>
  );
}

function FAQSection() {
  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ color: "#c8dcc8", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 12, textAlign: "center" }}>Questions before you start</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12 }}>
        {FAQS.map(([question, answer]) => (
          <details key={question} style={{ ...S.card, padding: "16px 18px", borderRadius: 18, background: "rgba(23,34,38,.58)" }}>
            <summary style={{ cursor: "pointer", color: "#f8fafc", fontWeight: 900, fontSize: 14 }}>{question}</summary>
            <p style={{ color: "#b6c4bf", fontSize: 13, lineHeight: 1.6, margin: "10px 0 0" }}>{answer}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

function BrandMotionStyles() {
  return (
    <style>{`
      @keyframes nutriplanRise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
      @keyframes nutriplanGlow{0%,100%{box-shadow:0 18px 50px rgba(0,0,0,.28)}50%{box-shadow:0 20px 60px rgba(200,220,200,.16)}}
      .np-rise{animation:nutriplanRise .55s ease both}
      .np-glow{animation:nutriplanGlow 4s ease-in-out infinite}
      @media (max-width:640px){.np-hide-mobile{display:none!important}.np-mobile-tight{padding-left:16px!important;padding-right:16px!important}}
    `}</style>
  );
}

function EmailCapturePopup({ onStart }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    let t;
    try {
      if (!window.localStorage.getItem(EMAIL_CAPTURE_KEY)) {
        t = setTimeout(() => setOpen(true), 8500);
      }
    } catch {
      t = setTimeout(() => setOpen(true), 8500);
    }
    return () => clearTimeout(t);
  }, []);
  function close() {
    try { window.localStorage.setItem(EMAIL_CAPTURE_KEY, "1"); } catch { }
    setOpen(false);
  }
  function submit() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return;
    try { window.localStorage.setItem(EMAIL_CAPTURE_KEY, "1"); } catch { }
    setDone(true);
  }
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 900, background: "rgba(10,20,22,.72)", display: "grid", placeItems: "center", padding: 18 }} onClick={close}>
      <div className="np-rise" style={{ ...S.card, width: "min(430px,100%)", padding: 24, background: "linear-gradient(145deg,rgba(23,34,38,.96),rgba(58,78,74,.92))", border: "1px solid rgba(200,220,200,.32)" }} onClick={e => e.stopPropagation()}>
        <button aria-label="Close" onClick={close} style={{ float: "right", background: "none", border: 0, color: "#94a3b8", fontSize: 22, cursor: "pointer" }}>x</button>
        <div style={sectionLabel}>Founding offer</div>
        <h2 style={{ margin: "0 0 8px", fontSize: 28, letterSpacing: -1, lineHeight: 1.05 }}>Want the simple starter plan?</h2>
        <p style={{ color: "#cbd5e1", fontSize: 14, lineHeight: 1.65, margin: "0 0 16px" }}>
          Get the free preview first, then use the same email after PayPal checkout so paid access can unlock automatically.
        </p>
        {done ? (
          <div>
            <div style={{ borderRadius: 14, padding: 14, background: "rgba(200,220,200,.1)", border: "1px solid rgba(200,220,200,.28)", color: "#edf7ef", fontWeight: 900, marginBottom: 14 }}>Saved for this browser. Start with the free preview.</div>
            <button onClick={() => { close(); onStart(); }} style={{ ...S.btn, width: "100%" }}>Build my plan</button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <input style={S.inp} type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            <button onClick={submit} style={S.btn}>Send me the starter offer</button>
            <button onClick={close} style={{ ...S.sec, padding: "10px 14px" }}>Not now</button>
            <p style={{ color: "#64748b", fontSize: 11, lineHeight: 1.5, margin: 0 }}>This is a lightweight browser capture for launch testing. Payment and account access still happen through PayPal and Supabase.</p>
          </div>
        )}
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

function StickyHomeCTA({ onStart, onPreview }) {
  return (
    <div style={{ position: "fixed", left: 12, right: 12, bottom: 12, zIndex: 40, pointerEvents: "none" }}>
      <div style={{ width: "min(760px,100%)", margin: "0 auto", padding: "10px", borderRadius: 18, background: "rgba(5,10,18,.86)", border: "1px solid rgba(200,220,200,.22)", boxShadow: "0 18px 50px rgba(0,0,0,.36)", backdropFilter: "blur(16px)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, pointerEvents: "auto" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "#f8fafc", fontWeight: 900, fontSize: 13, lineHeight: 1.2 }}>Ready to build your plan?</div>
          <div style={{ color: "#b6c4bf", fontSize: 11, lineHeight: 1.35 }}>Real food. Simple structure. No extreme dieting.</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button onClick={onPreview} style={{ ...S.sec, padding: "10px 12px", borderRadius: 12, fontSize: 12 }}>Preview</button>
          <button onClick={onStart} style={{ ...S.btn, padding: "10px 14px", borderRadius: 12, fontSize: 12 }}>Start - $27</button>
        </div>
      </div>
    </div>
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
  { id: 1, title: "Creamy Scrambled Eggs on Sourdough", category: "Breakfast", cal: 510, protein: 32, carbs: 45, fat: 22, prepTime: "12 min", desc: "A calm morning breakfast with toasted sourdough, creamy eggs, avocado, and cherry tomatoes.", ingredients: ["2 eggs plus 2 egg whites", "1 slice sourdough toast", "1/4 avocado", "1/2 cup cherry tomatoes", "Salt, pepper, and chives", "Optional: 1 tsp butter"], steps: ["Toast sourdough until crisp around the edges.", "Scramble eggs and egg whites slowly over low heat so they stay creamy.", "Add avocado and cherry tomatoes beside the toast.", "Finish with salt, pepper, and chives."], note: "Use low heat for the eggs. This feels more premium than rushing them in a hot pan.", img: IMG.eggs },
  { id: 2, title: "Honey Cinnamon Overnight Oats", category: "Breakfast", cal: 520, protein: 33, carbs: 68, fat: 12, prepTime: "5 min + chill", desc: "A simple modern wellness breakfast that is ready when you wake up and still feels cozy.", ingredients: ["1/2 cup oats", "3/4 cup Greek yogurt", "1/2 cup milk", "1 tsp honey", "1 tbsp chia seeds", "Berries and cinnamon"], steps: ["Stir oats, yogurt, milk, honey, chia, and cinnamon in a jar.", "Refrigerate overnight or at least 3 hours.", "Top with berries in the morning.", "Add a splash of milk if you like it looser."], note: "This is perfect for busy mornings because the decision is already made.", img: IMG.oats },
  { id: 3, title: "Greek Yogurt Berry Bowl", category: "Breakfast", cal: 455, protein: 34, carbs: 54, fat: 12, prepTime: "5 min", desc: "Creamy, colorful, and social-media pretty without pretending breakfast has to be complicated.", ingredients: ["1 cup plain Greek yogurt", "1/2 banana, sliced", "1/2 cup berries", "1/4 cup granola", "1 tsp peanut butter, warmed", "Cinnamon and pinch of salt"], steps: ["Add Greek yogurt to a bowl and stir in cinnamon plus a tiny pinch of salt.", "Layer banana and berries over the top.", "Sprinkle granola right before eating so it stays crunchy.", "Warm peanut butter for a few seconds and drizzle it across the bowl."], note: "Measure the granola and peanut butter. They make the bowl satisfying, but they add up quickly.", img: IMG.yogurt },
  { id: 4, title: "Chicken Rice Bowl with Yogurt Garlic Sauce", category: "Lunch", cal: 715, protein: 58, carbs: 76, fat: 17, prepTime: "25 min", desc: "Meal-prep friendly, warm, and homemade with roasted vegetables and a creamy sauce that keeps it from feeling dry.", ingredients: ["6-7 oz cooked chicken breast", "1 cup cooked rice", "1 cup roasted peppers, zucchini, or broccoli", "2 tbsp plain Greek yogurt", "Lemon juice, garlic, salt, and pepper", "Optional: parsley or hot sauce"], steps: ["Season chicken with salt, pepper, garlic, and paprika, then cook until done.", "Roast or saute vegetables until lightly browned.", "Stir Greek yogurt with lemon juice, grated garlic, salt, and pepper.", "Build the bowl with rice, chicken, vegetables, and yogurt garlic sauce."], note: "This is a strong meal-prep base. Keep sauce separate until eating if you pack it for work.", img: IMG.chicken },
  { id: 5, title: "Turkey Burger with Caramelized Onions", category: "Lunch", cal: 640, protein: 48, carbs: 58, fat: 22, prepTime: "25 min", desc: "Healthy comfort food with oven fries, a toasted bun, and sweet onions instead of punishment energy.", ingredients: ["6 oz lean ground turkey", "1 burger bun", "1 small potato, cut into fries", "1/2 onion, sliced", "Pickles, lettuce, mustard", "1 tsp olive oil"], steps: ["Bake or air-fry potato wedges until crisp.", "Cook sliced onion slowly until soft and lightly browned.", "Season turkey, form a patty, and cook until done.", "Toast the bun and build with onions, pickles, lettuce, and mustard."], note: "Caramelized onions make lean turkey feel much more satisfying without needing a heavy sauce.", img: IMG.burger },
  { id: 6, title: "Salmon with Lemon Rice and Asparagus", category: "Lunch", cal: 670, protein: 45, carbs: 58, fat: 28, prepTime: "25 min", desc: "Clean, premium, and still comforting: salmon, lemon rice, and roasted asparagus for a reset meal that does not feel cold.", ingredients: ["5-6 oz salmon", "1 cup cooked rice", "1 cup asparagus", "Lemon juice and zest", "1 tsp olive oil", "Salt, pepper, and garlic"], steps: ["Season salmon with salt, pepper, garlic, and lemon.", "Roast asparagus with a little olive oil until tender.", "Cook or reheat rice, then add lemon juice and zest.", "Serve salmon over lemon rice with asparagus on the side."], note: "Salmon is higher in fat, but it is satisfying and nutrient-dense. Balance it with simple carbs and vegetables.", img: IMG.salmon },
  { id: 7, title: "Garlic Butter Steak with Crispy Potatoes", category: "Dinner", cal: 760, protein: 52, carbs: 60, fat: 34, prepTime: "25 min", desc: "A satisfying steak dinner with crispy potatoes and a fresh cucumber side, built to feel premium but realistic.", ingredients: ["6 oz lean steak", "1 medium potato, diced", "1 tsp butter", "Garlic, salt, pepper, and parsley", "1 cup cucumber salad with vinegar or lemon", "Optional: 1 tsp olive oil for potatoes"], steps: ["Season diced potatoes and bake or air-fry until crisp.", "Season steak well and sear in a hot pan to your preferred doneness.", "Turn heat low, add butter and garlic, then spoon it over the steak briefly.", "Serve with crispy potatoes and a bright cucumber salad."], note: "Keep the butter measured. You still get the flavor without turning a solid meal into a calorie bomb.", img: IMG.steak },
  { id: 8, title: "High-Protein Pasta with Tomato Parmesan Sauce", category: "Dinner", cal: 735, protein: 55, carbs: 84, fat: 18, prepTime: "30 min", desc: "A cozy pasta bowl with slow-simmered tomato flavor, lean protein, and parmesan. Healthy without feeling like diet food.", ingredients: ["5 oz lean ground turkey or chicken", "2 cups cooked pasta", "1/2 cup marinara or crushed tomato sauce", "1 tbsp parmesan", "Garlic, basil, pepper, and chili flakes", "Optional: spinach or zucchini"], steps: ["Brown turkey or chicken with garlic, pepper, and chili flakes.", "Add marinara and simmer for 8-10 minutes so it tastes cooked, not poured from a jar.", "Cook pasta and save a splash of pasta water.", "Toss pasta with sauce, add parmesan, and fold in spinach or zucchini if using."], note: "For lower calories, use 1.5 cups pasta and add more vegetables. For muscle gain, keep the full pasta portion.", img: IMG.pasta },
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
        <div style={{ position: "absolute", inset: 0, zIndex: 5, background: "rgba(10,20,22,.9)", backdropFilter: "blur(10px)", display: "grid", placeItems: "center", padding: 20, textAlign: "center" }}>
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
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(10,20,22,.95),rgba(10,20,22,.1))" }} />
        <div style={{ position: "absolute", left: 14, bottom: 14 }}>
          <Pill color="#c8dcc8">{recipe.category}</Pill>
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
              <div style={{ color: "#c8dcc8", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 6 }}>Ingredients</div>
              {recipe.ingredients.map((ing, i) => (
                <div key={i} style={{ color: "#cbd5e1", fontSize: 13, padding: "5px 0", borderTop: "1px solid rgba(148,163,184,.08)", display: "flex", gap: 8 }}>
                  <span style={{ color: "#475569" }}>-</span>{ing}
                </div>
              ))}
            </div>
            <div>
              <div style={{ color: "#c8dcc8", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 6 }}>Instructions</div>
              {recipe.steps.map((step, i) => (
                <div key={i} style={{ color: "#cbd5e1", fontSize: 13, padding: "6px 0", borderTop: "1px solid rgba(148,163,184,.08)", display: "flex", gap: 10 }}>
                  <span style={{ color: "#c8dcc8", fontWeight: 900, flexShrink: 0, minWidth: 18 }}>{i + 1}.</span>{step}
                </div>
              ))}
            </div>
            {recipe.note && (
              <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 12, background: "rgba(200,220,200,.08)", border: "1px solid rgba(200,220,200,.18)", color: "#e9f3ef", fontSize: 13, lineHeight: 1.55 }}>
                <strong style={{ color: "#c8dcc8" }}>Practical note:</strong> {recipe.note}
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
        <div style={{ position: "absolute", inset: 0, zIndex: 5, background: "rgba(10,20,22,.88)", backdropFilter: "blur(10px)", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
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
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(10,20,22,.95),rgba(10,20,22,.1))" }} />
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
            <strong style={{ color: "#c8dcc8", whiteSpace: "nowrap" }}>{item.cal} cal</strong>
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
      <div style={{ color: "#c8dcc8", fontSize: 12, fontWeight: 800 }}>{w.day}</div>
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
    <div style={{ ...S.card, padding: 20, background: "linear-gradient(135deg,rgba(200,220,200,.08),rgba(23,34,38,.8))", marginTop: 20 }}>
      <Pill color="#c8dcc8">Your coach says</Pill>
      <h3 style={{ margin: "10px 0 8px" }}>Built for real people</h3>
      <p style={{ color: "#e9f3ef", lineHeight: 1.7, margin: "0 0 8px" }}>{COACH_COPY[tier]}</p>
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
      if (!isLogin && !result.data.session) {
        setError("Account created. Check your email to confirm it, then sign in to refresh your access.");
        setLoading(false);
        return;
      }
      trackTikTok(isLogin ? "Login" : "CompleteRegistration", { method: "email" });
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
            <p style={{ margin: "5px 0 0", color: "#b6c4bf", fontSize: 13, lineHeight: 1.45 }}>{isLogin ? "Refresh your paid access and saved plan." : "Use the same email you used at PayPal checkout so your payment can unlock automatically."}</p>
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

  useEffect(() => {
    if (!TIKTOK_PIXEL_ID || window.ttq) return;
    !function (w, d, t) {
      w.TiktokAnalyticsObject = t;
      const ttq = w[t] = w[t] || [];
      ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"];
      ttq.setAndDefer = function (obj, method) { obj[method] = function () { obj.push([method].concat(Array.prototype.slice.call(arguments, 0))); }; };
      for (let i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
      ttq.instance = function (name) {
        const instance = ttq._i[name] || [];
        for (let i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(instance, ttq.methods[i]);
        return instance;
      };
      ttq.load = function (id) {
        const script = d.createElement("script");
        script.async = true;
        script.src = "https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=" + id + "&lib=" + t;
        const first = d.getElementsByTagName("script")[0];
        first.parentNode.insertBefore(script, first);
      };
      ttq._i = {};
      ttq.load(TIKTOK_PIXEL_ID);
      ttq.page();
    }(window, document, "ttq");
  }, []);

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
    else {
      trackTikTok("InitiateCheckout", { content_name: tier, value: tier === "basic" ? 12 : tier === "elite" ? 49 : 27, currency: "USD" });
      setScreen("unlock");
    }
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
      else { setSaveMsg("Plan saved to your account. Email delivery is not enabled yet."); }
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
      <BrandMotionStyles />
      <div style={{ ...S.wrap, padding: "28px 0 112px" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 10, position: "sticky", top: 0, zIndex: 20, padding: "10px 0", backdropFilter: "blur(14px)" }}>
          <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>NutriPlan</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Pill>Real food. Realistic progress.</Pill>
            {user ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ color: "#b6c4bf", fontSize: 12 }}>{userEmail}</span>
                {isPaid(accessTier) && <Pill color="#edf7ef">{accessTier.charAt(0).toUpperCase() + accessTier.slice(1)} active</Pill>}
                <button onClick={() => refreshPaymentAccess(user, { showMessage: true })} style={{ ...S.sec, padding: "8px 14px", borderRadius: 999, fontSize: 13, opacity: checkingAccess ? 0.7 : 1 }} disabled={checkingAccess}>{checkingAccess ? "Checking..." : "Refresh access"}</button>
                <button onClick={handleSignOut} style={{ ...S.sec, padding: "8px 14px", borderRadius: 999, fontSize: 13 }}>Sign out</button>
              </div>
            ) : (
              <button onClick={() => setAuthModal("signup")} style={S.authBtn}>Sign up / log in</button>
            )}
          </div>
        </header>
        {accessMsg && <div style={{ borderRadius: 12, padding: "10px 14px", background: accessMsg.includes("active") ? "rgba(200,220,200,.12)" : "rgba(125,167,174,.1)", border: "1px solid " + (accessMsg.includes("active") ? "rgba(200,220,200,.32)" : "rgba(125,167,174,.25)"), marginBottom: 14, fontSize: 13, color: accessMsg.includes("active") ? "#edf7ef" : "#e9f3ef" }}>{accessMsg}</div>}
        {user && isPaid(accessTier) && (
          <div style={{ borderRadius: 16, padding: "14px 16px", background: "rgba(200,220,200,.1)", border: "1px solid rgba(200,220,200,.28)", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ color: "#edf7ef", fontWeight: 900, fontSize: 14 }}>Your {accessTier.charAt(0).toUpperCase() + accessTier.slice(1)} access is ready.</div>
              <div style={{ color: "#b6c4bf", fontSize: 12, lineHeight: 1.5 }}>Build or update your plan anytime from this account.</div>
            </div>
            <button onClick={() => setScreen("onboarding")} style={{ ...S.btn, padding: "10px 16px", fontSize: 13 }}>Build my plan</button>
          </div>
        )}
        <LaunchBanner />
        <section style={{ textAlign: "center", marginBottom: 40, paddingTop: 12 }}>
          <h1 style={{ fontSize: "clamp(34px,8vw,80px)", lineHeight: 0.93, letterSpacing: -3, margin: "0 auto 20px", maxWidth: 860 }}>
            Eat better. Look better. Stay consistent.
          </h1>
          <p style={{ color: "#94a3b8", fontSize: 18, lineHeight: 1.65, maxWidth: 600, margin: "0 auto 30px" }}>
            Real nutrition for real life: high-protein meal plans, flexible structure, and sustainable fat-loss habits for people who want healthy living without punishment.
          </p>
          <button onClick={() => choosePlan("pro")} style={{ ...S.btn, padding: "16px 36px", fontSize: 17 }}>Build My Plan - $27</button>
          <div style={{ marginTop: 10, color: "#64748b", fontSize: 12 }}>One-time founding checkout. Or try the free preview below.</div>
        </section>

        {/* TikTok visitor bridge */}
        <div className="np-rise" style={{ ...S.card, padding: "18px 20px", marginBottom: 34, background: "linear-gradient(135deg,rgba(200,220,200,.1),rgba(58,78,74,.56))", border: "1px solid rgba(200,220,200,.24)", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 18, alignItems: "center" }}>
          <div>
            <div style={sectionLabel}>From link in bio to real life</div>
            <h2 style={{ margin: "0 0 8px", fontSize: "clamp(22px,4vw,32px)", letterSpacing: -1, lineHeight: 1.08 }}>If TikTok brought you here, this is the simple version.</h2>
            <p style={{ color: "#e9f3ef", fontSize: 15, lineHeight: 1.7, margin: 0 }}>
              NutriPlan is for people who want fast clarity without extreme dieting: real food meal plans, realistic progress, simple structure, and meals that fit busy American life.
            </p>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {["No punishment diet", "Real meals, not macro chaos", "Build your plan in minutes"].map(item => (
              <div key={item} style={{ borderRadius: 999, padding: "10px 12px", background: "rgba(10,20,22,.35)", border: "1px solid rgba(148,163,184,.12)", color: "#f8fafc", fontSize: 13, fontWeight: 900 }}>{item}</div>
            ))}
          </div>
        </div>

        {/* Trust strip */}
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px 24px", marginBottom: 40 }}>
          {["No extreme diets", "Real food meals", "Built for busy people", "Results vary", "Not medical advice"].map(t => (
            <span key={t} style={{ color: "#64748b", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "#c8dcc8" }}>✓</span>{t}
            </span>
          ))}
        </div>

        {/* Problem / mission */}
        <div style={{ ...S.card, padding: "26px", marginBottom: 36, background: "linear-gradient(135deg,rgba(200,220,200,.09),rgba(23,34,38,.72))" }}>
          <div style={{ color: "#c8dcc8", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Why NutriPlan was built</div>
          <h2 style={{ margin: "0 0 10px", fontSize: "clamp(24px,4vw,36px)", letterSpacing: -1, lineHeight: 1.08 }}>You are not lazy. Your plan is probably broken.</h2>
          <p style={{ color: "#e9f3ef", fontSize: 16, lineHeight: 1.7, margin: "0 0 16px", maxWidth: 820 }}>
            NutriPlan was built for people who are tired of extreme diets, confusing advice, and plans that look perfect on paper but collapse in real life. Most people do not fail because they are weak. They fail because their plan does not match their work, cravings, stress, weekends, family meals, and real schedule.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginBottom: 18 }}>
            {HOME_PROBLEM_POINTS.map(item => (
              <div key={item} style={{ border: "1px solid rgba(148,163,184,.12)", borderRadius: 14, padding: "12px 14px", background: "rgba(10,20,22,.35)", color: "#cbd5e1", fontSize: 13, lineHeight: 1.45, fontWeight: 800 }}>
                {item}
              </div>
            ))}
          </div>
          <div style={{ padding: "16px 18px", borderRadius: 16, background: "rgba(248,250,252,.06)", border: "1px solid rgba(200,220,200,.18)" }}>
            <div style={{ color: "#f8fafc", fontSize: 18, fontWeight: 900, marginBottom: 6 }}>Our mission is simple.</div>
            <p style={{ color: "#b6c4bf", fontSize: 14, lineHeight: 1.7, margin: 0 }}>
              To help people eat better, feel better, build muscle, lose fat, and live healthier without turning food into a prison. Real food. Real life. Real progress.
            </p>
          </div>
        </div>

        {/* Who this is for */}
        <div style={{ ...S.card, padding: "22px 26px", marginBottom: 36, background: "rgba(23,34,38,.6)" }}>
          <div style={{ color: "#c8dcc8", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Who this is for</div>
          <p style={{ color: "#f8fafc", fontSize: 17, fontWeight: 700, margin: "0 0 14px" }}>This is not about being perfect. This is about becoming consistent.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "8px 24px" }}>
            {HOME_AUDIENCE.map(item => (
              <div key={item} style={{ color: "#cbd5e1", fontSize: 14, display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ color: "#c8dcc8", flexShrink: 0, marginTop: 1 }}>-&gt;</span>{item}
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ color: "#c8dcc8", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 12, textAlign: "center" }}>How it works</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
            {HOW_IT_WORKS.map(([title, body], i) => (
              <div key={title} style={{ ...S.card, padding: 18, borderRadius: 18, background: "rgba(23,34,38,.58)" }}>
                <Pill color="#c8dcc8">Step {i + 1}</Pill>
                <h3 style={{ margin: "0 0 8px", fontSize: 17 }}>{title}</h3>
                <p style={{ margin: 0, color: "#b6c4bf", fontSize: 14, lineHeight: 1.6 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Real food */}
        <div style={{ ...S.card, padding: "26px", marginBottom: 36, background: "rgba(23,34,38,.6)" }}>
          <div style={{ color: "#c8dcc8", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Recipes and real food</div>
          <h2 style={{ margin: "0 0 10px", fontSize: "clamp(24px,4vw,34px)", letterSpacing: -1, lineHeight: 1.08 }}>Healthy food should taste like something you actually want to eat.</h2>
          <p style={{ color: "#e9f3ef", fontSize: 16, lineHeight: 1.7, margin: "0 0 16px", maxWidth: 820 }}>
            Inside NutriPlan, meals are built from real ingredients: high-protein breakfasts, filling lunches, balanced dinners, smart snacks, and food that can fit busy days. No boring diet food. No fake perfection. Just better meals that help you move toward your goal.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}>
            {REAL_FOOD_EXAMPLES.map(item => (
              <div key={item} style={{ border: "1px solid rgba(148,163,184,.12)", borderRadius: 14, padding: "12px 14px", background: "rgba(10,20,22,.35)", color: "#cbd5e1", fontSize: 13, lineHeight: 1.45, fontWeight: 800 }}>
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Recipe preview */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ ...sectionLabel, textAlign: "center" }}>Meal previews</div>
          <h2 style={{ margin: "0 auto 16px", textAlign: "center", maxWidth: 760, fontSize: "clamp(24px,4vw,34px)", letterSpacing: -1, lineHeight: 1.08 }}>The food should feel familiar before it feels optimized.</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 14 }}>
            {RECIPE_PREVIEWS.map(([title, body, note]) => (
              <div key={title} style={{ ...S.card, padding: 18, borderRadius: 18, background: "linear-gradient(180deg,rgba(248,250,252,.06),rgba(23,34,38,.68))" }}>
                <h3 style={{ margin: "0 0 8px", fontSize: 17 }}>{title}</h3>
                <p style={{ color: "#e9f3ef", fontSize: 13, lineHeight: 1.6, margin: "0 0 12px" }}>{body}</p>
                <div style={{ borderTop: "1px solid rgba(148,163,184,.12)", paddingTop: 10, color: "#b6c4bf", fontSize: 12, lineHeight: 1.55 }}>{note}</div>
              </div>
            ))}
          </div>
        </div>

        {/* What you get */}
        <div style={{ ...S.card, padding: "26px", marginBottom: 36, background: "linear-gradient(135deg,rgba(58,78,74,.48),rgba(23,34,38,.72))" }}>
          <div style={sectionLabel}>What you actually get</div>
          <h2 style={{ margin: "0 0 10px", fontSize: "clamp(24px,4vw,34px)", letterSpacing: -1, lineHeight: 1.08 }}>A clear food system, not just a calorie number.</h2>
          <p style={{ color: "#b6c4bf", fontSize: 14, lineHeight: 1.7, margin: "0 0 18px", maxWidth: 820 }}>
            The best nutrition products reduce decision fatigue. NutriPlan gives you structure before the week gets busy, while keeping the food normal enough to repeat.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 12 }}>
            {VALUE_STACK.map(([title, body]) => (
              <div key={title} style={{ border: "1px solid rgba(148,163,184,.12)", borderRadius: 16, padding: 16, background: "rgba(10,20,22,.32)" }}>
                <strong style={{ color: "#f8fafc", fontSize: 14 }}>{title}</strong>
                <p style={{ color: "#b6c4bf", fontSize: 13, lineHeight: 1.6, margin: "7px 0 0" }}>{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Philosophy */}
        <div style={{ ...S.card, padding: "26px", marginBottom: 36, background: "linear-gradient(135deg,rgba(125,167,174,.08),rgba(23,34,38,.7))" }}>
          <div style={{ color: "#c8dcc8", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>The NutriPlan philosophy</div>
          <h2 style={{ margin: "0 0 10px", fontSize: "clamp(24px,4vw,34px)", letterSpacing: -1, lineHeight: 1.08 }}>The best plan is not the hardest plan.</h2>
          <p style={{ color: "#e9f3ef", fontSize: 16, lineHeight: 1.7, margin: "0 0 16px", maxWidth: 820 }}>
            The best plan is the one you can actually follow: real meals, flexible choices, simple structure, enough protein, smart carbs, better habits, and food that still feels enjoyable.
          </p>
          <p style={{ color: "#b6c4bf", fontSize: 14, lineHeight: 1.7, margin: 0, maxWidth: 820 }}>
            Health should not feel like punishment. Your plan should support your life, not take it over.
          </p>
        </div>

        {/* About / story */}
        <div className="np-rise" style={{ ...S.card, padding: "28px", marginBottom: 36, background: "linear-gradient(135deg,rgba(248,250,252,.07),rgba(23,34,38,.68))" }}>
          <div style={sectionLabel}>About us</div>
          <h2 style={{ margin: "0 0 12px", fontSize: "clamp(25px,4vw,36px)", letterSpacing: -1.2, lineHeight: 1.08 }}>Built for people who are tired of starting over.</h2>
          <p style={{ color: "#e9f3ef", fontSize: 16, lineHeight: 1.75, margin: "0 0 14px", maxWidth: 850 }}>
            NutriPlan exists because modern diet culture makes healthy living feel harder than it needs to be. People are told to cut everything out, track every bite perfectly, and act like normal life never happens.
          </p>
          <p style={{ color: "#b6c4bf", fontSize: 14, lineHeight: 1.75, margin: 0, maxWidth: 850 }}>
            We believe better nutrition should feel calm, practical, and human. Real meals. Better portions. Enough protein. Simple structure. A plan that helps you feel lighter, stronger, and more in control without turning food into a punishment.
          </p>
          <div style={{ marginTop: 18, padding: "16px 18px", borderRadius: 16, background: "rgba(200,220,200,.08)", border: "1px solid rgba(200,220,200,.18)" }}>
            <strong style={{ color: "#f8fafc", fontSize: 15 }}>This is not about hating your body.</strong>
            <p style={{ color: "#b6c4bf", fontSize: 13, lineHeight: 1.65, margin: "6px 0 0" }}>
              It is about taking care of yourself with food that feels normal, habits that fit real life, and structure that helps you stop restarting every Monday.
            </p>
          </div>
        </div>

        {/* Written testimonials */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ ...sectionLabel, textAlign: "center" }}>Early feedback we are looking for</div>
          <p style={{ color: "#b6c4bf", fontSize: 13, lineHeight: 1.6, textAlign: "center", maxWidth: 680, margin: "0 auto 16px" }}>
            These are not published customer reviews. They describe the experience NutriPlan is intentionally built to create.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 14 }}>
            {TESTIMONIALS.map((quote) => (
              <div key={quote} className="np-rise" style={{ ...S.card, padding: 20, borderRadius: 18, background: "rgba(23,34,38,.58)" }}>
                <div style={{ color: "#f8fafc", fontSize: 34, lineHeight: 1, marginBottom: 8 }}>"</div>
                <p style={{ color: "#e9f3ef", fontSize: 14, lineHeight: 1.7, margin: "0 0 14px" }}>{quote}</p>
                <div style={{ color: "#64748b", fontSize: 11, marginTop: 4 }}>Positioning quote, not a verified review.</div>
              </div>
            ))}
          </div>
        </div>

        {/* Transformation framing */}
        <div style={{ ...S.card, padding: "26px", marginBottom: 36, background: "linear-gradient(135deg,rgba(200,220,200,.08),rgba(58,78,74,.34))" }}>
          <div style={sectionLabel}>Before / after, without fake promises</div>
          <h2 style={{ margin: "0 0 10px", fontSize: "clamp(24px,4vw,34px)", letterSpacing: -1, lineHeight: 1.08 }}>The real transformation is feeling organized around food.</h2>
          <p style={{ color: "#b6c4bf", fontSize: 14, lineHeight: 1.7, margin: "0 0 18px", maxWidth: 820 }}>
            NutriPlan does not promise dramatic body changes or use fake photos. The goal is a calmer, more consistent relationship with food that can support fat loss, muscle, and better daily energy over time.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}>
            {TRANSFORMATIONS.map(([title, body], i) => (
              <div key={title} style={{ border: "1px solid rgba(148,163,184,.12)", borderRadius: 16, padding: 16, background: i === 2 ? "rgba(200,220,200,.1)" : "rgba(10,20,22,.35)" }}>
                <Pill color={i === 2 ? "#edf7ef" : "#c8dcc8"}>{title}</Pill>
                <p style={{ color: i === 2 ? "#edf7ef" : "#cbd5e1", fontSize: 14, lineHeight: 1.6, margin: "12px 0 0", fontWeight: 700 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Micro trust */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ color: "#c8dcc8", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 12, textAlign: "center" }}>Small reasons this feels different</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
            {MICRO_TRUST.map(([title, body]) => (
              <div key={title} style={{ ...S.card, padding: 18, borderRadius: 18, background: "rgba(23,34,38,.56)" }}>
                <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>{title}</h3>
                <p style={{ margin: 0, color: "#b6c4bf", fontSize: 13, lineHeight: 1.6 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Retention psychology */}
        <div style={{ ...S.card, padding: "24px 26px", marginBottom: 36, background: "linear-gradient(135deg,rgba(200,220,200,.08),rgba(23,34,38,.68))" }}>
          <div style={{ color: "#c8dcc8", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Built for the day after you buy</div>
          <h2 style={{ margin: "0 0 10px", fontSize: "clamp(23px,4vw,32px)", letterSpacing: -1, lineHeight: 1.1 }}>Progress is easier when the next step is small.</h2>
          <p style={{ color: "#e9f3ef", fontSize: 15, lineHeight: 1.7, margin: "0 0 16px", maxWidth: 800 }}>
            NutriPlan is designed to feel supportive after checkout too: simple habits, weekly check-ins, realistic meals, and reminders that one imperfect meal does not ruin the week.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12 }}>
            {DAILY_SUPPORT.map(([title, body]) => (
              <div key={title} style={{ border: "1px solid rgba(148,163,184,.12)", borderRadius: 14, padding: "12px 14px", background: "rgba(10,20,22,.35)" }}>
                <strong style={{ color: "#f8fafc", fontSize: 14 }}>{title}</strong>
                <p style={{ color: "#b6c4bf", fontSize: 13, lineHeight: 1.55, margin: "6px 0 0" }}>{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 14 }}>
          {PLANS.map(p => (
            <div key={p.id} style={{ ...S.card, padding: 20, position: "relative", border: p.recommended ? "1px solid rgba(200,220,200,.5)" : p.premium ? "1px solid rgba(147,197,253,.45)" : S.card.border, background: p.recommended ? "linear-gradient(180deg,rgba(200,220,200,.11),rgba(23,34,38,.8))" : p.premium ? "linear-gradient(180deg,rgba(147,197,253,.1),rgba(23,34,38,.8))" : S.card.background }}>
              {p.recommended && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: "#c8dcc8", color: "#10201d", fontSize: 11, fontWeight: 900, padding: "4px 14px", borderRadius: 999, whiteSpace: "nowrap" }}>MOST POPULAR</div>}
              <Pill>{p.badge}</Pill>
              <h2 style={{ margin: "10px 0 2px", fontSize: 24 }}>{p.name}</h2>
              <div style={{ fontSize: 34, fontWeight: 900, marginBottom: 4 }}>{p.price}</div>
              {p.id !== "free" && <div style={{ color: p.recommended ? "#edf7ef" : "#b6c4bf", fontSize: 12, fontWeight: 800, marginBottom: 8 }}>{p.recommended ? "Best starting point" : "One-time digital access"}</div>}
              <p style={{ color: "#94a3b8", minHeight: 48, fontSize: 14, margin: "0 0 14px", lineHeight: 1.55 }}>{p.desc}</p>
              {p.features.map(f => <div key={f} style={{ color: "#cbd5e1", fontSize: 13, marginBottom: 8, display: "flex", gap: 8, alignItems: "flex-start" }}><span style={{ color: "#c8dcc8", flexShrink: 0 }}>✓</span>{f}</div>)}
              <button onClick={() => choosePlan(p.id)} style={{ ...(p.id === "free" ? S.sec : S.btn), width: "100%", marginTop: 16 }}>
                {p.id === "free" ? "Try free preview" : p.recommended ? "Build my Pro plan - " + p.price : "Choose " + p.name + " - " + p.price}
              </button>
            </div>
          ))}
        </div>
        <div style={{ ...S.card, padding: "22px 26px", marginTop: 24, background: "rgba(23,34,38,.58)" }}>
          <div style={{ color: "#c8dcc8", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Good to know</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
            {[
              ["No extreme dieting", "NutriPlan uses moderate calorie targets and normal meals. It is built for consistency, not punishment."],
              ["Estimates, not medical advice", "Calories and macros are practical estimates. Individual needs vary by body, history, training, and health."],
              ["Real-life flexibility", "Use the plan as a starting point, swap meals when needed, and adjust based on hunger, energy, and progress."],
            ].map(([title, body]) => (
              <div key={title}>
                <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>{title}</h3>
                <p style={{ margin: 0, color: "#b6c4bf", fontSize: 13, lineHeight: 1.6 }}>{body}</p>
              </div>
            ))}
          </div>
        </div>
        <FAQSection />
        <div style={{ textAlign: "center", marginTop: 36, padding: "30px 20px", borderRadius: 24, background: "linear-gradient(135deg,rgba(200,220,200,.12),rgba(125,167,174,.09))", border: "1px solid rgba(200,220,200,.22)" }}>
          <div style={{ color: "#c8dcc8", fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 10 }}>Ready to stop guessing?</div>
          <h2 style={{ margin: "0 auto 12px", maxWidth: 720, fontSize: "clamp(26px,5vw,44px)", letterSpacing: -1.5, lineHeight: 1.05 }}>Build a plan that fits your real life.</h2>
          <p style={{ color: "#b6c4bf", fontSize: 16, lineHeight: 1.65, margin: "0 auto 22px", maxWidth: 620 }}>
            Start with real food, clear structure, and a nutrition system designed for consistency instead of punishment.
          </p>
          <button onClick={() => choosePlan("pro")} style={{ ...S.btn, padding: "15px 30px", fontSize: 16 }}>Build my plan today</button>
          <div style={{ marginTop: 10, color: "#64748b", fontSize: 12 }}>Go to: https://nutriplan-taupe.vercel.app</div>
        </div>
        <LegalFooter onOpen={setLegalModal} />
      </div>
      {!authModal && !legalModal && !(user && isPaid(accessTier)) && <StickyHomeCTA onStart={() => choosePlan("pro")} onPreview={() => choosePlan("free")} />}
      <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />
      {!authModal && !legalModal && <EmailCapturePopup onStart={() => choosePlan("pro")} />}
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
          <div style={{ background: "rgba(10,20,22,.5)", borderRadius: 14, padding: "14px 16px", marginBottom: 22 }}>
            {selPlan.features.map(f => <div key={f} style={{ color: "#cbd5e1", fontSize: 14, marginBottom: 8, display: "flex", gap: 8 }}><span style={{ color: "#c8dcc8" }}>✓</span>{f}</div>)}
          </div>
          <a href={PAYPAL[selectedTier] || "#"} target="_blank" rel="noreferrer noopener" style={{ ...S.btn, display: "block", textAlign: "center", textDecoration: "none", fontSize: 16, padding: "16px", marginBottom: 8 }}>
            Secure Checkout - {selPlan.price}
          </a>
          <p style={{ color: "#475569", fontSize: 12, textAlign: "center", margin: "0 0 10px", lineHeight: 1.5 }}>Secure payment. Card, Apple Pay, and other options may be available at checkout.</p>
          <p style={{ color: "#475569", fontSize: 11, textAlign: "center", margin: "0 0 22px", lineHeight: 1.55, padding: "10px 14px", background: "rgba(10,20,22,.4)", borderRadius: 10, border: "1px solid rgba(148,163,184,.08)" }}>
            Your payment is processed securely by a trusted third-party checkout provider. NutriPlan does not store your payment details.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginBottom: 22 }}>
            {[
              ["1", "Pay securely with PayPal"],
              ["2", "Sign in with the same email"],
              ["3", "Refresh access and build your plan"],
            ].map(([num, text]) => (
              <div key={num} style={{ border: "1px solid rgba(148,163,184,.12)", borderRadius: 14, padding: 12, background: "rgba(23,34,38,.5)" }}>
                <div style={{ width: 26, height: 26, borderRadius: 999, display: "grid", placeItems: "center", background: "rgba(200,220,200,.16)", color: "#edf7ef", fontWeight: 900, marginBottom: 8 }}>{num}</div>
                <div style={{ color: "#cbd5e1", fontSize: 12, lineHeight: 1.45, fontWeight: 800 }}>{text}</div>
              </div>
            ))}
          </div>
          <div style={{ height: 1, background: "rgba(148,163,184,.1)", marginBottom: 22 }} />
          <div style={{ borderRadius: 14, padding: "14px 16px", background: "rgba(125,167,174,.08)", border: "1px solid rgba(125,167,174,.18)", marginBottom: 16 }}>
            <div style={{ color: "#e9f3ef", fontSize: 13, fontWeight: 900, marginBottom: 5 }}>After checkout, sign in and refresh access.</div>
            <div style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.55 }}>Use the same email you used at PayPal checkout. PayPal updates your Supabase profile through the webhook, then Refresh access unlocks your paid plan automatically.</div>
          </div>
          {user ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ color: "#b6c4bf", fontSize: 12 }}>Signed in as {userEmail}</div>
              <button onClick={() => refreshPaymentAccess(user, { showMessage: true })} style={{ ...S.btn, width: "100%", opacity: checkingAccess ? 0.7 : 1 }} disabled={checkingAccess}>
                {checkingAccess ? "Checking payment..." : "Check payment / refresh access"}
              </button>
              {accessMsg && <p style={{ color: accessMsg.includes("active") ? "#edf7ef" : "#e9f3ef", fontSize: 13, margin: 0, lineHeight: 1.5 }}>{accessMsg}</p>}
              {isPaid(accessTier) && <button onClick={() => setScreen("onboarding")} style={{ ...S.sec, width: "100%", borderColor: "rgba(200,220,200,.35)", color: "#f8fafc" }}>Continue with {accessTier.charAt(0).toUpperCase() + accessTier.slice(1)}</button>}
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
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: 16, background: "rgba(10,20,22,.5)", borderRadius: 12, border: termsError ? "1px solid #f87171" : "1px solid rgba(148,163,184,.12)" }}>
            <input type="checkbox" id="terms-agree" checked={agreedToTerms} onChange={e => { setAgreed(e.target.checked); setTermsError(false); }} style={{ marginTop: 3, accentColor: "#c8dcc8", width: 18, height: 18, flexShrink: 0, cursor: "pointer" }} />
            <label htmlFor="terms-agree" style={{ color: "#94a3b8", fontSize: 13, lineHeight: 1.6, cursor: "pointer" }}>
              I understand that NutriPlan is not medical advice. Results vary and there is no guarantee of weight loss. I am responsible for my own health decisions and will consult a healthcare professional before making significant changes to my diet or exercise routine. I agree to the{" "}
              <span style={{ color: "#c8dcc8", textDecoration: "underline", cursor: "pointer" }} onClick={() => setLegalModal("terms")}>Terms of Service</span>{" "}and{" "}
              <span style={{ color: "#c8dcc8", textDecoration: "underline", cursor: "pointer" }} onClick={() => setLegalModal("privacy")}>Privacy Policy</span>.
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
                  <button onClick={savePlanToSupabase} style={{ ...S.btn, padding: "8px 16px", fontSize: 13, opacity: savingPlan ? 0.7 : 1 }} disabled={savingPlan} title="Save this plan to your NutriPlan account. Email delivery is not enabled yet.">
                    {savingPlan ? "Saving..." : "Save to account"}
                  </button>
                </>
              ) : (
                <button onClick={() => setAuthModal("signup")} style={{ ...S.sec, padding: "8px 16px", fontSize: 13 }}>Save to account</button>
              )}
            </div>
          </div>
          {saveMsg && <div style={{ borderRadius: 12, padding: "10px 16px", background: saveMsg.includes("saved") ? "rgba(200,220,200,.1)" : "rgba(248,113,113,.1)", border: "1px solid " + (saveMsg.includes("saved") ? "rgba(200,220,200,.3)" : "rgba(248,113,113,.3)"), marginBottom: 14, fontSize: 13, color: saveMsg.includes("saved") ? "#edf7ef" : "#fca5a5" }}>{saveMsg}</div>}
          {!isPaid(plan.tier) && <LaunchBanner />}
          {user && isPaid(plan.tier) && (
            <div style={{ borderRadius: 14, padding: "12px 16px", background: "rgba(200,220,200,.08)", border: "1px solid rgba(200,220,200,.22)", marginBottom: 16, color: "#edf7ef", fontSize: 13, lineHeight: 1.55 }}>
              Your paid access is active, so checkout offers are hidden here. Use this page to build, edit, and save your plan.
            </div>
          )}
          <div style={{ marginTop: 16, marginBottom: 18 }}>
            <Pill color="#c8dcc8">{plan.tier.charAt(0).toUpperCase() + plan.tier.slice(1)} plan</Pill>
            <h1 style={{ fontSize: "clamp(30px,6vw,48px)", letterSpacing: -2, margin: "14px 0 6px", lineHeight: 1.05 }}>Your plan for real life.</h1>
            <p style={{ color: "#94a3b8", margin: 0 }}>Consistency over perfection. Normal food, smarter portions.</p>
          </div>
          {planReady && (
            <div style={{ borderRadius: 14, padding: "14px 18px", background: "rgba(200,220,200,.08)", border: "1px solid rgba(200,220,200,.25)", marginBottom: 16, fontSize: 14, color: "#edf7ef", display: "flex", alignItems: "center", gap: 10 }}>
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
          <p style={{ color: "#475569", fontSize: 11, lineHeight: 1.55, margin: "0 0 20px", padding: "10px 14px", background: "rgba(23,34,38,.5)", borderRadius: 10, border: "1px solid rgba(148,163,184,.08)" }}>
            Calories and macros are estimates for educational purposes only. Individual needs vary. Consult a qualified professional before making major diet or fitness changes.
          </p>
          <div style={{ ...S.card, padding: 18, marginBottom: 20, background: "rgba(23,34,38,.58)" }}>
            <Pill color="#c8dcc8">How to use this</Pill>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 12, marginTop: 12 }}>
              {[
                ["Start with the plan", "Follow the meals closely for a few days so you have a clear baseline."],
                ["Adjust like a human", "If hunger, energy, or training feels off, adjust portions instead of forcing perfection."],
                ["Track the trend", "Use weekly progress, not one scale day, to decide whether calories need changing."],
              ].map(([title, body]) => (
                <div key={title}>
                  <strong style={{ color: "#f8fafc", fontSize: 14 }}>{title}</strong>
                  <p style={{ color: "#b6c4bf", fontSize: 13, lineHeight: 1.55, margin: "5px 0 0" }}>{body}</p>
                </div>
              ))}
            </div>
          </div>
          {plan.tier === "free" && (
            <div style={{ ...S.card, padding: 22, marginBottom: 24, background: "linear-gradient(135deg,rgba(200,220,200,.08),rgba(23,34,38,.8))", border: "1px solid rgba(200,220,200,.3)" }}>
              <Pill>Free preview</Pill>
              <h3 style={{ margin: "12px 0 8px", fontSize: 20 }}>You are seeing 1 day. The full plan is 7.</h3>
              <p style={{ color: "#94a3b8", margin: "0 0 16px", lineHeight: 1.65, fontSize: 14 }}>Upgrade to get your full 7-day plan, smart calorie calculation, meal swaps, and the food calculator.</p>
              <button onClick={() => choosePlan("pro")} style={S.btn}>Get the full plan - $27</button>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {tabs.map(t => (
              <button key={t} onClick={() => setActiveTab(t)} style={{ flex: "1 1 80px", minWidth: 80, background: activeTab === t ? "#c8dcc8" : "rgba(23,34,38,.72)", color: activeTab === t ? "#10201d" : "#cbd5e1", border: "1px solid " + (activeTab === t ? "#c8dcc8" : "rgba(148,163,184,.16)"), borderRadius: 14, padding: "12px 8px", fontWeight: 800, cursor: "pointer", fontSize: 14, textTransform: "capitalize" }}>
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
                <button key={d.day} onClick={() => setOpenDay(i)} style={{ flexShrink: 0, background: openDay === i ? "#c8dcc8" : "rgba(23,34,38,.72)", color: openDay === i ? "#10201d" : "#cbd5e1", border: "1px solid " + (openDay === i ? "#c8dcc8" : "rgba(148,163,184,.16)"), borderRadius: 999, padding: "10px 16px", fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap", fontSize: 14 }}>
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
                <div style={{ ...S.card, padding: 22, marginBottom: 20, background: "linear-gradient(135deg,rgba(200,220,200,.08),rgba(23,34,38,.8))", border: "1px solid rgba(200,220,200,.3)" }}>
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
          <p style={{ color: "#475569", fontSize: 12, lineHeight: 1.6, margin: "24px 0 0", padding: "14px 16px", background: "rgba(23,34,38,.5)", borderRadius: 12, border: "1px solid rgba(148,163,184,.08)" }}>
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

