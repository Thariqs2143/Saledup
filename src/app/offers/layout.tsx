
'use client';

import type { PropsWithChildren } from "react";

export default function OffersLayout({ children }: PropsWithChildren) {
    return (
        <div className="flex flex-col min-h-screen bg-muted/30">
            <main className="flex-1 py-8 md:py-12">
                {children}
            </main>
        </div>
    );
}
