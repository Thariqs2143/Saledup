import type { NextConfig } from 'next';
import nextPWA from 'next-pwa';

const withPWA = nextPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // PWA disabled in dev
  customWorkerDir: 'public', // Tell next-pwa to look for a custom worker
  customWorkerSrc: '/firebase-messaging-sw.js', // The custom worker file
  customWorkerDest: 'sw.js', // The output service worker file
});

const nextConfig: NextConfig = {
  reactStrictMode: false, // 👈 Important: prevents Leaflet double-init error in dev
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};

const config = process.env.TURBOPACK ? nextConfig : withPWA(nextConfig);

export default config;
