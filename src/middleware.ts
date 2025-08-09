export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/daily/:path*', '/monthly/:path*', '/yearly/:path*', '/api/sync'],
};


