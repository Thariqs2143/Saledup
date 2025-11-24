

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, Timestamp, updateDoc, increment, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building, Clock, Loader2, Mail, MapPin, Phone, Tag, User as UserIcon, CheckCircle, Star, MessageSquare, Globe, MessageCircle as WhatsAppIcon } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type Shop = {
    shopName: string;
    address: string;
    imageUrl?: string;
    coverImageUrl?: string;
    businessType?: string;
    phone: string;
    website?: string;
    whatsappNumber?: string;
    lat?: number;
    lng?: number;
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
    startDate?: Timestamp;
    endDate?: Timestamp;
    startTime?: string;
    endTime?: string;
    isFeatured?: boolean;
};

type Review = {
    id: string;
    name: string;
    rating: number;
    comment: string;
    createdAt: Timestamp;
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


// Helper function to check if an offer is currently active based on its schedule
const isOfferCurrentlyActive = (offer: Offer): boolean => {
    const now = new Date();
    
    // Check date range
    if (offer.startDate && now < offer.startDate.toDate()) {
        return false; // Offer hasn't started yet
    }
    if (offer.endDate) {
        // Set end date to end of the day
        const endDate = offer.endDate.toDate();
        endDate.setHours(23, 59, 59, 999);
        if (now > endDate) {
            return false; // Offer has expired
        }
    }

    // Check time range
    if (offer.startTime && offer.endTime) {
        const [startHour, startMinute] = offer.startTime.split(':').map(Number);
        const [endHour, endMinute] = offer.endTime.split(':').map(Number);

        const startTime = new Date();
        startTime.setHours(startHour, startMinute, 0, 0);
        
        const endTime = new Date();
        endTime.setHours(endHour, endMinute, 0, 0);

        if (now < startTime || now > endTime) {
            return false; // Outside of active hours
        }
    }

    return true;
};


export default function ShopOffersPage() {
    const params = useParams();
    const shopId = params.shopId as string;
    const router = useRouter();
    const { toast } = useToast();

    const [shop, setShop] = useState<Shop | null>(null);
    const [allOffers, setAllOffers] = useState<Offer[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!shopId) {
            setLoading(false);
            return;
        };

        let unsubscribeReviews: () => void = () => {};

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
                    where('isActive', '==', true)
                );
                const offersSnapshot = await getDocs(offersQuery);
                const offersList = offersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Offer));
                setAllOffers(offersList);

                 // Listen for reviews
                const reviewsQuery = query(collection(db, 'shops', shopId, 'reviews'), orderBy('createdAt', 'desc'));
                unsubscribeReviews = onSnapshot(reviewsQuery, (snapshot) => {
                    const reviewsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
                    setReviews(reviewsList);
                });

            } catch (error) {
                console.error("Error fetching shop data:", error);
                toast({ title: "Error", description: "Could not load the shop's offers.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        return () => unsubscribeReviews();
    }, [shopId, router, toast]);

    const { featuredOffer, activeOffers } = useMemo(() => {
        const currentlyActive = allOffers.filter(isOfferCurrentlyActive);
        const featured = currentlyActive.find(o => o.isFeatured);
        const others = currentlyActive.filter(o => !o.isFeatured);
        return { featuredOffer: featured, activeOffers: others };
    }, [allOffers]);

    const averageRating = useMemo(() => {
        if (reviews.length === 0) return 0;
        const total = reviews.reduce((acc, review) => acc + review.rating, 0);
        return total / reviews.length;
    }, [reviews]);
    
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
            <div className="container mx-auto max-w-5xl">
                <div className="relative w-full bg-muted aspect-video md:aspect-[21/9]">
                    {shop.coverImageUrl ? (
                        <Image
                            src={shop.coverImageUrl}
                            alt={`${shop.shopName} cover image`}
                            layout="fill"
                            objectFit="cover"
                            className="w-full h-full"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-t from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700"></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute -bottom-12 left-6">
                        <Avatar className="h-24 w-24 md:h-28 md:w-28 border-4 border-background bg-muted">
                            <AvatarImage src={shop.imageUrl} />
                            <AvatarFallback>
                                <Building className="h-10 w-10 md:h-12 md:w-12"/>
                            </AvatarFallback>
                        </Avatar>
                    </div>
                </div>
                 <div className="pt-14 pb-6 px-6">
                    <h1 className="text-2xl sm:text-3xl font-bold">{shop.shopName}</h1>
                    <div className="flex items-center gap-2 text-muted-foreground mt-1">
                        <MapPin className="h-4 w-4"/>
                        <p>{shop.address}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 mt-2">
                        {reviews.length > 0 && (
                            <div className="flex items-center gap-2">
                                <StarRating rating={averageRating} readOnly />
                                <span className="text-sm font-semibold text-muted-foreground">
                                    {averageRating.toFixed(1)} ({reviews.length} reviews)
                                </span>
                            </div>
                        )}
                         {shop.businessType && (
                            <Badge variant="outline">{shop.businessType}</Badge>
                         )}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {shop.phone && <Button asChild variant="outline"><a href={`tel:${shop.phone}`}><Phone className="mr-2 h-4 w-4"/>Call</a></Button>}
                        {shop.whatsappNumber && <Button asChild variant="outline"><a href={`https://wa.me/91${shop.whatsappNumber}`} target="_blank"><WhatsAppIcon className="mr-2 h-4 w-4"/>WhatsApp</a></Button>}
                        {shop.website && <Button asChild variant="outline"><a href={shop.website} target="_blank"><Globe className="mr-2 h-4 w-4"/>Website</a></Button>}
                        {shop.lat && shop.lng && <Button asChild variant="outline"><a href={`https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lng}`} target="_blank"><MapPin className="mr-2 h-4 w-4"/>Directions</a></Button>}
                    </div>
                </div>
            </div>
        </header>

        {/* Offers Grid */}
        <main className="container mx-auto max-w-5xl p-4 sm:p-6 lg:p-8 flex-1">
            {featuredOffer && (
                <div className="mb-12">
                    <h2 className="text-xl font-bold mb-4">Featured Deal</h2>
                    <Link href={`/offers/${featuredOffer.id}?shopId=${shopId}&from=shop`} className="block">
                         <Card className="flex flex-col md:flex-row bg-background transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group border-2 border-primary shadow-primary/20">
                            <div className="md:w-1/2 relative aspect-video md:aspect-auto">
                                <Image 
                                    src={featuredOffer.imageUrl || `https://placehold.co/600x400?text=${featuredOffer.title.replace(/\s/g, '+')}`}
                                    alt={featuredOffer.title}
                                    layout="fill"
                                    objectFit="cover"
                                    className="rounded-t-lg md:rounded-l-lg md:rounded-r-none"
                                />
                            </div>
                            <div className="md:w-1/2 flex flex-col">
                                <CardContent className="p-6 flex-1 space-y-3">
                                    <h3 className="font-bold text-xl md:text-2xl leading-snug group-hover:text-primary">{featuredOffer.title}</h3>
                                    <p className="text-muted-foreground line-clamp-3">{featuredOffer.description}</p>
                                </CardContent>
                                <CardFooter className="p-6 border-t">
                                    <Button size="lg" className="w-full">View Featured Deal</Button>
                                </CardFooter>
                            </div>
                        </Card>
                    </Link>
                </div>
            )}
            
            <h2 className="text-xl font-bold mb-6 text-center sm:text-left">All Offers ({activeOffers.length})</h2>
             {activeOffers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                    {activeOffers.map(offer => (
                         <Link key={offer.id} href={`/offers/${offer.id}?shopId=${shopId}&from=shop`} className="block">
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
            ) : !featuredOffer ? (
                 <div className="text-center py-20 text-muted-foreground bg-background rounded-lg border">
                    <Tag className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold">No Active Offers</h3>
                    <p>This shop doesn't have any offers right now. Check back soon!</p>
                </div>
            ) : null}
            
            {/* Reviews Section */}
            <div className="mt-12">
                <h2 className="text-xl font-bold mb-6">What Customers Are Saying ({reviews.length})</h2>
                {reviews.length > 0 ? (
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
                ) : (
                    <div className="text-center py-16 text-muted-foreground bg-background rounded-lg border">
                        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50"/>
                        <h3 className="font-semibold">No Reviews Yet</h3>
                        <p className="text-sm">Be the first to share your experience by claiming an offer!</p>
                    </div>
                )}
            </div>
        </main>
    </div>
    );
}
