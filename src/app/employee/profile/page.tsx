'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { differenceInMonths, differenceInYears } from 'date-fns';
import { auth, db, requestForToken } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged, signOut, type User as AuthUser } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { User as AppUser } from '@/app/admin/employees/page';
import { Loader2, LogOut, Upload, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ThemeSwitcher } from '@/components/theme-switcher';

const calculateTenure = (joinDate: string | undefined) => {
    if (!joinDate) return 'N/A';
    const startDate = new Date(joinDate);
    const endDate = new Date();
    
    const years = differenceInYears(endDate, startDate);
    const months = differenceInMonths(endDate, startDate) % 12;

    if (years === 0 && months === 0) {
        return 'New Joiner';
    }

    let tenureString = '';
    if (years > 0) {
        tenureString += `${years} year${years > 1 ? 's' : ''}`;
    }
    if (months > 0) {
        if (tenureString.length > 0) tenureString += ', ';
        tenureString += `${months} month${months > 1 ? 's' : ''}`;
    }
    
    return tenureString || 'Less than a month';
};

export default function ProfilePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [userProfile, setUserProfile] = useState<AppUser | null>(null);
  const [editableProfile, setEditableProfile] = useState<Partial<AppUser>>({
      name: '',
      email: '',
      phone: '',
      employeeId: '',
      aadhaar: '',
      joinDate: '',
      imageUrl: '',
  });
  const [tenure, setTenure] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && user.phoneNumber) {
        setAuthUser(user);
        
        const phoneLookupRef = doc(db, "employee_phone_to_shop_lookup", user.phoneNumber);
        const phoneLookupSnap = await getDoc(phoneLookupRef);

        if (phoneLookupSnap.exists()) {
            const { shopId, employeeDocId } = phoneLookupSnap.data();
            const employeeDocRef = doc(db, "shops", shopId, "employees", employeeDocId);
            const employeeDocSnap = await getDoc(employeeDocRef);

            if (employeeDocSnap.exists()) {
                const profile = { id: employeeDocSnap.id, ...employeeDocSnap.data() } as AppUser;
                setUserProfile(profile);
                setEditableProfile(profile);
            } else {
                 router.push('/employee/login');
            }
        } else {
            router.push('/employee/login');
        }
      } else {
        router.push('/employee/login');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router, toast]);

  useEffect(() => {
    if (userProfile) {
        setTenure(calculateTenure(userProfile.joinDate));
    }
  }, [userProfile]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setEditableProfile(prev => ({ ...prev, [id]: value }));
  };

  const handleSaveChanges = async () => {
    if (!authUser || !userProfile?.shopId || !userProfile?.id) return;
    setSaving(true);
    const userDocRef = doc(db, 'shops', userProfile.shopId, 'employees', userProfile.id);
    try {
        await updateDoc(userDocRef, {
            name: editableProfile.name,
            email: editableProfile.email,
            aadhaar: editableProfile.aadhaar,
            fallback: editableProfile.name?.split(' ').map(n => n[0]).join('')
        });
        setUserProfile(prev => ({...prev!, ...editableProfile}));
        toast({ title: "Success", description: "Your profile has been updated." });
    } catch (error) {
        console.error("Error updating profile:", error);
        toast({ title: "Error", description: "Could not update your profile.", variant: "destructive" });
    } finally {
        setSaving(false);
    }
  };

  const handleEnableNotifications = async () => {
    if (!authUser) return;
    setNotifLoading(true);
    try {
      const token = await requestForToken();
      if (token && userProfile?.shopId && userProfile?.id) {
        const userDocRef = doc(db, 'shops', userProfile.shopId, 'employees', userProfile.id);
        await updateDoc(userDocRef, { fcmToken: token });
        toast({
          title: "Notifications Enabled!",
          description: "You will now receive check-in and check-out reminders.",
        });
      }
    } catch (error) {
      console.error('An error occurred while enabling notifications: ', error);
      toast({
        title: 'Error Enabling Notifications',
        description: 'Please ensure you have granted permission and try again.',
        variant: 'destructive',
      });
    } finally {
        setNotifLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !authUser || !userProfile?.shopId || !userProfile?.id) {
      return;
    }
    const file = e.target.files[0];
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'attendry_uploads');

    try {
      const response = await fetch('https://api.cloudinary.com/v1_1/dkek6cset/image/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Cloudinary upload error:", errorText);
        throw new Error(`Upload failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.secure_url) {
          const imageUrl = data.secure_url;
          
          setUserProfile(prev => ({...(prev as AppUser), imageUrl: imageUrl }));
          setEditableProfile(prev => ({ ...prev, imageUrl: imageUrl }));
          
          const userDocRef = doc(db, 'shops', userProfile.shopId, 'employees', userProfile.id);
          await updateDoc(userDocRef, { imageUrl: imageUrl });
          
          toast({ title: "Photo Updated!", description: "Your new profile photo has been saved." });
      } else {
          console.error("Cloudinary upload failed:", data);
          throw new Error('Image URL not found in response');
      }
    } catch (error) {
      console.error("Error uploading photo to Cloudinary:", error);
      toast({ title: "Upload Failed", description: "Could not upload your photo. Please try again.", variant: "destructive"});
    } finally {
      setUploading(false);
    }
  };
  
  if (loading || !userProfile) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-4 text-muted-foreground">Loading your profile...</p>
        </div>
    );
  }

  return (
    <div className="space-y-8">
        <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Profile</h1>
            <p className="text-muted-foreground">View and update your personal information.</p>
        </div>
        <Separator/>
        <Card className="w-full max-w-3xl mx-auto transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground hover:border-primary">
            <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 border-primary">
                  <AvatarImage src={editableProfile.imageUrl} alt={userProfile.name} />
                  <AvatarFallback>{userProfile.fallback}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-center sm:text-left">
                    <h2 className="text-xl sm:text-2xl font-bold">{userProfile.name}</h2>
                    <p className="text-muted-foreground">{userProfile.employeeId}</p>
                    {tenure ? <p className="text-sm text-primary font-medium mt-1">Tenure: {tenure}</p> : <div className="h-5 w-32 bg-muted rounded mt-1 animate-pulse" />}
                </div>
                <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
                <Button variant="outline" className="w-full sm:w-auto" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>}
                  Change Photo
                </Button>
            </div>
            </CardContent>
        </Card>

      <Card className="transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground hover:border-primary">
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>Ensure your contact details are up to date.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={editableProfile.name || ''} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input id="employeeId" value={editableProfile.employeeId || ''} readOnly disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" value={editableProfile.email || ''} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" value={editableProfile.phone || ''} readOnly disabled />
            </div>
             <div className="space-y-2">
              <Label htmlFor="aadhaar">Aadhaar Number</Label>
              <Input id="aadhaar" value={editableProfile.aadhaar || ''} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="joinDate">Date Joined</Label>
                <Input id="joinDate" type="date" value={editableProfile.joinDate || ''} readOnly disabled/>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-6">
            <Button onClick={handleSaveChanges} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                Save Changes
            </Button>
        </CardFooter>
      </Card>

      <Card className="transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground hover:border-primary">
        <CardHeader>
            <CardTitle>Appearance</CardTitle>
             <CardDescription>Customize the look and feel of the application.</CardDescription>
        </CardHeader>
         <CardContent>
             <div className="flex items-center justify-between">
              <Label htmlFor="theme-switcher" className="font-medium">Theme</Label>
              <ThemeSwitcher />
            </div>
         </CardContent>
      </Card>
      
      <Card className="transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground hover:border-primary">
        <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>Enable or disable reminders and alerts.</CardDescription>
        </CardHeader>
         <CardContent>
             <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h4 className="font-semibold">Enable Browser Notifications</h4>
                        <p className="text-xs text-muted-foreground">Allow notifications to get check-in/out reminders.</p>
                    </div>
                    <Button variant="secondary" onClick={handleEnableNotifications} disabled={notifLoading}>
                        {notifLoading ? <Loader2 className="mr-2 animate-spin"/> : <Bell className="mr-2"/>}
                        Enable
                    </Button>
                </div>
            </div>
         </CardContent>
      </Card>


      <Card className="transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground hover:border-destructive">
        <CardHeader>
            <CardTitle>Account Actions</CardTitle>
        </CardHeader>
         <CardContent className="flex justify-center">
            <Button variant="destructive" className="w-full max-w-xs" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4"/>
                Logout
            </Button>
         </CardContent>
      </Card>
    </div>
  );
}
