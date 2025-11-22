
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BarChart3, Image as ImageIcon, Percent, Tag, FileText, Eye, Clock, TrendingUp, IndianRupee, Gift, Users, CheckCircle } from "lucide-react";
import { collection, query, onSnapshot, orderBy, type Timestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnimatedCounter } from '@/components/animated-counter';

// --- TYPE DEFINITIONS ---
type Offer = {
    id: string;
    title: string;
    imageUrl?: string;
    claimCount: number;
    viewCount?: number;
    discountType: 'percentage' | 'fixed' | 'freebie' | 'other';
    createdAt: Timestamp;
};

type Claim = {
    id: string;
    claimedAt: Timestamp;
    approximateValue?: number;
    offerId: string;
};

type Voucher = {
    id: string;
    value: number;
    status: 'valid' | 'redeemed' | 'expired';
    createdAt: Timestamp;
    redeemedAt?: Timestamp;
};

// --- HELPER MAPPING FOR DISPLAY ---
const offerTypeDisplayMap: { [key: string]: string } = {
    'Percentage': '%',
    'Fixed': 'Fixed',
    'Freebie': 'Freebie',
    'Other': 'Other',
    'N/A': 'N/A'
};


// --- MAIN COMPONENT ---
export default function AdminAnalyticsPage() {
    // --- STATE MANAGEMENT ---
    const [offers, setOffers] = useState<Offer[]>([]);
    const [claims, setClaims] = useState<Claim[]>([]);
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [loading, setLoading] = useState(true);
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [timeFilter, setTimeFilter] = useState('weekly');
    const router = useRouter();
    const { toast } = useToast();

    // --- AUTHENTICATION & DATA FETCHING ---
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) setAuthUser(user);
            else router.push('/login');
        });
        return () => unsubscribeAuth();
    }, [router]);

    useEffect(() => {
        if (!authUser) return;

        setLoading(true);
        const dataPromises = [
            new Promise<void>((resolve, reject) => {
                const q = query(collection(db, 'shops', authUser.uid, 'offers'), orderBy('createdAt', 'desc'));
                onSnapshot(q, (snap) => { setOffers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Offer))); resolve(); }, reject);
            }),
            new Promise<void>((resolve, reject) => {
                const q = query(collection(db, 'shops', authUser.uid, 'claims'));
                onSnapshot(q, (snap) => { setClaims(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Claim))); resolve(); }, reject);
            }),
            new Promise<void>((resolve, reject) => {
                const q = query(collection(db, 'shops', authUser.uid, 'vouchers'));
                onSnapshot(q, (snap) => { setVouchers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Voucher))); resolve(); }, reject);
            }),
        ];

        Promise.all(dataPromises)
            .catch(error => {
                console.error("Error fetching analytics data: ", error);
                toast({ title: "Error", description: "You don't have permission to view analytics.", variant: "destructive" });
            })
            .finally(() => setLoading(false));

    }, [authUser, toast]);

    // --- DATA FILTERING & MEMOIZATION ---
    const filteredData = useMemo(() => {
        const now = new Date();
        let start, end;
        switch (timeFilter) {
            case 'today':
                start = startOfDay(now);
                end = endOfDay(now);
                break;
            case 'monthly':
                start = startOfMonth(now);
                end = endOfMonth(now);
                break;
            case 'weekly':
            default:
                start = startOfWeek(now, { weekStartsOn: 1 });
                end = endOfWeek(now, { weekStartsOn: 1 });
        }

        const filterByDate = (item: { createdAt?: Timestamp, claimedAt?: Timestamp, redeemedAt?: Timestamp }) => {
            const itemDate = (item.createdAt || item.claimedAt || item.redeemedAt)?.toDate();
            return itemDate ? itemDate >= start && itemDate <= end : false;
        };
        
        return {
            offers: offers.filter(filterByDate),
            claims: claims.filter(filterByDate),
            redeemedVouchers: vouchers.filter(v => v.status === 'redeemed' && v.redeemedAt && filterByDate(v)),
        };
    }, [offers, claims, vouchers, timeFilter]);
    
    // --- ANALYTICS CALCULATIONS ---
    const analytics = useMemo(() => {
        // Offer-specific calculations
        let claimsWithImage = 0;
        let offersWithImageCount = 0;
        let claimsWithoutImage = 0;
        let offersWithoutImageCount = 0;
        
        const allFilteredOffers = offers.filter(o => o.createdAt);
        const totalViews = allFilteredOffers.reduce((sum, offer) => sum + (offer.viewCount || 0), 0);

        const offerTypeCounts: { [key: string]: { claims: number, count: number } } = {
            percentage: { claims: 0, count: 0 },
            fixed: { claims: 0, count: 0 },
            freebie: { claims: 0, count: 0 },
            other: { claims: 0, count: 0 },
        };
        
        const offerMap = new Map(allFilteredOffers.map(o => [o.id, o]));

        filteredData.claims.forEach(claim => {
            const offer = offerMap.get(claim.offerId);
            if (!offer) return;

            if (offer.imageUrl && offer.imageUrl.includes('cloudinary')) {
                claimsWithImage++;
            } else {
                claimsWithoutImage++;
            }

            if (offerTypeCounts[offer.discountType]) {
                offerTypeCounts[offer.discountType].claims++;
            }
        });
        
        allFilteredOffers.forEach(offer => {
            if (offerTypeCounts[offer.discountType]) {
                offerTypeCounts[offer.discountType].count++;
            }
            if (offer.imageUrl && offer.imageUrl.includes('cloudinary')) {
                offersWithImageCount++;
            } else {
                offersWithoutImageCount++;
            }
        });

        const avgClaimsWithImage = offersWithImageCount > 0 ? claimsWithImage / offersWithImageCount : 0;
        const avgClaimsWithoutImage = offersWithoutImageCount > 0 ? claimsWithoutImage / offersWithoutImageCount : 0;
        const imagePerformanceRatio = avgClaimsWithoutImage > 0 ? ((avgClaimsWithImage - avgClaimsWithoutImage) / avgClaimsWithoutImage) * 100 : (avgClaimsWithImage > 0 ? 100 : 0);

        // Peak time calculation
        const allActivity = [...filteredData.claims.map(c => c.claimedAt), ...filteredData.redeemedVouchers.map(v => v.redeemedAt!)];
        let peakActivityTime = 'N/A';
        if (allActivity.length > 0) {
            const hourCounts: Record<number, number> = Array.from({ length: 24 }, () => 0);
            allActivity.forEach(item => {
                if (item) {
                    const hour = item.toDate().getHours();
                    hourCounts[hour]++;
                }
            });

            const maxActivity = Math.max(...Object.values(hourCounts));
            if (maxActivity > 0) {
                const peakHour = Object.keys(hourCounts).map(Number).find(h => hourCounts[h] === maxActivity) || 0;
                
                const formatHour = (h: number) => {
                    const hour12 = h % 12 === 0 ? 12 : h % 12;
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    return `${hour12}${ampm}`;
                };

                const startHour = peakHour;
                const endHour = (peakHour + 2);
                
                peakActivityTime = `${formatHour(startHour)} - ${formatHour(endHour % 24)}`;
            }
        }
        
        return {
            totalClaimsAndRedemptions: (filteredData.claims?.length || 0) + (filteredData.redeemedVouchers?.length || 0),
            totalValueRedeemed: (filteredData.redeemedVouchers?.reduce((sum, v) => sum + v.value, 0) || 0) + (filteredData.claims?.reduce((sum, c) => sum + (c.approximateValue || 0), 0) || 0),
            totalViews: totalViews || 0,
            totalClaims: filteredData.claims?.length || 0,
            imagePerformanceRatio: imagePerformanceRatio || 0,
            offerTypeCounts: offerTypeCounts,
            peakActivityTime: peakActivityTime,
            overallConversionRate: totalViews > 0 ? (filteredData.claims.length / totalViews) * 100 : 0,
        };
    }, [offers, claims, vouchers, filteredData]);
    
    // --- CHART DATA PREPARATION ---
    const offerTypeChartData = useMemo(() => Object.entries(analytics.offerTypeCounts).map(([name, data]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value: data.claims })).filter(d => d.value > 0), [analytics.offerTypeCounts]);
    const mostPopularType = useMemo(() => offerTypeChartData.length > 0 ? offerTypeChartData.reduce((p, c) => p.value > c.value ? p : c).name : 'N/A', [offerTypeChartData]);
    const trendChartData = useMemo(() => {
         const days = Array.from({length: 7}, (_, i) => format(subDays(new Date(), 6 - i), 'EEE'));
         const dataMap = days.reduce((acc, day) => { acc[day] = { claims: 0, redemptions: 0 }; return acc; }, {} as Record<string, {claims: number, redemptions: number}>);
         
         claims.filter(c => c.claimedAt.toDate() >= subDays(new Date(), 6)).forEach(c => {
            const day = format(c.claimedAt.toDate(), 'EEE');
            if (dataMap[day]) dataMap[day].claims++;
         });
         vouchers.filter(v => v.redeemedAt && v.redeemedAt.toDate() >= subDays(new Date(), 6)).forEach(v => {
            const day = format(v.redeemedAt!.toDate(), 'EEE');
            if (dataMap[day]) dataMap[day].redemptions++;
         });
         
         return days.map(day => ({ date: day, Offers: dataMap[day].claims, Vouchers: dataMap[day].redemptions }));

    }, [claims, vouchers]);

    // --- RENDER LOGIC ---
    if (loading) {
        return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }
    if (offers.length === 0 && vouchers.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                <BarChart3 className="h-16 w-16 text-muted-foreground" />
                <h2 className="text-2xl font-bold">No Analytics Data Yet</h2>
                <p className="text-muted-foreground">Create and share some offers or vouchers to see insights here.</p>
                <Link href="/admin/offers/add"><Button>Create Your First Offer</Button></Link>
            </div>
        )
    }

    return (
        <div className="space-y-8">
             <Tabs value={timeFilter} onValueChange={setTimeFilter} className="w-full">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Shop Analytics</h1>
                        <p className="text-muted-foreground">Discover what works best for your customers.</p>
                    </div>
                    <TabsList className="grid w-full sm:w-auto grid-cols-3">
                        <TabsTrigger value="today">Today</TabsTrigger>
                        <TabsTrigger value="weekly">This Week</TabsTrigger>
                        <TabsTrigger value="monthly">This Month</TabsTrigger>
                    </TabsList>
                </div>
            </Tabs>
            
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
                <Card className="relative overflow-hidden transition-all duration-300 ease-out hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none">
                     <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold text-indigo-100">Claims &amp; Redemptions</CardTitle>
                        <Users className="h-5 w-5 text-indigo-200" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold"><AnimatedCounter to={analytics.totalClaimsAndRedemptions} /></div>
                        <p className="text-xs text-indigo-100 mt-1">Total customer engagements</p>
                    </CardContent>
                </Card>
                 <Card className="relative overflow-hidden transition-all duration-300 ease-out hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br from-cyan-500 to-sky-600 text-white border-none">
                     <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold text-cyan-100">Total Value</CardTitle>
                        <IndianRupee className="h-5 w-5 text-cyan-200" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">₹<AnimatedCounter to={analytics.totalValueRedeemed} /></div>
                         <p className="text-xs text-cyan-100 mt-1">Approx value redeemed</p>
                    </CardContent>
                </Card>
                <Card className="relative overflow-hidden transition-all duration-300 ease-out hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br from-green-500 to-emerald-600 text-white border-none">
                     <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold text-green-100">Total Views</CardTitle>
                        <Eye className="h-5 w-5 text-green-200" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold"><AnimatedCounter to={analytics.totalViews} /></div>
                         <p className="text-xs text-green-100 mt-1">Offer page views</p>
                    </CardContent>
                </Card>
                <Card className="relative overflow-hidden transition-all duration-300 ease-out hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br from-rose-500 to-red-600 text-white border-none">
                     <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold text-rose-100">Total Claims</CardTitle>
                        <Tag className="h-5 w-5 text-rose-200" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold"><AnimatedCounter to={analytics.totalClaims} /></div>
                         <p className="text-xs text-rose-100 mt-1">Offers claimed by customers</p>
                    </CardContent>
                </Card>
            </div>
            
            <Tabs defaultValue="offers" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="offers"><Tag className="mr-2 h-4 w-4"/> Offers</TabsTrigger>
                    <TabsTrigger value="vouchers"><Gift className="mr-2 h-4 w-4"/> Vouchers</TabsTrigger>
                </TabsList>

                {/* OFFERS CONTENT */}
                <TabsContent value="offers" className="mt-6 space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card><CardHeader><CardTitle>Image Impact</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-blue-500">{analytics.imagePerformanceRatio >= 0 ? '+' : ''}{analytics.imagePerformanceRatio.toFixed(0)}%</p><p className="text-xs text-muted-foreground">Claim rate for offers with images.</p></CardContent></Card>
                        <Card><CardHeader><CardTitle>Most Popular</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-500">{offerTypeDisplayMap[mostPopularType]}</p><p className="text-xs text-muted-foreground">This offer type gets the most claims.</p></CardContent></Card>
                        <Card><CardHeader><CardTitle>Conversion Rate</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-purple-500">{analytics.overallConversionRate.toFixed(1)}%</p><p className="text-xs text-muted-foreground">Views that turned into claims.</p></CardContent></Card>
                        <Card><CardHeader><CardTitle>Peak Activity</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-orange-500">{analytics.peakActivityTime}</p><p className="text-xs text-muted-foreground">Hour in peak actions</p></CardContent></Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        <Card className="lg:col-span-3">
                            <CardHeader>
                                <CardTitle>Claims by Offer Type</CardTitle>
                                <CardDescription>Breakdown of claims for each discount type.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {offerTypeChartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie 
                                                data={offerTypeChartData} 
                                                dataKey="value" 
                                                nameKey="name" 
                                                cx="50%" 
                                                cy="50%" 
                                                outerRadius={100} 
                                                labelLine={false}
                                                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                                                    const RADIAN = Math.PI / 180;
                                                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                                    return (
                                                        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                                                            {`${(percent * 100).toFixed(0)}%`}
                                                        </text>
                                                    );
                                                }}
                                            >
                                                {offerTypeChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${index + 1}))`} />)}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }}/>
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                                        No offer claims in this period.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        <Card className="lg:col-span-2">
                             <CardHeader><CardTitle>All Offers Performance</CardTitle><CardDescription>A lifetime summary of your offer performance.</CardDescription></CardHeader>
                             <CardContent>
                                 <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
                                     {offers.map(offer => {
                                        const convRate = (offer.viewCount || 0) > 0 ? ((offer.claimCount || 0) / (offer.viewCount || 1)) * 100 : 0;
                                         return (
                                             <div key={offer.id} className="border-b last:border-b-0 py-3 flex justify-between items-center gap-2">
                                                 <div className="flex-1">
                                                     <p className="font-semibold truncate w-32 sm:w-40">{offer.title}</p>
                                                     <p className="text-xs text-muted-foreground">{format(offer.createdAt.toDate(), 'PP')}</p>
                                                 </div>
                                                 <div className="flex gap-4 text-right">
                                                     <div><p className="font-bold">{offer.viewCount || 0}</p><p className="text-xs text-muted-foreground">Views</p></div>
                                                     <div><p className="font-bold">{offer.claimCount || 0}</p><p className="text-xs text-muted-foreground">Claims</p></div>
                                                     <div><p className="font-bold">{convRate.toFixed(1)}%</p><p className="text-xs text-muted-foreground">Conv.</p></div>
                                                 </div>
                                             </div>
                                         );
                                     })}
                                 </div>
                             </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* VOUCHERS CONTENT */}
                <TabsContent value="vouchers" className="mt-6 space-y-6">
                     <Card>
                        <CardHeader>
                            <CardTitle>Weekly Activity Trend</CardTitle>
                            <CardDescription>A 7-day overview of offer claims and voucher redemptions.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={trendChartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))' }} />
                                    <Legend />
                                    <Line type="monotone" dataKey="Offers" stroke="hsl(var(--primary))" strokeWidth={2} />
                                    <Line type="monotone" dataKey="Vouchers" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
