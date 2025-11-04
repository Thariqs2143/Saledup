
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Edit, Trash2, Shield, Gem } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type AuditLog = {
    id: string;
    adminEmail: string;
    action: 'Shop Status Changed' | 'Shop Deleted' | 'Shop Profile Edited' | 'Subscription Plan Updated';
    target: string; // e.g., Shop Name or Plan Name
    timestamp: Date;
};

// Placeholder data - in a real app, this would be fetched from Firestore
const placeholderLogs: AuditLog[] = [
    { id: '1', adminEmail: 'super@admin.com', action: 'Shop Status Changed', target: 'JD Retail Store', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    { id: '2', adminEmail: 'super@admin.com', action: 'Subscription Plan Updated', target: 'Pro Plan', timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
    { id: '3', adminEmail: 'super@admin.com', action: 'Shop Profile Edited', target: 'The Corner Cafe', timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
    { id: '4', adminEmail: 'super@admin.com', action: 'Shop Deleted', target: 'Old Tech Hub', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
];


export default function SuperAdminAuditLogPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAction, setFilterAction] = useState('all');

    useEffect(() => {
        // Simulate fetching data
        setTimeout(() => {
            setLogs(placeholderLogs);
            setLoading(false);
        }, 1000);
    }, []);
    
    const filteredLogs = logs.filter(log =>
        (log.adminEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.target.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (filterAction === 'all' || log.action === filterAction)
    );

    const getActionIcon = (action: AuditLog['action']) => {
        switch(action) {
            case 'Shop Status Changed': return <Shield className="h-4 w-4 text-amber-500" />;
            case 'Shop Profile Edited': return <Edit className="h-4 w-4 text-blue-500" />;
            case 'Shop Deleted': return <Trash2 className="h-4 w-4 text-destructive" />;
            case 'Subscription Plan Updated': return <Gem className="h-4 w-4 text-purple-500" />;
            default: return null;
        }
    };
    
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Security Audit Log</h1>
                <p className="text-muted-foreground">Track important administrative actions across the platform.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Recent Activities ({filteredLogs.length})</CardTitle>
                    <CardDescription>A log of all major changes made by super administrators.</CardDescription>
                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <div className="relative sm:max-w-xs w-full">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search by target or admin..."
                                className="w-full rounded-lg bg-background pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select onValueChange={setFilterAction} value={filterAction}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Filter by action" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Actions</SelectItem>
                                <SelectItem value="Shop Status Changed">Shop Status Changed</SelectItem>
                                <SelectItem value="Shop Profile Edited">Shop Profile Edited</SelectItem>
                                <SelectItem value="Shop Deleted">Shop Deleted</SelectItem>
                                <SelectItem value="Subscription Plan Updated">Subscription Plan Updated</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex items-center justify-center h-48">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>No audit logs found matching your criteria.</p>
                        </div>
                    ) : (
                         <div className="rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[250px]">Action</TableHead>
                                        <TableHead>Target</TableHead>
                                        <TableHead>Admin</TableHead>
                                        <TableHead className="text-right">Timestamp</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLogs.map(log => (
                                        <TableRow key={log.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    {getActionIcon(log.action)}
                                                    <span>{log.action}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell><Badge variant="secondary">{log.target}</Badge></TableCell>
                                            <TableCell>{log.adminEmail}</TableCell>
                                            <TableCell className="text-right text-muted-foreground text-xs">
                                                {formatDistanceToNow(log.timestamp, { addSuffix: true })}
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
