
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Calendar as CalendarIcon, Download, FileText, Check, X, Calculator, Clock4, Users, Receipt, ChevronDown, Lock, Building, ChevronsUpDown, Search, Filter } from "lucide-react";
import { collection, query, where, getDocs, orderBy, Timestamp, doc, getDoc, collectionGroup } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { format, subDays, getDaysInMonth, startOfMonth, endOfMonth, differenceInDays, eachDayOfInterval, startOfWeek, endOfWeek, setMonth, setYear } from 'date-fns';
import type { DateRange } from "react-day-picker";
import jsPDF from "jspdf";
import "jspdf-autotable";
import type { User, LeaveRequest } from '../employees/page';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList }from "@/components/ui/command";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';


// Extend jsPDF with autoTable
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}

type ShopData = {
    id: string;
    shopName?: string;
    address?: string;
    imageUrl?: string;
    subscriptionPlan?: 'Free' | 'Pro' | 'Business' | 'Enterprise';
    ownerId?: string;
};

type AttendanceRecord = {
  id: string;
  userId: string;
  userName?: string;
  checkInTime: Timestamp;
  checkOutTime?: Timestamp;
  status: 'On-time' | 'Late' | 'Absent' | 'Manual' | 'Half-day';
};

type PayrollData = {
    employeeId: string;
    employeeName: string;
    baseSalary: number;
    paidLeaveUsed: number;
    unpaidLeave: number;
    halfDays: number;
    totalPresent: number;
    daysInMonth: number;
    earnings: {
        base: number;
        bonus: number;
    };
    deductions: {
        unpaidLeave: number;
        halfDay: number;
        advances: number;
    };
    finalSalary: number;
}

type MusterData = {
    employeeId: string;
    employeeName: string;
    dailyStatus: { [day: number]: 'P' | 'A' | 'H' | 'L' }; // Present, Absent, Half-day, Leave
}

