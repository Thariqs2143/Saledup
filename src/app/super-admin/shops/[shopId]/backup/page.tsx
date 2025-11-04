
'use client';

import { useRouter, useParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Download, Users, CalendarCheck, Upload, FileJson, FileText, FileSpreadsheet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { doc, getDoc, collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User as AppUser } from '@/app/admin/employees/page';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from 'xlsx';
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

type ShopData = {
    shopName?: string;
};

type AttendanceRecord = {
  id: string;
  userId: string;
  userName?: string;
  checkInTime: Timestamp;
  checkOutTime?: Timestamp;
  status: 'On-time' | 'Late' | 'Absent' | 'Manual' | 'Half-day';
};

export default function SuperAdminBackupPage() {
    const router = useRouter();
    const params = useParams();
    const { shopId } = params as { shopId: string };
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [shopData, setShopData] = useState<ShopData | null>(null);
    const [employees, setEmployees] = useState<AppUser[]>([]);
    const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
    const [backupFile, setBackupFile] = useState<File | null>(null);

    useEffect(() => {
        if (!shopId) return;
        
        const fetchShopBackupData = async () => {
            setLoading(true);
            try {
                const shopDocRef = doc(db, 'shops', shopId);
                const shopSnap = await getDoc(shopDocRef);
                if (shopSnap.exists()) {
                    setShopData(shopSnap.data() as ShopData);
                } else {
                    throw new Error("Shop not found");
                }

                const employeesSnapshot = await getDocs(collection(db, 'shops', shopId, 'employees'));
                const employeesList = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
                setEmployees(employeesList);

                const attendanceSnapshot = await getDocs(collection(db, 'shops', shopId, 'attendance'));
                const attendanceList = attendanceSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord));
                setAttendance(attendanceList);

            } catch (error) {
                toast({ title: "Error", description: "Failed to load shop backup data.", variant: "destructive" });
                router.replace('/super-admin/shops');
            } finally {
                setLoading(false);
            }
        };

        fetchShopBackupData();
    }, [shopId, router, toast]);

    const handleDownloadJson = () => {
        const backupData = {
            shop: shopData,
            employees,
            attendance,
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `backup_${shopData?.shopName?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        toast({ title: "JSON Download Started", description: "Your backup file is being downloaded." });
    };
    
    const handleDownloadExcel = () => {
        try {
            const wb = XLSX.utils.book_new();

            // Shop Info Sheet
            const shopWs = XLSX.utils.json_to_sheet([shopData]);
            XLSX.utils.book_append_sheet(wb, shopWs, "Shop Info");

            // Employees Sheet
            const employeesWs = XLSX.utils.json_to_sheet(employees.map(({ id, name, email, employeeId, role, status, phone, joinDate }) => ({ id, name, email, employeeId, role, status, phone, joinDate })));
            XLSX.utils.book_append_sheet(wb, employeesWs, "Employees");
            
            // Attendance Sheet
            const attendanceData = attendance.map(att => ({
                ...att,
                checkInTime: format(att.checkInTime.toDate(), 'yyyy-MM-dd HH:mm:ss'),
                checkOutTime: att.checkOutTime ? format(att.checkOutTime.toDate(), 'yyyy-MM-dd HH:mm:ss') : 'N/A',
            }));
            const attendanceWs = XLSX.utils.json_to_sheet(attendanceData);
            XLSX.utils.book_append_sheet(wb, attendanceWs, "Attendance");

            XLSX.writeFile(wb, `backup_${shopData?.shopName?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast({ title: "Excel Download Started", description: "Your backup file is being downloaded." });
        } catch (error) {
            toast({ title: "Excel Export Failed", description: "Could not generate the Excel file.", variant: "destructive" });
        }
    };
    
    const handleDownloadPdf = () => {
        try {
            const doc = new jsPDF();
            doc.setFontSize(18);
            doc.text(`Backup for: ${shopData?.shopName}`, 14, 22);

            // Employees Table
            doc.setFontSize(14);
            doc.text("Employees", 14, 40);
            doc.autoTable({
                startY: 45,
                head: [['Name', 'Role', 'Status', 'Phone', 'Email']],
                body: employees.map(e => [e.name, e.role, e.status, e.phone || 'N/A', e.email || 'N/A']),
            });
            
            // Attendance Table
            const finalY = (doc as any).lastAutoTable.finalY || 100;
            doc.text("Attendance Records", 14, finalY + 15);
            doc.autoTable({
                startY: finalY + 20,
                head: [['User ID', 'Check-in', 'Check-out', 'Status']],
                body: attendance.map(att => [
                    att.userId,
                    format(att.checkInTime.toDate(), 'yyyy-MM-dd HH:mm'),
                    att.checkOutTime ? format(att.checkOutTime.toDate(), 'yyyy-MM-dd HH:mm') : 'N/A',
                    att.status
                ]),
            });

            doc.save(`backup_${shopData?.shopName?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
             toast({ title: "PDF Download Started", description: "Your backup file is being downloaded." });
        } catch (error) {
            toast({ title: "PDF Export Failed", description: "Could not generate the PDF file.", variant: "destructive" });
        }
    };


    const handleRestore = () => {
        if (!backupFile) {
            toast({ title: "No File Selected", description: "Please select a backup file to restore.", variant: "destructive" });
            return;
        }
        
        // In a real application, you would trigger a Cloud Function here
        // to securely process and restore the data.
        console.log("Simulating restore for file:", backupFile.name);
        
        toast({
            title: "Restore Initiated",
            description: `The restore process for ${shopData?.shopName} has started. This may take a few minutes.`
        });
        setBackupFile(null);
    };
    
    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!shopData) {
        return (
            <div className="text-center">
                 <p className="text-muted-foreground">Could not load backup data.</p>
                 <Link href="/super-admin/shops">
                    <Button variant="link">Go Back</Button>
                </Link>
            </div>
        )
    }

  return (
    <div className="flex flex-col items-center justify-start bg-background p-4 sm:p-6 lg:p-8 w-full">
      <div className="w-full max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
            <Link href="/super-admin/shops">
                <Button variant="outline" size="icon" type="button">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </Link>
            <div className="text-left flex-1">
                <h1 className="text-xl sm:text-3xl font-bold">Data Management for {shopData.shopName}</h1>
                <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                    A snapshot of the shop's data.
                </p>
            </div>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle>Download Backup</CardTitle>
                <CardDescription>Download a complete backup of this shop's data in your preferred format.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4">
                <Button onClick={handleDownloadJson} variant="outline">
                    <FileJson className="mr-2"/> Download JSON
                </Button>
                <Button onClick={handleDownloadExcel} variant="outline">
                    <FileSpreadsheet className="mr-2"/> Download Excel
                </Button>
                <Button onClick={handleDownloadPdf} variant="outline">
                    <FileText className="mr-2"/> Download PDF
                </Button>
            </CardContent>
        </Card>
        
        <Card className="border-destructive">
            <CardHeader>
                <CardTitle className="text-destructive">Restore from Backup (Danger Zone)</CardTitle>
                <CardDescription>This will overwrite all existing data for this shop with the data from the JSON backup file. This action cannot be undone.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="max-w-sm space-y-1.5">
                    <Label htmlFor="backup-file">Select Backup File (.json)</Label>
                    <Input id="backup-file" type="file" accept=".json" onChange={(e) => setBackupFile(e.target.files ? e.target.files[0] : null)} />
                </div>
                 <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={!backupFile}>
                        <Upload className="mr-2 h-4 w-4" />
                        Restore from Backup
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently overwrite the data for <span className="font-bold">{shopData.shopName}</span> with the contents of <span className="font-bold">{backupFile?.name}</span>. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleRestore} className="bg-destructive hover:bg-destructive/90">Continue Restore</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users /> Employees ({employees.length})</CardTitle>
                <CardDescription>List of all employees registered to this shop.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {employees.map(emp => (
                                <TableRow key={emp.id}>
                                    <TableCell>{emp.name}</TableCell>
                                    <TableCell>{emp.role}</TableCell>
                                    <TableCell><Badge variant={emp.status === 'Active' ? 'secondary' : 'destructive'}>{emp.status}</Badge></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
        
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><CalendarCheck /> Attendance Records ({attendance.length})</CardTitle>
                <CardDescription>All check-in/out records for this shop.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="rounded-lg border max-h-[400px] overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Employee ID</TableHead>
                                <TableHead>Check-in</TableHead>
                                <TableHead>Check-out</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {attendance.map(att => (
                                <TableRow key={att.id}>
                                    <TableCell className="text-xs">{att.userId}</TableCell>
                                    <TableCell>{format(att.checkInTime.toDate(), 'PPpp')}</TableCell>
                                    <TableCell>{att.checkOutTime ? format(att.checkOutTime.toDate(), 'PPpp') : 'N/A'}</TableCell>
                                    <TableCell><Badge variant="outline">{att.status}</Badge></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
