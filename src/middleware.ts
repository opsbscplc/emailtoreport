export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/daily/:path*', '/weekly/:path*', '/monthly/:path*', '/yearly/:path*', '/sync/:path*', '/api/sync'],
};


