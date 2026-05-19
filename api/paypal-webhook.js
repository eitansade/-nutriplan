/**
 * /api/paypal-webhook.js
 * Vercel Serverless Function - PayPal Webhook Handler
 *
 * Receives PayPal payment events, verifies the webhook signature, then marks
 * the matching Supabase profiles row as active for the purchased plan.
 */
import { createClient } from "@supabase/supabase-js";

const PAYPAL_API_BASE = "https://api-m.paypal.com";
const PAID_EVENTS = new Set([
  "PAYMENT.CAPTURE.COMPLETED",
  "CHECKOUT.ORDER.APPROVED",
]);

// Optional: if PayPal items/custom_id include these values, they map directly.
// Amount fallback below keeps the existing hosted PayPal links working.
const PLAN_MAP = {
  basic: "basic",
  pro: "pro",
  elite: "elite",
  "nutriplan-basic": "basic",
  "nutriplan-pro": "pro",
  "nutriplan-elite": "elite",
};

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase server environment variables");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

function getPayPalBasicAuth() {
  const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env;

  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
    throw new Error("Missing PayPal API credentials");
  }

  return Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64");
}

async function getPayPalAccessToken() {
  const tokenRes = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${getPayPalBasicAuth()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const tokenJson = await tokenRes.json().catch(() => ({}));

  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(`PayPal token request failed: ${tokenRes.status}`);
  }

  return tokenJson.access_token;
}

async function verifyPayPalWebhook(req, event) {
  const accessToken = await getPayPalAccessToken();
  const verifyRes = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auth_algo: req.headers["paypal-auth-algo"],
      cert_url: req.headers["paypal-cert-url"],
      transmission_id: req.headers["paypal-transmission-id"],
      transmission_sig: req.headers["paypal-transmission-sig"],
      transmission_time: req.headers["paypal-transmission-time"],
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: event,
    }),
  });

  const verifyJson = await verifyRes.json().catch(() => ({}));
  return verifyJson.verification_status === "SUCCESS";
}

async function fetchPayPalOrder(orderId) {
  if (!orderId) return null;

  const accessToken = await getPayPalAccessToken();
  const orderRes = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!orderRes.ok) {
    console.error("PayPal order lookup failed:", orderId, orderRes.status);
    return null;
  }

  return orderRes.json();
}

function parseEventBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") return JSON.parse(req.body);
  return req.body;
}

function findOrderId(resource) {
  return (
    resource?.id ||
    resource?.supplementary_data?.related_ids?.order_id ||
    resource?.purchase_units?.[0]?.payments?.captures?.[0]?.supplementary_data?.related_ids?.order_id ||
    null
  );
}

function findEmail(resource, order) {
  return (
    resource?.payer?.email_address ||
    resource?.payment_source?.paypal?.email_address ||
    order?.payer?.email_address ||
    order?.payment_source?.paypal?.email_address ||
    null
  );
}

function findProductId(resource, order) {
  return (
    resource?.purchase_units?.[0]?.items?.[0]?.sku ||
    resource?.purchase_units?.[0]?.custom_id ||
    order?.purchase_units?.[0]?.items?.[0]?.sku ||
    order?.purchase_units?.[0]?.custom_id ||
    null
  );
}

function findAmount(resource, order) {
  const rawAmount =
    resource?.amount?.value ||
    resource?.purchase_units?.[0]?.amount?.value ||
    order?.purchase_units?.[0]?.amount?.value ||
    order?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value ||
    "0";

  return Number.parseFloat(rawAmount);
}

function derivePlan(resource, order) {
  const productId = String(findProductId(resource, order) || "").trim().toLowerCase();
  if (PLAN_MAP[productId]) return PLAN_MAP[productId];

  const amount = findAmount(resource, order);
  if (amount >= 35) return "elite";
  if (amount >= 15) return "pro";
  if (amount >= 8) return "basic";
  return null;
}

function isCompletedPayment(eventType, resource, order) {
  if (eventType === "PAYMENT.CAPTURE.COMPLETED") return true;

  const orderStatus = String(order?.status || resource?.status || "").toUpperCase();
  const captureStatus = String(
    order?.purchase_units?.[0]?.payments?.captures?.[0]?.status || ""
  ).toUpperCase();

  return orderStatus === "COMPLETED" || captureStatus === "COMPLETED";
}

async function activateProfile({ email, plan, paypalOrderId }) {
  const supabase = getSupabaseAdmin();
  const normalizedEmail = email.trim().toLowerCase();
  const payload = {
    email: normalizedEmail,
    plan,
    payment_status: "active",
    paypal_order_id: paypalOrderId || null,
    updated_at: new Date().toISOString(),
  };

  const updateResult = await supabase
    .from("profiles")
    .update(payload)
    .ilike("email", normalizedEmail)
    .select("email");

  if (updateResult.error) throw updateResult.error;
  if (updateResult.data?.length) return { action: "updated", email: normalizedEmail };

  const insertResult = await supabase.from("profiles").insert(payload).select("email").single();
  if (insertResult.error) throw insertResult.error;

  return { action: "inserted", email: normalizedEmail };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let event;
  try {
    event = parseEventBody(req);
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const eventType = event?.event_type;
  console.log("PayPal webhook received:", eventType);

  try {
    const verified = await verifyPayPalWebhook(req, event);
    if (!verified) {
      console.error("PayPal webhook signature verification failed");
      return res.status(401).json({ error: "Invalid webhook signature" });
    }
  } catch (err) {
    console.error("PayPal webhook verification error:", err.message);
    return res.status(401).json({ error: "Webhook verification failed" });
  }

  if (!PAID_EVENTS.has(eventType)) {
    return res.status(200).json({ received: true, eventType });
  }

  try {
    const resource = event.resource || {};
    const orderId = findOrderId(resource);
    const order = await fetchPayPalOrder(orderId);
    const email = findEmail(resource, order);
    const plan = derivePlan(resource, order);

    if (!isCompletedPayment(eventType, resource, order)) {
      console.log("PayPal event acknowledged but payment is not completed yet", {
        eventType,
        orderId,
        orderStatus: order?.status || resource?.status || null,
      });
      return res.status(200).json({ received: true, warning: "Payment not completed yet" });
    }

    if (!email) {
      console.error("No email found in PayPal webhook payload", { eventType, orderId });
      return res.status(200).json({ received: true, warning: "No email found" });
    }

    if (!plan) {
      console.error("Could not determine plan from PayPal webhook", {
        eventType,
        orderId,
        amount: findAmount(resource, order),
        productId: findProductId(resource, order),
      });
      return res.status(200).json({ received: true, warning: "Plan not identified" });
    }

    const result = await activateProfile({ email, plan, paypalOrderId: orderId || resource.id });
    console.log(`Successfully activated ${plan} for ${result.email}`);

    return res.status(200).json({
      received: true,
      plan,
      email: result.email,
      action: result.action,
      paypal_order_id: orderId || resource.id || null,
    });
  } catch (err) {
    console.error("Webhook processing error:", err.message);
    return res.status(200).json({ received: true, error: err.message });
  }
}
