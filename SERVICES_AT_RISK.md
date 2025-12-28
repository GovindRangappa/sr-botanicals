# Services at Risk - What Needs Rate Limiting

## Understanding Rate Limiting

**Rate limiting on YOUR server** protects:
1. **Your API endpoints** from being abused
2. **Third-party services you call** from your server (costs money!)
3. **Your server resources** from being overwhelmed

## ⚠️ Important: Google Autocomplete is CLIENT-SIDE

Google Places Autocomplete runs directly in the browser → Google's servers. You **cannot rate limit this** from your backend because:
- The API call happens directly from the user's browser to Google
- Google already has their own rate limiting
- You don't have control over it

**What you CAN rate limit:** Your `/api/get-rates` endpoint which is called AFTER address selection.

---

## Services That Cost Money (HIGH PRIORITY)

### 1. **Shippo API** ⚠️ RISK (Depends on Plan)
**Where Used:**
- `/api/get-rates` - Creates shipments to GET rates (BEFORE payment)
- `/api/checkout` - Retrieves shipment data
- `/api/webhooks/stripe-webhook.ts` - Creates shipping labels (AFTER payment - customer pays)
- `/api/send-manual-order-notifications.ts` - Creates shipping labels (AFTER payment - customer pays)

**Risk Analysis:**
- ⚠️ **Getting rates** (`/api/get-rates`) happens BEFORE customer pays
  - May or may not cost money (depends on Shippo plan)
  - Check your Shippo billing: if you see charges for shipment creation = you pay for rates
  - If you only see charges for labels = rates are free
  
- ✅ **Creating labels** happens AFTER customer pays (customer pays for this)

**Rate Limit Needed:** ⚠️ RECOMMENDED - 20 requests/minute per IP
- Even if rates are free, rate limiting prevents:
  - Server resource abuse
  - API quota exhaustion
  - Spam/abuse
  - Future-proofing if Shippo changes pricing

**What to Protect:**
- `/api/get-rates` endpoint (called frequently, happens before payment)

---

### 2. **Abstract API (Email Validation)** 💰
**Where Used:**
- `/api/send-contact` - Validates email addresses before sending

**Risk:**
- ⚠️ **Each validation costs money** (per API call)
- Spam bots could submit contact forms repeatedly
- Each submission calls Abstract API = cost per call

**Rate Limit Needed:** ✅ YES - 5 requests/hour per IP

**What to Protect:**
- `/api/send-contact` endpoint

---

### 3. **Resend (Email Sending)** ⚠️
**Where Used:**
- `/api/send-contact` - Sends contact form emails
- `/api/messages/reply` - Sends reply emails
- Order confirmation emails (webhook)
- Owner notification emails (webhook)
- Shipment confirmation emails (webhook)

**Risk:**
- ⚠️ **Has its own rate limits** (free tier: 3,000 emails/month)
- Spam could exhaust your email quota
- Legitimate emails could be blocked if quota exceeded

**Rate Limit Needed:** ✅ YES - Protect contact form (5/hour)
- Order emails are triggered by actual orders (low risk)
- Contact form = high spam risk

**What to Protect:**
- `/api/send-contact` endpoint (spam prevention)

---

## Services That DON'T Need Rate Limiting (They Handle It)

### 4. **Google Places API (Autocomplete)**
- ✅ Runs client-side (browser → Google)
- ✅ Google handles rate limiting
- ✅ You can't control it from your server
- ❌ **Don't need to rate limit** (not in your control)

### 5. **Stripe API**
- ✅ Has built-in rate limiting
- ✅ Webhook signature verification protects it
- ❌ **Don't need to rate limit** (Stripe handles it)

### 6. **Supabase**
- ✅ Has built-in rate limiting
- ✅ Your plan has usage limits
- ⚠️ Could add rate limiting for expensive queries (optional)

---

## What Rate Limiting Actually Protects

### Your API Endpoints (Spam/Abuse Prevention)

1. **`/api/send-contact`**
   - **Why:** Prevents spam submissions
   - **Cost Risk:** Abstract API calls + Resend emails
   - **Rate:** 5 requests/hour per IP
   - **Protects:** Email validation costs, email quota

2. **`/api/get-rates`** 🔥 MOST IMPORTANT
   - **Why:** Shippo API costs money per call
   - **Cost Risk:** Each request = Shippo API charge
   - **Rate:** 20 requests/minute per IP
   - **Protects:** Direct cost per API call

3. **`/api/checkout`**
   - **Why:** Prevent checkout abuse/fraud
   - **Cost Risk:** Lower (Stripe handles payments)
   - **Rate:** 10 requests/minute per IP
   - **Protects:** Server resources, prevent abuse

4. **`/api/messages/add`**
   - **Why:** Prevent spam messages
   - **Cost Risk:** Lower (just database writes)
   - **Rate:** 10 requests/hour per IP (optional)
   - **Protects:** Database resources

---

## Summary: Services at Risk

| Service | Risk Level | Cost Per Call | Rate Limit? |
|---------|-----------|---------------|-------------|
| **Shippo API (get-rates)** | 🟡 MEDIUM | Depends on plan* | ✅ YES - 20/min (recommended) |
| **Abstract API** | 🔴 HIGH | Yes ($) | ✅ YES - 5/hour |
| **Resend** | 🟡 MEDIUM | Quota limited | ✅ YES - 5/hour (contact form) |
| Google Autocomplete | 🟢 LOW | No (client-side) | ❌ NO (Google handles it) |
| Stripe | 🟢 LOW | No (they handle it) | ❌ NO (Stripe handles it) |
| Supabase | 🟢 LOW | Plan limits | ❌ NO (optional) |

---

## What Rate Limiting DOESN'T Do

❌ **Doesn't protect Google Autocomplete** - That's client-side, Google handles it
❌ **Doesn't protect Stripe** - They have their own protection
✅ **DOES protect Shippo API calls** - Your server makes these calls, you pay for them
✅ **DOES protect Abstract API calls** - Your server makes these calls, you pay for them
✅ **DOES prevent spam** - Limits how many times someone can submit forms

---

## Bottom Line

**Rate limiting protects services YOUR SERVER calls**, not services that run in the browser.

**Your highest cost risks:**
1. 🔥 **Abstract API** - Every contact form = guaranteed cost
2. 🟡 **Shippo API (get-rates)** - Check your Shippo billing to confirm if rates cost money
   - If rates cost money = HIGH priority
   - If rates are free = Still recommended for abuse prevention

**Rate limiting prevents:**
- Someone spamming your contact form = racking up Abstract API charges (GUARANTEED cost)
- Someone spamming your `/api/get-rates` endpoint = potential Shippo charges (if your plan charges for rates) OR server abuse
- Email quota exhaustion from spam

**Recommendation:** 
1. **HIGHEST PRIORITY:** `/api/send-contact` (Abstract API = guaranteed cost)
2. **RECOMMENDED:** `/api/get-rates` (Check Shippo billing first, but still good practice)

