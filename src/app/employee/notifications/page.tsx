
'use client';

import { AnnouncementsList } from "@/components/announcements-list";

export default function EmployeeNotificationsPage() {

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
                <p className="text-muted-foreground">Important announcements and updates from the platform.</p>
            </div>
            <AnnouncementsList />
        </div>
    );
}
