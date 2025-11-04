
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
            <Card>
                <CardHeader>
                    <CardTitle>All Shops ({filteredShops.length})</CardTitle>
                    <CardDescription>A list of all shops in the Attendry system.</CardDescription>
                     <div className="relative pt-4 sm:max-w-xs">
                        <Search className="absolute left-2.5 top-6 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search by shop, owner, or email..."
                            className="w-full rounded-lg bg-background pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center h-48">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : filteredShops.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>No shops found.</p>
                        </div>
                    ) : (
                        <>
                            {/* Mobile View */}
                            <div className="grid gap-4 md:hidden">
                                {filteredShops.map(shop => (
                                    <Card key={shop.id} className="p-4 space-y-3">
                                        <div className="flex justify-between items-start">
                                            <p className="font-bold">{shop.shopName}</p>
                                            <Badge>
                                                <Users className="mr-1 h-3 w-3" />
                                                {shop.employeeCount}
                                            </Badge>
                                        </div>
                                        <div className="space-y-2 text-sm text-muted-foreground">
                                            <p>Owner: {shop.ownerName}</p>
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-3 w-3 shrink-0" />
                                                <span className="break-all">{shop.email || 'No email'}</span>
                                            </div>
                                        </div>
                                         <div className="flex gap-2 w-full pt-2">
                                            <Button variant="outline" className="w-full" onClick={() => router.push(`/super-admin/shops/${shop.id}`)}>
                                                <Eye className="mr-2"/> View
                                            </Button>
                                            <Button variant="secondary" className="w-full" onClick={() => router.push(`/super-admin/shops/${shop.id}/backup`)}>
                                                <HardDrive className="mr-2"/> Backup
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>

                            {/* Desktop View */}
                            <div className="hidden md:block rounded-lg border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Shop Name</TableHead>
                                            <TableHead>Owner Name</TableHead>
                                            <TableHead>Contact Email</TableHead>
                                            <TableHead className="text-center">Employees</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredShops.map(shop => (
                                            <TableRow key={shop.id}>
                                                <TableCell className="font-medium">{shop.shopName}</TableCell>
                                                <TableCell>{shop.ownerName}</TableCell>
                                                <TableCell>{shop.email || 'N/A'}</TableCell>
                                                <TableCell className="text-center">{shop.employeeCount}</TableCell>
                                                <TableCell className="text-right space-x-2">
                                                     <Button variant="outline" size="sm" onClick={() => router.push(`/super-admin/shops/${shop.id}`)}>
                                                        <Eye className="mr-2 h-4 w-4"/>
                                                        View
                                                    </Button>
                                                    <Button variant="secondary" size="sm" onClick={() => router.push(`/super-admin/shops/${shop.id}/backup`)}>
                                                        <HardDrive className="mr-2 h-4 w-4"/>
                                                        Backup
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
}
