
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Search, User, Store, Download } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Badge } from '@/components/ui/badge';
import type { User as AppUser } from '@/app/admin/employees/page';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import jsPDF from "jspdf";
import "jspdf-autotable";

// Extend jsPDF with autoTable
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => jsPDF;
    }
}


type GlobalEmployee = AppUser & {
    shopName?: string;
};

export default function SuperAdminEmployeesPage() {
    const [employees, setEmployees] = useState<GlobalEmployee[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { toast } = useToast();

    useEffect(() => {
        const fetchAllEmployees = async () => {
            setLoading(true);
            const allEmployees: GlobalEmployee[] = [];
            try {
                const shopsSnapshot = await getDocs(collection(db, 'shops'));
                for (const shopDoc of shopsSnapshot.docs) {
                    const shopData = shopDoc.data();
                    const employeesSnapshot = await getDocs(collection(db, 'shops', shopDoc.id, 'employees'));
                    employeesSnapshot.forEach(empDoc => {
                        allEmployees.push({
                            id: empDoc.id,
                            ...(empDoc.data() as AppUser),
                            shopName: shopData.shopName,
                        });
                    });
                }
                setEmployees(allEmployees);
            } catch (error) {
                console.error("Error fetching all employees:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllEmployees();
    }, []);

    const filteredEmployees = employees.filter(emp =>
        emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.shopName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.role?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const getStatusVariant = (status: AppUser['status']) => {
        switch (status) {
            case 'Active': return 'secondary';
            case 'Inactive': return 'outline';
            case 'Pending Onboarding': return 'destructive';
            default: return 'default';
        }
    };
    
    const handleExportCSV = () => {
        if (filteredEmployees.length === 0) {
            toast({ title: "No Data", description: "There is no data to export.", variant: "destructive"});
            return;
        }

        const headers = ["Employee Name", "Shop Name", "Role", "Status", "Phone", "Email"];
        let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\r\n";

        filteredEmployees.forEach(emp => {
            const row = [
                `"${emp.name || ''}"`,
                `"${emp.shopName || ''}"`,
                `"${emp.role || ''}"`,
                `"${emp.status || ''}"`,
                `"${emp.phone || ''}"`,
                `"${emp.email || ''}"`
            ].join(",");
            csvContent += row + "\r\n";
        });

        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `all_employees_backup.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Export Successful", description: "Employee data has been downloaded as a CSV file." });
    };

    const handleExportPDF = () => {
        if (filteredEmployees.length === 0) {
            toast({ title: "No Data", description: "There is no data to export.", variant: "destructive"});
            return;
        }

        const doc = new jsPDF();
        doc.text("All Employees Report", 14, 15);
        doc.autoTable({
            startY: 20,
            head: [['Employee Name', 'Shop Name', 'Role', 'Status', 'Phone']],
            body: filteredEmployees.map(emp => [
                emp.name || '',
                emp.shopName || '',
                emp.role || '',
                emp.status || '',
                emp.phone || ''
            ]),
        });
        doc.save(`all_employees_backup.pdf`);
        toast({ title: "Export Successful", description: "Employee data has been downloaded as a PDF file." });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Employee Management</h1>
                    <p className="text-muted-foreground">View all employees across all shops in the system.</p>
                </div>
                 <div className="flex gap-2 w-full sm:w-auto">
                    <Button onClick={handleExportCSV} variant="outline"><Download className="mr-2 h-4 w-4"/>CSV</Button>
                    <Button onClick={handleExportPDF} variant="outline"><Download className="mr-2 h-4 w-4"/>PDF</Button>
                </div>
            </div>

            <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search by name, shop, or role..."
                    className="w-full rounded-lg bg-background pl-10 h-12"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : filteredEmployees.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground rounded-lg border-2 border-dashed bg-muted/50">
                    <User className="h-16 w-16 mx-auto mb-4 opacity-50"/>
                    <h3 className="text-xl font-semibold">No Employees Found</h3>
                    <p>No employees match your current search criteria.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredEmployees.map(emp => (
                        <div key={emp.id} className="bg-card text-card-foreground rounded-xl p-4 flex flex-col gap-4 shadow-sm border border-border/50 hover:border-primary hover:shadow-lg transition-all duration-300">
                             <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-base">{emp.name}</p>
                                    <p className="text-xs text-muted-foreground">{emp.role}</p>
                                </div>
                                <Badge variant={getStatusVariant(emp.status)}>{emp.status}</Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground border-t pt-3">
                                <Store className="h-4 w-4 shrink-0"/>
                                <span className="truncate">{emp.shopName}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
