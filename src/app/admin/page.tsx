'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, QrCode, Loader2, BarChart3, LogOut, Activity, Sparkles, Tag, Eye, CheckCircle, XCircle } from "lucide-react";
import Link from 'next/link';
import { AnimatedCounter } from "@/components/animated-counter";
import { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot, query, where, Timestamp, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { formatDistanceToNow } from 'date-fns';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from "next/navigation";

// Types specific to Saledup
type Offer = {
    id: string;
    title: string;
    description: string;
    imageUrl?: string;
    discountType: 'percentage' | 'fixed' | 'freebie';
    discountValue?: number;
    isActive: boolean;
    createdAt: Timestamp;
};

type Claim = {
    id: string;
    customerName: string;
    customerEmail: string;
    offerId: string;
    offerTitle: string;
    claimedAt: Timestamp;
    status: 'claimed' | 'redeemed';
};

export default function AdminDashboard() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        if(!user){
          setAuthUser(null);
          router.push('/login');
        } else {
            setAuthUser(user);
        }
    });
    return () => unsubscribeAuth();
  }, [router]);
  
  useEffect(() => {
    if (!authUser) {
      setLoading(false);
      return;
    };

    setLoading(true);

    const offersQuery = query(
      collection(db, 'shops', authUser.uid, 'offers'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeOffers = onSnapshot(offersQuery, (snapshot) => {
        const offersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Offer));
        setOffers(offersList);
    }, (error) => {
        console.error("Error fetching offers: ", error);
        toast({ title: "Error", description: "Could not fetch offers.", variant: "destructive"});
    });

    const claimsQuery = query(
      collection(db, 'shops', authUser.uid, 'claims'),
      orderBy('claimedAt', 'desc'),
      limit(20) // Get the most recent 20 claims for the feed
    );
    const unsubscribeClaims = onSnapshot(claimsQuery, (snapshot) => {
        const claimsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Claim));
        setClaims(claimsList);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching claims: ", error);
        toast({ title: "Error", description: "Could not fetch customer claims.", variant: "destructive"});
        setLoading(false);
    });


    return () => { 
        unsubscribeOffers();
        unsubscribeClaims();
    };
  }, [authUser, toast]); 

  const totalClaims = useMemo(() => claims.length, [claims]);
  const totalOffers = useMemo(() => offers.length, [offers]);
  const activeOffers = useMemo(() => offers.filter(o => o.isActive).length, [offers]);
  const expiredOffers = useMemo(() => offers.filter(o => !o.isActive).length, [offers]);

  if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )
  }

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
       <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Welcome to Saledup!
            </h1>
            <p className="text-muted-foreground">Here's a quick overview of your shop's performance.</p>
           </div>
       </div>

       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
        <Card className="relative overflow-hidden transition-all duration-300 ease-out hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-blue-100">Total Offers</CardTitle>
            <Tag className="h-5 w-5 text-blue-200" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold flex items-center gap-2">
              <AnimatedCounter from={0} to={totalOffers} />
            </div>
          </CardContent>
        </Card>
         <Card className="relative overflow-hidden transition-all duration-300 ease-out hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br from-green-500 to-emerald-600 text-white border-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-green-100">Active Offers</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-200" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold flex items-center gap-2">
              <AnimatedCounter from={0} to={activeOffers} />
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden transition-all duration-300 ease-out hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br from-amber-500 to-orange-600 text-white border-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-amber-100">Expired Offers</CardTitle>
            <XCircle className="h-5 w-5 text-amber-200" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold flex items-center gap-2">
              <AnimatedCounter from={0} to={expiredOffers} />
            </div>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden transition-all duration-300 ease-out hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white border-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-fuchsia-100">Total Claims</CardTitle>
            <Users className="h-5 w-5 text-fuchsia-200" />
          </CardHeader>
          <CardContent>
             <div className="text-4xl font-bold">
                <AnimatedCounter from={0} to={totalClaims} />
            </div>
          </CardContent>
        </Card>
      </div>

       <Card>
            <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold">View Your Live Offers Page</h3>
                    <p className="text-sm text-muted-foreground">This is the public page your customers see when they scan your QR code.</p>
                </div>
                <Button asChild>
                    <Link href={`/shops/${authUser?.uid}`} target="_blank">
                        Live View <Eye className="ml-2 h-4 w-4"/>
                    </Link>
                </Button>
            </CardContent>
        </Card>

       <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="transform-gpu xl:col-span-2 transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground dark:border-foreground hover:border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity className="h-6 w-6 text-primary"/>
                  <CardTitle>Customer Activity Feed</CardTitle>
                </div>
                <Link href="/admin/customers">
                    <Button variant="outline" size="sm">
                        <Eye className="mr-2 h-4 w-4"/> View All
                    </Button>
                </Link>
            </div>
            <CardDescription>A real-time log of customers claiming your offers.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
                 <div className="flex items-center justify-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 </div>
            ) : claims.length > 0 ? (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {claims.map((claim) => (
                      <div key={claim.id} className="flex items-start gap-4">
                        <Avatar className="h-10 w-10 border">
                            <AvatarFallback>{claim.customerName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-sm">
                            <p>
                                <span className="font-semibold">{claim.customerName}</span>
                                {' '}claimed the offer "{claim.offerTitle}".
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(claim.claimedAt.toDate(), { addSuffix: true })}
                            </p>
                        </div>
                        <div className="text-xs text-muted-foreground hidden sm:block">{claim.customerEmail}</div>
                       </div>
                    ))}
                </div>
            ) : (
                 <div className="text-center py-12 text-muted-foreground">
                    <p>No customers have claimed offers yet.</p>
                </div>
            )}
          </CardContent>
       </Card>
       <Card className="transform-gpu transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground dark:border-foreground hover:border-primary">
            <CardHeader>
                <div className="flex items-center gap-3">
                   <Sparkles className="h-6 w-6 text-primary"/>
                   <CardTitle>Quick Actions</CardTitle>
                </div>
                <CardDescription>Get started with these common tasks.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
                <Link href="/admin/offers/add">
                    <Card className="h-full flex flex-col items-center justify-center p-4 gap-2 transition-all hover:shadow-md hover:border-primary border-2 border-foreground">
                        <Tag className="h-6 w-6 text-primary"/>
                        <span className="text-center text-sm font-medium">Create Offer</span>
                    </Card>
                </Link>
                 <Link href="/admin/qr-code">
                    <Card className="h-full flex flex-col items-center justify-center p-4 gap-2 transition-all hover:shadow-md hover:border-primary border-2 border-foreground">
                        <QrCode className="h-6 w-6 text-primary"/>
                        <span className="text-center text-sm font-medium">Get Shop QR</span>
                    </Card>
                </Link>
                 <Link href="/admin/offers">
                     <Card className="h-full flex flex-col items-center justify-center p-4 gap-2 transition-all hover:shadow-md hover:border-primary border-2 border-foreground">
                        <Users className="h-6 w-6 text-primary"/>
                        <span className="text-center text-sm font-medium">Manage Offers</span>
                    </Card>
                </Link>
                 <Link href="/admin/customers">
                     <Card className="h-full flex flex-col items-center justify-center p-4 gap-2 transition-all hover:shadow-md hover:border-primary border-2 border-foreground">
                        <BarChart3 className="h-6 w-6 text-primary"/>
                        <span className="text-center text-sm font-medium">View Customers</span>
                    </Card>
                </Link>
            </CardContent>
        </Card>
      </div>

      <div className="text-left text-muted-foreground mt-8 py-4">
        <div className="flex flex-col md:flex-row md:gap-x-4">
            <h1 className="text-5xl md:text-6xl font-extrabold">Sale</h1>
            <h1 className="text-5xl md:text-6xl font-extrabold">It Up !</h1>
        </div>
        <p className="text-sm mt-2">Crafted with ❤️ in TamilNadu, India</p>
      </div>
    </div>
  );
}
