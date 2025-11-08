
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, LogOut, Loader2, Building, Mail, Phone, MapPin, FileText, Edit, Percent, Briefcase, Settings as SettingsIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"

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
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">Manage your account and shop preferences.</p>
        </div>
        
        <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="subscription" disabled>Subscription</TabsTrigger>
                <TabsTrigger value="shifts" disabled>Shifts</TabsTrigger>
                <TabsTrigger value="business" disabled>Business</TabsTrigger>
                <TabsTrigger value="general" disabled>General</TabsTrigger>
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
                             </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Usage</CardTitle>
                            <CardDescription>Your current plan usage. Upgrade to increase limits.</CardDescription>
                        </CardHeader>
                         <CardContent className="space-y-4">
                             <div>
                                 <div className="flex justify-between mb-1">
                                    <h4 className="text-sm font-medium">Employees</h4>
                                    <p className="text-sm text-muted-foreground">1 / 5</p>
                                 </div>
                                 <Progress value={20} />
                             </div>
                             <div>
                                <div className="flex justify-between mb-1">
                                    <h4 className="text-sm font-medium">Branches</h4>
                                    <p className="text-sm text-muted-foreground">1 / 1</p>
                                </div>
                                <Progress value={100} />
                             </div>
                         </CardContent>
                         <CardFooter className="flex flex-col sm:flex-row gap-2">
                             <Button variant="outline" className="w-full">Manage Employees</Button>
                             <Button variant="outline" className="w-full">Manage Branches</Button>
                             <Button className="w-full">Upgrade Plan</Button>
                         </CardFooter>
                    </Card>
                </div>
            </TabsContent>
        </Tabs>
    </div>
  );
}
