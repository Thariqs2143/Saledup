
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Mail, Phone, Briefcase, Calendar, Eye, Loader2, Check, X, CalendarOff, UserPlus, ChevronsUpDown, Building, MoreHorizontal, FilePen, Store, User, Filter } from "lucide-react";
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, getDocs, where, collectionGroup, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList }from "@/components/ui/command";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';


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
  shiftId?: string; // Links user to a shift
  shopName?: string; // Added for "All Branches" view
  baseSalary?: number;
};

export type LeaveRequest = {
  id: string;
  userId: string;
  userName: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  requestedAt: {
    seconds: number;
    nanoseconds: number;
  };
  shopId?: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
};

type Branch = {
    id: string;
    shopName: string;
    ownerId?: string;
};


const EmployeeList = ({ allBranches, selectedBranchId, allBranchIds, searchTerm, statusFilter }: { allBranches: Branch[], selectedBranchId: string | null, allBranchIds: string[], searchTerm: string, statusFilter: string }) => {
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

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
        
        const finalEmployeeList = isAllBranches 
            ? employeeList.filter(emp => emp.role !== 'Admin') 
            : employeeList;

        setEmployees(finalEmployeeList);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching employees: ", error);
        toast({ title: "Error", description: "Could not fetch employees.", variant: "destructive"});
        setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedBranchId, toast, allBranchIds, allBranches]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      const searchMatch = searchTerm.toLowerCase() 
        ? employee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employee.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          employee.shopName?.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      
      const statusMatch = statusFilter !== 'all' ? employee.status === statusFilter : true;
      
      return searchMatch && statusMatch;
    });
  }, [employees, searchTerm, statusFilter]);


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
      <Card>
           {loading ? (
              <CardContent className="flex items-center justify-center h-48">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </CardContent>
           ) : (
          <>
          {filteredEmployees.length === 0 ? (
               <CardContent className="text-center py-12 text-muted-foreground">
                  <p>No employees found. Invite an employee to get started.</p>
              </CardContent>
          ): (
            <>
                 <div className="grid gap-4 md:grid-cols-2 lg:hidden">
                  {filteredEmployees.map((employee) => (
                    <Card key={employee.id} className="p-4 space-y-4 rounded-lg border-2 border-border hover:border-primary hover:shadow-lg transition-all">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12 border-2 border-muted">
                            <AvatarImage src={employee.imageUrl} alt={employee.name} />
                            <AvatarFallback>{employee.fallback}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold text-lg">{employee.name}</p>
                            {selectedBranchId === 'all' && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1"><Store className="h-3 w-3"/> {employee.shopName}</p>
                            )}
                          </div>
                        </div>
                        <Badge variant={getStatusVariant(employee.status)}>{employee.status}</Badge>
                      </div>
                      <div className="space-y-2 text-sm text-muted-foreground pl-2">
                        {employee.email && (
                          <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4" />
                            <span>{employee.email}</span>
                          </div>
                        )}
                        {employee.phone && (
                          <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4" />
                            <span>{employee.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <Briefcase className="h-4 w-4" />
                          <span>{employee.role}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Calendar className="h-4 w-4" />
                          <span>Joined: {employee.joinDate ? format(new Date(employee.joinDate), 'dd/MM/yyyy') : 'N/A'}</span>
                        </div>
                      </div>
                      <Button 
                        className="w-full"
                        onClick={() => router.push(`/admin/employees/${employee.id}?branchId=${employee.shopId}`)}
                      >
                        <Eye className="mr-2 h-4 w-4"/>
                        View Profile
                      </Button>
                    </Card>
                  ))}
                </div>

                <div className="hidden lg:block rounded-lg border-2 border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        {selectedBranchId === 'all' && <TableHead>Shop</TableHead>}
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEmployees.map((employee) => (
                        <TableRow key={employee.id} className="transition-all duration-300 ease-out hover:shadow-md hover:border-primary border-y-2 border-transparent">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={employee.imageUrl} alt={employee.name} />
                                <AvatarFallback>{employee.fallback}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{employee.name}</p>
                                <p className="text-xs text-muted-foreground">{employee.phone || employee.email}</p>
                              </div>
                            </div>
                          </TableCell>
                           {selectedBranchId === 'all' && <TableCell>{employee.shopName}</TableCell>}
                          <TableCell>{employee.role}</TableCell>
                          <TableCell><Badge variant={getStatusVariant(employee.status)}>{employee.status}</Badge></TableCell>
                          <TableCell className="text-right">
                             <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => router.push(`/admin/employees/${employee.id}?branchId=${employee.shopId}`)}>
                                    <Eye className="mr-2 h-4 w-4"/>
                                    View Profile
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
            </>
          )}
          </>
          )}
      </Card>
  </div>
  );
};

const LeaveRequests = ({ selectedBranchId, allBranchIds }: { selectedBranchId: string | null, allBranchIds: string[] }) => {
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

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

    const filteredRequests = useMemo(() => {
        return leaveRequests.filter(request => 
            request.userName.toLowerCase().includes(searchTerm.toLowerCase()) &&
            (statusFilter === 'all' || request.status === statusFilter)
        );
    }, [leaveRequests, searchTerm, statusFilter]);
  
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
            case 'pending': default: return 'outline';
        }
    };

    const formatTime = (time: string) => {
        const [hours, minutes] = time.split(':');
        const date = new Date();
        date.setHours(parseInt(hours, 10));
        date.setMinutes(parseInt(minutes, 10));
        return format(date, 'p');
    };

    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by employee name..."
              className="w-full rounded-lg bg-background pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-[180px]">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
    
  
    

            {loading ? (
                <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : filteredRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border rounded-lg">
                <CalendarOff className="h-12 w-12 mx-auto mb-4 opacity-50"/>
                <p>No leave requests found for this branch.</p>
                </div>
            ) : (
                <div className="space-y-4">
                {filteredRequests.map((request) => (
                    <Card key={request.id} className="transition-all duration-300 ease-out hover:shadow-md border-2 border-foreground/30">
                    <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-4">
                            <p className="font-bold">{request.userName}</p>
                             <Badge variant={getStatusVariant(request.status)}>{request.status}</Badge>
                        </div>
                        <p className="text-sm font-medium text-primary">
                          {request.startTime && request.endTime
                            ? `${format(new Date(request.startDate), 'dd MMM, yyyy')} from ${formatTime(request.startTime)} to ${formatTime(request.endTime)}`
                            : `${format(new Date(request.startDate), 'dd MMM')} - ${format(new Date(request.endDate), 'dd MMM, yyyy')}`
                          }
                        </p>
                        <p className="text-sm text-muted-foreground">{request.reason}</p>
                        <p className="text-xs text-muted-foreground/70">
                            Requested on: {new Date(request.requestedAt.seconds * 1000).toLocaleString()}
                        </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto">
                           {request.status === 'pending' && (
                                <>
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
                                </>
                            )}
                        </div>
                    </CardContent>
                    </Card>
                ))}
                </div>
            )}
        </div>
    );
};

