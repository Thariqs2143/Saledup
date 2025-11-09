
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, Timestamp, updateDoc, increment, DocumentReference } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building, Clock, Loader2, Mail, MapPin, Phone, Tag, User as UserIcon, CheckCircle } from 'lucide-react';
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
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import Link from 'next/link';

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
    const [claimSuccessData, setClaimSuccessData] = useState<{qrCodeUrl: string, offerTitle: string} | null>(null);

    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
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
            const claimDocRef = await addDoc(claimsCollectionRef, {
                customerName,
                customerPhone,
                customerEmail,
                offerId: selectedOffer.id,
                offerTitle: selectedOffer.title,
                claimedAt: serverTimestamp(),
                status: 'claimed', // New status field
            });

            // 2. Increment claim count on the offer
            const offerDocRef = doc(db, 'shops', shopId, 'offers', selectedOffer.id);
            await updateDoc(offerDocRef, { claimCount: increment(1) });
            
            // 3. Generate QR for the claim
            const claimId = claimDocRef.id;
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(claimId)}`;
            
            // Set success data to show in the next dialog
            setClaimSuccessData({qrCodeUrl, offerTitle: selectedOffer.title});
            setSelectedOffer(null);

        } catch (error) {
            console.error("Error claiming offer:", error);
            toast({ title: "Claim Failed", description: "Something went wrong. Please try again.", variant: "destructive" });
        } finally {
            setIsClaiming(false);
        }
    };
    
    const resetClaimFlow = () => {
        setClaimSuccessData(null);
        setCustomerName('');
        setCustomerPhone('');
        setCustomerEmail('');
    }


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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {offers.map(offer => (
                         <Link key={offer.id} href={`/offers/${offer.id}?shopId=${shopId}`} className="block">
                            <Card className="flex flex-col bg-background transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group h-full">
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
                                </CardContent>
                                <CardFooter className="p-4 border-t flex justify-between items-center text-xs text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3"/>
                                        <span>Posted {formatDistanceToNow(new Date(offer.createdAt.seconds * 1000), { addSuffix: true })}</span>
                                    </div>
                                    <Button variant="outline" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">View Deal</Button>
                                </CardFooter>
                            </Card>
                        </Link>
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
        
         {/* Claim Offer Dialog */}
         <Dialog open={!!selectedOffer} onOpenChange={(isOpen) => !isOpen && setSelectedOffer(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Claim "{selectedOffer?.title}"</DialogTitle>
                    <DialogDescription>
                        Enter your details below to claim this offer. You'll receive a QR code to present at the counter.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleClaimOffer}>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="customer-name" className="flex items-center gap-2">
                                <UserIcon className="h-4 w-4" /> Your Name*
                            </Label>
                            <Input id="customer-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="customer-phone" className="flex items-center gap-2">
                                <Phone className="h-4 w-4" /> Your Phone Number*
                            </Label>
                            <Input id="customer-phone" type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="customer-email" className="flex items-center gap-2">
                                <Mail className="h-4 w-4" /> Your Email (Optional)
                            </Label>
                            <Input id="customer-email" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:justify-between">
                        <Button type="button" variant="outline" onClick={() => setSelectedOffer(null)}>Cancel</Button>
                        <Button type="submit" disabled={isClaiming}>
                            {isClaiming && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            Confirm Claim
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>

        {/* Claim Success Dialog */}
        <Dialog open={!!claimSuccessData} onOpenChange={resetClaimFlow}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CheckCircle className="h-6 w-6 text-green-500" />
                        Offer Claimed Successfully!
                    </DialogTitle>
                     <DialogDescription>
                        You have claimed the offer: "{claimSuccessData?.offerTitle}".
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 flex flex-col items-center gap-4 text-center">
                    <p className="text-sm text-muted-foreground">Show this QR code at the counter to redeem your offer.</p>
                    {claimSuccessData?.qrCodeUrl && (
                        <Image
                            src={claimSuccessData.qrCodeUrl}
                            alt="Your unique claim QR code"
                            width={200}
                            height={200}
                            className="rounded-lg border p-2 bg-white"
                        />
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" className="w-full">Done</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
    );

    
