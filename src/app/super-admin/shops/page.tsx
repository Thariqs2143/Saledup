
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Store, Users, Mail, HardDrive, Eye } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

type Shop = {
    id: string;
    shopName: string;
    ownerName: string;
    email?: string;
    employeeCount: number;
    status: 'active' | 'disabled';
};

export default function SuperAdminShopsPage() {
    const [shops, setShops] = useState<Shop[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const router = useRouter();

    useEffect(() => {
        const fetchShops = async () => {
            setLoading(true);
            try {
                const shopsSnapshot = await getDocs(collection(db, 'shops'));
                const shopsData = await Promise.all(shopsSnapshot.docs.map(async (shopDoc) => {
                    const employeesSnapshot = await getDocs(collection(db, 'shops', shopDoc.id, 'employees'));
                    return {
                        id: shopDoc.id,
                        ...shopDoc.data(),
                        employeeCount: employeesSnapshot.size,
                    } as Shop;
                }));
                setShops(shopsData);
            } catch (error) {
                console.error("Error fetching shops:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchShops();
    }, []);
    
    const filteredShops = shops.filter(shop =>
        shop.shopName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shop.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shop.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Shop Management</h1>
                <p className="text-muted-foreground">View and manage all registered shops on the platform.</p>
            </div>
            
            <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search by shop, owner, or email..."
                    className="w-full rounded-lg bg-background pl-10 h-12"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : filteredShops.length === 0 ? (
                 <div className="text-center py-20 text-muted-foreground rounded-lg border-2 border-dashed bg-muted/50">
                    <Store className="h-16 w-16 mx-auto mb-4 opacity-50"/>
                    <h3 className="text-xl font-semibold">No Shops Found</h3>
                    <p>No shops match your current search criteria.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredShops.map(shop => (
                        <div key={shop.id} className="bg-card text-card-foreground rounded-xl shadow-sm border border-border/50 hover:border-primary hover:shadow-lg transition-all duration-300 flex flex-col">
                            <div className="p-4 space-y-3 flex-1">
                                <div className="flex justify-between items-start">
                                    <p className="font-bold text-lg">{shop.shopName}</p>
                                    <Badge variant={shop.status === 'active' ? 'secondary' : 'destructive'}>{shop.status}</Badge>
                                </div>
                                <div className="text-sm text-muted-foreground space-y-2">
                                     <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 shrink-0"/>
                                        <span>{shop.ownerName}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 shrink-0"/>
                                        <span className="truncate">{shop.email || 'No email'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 shrink-0"/>
                                        <span>{shop.employeeCount} Employees</span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 border-t flex gap-2">
                                <Button variant="outline" size="sm" className="w-full" onClick={() => router.push(`/super-admin/shops/${shop.id}`)}>
                                    <Eye className="mr-2 h-4 w-4"/> View
                                </Button>
                                <Button variant="secondary" size="sm" className="w-full" onClick={() => router.push(`/super-admin/shops/${shop.id}/backup`)}>
                                    <HardDrive className="mr-2 h-4 w-4"/> Backup
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