const BranchSelector = ({ open, onOpenChange, branches, setSelectedBranch }: { open: boolean, onOpenChange: (open: boolean) => void, branches: Branch[], setSelectedBranch: (branch: Branch) => void }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredBranches = useMemo(() => {
        return branches.filter(branch => branch.shopName?.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [branches, searchTerm]);
    
    return (
        <Command>
            <CommandInput 
                placeholder="Search branch..."
                value={searchTerm}
                onValueChange={setSearchTerm}
            />
            <CommandList>
                <CommandEmpty>No branches found.</CommandEmpty>
                <CommandGroup>
                    {filteredBranches.map((branch) => (
                        <CommandItem
                            key={branch.id}
                            value={branch.shopName}
                            onSelect={() => {
                                setSelectedBranch(branch);
                                onOpenChange(false);
                            }}
                        >
                            {branch.shopName}
                        </CommandItem>
                    ))}
                </CommandGroup>
            </CommandList>
        </Command>
    );
};


export default function ManageEmployeesPage() {
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
    const [openBranchSelector, setOpenBranchSelector] = useState(false);
    const router = useRouter();
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('employees');

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
                const allBranchesOption: Branch = { id: 'all', shopName: 'All Shop/Business Branches', ownerId: user.uid };
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

    const FilterContent = () => (
        <div className="p-4 space-y-4">
            <Label htmlFor="status-filter">Filter by status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter" className="w-full">
                    <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Pending Onboarding">Pending Onboarding</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );

  return (
    <div className="flex flex-col gap-6">
        <div className="lg:flex lg:justify-between lg:items-start gap-4">
            <div className='hidden lg:block'>
                <h1 className="text-3xl font-bold tracking-tight">Employees & Leave</h1>
                <p className="text-muted-foreground">Manage your employees and their leave requests by branch.</p>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:w-auto">
                <TabsList className="grid w-full grid-cols-2 bg-primary text-primary-foreground p-1 h-auto rounded-lg md:max-w-xs">
                    <TabsTrigger value="employees" className="data-[state=active]:bg-background data-[state=active]:text-foreground rounded-md py-2 transition-all duration-300">All Employees</TabsTrigger>
                    <TabsTrigger value="leave" className="data-[state=active]:bg-background data-[state=active]:text-foreground rounded-md py-2 transition-all duration-300">Leave Requests</TabsTrigger>
                </TabsList>
            </Tabs>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="hidden">
              <TabsList>
                <TabsTrigger value="employees">All Employees</TabsTrigger>
                <TabsTrigger value="leave">Leave Requests</TabsTrigger>
              </TabsList>
            </div>
            
            {activeTab === 'employees' && (
                <div className="flex flex-col md:flex-row items-center gap-2">
                    <div className="relative w-full">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                        type="search"
                        placeholder="Search by name, role, or shop..."
                        className="rounded-lg bg-background pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Dialog open={openBranchSelector} onOpenChange={setOpenBranchSelector}>
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openBranchSelector}
                                className="w-full md:w-auto md:max-w-xs justify-between"
                            >
                                {selectedBranch ? <span className="truncate">{selectedBranch.shopName}</span> : "Select a branch..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Select Branch</DialogTitle>
                            </DialogHeader>
                            <BranchSelector 
                                open={openBranchSelector}
                                onOpenChange={setOpenBranchSelector}
                                branches={branches}
                                setSelectedBranch={setSelectedBranch}
                            />
                        </DialogContent>
                    </Dialog>
                    <div className="flex w-full md:w-auto items-center gap-2">
                      {/* Mobile Filter: Sheet */}
                      <Sheet>
                          <SheetTrigger asChild>
                              <Button variant="outline" className="w-full md:hidden">
                                  <Filter className="h-4 w-4 mr-2" />
                                  Filter
                              </Button>
                          </SheetTrigger>
                          <SheetContent side="bottom" className="h-auto">
                              <SheetHeader>
                                  <SheetTitle>Filter Employees</SheetTitle>
                              </SheetHeader>
                              <FilterContent />
                          </SheetContent>
                      </Sheet>
                      {/* Desktop Filter: Popover */}
                      <Popover>
                          <PopoverTrigger asChild>
                              <Button variant="outline" className="hidden md:flex">
                                  <Filter className="h-4 w-4 mr-2" />
                                  Filter
                              </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-0" align="end">
                            <FilterContent />
                          </PopoverContent>
                      </Popover>
                       <Link href="/admin/employees/add" className='w-full md:w-auto'>
                          <Button className='w-full'>
                              <UserPlus className="mr-2 h-4 w-4" />
                              Invite
                          </Button>
                      </Link>
                    </div>
                </div>
              )}

            <TabsContent value="employees">
                <EmployeeList allBranches={memoizedBranches} selectedBranchId={selectedBranch?.id || null} allBranchIds={allBranchIds} searchTerm={searchTerm} statusFilter={statusFilter}/>
            </TabsContent>

            <TabsContent value="leave">
                <LeaveRequests selectedBranchId={selectedBranch?.id || null} allBranchIds={allBranchIds} />
            </TabsContent>
        </Tabs>
    </div>
  );
}
