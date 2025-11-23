

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { doc, getDoc, addDoc, collection, serverTimestamp, updateDoc, increment, Timestamp, query, where, getDocs, setDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Building, Tag, Info, Phone, Mail, MapPin, User as UserIcon, CheckCircle, Clock, Calendar, Gem, Eye, Star, MessageSquare, IndianRupee, Download } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
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
import { format, formatDistanceToNow, addHours } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import jsPDF from 'jspdf';


type Shop = {
    shopName: string;
    address: string;
    imageUrl?: string;
    coverImageUrl?: string;
    ownerName: string;
    phone: string;
    ownerEmail: string;
    businessType?: string;
    website?: string;
    whatsappNumber?: string;
};

type Offer = {
    id: string;
    shopId: string;
    title: string;
    description: string;
    imageUrl?: string;
    discountType: string;
    discountValue?: string;
    approximateValue?: number;
    terms?: string;
    createdAt: Timestamp;
    startDate?: Timestamp;
    endDate?: Timestamp;
    startTime?: string;
    endTime?: string;
};

type Review = {
    id: string;
    name: string;
    rating: number;
    comment: string;
    createdAt: Timestamp;
};

// Helper to check if offer is active (same as on other pages)
const isOfferCurrentlyActive = (offer: Offer): boolean => {
    const now = new Date();
    if (offer.startDate && now < offer.startDate.toDate()) return false;
    if (offer.endDate) {
        const endDate = offer.endDate.toDate();
        endDate.setHours(23, 59, 59, 999);
        if (now > endDate) return false;
    }
    if (offer.startTime && offer.endTime) {
        const [startHour, startMinute] = offer.startTime.split(':').map(Number);
        const [endHour, endMinute] = offer.endTime.split(':').map(Number);
        const startTime = new Date();
        startTime.setHours(startHour, startMinute, 0, 0);
        const endTime = new Date();
        endTime.setHours(endHour, endMinute, 0, 0);
        if (now < startTime || now > endTime) return false;
    }
    return true;
};

const StarRating = ({ rating, setRating, readOnly = false }: { rating: number, setRating?: (rating: number) => void, readOnly?: boolean }) => (
    <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
            <Star
                key={star}
                className={cn(
                    "h-6 w-6",
                    rating >= star ? "text-amber-400 fill-amber-400" : "text-muted-foreground/50",
                    !readOnly && "cursor-pointer"
                )}
                onClick={() => !readOnly && setRating && setRating(star)}
            />
        ))}
    </div>
);


