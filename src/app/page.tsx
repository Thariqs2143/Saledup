'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, X, Store, ShoppingBag, Users, QrCode, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';


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


export default function LandingPage() {
  const [showBanner, setShowBanner] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Top Banner */}
      {showBanner && (
        <div className="relative bg-primary text-primary-foreground py-2.5 px-4 text-center text-sm font-medium">
            <Sparkles className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 hidden md:inline-block" />
            <span>Upgrade to Pro and unlock powerful new features!</span>
            <button onClick={() => setShowBanner(false)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-white/20">
                <X className="h-4 w-4" />
                <span className="sr-only">Dismiss</span>
            </button>
        </div>
      )}

      {/* Header */}
      <header className={cn(
          "sticky top-0 z-50 transition-all duration-300",
          isScrolled ? "bg-background/80 backdrop-blur-sm shadow-md" : "bg-transparent"
        )}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-foreground">
              <SaledupLogo />
              <span className="font-bold text-xl tracking-wide">
                  Saledup
              </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="#" className="text-foreground/80 hover:text-foreground">Home</Link>
            <Link href="#" className="text-foreground/80 hover:text-foreground">About</Link>
            <Link href="#" className="text-foreground/80 hover:text-foreground">Pricing</Link>
            <Link href="#" className="text-foreground/80 hover:text-foreground">FAQ</Link>
            <Link href="#" className="text-foreground/80 hover:text-foreground">Contact</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" passHref>
               <Button variant="outline">Get Started</Button>
            </Link>
            <Link href="/login" passHref>
               <Button>
                  Go Pro
               </Button>
            </Link>
          </div>
        </div>
      </header>


      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
            <div className="flex flex-col items-start text-left">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
                    Turn Foot Traffic into Loyal Customers.
                </h1>
                <p className="mt-6 text-base md:text-lg text-muted-foreground">
                    Saledup is the ultimate tool for local businesses to thrive in the digital age. Connect with customers through a simple QR code, launch real-time offers, track engagement, and watch your business grow—no app downloads required.
                </p>
                <div className="mt-8 flex gap-4">
                    <Link href="/login" passHref>
                        <Button size="lg" className="h-11 px-6">
                            Start Growing Today <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                     <Link href="#" passHref>
                        <Button size="lg" variant="outline" className="h-11 px-6">
                            Learn More
                        </Button>
                    </Link>
                </div>
            </div>
             <div className="hidden md:block">
                 <Image
                    src="https://res.cloudinary.com/dyov4r11v/image/upload/v1762585069/WhatsApp_Image_2025-11-08_at_12.26.33_9ac0131f_qj21tx.jpg"
                    alt="Saledup engagement illustration"
                    width={1200}
                    height={785}
                    className="rounded-lg"
                />
            </div>
        </section>

        {/* Visualize Your Growth Section */}
        <section className="bg-muted/30 py-20 sm:py-24">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <div className="inline-block bg-primary/10 text-primary font-semibold py-1 px-4 rounded-full text-sm mb-4">
                    From Empty to Extraordinary
                </div>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                    Visualize Your Growth
                </h2>
                <p className="mt-4 max-w-2xl mx-auto text-muted-foreground text-lg">
                    See the tangible impact Saledup can have on your business, transforming quiet moments into bustling opportunities.
                </p>

                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {/* Without Saledup Card */}
                    <div className="bg-background/50 rounded-xl p-8 text-center">
                        <h3 className="text-xl font-bold text-muted-foreground">Without Saledup</h3>
                        <div className="my-8 flex items-center justify-center h-32">
                           <div className="p-6 bg-muted rounded-full">
                                <Store className="h-16 w-16 text-muted-foreground/60" />
                           </div>
                        </div>
                        <p className="text-muted-foreground">
                            Waiting for customers and relying on traditional marketing.
                        </p>
                    </div>

                    {/* With Saledup Card */}
                    <div className="border-2 border-primary/50 bg-primary/5 rounded-xl p-8 text-center shadow-lg shadow-primary/10 relative overflow-hidden">
                        <h3 className="text-xl font-bold text-primary">With Saledup</h3>
                         <div className="my-8 flex items-center justify-center h-32 relative">
                            <div className="absolute bg-primary/10 rounded-full h-40 w-40 animate-pulse"></div>
                            <div className="absolute bg-primary/20 rounded-full h-32 w-32"></div>
                            
                            <div className="relative p-6 bg-primary text-primary-foreground rounded-full shadow-md">
                                <ShoppingBag className="h-16 w-16" />
                            </div>

                            <div className="absolute top-0 left-10 p-2 bg-background rounded-full shadow-md animate-bounce">
                                <QrCode className="h-5 w-5 text-primary" />
                            </div>
                             <div className="absolute top-4 right-8 p-2 bg-background rounded-full shadow-md animate-bounce" style={{ animationDelay: '0.2s' }}>
                                <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div className="absolute bottom-2 right-12 p-2 bg-background rounded-full shadow-md animate-bounce" style={{ animationDelay: '0.4s' }}>
                                <TrendingUp className="h-5 w-5 text-primary" />
                            </div>
                        </div>
                        <p className="text-foreground font-medium">
                            Attracting new customers, rewarding loyal ones, and boosting sales effortlessly.
                        </p>
                    </div>
                </div>
            </div>
        </section>

      </main>

    </div>
  );
}
