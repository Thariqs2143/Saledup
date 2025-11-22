
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, LogOut, Loader2, Save, Upload, Building, ArrowLeft } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { AddressInput } from '@/components/address-input';
import Image from 'next/image';

type ShopProfile = {
    ownerName?: string;
    shopName?: string;
    ownerImageUrl?: string;
    imageUrl?: string;
    coverImageUrl?: string;
    businessType?: string;
    address?: string;
    gstNumber?: string;
    phone?: string;
    email?: string;
    lat?: number;
    lng?: number;
};

export default function AdminEditProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<ShopProfile>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<'logo' | 'cover' | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  
  const [address, setAddress] = useState('');
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthUser(user);
        const shopDocRef = doc(db, 'shops', user.uid);
        const shopSnap = await getDoc(shopDocRef);
        if (shopSnap.exists()) {
          const data = shopSnap.data() as ShopProfile;
          const currentProfile = {
            ...data,
            email: data.email || user.email || '',
            phone: user.phoneNumber || data.phone,
          };
          setProfile(currentProfile);
          setAddress(data.address || '');
          if (data.lat && data.lng) {
              setLocation({lat: data.lat, lng: data.lng});
          }
        }
      } else {
        router.push('/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);
  

  const handleFieldChange = (field: keyof ShopProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover') => {
    if (!authUser || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploading(type);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'saledup');

    try {
        const response = await fetch('https://api.cloudinary.com/v1_1/dyov4r11v/image/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) throw new Error('Upload failed');
        
        const data = await response.json();
        const newImageUrl = data.secure_url;
        
        if (type === 'logo') {
            setProfile((prev) => ({ ...prev, imageUrl: newImageUrl }));
            toast({ title: "Logo Uploaded!", description: "Your new shop logo is ready. Save changes to apply." });
        } else {
            setProfile((prev) => ({ ...prev, coverImageUrl: newImageUrl }));
            toast({ title: "Cover Photo Uploaded!", description: "Your new cover photo is ready. Save changes to apply." });
        }

    } catch (error) {
        console.error("Error uploading photo:", error);
        toast({ title: "Upload Failed", description: "Could not upload your photo.", variant: "destructive" });
    } finally {
        setUploading(null);
    }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) return;
    setSaving(true);
    try {
      const shopDocRef = doc(db, 'shops', authUser.uid);
      
      const changes: Partial<ShopProfile> = { ...profile, address };
      if (location) {
          changes.lat = location.lat;
          changes.lng = location.lng;
      }
      
      if(Object.keys(changes).length > 0) {
        await updateDoc(shopDocRef, changes);
        toast({
          title: 'Profile Updated',
          description: 'Your changes have been saved successfully.',
        });
         router.push('/admin/profile');
      } else {
        toast({
          title: 'No Changes',
          description: 'You haven\'t made any changes to save.',
        });
      }

    } catch (error) {
      toast({
        title: 'Error Saving',
        description: 'Could not update your profile.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
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
    <form onSubmit={handleSaveChanges} className="space-y-8">
       <div className="flex items-center gap-4">
            <Link href="/admin/profile">
                <Button variant="outline" size="icon" className="h-8 w-8" type="button">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back</span>
                </Button>
            </Link>
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Edit Profile</h1>
                <p className="text-muted-foreground hidden md:block">Update your personal and shop details.</p>
            </div>
       </div>
      
        <Card>
            <CardHeader>
                <CardTitle>Business Profile</CardTitle>
                <CardDescription>
                    This information is displayed publicly on your shop page.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                     <Label>Shop Cover Photo</Label>
                     <div className="relative w-full aspect-[16/6] bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                        {profile.coverImageUrl ? (
                            <Image src={profile.coverImageUrl} alt="Cover preview" layout="fill" objectFit="cover" />
                        ) : (
                            <p className="text-sm text-muted-foreground">No cover photo set</p>
                        )}
                         <input type="file" ref={coverInputRef} onChange={(e) => handlePhotoUpload(e, 'cover')} accept="image/*" className="hidden" />
                     </div>
                     <Button type="button" variant="outline" size="sm" onClick={() => coverInputRef.current?.click()} disabled={uploading === 'cover'}>
                      {uploading === 'cover' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>}
                      Change Cover Photo
                    </Button>
                 </div>

                <div className="flex items-center gap-4">
                    <Avatar className="h-24 w-24 border-2 border-primary">
                        <AvatarImage src={profile.imageUrl ?? profile.ownerImageUrl} />
                        <AvatarFallback>
                            <Building className="h-10 w-10"/>
                        </AvatarFallback>
                    </Avatar>
                    <input type="file" ref={logoInputRef} onChange={(e) => handlePhotoUpload(e, 'logo')} accept="image/*" className="hidden" />
                    <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()} disabled={uploading === 'logo'}>
                    {uploading === 'logo' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>}
                    Change Logo
                    </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="shopName">Shop Name</Label>
                        <Input
                        id="shopName"
                        value={profile.shopName || ''}
                        onChange={(e) => handleFieldChange('shopName', e.target.value)}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="businessType">Business Type / Category</Label>
                         <Select onValueChange={(value) => handleFieldChange('businessType', value)} value={profile.businessType || ''}>
                            <SelectTrigger id="businessType">
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Retail">Retail</SelectItem>
                                <SelectItem value="Food & Beverage">Food & Beverage</SelectItem>
                                <SelectItem value="Service">Service</SelectItem>
                                <SelectItem value="MSME">MSME</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="address">Full Shop Address</Label>
                        <AddressInput 
                            value={address} 
                            onValueChange={setAddress}
                            onLocationSelect={(loc) => setLocation(loc ? { lat: loc.y, lng: loc.x } : null)}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="gstNumber">GST Number (Optional)</Label>
                        <Input
                        id="gstNumber"
                        value={profile.gstNumber || ''}
                        onChange={(e) => handleFieldChange('gstNumber', e.target.value)}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
      
       <Card>
            <CardHeader>
                <CardTitle>Owner Details</CardTitle>
                <CardDescription>
                    Your personal information for account management.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="ownerName">Your Name</Label>
                        <Input
                        id="ownerName"
                        value={profile.ownerName || ''}
                        onChange={(e) => handleFieldChange('ownerName', e.target.value)}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" value={profile.phone || ''} disabled readOnly />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" type="email" value={profile.email || ''} onChange={(e) => handleFieldChange('email', e.target.value)} />
                    </div>
                 </div>
            </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
             <Link href="/admin/profile">
                <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <Button type="submit" disabled={saving || !!uploading}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Changes
            </Button>
        </div>
    </form>
  );
}
