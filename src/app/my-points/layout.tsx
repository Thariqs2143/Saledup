
'use client';

import type { PropsWithChildren } from "react";

export default function MyPointsLayout({ children }: PropsWithChildren) {
    return (
        <div className="flex flex-col min-h-screen bg-muted/30">
            <main className="flex-1 flex items-center justify-center py-12 px-4">
                {children}
            </main>
        </div>
    );
}