export default function OfferDetailPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();

    const offerId = params.offerId as string;
    const shopId = searchParams.get('shopId');
    const from = searchParams.get('from');

    const [offer, setOffer] = useState<Offer | null>(null);
    const [shop, setShop] = useState<Shop | null>(null);
    const [otherOffers, setOtherOffers] = useState<Offer[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);

    const [isClaiming, setIsClaiming] = useState(false);
    const [isClaimDialogOpen, setIsClaimDialogOpen] = useState(false);
    const [claimSuccessData, setClaimSuccessData] = useState<{claimId: string, qrCodeUrl: string, offerTitle: string, newPoints: number, totalPoints: number} | null>(null);
    const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewComment, setReviewComment] = useState('');


    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');

    const backLink = from === 'all' ? '/find-offers' : shopId ? `/shops/${shopId}` : '/find-offers';

    useEffect(() => {
        if (!offerId || !shopId) {
            toast({ title: "Invalid Link", description: "The offer link is missing information.", variant: "destructive" });
            router.push('/find-offers');
            return;
        }

        let unsubscribeReviews: () => void;
        
        const fetchData = async () => {
            setLoading(true);
            try {
                // We only need to increment the viewCount, not block for it.
                const offerDocRef = doc(db, 'shops', shopId, 'offers', offerId);
                updateDoc(offerDocRef, { viewCount: increment(1) }).catch(console.error);
                
                const offerSnap = await getDoc(offerDocRef);
                if (!offerSnap.exists()) {
                    throw new Error("Offer not found.");
                }
                const currentOffer = { id: offerSnap.id, shopId, ...offerSnap.data() } as Offer;
                setOffer(currentOffer);

                // Fetch Shop
                const shopDocRef = doc(db, 'shops', shopId);
                const shopSnap = await getDoc(shopDocRef);
                 if (!shopSnap.exists()) {
                    throw new Error("Shop not found.");
                }
                setShop(shopSnap.data() as Shop);

                // Fetch other offers from the same shop
                const otherOffersQuery = query(
                    collection(db, 'shops', shopId, 'offers'),
                    where('isActive', '==', true)
                );
                const otherOffersSnap = await getDocs(otherOffersQuery);
                const allActiveOffers = otherOffersSnap.docs
                    .map(doc => ({ id: doc.id, shopId, ...doc.data() } as Offer))
                    .filter(isOfferCurrentlyActive);
                
                setOtherOffers(allActiveOffers.filter(o => o.id !== offerId).slice(0, 3));
                
                // Set up listener for reviews
                const reviewsQuery = query(collection(db, 'shops', shopId, 'reviews'), orderBy('createdAt', 'desc'));
                unsubscribeReviews = onSnapshot(reviewsQuery, (snapshot) => {
                    const reviewsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
                    setReviews(reviewsList);
                });

            } catch (error: any) {
                toast({ title: "Error", description: error.message, variant: "destructive" });
                router.push('/find-offers');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        
        return () => {
            if (unsubscribeReviews) {
                unsubscribeReviews();
            }
        }
    }, [offerId, shopId, router, toast]);

    const handleDownloadSticker = async () => {
        if (!shop || !claimSuccessData) return;

        toast({ title: "Generating PDF...", description: "Your voucher is being prepared for download." });

        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: [85.6, 53.98] // Credit card size
        });
        
        // --- Image Loading ---
        const toDataURL = (url: string): Promise<string> => {
            return new Promise((resolve, reject) => {
                const img = new window.Image();
                img.crossOrigin = 'Anonymous';
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.height = img.naturalHeight;
                    canvas.width = img.naturalWidth;
                    ctx!.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/png'));
                };
                img.onerror = reject;
                img.src = url;
            });
        };

        try {
            const qrCodeDataUrl = await toDataURL(claimSuccessData.qrCodeUrl);
            let shopLogoDataUrl: string | null = null;
            if (shop.imageUrl) {
                shopLogoDataUrl = await toDataURL(shop.imageUrl);
            }

            // --- PDF Content ---
            // Background
            doc.setFillColor(248, 249, 250); // A light grey
            doc.rect(0, 0, 85.6, 53.98, 'F');

            // Shop Logo
            if (shopLogoDataUrl) {
                doc.addImage(shopLogoDataUrl, 'PNG', 5, 5, 12, 12);
            }

            // Shop Name
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(29, 35, 42); // Dark text
            doc.text(shop.shopName, 20, 10);
            
            // Offer Title
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(108, 117, 125); // Muted text
            doc.text(offer?.title || '', 20, 15, { maxWidth: 35 });

            // QR Code
            doc.addImage(qrCodeDataUrl, 'PNG', 58, 5, 22.6, 22.6);

            // Customer Details
            doc.setDrawColor(222, 226, 230); // Border color
            doc.line(5, 30, 80.6, 30); // Separator line
            
            doc.setFontSize(7);
            doc.setTextColor(108, 117, 125);
            doc.text("REDEEMABLE BY", 5, 35);
            
            doc.setFontSize(9);
            doc.setTextColor(29, 35, 42);
            doc.text(customerName, 5, 40);

            doc.setFontSize(7);
            doc.text("VALID UNTIL", 50, 35);
            
            doc.setFontSize(9);
            const expiryDate = addHours(new Date(), 24); // QR valid for 24 hours
            doc.text(format(expiryDate, 'PPpp'), 50, 40);
            
            doc.setFontSize(6);
            doc.setTextColor(150, 150, 150);
            doc.text(`Claim ID: ${claimSuccessData.claimId}`, 5, 50);

            doc.save(`Saledup_Voucher_${shop.shopName.replace(/\s/g, '_')}.pdf`);
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast({ title: "PDF Generation Failed", description: "There was an error creating the voucher file.", variant: "destructive"});
        }
    };
    
    const handleClaimOffer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!offer || !shopId) return;

        setIsClaiming(true);
        try {
            // Step 1: Create the claim document. The `onClaimCreated` function will handle count increment.
            const claimsCollectionRef = collection(db, 'shops', shopId, 'claims');
            const claimDocRef = await addDoc(claimsCollectionRef, {
                customerName,
                customerPhone,
                customerEmail,
                offerId: offer.id,
                offerTitle: offer.title,
                claimedAt: serverTimestamp(),
                status: 'claimed',
                approximateValue: offer.approximateValue || 0,
                discountType: offer.discountType,
                discountValue: offer.discountValue
            });
            
            // Step 2: Create/Update the global customer profile and award points
            const customerDocRef = doc(db, 'customers', customerPhone);
            const POINTS_PER_CLAIM = 10;
            const customerSnap = await getDoc(customerDocRef);
            let totalPoints = POINTS_PER_CLAIM;

            if (customerSnap.exists()) {
                await updateDoc(customerDocRef, { 
                    saledupPoints: increment(POINTS_PER_CLAIM),
                    lastActivity: serverTimestamp(),
                    name: customerName, // Always update name and email on new claim
                    email: customerEmail,
                });
                totalPoints = (customerSnap.data().saledupPoints || 0) + POINTS_PER_CLAIM;
            } else {
                await setDoc(customerDocRef, {
                    phone: customerPhone,
                    name: customerName,
                    email: customerEmail,
                    saledupPoints: POINTS_PER_CLAIM,
                    createdAt: serverTimestamp(),
                    lastActivity: serverTimestamp()
                });
            }
            
            // Step 3: Prepare data for the success dialog
            const claimId = claimDocRef.id;
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(claimId)}`;
            
            setClaimSuccessData({
                claimId,
                qrCodeUrl, 
                offerTitle: offer.title,
                newPoints: POINTS_PER_CLAIM,
                totalPoints: totalPoints
            });
            setIsClaimDialogOpen(false);

        } catch (error) {
            console.error("Error claiming offer:", error);
            toast({ title: "Claim Failed", description: "Something went wrong. Please try again.", variant: "destructive" });
        } finally {
            setIsClaiming(false);
        }
    };
    
    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (reviewRating === 0 || !customerName || !reviewComment) {
            toast({ title: "Missing fields", description: "Please provide your name, a rating, and a comment.", variant: "destructive" });
            return;
        }
        setIsSubmittingReview(true);
        try {
            const reviewsCollectionRef = collection(db, 'shops', shopId!, 'reviews');
            await addDoc(reviewsCollectionRef, {
                name: customerName, // Use the name from the claim form
                customerPhone, // Store phone number with review
                rating: reviewRating,
                comment: reviewComment,
                createdAt: serverTimestamp(),
            });

            toast({ title: "Review Submitted!", description: "Thank you for your feedback." });
            setIsReviewDialogOpen(false); // Close review dialog
            setReviewRating(0);
            setReviewComment('');
        } catch (error) {
            console.error("Error submitting review:", error);
            toast({ title: "Submission Failed", variant: "destructive" });
        } finally {
            setIsSubmittingReview(false);
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
    
    const getValidityText = () => {
        if (!offer.startDate && !offer.endDate) return null;
        
        let text = "Valid";
        if (offer.startDate) {
            text += ` from ${format(offer.startDate.toDate(), 'PP')}`;
        }
        if (offer.endDate) {
            text += ` until ${format(offer.endDate.toDate(), 'PP')}`;
        }
        return text;
    };


    return (
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
             <Link href={backLink} className="inline-flex items-center gap-2 text-sm font-semibold mb-4 text-muted-foreground hover:text-primary">
                <ArrowLeft className="h-4 w-4" />
                Back to Offers
            </Link>

            <Card className="bg-card text-card-foreground shadow-2xl overflow-hidden">
                <div className="relative aspect-video w-full">
                    {shop.coverImageUrl && (
                        <Image
                            src={shop.coverImageUrl}
                            alt={`${shop.shopName} cover image`}
                            layout="fill"
                            objectFit="cover"
                            className="w-full h-full"
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                    <div className="absolute -bottom-10 left-6">
                        <Avatar className="h-24 w-24 border-4 border-background bg-muted">
                            <AvatarImage src={shop.imageUrl} />
                            <AvatarFallback>
                                <Building className="h-10 w-10"/>
                            </AvatarFallback>
                        </Avatar>
                    </div>
                     <div className="absolute bottom-4 right-6">
                        <Button asChild variant="secondary">
                            <Link href={`/shops/${shopId}`}>
                                <Eye className="mr-2 h-4 w-4"/> View Shop
                            </Link>
                        </Button>
                    </div>
                </div>
                 <div className="pt-16 p-6">
                    <h1 className="text-2xl font-bold text-foreground">{shop.shopName}</h1>
                    <p className="text-base text-muted-foreground">{shop.businessType}</p>
                </div>
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-6">
                        <div className="flex items-center gap-2">
                            {offer.discountValue && (
                                <Badge variant='secondary' className="text-base py-1 px-3">
                                    {offer.discountValue}{offer.discountType === 'percentage' ? '%' : ''} OFF
                                </Badge>
                            )}
                            {offer.approximateValue && offer.approximateValue > 0 && (
                                <Badge variant='outline' className="text-base py-1 px-3 flex items-center">
                                    <IndianRupee className="h-4 w-4 mr-1"/> Value: ~{offer.approximateValue}
                                </Badge>
                            )}
                        </div>
                        <h2 className="text-3xl font-bold">{offer.title}</h2>
                        <p className="text-muted-foreground text-base">{offer.description}</p>
                        
                        <div className="border-t pt-6 space-y-4">
                             <h3 className="font-semibold text-lg">Promotion Details</h3>
                             <div className="flex items-center gap-3 text-muted-foreground">
                                <Clock className="h-5 w-5"/>
                                <div>
                                    <p className="font-medium text-foreground">Posted</p>
                                    <p>{formatDistanceToNow(new Date(offer.createdAt.seconds * 1000), { addSuffix: true })}</p>
                                </div>
                             </div>
                             {getValidityText() && (
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <Calendar className="h-5 w-5"/>
                                    <div>
                                        <p className="font-medium text-foreground">Validity</p>
                                        <p>{getValidityText()}</p>
                                    </div>
                                </div>
                            )}
                            {offer.startTime && offer.endTime && (
                                 <div className="flex items-center gap-3 text-muted-foreground">
                                    <Clock className="h-5 w-5"/>
                                    <div>
                                        <p className="font-medium text-foreground">Daily Hours</p>
                                        <p>{offer.startTime} - {offer.endTime}</p>
                                    </div>
                                </div>
                            )}
                             {offer.terms && (
                                <div className="flex items-center gap-3 text-muted-foreground">
                                    <Info className="h-5 w-5"/>
                                    <div>
                                        <p className="font-medium text-foreground">Terms & Conditions</p>
                                        <p>{offer.terms}</p>
                                    </div>
                                </div>
                             )}
                        </div>
                    </div>
                    <div className="space-y-6">
                         <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                            <h3 className="font-semibold text-lg">About {shop.shopName}</h3>
                             <div className="flex items-start gap-3 text-muted-foreground">
                                <MapPin className="h-4 w-4 mt-1 shrink-0"/>
                                <div>
                                    <p className="font-medium text-foreground">Address</p>
                                    <p className="text-sm">{shop.address}</p>
                                </div>
                             </div>
                             <div className="flex items-start gap-3 text-muted-foreground">
                                <Phone className="h-4 w-4 mt-1 shrink-0"/>
                                <div>
                                    <p className="font-medium text-foreground">Phone</p>
                                    <p className="text-sm">{shop.phone}</p>
                                </div>
                             </div>
                         </div>
                    </div>
                </div>
                <div className="p-6 border-t">
                    <Button className="w-full md:w-auto h-12 text-lg" size="lg" onClick={() => setIsClaimDialogOpen(true)}>
                        <Tag className="mr-2 h-5 w-5"/> Claim This Offer
                    </Button>
                </div>
            </Card>

            {/* You Might Also Like Section */}
            {otherOffers.length > 0 && (
                <div className="mt-12">
                    <h2 className="text-2xl font-bold mb-4">More from {shop.shopName}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {otherOffers.map(otherOffer => (
                            <Link key={otherOffer.id} href={`/offers/${otherOffer.id}?shopId=${shopId}&from=shop`} className="block">
                                <Card className="flex flex-col bg-card transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group h-full">
                                    <CardHeader className="p-0 relative">
                                        <Image
                                            src={otherOffer.imageUrl || `https://placehold.co/600x400?text=${otherOffer.title.replace(/\s/g, '+')}`}
                                            alt={otherOffer.title}
                                            width={600}
                                            height={400}
                                            className="aspect-[16/10] object-cover rounded-t-lg"
                                        />
                                    </CardHeader>
                                    <CardContent className="p-4 flex-1 space-y-1">
                                        <h3 className="font-bold text-lg leading-snug truncate group-hover:text-primary" title={otherOffer.title}>{otherOffer.title}</h3>
                                        <p className="text-sm text-muted-foreground line-clamp-2">{otherOffer.description}</p>
                                    </CardContent>
                                    <CardFooter className="p-4 border-t">
                                        <Button variant="outline" size="sm" className="w-full">View Deal</Button>
                                    </CardFooter>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Reviews Section */}
            {reviews.length > 0 && (
                <div className="mt-12">
                    <h2 className="text-2xl font-bold mb-4">What Customers Are Saying ({reviews.length})</h2>
                    <div className="space-y-4">
                        {reviews.map(review => (
                            <Card key={review.id}>
                                <CardContent className="pt-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold">{review.name}</p>
                                            <p className="text-xs text-muted-foreground">{formatDistanceToNow(review.createdAt.toDate(), { addSuffix: true })}</p>
                                        </div>
                                        <StarRating rating={review.rating} readOnly />
                                    </div>
                                    <p className="mt-4 text-muted-foreground text-sm">{review.comment}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}


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
                                <Input 
                                    id="customer-phone" 
                                    type="tel" 
                                    value={customerPhone} 
                                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                                    required 
                                    pattern="[0-9]{10}"
                                    title="Please enter a 10-digit mobile number"
                                    maxLength={10}
                                />
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
            <Dialog open={!!claimSuccessData} onOpenChange={(open) => !open && resetClaimFlow()}>
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
                        <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 p-3 rounded-lg text-center">
                            <p className="font-bold">You earned {claimSuccessData?.newPoints} Saledup Points!</p>
                            <p className="text-sm">Your new balance is <span className="font-bold">{claimSuccessData?.totalPoints}</span> points.</p>
                        </div>
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
                        <Button variant="secondary" className="w-full" onClick={handleDownloadSticker}>
                            <Download className="mr-2 h-4 w-4" />
                            Download QR Sticker (PDF)
                        </Button>
                        <Button variant="outline" className="w-full" onClick={() => setIsReviewDialogOpen(true)}>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Leave a Review
                        </Button>
                         <Link href="/my-points" className="w-full">
                            <Button variant="outline" className="w-full">
                                <Gem className="mr-2 h-4 w-4"/>Check My Points Balance
                            </Button>
                        </Link>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" className="w-full">Done</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* Review Dialog */}
            <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>How was your experience at {shop?.shopName}?</DialogTitle>
                        <DialogDescription>
                            Your feedback helps other customers and the shop owner.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleReviewSubmit}>
                        <div className="space-y-4 py-4">
                             <div className="space-y-2">
                                <Label>Your Rating*</Label>
                                <StarRating rating={reviewRating} setRating={setReviewRating} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="review-comment">Your Comments*</Label>
                                <Textarea id="review-comment" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} required />
                            </div>
                        </div>
                        <DialogFooter>
                             <Button type="button" variant="outline" onClick={() => setIsReviewDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSubmittingReview}>
                                {isSubmittingReview && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Submit Review
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
