
'use client';

import { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Loader2, Search, Edit, Trash2, Shield, Gem } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
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
            case 'Shop Status Changed': return <Shield className="h-5 w-5 text-amber-500" />;
            case 'Shop Profile Edited': return <Edit className="h-5 w-5 text-blue-500" />;
            case 'Shop Deleted': return <Trash2 className="h-5 w-5 text-destructive" />;
            case 'Subscription Plan Updated': return <Gem className="h-5 w-5 text-purple-500" />;
            default: return null;
        }
    };
    
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Security Audit Log</h1>
                <p className="text-muted-foreground">Track important administrative actions across the platform.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search by target or admin..."
                        className="w-full rounded-lg bg-background pl-10 h-12"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Select onValueChange={setFilterAction} value={filterAction}>
                    <SelectTrigger className="w-full sm:w-[220px] h-12">
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

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : filteredLogs.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground rounded-lg border-2 border-dashed bg-muted/50">
                    <Search className="h-16 w-16 mx-auto mb-4 opacity-50"/>
                    <h3 className="text-xl font-semibold">No Logs Found</h3>
                    <p>No audit logs match your current search criteria.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredLogs.map(log => (
                        <div key={log.id} className="p-4 flex items-center gap-4 border-b last:border-b-0 bg-card/50 rounded-lg hover:bg-muted/50 transition-colors">
                            <div className="p-3 rounded-full bg-muted/80">
                                {getActionIcon(log.action)}
                            </div>
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
                                <div>
                                    <p className="font-semibold">{log.action}</p>
                                    <p className="text-sm text-muted-foreground font-mono">{log.target}</p>
                                </div>
                                <div className="text-sm text-muted-foreground">by {log.adminEmail}</div>
                                <div className="text-sm text-muted-foreground text-left sm:text-right">
                                    {formatDistanceToNow(log.timestamp, { addSuffix: true })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
