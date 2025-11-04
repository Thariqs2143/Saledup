
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from "@/lib/utils";
import { Loader2, Save, Megaphone, Info, CheckCircle, AlertTriangle, Trash2 } from "lucide-react";
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export type Announcement = {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning';
    isActive: boolean;
    createdAt: Date;
};

const AnnouncementIcon = ({ type, className }: { type: Announcement['type'], className?: string}) => {
    switch (type) {
        case 'success': return <CheckCircle className={cn("h-5 w-5 text-green-500", className)} />;
        case 'warning': return <AlertTriangle className={cn("h-5 w-5 text-amber-500", className)} />;
        case 'info':
        default:
            return <Info className={cn("h-5 w-5 text-blue-500", className)} />;
    }
};

export default function SuperAdminAnnouncementsPage() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();
    
    // Form state for new announcement
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState<Announcement['type']>('info');

    useEffect(() => {
        const configDocRef = doc(db, "platform_config", "announcements");
        const unsubscribe = onSnapshot(configDocRef, (docSnap) => {
            if (docSnap.exists() && docSnap.data().all) {
                const fetchedAnnouncements = docSnap.data().all.map((ann: any) => ({
                    ...ann,
                    createdAt: ann.createdAt.toDate(),
                }));
                setAnnouncements(fetchedAnnouncements.sort((a: Announcement, b: Announcement) => b.createdAt.getTime() - a.createdAt.getTime()));
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleSaveAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !message) {
            toast({ title: "Missing fields", description: "Please provide a title and message.", variant: "destructive" });
            return;
        }
        setSaving(true);
        try {
            const newAnnouncement: Announcement = {
                id: `annc_${Date.now()}`,
                title,
                message,
                type,
                isActive: true,
                createdAt: new Date(),
            };
            
            const updatedAnnouncements = [newAnnouncement, ...announcements];

            const configDocRef = doc(db, "platform_config", "announcements");
            await setDoc(configDocRef, { all: updatedAnnouncements }, { merge: true });
            
            toast({ title: "Announcement Published!", description: "The new announcement is now live." });
            setTitle('');
            setMessage('');
            setType('info');

        } catch (error) {
            console.error("Error saving announcement:", error);
            toast({ title: "Save Failed", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };
    
    const handleToggleActive = async (announcement: Announcement) => {
        const updatedAnnouncements = announcements.map(ann => 
            ann.id === announcement.id ? { ...ann, isActive: !ann.isActive } : ann
        );
        setAnnouncements(updatedAnnouncements); // Optimistic update
        try {
            const configDocRef = doc(db, "platform_config", "announcements");
            await setDoc(configDocRef, { all: updatedAnnouncements }, { merge: true });
            toast({ title: "Status Updated", description: `Announcement has been ${!announcement.isActive ? 'activated' : 'deactivated'}.` });
        } catch (error) {
            toast({ title: "Update Failed", variant: "destructive" });
            setAnnouncements(announcements); // Revert on failure
        }
    };
    
    const handleDelete = async (announcementId: string) => {
        const updatedAnnouncements = announcements.filter(ann => ann.id !== announcementId);
        try {
            const configDocRef = doc(db, "platform_config", "announcements");
            await setDoc(configDocRef, { all: updatedAnnouncements }, { merge: true });
             toast({ title: "Announcement Deleted", description: "The announcement has been removed." });
        } catch (error) {
            toast({ title: "Delete Failed", variant: "destructive" });
        }
    }


    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Platform Announcements</h1>
                <p className="text-muted-foreground">Communicate with all users of the platform.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Create New Announcement</CardTitle>
                        <CardDescription>This will be shown to all users.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSaveAnnouncement} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title</Label>
                                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Scheduled Maintenance" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="message">Message</Label>
                                <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="e.g., We will be undergoing scheduled maintenance..." required />
                            </div>
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <div className="flex gap-4">
                                    <Button type="button" variant={type === 'info' ? 'default' : 'outline'} onClick={() => setType('info')}>Info</Button>
                                    <Button type="button" variant={type === 'success' ? 'secondary' : 'outline'} onClick={() => setType('success')}>Success</Button>
                                    <Button type="button" variant={type === 'warning' ? 'destructive' : 'outline'} onClick={() => setType('warning')}>Warning</Button>
                                </div>
                            </div>
                            <Button type="submit" className="w-full" disabled={saving}>
                                {saving ? <Loader2 className="animate-spin mr-2" /> : <Megaphone className="mr-2"/>}
                                Publish Announcement
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>History</CardTitle>
                        <CardDescription>A log of all past and active announcements.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         {loading ? (
                            <div className="flex items-center justify-center h-48">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : announcements.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <p>No announcements have been created yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {announcements.map(ann => (
                                    <div key={ann.id} className="border p-4 rounded-lg flex items-start gap-4">
                                        <AnnouncementIcon type={ann.type} className="mt-1" />
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center">
                                                <p className="font-bold">{ann.title}</p>
                                                <Badge variant={ann.isActive ? 'secondary' : 'outline'}>{ann.isActive ? 'Active' : 'Inactive'}</Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">{ann.message}</p>
                                            <p className="text-xs text-muted-foreground/70 mt-2">
                                                {formatDistanceToNow(ann.createdAt, { addSuffix: true })}
                                            </p>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <Switch checked={ann.isActive} onCheckedChange={() => handleToggleActive(ann)} />
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive">
                                                        <Trash2 className="h-4 w-4"/>
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Delete Announcement?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will permanently delete the announcement titled "{ann.title}". This action cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(ann.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

