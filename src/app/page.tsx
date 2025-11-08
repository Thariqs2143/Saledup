'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

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
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
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
                    src="https://res.cloudinary.com/dnkghymx5/image/upload/v1762241011/Generated_Image_November_04_2025_-_12_50PM_1_hslend.png"
                    alt="Saledup engagement illustration"
                    width={1200}
                    height={785}
                    className="rounded-lg"
                />
            </div>
        </section>

      </main>

    </div>
  );
}