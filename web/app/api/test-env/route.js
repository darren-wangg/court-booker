/**
 * GET /api/test-env
 * Test endpoint to verify environment variables are loaded
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const envStatus = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing',
    BROWSERLESS_TOKEN: process.env.BROWSERLESS_TOKEN ? 'Set' : 'Missing',
    USER1_EMAIL: process.env.USER1_EMAIL ? 'Set' : 'Missing',
  };

  return NextResponse.json({
    message: 'Environment variable status',
    env: envStatus,
    nodeEnv: process.env.NODE_ENV,
  });
}
