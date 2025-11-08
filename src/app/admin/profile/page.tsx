
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, LogOut, Loader2, Building, Shield, Mail, Phone, MapPin, FileText, Edit } from 'lucide-react';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type ShopProfile = {
    ownerName?: string;
    shopName?: string;
    ownerImageUrl?: string;
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthUser(user);
        const shopDocRef = doc(db, 'shops', user.uid);
        const shopSnap = await getDoc(shopDocRef);
        if (shopSnap.exists()) {
          const data = shopSnap.data()
          setProfile({
            ...data,
            email: user.email,
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
       <div className="flex justify-between items-start">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
                <p className="text-muted-foreground">Manage your personal and shop details.</p>
            </div>
       </div>
      
       <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-1 flex flex-col items-center text-center">
             <Card className="w-full">
                <CardContent className="pt-6">
                    <Avatar className="h-28 w-28 border-4 border-primary mx-auto">
                        <AvatarImage src={profile.ownerImageUrl} />
                        <AvatarFallback>
                            <Building className="h-12 w-12"/>
                        </AvatarFallback>
                    </Avatar>
                    <h2 className="text-2xl font-bold mt-4">{profile.shopName}</h2>
                    <p className="text-muted-foreground">{profile.businessType}</p>
                </CardContent>
             </Card>
          </div>
          <div className="md:col-span-2">
            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <CardTitle>Business Details</CardTitle>
                    <Link href="/admin/profile/edit">
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
    </div>
  );
}
