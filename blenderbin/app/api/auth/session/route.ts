// app/api/auth/session/route.ts
import { auth } from '../../../lib/firebase-admin';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();
    
    if (!idToken) {
      return NextResponse.json(
        { error: 'Missing idToken' }, 
        { status: 400 }
      );
    }

    // Create session cookie (5 days)
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days in milliseconds
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
    
    // Create response
    const response = NextResponse.json(
      { success: true },
      { status: 200 }
    );

    // Set cookie in the response
    response.cookies.set('session', sessionCookie, {
      maxAge: expiresIn / 1000, // maxAge expects seconds
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json(
      { error: 'Unauthorized request' },
      { status: 401 }
    );
  }
}

export async function DELETE() {
  // Create response
  const response = NextResponse.json(
    { success: true },
    { status: 200 }
  );

  // Clear the session cookie
  response.cookies.delete('session');
    
  return response;
}