
'use client';

import { useState, useEffect } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Loader2, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { Announcement } from '@/app/super-admin/announcements/page';

const AnnouncementIcon = ({ type, className }: { type: Announcement['type'], className?: string}) => {
    switch (type) {
        case 'success': return <CheckCircle className={cn("h-6 w-6 text-green-500", className)} />;
        case 'warning': return <AlertTriangle className={cn("h-6 w-6 text-amber-500", className)} />;
        case 'info':
        default:
            return <Info className={cn("h-6 w-6 text-blue-500", className)} />;
    }
};

export function AnnouncementsList() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const configDocRef = doc(db, "platform_config", "announcements");
        const unsubscribe = onSnapshot(configDocRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().all) {
                const fetchedAnnouncements = docSnap.data().all.map((ann: any) => ({
                    ...ann,
                    createdAt: ann.createdAt.toDate(),
                }));
                // Filter for active announcements and sort them
                setAnnouncements(
                    fetchedAnnouncements
                        .filter((ann: Announcement) => ann.isActive)
                        .sort((a: Announcement, b: Announcement) => b.createdAt.getTime() - a.createdAt.getTime())
                );
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Platform Updates</CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : announcements.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <Bell className="h-12 w-12 mx-auto mb-4 opacity-50"/>
                        <p>No active announcements right now.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {announcements.map(ann => (
                            <div key={ann.id} className="border p-4 rounded-lg flex items-start gap-4 shadow-sm transition-all hover:shadow-md">
                                <AnnouncementIcon type={ann.type} className="mt-1" />
                                <div className="flex-1">
                                    <p className="font-bold text-lg">{ann.title}</p>
                                    <p className="text-sm text-muted-foreground mt-1">{ann.message}</p>
                                    <p className="text-xs text-muted-foreground/70 mt-3">
                                        Posted {formatDistanceToNow(ann.createdAt, { addSuffix: true })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
