// lib/auth/requireAdmin.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Server-side admin authentication middleware
 * Use this to protect admin API endpoints
 * 
 * Supports authentication via:
 * 1. Authorization header with Bearer token (JWT)
 * 2. Cookies (if session cookie is present)
 */
export async function requireAdmin(req: NextApiRequest, res: NextApiResponse): Promise<boolean> {
  try {
    let user = null;
    
    // Try to get token from Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user: userFromToken }, error: tokenError } = await supabaseAdmin.auth.getUser(token);
      if (!tokenError && userFromToken) {
        user = userFromToken;
      }
    }
    
    // If no user from header, try to get from cookies
    if (!user) {
      // Get access token from cookies
      const accessToken = req.cookies['sb-access-token'] || req.cookies[`sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split('//')[1]?.split('.')[0]}-auth-token`];
      
      if (accessToken) {
        const { data: { user: userFromCookie }, error: cookieError } = await supabaseAdmin.auth.getUser(accessToken);
        if (!cookieError && userFromCookie) {
          user = userFromCookie;
        }
      }
    }
    
    if (!user) {
      res.status(401).json({ error: 'Unauthorized: Authentication required' });
      return false;
    }

    // Check if user has admin role
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error verifying admin access:', err);
    res.status(500).json({ error: 'Internal server error' });
    return false;
  }
}

