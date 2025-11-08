'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, LogOut, Loader2, Save, Upload } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AdminSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<{
    ownerName?: string;
    shopName?: string;
    ownerImageUrl?: string;
  }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthUser(user);
        const shopDocRef = doc(db, 'shops', user.uid);
        const shopSnap = await getDoc(shopDocRef);
        if (shopSnap.exists()) {
          setProfile(shopSnap.data());
        }
      } else {
        router.push('/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleFieldChange = (field: string, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!authUser || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setSaving(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'saledup'); // Use your unsigned preset

    try {
        const response = await fetch('https://api.cloudinary.com/v1_1/dyov4r11v/image/upload', { // Use your cloud name
            method: 'POST',
            body: formData,
        });

        if (!response.ok) throw new Error('Upload failed');
        
        const data = await response.json();
        const newImageUrl = data.secure_url;

        const shopDocRef = doc(db, 'shops', authUser.uid);
        await updateDoc(shopDocRef, { ownerImageUrl: newImageUrl });
        
        setProfile((prev) => ({ ...prev, ownerImageUrl: newImageUrl }));
        toast({ title: "Photo Uploaded!", description: "Your profile photo has been updated." });

    } catch (error) {
        console.error("Error uploading photo:", error);
        toast({ title: "Upload Failed", description: "Could not upload your photo.", variant: "destructive" });
    } finally {
        setSaving(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!authUser) return;
    setSaving(true);
    try {
      const shopDocRef = doc(db, 'shops', authUser.uid);
      await updateDoc(shopDocRef, {
        ownerName: profile.ownerName,
        shopName: profile.shopName,
      });
      toast({
        title: 'Profile Updated',
        description: 'Your changes have been saved successfully.',
      });
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Manage your personal and shop details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-4">
                <Avatar className="h-24 w-24 border-2 border-primary">
                    <AvatarImage src={profile.ownerImageUrl} />
                    <AvatarFallback>
                        {profile.ownerName?.split(' ').map((n) => n[0]).join('')}
                    </AvatarFallback>
                </Avatar>
                <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>}
                  Change Photo
                </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="ownerName">Your Name</Label>
                    <Input
                    id="ownerName"
                    value={profile.ownerName || ''}
                    onChange={(e) => handleFieldChange('ownerName', e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="shopName">Shop Name</Label>
                    <Input
                    id="shopName"
                    value={profile.shopName || ''}
                    onChange={(e) => handleFieldChange('shopName', e.target.value)}
                    />
                </div>
            </div>
          <Button onClick={handleSaveChanges} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
