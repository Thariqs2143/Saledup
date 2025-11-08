
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, LogOut, Loader2, Building, Mail, Phone, MapPin, FileText, Edit } from 'lucide-react';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
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
import { cn } from '@/lib/utils';


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
    <div className="flex items-start gap-4">
        <Icon className="h-5 w-5 text-muted-foreground mt-1" />
        <div className="flex-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-medium">{value || 'Not set'}</p>
        </div>
    </div>
);


export default function AdminProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<ShopProfile>({});
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 768);
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthUser(user);
        const shopDocRef = doc(db, 'shops', user.uid);
        const shopSnap = await getDoc(shopDocRef);
        if (shopSnap.exists()) {
          const data = shopSnap.data() as ShopProfile;
          setProfile({
            ...data,
            // Ensure email from auth is a fallback
            email: data.email || user.email || undefined,
            phone: user.phoneNumber || data.phone,
          });
        }
      } else {
        router.push('/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);
  
  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await auth.signOut();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      router.push('/login');
    } catch (error) {
      console.error("Error signing out: ", error);
      toast({
        title: "Logout Failed",
        description: "Could not log you out. Please try again.",
        variant: "destructive",
      });
    } finally {
        setLoggingOut(false);
    }
  };
  
  const LogoutConfirmation = () => (
      <>
        <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action will log you out of your current session. You will need to log back in to access your dashboard.
            </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} disabled={loggingOut} className="bg-destructive hover:bg-destructive/90">
                {loggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Yes, Logout
            </AlertDialogAction>
        </AlertDialogFooter>
    </>
  );

  const LogoutSheetConfirmation = () => (
    <>
        <SheetHeader className="text-center">
            <SheetTitle className="text-2xl">Log Out?</SheetTitle>
            <SheetDescription>
                Are you sure you want to log out from your account?
            </SheetDescription>
        </SheetHeader>
        <SheetFooter className="mt-6 flex-row gap-2">
             <SheetClose asChild>
                <Button variant="outline" className="w-full">Cancel</Button>
            </SheetClose>
            <Button onClick={handleLogout} disabled={loggingOut} variant="destructive" className="w-full">
                {loggingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Yes, Logout
            </Button>
        </SheetFooter>
    </>
  );


  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
       <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
             <Card>
                <CardContent className="pt-6 flex items-center gap-4">
                    <Avatar className="h-20 w-20 border-2 border-primary">
                        <AvatarImage src={profile.imageUrl ?? profile.ownerImageUrl} />
                        <AvatarFallback>
                            <Building className="h-8 w-8"/>
                        </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                        <h2 className="text-xl font-bold">{profile.shopName}</h2>
                        <p className="text-muted-foreground text-sm">{profile.businessType}</p>
                    </div>
                </CardContent>
             </Card>
          </div>
          <div className="md:col-span-2">
            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <CardTitle>Business Details</CardTitle>
                     <Link href="/admin/profile/edit" className="w-fit">
                        <Button variant="outline" size="sm">
                            <Edit className="mr-2 h-4 w-4"/>
                            Edit Profile
                        </Button>
                    </Link>
                </CardHeader>
                <CardContent className="space-y-6">
                    <InfoRow icon={User} label="Owner Name" value={profile.ownerName} />
                    <InfoRow icon={MapPin} label="Shop Address" value={profile.address} />
                    <InfoRow icon={Phone} label="Contact Phone" value={profile.phone} />
                    <InfoRow icon={Mail} label="Contact Email" value={profile.email} />
                    <InfoRow icon={FileText} label="GST Number" value={profile.gstNumber || 'Not provided'} />
                </CardContent>
            </Card>
          </div>
       </div>

        {isMobile ? (
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="destructive" className="w-full">
                        <LogOut className="mr-2 h-4 w-4"/> Logout
                    </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-lg">
                    <LogoutSheetConfirmation />
                </SheetContent>
            </Sheet>
        ) : (
            <AlertDialog>
                <AlertDialogTrigger asChild>
                     <Button variant="destructive" className="w-full">
                        <LogOut className="mr-2 h-4 w-4"/> Logout
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                   <LogoutConfirmation />
                </AlertDialogContent>
            </AlertDialog>
        )}
    </div>
  );
}

    