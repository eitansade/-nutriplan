/**
 * /api/paypal-webhook.js
 * Vercel Serverless Function — PayPal Webhook Handler
 *
 * WHAT THIS DOES:
 * 1. Receives payment confirmation from PayPal
 * 2. Verifies the signature so no one can fake a payment
 * 3. Reads the customer email and which plan they bought
 * 4. Updates their row in Supabase profiles table
 *
 * DEPLOY: push to GitHub → Vercel auto-deploys it at /api/paypal-webhook
 */
import { createClient } from "@supabase/supabase-js";
// Map PayPal product/plan IDs to your NutriPlan tiers.
// HOW TO FIND THESE:
// PayPal Developer Dashboard → My Apps → your app
// → Products → each product has an ID like "PROD-XXXXXXXXXXXX"
// Add every product ID you sell here.
const PLAN_MAP = {
 "PROD-BASIC_ID_HERE": "basic", // replace with real PayPal product ID
 "PROD-PRO_ID_HERE": "pro",
 "PROD-ELITE_ID_HERE": "elite",
};
// Supabase admin client — server-side only, never exposed to frontend
const supabase = createClient(
 process.env.NEXT_PUBLIC_SUPABASE_URL, // safe to be public
 process.env.SUPABASE_SERVICE_ROLE_KEY // SECRET — never in frontend
);
export default async function handler(req, res) {
 if (req.method !== "POST") {
 return res.status(405).json({ error: "Method not allowed" });
 }
 // ── Step 1: Verify PayPal webhook signature ──────────────────────────────
 // This prevents anyone from faking a payment by POSTing to your URL.
 const verified = await verifyPayPalWebhook(req);
 if (!verified) {
 console.error("PayPal webhook signature verification failed");
 return res.status(401).json({ error: "Invalid webhook signature" });
 }
 const event = req.body;
 const eventType = event.event_type;
 console.log("PayPal webhook received:", eventType);
 // ── Step 2: Handle successful payment events ─────────────────────────────
 // PayPal sends different event types. We care about completed payments.
 if (
 eventType === "PAYMENT.CAPTURE.COMPLETED" || // one-time payment
 eventType === "CHECKOUT.ORDER.APPROVED" // checkout order
 ) {
 try {
 const resource = event.resource;
 // Get customer email from PayPal event data
 const email =
 resource?.payer?.email_address ||
 resource?.payment_source?.paypal?.email_address ||
 null;
 if (!email) {
 console.error("No email found in PayPal webhook payload", JSON.stringify(event, null, return res.status(200).json({ received: true, warning: "No email found" });
 }
 // Determine which plan was purchased
 // PayPal puts product/plan info in different places depending on the product type
 const productId =
 resource?.purchase_units?.[0]?.items?.[0]?.sku || // custom SKU you set
 resource?.purchase_units?.[0]?.custom_id || // custom_id field
 null;
 const plan = PLAN_MAP[productId] || derivePlanFromAmount(resource);
 if (!plan) {
 console.error("Could not determine plan for product:", productId);
 return res.status(200).json({ received: true, warning: "Plan not identified" });
 }
 console.log(`Activating plan "${plan}" for ${email}`);
 // ── Step 3: Update Supabase ──────────────────────────────────────────
 // Upsert: create the row if it doesn't exist, update if it does
 const { error } = await supabase
 .from("profiles")
 .upsert(
 {
 email,
 plan,
 payment_status: "active",
 paypal_order_id: resource?.id || null,
 updated_at: new Date().toISOString(),
 },
 { onConflict: "email" } // match by email
 );
 if (error) {
 console.error("Supabase upsert failed:", error.message);
 // Still return 200 so PayPal doesn't retry endlessly
 return res.status(200).json({ received: true, error: error.message });
 }
 console.log(`Successfully activated ${plan} for ${email}`);
 return res.status(200).json({ received: true, plan, email });
 } catch (err) {
 console.error("Webhook processing error:", err.message);
 return res.status(200).json({ received: true, error: err.message });
 }
 }
 // For all other event types, just acknowledge receipt
 return res.status(200).json({ received: true, eventType });
}
// ── PayPal Signature Verification ─────────────────────────────────────────────
// Calls PayPal's own API to confirm the webhook is genuine.
async function verifyPayPalWebhook(req) {
 try {
 // Get PayPal access token
 const tokenRes = await fetch(
 "https://api-m.paypal.com/v1/oauth2/token",
 {
 method: "POST",
 headers: {
 "Authorization": "Basic " + Buffer.from(
 process.env.PAYPAL_CLIENT_ID + ":" + process.env.PAYPAL_CLIENT_SECRET
 ).toString("base64"),
 "Content-Type": "application/x-www-form-urlencoded",
 },
 body: "grant_type=client_credentials",
 }
 );
 const { access_token } = await tokenRes.json();
 // Verify the webhook signature
 const verifyRes = await fetch(
 "https://api-m.paypal.com/v1/notifications/verify-webhook-signature",
 {
 method: "POST",
 headers: {
 "Authorization": "Bearer " + access_token,
 "Content-Type": "application/json",
 },
 body: JSON.stringify({
 auth_algo: req.headers["paypal-auth-algo"],
 cert_url: req.headers["paypal-cert-url"],
 transmission_id: req.headers["paypal-transmission-id"],
 transmission_sig: req.headers["paypal-transmission-sig"],
 transmission_time: req.headers["paypal-transmission-time"],
 webhook_id: process.env.PAYPAL_WEBHOOK_ID,
 webhook_event: req.body,
 }),
 }
 );
 const { verification_status } = await verifyRes.json();
 return verification_status === "SUCCESS";
 } catch (err) {
 console.error("Signature verification error:", err.message);
 return false;
 }
}
// Fallback: guess plan from payment amount if product ID mapping fails
function derivePlanFromAmount(resource) {
 const amount = parseFloat(
 resource?.amount?.value ||
 resource?.purchase_units?.[0]?.amount?.value ||
 "0"
 );
 if (amount >= 35) return "elite";
 if (amount >= 15) return "pro";
 if (amount >= 8) return "basic";
  return null;
}