const AttendanceReportTab = ({ allBranches, selectedBranch, authUser, date, selectedEmployeeId, selectedStatus, employees }: { allBranches: ShopData[], selectedBranch: ShopData, authUser: AuthUser, date?: DateRange, selectedEmployeeId: string, selectedStatus: string, employees: User[] }) => {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const { toast } = useToast();
    
    const isProTier = selectedBranch.subscriptionPlan === 'Pro' || selectedBranch.subscriptionPlan === 'Business' || selectedBranch.subscriptionPlan === 'Enterprise';
    const isAllBranches = selectedBranch.id === 'all';
    const allBranchIds = useMemo(() => allBranches.filter(b => b.id !== 'all').map(b => b.id), [allBranches]);

    const handleFetchReport = useCallback(async () => {
        if (!date?.from || !authUser) return;
        setLoading(true);

        const targetShopIds = isAllBranches ? allBranchIds : [selectedBranch.id];
        if (targetShopIds.length === 0 && !isAllBranches) {
             setRecords([]);
             setLoading(false);
             return;
        }
         if (isAllBranches && allBranchIds.length === 0) {
            targetShopIds.push(authUser.uid);
        }

        const startDate = Timestamp.fromDate(date.from);
        const endDate = date.to ? Timestamp.fromDate(new Date(date.to.setHours(23, 59, 59, 999))) : startDate;

        const attendanceQuery = isAllBranches
          ? query(collectionGroup(db, 'attendance'), where('shopId', 'in', targetShopIds), where('checkInTime', '>=', startDate), where('checkInTime', '<=', endDate), orderBy('checkInTime', 'desc'))
          : query(collection(db, 'shops', selectedBranch.id, 'attendance'), where('checkInTime', '>=', startDate), where('checkInTime', '<=', endDate), orderBy('checkInTime', 'desc'));


        const querySnapshot = await getDocs(attendanceQuery);
        const fetchedRecords = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const employee = employees.find(e => e.id === data.userId);
            return { ...data, id: doc.id, userName: employee?.name || 'Unknown' } as AttendanceRecord
        });
        setRecords(fetchedRecords);
        setLoading(false);
    }, [date, authUser, employees, isAllBranches, selectedBranch.id, allBranchIds]);

    useEffect(() => {
        if (employees.length > 0 && date?.from && authUser) {
            handleFetchReport();
        } else if (!authUser) {
            setRecords([]);
            setLoading(false);
        }
    }, [date, authUser, employees, handleFetchReport]);
    
    useEffect(() => {
        let newFiltered = [...records];
        if (selectedEmployeeId !== 'all') {
            newFiltered = newFiltered.filter(r => r.userId === selectedEmployeeId);
        }
        if (selectedStatus !== 'all') {
            newFiltered = newFiltered.filter(r => r.status === selectedStatus);
        }
        setFilteredRecords(newFiltered);
    }, [records, selectedEmployeeId, selectedStatus]);


    const getStatusVariant = (status: AttendanceRecord['status']) => {
        switch (status) {
            case 'On-time': return 'secondary';
            case 'Late': return 'destructive';
            case 'Half-day': return 'outline';
            case 'Manual': return 'outline';
            default: return 'default';
        }
    };

    const handleExportCSV = () => {
        if (filteredRecords.length === 0) return toast({ title: "No Data", variant: "destructive" });
        setExporting(true);
        const headers = ["Employee", "Date", "Check-in", "Check-out", "Status"];
        let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\r\n";
        filteredRecords.forEach(r => csvContent += [`"${r.userName}"`, `"${format(r.checkInTime.toDate(), 'yyyy-MM-dd')}"`, `"${format(r.checkInTime.toDate(), 'p')}"`, `"${r.checkOutTime ? format(r.checkOutTime.toDate(), 'p') : 'N/A'}"`, `"${r.status}"`].join(",") + "\r\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `attendance_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setExporting(false);
    };

    const handleExportPDF = () => {
        if (filteredRecords.length === 0) return toast({ title: "No Data", variant: "destructive" });
        setExporting(true);
        const doc = new jsPDF();
        doc.text("Attendance Report", 14, 15);
        doc.autoTable({
            startY: 20,
            head: [['Employee', 'Date', 'Check-in', 'Check-out', 'Status']],
            body: filteredRecords.map(r => [r.userName, format(r.checkInTime.toDate(), 'PPP'), format(r.checkInTime.toDate(), 'p'), r.checkOutTime ? format(r.checkOutTime.toDate(), 'p') : 'N/A', r.status]),
        });
        doc.save(`attendance_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
        setExporting(false);
    };

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h3 className="text-xl font-bold">Report Results</h3>
                        <p className="text-sm text-muted-foreground">Found {filteredRecords.length} record(s) matching your criteria.</p>
                    </div>
                     {isProTier ? (
                        <div className="flex gap-2 w-full sm:w-auto">
                            <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleExportCSV} disabled={exporting || filteredRecords.length === 0}>{exporting ? <Loader2 className="animate-spin" /> : <Download />}Export CSV</Button>
                            <Button className="w-full bg-red-600 hover:bg-red-700" onClick={handleExportPDF} disabled={exporting || filteredRecords.length === 0}>{exporting ? <Loader2 className="animate-spin" /> : <Download />}Export PDF</Button>
                        </div>
                     ) : (
                         <div className="w-full sm:w-auto text-sm text-muted-foreground border p-2 rounded-md flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            <div>
                                Export is a Pro feature.
                                <Link href="/admin/subscription" className="font-bold text-primary underline ml-1">Upgrade</Link>
                            </div>
                        </div>
                     )}
                </div>
                <div>
                    {loading ? <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                        : filteredRecords.length === 0 ? <div className="h-24 text-center flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg"><FileText className="h-8 w-8 mb-2" /><p>No records found.</p></div>
                            : (
                                <>
                                    <div className="grid gap-4 md:hidden">
                                        {filteredRecords.map(r => (
                                            <Card key={r.id} className="p-4 space-y-3 border-2 border-foreground transition-all duration-300 ease-out hover:shadow-lg hover:border-primary">
                                                <div className="flex justify-between items-start">
                                                    <div><p className="font-bold">{r.userName}</p><p className="text-sm text-muted-foreground">{format(r.checkInTime.toDate(), 'MMM d, yyyy')}</p></div>
                                                    <Badge variant={getStatusVariant(r.status)}>{r.status}</Badge>
                                                </div>
                                                <div className="flex text-sm items-center justify-between text-muted-foreground">
                                                    <div className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /><span>{format(r.checkInTime.toDate(), 'p')}</span></div>
                                                    <div className="flex items-center gap-2"><X className="h-4 w-4 text-red-500" /><span>{r.checkOutTime ? format(r.checkOutTime.toDate(), 'p') : 'N/A'}</span></div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                    <div className="hidden md:block rounded-lg border-2 border-foreground">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Employee</TableHead><TableHead>Date</TableHead><TableHead>Check-in</TableHead><TableHead>Check-out</TableHead><TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredRecords.map(r => (
                                                    <TableRow key={r.id}>
                                                        <TableCell className="font-medium">{r.userName}</TableCell><TableCell>{format(r.checkInTime.toDate(), 'MMM d, yyyy')}</TableCell><TableCell>{format(r.checkInTime.toDate(), 'p')}</TableCell><TableCell>{r.checkOutTime ? format(r.checkOutTime.toDate(), 'p') : 'N/A'}</TableCell><TableCell><Badge variant={getStatusVariant(r.status)}>{r.status}</Badge></TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </>
                            )}
                </div>
            </div>
        </div>
    );
};

const PayrollReportTab = ({ shopData, authUser }: { shopData: ShopData, authUser: AuthUser }) => {
    const [payrollData, setPayrollData] = useState<PayrollData[]>([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const { toast } = useToast();
    
    const isProTier = shopData.subscriptionPlan === 'Pro' || shopData.subscriptionPlan === 'Business' || shopData.subscriptionPlan === 'Enterprise';

    
    const handleAdjustmentChange = (employeeId: string, type: 'bonus' | 'advances', value: string) => {
        const numericValue = Number(value) || 0;
        setPayrollData(prevData => prevData.map(p => {
            if (p.employeeId === employeeId) {
                const updatedP = { ...p };
                if (type === 'bonus') {
                    updatedP.earnings.bonus = numericValue;
                } else {
                    updatedP.deductions.advances = numericValue;
                }
                const totalEarnings = updatedP.earnings.base + updatedP.earnings.bonus;
                const totalDeductions = updatedP.deductions.unpaidLeave + updatedP.deductions.halfDay + updatedP.deductions.advances;
                updatedP.finalSalary = Math.round(totalEarnings - totalDeductions);
                return updatedP;
            }
            return p;
        }));
    };


    const handleGeneratePayroll = async () => {
        if (!authUser) return;
        setLoading(true);

        const shopId = authUser.uid;

        const settingsDocRef = doc(db, 'shops', shopId, 'config', 'main');
        const settingsSnap = await getDoc(settingsDocRef);
        const monthlyPaidLeave = settingsSnap.exists() ? settingsSnap.data().monthlyPaidLeave : 4;

        const employeesCollectionRef = collection(db, 'shops', shopId, 'employees');
        const q = query(employeesCollectionRef, where("role", "!=", "Admin"));
        const employeesSnapshot = await getDocs(q);
        const employeeList = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));

        const monthStart = startOfMonth(selectedDate);
        const monthEnd = endOfMonth(selectedDate);
        const daysInMonth = getDaysInMonth(selectedDate);

        // Fetch all relevant records for the month
        const attendanceQuery = query(
            collection(db, 'shops', shopId, 'attendance'),
            where('checkInTime', '>=', monthStart),
            where('checkInTime', '<=', monthEnd)
        );
        const attendanceSnapshot = await getDocs(attendanceQuery);
        const monthAttendanceRecords = attendanceSnapshot.docs.map(d => d.data() as AttendanceRecord & {userId: string});

        const leaveQuery = query(
            collection(db, 'shops', shopId, 'leaveRequests'),
            where('status', '==', 'approved')
        );
        const leaveSnapshot = await getDocs(leaveQuery);
        const approvedLeaveRecords: LeaveRequest[] = [];
        leaveSnapshot.forEach(doc => {
            const request = doc.data() as LeaveRequest;
            const requestStartDate = new Date(request.startDate);
            const requestEndDate = new Date(request.endDate);
             if (requestStartDate <= monthEnd && requestEndDate >= monthStart) {
                approvedLeaveRecords.push({ id: doc.id, ...request });
            }
        });
        
        const payrollResults: PayrollData[] = employeeList.map(employee => {
            if (!employee.baseSalary || employee.baseSalary === 0) {
                 return {
                    employeeId: employee.id!, employeeName: employee.name, baseSalary: 0,
                    paidLeaveUsed: 0, unpaidLeave: 0, halfDays: 0, totalPresent: 0, daysInMonth,
                    earnings: { base: 0, bonus: 0 },
                    deductions: { unpaidLeave: 0, halfDay: 0, advances: 0 },
                    finalSalary: 0,
                };
            }
            
            const dailyRate = employee.baseSalary / daysInMonth;
            
            let totalLeaveDays = 0;
            approvedLeaveRecords.filter(r => r.userId === employee.id).forEach(request => {
                const leaveStart = new Date(request.startDate);
                const leaveEnd = new Date(request.endDate);
                const start = leaveStart > monthStart ? leaveStart : monthStart;
                const end = leaveEnd < monthEnd ? leaveEnd : monthEnd;
                totalLeaveDays += differenceInDays(end, start) + 1;
            });

            const employeeMonthAttendance = monthAttendanceRecords.filter(r => r.userId === employee.id);
            const employeeHalfDays = employeeMonthAttendance.filter(r => r.status === 'Half-day').length;
            const employeePresents = employeeMonthAttendance.length - employeeHalfDays;
            
            const paidLeaveUsed = Math.min(totalLeaveDays, monthlyPaidLeave);
            const unpaidLeave = Math.max(0, totalLeaveDays - monthlyPaidLeave);
            
            const halfDayDeductions = Math.round(employeeHalfDays * (dailyRate / 2));
            const unpaidLeaveDeductions = Math.round(unpaidLeave * dailyRate);
            
            const totalDeductions = unpaidLeaveDeductions + halfDayDeductions;
            const finalSalary = Math.round(employee.baseSalary - totalDeductions);

            return {
                employeeId: employee.id!, employeeName: employee.name, baseSalary: employee.baseSalary,
                paidLeaveUsed: paidLeaveUsed, unpaidLeave: unpaidLeave, halfDays: employeeHalfDays,
                totalPresent: employeePresents, daysInMonth,
                earnings: { base: employee.baseSalary, bonus: 0 },
                deductions: { unpaidLeave: unpaidLeaveDeductions, halfDay: halfDayDeductions, advances: 0 },
                finalSalary: finalSalary,
            };
        });

        setPayrollData(payrollResults);
        setLoading(false);
    };
    
    const handleExportCSV = () => {
        if (payrollData.length === 0) return toast({ title: "No Data", variant: "destructive" });
        setExporting(true);
        const headers = ["Employee", "Base Salary", "Bonus/Overtime", "Advance/Deduction", "Final Salary"];
        let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\r\n";
        payrollData.forEach(p => csvContent += [
            `"${p.employeeName}"`, p.earnings.base, p.earnings.bonus, p.deductions.advances, p.finalSalary
        ].join(",") + "\r\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `payroll_report_${format(selectedDate, 'yyyy-MM')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setExporting(false);
    };

    const handleExportPDF = () => {
        if (payrollData.length === 0) return toast({ title: "No Data", variant: "destructive" });
        setExporting(true);
        const doc = new jsPDF();
        doc.text(`Payroll Report for ${format(selectedDate, 'MMMM yyyy')}`, 14, 15);
        doc.autoTable({
            startY: 20,
            head: [['Employee', 'Base (₹)', 'Bonus (₹)', 'Deduction (₹)', 'Final Salary (₹)']],
            body: payrollData.map(p => [
                p.employeeName, p.earnings.base.toLocaleString(), p.earnings.bonus.toLocaleString(), p.deductions.advances.toLocaleString(), p.finalSalary.toLocaleString()
            ]),
        });
        doc.save(`payroll_report_${format(selectedDate, 'yyyy-MM')}.pdf`);
        setExporting(false);
    };
    
    const handleDownloadSlip = (employeeData: PayrollData) => {
        const doc = new jsPDF();
        const totalEarnings = employeeData.earnings.base + employeeData.earnings.bonus;
        const totalDeductions = employeeData.deductions.unpaidLeave + employeeData.deductions.halfDay + employeeData.deductions.advances;
        
        // Header
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(shopData?.shopName || 'Your Company', 105, 20, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(shopData?.address || 'Company Address', 105, 27, { align: 'center' });
        doc.setFontSize(14);
        doc.text(`Pay Slip for ${format(selectedDate, 'MMMM yyyy')}`, 105, 40, { align: 'center' });

        // Employee Details
        doc.setLineWidth(0.5);
        doc.line(14, 45, 196, 45);
        doc.setFontSize(11);
        doc.text(`Employee Name: ${employeeData.employeeName}`, 20, 55);
        doc.text(`Payable Days: ${employeeData.daysInMonth}`, 130, 55);
        doc.text(`Employee ID: ${employeeData.employeeId}`, 20, 62);
        doc.text(`Present Days: ${employeeData.totalPresent}`, 130, 62);
        doc.line(14, 70, 196, 70);

        // Earnings and Deductions Table
        doc.autoTable({
            startY: 75,
            head: [['Earnings', 'Amount (₹)', 'Deductions', 'Amount (₹)']],
            body: [
                ['Basic Salary', employeeData.earnings.base.toLocaleString(), 'Unpaid Leave', employeeData.deductions.unpaidLeave.toLocaleString()],
                ['Bonus / Overtime', employeeData.earnings.bonus.toLocaleString(), 'Half-day', employeeData.deductions.halfDay.toLocaleString()],
                ['', '', 'Advance / Other', employeeData.deductions.advances.toLocaleString()],
                ['', '', '', ''], // Spacer row
                [{ content: 'Total Earnings', styles: { fontStyle: 'bold' } }, { content: totalEarnings.toLocaleString(), styles: { fontStyle: 'bold' } }, { content: 'Total Deductions', styles: { fontStyle: 'bold' } }, { content: totalDeductions.toLocaleString(), styles: { fontStyle: 'bold' } }],
            ],
            theme: 'grid',
            styles: { fontSize: 10, cellPadding: 3 },
            headStyles: { fillColor: [22, 163, 74] },
        });

        // Net Salary
        const finalY = (doc as any).lastAutoTable.finalY;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Net Salary Payable:', 20, finalY + 15);
        doc.text(`₹ ${employeeData.finalSalary.toLocaleString()}`, 190, finalY + 15, { align: 'right' });
        
        doc.save(`PaySlip_${employeeData.employeeName}_${format(selectedDate, 'MM-yyyy')}.pdf`);
    };


    return (
        <div className="space-y-6">
            <Card className="border-2 border-foreground transition-all duration-300 ease-out hover:shadow-lg hover:border-primary">
                <CardHeader>
                    <CardTitle>Generate Payroll</CardTitle>
                    <CardDescription>Select a month to calculate salaries for all employees based on their base pay and leave.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="space-y-2">
                        <Label>Select Year</Label>
                        <Select
                            value={String(selectedDate.getFullYear())}
                            onValueChange={(year) => setSelectedDate(setYear(selectedDate, parseInt(year)))}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {[...Array(5)].map((_, i) => (
                                    <SelectItem key={i} value={String(new Date().getFullYear() - i)}>
                                        {new Date().getFullYear() - i}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Select Month</Label>
                        <Select
                            value={String(selectedDate.getMonth())}
                            onValueChange={(month) => setSelectedDate(setMonth(selectedDate, parseInt(month)))}
                        >
                             <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select Month" />
                            </SelectTrigger>
                            <SelectContent>
                                {[...Array(12)].map((_, i) => (
                                    <SelectItem key={i} value={String(i)}>{format(setMonth(new Date(), i), 'MMMM')}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleGeneratePayroll} disabled={loading} className="mt-auto">
                        {loading ? <Loader2 className="mr-2 animate-spin"/> : <Calculator className="mr-2"/>}
                        Generate Report
                    </Button>
                </CardContent>
            </Card>
            <Card className="border-2 border-foreground transition-all duration-300 ease-out hover:shadow-lg hover:border-primary">
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle>Payroll Results for {format(selectedDate, 'MMMM yyyy')}</CardTitle>
                            <CardDescription>Found {payrollData.length} employee(s). You can add bonuses or deductions below.</CardDescription>
                        </div>
                        {isProTier ? (
                            <div className="flex gap-2 w-full sm:w-auto">
                               <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleExportCSV} disabled={exporting || payrollData.length === 0}>{exporting ? <Loader2 className="animate-spin" /> : <Download />}Export CSV</Button>
                               <Button className="w-full bg-red-600 hover:bg-red-700" onClick={handleExportPDF} disabled={exporting || payrollData.length === 0}>{exporting ? <Loader2 className="animate-spin" /> : <Download />}Export PDF</Button>
                            </div>
                        ): (
                             <div className="w-full sm:w-auto text-sm text-muted-foreground border p-2 rounded-md flex items-center gap-2">
                                <Lock className="h-4 w-4" />
                                <div>
                                    Export is a Pro feature.
                                    <Link href="/admin/subscription" className="font-bold text-primary underline ml-1">Upgrade</Link>
                                </div>
                            </div>
                        )}
                    </div>
                </CardHeader>
                 <CardContent>
                    {loading ? <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                        : payrollData.length === 0 ? <div className="h-24 text-center flex flex-col items-center justify-center text-muted-foreground"><FileText className="h-8 w-8 mb-2" /><p>Generate a report to see results.</p></div>
                            : (
                                <>
                                    {/* Mobile View */}
                                    <div className="grid gap-4 md:hidden">
                                        {payrollData.map(p => (
                                            <Card key={p.employeeId} className="p-4 space-y-4">
                                                <div className="flex justify-between items-start">
                                                    <p className="font-bold">{p.employeeName}</p>
                                                    <Button 
                                                        size="sm"
                                                        onClick={() => handleDownloadSlip(p)}
                                                        disabled={p.baseSalary === 0 || !isProTier}
                                                        className="bg-blue-600 hover:bg-blue-700"
                                                    >
                                                        <Receipt className="mr-2 h-4 w-4"/> Slip
                                                    </Button>
                                                </div>
                                                <Separator />
                                                <div className="space-y-3 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Base Salary:</span>
                                                        <span className="font-medium">₹{p.baseSalary > 0 ? p.baseSalary.toLocaleString() : "N/A"}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <Label htmlFor={`bonus-${p.employeeId}`} className="text-muted-foreground">Bonus (₹):</Label>
                                                        <Input 
                                                            id={`bonus-${p.employeeId}`}
                                                            type="number" 
                                                            className="h-8 w-24 text-right"
                                                            placeholder="0"
                                                            value={p.earnings.bonus || ''}
                                                            onChange={(e) => handleAdjustmentChange(p.employeeId, 'bonus', e.target.value)}
                                                            disabled={p.baseSalary === 0}
                                                        />
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <Label htmlFor={`advances-${p.employeeId}`} className="text-muted-foreground">Deduction (₹):</Label>
                                                        <Input 
                                                            id={`advances-${p.employeeId}`}
                                                            type="number" 
                                                            className="h-8 w-24 text-right" 
                                                            placeholder="0"
                                                            value={p.deductions.advances || ''}
                                                            onChange={(e) => handleAdjustmentChange(p.employeeId, 'advances', e.target.value)}
                                                            disabled={p.baseSalary === 0}
                                                        />
                                                    </div>
                                                </div>
                                                <Separator />
                                                <div className="flex justify-between font-bold text-base">
                                                    <span>Final Salary:</span>
                                                    <span>₹{p.finalSalary > 0 ? p.finalSalary.toLocaleString() : "N/A"}</span>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                    {/* Desktop View */}
                                    <div className="hidden md:block rounded-lg border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Employee</TableHead>
                                                    <TableHead className="text-right">Base Salary (₹)</TableHead>
                                                    <TableHead>Bonus/Overtime (₹)</TableHead>
                                                    <TableHead>Advance/Deduction (₹)</TableHead>
                                                    <TableHead className="text-right">Final Salary (₹)</TableHead>
                                                    <TableHead className="text-center">Action</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {payrollData.map(p => (
                                                    <TableRow key={p.employeeId}>
                                                        <TableCell className="font-medium">{p.employeeName}</TableCell>
                                                        <TableCell className="text-right">{p.baseSalary > 0 ? p.baseSalary.toLocaleString() : "N/A"}</TableCell>
                                                        <TableCell>
                                                            <Input 
                                                            type="number" 
                                                            className="max-w-[120px] text-right ml-auto" 
                                                            placeholder="0"
                                                            value={p.earnings.bonus || ''}
                                                            onChange={(e) => handleAdjustmentChange(p.employeeId, 'bonus', e.target.value)}
                                                            disabled={p.baseSalary === 0}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input 
                                                            type="number" 
                                                            className="max-w-[120px] text-right ml-auto" 
                                                            placeholder="0"
                                                            value={p.deductions.advances || ''}
                                                            onChange={(e) => handleAdjustmentChange(p.employeeId, 'advances', e.target.value)}
                                                            disabled={p.baseSalary === 0}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-right font-bold">{p.finalSalary > 0 ? p.finalSalary.toLocaleString() : "N/A"}</TableCell>
                                                        <TableCell className="text-center">
                                                            <Button 
                                                                size="sm"
                                                                onClick={() => handleDownloadSlip(p)}
                                                                disabled={p.baseSalary === 0 || !isProTier}
                                                                className="bg-blue-600 hover:bg-blue-700"
                                                            >
                                                                <Receipt className="mr-2 h-4 w-4"/> Slip
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </>
                            )}
                </CardContent>
            </Card>
        </div>
    );
};

const MusterRollTab = ({ authUser }: { authUser: AuthUser }) => {
    const [musterData, setMusterData] = useState<MusterData[]>([]);
    const [daysInMonth, setDaysInMonth] = useState<Date[]>([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const { toast } = useToast();

    const handleGenerateMuster = async () => {
        if (!authUser) return;
        setLoading(true);

        const shopId = authUser.uid;
        const monthStart = startOfMonth(selectedDate);
        const monthEnd = endOfMonth(selectedDate);
        const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
        setDaysInMonth(days);

        const employeesCollectionRef = collection(db, 'shops', shopId, 'employees');
        const employeesSnapshot = await getDocs(query(employeesCollectionRef, where('status', '==', 'Active'), where('role', '!=', 'Admin')));
        const employeeList = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));

        const attendanceQuery = query(
            collection(db, 'shops', shopId, 'attendance'),
            where('checkInTime', '>=', monthStart),
            where('checkInTime', '<=', monthEnd)
        );
        const attendanceSnapshot = await getDocs(attendanceQuery);
        const attendanceRecords = attendanceSnapshot.docs.map(doc => doc.data() as AttendanceRecord);
        
        const leaveQuery = query(
            collection(db, 'shops', shopId, 'leaveRequests'),
            where('status', '==', 'approved')
        );
        const leaveSnapshot = await getDocs(leaveQuery);
        const approvedLeaveRecords: LeaveRequest[] = [];
        leaveSnapshot.forEach(doc => {
            const request = doc.data() as LeaveRequest;
            const requestStartDate = new Date(request.startDate);
            const requestEndDate = new Date(request.endDate);
             if (requestStartDate <= monthEnd && requestEndDate >= monthStart) {
                approvedLeaveRecords.push({ id: doc.id, ...request });
            }
        });


        const musterResults: MusterData[] = employeeList.map(employee => {
            const dailyStatus: { [day: number]: 'P' | 'A' | 'H' | 'L' } = {};
            days.forEach(day => {
                const dayOfMonth = day.getDate();
                
                const attendanceRecord = attendanceRecords.find(r => 
                    r.userId === employee.id &&
                    new Date(r.checkInTime.seconds * 1000).getDate() === dayOfMonth
                );
                
                const isOnLeave = approvedLeaveRecords.some(r => {
                    const leaveStart = new Date(r.startDate);
                    const leaveEnd = new Date(r.endDate);
                    return r.userId === employee.id && day >= leaveStart && day <= leaveEnd;
                });
                
                if (isOnLeave) {
                    dailyStatus[dayOfMonth] = 'L';
                } else if (attendanceRecord) {
                    if (attendanceRecord.status === 'Half-day') {
                        dailyStatus[dayOfMonth] = 'H';
                    } else {
                        dailyStatus[dayOfMonth] = 'P';
                    }
                } else {
                    dailyStatus[dayOfMonth] = 'A';
                }
            });

            return {
                employeeId: employee.id!,
                employeeName: employee.name,
                dailyStatus,
            };
        });
        
        setMusterData(musterResults);
        setLoading(false);
    };
    
     const handleExportCSV = () => {
        if (musterData.length === 0) return toast({ title: "No Data", variant: "destructive" });
        setExporting(true);
        const headers = ["Employee", ...daysInMonth.map(d => format(d, 'dd'))];
        let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\r\n";
        musterData.forEach(p => {
            const row = [`"${p.employeeName}"`];
            daysInMonth.forEach(d => {
                row.push(p.dailyStatus[d.getDate()] || 'A');
            });
            csvContent += row.join(",") + "\r\n";
        });
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `muster_roll_${format(selectedDate, 'yyyy-MM')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setExporting(false);
    };

    const handleExportPDF = () => {
        if (musterData.length === 0) return toast({ title: "No Data", variant: "destructive" });
        setExporting(true);
        const doc = new jsPDF({ orientation: 'landscape' });
        doc.text(`Muster Roll for ${format(selectedDate, 'MMMM yyyy')}`, 14, 15);
        doc.autoTable({
            startY: 20,
            head: [['Employee', ...daysInMonth.map(d => format(d, 'dd'))]],
            body: musterData.map(p => [
                p.employeeName,
                ...daysInMonth.map(d => p.dailyStatus[d.getDate()] || 'A')
            ]),
            styles: {
                cellPadding: 1,
                fontSize: 8,
            },
            headStyles: {
                fillColor: [22, 163, 74],
            },
        });
        doc.save(`muster_roll_${format(selectedDate, 'yyyy-MM')}.pdf`);
        setExporting(false);
    };

    const getStatusClass = (status: 'P' | 'A' | 'H' | 'L') => {
        switch (status) {
            case 'P': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'A': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            case 'H': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case 'L': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            default: return '';
        }
    };

    return (
        <div className="space-y-6">
            <Card className="border-2 border-foreground transition-all duration-300 ease-out hover:shadow-lg hover:border-primary">
                <CardHeader>
                    <CardTitle>Generate Muster Roll</CardTitle>
                    <CardDescription>Select a month to generate a classic attendance muster grid for all active employees.</CardDescription>
                </CardHeader>
                 <CardContent className="flex flex-col gap-4">
                     <div className="space-y-2 w-full">
                        <Label>Select Year</Label>
                        <Select
                            value={String(selectedDate.getFullYear())}
                            onValueChange={(year) => setSelectedDate(setYear(selectedDate, parseInt(year)))}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {[...Array(5)].map((_, i) => (
                                    <SelectItem key={i} value={String(new Date().getFullYear() - i)}>
                                        {new Date().getFullYear() - i}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2 w-full">
                        <Label>Select Month</Label>
                        <Select
                            value={String(selectedDate.getMonth())}
                            onValueChange={(month) => setSelectedDate(setMonth(selectedDate, parseInt(month)))}
                        >
                             <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Month" />
                            </SelectTrigger>
                            <SelectContent>
                                {[...Array(12)].map((_, i) => (
                                    <SelectItem key={i} value={String(i)}>{format(setMonth(new Date(), i), 'MMMM')}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleGenerateMuster} disabled={loading} className="w-full">
                        {loading ? <Loader2 className="mr-2 animate-spin"/> : <Users className="mr-2"/>}
                        Generate Muster
                    </Button>
                </CardContent>
            </Card>
            <Card className="border-2 border-foreground transition-all duration-300 ease-out hover:shadow-lg hover:border-primary">
                 <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle>Muster Roll for {format(selectedDate, 'MMMM yyyy')}</CardTitle>
                            <CardDescription>P = Present, A = Absent, H = Half-day, L = On Leave</CardDescription>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                           <Button className="w-full bg-green-600 hover:bg-green-700" onClick={handleExportCSV} disabled={exporting || musterData.length === 0}>{exporting ? <Loader2 className="animate-spin" /> : <Download />}Export CSV</Button>
                           <Button className="w-full bg-red-600 hover:bg-red-700" onClick={handleExportPDF} disabled={exporting || musterData.length === 0}>{exporting ? <Loader2 className="animate-spin" /> : <Download />}Export PDF</Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                     {loading ? <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                        : musterData.length === 0 ? <div className="h-24 text-center flex flex-col items-center justify-center text-muted-foreground"><FileText className="h-8 w-8 mb-2" /><p>Generate a muster roll to see results.</p></div>
                            : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {musterData.map(p => (
                                        <Card key={p.employeeId} className="overflow-hidden">
                                            <CardHeader className="p-4 bg-muted/50">
                                                <CardTitle className="text-base">{p.employeeName}</CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-4">
                                                <div className="grid grid-cols-7 gap-1">
                                                    {daysInMonth.map(day => {
                                                        const status = p.dailyStatus[day.getDate()] || 'A';
                                                        return (
                                                            <div key={day.toISOString()} className="flex flex-col items-center gap-1 p-1 rounded-md">
                                                                <span className="text-xs text-muted-foreground">{format(day, 'E')}</span>
                                                                <span className={cn("w-7 h-7 flex items-center justify-center rounded-full font-bold text-xs", getStatusClass(status))}>
                                                                    {status}
                                                                </span>
                                                                <span className="text-xs font-semibold">{format(day, 'd')}</span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                </CardContent>
            </Card>
        </div>
    );
};


export default function ReportsPage() {
    const router = useRouter();
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [allBranches, setAllBranches] = useState<ShopData[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<ShopData | null>(null);
    const [openBranchSelector, setOpenBranchSelector] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // State for filters, lifted up
    const [employees, setEmployees] = useState<User[]>([]);
    const [date, setDate] = useState<DateRange | undefined>(undefined);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');

    useEffect(() => {
        setDate({ from: subDays(new Date(), 7), to: new Date() });
    }, []);
    
    const isAllBranches = useMemo(() => selectedBranch?.id === 'all', [selectedBranch]);
    const allBranchIds = useMemo(() => allBranches.filter(b => b.id !== 'all').map(b => b.id), [allBranches]);


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setAuthUser(user);
                 try {
                    const q = query(collection(db, "shops"), where("ownerId", "==", user.uid));
                    const querySnapshot = await getDocs(q);
                    const fetchedBranches = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShopData));

                    const allBranchesOption: ShopData = { id: 'all', shopName: 'All Branches', ownerId: user.uid };
                    const fullBranchList = [allBranchesOption, ...fetchedBranches];
                    setAllBranches(fullBranchList);

                    if (!selectedBranch) {
                        setSelectedBranch(allBranchesOption);
                    }

                } catch (error) {
                    console.error("Error fetching branches:", error);
                } finally {
                    setLoading(false);
                }
            } else {
                setAuthUser(null);
                setAllBranches([]);
                setSelectedBranch(null);
                router.push('/admin/login');
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [router, selectedBranch]);
    
    useEffect(() => {
        if (!authUser || !selectedBranch) return;
        
        const fetchEmployees = async () => {
            const targetShopIds = isAllBranches ? allBranchIds : [selectedBranch.id];
            if (targetShopIds.length === 0 && !isAllBranches) {
                 setEmployees([]);
                 return;
            }
             if (isAllBranches && allBranchIds.length === 0) {
                targetShopIds.push(authUser.uid);
            }

            const q = query(collectionGroup(db, 'employees'), where('shopId', 'in', targetShopIds));

            const querySnapshot = await getDocs(q);
            const employeeList = querySnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as User))
                .filter(emp => emp.role !== 'Admin');
            
            const uniqueEmployees = Array.from(new Map(employeeList.map(emp => [emp.id, emp])).values());

            setEmployees(uniqueEmployees);
        };
        fetchEmployees();
    }, [authUser, selectedBranch, isAllBranches, allBranchIds]);
    
    const filteredBranches = useMemo(() => {
        return allBranches.filter(branch => branch.shopName?.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [allBranches, searchTerm]);


    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!authUser || !selectedBranch) {
        return (
             <div className="flex items-center justify-center h-full">
                <p>Could not load user or branch data.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="hidden md:block">
                <h1 className="text-3xl font-bold tracking-tight">Reports &amp; Payroll</h1>
                <p className="text-muted-foreground">Filter records and generate monthly salary reports.</p>
            </div>
            
             <div className="flex flex-col md:flex-row items-center gap-4 p-4 rounded-lg border-2 border-foreground transition-all duration-300 ease-out hover:shadow-lg hover:border-primary">
                <Popover open={openBranchSelector} onOpenChange={setOpenBranchSelector}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openBranchSelector}
                            className="w-full md:w-auto md:min-w-[250px] justify-between"
                        >
                            <Building className="mr-2 h-4 w-4" />
                            {selectedBranch ? selectedBranch.shopName : "Select a branch..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                            <CommandInput 
                                placeholder="Search branch..."
                                value={searchTerm}
                                onValueChange={setSearchTerm}
                            />
                            <CommandEmpty>No branches found.</CommandEmpty>
                            <CommandGroup>
                                <CommandList>
                                {filteredBranches.map((branch) => (
                                    <CommandItem
                                        key={branch.id}
                                        value={branch.shopName!}
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
                
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="outline" className="w-full md:w-auto">
                            <Filter className="mr-2 h-4 w-4" />
                            Filter Report
                        </Button>
                    </SheetTrigger>
                    <SheetContent>
                        <SheetHeader>
                            <SheetTitle>Report Filters</SheetTitle>
                        </SheetHeader>
                        <div className="py-8 space-y-6">
                            <div className="space-y-2">
                                <Label>Date Range</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date?.from ? (date.to ? `${format(date.from, "LLL dd, y")} - ${format(date.to, "LLL dd, y")}` : format(date.from, "LLL dd, y")) : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={1}/>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="employee">Employee</Label>
                                <Select onValueChange={setSelectedEmployeeId} value={selectedEmployeeId}>
                                    <SelectTrigger id="employee"><SelectValue placeholder="All Employees" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Employees</SelectItem>
                                        {employees.map(emp => <SelectItem key={emp.id} value={emp.id!}>{emp.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select onValueChange={setSelectedStatus} value={selectedStatus}>
                                    <SelectTrigger id="status"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="On-time">On-time</SelectItem>
                                        <SelectItem value="Late">Late</SelectItem>
                                        <SelectItem value="Absent">Absent</SelectItem>
                                        <SelectItem value="Manual">Manual</SelectItem>
                                        <SelectItem value="Half-day">Half-day</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>


            <Tabs defaultValue="attendance" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-primary text-primary-foreground">
                    <TabsTrigger value="attendance" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                        <span>Attendance<br className="md:hidden" /> Report</span>
                    </TabsTrigger>
                    <TabsTrigger value="muster" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
                        <span>Muster<br className="md:hidden" /> Roll</span>
                    </TabsTrigger>
                    <TabsTrigger value="payroll" className="data-[state=active]:bg-background data-[state=active]:text-foreground" disabled={selectedBranch.id === 'all'}>
                        <span>Payroll<br className="md:hidden" /> Report</span>
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="attendance" className="mt-6">
                    <AttendanceReportTab allBranches={allBranches} selectedBranch={selectedBranch} authUser={authUser} date={date} selectedEmployeeId={selectedEmployeeId} selectedStatus={selectedStatus} employees={employees} />
                </TabsContent>
                <TabsContent value="muster" className="mt-6">
                    {selectedBranch.id === 'all' ? (
                        <div className="text-center py-12 text-muted-foreground border rounded-lg">
                            <p>Please select an individual branch to view its Muster Roll.</p>
                        </div>
                    ) : (
                        <MusterRollTab authUser={authUser} />
                    )}
                </TabsContent>
                <TabsContent value="payroll" className="mt-6">
                    {selectedBranch.id === 'all' ? (
                         <div className="text-center py-12 text-muted-foreground border rounded-lg">
                            <p>Please select an individual branch to generate a Payroll Report.</p>
                        </div>
                    ) : (
                        <PayrollReportTab shopData={selectedBranch} authUser={authUser} />
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
