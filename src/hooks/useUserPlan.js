/**
 * /src/hooks/useUserPlan.js
 * React hook — reads logged-in user's plan from Supabase profiles table.
 *
 * HOW TO USE IN App.jsx:
 * import { useUserPlan } from "./hooks/useUserPlan";
 * const { plan, loading } = useUserPlan();
 * // use plan instead of accessTier where relevant
 *
 * The hook:
 * 1. Gets the logged-in user from Supabase Auth
 * 2. Reads their row from the profiles table
 * 3. Returns their plan ("free" | "basic" | "pro" | "elite")
 * 4. Re-checks every 5 seconds so plan activates quickly after payment
 */
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
export function useUserPlan() {
 const [plan, setPlan] = useState("free");
 const [user, setUser] = useState(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(null);
 useEffect(() => {
 let interval = null;
 async function fetchPlan() {
 try {
 // Get current logged-in user
 const { data: { user: currentUser } } = await supabase.auth.getUser();
 if (!currentUser) {
 setPlan("free");
 setUser(null);
 setLoading(false);
 return;
 }
 setUser(currentUser);
 // Read their profile from the profiles table
 const { data, error: dbError } = await supabase
 .from("profiles")
 .select("plan, payment_status")
 .eq("email", currentUser.email)
 .single();
 if (dbError && dbError.code !== "PGRST116") {
 // PGRST116 = row not found (new user, no profile yet)
 setError(dbError.message);
 setPlan("free");
 } else if (data && data.payment_status === "active") {
 setPlan(data.plan || "free");
 } else {
 setPlan("free");
 }
 } catch (err) {
 setError(err.message);
 setPlan("free");
 } finally {
 setLoading(false);
 }
 }
 // Fetch immediately
 fetchPlan();
 // Poll every 5 seconds so plan activates right after PayPal redirect
 // In production, replace with Supabase Realtime for instant updates
 interval = setInterval(fetchPlan, 5000);
 // Listen for auth changes (login/logout)
 const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
 fetchPlan();
 });
 return () => {
 clearInterval(interval);
 subscription.unsubscribe();
 };
 }, []);
 return { plan, user, loading, error };
}
