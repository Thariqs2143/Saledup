
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Store, Gem, Loader2, BarChart3, Briefcase, Megaphone, BookLock } from "lucide-react";
import { AnimatedCounter } from "@/components/animated-counter";
import { useEffect, useState } from "react";
import { collection, getDocs, Timestamp, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { AttendanceChart, type ChartData } from '@/components/attendance-chart';
import { subDays, startOfDay, format } from 'date-fns';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SuperAdminDashboard() {
    const { toast } = useToast();
    const router = useRouter();
    const [stats, setStats] = useState({
        totalShops: 0,
        totalEmployees: 0,
        totalSubscriptions: 0,
    });
    const [loading, setLoading] = useState(true);
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [loadingChart, setLoadingChart] = useState(true);

    useEffect(() => {
        // This check ensures we only run this logic on the client-side
        const isAuthenticated = localStorage.getItem('superAdminAuthenticated');
        if (isAuthenticated !== 'true') {
            router.replace('/super-admin/login');
            return;
        }

        const fetchAllData = async () => {
            setLoading(true);
            setLoadingChart(true);
            try {
                // --- Fetch Stats Cards Data ---
                const shopsSnapshot = await getDocs(collection(db, 'shops'));
                const totalShops = shopsSnapshot.size;

                let totalEmployees = 0;
                let newEmployeeCountsByDate: { [key: string]: number } = {};
                const sevenDaysAgo = startOfDay(subDays(new Date(), 6));

                for (const shopDoc of shopsSnapshot.docs) {
                    const employeesSnapshot = await getDocs(collection(db, 'shops', shopDoc.id, 'employees'));
                    totalEmployees += employeesSnapshot.size;

                    // Aggregate new employees for the chart
                    employeesSnapshot.forEach(empDoc => {
                        const empData = empDoc.data();
                        if (empData.joinDate) {
                            try {
                                const joinDate = new Date(empData.joinDate);
                                if (joinDate >= sevenDaysAgo) {
                                    const dateStr = format(joinDate, 'MMM d');
                                    newEmployeeCountsByDate[dateStr] = (newEmployeeCountsByDate[dateStr] || 0) + 1;
                                }
                            } catch (e) {
                                console.error("Invalid employee joinDate format:", empData.joinDate);
                            }
                        }
                    });
                }
                
                // For now, we assume one subscription per shop
                const totalSubscriptions = totalShops;

                setStats({
                    totalShops,
                    totalEmployees,
                    totalSubscriptions
                });
                
                // --- Fetch Chart Data ---
                const newShopsQuery = query(collection(db, 'shops'), where('createdAt', '>=', Timestamp.fromDate(sevenDaysAgo)));
                const newShopsSnapshot = await getDocs(newShopsQuery);

                const data: { [key: string]: { 'New Shops': number; 'New Employees': number } } = {};
                for (let i = 6; i >= 0; i--) {
                    const day = subDays(new Date(), i);
                    const dayStr = format(day, 'MMM d');
                    data[dayStr] = { 'New Shops': 0, 'New Employees': 0 };
                }

                // Populate new shops data
                newShopsSnapshot.forEach(doc => {
                    const shopData = doc.data();
                    if (shopData.createdAt) {
                         try {
                            const joinDate = shopData.createdAt.toDate();
                            const dateStr = format(joinDate, 'MMM d');
                            if(data[dateStr]) {
                                data[dateStr]['New Shops']++;
                            }
                        } catch(e) {
                             console.error("Invalid shop createdAt format:", shopData.createdAt);
                        }
                    }
                });

                // Populate new employees data from our aggregated map
                Object.keys(newEmployeeCountsByDate).forEach(dateStr => {
                    if (data[dateStr]) {
                        data[dateStr]['New Employees'] = newEmployeeCountsByDate[dateStr];
                    }
                });

                const formattedChartData = Object.keys(data).map(date => ({ 
                    date, 
                    "New Shops": data[date]['New Shops'], 
                    "New Employees": data[date]['New Employees'] 
                }));

                setChartData(formattedChartData as unknown as ChartData[]);


            } catch (error) {
                console.error("Error fetching stats:", error);
                 toast({ title: "Error", description: "Could not load dashboard data.", variant: "destructive" });
            } finally {
                setLoading(false);
                setLoadingChart(false);
            }
        };

        fetchAllData();
    }, [toast, router]);
    
     if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
    <div className="flex flex-col gap-6 lg:gap-8">
       <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Super Admin Dashboard</h1>
        <p className="text-muted-foreground">Global overview of the Saledup ecosystem.</p>
       </div>
       <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card className="relative overflow-hidden transition-all duration-300 ease-out hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none col-span-2 sm:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-indigo-100">Total Shops</CardTitle>
            <Store className="h-5 w-5 text-indigo-200" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold flex items-center gap-2">
              <AnimatedCounter from={0} to={stats.totalShops} />
            </div>
            <p className="text-xs text-indigo-100 mt-1 flex items-center gap-1">
              Registered businesses
            </p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden transition-all duration-300 ease-out hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br from-sky-500 to-cyan-600 text-white border-none col-span-2 sm:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-sky-100">Total Employees</CardTitle>
            <Users className="h-5 w-5 text-sky-200" />
          </CardHeader>
          <CardContent>
             <div className="text-4xl font-bold">
                <AnimatedCounter from={0} to={stats.totalEmployees} />
            </div>
            <p className="text-xs text-sky-100 mt-1">Managed across all shops.</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden transition-all duration-300 ease-out hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br from-teal-500 to-emerald-600 text-white border-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-teal-100">Active Subscriptions</CardTitle>
            <Gem className="h-5 w-5 text-teal-200" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
                <AnimatedCounter from={0} to={stats.totalSubscriptions} />
            </div>
             <p className="text-xs text-teal-100 mt-1">Currently active plans.</p>
          </CardContent>
        </Card>
         <Card className="relative overflow-hidden transition-all duration-300 ease-out hover:shadow-xl hover:-translate-y-1 bg-gradient-to-br from-rose-500 to-red-600 text-white border-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-rose-100">Total Revenue</CardTitle>
            <Briefcase className="h-5 w-5 text-rose-200" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
                ₹<AnimatedCounter from={0} to={0} />
            </div>
             <p className="text-xs text-rose-100 mt-1">Monthly recurring revenue.</p>
          </CardContent>
        </Card>
      </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="transform-gpu transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground hover:border-primary">
                <CardHeader>
                    <CardTitle>Platform Tools</CardTitle>
                    <CardDescription>Quick access to management pages.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <Link href="/super-admin/announcements">
                        <Button variant="outline" className="w-full h-full flex flex-col items-center justify-center p-4 gap-2">
                            <Megaphone className="h-6 w-6 text-primary"/>
                            <span className="text-center text-sm">Announcements</span>
                        </Button>
                    </Link>
                    <Link href="/super-admin/audit-log">
                        <Button variant="outline" className="w-full h-full flex flex-col items-center justify-center p-4 gap-2">
                            <BookLock className="h-6 w-6 text-primary"/>
                            <span className="text-center text-sm">Audit Log</span>
                        </Button>
                    </Link>
                </CardContent>
            </Card>
            <Card className="transform-gpu transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground hover:border-primary">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-6 w-6 text-primary"/>
                  <CardTitle>Platform Growth - Last 7 Days</CardTitle>
                </div>
                <CardDescription>Daily count of new shops and employees joining the platform.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingChart ? (
                    <div className="flex items-center justify-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <AttendanceChart data={chartData} />
                )}
              </CardContent>
           </Card>
       </div>
    </div>
  );
}
