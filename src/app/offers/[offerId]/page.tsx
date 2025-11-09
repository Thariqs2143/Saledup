
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { doc, getDoc, addDoc, collection, serverTimestamp, updateDoc, increment, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, ArrowLeft, Building, Tag, Info, Phone, Mail, MapPin, User as UserIcon, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';

type Shop = {
    shopName: string;
    address: string;
    imageUrl?: string;
    ownerName: string;
    phone: string;
    ownerEmail: string;
    businessType?: string;
};

type Offer = {
    id: string;
    shopId: string;
    title: string;
    description: string;
    imageUrl?: string;
    discountType: string;
    discountValue?: string;
    terms?: string;
    createdAt: Timestamp;
};

export default function OfferDetailPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();

    const offerId = params.offerId as string;
    const shopId = searchParams.get('shopId');

    const [offer, setOffer] = useState<Offer | null>(null);
    const [shop, setShop] = useState<Shop | null>(null);
    const [loading, setLoading] = useState(true);

    const [isClaiming, setIsClaiming] = useState(false);
    const [isClaimDialogOpen, setIsClaimDialogOpen] = useState(false);
    const [claimSuccessData, setClaimSuccessData] = useState<{qrCodeUrl: string, offerTitle: string} | null>(null);

    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');

    useEffect(() => {
        if (!offerId || !shopId) {
            toast({ title: "Invalid Link", description: "The offer link is missing information.", variant: "destructive" });
            router.push('/find-offers');
            return;
        }

        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch Offer
                const offerDocRef = doc(db, 'shops', shopId, 'offers', offerId);
                const offerSnap = await getDoc(offerDocRef);
                if (!offerSnap.exists()) {
                    throw new Error("Offer not found.");
                }
                setOffer({ id: offerSnap.id, shopId, ...offerSnap.data() } as Offer);

                // Fetch Shop
                const shopDocRef = doc(db, 'shops', shopId);
                const shopSnap = await getDoc(shopDocRef);
                 if (!shopSnap.exists()) {
                    throw new Error("Shop not found.");
                }
                setShop(shopSnap.data() as Shop);

            } catch (error: any) {
                toast({ title: "Error", description: error.message, variant: "destructive" });
                router.push('/find-offers');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [offerId, shopId, router, toast]);
    
    const handleClaimOffer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!offer || !shopId) return;

        setIsClaiming(true);
        try {
            const claimsCollectionRef = collection(db, 'shops', shopId, 'claims');
            const claimDocRef = await addDoc(claimsCollectionRef, {
                customerName,
                customerPhone,
                customerEmail,
                offerId: offer.id,
                offerTitle: offer.title,
                claimedAt: serverTimestamp(),
                status: 'claimed',
            });

            const offerDocRef = doc(db, 'shops', shopId, 'offers', offer.id);
            await updateDoc(offerDocRef, { claimCount: increment(1) });
            
            const claimId = claimDocRef.id;
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(claimId)}`;
            
            setClaimSuccessData({qrCodeUrl, offerTitle: offer.title});
            setIsClaimDialogOpen(false);

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
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex h-[60vh] w-full items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!offer || !shop) {
        return (
             <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center flex h-[60vh] w-full flex-col items-center justify-center">
                 <h1 className="text-2xl font-bold">Offer Not Found</h1>
                <p className="text-muted-foreground">This offer may have expired or been removed.</p>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <Link href={shopId ? `/shops/${shopId}` : '/find-offers'} className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary">
                <ArrowLeft className="h-4 w-4" />
                Back to Offers
            </Link>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Offer Content */}
                <div className="lg:col-span-2 space-y-8">
                    <Card className="overflow-hidden">
                        <CardHeader className="p-0">
                            <Image
                                src={offer.imageUrl || `https://placehold.co/1200x600?text=${offer.title.replace(/\s/g, '+')}`}
                                alt={offer.title}
                                width={1200}
                                height={600}
                                className="aspect-video object-cover w-full"
                            />
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <CardTitle className="text-3xl">{offer.title}</CardTitle>
                            <div className="flex items-center gap-2">
                                {offer.discountValue && (
                                    <Badge variant='secondary' className="text-base">
                                        {offer.discountValue}{offer.discountType === 'percentage' ? '%' : ''} OFF
                                    </Badge>
                                )}
                                <span className="text-muted-foreground text-sm">&bull; Posted {formatDistanceToNow(new Date(offer.createdAt.seconds * 1000), { addSuffix: true })}</span>
                            </div>
                            <CardDescription className="text-base">{offer.description}</CardDescription>
                             {offer.terms && (
                                <div className="pt-4 border-t">
                                    <h4 className="font-semibold">Terms & Conditions</h4>
                                    <p className="text-sm text-muted-foreground">{offer.terms}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <div className="block lg:hidden">
                        <Button className="w-full h-12 text-lg" onClick={() => setIsClaimDialogOpen(true)}>
                            <Tag className="mr-2 h-5 w-5"/> Claim This Offer
                        </Button>
                    </div>
                </div>

                {/* Shop Details Sidebar */}
                <div className="space-y-8">
                    <Card>
                        <CardHeader className="flex-row items-center gap-4">
                             <Avatar className="h-14 w-14 border">
                                <AvatarImage src={shop.imageUrl} alt={shop.shopName} />
                                <AvatarFallback><Building/></AvatarFallback>
                            </Avatar>
                            <div>
                                <CardTitle className="text-xl">{shop.shopName}</CardTitle>
                                {shop.businessType && <CardDescription>{shop.businessType}</CardDescription>}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                             <div className="flex items-start gap-3">
                                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0"/>
                                <span>{shop.address}</span>
                            </div>
                            <div className="flex items-start gap-3">
                                <UserIcon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0"/>
                                <span>Managed by {shop.ownerName}</span>
                            </div>
                        </CardContent>
                    </Card>
                    <div className="hidden lg:block">
                         <Button className="w-full h-12 text-lg" onClick={() => setIsClaimDialogOpen(true)}>
                            <Tag className="mr-2 h-5 w-5"/> Claim This Offer
                        </Button>
                    </div>
                </div>
            </div>

            {/* Claim Offer Dialog */}
            <Dialog open={isClaimDialogOpen} onOpenChange={setIsClaimDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Claim "{offer?.title}"</DialogTitle>
                        <DialogDescription>
                            Enter your details to get a unique QR code to redeem this offer in-store.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleClaimOffer}>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="customer-name">Your Name*</Label>
                                <Input id="customer-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="customer-phone">Your Phone Number*</Label>
                                <Input id="customer-phone" type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="customer-email">Your Email (Optional)</Label>
                                <Input id="customer-email" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
                            </div>
                        </div>
                        <DialogFooter className="gap-2 sm:justify-between">
                            <Button type="button" variant="outline" onClick={() => setIsClaimDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isClaiming}>
                                {isClaiming && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Get My QR Code
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
                            Offer Claimed!
                        </DialogTitle>
                        <DialogDescription>
                            You have claimed: "{claimSuccessData?.offerTitle}".
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
}

    