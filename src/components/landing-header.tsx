
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sparkles, X } from 'lucide-react';

const SaledupLogo = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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

const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/faq', label: 'FAQ' },
    { href: '/contact', label: 'Contact' },
];

export function LandingHeader() {
  const [showBanner, setShowBanner] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={'sticky top-0 z-50 w-full'}>
      <div
        className={cn(
          'relative bg-primary text-primary-foreground transition-all duration-300',
          !showBanner && 'hidden'
        )}
      >
        <Link href="/pricing" className="block py-2.5 px-4 text-center text-sm font-medium hover:bg-primary/90">
            <div className="flex justify-center items-center gap-2">
                <Sparkles className="h-4 w-4 hidden md:inline-block" />
                <span>Upgrade to Pro and unlock powerful new features!</span>
            </div>
        </Link>
        <button
          onClick={(e) => {
              e.preventDefault();
              setShowBanner(false);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-white/20"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </button>
      </div>
      <div
        className={cn(
          'transition-all duration-300',
          isScrolled
            ? 'py-2 bg-background/80 backdrop-blur-sm rounded-full shadow-lg border mx-auto px-4 sm:px-6 lg:px-8 mt-2 max-w-6xl'
            : 'py-4 bg-background'
        )}
      >
        <div className={cn('flex items-center justify-between', !isScrolled && 'container mx-auto')}>
          <Link href="/" className="flex items-center gap-2.5 text-foreground">
            <SaledupLogo />
            <span className="font-bold text-xl tracking-wide">Saledup</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navLinks.map(link => (
                 <Link 
                    key={link.href} 
                    href={link.href} 
                    className={cn(
                        "text-foreground/80 hover:text-foreground",
                        pathname === link.href && "text-primary font-semibold"
                    )}
                >
                    {link.label}
                </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" passHref>
              <Button variant="outline">Get Started</Button>
            </Link>
            <Link href="/pricing" passHref>
              <Button>Go Pro</Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
