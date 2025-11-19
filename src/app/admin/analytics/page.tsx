
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BarChart3, Image as ImageIcon, Percent, Tag, FileText } from "lucide-react";
import { collection, query, onSnapshot, orderBy, type Timestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

type Offer = {
    id: string;
    title: string;
    imageUrl?: string;
    claimCount: number;
    discountType: 'percentage' | 'fixed' | 'freebie' | 'other';
    createdAt: Timestamp;
};

export default function AdminAnalyticsPage() {
    const [offers, setOffers] = useState<Offer[]>([]);
    const [loading, setLoading] = useState(true);
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                setAuthUser(user);
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribeAuth();
    }, [router]);

    useEffect(() => {
        if (!authUser) return;

        const offersQuery = query(collection(db, 'shops', authUser.uid, 'offers'), orderBy('createdAt', 'desc'));
        
        const unsubscribe = onSnapshot(offersQuery, (snapshot) => {
            const offersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Offer));
            setOffers(offersList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching offers: ", error);
            toast({ title: "Error", description: "You don't have permission to view analytics.", variant: "destructive" });
            setLoading(false);
        });

        return () => unsubscribe();
    }, [authUser, toast]);

    const analytics = useMemo(() => {
        if (offers.length === 0) {
            return {
                claimsWithImage: 0,
                claimsWithoutImage: 0,
                imagePerformanceRatio: 0,
                typeCounts: {},
                totalClaims: 0,
            };
        }

        let claimsWithImage = 0;
        let offersWithImage = 0;
        let claimsWithoutImage = 0;
        let offersWithoutImage = 0;
        let totalClaims = 0;

        const typeCounts: { [key: string]: { claims: number, count: number } } = {
            percentage: { claims: 0, count: 0 },
            fixed: { claims: 0, count: 0 },
            freebie: { claims: 0, count: 0 },
            other: { claims: 0, count: 0 },
        };

        offers.forEach(offer => {
            const claims = offer.claimCount || 0;
            totalClaims += claims;

            if (offer.imageUrl && offer.imageUrl.includes('cloudinary')) {
                claimsWithImage += claims;
                offersWithImage++;
            } else {
                claimsWithoutImage += claims;
                offersWithoutImage++;
            }

            if (typeCounts[offer.discountType]) {
                typeCounts[offer.discountType].claims += claims;
                typeCounts[offer.discountType].count++;
            }
        });

        const avgClaimsWithImage = offersWithImage > 0 ? claimsWithImage / offersWithImage : 0;
        const avgClaimsWithoutImage = offersWithoutImage > 0 ? claimsWithoutImage / offersWithoutImage : 0;
        const imagePerformanceRatio = avgClaimsWithoutImage > 0 
            ? ((avgClaimsWithImage - avgClaimsWithoutImage) / avgClaimsWithoutImage) * 100 
            : avgClaimsWithImage > 0 ? 100 : 0;

        return {
            totalClaims,
            claimsWithImage,
            claimsWithoutImage,
            imagePerformanceRatio,
            typeCounts,
        };
    }, [offers]);
    
    const chartData = useMemo(() => {
        return Object.entries(analytics.typeCounts).map(([name, data]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            claims: data.claims,
        }));
    }, [analytics.typeCounts]);
    
    const mostPopularType = useMemo(() => {
        if (!chartData || chartData.length === 0) return 'N/A';
        return chartData.reduce((prev, current) => (prev.claims > current.claims) ? prev : current).name;
    }, [chartData]);


    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (offers.length === 0) {
        return (
             <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                <BarChart3 className="h-16 w-16 text-muted-foreground" />
                <h2 className="text-2xl font-bold">No Analytics Data Yet</h2>
                <p className="text-muted-foreground">Create and share some offers to see insights here.</p>
                <Link href="/admin/offers/add">
                    <Button>Create Your First Offer</Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Offer Analytics</h1>
                    <p className="text-muted-foreground">Discover what works best for your customers.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                           <ImageIcon className="text-blue-500"/> Image Impact
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-blue-500">
                           {analytics.imagePerformanceRatio >= 0 ? '+' : ''}{analytics.imagePerformanceRatio.toFixed(0)}%
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Offers with images are claimed {Math.abs(analytics.imagePerformanceRatio).toFixed(0)}% {analytics.imagePerformanceRatio >= 0 ? 'more' : 'less'} than those without.
                        </p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                           <Percent className="text-green-500"/> Most Popular Type
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-green-500">{mostPopularType}</p>
                        <p className="text-sm text-muted-foreground">
                            This offer type gets the most claims from your customers.
                        </p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                           <Tag className="text-orange-500"/> Total Claims
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                         <p className="text-3xl font-bold text-orange-500">{analytics.totalClaims}</p>
                        <p className="text-sm text-muted-foreground">
                           Across all your offers, lifetime.
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Claims by Offer Type</CardTitle>
                        <CardDescription>A breakdown of total claims for each type of discount.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="w-full h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <Tooltip
                                        cursor={{ fill: 'hsl(var(--muted))' }}
                                        contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}
                                    />
                                    <Bar dataKey="claims" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>All Offers</CardTitle>
                        <CardDescription>Performance of every offer you've created.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div className="rounded-lg border max-h-[350px] overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Offer Title</TableHead>
                                        <TableHead className="text-right">Claims</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {offers.map(offer => (
                                        <TableRow key={offer.id}>
                                            <TableCell className="font-medium">
                                                <p className="truncate w-60">{offer.title}</p>
                                                <p className="text-xs text-muted-foreground">{format(offer.createdAt.toDate(), 'PP')}</p>
                                            </TableCell>
                                            <TableCell className="text-right font-bold">{offer.claimCount || 0}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
