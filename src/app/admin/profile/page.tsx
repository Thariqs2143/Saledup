
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, LogOut, Loader2, Building, Mail, Phone, MapPin, FileText, Edit, Percent, Briefcase, Settings as SettingsIcon, Tag, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { doc, getDoc, collection, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { AnimatedCounter } from '@/components/animated-counter';
import PricingPageContent from './pricing-content';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

type ShopProfile = {
    ownerName?: string;
    shopName?: string;
    ownerImageUrl?: string;
    imageUrl?: string;
    businessType?: string;
    address?: string;
    gstNumber?: string;
    phone?: string;
    email?: string;
};

type Offer = {
    isActive: boolean;
};

const InfoRow = ({ icon: Icon, label, value, iconClass }: { icon: React.ElementType, label: string, value?: string, iconClass?: string }) => (
    <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
        <Icon className={`h-5 w-5 text-muted-foreground mt-1 ${iconClass}`} />
        <div className="flex-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-medium">{value || 'Not set'}</p>
        </div>
    </div>
);


export default function AdminProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<ShopProfile>({});
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthUser(user);
        let unsubscribeOffers = () => {};

        try {
            const shopDocRef = doc(db, 'shops', user.uid);
            const shopSnap = await getDoc(shopDocRef);
            if (shopSnap.exists()) {
              const data = shopSnap.data() as ShopProfile;
              setProfile({
                ...data,
                email: data.email || user.email || undefined,
                phone: user.phoneNumber || data.phone,
              });
            }

            const offersQuery = collection(db, 'shops', user.uid, 'offers');
            unsubscribeOffers = onSnapshot(offersQuery, 
                (snapshot) => {
                    const offersList = snapshot.docs.map(doc => doc.data() as Offer);
                    setOffers(offersList);
                },
                (error) => {
                    console.error("Firestore Error: ", error);
                    toast({
                        title: "Permission Error",
                        description: "Could not fetch your offer data. You might not have the right permissions.",
                        variant: "destructive"
                    });
                }
            );

        } catch(err) {
             console.error("Failed to fetch initial data", err);
             toast({ title: "Error", description: "Could not load your profile.", variant: "destructive" });
        } finally {
            setLoading(false);
        }

        return () => unsubscribeOffers();
      } else {
        router.push('/login');
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [router, toast]);

  const handleLogout = async () => {
    try {
        await auth.signOut();
        toast({ title: "Logged Out", description: "You have been successfully logged out." });
        router.push('/login');
    } catch (error) {
        toast({ title: "Error", description: "Failed to log out.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const totalOffers = offers.length;
  const activeOffers = offers.filter(o => o.isActive).length;

  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">Manage your account and shop preferences.</p>
        </div>
        
        <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="pricing">Pricing & Billing</TabsTrigger>
            </TabsList>
            <TabsContent value="profile" className="mt-6">
                <div className="space-y-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Shop Profile</CardTitle>
                                <CardDescription>This is how your business appears across the app.</CardDescription>
                            </div>
                             <Link href="/admin/profile/edit">
                                <Button variant="outline">
                                    <Edit className="mr-2 h-4 w-4"/> Edit Profile
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent className="space-y-6">
                             <div className="p-4 rounded-lg border bg-background">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-16 w-16 border-2 border-primary">
                                        <AvatarImage src={profile.imageUrl ?? profile.ownerImageUrl} />
                                        <AvatarFallback>
                                            {profile.shopName?.charAt(0) || 'S'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="text-lg font-bold">{profile.ownerName}</h3>
                                        <p className="text-sm text-muted-foreground">Business Owner</p>
                                    </div>
                                </div>
                             </div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <InfoRow icon={Building} label="Company" value={profile.shopName} />
                                <InfoRow icon={Briefcase} label="Category" value={profile.businessType} />
                                <InfoRow icon={MapPin} label="Location" value={profile.address} />
                                <InfoRow icon={Percent} label="GST Number" value={profile.gstNumber} iconClass="rotate-45" />
                                <InfoRow icon={Phone} label="Phone Number" value={profile.phone} />
                                 <InfoRow icon={Mail} label="Email Address" value={profile.email} />
                             </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Offer Stats</CardTitle>
                            <CardDescription>Your current offer limits and usage.</CardDescription>
                        </CardHeader>
                         <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg bg-muted/50 flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-medium text-muted-foreground">Total Offers</h4>
                                     <p className="text-2xl font-bold"><AnimatedCounter from={0} to={totalOffers} /></p>
                                </div>
                                <Tag className="h-8 w-8 text-primary"/>
                            </div>
                            <div className="p-4 rounded-lg bg-muted/50 flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-medium text-muted-foreground">Active Offers</h4>
                                    <p className="text-2xl font-bold"><AnimatedCounter from={0} to={activeOffers} /></p>
                                </div>
                                <CheckCircle className="h-8 w-8 text-green-500"/>
                            </div>
                         </CardContent>
                         <CardFooter className="flex flex-col sm:flex-row gap-2">
                             <Button asChild variant="outline" className="w-full">
                                <Link href="/admin/offers">Manage Offers</Link>
                             </Button>
                             <Button asChild className="w-full">
                                <Link href="/admin/profile?tab=pricing">Upgrade Plan</Link>
                            </Button>
                         </CardFooter>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Account</CardTitle>
                            <CardDescription>Manage your session.</CardDescription>
                        </CardHeader>
                         <CardContent>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" className="w-full">
                                        <LogOut className="mr-2 h-4 w-4"/>
                                        Logout
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        You will be returned to the login screen.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>No, Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleLogout}>Yes, Logout</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
            <TabsContent value="pricing" className="mt-6">
                <PricingPageContent />
            </TabsContent>
        </Tabs>
    </div>
  );
}
