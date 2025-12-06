

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, Clock, Loader2, Mail, MapPin, Phone, Share2, Star, Tag, MessageCircle as WhatsAppIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Shop = {
    shopName: string;
    ownerName: string;
    address: string;
    imageUrl?: string;
    coverImageUrl?: string;
    businessType?: string;
    phone: string;
    website?: string;
    whatsappNumber?: string;
    email?: string;
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

const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
            <Star
                key={star}
                className={`h-4 w-4 ${rating >= star ? "text-amber-400 fill-amber-400" : "text-muted-foreground/50"}`}
            />
        ))}
    </div>
);

const isOfferCurrentlyActive = (offer: Offer): boolean => {
    const now = new Date();
    
    if (offer.startDate && now < offer.startDate.toDate()) {
        return false;
    }
    if (offer.endDate) {
        const endDate = offer.endDate.toDate();
        endDate.setHours(23, 59, 59, 999);
        if (now > endDate) {
            return false;
        }
    }

    if (offer.startTime && offer.endTime) {
        const [startHour, startMinute] = offer.startTime.split(':').map(Number);
        const [endHour, endMinute] = offer.endTime.split(':').map(Number);

        const startTime = new Date();
        startTime.setHours(startHour, startMinute, 0, 0);
        
        const endTime = new Date();
        endTime.setHours(endHour, endMinute, 0, 0);

        if (now < startTime || now > endTime) {
            return false;
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
                const shopDocRef = doc(db, 'shops', shopId);
                const shopSnap = await getDoc(shopDocRef);
                if (!shopSnap.exists()) {
                    router.push('/find-offers');
                    return;
                }
                setShop(shopSnap.data() as Shop);

                const offersQuery = query(collection(db, 'shops', shopId, 'offers'), where('isActive', '==', true));
                const offersSnapshot = await getDocs(offersQuery);
                const offersList = offersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Offer));
                setAllOffers(offersList);

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

    const activeOffers = useMemo(() => allOffers.filter(isOfferCurrentlyActive), [allOffers]);

    const averageRating = useMemo(() => {
        if (reviews.length === 0) return 0;
        const total = reviews.reduce((acc, review) => acc + review.rating, 0);
        return total / reviews.length;
    }, [reviews]);
    
    const handleShare = () => {
        if (navigator.share && shop) {
            navigator.share({
                title: shop.shopName,
                text: `Check out the offers at ${shop.shopName}!`,
                url: window.location.href,
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(window.location.href);
            toast({ title: 'Link Copied!', description: 'Shop link copied to your clipboard.' });
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
                    <Link href="/find-offers">Explore Other Offers</Link>
                </Button>
            </div>
        );
    }

    return (
    <div className="flex flex-col min-h-screen bg-muted/30">
        <div className="relative w-full aspect-video max-h-96 bg-muted">
            {shop.coverImageUrl && (
                <Image
                    src={shop.coverImageUrl}
                    alt={`${shop.shopName} cover image`}
                    layout="fill"
                    objectFit="cover"
                    className="w-full h-full"
                />
            )}
             <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
        </div>

        <main className="container mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 flex-1 -mt-16">
            <div className="flex flex-col items-center text-center">
                 <Avatar className="h-24 w-24 border-4 border-background bg-muted shadow-lg">
                    <AvatarImage src={shop.imageUrl} />
                    <AvatarFallback>
                        <Building className="h-10 w-10"/>
                    </AvatarFallback>
                </Avatar>
                <h1 className="text-2xl font-bold mt-4">{shop.shopName}</h1>
                
                {reviews.length > 0 && (
                    <div className="flex items-center gap-2 mt-1">
                        <StarRating rating={averageRating} />
                        <span className="text-sm font-semibold text-muted-foreground">
                            {averageRating.toFixed(1)} ({reviews.length} reviews)
                        </span>
                    </div>
                )}
                
                <div className="mt-4 w-full max-w-xs">
                     <Button size="lg" className="w-full" onClick={handleShare}>
                        <Share2 className="mr-2 h-4 w-4" /> Share
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="offers" className="mt-8">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="offers">Offer List</TabsTrigger>
                    <TabsTrigger value="contact">Contact Details</TabsTrigger>
                </TabsList>
                <TabsContent value="offers" className="mt-6">
                    {activeOffers.length > 0 ? (
                        <div className="space-y-4">
                            {activeOffers.map(offer => (
                                <Link key={offer.id} href={`/offers/${offer.id}?shopId=${shopId}`} className="block">
                                    <Card className="flex items-center gap-4 p-4 transition-all hover:shadow-lg hover:border-primary">
                                        <Image 
                                            src={offer.imageUrl || `https://placehold.co/600x400?text=${offer.title.replace(/\s/g, '+')}`}
                                            alt={offer.title}
                                            width={80}
                                            height={80}
                                            className="aspect-square object-cover rounded-md"
                                        />
                                        <div className="flex-1">
                                            {offer.discountValue && (
                                                <Badge variant='secondary'>{offer.discountValue}{offer.discountType === 'percentage' ? '%' : ''} OFF</Badge>
                                            )}
                                            <h3 className="font-bold text-lg leading-snug mt-1">{offer.title}</h3>
                                            <p className="text-xs text-muted-foreground">
                                                Posted {formatDistanceToNow(new Date(offer.createdAt.seconds * 1000), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 text-muted-foreground bg-background rounded-lg border">
                            <Tag className="h-16 w-16 mx-auto mb-4 opacity-50" />
                            <h3 className="text-xl font-semibold">No Active Offers</h3>
                            <p>This shop doesn't have any offers right now. Check back soon!</p>
                        </div>
                    )}
                </TabsContent>
                <TabsContent value="contact" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Contact Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5 text-base">
                             <div className="flex items-center gap-4">
                                <Building className="h-5 w-5 text-muted-foreground"/>
                                <span className="font-medium">{shop.ownerName}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <Phone className="h-5 w-5 text-muted-foreground"/>
                                <a href={`tel:${shop.phone}`} className="font-medium hover:underline">{shop.phone}</a>
                            </div>
                            {shop.whatsappNumber && (
                                <div className="flex items-center gap-4">
                                    <WhatsAppIcon className="h-5 w-5 text-muted-foreground"/>
                                    <a href={`https://wa.me/91${shop.whatsappNumber}`} target="_blank" className="font-medium hover:underline">WhatsApp</a>
                                </div>
                            )}
                            {shop.email && (
                                <div className="flex items-center gap-4">
                                    <Mail className="h-5 w-5 text-muted-foreground"/>
                                     <a href={`mailto:${shop.email}`} className="font-medium hover:underline">{shop.email}</a>
                                </div>
                            )}
                            <div className="flex items-start gap-4">
                                <MapPin className="h-5 w-5 mt-1 text-muted-foreground shrink-0"/>
                                <span className="font-medium">{shop.address}</span>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </main>
    </div>
    );
}
