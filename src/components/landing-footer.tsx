'use client';

import Link from 'next/link';
import { ThemeSwitcher } from './theme-switcher';

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


export function LandingFooter() {
    return (
        <footer className="bg-muted/20 border-t">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Saledup Info */}
                    <div className="col-span-1 md:col-span-2">
                        <Link href="/" className="flex items-center gap-2.5 text-foreground mb-4">
                            <SaledupLogo />
                            <span className="font-bold text-xl tracking-wide">
                                Saledup
                            </span>
                        </Link>
                        <p className="text-muted-foreground text-sm max-w-sm">
                             Saledup connects local shops with customers through a simple QR code. Display real-time offers, track engagement, and watch your walk-ins grow.
                        </p>
                    </div>

                    {/* Navigation */}
                    <div>
                        <h3 className="font-semibold text-foreground mb-4 tracking-wider">NAVIGATION</h3>
                        <ul className="space-y-3 text-sm">
                            <li><Link href="#" className="text-muted-foreground hover:text-primary">Home</Link></li>
                            <li><Link href="#" className="text-muted-foreground hover:text-primary">About</Link></li>
                            <li><Link href="#" className="text-muted-foreground hover:text-primary">Pricing</Link></li>
                            <li><Link href="#" className="text-muted-foreground hover:text-primary">FAQ</Link></li>
                            <li><Link href="#" className="text-muted-foreground hover:text-primary">Contact</Link></li>
                        </ul>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="font-semibold text-foreground mb-4 tracking-wider">QUICK LINKS</h3>
                         <ul className="space-y-3 text-sm">
                            <li><Link href="/login" className="text-muted-foreground hover:text-primary">Shop Owner Portal</Link></li>
                            <li><Link href="#" className="text-muted-foreground hover:text-primary">Terms of Service</Link></li>
                            <li><Link href="#" className="text-muted-foreground hover:text-primary">Privacy Policy</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t flex justify-between items-center text-sm text-muted-foreground">
                    <p>&copy; {new Date().getFullYear()} Saledup. All rights reserved.</p>
                    <ThemeSwitcher />
                </div>
            </div>
        </footer>
    );
}
