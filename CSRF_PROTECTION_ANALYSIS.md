# CSRF Protection Analysis

## Current State Assessment

### ✅ Good CSRF Protection (Low Risk)

**1. API Routes Use Bearer Tokens (Primary Method)**
- All admin API routes in `requireAdmin()` **prioritize Bearer tokens** from `Authorization` header
- Bearer tokens in headers are **CSRF-safe** (browsers don't automatically send custom headers)
- Frontend admin components send `Authorization: Bearer <token>` headers
- **Risk Level:** ✅ **LOW** - Tokens can't be stolen via CSRF

**Files Using Bearer Tokens:**
- `src/pages/admin/add-product.tsx`
- `src/pages/admin/edit-product.tsx`
- `src/pages/admin/inbox.tsx`
- `src/pages/admin/storage-cleanup.tsx`
- `src/components/ManualOrderForm.tsx`

**2. Same-Origin API Routes**
- All API routes are on the same domain (`/api/*`)
- Forms submit to same-origin endpoints
- **Risk Level:** ✅ **LOW** - Same-origin requests are inherently safer

**3. State-Changing Operations Protected**
- Checkout uses Stripe (external, secure)
- Order creation requires payment (Stripe handles CSRF protection)
- Admin operations require Bearer token authentication

---

### ⚠️ Potential CSRF Risk (Medium-Low Priority)

**1. Cookie-Based Auth Fallback**
- `requireAdmin()` has a **cookie fallback** if no Bearer token is present
- Cookies are automatically sent by browsers (CSRF risk if no SameSite protection)
- However, this fallback is rarely used since frontend sends Bearer tokens

**Code:**
```typescript
// requireAdmin.ts - Line 35
const accessToken = req.cookies['sb-access-token'] || req.cookies[`sb-${...}-auth-token`];
```

**Risk Assessment:**
- **Low** - Bearer tokens are prioritized, so cookies are rarely used
- **Medium** - If cookie fallback is used, need SameSite protection

**2. Supabase Cookie Configuration**
- Supabase sets cookies automatically for session management
- **Default behavior:** Supabase typically sets `SameSite=Lax` or `SameSite=Strict` by default
- **Unverified:** We don't have explicit control over this in our code
- **Recommendation:** Verify in Supabase Dashboard or browser dev tools

**3. Contact Form (Public Endpoint)**
- `/api/send-contact` doesn't require authentication
- Uses Abstract API (external service)
- No CSRF token protection
- **Risk Level:** ⚠️ **LOW-MEDIUM** - Could be spammed, but doesn't expose sensitive data

---

## Verifying Supabase Cookie Settings

### How to Check:

1. **Browser DevTools:**
   - Open your app in browser
   - Login as admin
   - Open DevTools → Application → Cookies
   - Look for Supabase auth cookies (usually `sb-*-auth-token`)
   - Check `SameSite` attribute value

2. **Supabase Dashboard:**
   - Go to Authentication → Settings
   - Check cookie configuration settings
   - Verify SameSite cookie policy

### Expected Cookie Attributes:
- ✅ `SameSite=Lax` or `SameSite=Strict` (CSRF protection)
- ✅ `Secure=true` (HTTPS only)
- ✅ `HttpOnly=true` (JavaScript can't access)

---

## Current Protection Summary

| Component | CSRF Protection | Risk Level |
|-----------|----------------|------------|
| **Admin API Routes** | ✅ Bearer tokens (primary) | ✅ **LOW** |
| **Cookie Fallback** | ⚠️ Depends on Supabase defaults | ⚠️ **LOW-MEDIUM** |
| **Contact Form** | ❌ No CSRF protection | ⚠️ **LOW** (spam risk only) |
| **Checkout/Orders** | ✅ Stripe handles CSRF | ✅ **LOW** |
| **Same-Origin API** | ✅ Same-origin requests | ✅ **LOW** |

---

## Recommendations

### ✅ Recommended (High Value, Low Effort)

**1. Verify Supabase Cookie Settings**
- **Action:** Check browser DevTools for cookie SameSite attributes
- **Time:** 2 minutes
- **Value:** Confirms CSRF protection is working

**2. Consider Removing Cookie Fallback** (Optional)
- **Action:** Remove cookie fallback in `requireAdmin()` if not needed
- **Time:** 5 minutes
- **Value:** Eliminates potential CSRF vector entirely
- **Trade-off:** Requires all API calls to use Bearer tokens (already the case)

### ⚠️ Optional Enhancements (Lower Priority)

**3. Add CSRF Token to Contact Form** (Optional)
- **Action:** Generate CSRF token, include in form, verify on server
- **Time:** 30 minutes
- **Value:** Prevents form spam/bot submissions
- **Note:** You already decided not to rate limit this, so CSRF token may not be necessary

**4. Explicit Cookie Configuration** (If needed)
- **Action:** Configure Supabase client with explicit cookie settings
- **Time:** 15 minutes
- **Value:** Ensures SameSite protection
- **Note:** May not be possible with Supabase client library

---

## Conclusion

**Overall CSRF Protection: ✅ GOOD**

**Key Findings:**
1. ✅ Admin API routes primarily use Bearer tokens (CSRF-safe)
2. ✅ Cookie fallback exists but is rarely used (low risk)
3. ⚠️ Supabase cookie SameSite settings need verification
4. ⚠️ Contact form has no CSRF protection (low risk, spam only)

**Priority Actions:**
1. **Quick Check:** Verify Supabase cookies have `SameSite` attribute (2 min)
2. **Optional:** Remove cookie fallback if Bearer tokens work for all cases (5 min)

**Risk Assessment:** **LOW** - Current implementation is reasonably secure. Bearer token authentication provides strong CSRF protection. Cookie fallback is the only potential concern, but it's rarely used and Supabase likely sets proper SameSite attributes by default.

