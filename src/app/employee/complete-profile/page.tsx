
'use client';

import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { UserCheck, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { doc, updateDoc, writeBatch, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User } from '@/app/admin/employees/page';

export default function CompleteProfilePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState<Partial<User>>({});
    const [phone, setPhone] = useState('');
    const [uid, setUid] = useState('');
    const [shopId, setShopId] = useState('');
    const [docId, setDocId] = useState('');

    useEffect(() => {
        const userPhone = localStorage.getItem('newUserPhone');
        const userUID = localStorage.getItem('newUserUID');
        const userShopId = localStorage.getItem('newUserShopId');
        const userDocId = localStorage.getItem('newUserDocId');

        if (userPhone && userUID && userShopId && userDocId) {
            setPhone(userPhone);
            setUid(userUID);
            setShopId(userShopId);
            setDocId(userDocId);

            const fetchProfile = async () => {
                const employeeDocRef = doc(db, "shops", userShopId, "employees", userDocId);
                const docSnap = await getDoc(employeeDocRef);
                if (docSnap.exists()) {
                    setProfile(docSnap.data());
                }
            };
            fetchProfile();

        } else {
            toast({ title: "Error", description: "Could not find your invitation. Please contact your shop owner.", variant: "destructive"});
            router.replace('/employee/login');
        }
    }, [router, toast]);


    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;
        const aadhaar = formData.get('aadhaar') as string;

        if (!aadhaar) {
             toast({ title: "Error", description: "Please fill out all required fields.", variant: "destructive" });
             setLoading(false);
             return;
        }

        const updatedProfile: Partial<User> = {
            email,
            aadhaar,
            status: 'Active',
            isProfileComplete: true,
            uid: uid, // Add the auth UID to the document
        };

        try {
            const batch = writeBatch(db);

            // 1. Update the employee document in the shop's subcollection
            const employeeDocRef = doc(db, "shops", shopId, "employees", docId);
            batch.update(employeeDocRef, updatedProfile);
            
            // 2. Update the phone number lookup table to mark profile as complete
            const phoneLookupRef = doc(db, 'employee_phone_to_shop_lookup', phone);
            batch.update(phoneLookupRef, { isProfileComplete: true });

            await batch.commit();


            toast({
                title: "Profile Complete!",
                description: "Welcome aboard! You will now be redirected to your dashboard.",
            });
            // Clean up localStorage
            localStorage.removeItem('newUserPhone');
            localStorage.removeItem('newUserUID');
            localStorage.removeItem('newUserShopId');
            localStorage.removeItem('newUserDocId');
            
            setTimeout(() => {
                router.push('/employee');
            }, 1500);

        } catch (error) {
            console.error("Error updating profile:", error);
            toast({ title: "Error", description: "Could not save your profile. Please try again.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div className="w-full max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="text-center">
                <div className="inline-block p-4 bg-primary/10 rounded-full mb-4">
                    <UserCheck className="h-10 w-10 text-primary" />
                </div>
                <h1 className="text-3xl font-bold">Complete Your Profile</h1>
                <p className="text-muted-foreground mt-2">
                    Please verify your details and provide the missing information.
                </p>
            </div>
            
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" name="name" value={profile.name || ''} readOnly disabled />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="role">Role / Designation</Label>
                        <Input id="role" name="role" value={profile.role || ''} readOnly disabled />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="employeeId">Employee ID</Label>
                        <Input id="employeeId" name="employeeId" value={profile.employeeId || ''} readOnly disabled />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input id="phone" name="phone" type="tel" value={phone} readOnly disabled />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="aadhaar">Aadhaar Number *</Label>
                        <Input id="aadhaar" name="aadhaar" type="text" inputMode="numeric" placeholder="e.g. 1234 5678 9012" required maxLength={12} pattern="\d{12}" title="Aadhaar must be 12 digits" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="email">Email Address (Optional)</Label>
                        <Input id="email" name="email" type="email" placeholder="e.g. you@example.com" />
                    </div>
                </div>
            </div>
            <div className="flex justify-center pt-4">
                <Button type="submit" size="lg" className="w-full max-w-sm" disabled={loading}>
                    {loading && <Loader2 className="mr-2 animate-spin" />}
                    Submit and Continue
                </Button>
            </div>
        </form>
      </div>
    </div>
  );
}
