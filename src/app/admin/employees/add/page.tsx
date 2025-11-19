
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserPlus, ArrowLeft, Phone } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';
import { IndianFlagIcon } from '@/components/ui/indian-flag-icon';


export default function AdminAddEmployeePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
             if (!user) {
                router.replace('/login');
            } else {
                setAuthUser(user);
            }
        });
        return () => unsubscribe();
    }, [router]);


    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!authUser) {
            toast({ title: "Not Authenticated", variant: "destructive" });
            return;
        }

        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const phone = formData.get('phone') as string;
        const role = formData.get('role') as 'Manager' | 'Cashier';

        if (!name || !phone || !role) {
            toast({ title: "Missing Fields", description: "Please fill out all fields.", variant: "destructive" });
            setLoading(false);
            return;
        }

        const employeeData = {
            name,
            phone,
            role,
            shopId: authUser.uid,
            status: 'Pending Onboarding',
            joinDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
        };

        const employeesCollectionRef = collection(db, "shops", authUser.uid, "employees");
        
        try {
            await addDoc(employeesCollectionRef, employeeData);
            toast({
                title: "Employee Invited!",
                description: `${name} has been added. They will need to complete onboarding.`,
            });
            router.push('/admin/employees');
        } catch (error) {
            const permissionError = new FirestorePermissionError({
              path: employeesCollectionRef.path,
              operation: 'create',
              requestResourceData: employeeData,
            });
            errorEmitter.emit('permission-error', permissionError);
        } finally {
            setLoading(false);
        }
    };

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
             <Link href="/admin/employees">
                <Button variant="outline" size="icon" className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back</span>
                </Button>
            </Link>
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Add a New Employee</h1>
                <p className="text-muted-foreground">Invite a new member to your team.</p>
            </div>
        </div>

        <Card>
            <form onSubmit={handleSubmit}>
                <CardHeader>
                    <CardTitle>Employee Details</CardTitle>
                    <CardDescription>
                        The employee will receive an invite to set up their account using their phone number.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" name="name" placeholder="e.g., Jane Doe" required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <div className="flex items-center gap-2">
                            <div className="flex h-10 items-center rounded-md border border-input bg-transparent px-3">
                                <IndianFlagIcon />
                                <span className="ml-2 text-sm font-medium text-muted-foreground">+91</span>
                            </div>
                            <Input
                                id="phone"
                                name="phone"
                                type="tel"
                                placeholder="10-digit mobile number"
                                required
                                className="flex-1"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select name="role" required>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a role for this employee" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Manager">Manager</SelectItem>
                                <SelectItem value="Cashier">Cashier</SelectItem>
                            </SelectContent>
                        </Select>
                         <p className="text-xs text-muted-foreground">
                            Managers can create offers and view reports. Cashiers can only redeem offers.
                        </p>
                    </div>

                </CardContent>
                
                 <CardContent className="border-t pt-6 flex justify-end">
                    <Button type="submit" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                        Add Employee
                    </Button>
                </CardContent>
            </form>
        </Card>
    </div>
  );
}
