
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, Timestamp, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building, Clock, Loader2, Mail, MapPin, Tag, User as UserIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { LandingFooter } from '@/components/landing-footer';

type Shop = {
    shopName: string;
    address: string;
    imageUrl?: string;
    businessType?: string;
};

type Offer = {
    id: string;
    title: string;
    description: string;
    imageUrl?: string;
    discountType: string;
    discountValue?: string;
    terms?: string;
    createdAt: Timestamp;
};

export default function ShopOffersPage() {
    const params = useParams();
    const shopId = params.shopId as string;
    const router = useRouter();
    const { toast } = useToast();

    const [shop, setShop] = useState<Shop | null>(null);
    const [offers, setOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
    const [isClaiming, setIsClaiming] = useState(false);
    const [customerName, setCustomerName] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');


    useEffect(() => {
        if (!shopId) {
            setLoading(false);
            return;
        };

        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch shop details
                const shopDocRef = doc(db, 'shops', shopId);
                const shopSnap = await getDoc(shopDocRef);
                if (!shopSnap.exists()) {
                    // Redirect to a 'not found' page or home
                    router.push('/find-offers');
                    return;
                }
                setShop(shopSnap.data() as Shop);

                // Fetch active offers
                const offersQuery = query(
                    collection(db, 'shops', shopId, 'offers'),
                    where('isActive', '==', true),
                    where('__name__', '!=', 'template')
                );
                const offersSnapshot = await getDocs(offersQuery);
                const offersList = offersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Offer));
                setOffers(offersList);

            } catch (error) {
                console.error("Error fetching shop data:", error);
                toast({ title: "Error", description: "Could not load the shop's offers.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [shopId, router, toast]);

    const handleClaimOffer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOffer || !shopId) return;

        setIsClaiming(true);
        try {
            // 1. Add claim to subcollection
            const claimsCollectionRef = collection(db, 'shops', shopId, 'claims');
            await addDoc(claimsCollectionRef, {
                customerName,
                customerEmail,
                offerId: selectedOffer.id,
                offerTitle: selectedOffer.title,
                claimedAt: serverTimestamp(),
            });

            // 2. Increment claim count on the offer
            const offerDocRef = doc(db, 'shops', shopId, 'offers', selectedOffer.id);
            await getDoc(offerDocRef);
            await addDoc(offerDocRef, { claimCount: increment(1) });


            toast({
                title: "Offer Claimed!",
                description: `Your voucher for "${selectedOffer.title}" will be sent to ${customerEmail}.`,
            });
            setSelectedOffer(null);
            setCustomerName('');
            setCustomerEmail('');

        } catch (error) {
            console.error("Error claiming offer:", error);
            toast({ title: "Claim Failed", description: "Something went wrong. Please try again.", variant: "destructive" });
        } finally {
            setIsClaiming(false);
        }
    };


    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!shop) {
        return (
            <div className="flex h-screen w-full flex-col items-center justify-center text-center p-4">
                 <h1 className="text-2xl font-bold">Shop Not Found</h1>
                <p className="text-muted-foreground">The shop you are looking for does not exist or has been moved.</p>
                <Button asChild variant="link" className="mt-4">
                    <a href="/find-offers">Explore Other Offers</a>
                </Button>
            </div>
        );
    }

    return (
    <div className="flex flex-col min-h-screen bg-muted/30">
        {/* Shop Header */}
        <header className="bg-background shadow-sm">
            <div className="container mx-auto p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 border-primary">
                    <AvatarImage src={shop.imageUrl} alt={shop.shopName} />
                    <AvatarFallback>
                        <Building className="h-10 w-10 text-muted-foreground"/>
                    </AvatarFallback>
                </Avatar>
                <div className="text-center sm:text-left">
                    <h1 className="text-2xl sm:text-3xl font-bold">{shop.shopName}</h1>
                    <div className="flex items-center gap-2 text-muted-foreground mt-1 justify-center sm:justify-start">
                        <MapPin className="h-4 w-4"/>
                        <p>{shop.address}</p>
                    </div>
                     {shop.businessType && (
                        <Badge variant="outline" className="mt-2">{shop.businessType}</Badge>
                     )}
                </div>
            </div>
        </header>

        {/* Offers Grid */}
        <main className="container mx-auto p-4 sm:p-6 lg:p-8 flex-1">
            <h2 className="text-xl font-bold mb-6 text-center sm:text-left">Available Offers ({offers.length})</h2>
             {offers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {offers.map(offer => (
                         <Card key={offer.id} className="flex flex-col bg-background transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group">
                            <CardHeader className="p-0 relative">
                                <Image 
                                    src={offer.imageUrl || `https://placehold.co/600x400?text=${offer.title.replace(/\s/g, '+')}`}
                                    alt={offer.title}
                                    width={600}
                                    height={400}
                                    className="aspect-[16/10] object-cover rounded-t-lg"
                                />
                            </CardHeader>
                            <CardContent className="p-4 flex-1 space-y-3">
                                {offer.discountValue && (
                                    <Badge variant='secondary' className="text-sm">
                                        {offer.discountValue}{offer.discountType === 'percentage' ? '%' : ''} OFF
                                    </Badge>
                                )}
                                <h3 className="font-bold text-lg leading-snug truncate group-hover:text-primary" title={offer.title}>{offer.title}</h3>
                                <p className="text-sm text-muted-foreground line-clamp-2">{offer.description}</p>
                                {offer.terms && <p className="text-xs text-muted-foreground/80 pt-2 border-t">Terms: {offer.terms}</p>}
                            </CardContent>
                            <CardFooter className="p-4 border-t flex-col items-start gap-4">
                               <div className="flex justify-between w-full items-center text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3"/>
                                        <span>Posted {formatDistanceToNow(new Date(offer.createdAt.seconds * 1000), { addSuffix: true })}</span>
                                    </div>
                                </div>
                                <Button className="w-full" onClick={() => setSelectedOffer(offer)}>
                                    <Tag className="mr-2 h-4 w-4"/>
                                    Claim Offer
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                 <div className="text-center py-20 text-muted-foreground bg-background rounded-lg border">
                    <Tag className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold">No Active Offers</h3>
                    <p>This shop doesn't have any offers right now. Check back soon!</p>
                </div>
            )}
        </main>
        
         <LandingFooter />

         {/* Claim Offer Dialog */}
         <Dialog open={!!selectedOffer} onOpenChange={(isOpen) => !isOpen && setSelectedOffer(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Claim "{selectedOffer?.title}"</DialogTitle>
                    <DialogDescription>
                        Enter your details below to claim this offer. A voucher will be sent to your email.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleClaimOffer}>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="customer-name" className="flex items-center gap-2">
                                <UserIcon className="h-4 w-4" /> Your Name
                            </Label>
                            <Input id="customer-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="customer-email" className="flex items-center gap-2">
                                <Mail className="h-4 w-4" /> Your Email
                            </Label>
                            <Input id="customer-email" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} required />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setSelectedOffer(null)}>Cancel</Button>
                        <Button type="submit" disabled={isClaiming}>
                            {isClaiming && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Confirm Claim
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    </div>
    );
}
