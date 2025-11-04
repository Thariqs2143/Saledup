
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, QrCode, Clock, UserCheck, UserX, TrendingUp, Loader2, BarChart3, LogOut, Activity, Sparkles, ChevronsUpDown, Building, UserPlus, CalendarOff, BrainCircuit, Eye } from "lucide-react";
import Link from 'next/link';
import { AnimatedCounter } from "@/components/animated-counter";
import { useEffect, useState, useMemo, useCallback } from "react";
import { collection, onSnapshot, query, where, Timestamp, orderBy, limit, updateDoc, doc, getDocs, collectionGroup } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { User, LeaveRequest } from "./employees/page";
import { subDays, startOfDay, formatDistanceToNow, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { AttendanceChart, type ChartData } from '@/components/attendance-chart';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { useToast } from "@/hooks/use-toast";
import { generateWeeklyBriefing } from "@/lib/insights";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList }from "@/components/ui/command";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getStaffingAdvice, type StaffingAdvice } from "@/lib/staffing-logic";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";


type AttendanceRecord = {
  id: string;
  userId: string;
  userName: string;
  shopId: string;
  checkInTime: Timestamp;
  checkOutTime?: Timestamp;
  status: 'On-time' | 'Late' | 'Manual' | 'Absent' | 'Half-day';
};

type ActivityFeedItem = {
    id: string;
    type: 'check-in' | 'check-out' | 'leave-request';
    timestamp: Timestamp;
    text: string;
    user: {
        name: string;
        fallback: string;
        imageUrl?: string;
    };
};

type Branch = {
    id: string;
    shopName: string;
    ownerId?: string; // Optional for the "All Branches" object
    businessType?: string;
};

type StatFilter = 'today' | 'week' | 'month' | 'year';

const chartColors = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

const CustomLegend = ({ payload }: any) => {
  return (
    <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4">
      {payload.map((entry: any, index: number) => (
        <li key={`item-${index}`} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-sm text-muted-foreground">{entry.value} ({entry.payload.value})</span>
        </li>
      ))}
    </ul>
  );
};


