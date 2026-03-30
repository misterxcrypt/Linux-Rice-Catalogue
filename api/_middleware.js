// api/_middleware.js - Vercel Edge Middleware for basic bot protection
import { NextResponse } from 'next/server';

export function middleware(request) {
  const userAgent = request.headers.get('user-agent') || '';
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';

  // Block suspicious user-agents
  const blockedAgents = [
    'bot',
    'spider',
    'crawler',
    'scraper',
    'wget',
    'curl',
    // Add more if needed
  ];

  if (blockedAgents.some(agent => userAgent.toLowerCase().includes(agent))) {
    return new Response('Forbidden', { status: 403 });
  }

  // Basic rate limiting (simple in-memory, for demo; use Redis in production)
  // This is very basic; in production, use a proper rate limiter
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 100; // 100 requests per minute

  // Note: This won't work in serverless; Vercel Edge has limitations
  // For production, consider using Vercel KV or external service

  // For now, just log and allow
  console.log(`Request from ${ip} with UA: ${userAgent}`);

  return NextResponse.next();
}

// Apply to image requests or all
export const config = {
  matcher: '/api/:path*',
};