
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ArrowLeft, Phone, User as UserIcon } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import type { User } from '../page';
import { IndianFlagIcon } from '@/components/ui/indian-flag-icon';


export default function AdminEditEmployeePage() {
    const router = useRouter();
    const params = useParams();
    const employeeId = params.employeeId as string;
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [employee, setEmployee] = useState<Partial<User>>({});

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

    useEffect(() => {
        if (!authUser || !employeeId) return;

        const employeeDocRef = doc(db, 'shops', authUser.uid, 'employees', employeeId);
        getDoc(employeeDocRef).then(docSnap => {
            if (docSnap.exists()) {
                setEmployee({ id: docSnap.id, ...docSnap.data() });
            } else {
                toast({ title: "Employee not found", variant: "destructive" });
                router.push('/admin/employees');
            }
        }).catch(err => {
            console.error(err);
            toast({ title: "Error loading employee data", variant: "destructive" });
        }).finally(() => {
            setLoading(false);
        });

    }, [authUser, employeeId, router, toast]);

    const handleFieldChange = (field: keyof User, value: string) => {
        setEmployee(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!authUser || !employee || !employee.id) return;
        setSaving(true);
        
        const employeeDocRef = doc(db, "shops", authUser.uid, "employees", employee.id);
        try {
            // Only update fields that can be changed
            const dataToUpdate = {
                name: employee.name,
                role: employee.role,
                status: employee.status,
            };
            await updateDoc(employeeDocRef, dataToUpdate);
            toast({ title: "Employee Updated", description: "The employee's details have been saved."});
            router.push('/admin/employees');
        } catch (error) {
            toast({ title: "Error", description: "Could not save your changes.", variant: "destructive"});
        } finally {
            setSaving(false);
        }
    };

  if (loading || !employee) {
    return <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
  }

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
                <h1 className="text-2xl font-bold tracking-tight">Edit Employee</h1>
                <p className="text-muted-foreground">Modify details for {employee.name}.</p>
            </div>
        </div>

        <Card>
            <form onSubmit={handleSubmit}>
                <CardHeader>
                    <CardTitle>Employee Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" value={employee.name || ''} onChange={e => handleFieldChange('name', e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <div className="flex items-center gap-2">
                                 <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3">
                                    <IndianFlagIcon />
                                    <span className="ml-2 text-sm font-medium text-muted-foreground">+91</span>
                                </div>
                                <Input id="phone" value={employee.phone || ''} readOnly disabled />
                            </div>
                            <p className="text-xs text-muted-foreground">Phone number cannot be changed.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Select name="role" value={employee.role} onValueChange={(value) => handleFieldChange('role', value)} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Manager">Manager</SelectItem>
                                    <SelectItem value="Cashier">Cashier</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select name="status" value={employee.status} onValueChange={(value) => handleFieldChange('status', value)} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Active">Active</SelectItem>
                                    <SelectItem value="Inactive">Inactive</SelectItem>
                                    <SelectItem value="Pending Onboarding">Pending Onboarding</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>

                 <CardContent className="border-t pt-6 flex justify-end">
                    <Button type="submit" disabled={saving}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Changes
                    </Button>
                </CardContent>
            </form>
        </Card>
    </div>
  );
}
