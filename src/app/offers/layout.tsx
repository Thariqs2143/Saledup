
'use client';

import { LandingFooter } from "@/components/landing-footer";
import { LandingHeader } from "@/components/landing-header";
import type { PropsWithChildren } from "react";

export default function OffersLayout({ children }: PropsWithChildren) {
    return (
        <div className="flex flex-col min-h-screen bg-muted/30">
            <LandingHeader />
            <main className="flex-1 py-8 md:py-12">
                {children}
            </main>
            <LandingFooter />
        </div>
    );
}