const StaffingAdvisorCard = ({ businessType, currentStaffCount }: { businessType?: string, currentStaffCount: number }) => {
    const [monthlyTurnover, setMonthlyTurnover] = useState('');
    const [yearlyTurnover, setYearlyTurnover] = useState('');
    const [selectedBusinessType, setSelectedBusinessType] = useState(businessType || '');
    const [advice, setAdvice] = useState<StaffingAdvice | null>(null);
    const [loadingAdvice, setLoadingAdvice] = useState(false);

    const handleGetAdvice = () => {
        setLoadingAdvice(true);
        const monthly = parseInt(monthlyTurnover, 10) || 0;
        const yearly = parseInt(yearlyTurnover, 10) || 0;

        if ((monthly === 0 && yearly === 0) || !selectedBusinessType) {
            setAdvice(null);
            setLoadingAdvice(false);
            return;
        }
        
        setTimeout(() => {
            const result = getStaffingAdvice(selectedBusinessType, monthly, yearly, currentStaffCount);
            setAdvice(result);
            setLoadingAdvice(false);
        }, 800);
    };

    return (
        <Card className="transform-gpu transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground hover:border-primary">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <BrainCircuit className="h-6 w-6 text-primary"/>
                    <CardTitle>Smart Staffing Advisor</CardTitle>
                </div>
                <CardDescription>Get a recommendation on how many employees you might need based on your turnover.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="monthlyTurnover">Monthly Turnover (₹)</Label>
                        <Input 
                            id="monthlyTurnover"
                            type="number"
                            placeholder="e.g., 500000"
                            value={monthlyTurnover}
                            onChange={(e) => setMonthlyTurnover(e.target.value)}
                        />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="yearlyTurnover">Yearly Turnover (₹)</Label>
                        <Input 
                            id="yearlyTurnover"
                            type="number"
                            placeholder="e.g., 6000000"
                            value={yearlyTurnover}
                            onChange={(e) => setYearlyTurnover(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="businessType">Business Type</Label>
                        <Select onValueChange={setSelectedBusinessType} value={selectedBusinessType}>
                            <SelectTrigger id="businessType">
                                <SelectValue placeholder="Select type" />
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
                </div>
                <Button onClick={handleGetAdvice} disabled={(!monthlyTurnover && !yearlyTurnover) || !selectedBusinessType || loadingAdvice} className="w-full">
                    {loadingAdvice && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Get Advice
                </Button>

                {loadingAdvice && (
                     <div className="pt-4 border-t space-y-3 flex items-center justify-center text-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <p className="ml-2 text-muted-foreground">Analyzing your data...</p>
                    </div>
                )}

                {!loadingAdvice && advice && (
                    <div className="pt-4 border-t space-y-6 animate-in fade-in-50">
                        <div className="p-4 bg-muted/50 rounded-lg text-center">
                           <h4 className="font-semibold text-lg mb-1">Recommendation</h4>
                            <p className="text-sm text-foreground/90">{advice.recommendationText}</p>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6 items-center">
                           <div className="h-52 w-full max-w-sm mx-auto relative flex flex-col justify-center items-center">
                                <ResponsiveContainer width="100%" height="100%">
                                     <PieChart>
                                        <Pie
                                            data={advice.roleBreakdown}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            paddingAngle={5}
                                        >
                                            {advice.roleBreakdown.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                  <p className="text-sm text-muted-foreground">Optimal Staff</p>
                                  <p className="text-5xl font-bold text-primary">{advice.optimalStaffCount}</p>
                                </div>
                            </div>
                           <div className="flex flex-col justify-center">
                                <h4 className="font-semibold text-lg mb-4">Details:</h4>
                                <ul className="flex flex-wrap justify-start gap-x-4 gap-y-2">
                                    {advice.roleBreakdown.map((entry, index) => (
                                        <li key={`item-${index}`} className="flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                                        <span className="text-sm text-muted-foreground">{entry.name} ({entry.value})</span>
                                        </li>
                                    ))}
                                </ul>
                                <ul className="list-disc list-inside space-y-2 text-sm text-foreground/90 pt-4">
                                    <li>Current Staff Count: <span className="font-bold">{advice.currentStaffCount}</span></li>
                                    <li>Estimated Monthly Salary Budget: ₹{advice.salaryBudget.min.toLocaleString()} - ₹{advice.salaryBudget.max.toLocaleString()}</li>
                                    <li>Pro Tip: {advice.efficiencyTip}</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export default function AdminDashboard() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [employees, setEmployees] = useState<User[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [onTimeCount, setOnTimeCount] = useState(0);
  const [lateArrivalsCount, setLateArrivalsCount] = useState(0);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loadingChart, setLoadingChart] = useState(true);
  const [activeStaff, setActiveStaff] = useState<AttendanceRecord[]>([]);
  const [checkingOutId, setCheckingOutId] = useState<string | null>(null);
  const [activityFeed, setActivityFeed] = useState<ActivityFeedItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const { toast } = useToast();
  const [briefing, setBriefing] = useState<string | null>(null);
  const [generatingBriefing, setGeneratingBriefing] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [openBranchSelector, setOpenBranchSelector] = useState(false);
  const router = useRouter();
  const [statFilter, setStatFilter] = useState<StatFilter>('today');
  
  const selectedBranchId = useMemo(() => selectedBranch?.id, [selectedBranch]);
  const allBranchIds = useMemo(() => branches.filter(b => b.id !== 'all').map(b => b.id), [branches]);
  
  const staffEmployees = useMemo(() => employees.filter(e => e.role !== 'Admin'), [employees]);
  const ownerProfile = useMemo(() => employees.find(e => e.role === 'Admin'), [employees]);
  
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        if(!user){
          setAuthUser(null);
          router.push('/admin/login');
        } else {
            setAuthUser(user);
        }
    });
    return () => unsubscribeAuth();
  }, [router]);

  // Effect to fetch the list of branches
  useEffect(() => {
    if (!authUser) {
        setBranches([]);
        setSelectedBranch(null);
        setInitialLoading(false);
        return;
    }
    
    setLoading(true);
    const q = query(collection(db, "shops"), where("ownerId", "==", authUser.uid));
    const unsubscribeBranches = onSnapshot(q, (querySnapshot) => {
        const fetchedBranches = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Branch));
        
        const allBranchesOption: Branch = { id: 'all', shopName: 'All Branches', ownerId: authUser.uid };
        const fullBranchList = [allBranchesOption, ...fetchedBranches];
        setBranches(fullBranchList);
        
        if (!selectedBranch && fullBranchList.length > 0) {
            setSelectedBranch(allBranchesOption); // Default to "All Branches"
        }
        setInitialLoading(false);
    }, (error) => {
        console.error("Error fetching branches: ", error);
        toast({ title: "Error", description: "Could not fetch your branches.", variant: "destructive" });
        setInitialLoading(false);
    });

    return () => unsubscribeBranches();
  }, [authUser, toast]);

  const weeklyAttendance = useMemo(() => {
    const sevenDaysAgo = subDays(new Date(), 7);
    return allAttendance.filter(record => record.checkInTime.toDate() > sevenDaysAgo);
  }, [allAttendance]);

  const handleGenerateBriefing = () => {
    setGeneratingBriefing(true);
    const generatedBriefing = generateWeeklyBriefing(employees, weeklyAttendance);
    setBriefing(generatedBriefing);
    setGeneratingBriefing(false);
  };


  const handleForceCheckout = async (recordId: string, shopId: string) => {
    if (!shopId) return;
    setCheckingOutId(recordId);
    try {
        const attendanceDocRef = doc(db, 'shops', shopId, 'attendance', recordId);
        await updateDoc(attendanceDocRef, {
            checkOutTime: Timestamp.now(),
            status: 'Manual'
        });
        toast({ title: 'Success', description: 'Employee has been checked out.' });
    } catch (error) {
        toast({ title: 'Error', description: 'Could not check out employee.', variant: 'destructive' });
        console.error("Error forcing checkout: ", error);
    } finally {
        setCheckingOutId(null);
    }
  }
  
  // Master data fetching effect
  useEffect(() => {
    if (!authUser || !selectedBranchId) {
        // This clears data on logout and prevents running queries without auth
        if (!authUser) {
            setEmployees([]);
            setAllAttendance([]);
            setChartData([]);
            setActivityFeed([]);
            setActiveStaff([]);
            setLoading(false);
            setLoadingChart(false);
            setLoadingFeed(false);
        }
        return;
    }
    
    const isAllBranches = selectedBranchId === 'all';
    // If 'All Branches' is selected, use allBranchIds. Otherwise, use the single selectedBranchId.
    const targetShopIds = isAllBranches ? allBranchIds : [selectedBranchId];
    
    if (targetShopIds.length === 0 && isAllBranches) {
        targetShopIds.push(authUser.uid); // Fallback for new users with only one shop
    }
    
    // If no branches exist yet, don't try to fetch data.
    if (targetShopIds.length === 0) {
        setLoading(false); setLoadingChart(false); setLoadingFeed(false);
        setEmployees([]); setAllAttendance([]); setChartData([]); setActivityFeed([]); setActiveStaff([]);
        return;
    };

    setLoading(true); setLoadingChart(true); setLoadingFeed(true);

    // --- Employee Fetching ---
    const employeeQuery = query(collectionGroup(db, 'employees'), where('shopId', 'in', targetShopIds));
    const unsubscribeUsers = onSnapshot(employeeQuery, (snapshot) => {
        const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setEmployees(usersList);
        setLoading(false);
    }, (error) => { console.error(error); setLoading(false); });
    
    // --- Live Feed Data ---
    const setupLiveFeed = () => {
        const liveFeedQuery = isAllBranches
            ? query(collectionGroup(db, 'attendance'), where('shopId', 'in', targetShopIds), orderBy('checkInTime', 'desc'), limit(10))
            : query(collection(db, 'shops', selectedBranchId, 'attendance'), orderBy('checkInTime', 'desc'), limit(10));
        
        const unsubscribeAttendance = onSnapshot(liveFeedQuery, async (attSnapshot) => {
            const attendanceRecords = attSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
            setAllAttendance(attendanceRecords);

            const userIds = [...new Set(attendanceRecords.map(ar => ar.userId))];
            let feedUsers: User[] = [];
            if(userIds.length > 0) {
                const usersQuery = query(collectionGroup(db, 'employees'), where('shopId', 'in', targetShopIds), where('id', 'in', userIds));
                const usersSnap = await getDocs(usersQuery);
                feedUsers = usersSnap.docs.map(d => d.data() as User);
            }
            
            const attendanceActivities = attendanceRecords.map(record => {
                const user = feedUsers.find(u => u.id === record.userId);
                return {
                    id: record.id + (record.checkOutTime ? '-out' : '-in'),
                    type: record.checkOutTime ? 'check-out' : 'check-in',
                    timestamp: record.checkOutTime || record.checkInTime,
                    text: record.checkOutTime ? 'checked out.' : `checked in (${record.status}).`,
                    user: { name: record.userName, fallback: user?.fallback || '?', imageUrl: user?.imageUrl }
                } as ActivityFeedItem;
            });
            
             // Leave Request Query
            const leaveQuery = isAllBranches
                ? query(collectionGroup(db, 'leaveRequests'), where('shopId', 'in', targetShopIds), orderBy('requestedAt', 'desc'), limit(10))
                : query(collection(db, 'shops', selectedBranchId, 'leaveRequests'), orderBy('requestedAt', 'desc'), limit(10));

            onSnapshot(leaveQuery, (leaveSnapshot) => {
                const leaveRequests = leaveSnapshot.docs.map(doc => doc.data() as LeaveRequest & {requestedAt: Timestamp});
                const leaveActivities = leaveRequests.map(req => {
                     const user = employees.find(u => u.id === req.userId);
                     return {
                        id: req.id,
                        type: 'leave-request',
                        timestamp: req.requestedAt,
                        text: 'requested leave.',
                        user: { name: req.userName, fallback: user?.fallback || '?', imageUrl: user?.imageUrl }
                    } as ActivityFeedItem
                });

                // Combine, sort, and set the final feed
                const combinedFeed = [...attendanceActivities, ...leaveActivities]
                    .sort((a,b) => b.timestamp.toMillis() - a.timestamp.toMillis())
                    .slice(0, 10);
                
                setActivityFeed(combinedFeed);
                setLoadingFeed(false);
            });

        }, (error) => { console.error("Attendance feed error: ", error); setLoadingFeed(false); });
        
        return () => unsubscribeAttendance();
    }
    
    let unsubscribeFeed: (() => void) | null = null;
    if (employees.length > 0) {
        unsubscribeFeed = setupLiveFeed();
    } else {
        setLoadingFeed(false);
        setActivityFeed([]);
    }


    // --- Today's Stats & Active Staff ---
    let start, end;
    const now = new Date();
    switch (statFilter) {
      case 'week':
        start = startOfWeek(now);
        end = endOfWeek(now);
        break;
      case 'month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'year':
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      case 'today':
      default:
        start = startOfDay(now);
        end = now;
        break;
    }

    const attendanceQuery = isAllBranches
        ? query(collectionGroup(db, 'attendance'), where('shopId', 'in', targetShopIds), where('checkInTime', '>=', start), where('checkInTime', '<=', end))
        : query(collection(db, 'shops', selectedBranchId, 'attendance'), where('checkInTime', '>=', start), where('checkInTime', '<=', end));

    const unsubscribeTodayAttendance = onSnapshot(attendanceQuery, (snapshot) => {
        let onTime = 0; let late = 0; const currentActiveStaff: AttendanceRecord[] = [];
        snapshot.forEach(doc => {
            const data = doc.data() as AttendanceRecord;
            if (data.status === 'On-time') onTime++; else if (data.status === 'Late') late++;
            // Active staff logic should only consider today
            if (statFilter === 'today' && !data.checkOutTime) {
                 currentActiveStaff.push({id: doc.id, ...data});
            }
        });
        setOnTimeCount(onTime); setLateArrivalsCount(late); 
        if (statFilter === 'today') {
            setActiveStaff(currentActiveStaff);
        } else {
            setActiveStaff([]); // Clear active staff if not viewing today
        }
    });

    // --- Weekly Chart Data Fetching ---
    const sevenDaysAgo = startOfDay(subDays(new Date(), 6));
    const sevenDaysAgoTimestamp = Timestamp.fromDate(sevenDaysAgo);
    const weekAttendanceQuery = isAllBranches
        ? query(collectionGroup(db, 'attendance'), where('shopId', 'in', targetShopIds), where('checkInTime', '>=', sevenDaysAgoTimestamp))
        : query(collection(db, 'shops', selectedBranchId, 'attendance'), where('checkInTime', '>=', sevenDaysAgoTimestamp));

    const unsubscribeWeekAttendance = onSnapshot(weekAttendanceQuery, (snapshot) => {
        const data: { [key: string]: { onTime: number; late: number } } = {};
        for (let i = 0; i < 7; i++) {
            const day = subDays(new Date(), i);
            const dayStr = day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            data[dayStr] = { onTime: 0, late: 0 };
        }
        snapshot.forEach(doc => {
            const record = doc.data();
            const date = record.checkInTime.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (data[date]) { if (record.status === 'On-time') data[date].onTime += 1; else if (record.status === 'Late') data[date].late += 1; }
        });
        const formattedChartData = Object.keys(data).map(date => ({ date, "On-time": data[date].onTime, "Late": data[date].late })).reverse();
        setChartData(formattedChartData);
        setLoadingChart(false);
    }, () => setLoadingChart(false));


    return () => { 
        unsubscribeUsers(); 
        if (unsubscribeFeed) unsubscribeFeed();
        unsubscribeTodayAttendance(); 
        unsubscribeWeekAttendance(); 
    };
  }, [selectedBranchId, authUser, allBranchIds, employees.length, statFilter]); 

  const onLeaveCount = useMemo(() => {
    return staffEmployees.filter(e => e.status === 'Inactive').length;
  }, [staffEmployees]);
  
  if (initialLoading) {
      return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )
  }

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Good Morning, {ownerProfile?.name?.split(' ')[0] || 'Shop Owner'}!
            </h1>
            <p className="text-muted-foreground">Here's a quick overview of your attendance.</p>
           </div>
           <Tabs value={statFilter} onValueChange={(value) => setStatFilter(value as StatFilter)}>
            <TabsList className="border-2 border-foreground/30 dark:border-foreground/30">
                <TabsTrigger value="today">Today</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="year">Year</TabsTrigger>
            </TabsList>
           </Tabs>
       </div>

       <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card className="relative overflow-hidden transition-all duration-300 ease-out hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-blue-100">Total Employees</CardTitle>
            <Users className="h-5 w-5 text-blue-200" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold flex items-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : <AnimatedCounter from={0} to={staffEmployees.length} />}
            </div>
            <p className="text-xs text-blue-100 mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              <span>in {selectedBranch?.shopName}</span>
            </p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden transition-all duration-300 ease-out hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br from-green-500 to-emerald-600 text-white border-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-green-100">On Time</CardTitle>
            <UserCheck className="h-5 w-5 text-green-200" />
          </CardHeader>
          <CardContent>
             <div className="text-4xl font-bold">
                {loading ? <Loader2 className="animate-spin" /> : <AnimatedCounter from={0} to={onTimeCount} />}
            </div>
            <p className="text-xs text-green-100 mt-1">Checked in this period</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden transition-all duration-300 ease-out hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br from-orange-500 to-amber-600 text-white border-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-orange-100">Late Arrivals</CardTitle>
            <Clock className="h-5 w-5 text-orange-200" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
                {loading ? <Loader2 className="animate-spin" /> : <AnimatedCounter from={0} to={lateArrivalsCount} />}
            </div>
             <p className="text-xs text-orange-100 mt-1">Checked in this period</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden transition-all duration-300 ease-out hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br from-red-500 to-rose-600 text-white border-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-red-100">On Leave</CardTitle>
            <UserX className="h-5 w-5 text-red-200" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
                {loading ? <Loader2 className="animate-spin" /> : <AnimatedCounter from={0} to={onLeaveCount} />}
            </div>
            <p className="text-xs text-red-100 mt-1">Employees with 'Inactive' status</p>
          </CardContent>
        </Card>
      </div>

        <Card className="transform-gpu transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground hover:border-primary">
            <CardHeader>
                <CardTitle>Branch Management</CardTitle>
                <CardDescription>Select a branch to view its dashboard or manage your branches.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <Popover open={openBranchSelector} onOpenChange={setOpenBranchSelector}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openBranchSelector}
                                className="w-full sm:w-[300px] justify-between border-black dark:border-white"
                                disabled={branches.length <= 1}
                            >
                                {selectedBranch ? selectedBranch.shopName : "Select a branch..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full sm:w-[300px] p-0">
                            <Command>
                                <CommandInput placeholder="Search branch..." />
                                <CommandEmpty>No branches found. <Link href="/admin/add-branch" className="text-primary underline">Add one now</Link>.</CommandEmpty>
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
                     <Link href="/admin/add-branch">
                        <Button className="w-full sm:w-auto">
                            <Building className="mr-2 h-4 w-4" />
                            Add New Branch
                        </Button>
                    </Link>
                    <Link href="/admin/branches">
                        <Button variant="secondary" className="w-full sm:w-auto">
                            <Eye className="mr-2 h-4 w-4" />
                            View Branches
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>

       <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="transform-gpu xl:col-span-2 transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground/30 dark:border-foreground hover:border-primary">
          <CardHeader>
            <div className="flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-primary"/>
              <CardTitle>Last 7 Days Attendance</CardTitle>
            </div>
            <CardDescription>A look at on-time vs. late arrivals over the past week.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingChart ? (
                 <div className="flex items-center justify-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 </div>
            ) : chartData.length > 0 && chartData.some(d => d['On-time'] || d['Late']) ? (
                <AttendanceChart data={chartData} />
            ) : (
                 <div className="text-center py-12 text-muted-foreground">
                    <p>No attendance data for the last 7 days to display.</p>
                </div>
            )}
          </CardContent>
       </Card>
       <Card className="transform-gpu transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground/30 dark:border-foreground hover:border-primary">
            <CardHeader>
                <div className="flex items-center gap-3">
                   <Activity className="h-6 w-6 text-primary"/>
                   <CardTitle>Live Feed</CardTitle>
                </div>
                <CardDescription>A real-time log of all shop activities.</CardDescription>
            </CardHeader>
            <CardContent>
                {loadingFeed ? (
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : activityFeed.length > 0 ? (
                     <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                        {activityFeed.map((item, index) => (
                          <div key={`${item.id}-${index}`} className="flex items-start gap-4">
                            <Avatar className="h-9 w-9 border">
                                <AvatarImage src={item.user.imageUrl} />
                                <AvatarFallback>{item.user.fallback}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 text-sm">
                                <p>
                                    <span className="font-semibold">{item.user.name}</span>
                                    {' '}{item.text}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(item.timestamp.toDate(), { addSuffix: true })}
                                </p>
                            </div>
                           </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No activity yet today.</p>
                )}
            </CardContent>
        </Card>
      </div>

       <StaffingAdvisorCard businessType={selectedBranch?.businessType} currentStaffCount={staffEmployees.length} />

      <Card className="transform-gpu transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground/30 dark:border-foreground hover:border-primary">
        <CardHeader>
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-primary"/>
              <CardTitle>Weekly Briefing</CardTitle>
            </div>
            <CardDescription>Your smart summary of last week's performance.</CardDescription>
        </CardHeader>
        <CardContent>
            {briefing ? (
                <div className="text-sm text-foreground space-y-2 whitespace-pre-wrap">{briefing}</div>
            ) : (
                <p className="text-sm text-muted-foreground">Click the button to generate this week's briefing.</p>
            )}
        </CardContent>
        <CardContent className="border-t pt-4">
            <Button onClick={handleGenerateBriefing} disabled={generatingBriefing}>
                {generatingBriefing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Briefing
            </Button>
        </CardContent>
      </Card>


      <div className="grid gap-4 md:grid-cols-2 lg:gap-6">
        <Card className="transform-gpu transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground/30 dark:border-foreground hover:border-primary">
            <CardHeader>
                <CardTitle>Active Staff</CardTitle>
                <CardDescription>Employees who are currently checked in.</CardDescription>
            </CardHeader>
            <CardContent>
                 {loading ? (
                    <div className="flex items-center justify-center p-8">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                 ) : activeStaff.length > 0 ? (
                    <div className="space-y-4">
                        {activeStaff.map((record) => {
                            const employee = employees.find(e => e.id === record.userId);
                            return (
                            <div key={record.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                     <Avatar className="h-10 w-10 border">
                                        <AvatarImage src={employee?.imageUrl} />
                                        <AvatarFallback>{employee?.fallback}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold">{record.userName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Checked in at: {record.checkInTime.toDate().toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                                <Button 
                                    size="sm" 
                                    variant="destructive"
                                    onClick={() => handleForceCheckout(record.id, record.shopId)}
                                    disabled={checkingOutId === record.id}
                                >
                                    {checkingOutId === record.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <LogOut className="h-4 w-4"/>}
                                    <span className="ml-2 hidden sm:inline">Force Checkout</span>
                                </Button>
                            </div>
                        )})}
                    </div>
                 ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No employees are currently checked in.</p>
                 )}
            </CardContent>
        </Card>
        <Card className="transform-gpu transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground/30 dark:border-foreground hover:border-primary">
            <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Shortcuts to common management tasks.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
                <Link href="/admin/employees/add">
                    <Card className="h-full flex flex-col items-center justify-center p-4 gap-2 transition-all hover:shadow-md hover:border-primary border-2 border-foreground">
                        <UserPlus className="h-6 w-6 text-primary"/>
                        <span className="text-center text-sm font-medium">Invite Employee</span>
                    </Card>
                </Link>
                 <Link href="/admin/generate-qr#manual-entry">
                    <Card className="h-full flex flex-col items-center justify-center p-4 gap-2 transition-all hover:shadow-md hover:border-primary border-2 border-foreground">
                        <QrCode className="h-6 w-6 text-primary"/>
                        <span className="text-center text-sm font-medium">Manual Entry</span>
                    </Card>
                </Link>
                 <Link href="/admin/employees">
                     <Card className="h-full flex flex-col items-center justify-center p-4 gap-2 transition-all hover:shadow-md hover:border-primary border-2 border-foreground">
                        <Users className="h-6 w-6 text-primary"/>
                        <span className="text-center text-sm font-medium">View Staff</span>
                    </Card>
                </Link>
                 <Link href="/admin/report">
                     <Card className="h-full flex flex-col items-center justify-center p-4 gap-2 transition-all hover:shadow-md hover:border-primary border-2 border-foreground">
                        <BarChart3 className="h-6 w-6 text-primary"/>
                        <span className="text-center text-sm font-medium">Full Reports</span>
                    </Card>
                </Link>
            </CardContent>
        </Card>
      </div>
      <div className="text-left text-muted-foreground mt-8 py-4">
        <div className="flex flex-col md:flex-row md:gap-x-4">
            <h1 className="text-5xl md:text-6xl font-extrabold">Run</h1>
            <h1 className="text-5xl md:text-6xl font-extrabold">It Up !</h1>
        </div>
        <p className="text-sm mt-2">Crafted with ❤️ in TamilNadu, India</p>
      </div>
    </div>
  );
}
