/**
 * GET /api/users
 * Returns the list of configured users (without passwords)
 */

import { NextResponse } from 'next/server';
import { users } from '@court-booker/shared';

interface PublicUser {
  id: number;
  email: string;
}

export async function GET() {
  try {
    // Return users without passwords
    const publicUsers: PublicUser[] = users.map(user => ({
      id: user.id,
      email: user.email,
    }));

    return NextResponse.json({
      success: true,
      data: publicUsers,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching users:', message);
    return NextResponse.json(
      { error: 'Failed to fetch users', details: message },
      { status: 500 }
    );
  }
}
