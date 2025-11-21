
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, LogOut, Loader2, Building, Mail, Phone, MapPin, FileText, Edit, Percent, Briefcase, Settings as SettingsIcon, Tag, CheckCircle, ChevronRight, HelpCircle, Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
} from "@/components/ui/alert-dialog";
import PricingPageContent from './pricing-content';


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

const InfoRow = ({ icon: Icon, label, value }: { icon: React.ElementType, label: string, value?: string }) => (
    <div className="flex items-center gap-4 py-4 border-b last:border-b-0">
        <div className="p-3 bg-primary/10 rounded-full">
            <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-semibold text-base">{value || 'Not set'}</p>
        </div>
    </div>
);

const SettingsRow = ({ icon: Icon, label, href }: { icon: React.ElementType, label: string, href: string }) => (
    <Link href={href}>
        <div className="flex items-center gap-4 py-3 border-b last:border-b-0 cursor-pointer hover:bg-muted/50 -mx-6 px-6">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <span className="flex-1 font-medium">{label}</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
    </Link>
);


export default function AdminProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<ShopProfile>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthUser(user);
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
        } catch(err) {
             console.error("Failed to fetch initial data", err);
             toast({ title: "Error", description: "Could not load your profile.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
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

  return (
    <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        </div>
        
        <Card className="text-center p-6">
            <CardContent className="pt-6">
                <Avatar className="h-24 w-24 border-4 border-primary/50 mx-auto">
                    <AvatarImage src={profile.imageUrl ?? profile.ownerImageUrl} />
                    <AvatarFallback>
                        {profile.ownerName?.charAt(0) || 'A'}
                    </AvatarFallback>
                </Avatar>
                <h3 className="text-2xl font-bold mt-4">{profile.ownerName}</h3>
                <div className="inline-flex items-center gap-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-1 rounded-full text-sm font-semibold mt-2">
                    <CheckCircle className="h-4 w-4" />
                    Business Owner
                </div>
            </CardContent>
        </Card>

        <div className="space-y-6">
            <h2 className="text-xl font-bold">Personal Information</h2>
            <Card>
                <CardContent className="pt-6">
                    <InfoRow icon={Phone} label="Phone Number" value={profile.phone} />
                    <InfoRow icon={Building} label="Company" value={profile.shopName} />
                    <InfoRow icon={MapPin} label="Location" value={profile.address} />
                    <InfoRow icon={Percent} label="GST Number" value={profile.gstNumber} iconClass="rotate-45" />
                </CardContent>
            </Card>
        </div>

        <div className="space-y-6">
            <h2 className="text-xl font-bold">Settings</h2>
            <Card>
                <CardContent className="pt-6">
                    <SettingsRow icon={Edit} label="Edit Profile" href="/admin/profile/edit" />
                    <SettingsRow icon={Bell} label="Notifications" href="/admin/notifications" />
                    <SettingsRow icon={Tag} label="Pricing & Billing" href="/admin/profile?tab=pricing-redirect" />
                    <SettingsRow icon={HelpCircle} label="Help & Support" href="/contact" />
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardContent className="pt-6">
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 justify-start p-0 h-auto">
                            <div className="flex items-center gap-4 py-3 w-full">
                                <LogOut className="h-5 w-5"/>
                                <span className="flex-1 font-medium">Logout</span>
                            </div>
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

        {/* This is a hidden redirect handler for the pricing tab */}
        {searchParams.get('tab') === 'pricing-redirect' && <PricingRedirect />}
    </div>
  );
}

// A simple component to handle the tab switch logic for pricing
function PricingRedirect() {
    const router = useRouter();
    useEffect(() => {
        // This is a bit of a trick: we land here, then immediately replace the URL
        // to show the correct tab on the separate pricing page, which is now part of the profile page.
        // For a real app, this logic would be inside a single component, but we are working with separate pages.
        // A better long term solution is to merge pricing-content into profile page fully.
        router.replace('/admin/profile/pricing-content');
    }, [router]);
    return null;
}
