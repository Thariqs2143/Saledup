
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collectionGroup, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Loader2, Search, Map, List, Tag, Building, Star, Clock, Filter, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDistanceToNow } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

type Offer = {
    id: string;
    shopId: string;
    title: string;
    description: string;
    imageUrl?: string;
    discountType: string;
    discountValue?: string;
    createdAt: { seconds: number, nanoseconds: number };
    shopName?: string;
    shopAddress?: string;
    shopBusinessType?: string;
};

// Mock map component, as a real one needs an API key
const MockMap = () => (
    <div className="w-full h-full bg-muted flex items-center justify-center rounded-lg">
        <div className="text-center text-muted-foreground p-8">
            <Map className="h-16 w-16 mx-auto mb-4" />
            <p className="font-bold">Map View Placeholder</p>
            <p className="text-sm">In a real app, this would be an interactive map showing offer locations.</p>
        </div>
    </div>
);

export default function FindOffersPage() {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'list' | 'map'>('list');
    
    // Filter states
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
                    } as Offer;
                });
                
                const shopIds = [...new Set(offersList.map(o => o.shopId))];
                const shopsData: Record<string, any> = {};

                // Batch fetch shop data
                const shopPromises = shopIds.map(id => getDocs(query(collection(db, 'shops'), where('__name__', '==', id))));
                const shopSnapshots = await Promise.all(shopPromises);

                shopSnapshots.forEach((shopSnapshot, index) => {
                    if(!shopSnapshot.empty) {
                        const shopDoc = shopSnapshot.docs[0];
                        shopsData[shopDoc.id] = shopDoc.data();
                    }
                });
                
                const enrichedOffers = offersList.map(offer => ({
                    ...offer,
                    shopName: shopsData[offer.shopId]?.shopName,
                    shopAddress: shopsData[offer.shopId]?.address,
                    shopBusinessType: shopsData[offer.shopId]?.businessType,
                }));
                
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

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <header className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Find Local Deals</h1>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
                    Discover the best offers from local shops near you.
                </p>
            </header>

            {/* Filter Bar */}
            <div className="sticky top-20 z-40 bg-background/80 backdrop-blur-sm py-4 mb-8 rounded-lg">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative w-full md:flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input 
                            placeholder="Search for offers, products, or shops..."
                            className="pl-10 h-12"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="h-12 flex-1 md:flex-initial">
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

                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="h-12 w-[180px]">
                                <SelectValue placeholder="Sort by" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="newest">Newest</SelectItem>
                                <SelectItem value="popular">Most Popular</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="hidden md:flex bg-muted p-1 rounded-md">
                            <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setView('list')}>
                                <List className="h-5 w-5"/>
                            </Button>
                             <Button variant={view === 'map' ? 'secondary' : 'ghost'} size="icon" onClick={() => setView('map')}>
                                <Map className="h-5 w-5"/>
                            </Button>
                        </div>
                    </div>
                </div>
                 {selectedCategories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                        {selectedCategories.map(cat => (
                            <Badge key={cat} variant="secondary" className="pr-1">
                                {cat}
                                <button onClick={() => handleCategoryChange(cat)} className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20">
                                    <X className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                )}
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            ) : (
                <div className={cn("grid gap-8", view === 'list' && "lg:grid-cols-3 md:grid-cols-2")}>
                    {view === 'map' && (
                        <div className="h-[600px] col-span-full">
                            <MockMap />
                        </div>
                    )}
                    {view === 'list' && (
                        filteredAndSortedOffers.length > 0 ? (
                           filteredAndSortedOffers.map(offer => (
                                <Card key={offer.id} className="flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
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
                                    <CardContent className="p-4 flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Building className="h-4 w-4 text-muted-foreground" />
                                            <p className="text-sm font-semibold text-primary truncate">{offer.shopName || 'Local Shop'}</p>
                                        </div>
                                        <h3 className="font-bold text-lg truncate" title={offer.title}>{offer.title}</h3>
                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{offer.description}</p>
                                    </CardContent>
                                    <CardFooter className="p-4 border-t flex justify-between items-center text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3"/>
                                            <span>Posted {formatDistanceToNow(new Date(offer.createdAt.seconds * 1000), { addSuffix: true })}</span>
                                        </div>
                                        {offer.shopBusinessType && <Badge variant="outline">{offer.shopBusinessType}</Badge>}
                                    </CardFooter>
                                </Card>
                            ))
                        ) : (
                            <div className="col-span-full text-center py-20 text-muted-foreground">
                                <Search className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                <h3 className="text-xl font-semibold">No Offers Found</h3>
                                <p>Try adjusting your search or filter criteria.</p>
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
}
