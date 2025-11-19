
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
import { Loader2, PlusCircle, Search, User, Trash2, Edit } from "lucide-react";
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { collection, onSnapshot, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';


// Define the User type for employees
export type User = {
    id: string;
    uid?: string;
    name?: string;
    email?: string;
    phone: string;
    role: 'Owner' | 'Manager' | 'Cashier' | 'Admin' | 'Employee' | 'Super Admin';
    status: 'Active' | 'Inactive' | 'Pending Onboarding';
    joinDate?: string;
    employeeId?: string;
};


export default function AdminEmployeesPage() {
    const [employees, setEmployees] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const router = useRouter();
    const { toast } = useToast();
    
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setAuthUser(user);
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!authUser) return;

        const employeesQuery = query(collection(db, 'shops', authUser.uid, 'employees'), orderBy('name'));
        
        const unsubscribe = onSnapshot(employeesQuery, (snapshot) => {
            const employeesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setEmployees(employeesList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching employees: ", error);
            const permissionError = new FirestorePermissionError({
              path: `shops/${authUser.uid}/employees`,
              operation: 'list'
            });
            errorEmitter.emit('permission-error', permissionError);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [authUser, toast]);
    
    const filteredEmployees = employees.filter(emp => 
        emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.phone?.includes(searchTerm) ||
        emp.role?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusVariant = (status: User['status']) => {
        switch(status) {
            case 'Active': return 'secondary';
            case 'Inactive': return 'outline';
            case 'Pending Onboarding': return 'destructive';
            default: return 'default';
        }
    };
    
    const handleDeleteEmployee = async (employeeId: string) => {
        if (!authUser) return;

        const employeeDocRef = doc(db, 'shops', authUser.uid, 'employees', employeeId);
        try {
            await deleteDoc(employeeDocRef);
            toast({ title: "Employee Removed", description: "The employee has been removed from your shop." });
        } catch (error) {
             const permissionError = new FirestorePermissionError({
              path: employeeDocRef.path,
              operation: 'delete'
            });
            errorEmitter.emit('permission-error', permissionError);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Manage Employees</h1>
                    <p className="text-muted-foreground">Add, view, and manage your staff members.</p>
                </div>
                <Button asChild>
                    <Link href="/admin/employees/add">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add New Employee
                    </Link>
                </Button>
            </div>
            
             <Card>
                <CardHeader>
                    <CardTitle>Your Staff</CardTitle>
                    <CardDescription>A list of all employees registered to your shop.</CardDescription>
                     <div className="relative pt-4 sm:max-w-xs">
                        <Search className="absolute left-2.5 top-6 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search by name, role, or phone..."
                            className="w-full rounded-lg bg-background pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : employees.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground">
                        <User className="h-16 w-16 mx-auto mb-4 opacity-50"/>
                        <h3 className="text-xl font-semibold">No Employees Yet</h3>
                        <p>Click "Add New Employee" to invite your first staff member.</p>
                    </div>
                ) : (
                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead className="hidden sm:table-cell">Phone</TableHead>
                                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredEmployees.map(emp => (
                                <TableRow key={emp.id}>
                                    <TableCell className="font-medium">{emp.name || 'N/A'}</TableCell>
                                    <TableCell>{emp.role}</TableCell>
                                    <TableCell className="hidden sm:table-cell">{emp.phone}</TableCell>
                                    <TableCell className="hidden sm:table-cell">
                                        <Badge variant={getStatusVariant(emp.status)}>{emp.status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                       <div className="flex justify-end gap-2">
                                            <Link href={`/admin/employees/${emp.id}`}>
                                                <Button variant="outline" size="sm">
                                                    <Edit className="mr-2 h-4 w-4"/>
                                                    Edit
                                                </Button>
                                            </Link>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="destructive" size="sm">
                                                        <Trash2 className="mr-2 h-4 w-4"/>
                                                        Delete
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will permanently remove {emp.name} from your shop. This action cannot be undone.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteEmployee(emp.id)} className="bg-destructive hover:bg-destructive/90">
                                                            Delete Employee
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                       </div>
                                    </TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
                </CardContent>
            </Card>
        </div>
    );
}
