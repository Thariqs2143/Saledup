
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collectionGroup, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Loader2, Search, Map, List, Building, Clock, Filter, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { collection } from 'firebase/firestore';
import Link from 'next/link';
import type { Offer as SingleOffer } from '@/components/offer-map';

const OfferMap = dynamic(() => import('@/components/offer-map'), { 
    ssr: false,
    loading: () => <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
});

// Helper function to check if an offer is currently active based on its schedule
const isOfferCurrentlyActive = (offer: SingleOffer): boolean => {
    const now = new Date();
    
    if (offer.startDate && now < offer.startDate.toDate()) {
        return false; // Offer hasn't started yet
    }
    if (offer.endDate) {
        const endDate = offer.endDate.toDate();
        endDate.setHours(23, 59, 59, 999);
        if (now > endDate) {
            return false; // Offer has expired
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
            return false; // Outside of active hours
        }
    }

    return true;
};

export default function FindOffersPage() {
    const [offers, setOffers] = useState<SingleOffer[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'list' | 'map'>('list');
    
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    
    const businessCategories = ["Retail", "Food & Beverage", "Service", "MSME", "Other"];

    useEffect(() => {
        const fetchAllOffers = async () => {
            setLoading(true);
            try {
                const offersQuery = query(
                    collectionGroup(db, 'offers'),
                    where('isActive', '==', true)
                );
                const offersSnapshot = await getDocs(offersQuery);
                const offersList = offersSnapshot.docs.map(doc => {
                    const data = doc.data();
                    const shopId = doc.ref.parent.parent!.id;
                    return {
                        id: doc.id,
                        shopId,
                        ...data
                    } as SingleOffer;
                });
                
                const shopIds = [...new Set(offersList.map(o => o.shopId))];
                const shopsData: Record<string, any> = {};
                
                const shopIdChunks: string[][] = [];
                for (let i = 0; i < shopIds.length; i += 30) { // Firestore 'in' query limit is 30
                    shopIdChunks.push(shopIds.slice(i, i + 30));
                }

                for (const chunk of shopIdChunks) {
                    if (chunk.length > 0) {
                        const shopsQuery = query(collection(db, 'shops'), where('__name__', 'in', chunk));
                        const shopSnapshots = await getDocs(shopsQuery);
                        shopSnapshots.forEach(shopDoc => {
                            shopsData[shopDoc.id] = shopDoc.data();
                        });
                    }
                }
                
                const enrichedOffers = offersList.map((offer) => ({
                    ...offer,
                    shopName: shopsData[offer.shopId]?.shopName,
                    shopAddress: shopsData[offer.shopId]?.address,
                    shopBusinessType: shopsData[offer.shopId]?.businessType,
                    shopPhone: shopsData[offer.shopId]?.phone, // Fetch phone number
                    lat: shopsData[offer.shopId]?.lat, 
                    lng: shopsData[offer.shopId]?.lng,
                })).filter(o => o.lat && o.lng); // Filter out offers without location
                
                setOffers(enrichedOffers);

            } catch (error) {
                console.error("Error fetching offers: ", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAllOffers();
    }, []);

    const filteredAndSortedOffers = useMemo(() => {
        let result = offers.filter(offer => {
            if (!isOfferCurrentlyActive(offer)) {
                return false;
            }

            const searchTermMatch = searchTerm.length === 0 || 
                offer.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                offer.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                offer.shopName?.toLowerCase().includes(searchTerm.toLowerCase());
            
            const categoryMatch = selectedCategories.length === 0 || 
                (offer.shopBusinessType && selectedCategories.includes(offer.shopBusinessType));

            return searchTermMatch && categoryMatch;
        });

        if (sortBy === 'newest') {
            result.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
        } else if (sortBy === 'popular') {
            // Placeholder for popularity sort
        }

        return result;
    }, [offers, searchTerm, sortBy, selectedCategories]);

    const handleCategoryChange = (category: string) => {
        setSelectedCategories(prev => 
            prev.includes(category) 
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };
    
    // Group offers by shop for the map view carousel
    const offersByShop = useMemo(() => {
        return filteredAndSortedOffers.reduce((acc, offer) => {
            if (!acc[offer.shopId]) {
                acc[offer.shopId] = [];
            }
            acc[offer.shopId].push(offer);
            return acc;
        }, {} as Record<string, SingleOffer[]>);
    }, [filteredAndSortedOffers]);

    return (
        <div className="flex flex-col">
            {/* Page Header */}
            <header className="text-center py-8 md:py-12">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Find Local Deals</h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                    Discover the best offers from local shops near you.
                </p>
            </header>

            {/* Sticky Filter Bar */}
            <div className="sticky top-[61px] z-40 bg-background/95 backdrop-blur-sm py-4 border-y border-border mb-8">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <div className="relative w-full sm:flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input 
                                placeholder="Search offers, products, or shops..."
                                className="pl-10 h-12"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                           <div className="flex-1">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="h-12 w-full">
                                            <Filter className="mr-2 h-4 w-4" /> Category ({selectedCategories.length})
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-64">
                                        <div className="space-y-4">
                                            <h4 className="font-medium leading-none">Filter by Category</h4>
                                            <div className="space-y-2">
                                                {businessCategories.map(cat => (
                                                    <div key={cat} className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={cat}
                                                            checked={selectedCategories.includes(cat)}
                                                            onCheckedChange={() => handleCategoryChange(cat)}
                                                        />
                                                        <label htmlFor={cat} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{cat}</label>
                                                    </div>
                                                ))}
                                            </div>
                                            <Button size="sm" variant="ghost" className="w-full" onClick={() => setSelectedCategories([])}>
                                                <X className="mr-2 h-4 w-4" /> Clear
                                            </Button>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                           </div>
                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="h-12 w-[180px] flex-1 sm:flex-initial">
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="newest">Newest</SelectItem>
                                    <SelectItem value="popular">Most Popular</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="outline" size="icon" className="h-12 w-12" onClick={() => setView(view === 'list' ? 'map' : 'list')}>
                                {view === 'list' ? <Map className="h-5 w-5"/> : <List className="h-5 w-5"/>}
                                <span className="sr-only">Toggle View</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 pb-8">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                ) : (
                    <>
                        {view === 'list' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                                {filteredAndSortedOffers.length > 0 ? (
                                    filteredAndSortedOffers.map(offer => (
                                        <Link key={offer.id} href={`/offers/${offer.id}?shopId=${offer.shopId}&from=all`} className="block">
                                            <Card className="flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group h-full">
                                                <CardHeader className="p-0 relative">
                                                        <Badge className="absolute top-2 right-2 z-10" variant='secondary'>
                                                        {offer.discountValue ? `${offer.discountValue}${offer.discountType === 'percentage' ? '%' : ' OFF'}` : 'Special Deal'}
                                                    </Badge>
                                                    <Image 
                                                        src={offer.imageUrl || `https://placehold.co/600x400?text=${offer.title.replace(/\s/g, '+')}`}
                                                        alt={offer.title}
                                                        width={600}
                                                        height={400}
                                                        className="aspect-[16/10] object-cover rounded-t-lg"
                                                    />
                                                </CardHeader>
                                                <CardContent className="p-3 md:p-4 flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Building className="h-4 w-4 text-muted-foreground" />
                                                        <p className="text-sm font-semibold text-primary truncate">{offer.shopName || 'Local Shop'}</p>
                                                    </div>
                                                    <h3 className="font-bold text-base md:text-lg leading-snug truncate group-hover:text-primary" title={offer.title}>{offer.title}</h3>
                                                </CardContent>
                                                <CardFooter className="p-3 md:p-4 border-t flex justify-between items-center text-xs text-muted-foreground">
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3"/>
                                                        <span>{formatDistanceToNow(new Date(offer.createdAt.seconds * 1000), { addSuffix: true })}</span>
                                                    </div>
                                                    {offer.shopBusinessType && <Badge variant="outline">{offer.shopBusinessType}</Badge>}
                                                </CardFooter>
                                            </Card>
                                        </Link>
                                    ))
                                ) : (
                                    <div className="col-span-full text-center py-20 text-muted-foreground">
                                        <Search className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                        <h3 className="text-xl font-semibold">No Offers Found</h3>
                                        <p>Try adjusting your search or filter criteria.</p>
                                    </div>
                                )}
                            </div>
                        )}
                        {view === 'map' && (
                             <div className="h-[calc(100vh-300px)] w-full rounded-lg overflow-hidden border relative z-10">
                                <OfferMap offersByShop={offersByShop} />
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
