
'use client';

import { LandingFooter } from "@/components/landing-footer";
import { LandingHeader } from "@/components/landing-header";
import type { PropsWithChildren } from "react";

export default function FindOffersLayout({ children }: PropsWithChildren) {
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <LandingHeader />
            <main className="flex-1">
                {children}
            </main>
            <LandingFooter />
        </div>
    );
}
