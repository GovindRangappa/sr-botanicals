# Shippo API Cost Analysis

## Two Types of Shippo API Calls

### 1. **Getting Rates** (Before Payment)
**Endpoint:** `/api/get-rates`
**Shippo API Call:** `POST /shipments/` (creates shipment to get rates)
**When:** Customer clicks "Get Shipping Rates" button
**Status:** ⚠️ **BEFORE customer pays**
**Cost:** Depends on Shippo plan - may be free or minimal cost

### 2. **Creating Labels** (After Payment)
**Shippo API Call:** `POST /transactions/` (creates actual shipping label)
**When:** After customer completes payment (webhook)
**Status:** ✅ **AFTER customer pays** (customer pays for label)
**Cost:** Customer pays this (charged to your Shippo account, then you charge customer)

---

## The Flow

```
1. Customer enters address
2. Customer clicks "Get Shipping Rates"
   → `/api/get-rates` called
   → Creates shipment in Shippo (GET RATES)
   → Customer sees rates
   → ⚠️ NO PAYMENT YET

3. Customer selects a rate
4. Customer proceeds to checkout
5. Customer pays via Stripe
   → Payment successful

6. Webhook fires
   → Creates shipping label (CREATE LABEL)
   → ✅ Customer has already paid
   → Label cost charged to your Shippo account
   → You charge customer for shipping
```

---

## The Risk

**Question:** Does creating shipments to GET rates cost money?

**Answer:** Depends on your Shippo plan:
- Some plans: Getting rates is **free** (you only pay when labels are created)
- Other plans: Each shipment creation costs a small amount
- Check your Shippo dashboard/billing to confirm

**If getting rates is FREE:**
- ✅ Less urgent to rate limit `/api/get-rates`
- ⚠️ Still good practice to prevent abuse/spam
- ⚠️ Still protects server resources

**If getting rates COSTS MONEY:**
- 🔴 **CRITICAL** to rate limit `/api/get-rates`
- Prevents someone from racking up charges without paying

---

## Recommendation

Even if getting rates is free, rate limiting `/api/get-rates` is still valuable because:

1. **Server Resources** - Prevents overwhelming your server
2. **Good Practice** - Defense in depth
3. **Future-Proofing** - If Shippo changes pricing, you're protected
4. **Abuse Prevention** - Prevents someone from spamming your endpoint
5. **API Quotas** - Some plans have API call limits

---

## What You Should Do

1. **Check your Shippo billing/dashboard:**
   - Look at what you're charged for
   - If you see charges for shipment creation (not just labels) = you're paying for rates
   - If you only see charges for labels = rates are free

2. **Rate Limit Recommendation:**
   - **If rates cost money:** Rate limit aggressively (10-20 requests/hour)
   - **If rates are free:** Rate limit moderately (20 requests/minute) - still prevents abuse

3. **Priority:**
   - `/api/send-contact` (Abstract API = definitely costs money) = **HIGHEST PRIORITY**
   - `/api/get-rates` = Depends on Shippo pricing, but still recommended

---

## Bottom Line

You're partially right - when labels are created, the customer pays. But `/api/get-rates` happens BEFORE payment, and may or may not cost money depending on your Shippo plan.

**Check your Shippo billing to confirm**, but rate limiting is still a good idea for abuse prevention regardless.

