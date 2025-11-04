
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Mail, Phone, Briefcase, Calendar, Eye, Loader2, Check, X, CalendarOff, UserPlus, ChevronsUpDown, Building } from "lucide-react";
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, getDocs, where, collectionGroup } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

export type User = {
  id?: string;
  uid?: string;
  name: string;
  email: string;
  employeeId: string;
  role: string;
  status: 'Active' | 'Inactive' | 'Pending Onboarding';
  fallback: string;
  points: number;
  streak: number;
  joinDate: string;
  phone?: string;
  aadhaar?: string;
  imageUrl?: string;
  isProfileComplete?: boolean;
  shopId?: string; // Links user to a shop
  shopName?: string; // Added for "All Branches" view
  baseSalary?: number;
};

export type LeaveRequest = {
  id: string;
  userId: string;
  userName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  requestedAt: {
    seconds: number;
    nanoseconds: number;
  };
};

type Branch = {
    id: string;
    shopName: string;
    ownerId?: string;
};


const EmployeeList = ({ allBranches, selectedBranchId, allBranchIds }: { allBranches: Branch[], selectedBranchId: string | null, allBranchIds: string[] }) => {
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  const { toast } = useToast();
  const [formattedDates, setFormattedDates] = useState<{[key: string]: string}>({});

  useEffect(() => {
    if (!selectedBranchId) {
        setLoading(false);
        setEmployees([]);
        return;
    };
    
    const isAllBranches = selectedBranchId === 'all';
    if (isAllBranches && allBranchIds.length === 0) {
        setLoading(false);
        setEmployees([]);
        return;
    }

    setLoading(true);

    const q = isAllBranches
      ? query(collectionGroup(db, 'employees'), where('shopId', 'in', allBranchIds))
      : query(collection(db, 'shops', selectedBranchId, 'employees'), where("role", "!=", "Admin"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const branchNameMap = new Map(allBranches.map(branch => [branch.id, branch.shopName]));

        const employeeList = snapshot.docs.map(doc => {
            const data = doc.data() as User;
            return { 
                id: doc.id, 
                ...data,
                shopName: data.shopId ? branchNameMap.get(data.shopId) : 'N/A',
             } as User
        });
        
        // If "All Branches" is selected, filter out the admin role to prevent duplicate keys
        const finalEmployeeList = isAllBranches 
            ? employeeList.filter(emp => emp.role !== 'Admin') 
            : employeeList;

        setEmployees(finalEmployeeList);
        
        const dates: {[key: string]: string} = {};
        finalEmployeeList.forEach(employee => {
            if (employee.id && employee.joinDate) {
              try {
                dates[employee.id] = new Date(employee.joinDate).toLocaleDateString();
              } catch (e) {
                console.error("Invalid date for employee", employee.id, employee.joinDate);
                dates[employee.id] = 'Invalid Date';
              }
            }
        });
        setFormattedDates(dates);

        setLoading(false);
    }, (error) => {
        console.error("Error fetching employees: ", error);
        toast({ title: "Error", description: "Could not fetch employees.", variant: "destructive"});
        setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedBranchId, toast, allBranchIds, allBranches]);

  const handleViewProfile = (employee: User) => {
    router.push(`/admin/employees/${employee.id}?branchId=${employee.shopId}`);
  };

  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (employee.role && employee.role.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (employee.shopName && employee.shopName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatusVariant = (status: User['status']) => {
    switch (status) {
        case 'Active':
            return 'secondary';
        case 'Inactive':
            return 'outline';
        case 'Pending Onboarding':
            return 'destructive';
        default:
            return 'default';
    }
  }
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
              type="search"
              placeholder="Search employees..."
              className="w-full rounded-lg bg-background pl-8 border-2 border-foreground/30"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
          <Link href="/admin/employees/add" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto">
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Employee
            </Button>
          </Link>
      </div>
  
      <div>
           {loading ? (
              <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
           ) : (
          <>
          {filteredEmployees.length === 0 ? (
               <div className="text-center py-12 text-muted-foreground">
                  <p>No employees found. Invite an employee to get started.</p>
              </div>
          ): (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEmployees.map((employee) => (
                    <Card key={employee.id} className="group flex flex-col transition-all duration-300 ease-out hover:shadow-lg hover:-translate-y-1 border-2 border-foreground/10 hover:border-primary">
                        <CardContent className="pt-6 flex-1">
                            <div className="flex items-start gap-4">
                                <Avatar className="h-14 w-14 border-2 border-primary/20 shrink-0">
                                    <AvatarImage src={employee.imageUrl} alt={employee.name} />
                                    <AvatarFallback>{employee.fallback}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="font-bold text-lg break-words">{employee.name}</p>
                                    </div>
                                     <div className="flex items-center gap-2 font-semibold text-primary">
                                        <Briefcase className="h-4 w-4 shrink-0" />
                                        <span>{employee.role}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                                {selectedBranchId === 'all' && employee.shopName && (
                                <div className="flex items-center gap-2 font-semibold">
                                    <Building className="h-4 w-4 shrink-0 text-foreground" />
                                    <span>{employee.shopName}</span>
                                </div>
                                )}
                            </div>
                        </CardContent>
                        <CardContent className="border-t pt-4 flex flex-col sm:flex-row justify-between items-center gap-2">
                            <Badge variant={getStatusVariant(employee.status)} className="shrink-0">
                                {employee.status}
                            </Badge>
                             <Button size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white mt-2 sm:mt-0" onClick={() => handleViewProfile(employee)}>
                                <Eye className="mr-2 h-4 w-4"/>
                                View Profile
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
          )}
          </>
          )}
      </div>
  </div>
  );
};

const LeaveRequests = ({ selectedBranchId, allBranchIds }: { selectedBranchId: string | null, allBranchIds: string[] }) => {
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
      if (!selectedBranchId) {
          setLoading(false);
          setLeaveRequests([]);
          return;
      };
      
      const isAllBranches = selectedBranchId === 'all';
       if (isAllBranches && allBranchIds.length === 0) {
          setLoading(false);
          setLeaveRequests([]);
          return;
      }
      
      setLoading(true);

      const q = isAllBranches
        ? query(collectionGroup(db, 'leaveRequests'), where('shopId', 'in', allBranchIds), orderBy('requestedAt', 'desc'))
        : query(collection(db, 'shops', selectedBranchId, 'leaveRequests'), orderBy('requestedAt', 'desc'));
        
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaveRequest));
        setLeaveRequests(requests);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching leave requests:", error);
        toast({ title: "Error", description: "Could not fetch leave requests.", variant: "destructive"});
        setLoading(false);
      });
  
      return () => unsubscribe();
    }, [selectedBranchId, toast, allBranchIds]);
  
    const handleUpdateRequest = async (requestId: string, status: 'approved' | 'denied') => {
      const request = leaveRequests.find(r => r.id === requestId);
      if (!request || !('shopId' in request)) return;
      
      const shopId = (request as any).shopId;
      if (!shopId) {
           toast({ title: "Error", description: "Shop ID not found for this request.", variant: "destructive" });
           return;
      }

      setUpdatingId(requestId);
      const docRef = doc(db, 'shops', shopId, 'leaveRequests', requestId);
      try {
        await updateDoc(docRef, { status });
        toast({
          title: `Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
          description: "The leave request has been updated successfully.",
        });
      } catch (error) {
        console.error("Error updating leave request:", error);
        toast({
          title: "Update Failed",
          description: "Could not update the leave request. Please try again.",
          variant: "destructive",
        });
      } finally {
        setUpdatingId(null);
      }
    };
  
    const getStatusVariant = (status: LeaveRequest['status']) => {
      switch (status) {
        case 'approved': return 'secondary';
        case 'denied': return 'destructive';
        case 'pending':
        default:
          return 'outline';
      }
    };
  
    return (
        <Card>
        <CardHeader>
          <CardTitle>Incoming Requests</CardTitle>
          <CardDescription>
            Here are all the leave requests submitted by your employees in this branch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : leaveRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarOff className="h-12 w-12 mx-auto mb-4 opacity-50"/>
              <p>No leave requests found for this branch.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {leaveRequests.map((request) => (
                <Card key={request.id} className="transition-all duration-300 ease-out hover:shadow-md border-2">
                  <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-4">
                         <p className="font-bold">{request.userName}</p>
                         <Badge variant={getStatusVariant(request.status)}>{request.status}</Badge>
                      </div>
                      <p className="text-sm font-medium text-primary">
                        {new Date(request.startDate).toLocaleDateString()} to {new Date(request.endDate).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-muted-foreground">{request.reason}</p>
                       <p className="text-xs text-muted-foreground/70">
                        Requested on: {new Date(request.requestedAt.seconds * 1000).toLocaleString()}
                      </p>
                    </div>
                    {request.status === 'pending' && (
                      <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700"
                          onClick={() => handleUpdateRequest(request.id, 'approved')}
                          disabled={updatingId === request.id}
                        >
                          {updatingId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          <span className="ml-2">Approve</span>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full sm:w-auto"
                          onClick={() => handleUpdateRequest(request.id, 'denied')}
                          disabled={updatingId === request.id}
                        >
                           {updatingId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                           <span className="ml-2">Deny</span>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
};


export default function ManageEmployeesPage() {
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
    const [openBranchSelector, setOpenBranchSelector] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                router.push('/admin/login');
                return;
            }
            
            setAuthUser(user);
            const q = query(collection(db, "shops"), where("ownerId", "==", user.uid));
            
            const unsubscribeBranches = onSnapshot(q, (querySnapshot) => {
                const fetchedBranches = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch));
                const allBranchesOption: Branch = { id: 'all', shopName: 'All Branches', ownerId: user.uid };
                const fullBranchList = [allBranchesOption, ...fetchedBranches];
                
                setBranches(fullBranchList);

                if (!selectedBranch) {
                    setSelectedBranch(fullBranchList[0]);
                }
            });

            return () => unsubscribeBranches();
        });

        return () => unsubscribe();
    }, [router, selectedBranch]);
    
    const allBranchIds = useMemo(() => branches.filter(b => b.id !== 'all').map(b => b.id), [branches]);
    const memoizedBranches = useMemo(() => branches, [branches]);

  return (
    <div className="flex flex-col gap-6">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Employees & Leave</h1>
            <p className="text-muted-foreground">Manage your employees and their leave requests by branch.</p>
        </div>
         <Card>
            <CardHeader>
                <CardTitle>Select Branch</CardTitle>
                 <Popover open={openBranchSelector} onOpenChange={setOpenBranchSelector}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openBranchSelector}
                            className="w-full sm:w-[300px] justify-between mt-2"
                        >
                            {selectedBranch ? selectedBranch.shopName : "Select a branch..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full sm:w-[300px] p-0">
                        <Command>
                            <CommandInput placeholder="Search branch..." />
                            <CommandEmpty>No branches found.</CommandEmpty>
                            <CommandGroup>
                                <CommandList>
                                {branches.map((branch) => (
                                    <CommandItem
                                        key={branch.id}
                                        value={branch.shopName}
                                        onSelect={() => {
                                            setSelectedBranch(branch);
                                            setOpenBranchSelector(false);
                                        }}
                                    >
                                        {branch.shopName}
                                    </CommandItem>
                                ))}
                                </CommandList>
                            </CommandGroup>
                        </Command>
                    </PopoverContent>
                </Popover>
            </CardHeader>
        </Card>
         <Tabs defaultValue="employees" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:max-w-md">
                <TabsTrigger value="employees">All Employees</TabsTrigger>
                <TabsTrigger value="leave">Leave Requests</TabsTrigger>
            </TabsList>
            <TabsContent value="employees" className="mt-6">
                <EmployeeList allBranches={memoizedBranches} selectedBranchId={selectedBranch?.id || null} allBranchIds={allBranchIds} />
            </TabsContent>
            <TabsContent value="leave" className="mt-6">
                <LeaveRequests selectedBranchId={selectedBranch?.id || null} allBranchIds={allBranchIds} />
            </TabsContent>
        </Tabs>
    </div>
  );
}

    