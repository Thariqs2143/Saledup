'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight, QrCode, Store, Users, Sparkles, ShieldCheck, Zap } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
            <span className="font-bold text-3xl text-primary tracking-wider">
                Saledup
            </span>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/login" passHref>
             <Button variant="ghost">Owner Login</Button>
          </Link>
          <Link href="/login" passHref>
             <Button className="bg-[#0C2A6A] hover:bg-[#0C2A6A]/90">
                Get Started Free
             </Button>
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 text-center flex flex-col items-center">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight max-w-4xl">
                The Easiest Way to Boost Your Local Business
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl">
                Turn your physical storefront into a digital powerhouse with a single QR code. Create instant offers, attract more customers, and watch your sales grow. No app needed.
            </p>
            <div className="mt-8">
                <Link href="/login" passHref>
                    <Button size="lg" className="bg-[#0C2A6A] hover:bg-[#0C2A6A]/90 text-lg h-12 px-8">
                        Start Your 14-Day Free Trial <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                </Link>
            </div>
             <div className="mt-16 w-full max-w-4xl">
                 <Image
                    src="https://res.cloudinary.com/dnkghymx5/image/upload/v1762241011/Generated_Image_November_04_2025_-_12_50PM_1_hslend.png"
                    alt="Saledup Dashboard Preview"
                    width={1200}
                    height={785}
                    className="rounded-lg shadow-2xl border"
                />
            </div>
        </section>

        {/* How It Works Section */}
        <section className="bg-muted py-20 md:py-24">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 className="text-3xl md:text-4xl font-bold">How It Works</h2>
                <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                    Three simple steps to bring more customers through your door.
                </p>
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                    <div className="flex flex-col items-center">
                        <div className="p-5 bg-primary/10 rounded-full mb-4">
                            <Sparkles className="h-10 w-10 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold">1. Create an Offer</h3>
                        <p className="mt-2 text-muted-foreground">Use our simple dashboard to create discounts or special deals in seconds. Our AI can even help you write catchy descriptions.</p>
                    </div>
                     <div className="flex flex-col items-center">
                        <div className="p-5 bg-primary/10 rounded-full mb-4">
                            <QrCode className="h-10 w-10 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold">2. Display Your QR</h3>
                        <p className="mt-2 text-muted-foreground">Print your unique, permanent Shop QR Code. Place it on your counter, window, or menu for customers to scan.</p>
                    </div>
                     <div className="flex flex-col items-center">
                        <div className="p-5 bg-primary/10 rounded-full mb-4">
                            <Users className="h-10 w-10 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold">3. Engage Customers</h3>
                        <p className="mt-2 text-muted-foreground">Customers scan the code to see your offers. When they claim a deal, you capture their contact info and get a new loyal customer.</p>
                    </div>
                </div>
            </div>
        </section>
        
        {/* Features for Shop Owner */}
        <section className="py-20 md:py-24">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-8">
                     <div>
                        <div className="inline-flex items-center justify-center bg-primary/10 text-primary rounded-lg p-3 mb-4">
                            <Store className="h-7 w-7" />
                        </div>
                        <h3 className="text-2xl font-bold">Effortless Digital Presence</h3>
                        <p className="mt-2 text-muted-foreground">Get a dynamic digital storefront without the cost and complexity of building your own website or app. Manage everything from one simple dashboard.</p>
                    </div>
                     <div>
                        <div className="inline-flex items-center justify-center bg-primary/10 text-primary rounded-lg p-3 mb-4">
                            <Sparkles className="h-7 w-7" />
                        </div>
                        <h3 className="text-2xl font-bold">AI-Powered Marketing</h3>
                        <p className="mt-2 text-muted-foreground">Struggling with what to write? Our AI helps you craft compelling offer descriptions from just a photo, saving you time and boosting engagement.</p>
                    </div>
                     <div>
                        <div className="inline-flex items-center justify-center bg-primary/10 text-primary rounded-lg p-3 mb-4">
                            <Users className="h-7 w-7" />
                        </div>
                        <h3 className="text-2xl font-bold">Valuable Customer Insights</h3>
                        <p className="mt-2 text-muted-foreground">See a live feed of who is claiming your offers. Build a customer list you can use for future promotions and announcements, all with zero effort.</p>
                    </div>
                </div>
                 <div className="hidden md:block">
                     <Image
                        src="https://picsum.photos/seed/shopowner/800/1000"
                        alt="Happy shop owner"
                        width={800}
                        height={1000}
                        className="rounded-lg shadow-lg"
                        data-ai-hint="happy shop owner"
                    />
                </div>
            </div>
        </section>
        
        {/* Features for Customer */}
        <section className="bg-muted py-20 md:py-24">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-12 items-center">
                <div className="hidden md:block">
                     <Image
                        src="https://picsum.photos/seed/customer/800/1000"
                        alt="Customer scanning QR code"
                        width={800}
                        height={1000}
                        className="rounded-lg shadow-lg"
                        data-ai-hint="customer scanning qr"
                    />
                </div>
                 <div className="space-y-8">
                     <div>
                        <div className="inline-flex items-center justify-center bg-primary/10 text-primary rounded-lg p-3 mb-4">
                            <Zap className="h-7 w-7" />
                        </div>
                        <h3 className="text-2xl font-bold">Frictionless & Instant</h3>
                        <p className="mt-2 text-muted-foreground">No app to download, no account to create. Customers just scan with their camera and instantly see your deals. It's the fastest way to get an offer.</p>
                    </div>
                     <div>
                        <div className="inline-flex items-center justify-center bg-primary/10 text-primary rounded-lg p-3 mb-4">
                            <ShieldCheck className="h-7 w-7" />
                        </div>
                        <h3 className="text-2xl font-bold">Simple & Secure</h3>
                        <p className="mt-2 text-muted-foreground">Claiming a deal only requires a name and email. Redemption is handled via a unique, one-time-use QR code, ensuring every claim is legitimate.</p>
                    </div>
                </div>
            </div>
        </section>

        {/* Final CTA */}
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 text-center flex flex-col items-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Ready to Grow Your Business?</h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
                Join hundreds of local businesses who are using Saledup to connect with customers and increase sales.
            </p>
            <div className="mt-8">
                <Link href="/login" passHref>
                    <Button size="lg" className="bg-[#0C2A6A] hover:bg-[#0C2A6A]/90 text-lg h-12 px-8">
                        Get Started for Free
                    </Button>
                </Link>
            </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-foreground text-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 flex justify-between items-center">
          <p className="text-sm">&copy; {new Date().getFullYear()} Saledup. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="#" className="text-sm hover:underline">Terms</Link>
            <Link href="#" className="text-sm hover:underline">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
