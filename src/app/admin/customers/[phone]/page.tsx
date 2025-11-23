
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, User as UserIcon, Calendar, CheckCircle, IndianRupee, Repeat, Star, Award, Gift, MessageSquare, Phone, Trash2 } from 'lucide-react';
import { doc, getDoc, collection, query, where, onSnapshot, orderBy, Timestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
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

type CustomerProfile = {
    name: string;
    phone: string;
    saledupPoints?: number;
    email?: string;
    createdAt: Timestamp;
};

type Claim = {
    id: string;
    offerTitle: string;
    offerId: string;
    claimedAt: Timestamp;
    status: 'claimed' | 'redeemed';
    approximateValue?: number;
};

type Review = {
    id: string;
    name: string;
    rating: number;
    comment: string;
    createdAt: Timestamp;
};

const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
            <Star
                key={star}
                className={`h-4 w-4 ${rating >= star ? "text-amber-400 fill-amber-400" : "text-muted-foreground/50"}`}
            />
        ))}
    </div>
);

export default function AdminCustomerDetailPage() {
    const router = useRouter();
    const params = useParams();
    const phone = params.phone as string;
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    
    const [profile, setProfile] = useState<CustomerProfile | null>(null);
    const [claims, setClaims] = useState<Claim[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
             if (!user) {
                router.replace('/login');
            } else {
                setAuthUser(user);
            }
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!authUser || !phone) return;

        setLoading(true);
        const unsubscribers: (() => void)[] = [];

        const fetchCustomerData = async () => {
            try {
                // Fetch Customer Profile from global collection
                const customerDocRef = doc(db, 'customers', phone);
                const customerSnap = await getDoc(customerDocRef);

                if (customerSnap.exists()) {
                    setProfile(customerSnap.data() as CustomerProfile);
                } else {
                    // Fallback: create a temporary profile from claims if global one doesn't exist
                    const claimsQuery = query(
                        collection(db, 'shops', authUser.uid, 'claims'), 
                        where('customerPhone', '==', phone),
                        orderBy('claimedAt', 'asc'),
                        limit(1)
                    );
                    const claimsSnap = await getDocs(claimsQuery);
                    if (!claimsSnap.empty) {
                        const firstClaim = claimsSnap.docs[0].data();
                        setProfile({
                            name: firstClaim.customerName,
                            phone: firstClaim.customerPhone,
                            email: firstClaim.customerEmail,
                            saledupPoints: 0,
                            createdAt: firstClaim.claimedAt,
                        });
                    } else {
                        throw new Error("Customer not found");
                    }
                }

                // Listen for Claims
                const claimsQuery = query(
                    collection(db, 'shops', authUser.uid, 'claims'), 
                    where('customerPhone', '==', phone),
                    orderBy('claimedAt', 'desc')
                );
                const unsubscribeClaims = onSnapshot(claimsQuery, (snapshot) => {
                    const claimsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Claim));
                    setClaims(claimsList);
                }, (error) => {
                    console.error("Error fetching claims:", error);
                    toast({ title: "Error", description: "Could not load customer claims.", variant: "destructive" });
                });
                unsubscribers.push(unsubscribeClaims);

                // Listen for Reviews
                const reviewsQuery = query(
                    collection(db, 'shops', authUser.uid, 'reviews'),
                    where('customerPhone', '==', phone),
                    orderBy('createdAt', 'desc')
                );
                const unsubscribeReviews = onSnapshot(reviewsQuery, (snapshot) => {
                    const reviewsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
                    setReviews(reviewsList);
                }, (error) => {
                    console.error("Error fetching reviews:", error);
                    toast({ title: "Error", description: "Could not load customer reviews.", variant: "destructive" });
                });
                unsubscribers.push(unsubscribeReviews);

            } catch (error) {
                console.error("Error loading customer data:", error);
                toast({ title: "Error loading customer", description: (error as Error).message, variant: "destructive" });
                router.push('/admin/customers');
            } finally {
                setLoading(false);
            }
        };

        fetchCustomerData();

        return () => {
            unsubscribers.forEach(unsub => unsub());
        }

    }, [authUser, phone, router, toast]);

    const stats = useMemo(() => {
        const totalClaims = claims.length;
        const totalSpend = claims.reduce((sum, claim) => sum + (claim.approximateValue || 0), 0);
        const firstClaimDate = claims.length > 0 ? claims[claims.length - 1].claimedAt.toDate() : new Date();
        
        let status: 'New' | 'Repeat' | 'Loyal' = 'New';
        if (totalClaims > 5) status = 'Loyal';
        else if (totalClaims > 1) status = 'Repeat';

        return { totalClaims, totalSpend, firstClaimDate, status };
    }, [claims]);
    
    const handleStatusToggle = async (claimId: string, currentStatus: 'claimed' | 'redeemed') => {
        if (!authUser) return;
        const newStatus = currentStatus === 'claimed' ? 'redeemed' : 'claimed';
        const claimDocRef = doc(db, 'shops', authUser.uid, 'claims', claimId);
        try {
            await updateDoc(claimDocRef, { status: newStatus });
            toast({ title: "Status Updated", description: `Claim marked as ${newStatus}.`});
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Could not update claim status.", variant: "destructive" });
        }
    };
    
    const handleDeleteClaim = async (claimId: string) => {
        if (!authUser) return;
        const claimDocRef = doc(db, 'shops', authUser.uid, 'claims', claimId);
        try {
            await deleteDoc(claimDocRef);
            toast({ title: "Claim Deleted", description: "The customer claim has been removed."});
        } catch (error) {
            console.error(error);
             toast({ title: "Error", description: "Could not delete the claim.", variant: "destructive" });
        }
    };


    if (loading) {
        return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
    }

    if (!profile) {
        return (
             <div className="text-center">
                <p>Customer not found.</p>
                <Link href="/admin/customers"><Button variant="link">Go Back</Button></Link>
             </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/admin/customers">
                    <Button variant="outline" size="icon" className="h-8 w-8">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Back</span>
                    </Button>
                </Link>
                <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-primary">
                        <AvatarFallback>{profile.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{profile.name}</h1>
                        <Badge variant={stats.status === 'Loyal' ? 'default' : 'secondary'}>{stats.status} Customer</Badge>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card><CardHeader><CardTitle>Total Claims</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{stats.totalClaims}</p></CardContent></Card>
                <Card><CardHeader><CardTitle>Total Spend</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">₹{stats.totalSpend.toFixed(2)}</p></CardContent></Card>
                <Card><CardHeader><CardTitle>Loyalty Points</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{profile.saledupPoints || 0}</p></CardContent></Card>
                <Card><CardHeader><CardTitle>First Visit</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{format(stats.firstClaimDate, 'PP')}</p></CardContent></Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5"/> Claim History</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {claims.length === 0 ? (
                            <p className="text-muted-foreground">This customer has not claimed any offers yet.</p>
                        ) : (
                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                {claims.map(claim => (
                                    <div key={claim.id} className="border-b last:border-b-0 pb-4">
                                        <div className="flex justify-between items-start gap-2">
                                            <div>
                                                <p className="font-semibold">{claim.offerTitle}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Claimed {formatDistanceToNow(claim.claimedAt.toDate(), {addSuffix: true})}
                                                </p>
                                            </div>
                                            <Badge variant={claim.status === 'claimed' ? 'default' : 'secondary'}>
                                                {claim.status}
                                            </Badge>
                                        </div>
                                         <div className="flex justify-end gap-2 mt-2">
                                            <Button size="sm" variant="outline" onClick={() => handleStatusToggle(claim.id, claim.status)}>
                                                <CheckCircle className="mr-2 h-4 w-4"/> Mark Redeemed
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button size="icon" variant="destructive" className="h-9 w-9">
                                                        <Trash2 className="h-4 w-4"/>
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>Delete this claim?</AlertDialogTitle><AlertDialogDescription>This will remove the claim for "{claim.offerTitle}". It cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteClaim(claim.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
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

                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5"/> Reviews ({reviews.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {reviews.length === 0 ? (
                            <p className="text-muted-foreground">This customer has not left any reviews yet.</p>
                        ) : (
                             <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                {reviews.map(review => (
                                    <div key={review.id} className="border-b last:border-b-0 pb-4">
                                        <div className="flex justify-between items-center">
                                            <StarRating rating={review.rating} />
                                            {review.createdAt && (
                                                <p className="text-xs text-muted-foreground">{formatDistanceToNow(review.createdAt.toDate(), { addSuffix: true })}</p>
                                            )}
                                        </div>
                                        <p className="mt-2 text-sm text-muted-foreground">{review.comment}</p>
                                    </div>
                                ))}
                             </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
