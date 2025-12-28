# Testing Hand Delivery Business Email Notification

This guide will help you test the Hand Delivery business email notification for both customer-side and admin-side orders.

## Prerequisites

1. Make sure your environment variables are set:
   - `RESEND_API_KEY`
   - `OWNER_NOTIFICATION_EMAIL` (the email address that should receive business notifications)
   - `EMAIL_FROM`

2. Check your console logs (server logs for API routes, browser console for client-side)

## Testing Methods

### Method 1: Admin-Side Manual Order (Easiest to Test)

1. **Access Admin Panel**
   - Log in to your admin panel
   - Navigate to the Orders page
   - Click "Create Manual Order" or similar button

2. **Create a Hand Delivery Order**
   - Fill in customer information (Name, Email, Phone)
   - Add products to the order
   - Select **"Hand Delivery"** as the shipping method (NOT "Local Pickup" or "Paid Shipping")
   - Choose payment method (Cash or Card)
   - If Cash: The order will be marked as paid immediately
   - If Card: You'll need to mark it as paid after creating the invoice

3. **Check Logs**
   - Open your server logs (terminal/console where your Next.js app is running)
   - Look for logs with these prefixes:
     - `🔍 [Manual Order] Checking Hand Delivery notification:`
     - `✅ [Manual Order] Conditions met, sending Hand Delivery notification`
     - `🚗 [Hand Delivery Email] Function called`
     - `✅ [Hand Delivery Email] Email sent successfully`

4. **What to Look For in Logs:**
   ```javascript
   {
     shipping_method: "Hand Delivery",  // Should be exactly "Hand Delivery"
     isHandDelivery: true,              // Should be true
     owner_pickup_email_sent: false,    // Should be false (or undefined) for new orders
     orderId: "123"
   }
   ```

5. **Check Email**
   - Check the inbox for `OWNER_NOTIFICATION_EMAIL`
   - Subject should be: `New Hand Delivery Order – #[order_id]`
   - Should contain order details, customer info, and items

---

### Method 2: Customer-Side Order (Requires Stripe Webhook)

1. **Create Order via Customer Checkout**
   - Go to your shop page as a customer
   - Add items to cart
   - Go to checkout
   - Fill in customer information
   - Select **"Free Hand Delivery"** as the delivery option
   - Complete payment via Stripe

2. **Check Webhook Logs**
   - Server logs should show:
     - `📩 Incoming Stripe webhook`
     - `📬 Webhook event received: { type: 'checkout.session.completed' }` or `{ type: 'invoice.paid' }` or `{ type: 'payment_intent.succeeded' }`
     - `🔍 [Webhook] Checking Hand Delivery notification:`
     - `✅ [Webhook] Conditions met, sending Hand Delivery notification`
     - `🚗 Owner Hand Delivery notification sent`

3. **Important:** The webhook is triggered by Stripe, so you need:
   - Stripe webhook endpoint configured
   - `STRIPE_WEBHOOK_SECRET` environment variable set
   - Webhook events configured in Stripe dashboard

---

## Troubleshooting

### Issue: No logs appearing at all

**Possible causes:**
- The shipping method might not be exactly "Hand Delivery"
- The order might not be marked as "paid"
- The notification handler might not be called

**Solution:**
1. Check the order in your database:
   ```sql
   SELECT id, shipping_method, status, owner_pickup_email_sent 
   FROM orders 
   WHERE shipping_method LIKE '%Hand Delivery%' 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```
2. Verify `shipping_method` is exactly `"Hand Delivery"` (not "Hand Delivery (In Person)" or similar)
3. Verify `status` is `"paid"` or the order is a cash payment

---

### Issue: Logs show "Skipping Hand Delivery notification"

**Check the logs for the reason:**
- `"Not a Hand Delivery order"` → The `shipping_method` field doesn't match "Hand Delivery"
- `"Already sent (owner_pickup_email_sent is true)"` → The notification was already sent for this order

