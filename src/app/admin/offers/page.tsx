
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, Tag, Check, X, Users, Eye, Edit, BarChart3 } from "lucide-react";
import Link from 'next/link';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, type Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Label } from "@/components/ui/label";
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';

type Offer = {
    id: string;
    title: string;
    imageUrl?: string;
    isActive: boolean;
    claimCount: number;
    viewCount?: number;
    createdAt: Timestamp;
};

export default function AdminOffersPage() {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                setAuthUser(user);
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribeAuth();
    }, [router]);

    useEffect(() => {
        if (!authUser) return;

        const offersQuery = query(collection(db, 'shops', authUser.uid, 'offers'), orderBy('createdAt', 'desc'));
        
        const unsubscribe = onSnapshot(offersQuery, (snapshot) => {
            const offersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Offer));
            setOffers(offersList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching offers: ", error);
             const permissionError = new FirestorePermissionError({
              path: `shops/${authUser.uid}/offers`,
              operation: 'list'
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({ title: "Permission Denied", description: "You don't have permission to view offers.", variant: "destructive"});
            setLoading(false);
        });

        return () => unsubscribe();
    }, [authUser, toast]);
    
    const handleStatusToggle = async (offerId: string, currentStatus: boolean) => {
        if (!authUser) return;
        const offerDocRef = doc(db, 'shops', authUser.uid, 'offers', offerId);
        try {
            await updateDoc(offerDocRef, { isActive: !currentStatus });
            toast({
                title: "Status Updated",
                description: `Offer has been ${!currentStatus ? 'activated' : 'deactivated'}.`
            });
        } catch (error) {
            console.error("Error updating status:", error);
            const permissionError = new FirestorePermissionError({
              path: offerDocRef.path,
              operation: 'update',
              requestResourceData: { isActive: !currentStatus }
            });
            errorEmitter.emit('permission-error', permissionError);
            toast({ title: "Update Failed", description: "You don't have permission to change the status.", variant: "destructive" });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Manage Offers</h1>
                    <p className="text-muted-foreground hidden sm:block">Here you can create, view, and manage all your offers.</p>
                </div>
                 <div className="flex gap-2">
                    <Button asChild>
                        <Link href="/admin/offers/add">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create New Offer
                        </Link>
                    </Button>
                     <Button asChild variant="outline">
                        <Link href="/admin/analytics">
                           <BarChart3 className="mr-2 h-4 w-4" />
                            View Analytics
                        </Link>
                    </Button>
                </div>
            </div>
            
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : offers.length === 0 ? (
                <Card className="text-center py-20">
                    <CardHeader>
                        <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
                            <Tag className="h-10 w-10 text-primary" />
                        </div>
                        <CardTitle className="mt-4">No Offers Yet</CardTitle>
                        <CardDescription>Get started by creating your first offer for your customers.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/admin/offers/add">Create First Offer</Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {offers.map(offer => (
                        <Card key={offer.id} className="flex flex-col">
                            <CardHeader className="relative p-0">
                                <Badge className="absolute top-2 right-2 z-10" variant={offer.isActive ? 'secondary' : 'destructive'}>
                                    {offer.isActive ? <><Check className="mr-1 h-3 w-3"/> Active</> : <><X className="mr-1 h-3 w-3"/> Inactive</>}
                                </Badge>
                                <Image 
                                    src={offer.imageUrl || `https://placehold.co/600x400?text=${offer.title.replace(/\s/g, '+')}`}
                                    alt={offer.title}
                                    width={600}
                                    height={400}
                                    className="aspect-video object-cover rounded-t-lg"
                                />
                            </CardHeader>
                            <CardContent className="p-4 flex-1">
                                <h3 className="font-bold text-lg truncate">{offer.title}</h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Created {formatDistanceToNow(offer.createdAt.toDate(), { addSuffix: true })}
                                </p>
                               <div className="flex items-center justify-between gap-4 mt-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        <span>{offer.claimCount || 0} claims</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Eye className="h-4 w-4" />
                                        <span>{offer.viewCount || 0} views</span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="p-4 border-t flex justify-between items-center gap-2">
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        id={`status-${offer.id}`}
                                        checked={offer.isActive}
                                        onCheckedChange={() => handleStatusToggle(offer.id, offer.isActive)}
                                    />
                                    <Label htmlFor={`status-${offer.id}`} className="text-sm">
                                        {offer.isActive ? 'Active' : 'Inactive'}
                                    </Label>
                                </div>
                                <Button asChild variant="outline" size="sm">
                                    <Link href={`/admin/offers/${offer.id}`}>
                                        <Edit className="h-3 w-3 mr-1.5"/> Edit
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
