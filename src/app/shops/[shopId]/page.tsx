
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
import { Building, Clock, Loader2, Mail, MapPin, Phone, Tag, User as UserIcon, CheckCircle, Star, MessageSquare } from 'lucide-react';
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

    // Review form state
    const [reviewName, setReviewName] = useState('');
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewComment, setReviewComment] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);


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
                    where('isActive', '==', true)
                );
                const offersSnapshot = await getDocs(offersQuery);
                const offersList = offersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Offer));
                setAllOffers(offersList);

                 // Listen for reviews
                const reviewsQuery = query(collection(db, 'shops', shopId, 'reviews'), orderBy('createdAt', 'desc'));
                const unsubscribeReviews = onSnapshot(reviewsQuery, (snapshot) => {
                    const reviewsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
                    setReviews(reviewsList);
                });

                // Return the unsubscribe function for cleanup, though it might not be called in this setup
                return unsubscribeReviews;

            } catch (error) {
                console.error("Error fetching shop data:", error);
                toast({ title: "Error", description: "Could not load the shop's offers.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [shopId, router, toast]);

    const activeOffers = useMemo(() => {
        return allOffers.filter(isOfferCurrentlyActive);
    }, [allOffers]);

    const averageRating = useMemo(() => {
        if (reviews.length === 0) return 0;
        const total = reviews.reduce((acc, review) => acc + review.rating, 0);
        return total / reviews.length;
    }, [reviews]);
    
    const handleReviewSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (reviewRating === 0 || !reviewName || !reviewComment) {
            toast({ title: "Missing fields", description: "Please provide your name, a rating, and a comment.", variant: "destructive" });
            return;
        }
        setIsSubmittingReview(true);
        try {
            const reviewsCollectionRef = collection(db, 'shops', shopId, 'reviews');
            await addDoc(reviewsCollectionRef, {
                name: reviewName,
                rating: reviewRating,
                comment: reviewComment,
                createdAt: serverTimestamp(),
            });

            toast({ title: "Review Submitted!", description: "Thank you for your feedback." });
            setReviewName('');
            setReviewRating(0);
            setReviewComment('');
        } catch (error) {
            console.error("Error submitting review:", error);
            toast({ title: "Submission Failed", variant: "destructive" });
        } finally {
            setIsSubmittingReview(false);
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
                    <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
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
                </div>
            </div>
        </header>

        {/* Offers Grid */}
        <main className="container mx-auto p-4 sm:p-6 lg:p-8 flex-1">
            <h2 className="text-xl font-bold mb-6 text-center sm:text-left">Available Offers ({activeOffers.length})</h2>
             {activeOffers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
            ) : (
                 <div className="text-center py-20 text-muted-foreground bg-background rounded-lg border">
                    <Tag className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold">No Active Offers</h3>
                    <p>This shop doesn't have any offers right now. Check back soon!</p>
                </div>
            )}
            
            {/* Reviews Section */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <h2 className="text-xl font-bold">Rate Your Experience</h2>
                    <Card>
                        <CardContent className="pt-6">
                            <form onSubmit={handleReviewSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="review-name">Your Name</Label>
                                    <Input id="review-name" value={reviewName} onChange={e => setReviewName(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Your Rating</Label>
                                    <StarRating rating={reviewRating} setRating={setReviewRating} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="review-comment">Your Comments</Label>
                                    <Textarea id="review-comment" value={reviewComment} onChange={e => setReviewComment(e.target.value)} required />
                                </div>
                                <Button type="submit" disabled={isSubmittingReview}>
                                    {isSubmittingReview && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                    Submit Review
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
                 <div className="space-y-6">
                    <h2 className="text-xl font-bold">What Customers Are Saying ({reviews.length})</h2>
                    {reviews.length > 0 ? (
                        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4">
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
                            <p className="text-sm">Be the first to share your experience!</p>
                        </div>
                    )}
                 </div>
            </div>
        </main>
    </div>
    );
}
