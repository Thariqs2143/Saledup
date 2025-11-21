
'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import React, { useEffect, useState } from "react";
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2, Send } from "lucide-react";

export default function AdminSupportPage() {
    const { toast } = useToast();
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [shopName, setShopName] = useState('');
    const [ownerEmail, setOwnerEmail] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setAuthUser(user);
                const shopDocRef = doc(db, 'shops', user.uid);
                const shopSnap = await getDoc(shopDocRef);
                if (shopSnap.exists()) {
                    const data = shopSnap.data();
                    setShopName(data.shopName || '');
                    setOwnerEmail(data.ownerEmail || user.email || '');
                }
                 setLoading(false);
            } else {
                 setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        // Simulate API call
        setTimeout(() => {
            toast({
                title: "Message Sent!",
                description: "Thanks for reaching out. Our support team will get back to you shortly.",
            });
            (e.target as HTMLFormElement).reset();
            setSubmitting(false);
        }, 1000);
    };

    if (loading) {
        return (
             <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Help & Support</h1>
            <p className="text-muted-foreground">Have a question or need help? Fill out the form below.</p>
        </div>
        
        <Card>
            <form onSubmit={handleSubmit}>
                <CardHeader>
                    <CardTitle>Contact Support</CardTitle>
                    <CardDescription>Our team typically responds within 24 hours.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                     <div className="grid sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="shopName">Shop Name</Label>
                            <Input id="shopName" value={shopName} readOnly disabled />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Your Email</Label>
                            <Input id="email" type="email" value={ownerEmail} readOnly disabled />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input id="subject" name="subject" placeholder="e.g., Issue with offer creation" required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="message">Message</Label>
                        <Textarea id="message" name="message" placeholder="Please describe your issue or question in detail." required rows={8} />
                    </div>
                </CardContent>
                <CardContent className="border-t pt-6 flex justify-end">
                    <Button type="submit" disabled={submitting}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Send className="mr-2 h-4 w-4"/>
                        Send Message
                    </Button>
                </CardContent>
            </form>
        </Card>
    </div>
  );
}
