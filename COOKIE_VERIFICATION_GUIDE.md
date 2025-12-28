# Cookie Settings Verification Guide

## ✅ Expected Supabase Cookie Settings (According to Documentation)

Based on Supabase documentation, cookies are configured with:
- ✅ **SameSite: `Lax`** - Prevents CSRF attacks while allowing normal navigation
- ✅ **HttpOnly: `true`** - Prevents JavaScript access (XSS protection)
- ✅ **Secure: `true`** - HTTPS only (production)
- ✅ **CSRF Token** - Additional CSRF protection token

## 🔍 How to Verify Cookie Settings

### Method 1: Browser DevTools (Recommended)

1. **Open your app in browser** (logged in as admin)
2. **Open DevTools** (F12 or Right-click → Inspect)
3. **Go to Application tab** (Chrome/Edge) or **Storage tab** (Firefox)
4. **Navigate to Cookies** → Select your domain
5. **Look for Supabase cookies:**
   - `sb-*-auth-token` (access token)
   - `sb-*-refresh-token` (refresh token)
   - `csrf_token` (CSRF token)
6. **Check the attributes:**
   - **SameSite** column should show "Lax" or "Strict"
   - **HttpOnly** should be checked ✓
   - **Secure** should be checked ✓ (in production/HTTPS)

### Method 2: Browser Console (Quick Check)

1. **Open browser console** (F12)
2. **Run this command:**
   ```javascript
   document.cookie.split(';').filter(c => c.includes('sb-') || c.includes('csrf')).forEach(c => console.log(c.trim()))
   ```
3. **Note:** This only shows cookie values, not attributes. SameSite is not visible via JavaScript (by design - security feature).

### Method 3: Network Tab (Request Headers)

1. **Open DevTools → Network tab**
2. **Make a request** (e.g., login, or any API call)
3. **Click on the request**
4. **Check Request Headers:**
   - Look for `Cookie:` header
   - Verify cookies are being sent
5. **Check Response Headers:**
   - Look for `Set-Cookie:` header
   - You should see: `SameSite=Lax` or `SameSite=Strict`

---

## 📋 Verification Checklist

Check each item:

- [ ] Supabase auth cookies are present (after login)
- [ ] Cookies have `SameSite=Lax` or `SameSite=Strict`
- [ ] Cookies have `HttpOnly` flag
- [ ] Cookies have `Secure` flag (if using HTTPS)
- [ ] CSRF token cookie is present

---

## ⚠️ Important Notes

### Your Current Implementation

Looking at your code:
- You use basic `createClient()` without explicit cookie storage configuration
- Supabase may use **localStorage** by default for client-side auth
- Cookies are only set when using **Supabase Auth Helpers** or explicit cookie storage

**What this means:**
- If cookies aren't being set, that's actually **fine** for your use case
- Your `requireAdmin()` function uses **Bearer tokens** (primary method) - ✅ CSRF-safe
- Cookie fallback is rarely used, so CSRF risk is minimal

### Verification Result Interpretation

**If cookies exist with SameSite=Lax/Strict:**
- ✅ Perfect! Full CSRF protection via cookies
- Cookie fallback in `requireAdmin()` is safe

**If cookies don't exist (using localStorage):**
- ✅ Still fine! Bearer token authentication is primary method
- Cookie fallback won't be used anyway
- CSRF protection still strong via Bearer tokens

**If cookies exist without SameSite:**
- ⚠️ Potential issue (unlikely with Supabase defaults)
- Would need to configure cookie storage explicitly

---

## 🛠️ If Cookies Need Configuration

If you want to explicitly use cookies with SameSite protection:

1. Install `@supabase/auth-helpers-nextjs` (if not already)
2. Configure cookie storage in Supabase client
3. Set SameSite explicitly (though Supabase should handle this)

However, **this is likely unnecessary** since:
- Bearer tokens are your primary auth method (CSRF-safe)
- Supabase defaults are secure
- Cookie fallback is rarely used

---

## ✅ Quick Test

**Test if cookies are being used:**

1. Login to admin panel
2. Open DevTools → Application → Cookies
3. Check if you see any cookies starting with `sb-`

**If yes:** Verify SameSite attribute  
**If no:** Cookies aren't being used (localStorage instead) - this is fine, Bearer tokens are CSRF-safe

