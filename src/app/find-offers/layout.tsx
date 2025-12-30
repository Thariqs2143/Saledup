
'use client';

import type { PropsWithChildren } from "react";

export default function FindOffersLayout({ children }: PropsWithChildren) {
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <main className="flex-1">
                {children}
            </main>
        </div>
    );
}
