
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { LogOut, Mail, User } from "lucide-react";
import { useRouter } from "next/navigation";


export default function SuperAdminProfilePage() {
    const router = useRouter();
    const { toast } = useToast();

    const handleLogout = async () => {
        try {
          await signOut(auth);
          localStorage.removeItem('superAdminAuthenticated');
          toast({
            title: "Logged Out",
            description: "You have been successfully logged out.",
          });
          router.push('/super-admin/login');
        } catch (error) {
          console.error("Error signing out: ", error);
          toast({
            title: "Logout Failed",
            description: "Could not log you out. Please try again.",
            variant: "destructive",
          });
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Profile</h1>
                <p className="text-muted-foreground">Manage your account and session.</p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Super Admin Details</CardTitle>
                    <CardDescription>This is the master account for the platform.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <User className="h-5 w-5 text-muted-foreground"/>
                        <span className="font-medium">Super Admin</span>
                    </div>
                     <div className="flex items-center gap-4">
                        <Mail className="h-5 w-5 text-muted-foreground"/>
                        <span className="font-medium">{auth.currentUser?.email || 'super@admin.com'}</span>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="text-destructive">Account Actions</CardTitle>
                    <CardDescription>This action will end your current session.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                    <Button variant="destructive" className="w-full max-w-xs" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4"/>
                        Logout
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}

