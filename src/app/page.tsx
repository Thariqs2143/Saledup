
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const SaledupLogo = ({ className }: { className?: string }) => (
    <svg 
        className={cn("h-16 w-16 text-primary", className)} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
    >
        <rect x="4" y="4" width="6" height="6" rx="1" fill="currentColor"/>
        <rect x="4" y="14" width="6" height="6" rx="1" fill="currentColor"/>
        <rect x="14" y="4" width="6" height="6" rx="1" fill="currentColor"/>
        <path d="M14 14H15V15H14V14Z" fill="currentColor"/>
        <path d="M16 14H17V15H16V14Z" fill="currentColor"/>
        <path d="M18 14H19V15H18V14Z" fill="currentColor"/>
        <path d="M20 14H21V15H20V14Z" fill="currentColor"/>
        <path d="M14 16H15V17H14V16Z" fill="currentColor"/>
        <path d="M14 18H15V19H14V18Z" fill="currentColor"/>
        <path d="M14 20H15V21H14V20Z" fill="currentColor"/>
        <path d="M16 16H17V17H16V16Z" fill="currentColor"/>
        <path d="M18 18H19V19H18V18Z" fill="currentColor"/>
        <path d="M20 20H21V21H20V20Z" fill="currentColor"/>
        <path d="M16 20H17V21H16V20Z" fill="currentColor"/>
        <path d="M17 17H18V18H17V17Z" fill="currentColor"/>
        <path d="M19 19H20V20H19V19Z" fill="currentColor"/>
        <path d="M17 19H18V20H17V19Z" fill="currentColor"/>
        <path d="M19 17H20V18H19V17Z" fill="currentColor"/>
    </svg>
);


export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
        router.replace('/login');
    }, 1500); // Show splash screen for 1.5 seconds

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <SaledupLogo />
        <p className="text-xl font-bold text-primary tracking-widest">SALEDUP</p>
      </div>
    </div>
  );
}
