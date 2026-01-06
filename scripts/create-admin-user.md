# How to Add a New Admin User

## Method 1: Using Supabase Dashboard (Recommended)

### Step 1: Create Auth User
1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Users**
3. Click **"Add user"** → **"Create new user"**
4. Enter:
   - **Email**: The admin's email address
   - **Password**: A secure password (user can change this later)
5. Click **"Create user"**
6. **Copy the User ID** (UUID) - you'll need this for the next step

### Step 2: Add Admin Role
1. Go to **SQL Editor** in Supabase dashboard
2. Run this SQL query (replace `<USER_ID>` with the UUID from Step 1):

```sql
INSERT INTO users (id, role)
VALUES ('<USER_ID>', 'admin')
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

### Step 3: Update allowedEmails (if needed)
If you want the new admin to access the orders page, update the `allowedEmails` array in `src/pages/admin/orders.tsx`:

```typescript
const allowedEmails = ['ivygovind@gmail.com', 'srbotanicals@gmail.com', 'newadmin@example.com'];
```

## Method 2: Using SQL Directly

If you prefer to do everything via SQL:

```sql
-- First, create the auth user (this requires Supabase Admin API or dashboard)
-- Then add to users table:

INSERT INTO users (id, role)
VALUES (
  '<USER_ID_FROM_AUTH>',  -- Get this from Authentication → Users after creating the user
  'admin'
)
ON CONFLICT (id) DO UPDATE SET role = 'admin';
```

## Method 3: Using Supabase Admin API

You can also create users programmatically using the Supabase Admin API, but this requires server-side code with the service role key.

## Notes

- The `users` table must have a row with the user's auth ID and `role = 'admin'`
- The user can then log in at `/admin/login` with their email and password
- The `allowedEmails` array in `orders.tsx` is an additional check - you may want to remove this and rely solely on the `users` table role check for consistency