**Solutions:**
1. If not detected as Hand Delivery:
   - Check the exact value in `shipping_method` field
   - Look for typos or extra spaces
   - Verify it's saved correctly when creating the order

2. If already sent:
   - This is expected behavior (idempotency)
   - To test again, you'll need to reset the flag in the database:
     ```sql
     UPDATE orders 
     SET owner_pickup_email_sent = false 
     WHERE id = '[your_order_id]';
     ```

---

### Issue: Logs show notification attempt but email not received

**Check logs for:**
- `❌ [Hand Delivery Email] Missing RESEND_API_KEY`
- `❌ [Hand Delivery Email] Missing OWNER_NOTIFICATION_EMAIL`
- `❌ [Hand Delivery Email] Resend error: [error message]`

**Solutions:**
1. Verify environment variables are set correctly
2. Check Resend API key is valid
3. Check Resend dashboard for email delivery status
4. Check spam/junk folder
5. Verify `OWNER_NOTIFICATION_EMAIL` is the correct email address

---

### Issue: Function called but no success log

**Check for error logs:**
- Look for `❌ Failed to send owner hand delivery notification`
- Check the error message in the logs

**Common errors:**
- Network issues
- Resend API rate limits
- Invalid email format

---

## Quick Test Checklist

- [ ] Create a test order with Hand Delivery
- [ ] Check server logs for Hand Delivery notification logs
- [ ] Verify `isHandDelivery: true` in logs
- [ ] Verify `owner_pickup_email_sent: false` (or undefined) before sending
- [ ] See `✅ [Hand Delivery Email] Email sent successfully` log
- [ ] Check email inbox for notification
- [ ] Verify email contains correct order information
- [ ] Check database: `owner_pickup_email_sent` should be `true` after sending

---

## Testing Different Scenarios

### Test 1: New Hand Delivery Order (Should Send)
- Create a new order with Hand Delivery
- Status: paid
- `owner_pickup_email_sent`: false
- **Expected:** Email should be sent

### Test 2: Already Sent Notification (Should Skip)
- Use an order that already has `owner_pickup_email_sent: true`
- **Expected:** Should log "already sent" and skip sending

### Test 3: Non-Hand Delivery Order (Should Skip)
- Create order with "Local Pickup" or "Paid Shipping"
- **Expected:** Should not attempt to send Hand Delivery notification

### Test 4: Unpaid Order (Manual orders only)
- Create manual order with Hand Delivery
- Don't mark as paid
- **Expected:** For manual orders, notifications only send for paid orders

---

## Log Examples to Look For

### Success Logs:
```
🔍 [Manual Order] Checking Hand Delivery notification: {
  shipping_method: 'Hand Delivery',
  isHandDelivery: true,
  owner_pickup_email_sent: false,
  orderId: '123'
}
✅ [Manual Order] Conditions met, sending Hand Delivery notification
🚗 [Hand Delivery Email] Function called with order: { id: '123', shipping_method: 'Hand Delivery', ... }
📧 [Hand Delivery Email] Sending to: your-email@example.com
✅ [Hand Delivery Email] Email sent successfully
🚗 Owner Hand Delivery notification sent (manual order)
```

### Skip Logs (Already Sent):
```
🔍 [Manual Order] Checking Hand Delivery notification: {
  shipping_method: 'Hand Delivery',
  isHandDelivery: true,
  owner_pickup_email_sent: true,  // ← Already true
  orderId: '123'
}
⏭️ [Manual Order] Skipping Hand Delivery notification - already sent
```

### Skip Logs (Not Hand Delivery):
```
🔍 [Manual Order] Checking Hand Delivery notification: {
  shipping_method: 'Local Pickup',  // ← Not Hand Delivery
  isHandDelivery: false,
  owner_pickup_email_sent: false,
  orderId: '123'
}
⏭️ [Manual Order] Skipping Hand Delivery notification - not a Hand Delivery order
```

