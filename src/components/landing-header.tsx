
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Sparkles, X, Menu, Compass } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetTitle } from '@/components/ui/sheet';


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
    { href: '/find-offers', label: 'Find Offers' },
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

  // On the /find-offers page, we want a simpler, non-floating header
  if (pathname === '/find-offers') {
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-sm">
             <div className="container mx-auto flex h-16 items-center justify-between">
                 <Link href="/" className="flex items-center gap-2.5 text-foreground">
                    <SaledupLogo />
                    <span className="font-bold text-xl tracking-wide text-primary">Saledup</span>
                </Link>
                <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                    {navLinks.map(link => (
                        <Link 
                            key={link.href} 
                            href={link.href} 
                            className={cn(
                                "text-foreground/80 hover:text-foreground flex items-center gap-1",
                                pathname === link.href && "text-primary font-semibold"
                            )}
                        >
                            {link.href === '/find-offers' && <Compass className="h-4 w-4" />}
                            {link.label}
                        </Link>
                    ))}
                </nav>
                 <div className="hidden md:flex items-center gap-2">
                    <Link href="/login" passHref>
                        <Button variant="outline">Get Started</Button>
                    </Link>
                    <Link href="/pricing" passHref>
                        <Button>Go Pro</Button>
                    </Link>
                </div>

                {/* Mobile Menu */}
                <div className="md:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Menu className="h-6 w-6"/>
                                <span className="sr-only">Open menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[300px] sm:w-[340px] p-0">
                            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                            <div className="flex flex-col h-full">
                                <div className="p-4 border-b">
                                    <Link href="/" className="flex items-center gap-2.5 text-foreground">
                                        <SaledupLogo />
                                        <span className="font-bold text-xl tracking-wide text-primary">Saledup</span>
                                    </Link>
                                </div>
                                <nav className="flex-1 flex flex-col gap-4 p-4 mt-4">
                                    {navLinks.map(link => (
                                        <SheetClose asChild key={link.href}>
                                            <Link
                                                href={link.href}
                                                className={cn(
                                                    "text-lg font-medium text-foreground/80 hover:text-primary flex items-center gap-2",
                                                    pathname === link.href && "text-primary"
                                                )}
                                            >
                                                {link.href === '/find-offers' && <Compass className="h-5 w-5" />}
                                                {link.label}
                                            </Link>
                                        </SheetClose>
                                    ))}
                                </nav>
                                <div className="p-4 mt-auto border-t">
                                    <div className="flex flex-col gap-3">
                                        <SheetClose asChild>
                                            <Link href="/login" passHref>
                                            <Button variant="outline" className="w-full">Get Started</Button>
                                            </Link>
                                        </SheetClose>
                                        <SheetClose asChild>
                                            <Link href="/pricing" passHref>
                                            <Button className="w-full">Go Pro</Button>
                                            </Link>
                                        </SheetClose>
                                    </div>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    );
  }

  // Default header for all other pages
  return (
    <header className={'sticky top-0 z-50 w-full'}>
      <div
        className={cn(
          'relative bg-primary text-primary-foreground py-2.5 px-4 text-center text-sm font-medium transition-all duration-300',
          !showBanner && 'hidden'
        )}
      >
        <Sparkles className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 hidden md:inline-block" />
        <span>Upgrade to Pro and unlock powerful new features!</span>
        <button
          onClick={() => setShowBanner(false)}
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
            <span className="font-bold text-xl tracking-wide text-primary">Saledup</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            {navLinks.map(link => (
                 <Link 
                    key={link.href} 
                    href={link.href} 
                    className={cn(
                        "text-foreground/80 hover:text-foreground flex items-center gap-1",
                        pathname === link.href && "text-primary font-semibold"
                    )}
                >
                    {link.href === '/find-offers' && <Compass className="h-4 w-4" />}
                    {link.label}
                </Link>
            ))}
          </nav>
           <div className="hidden md:flex items-center gap-2">
              <Link href="/login" passHref>
                <Button variant="outline">Get Started</Button>
              </Link>
              <Link href="/pricing" passHref>
                <Button>Go Pro</Button>
              </Link>
          </div>

          <div className="md:hidden">
              <Sheet>
                  <SheetTrigger asChild>
                      <Button variant="ghost" size="icon">
                          <Menu className="h-6 w-6"/>
                          <span className="sr-only">Open menu</span>
                      </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[300px] sm:w-[340px] p-0">
                      <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                      <div className="flex flex-col h-full">
                          <div className="p-4 border-b">
                              <Link href="/" className="flex items-center gap-2.5 text-foreground">
                                  <SaledupLogo />
                                  <span className="font-bold text-xl tracking-wide text-primary">Saledup</span>
                              </Link>
                          </div>
                          <nav className="flex-1 flex flex-col gap-4 p-4 mt-4">
                              {navLinks.map(link => (
                                  <SheetClose asChild key={link.href}>
                                      <Link
                                          href={link.href}
                                          className={cn(
                                              "text-lg font-medium text-foreground/80 hover:text-primary flex items-center gap-2",
                                              pathname === link.href && "text-primary"
                                          )}
                                      >
                                          {link.href === '/find-offers' && <Compass className="h-5 w-5" />}
                                          {link.label}
                                      </Link>
                                  </SheetClose>
                              ))}
                          </nav>
                          <div className="p-4 mt-auto border-t">
                              <div className="flex flex-col gap-3">
                                  <SheetClose asChild>
                                      <Link href="/login" passHref>
                                      <Button variant="outline" className="w-full">Get Started</Button>
                                      </Link>
                                  </SheetClose>
                                  <SheetClose asChild>
                                      <Link href="/pricing" passHref>
                                      <Button className="w-full">Go Pro</Button>
                                      </Link>
                                  </SheetClose>
                              </div>
                          </div>
                      </div>
                  </SheetContent>
              </Sheet>
          </div>

        </div>
      </div>
    </header>
  );
}
