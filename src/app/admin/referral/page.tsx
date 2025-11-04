
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User as AuthUser } from "firebase/auth";
import { doc, getDoc, collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { ArrowLeft, Copy, Gift, Share2, Users, CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Referral = {
    id: string;
    referredShopName: string;
    status: 'Joined' | 'Pending';
    date: string;
};

export default function ReferralPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const [referralCode, setReferralCode] = useState('');
    const [fullReferralCode, setFullReferralCode] = useState('');
    const [referralHistory, setReferralHistory] = useState<Referral[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setAuthUser(user);
                // The shop owner's UID is their referral code
                setReferralCode(user.uid.substring(0, 8).toUpperCase());
                setFullReferralCode(user.uid); 
            } else {
                router.push('/admin/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!authUser) return;

        setLoading(true);
        const referralsRef = collection(db, 'shops', authUser.uid, 'referrals');
        const q = query(referralsRef, orderBy('date', 'desc'));

        const unsubscribeHistory = onSnapshot(q, (snapshot) => {
            const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Referral));
            setReferralHistory(history);
            setLoading(false);
        });

        return () => unsubscribeHistory();
    }, [authUser]);
    
    const copyToClipboard = () => {
        navigator.clipboard.writeText(fullReferralCode);
        toast({
            title: "Copied to Clipboard!",
            description: "Your referral code has been copied.",
        });
    };
    
    const shareOnWhatsApp = () => {
        const message = `Hey! I'm using Attendry to manage my staff attendance. It's been great! Sign up using my referral code and get a special discount: ${fullReferralCode}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };
    
     const shareViaEmail = () => {
        const subject = "Check out Attendry for Attendance Management";
        const body = `Hey,\n\nI'm using Attendry to manage my staff attendance and it's been a huge help. I thought you might find it useful for your business too.\n\nSign up with my referral code to get a special discount: ${fullReferralCode}\n\nYou can check it out here: [Your App Link]\n\nBest,`;
        const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoUrl;
    };


    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Link href="/admin/settings?tab=subscription">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Refer & Earn</h1>
                    <p className="text-muted-foreground">Share Attendry with other businesses and get rewarded.</p>
                </div>
            </div>

            <Card className="w-full bg-gradient-to-tr from-primary to-blue-700 text-primary-foreground border-none">
                <CardHeader>
                    <CardTitle className="text-2xl text-white flex items-center gap-2"><Gift/> Your Reward</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold text-amber-300">Get 1 Month Free</p>
                    <p className="text-blue-200 mt-1">For every new shop that successfully signs up and subscribes using your referral code, you'll receive one month of your current plan for free!</p>
                </CardContent>
            </Card>

            <Card className="transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground hover:border-primary">
                <CardHeader>
                    <CardTitle>Your Unique Referral Code</CardTitle>
                    <CardDescription>Share this code with your friends and colleagues.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                   <div className="border-2 border-dashed border-primary/50 bg-primary/5 p-4 rounded-lg flex items-center justify-center">
                        <p className="text-2xl md:text-4xl font-bold tracking-widest text-primary text-center">{referralCode}</p>
                   </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button onClick={copyToClipboard} className="w-full">
                            <Copy className="mr-2 h-4 w-4"/> Copy Code
                        </Button>
                        <Button onClick={shareOnWhatsApp} variant="secondary" className="w-full">
                            <Share2 className="mr-2 h-4 w-4"/> Share on WhatsApp
                        </Button>
                         <Button onClick={shareViaEmail} variant="secondary" className="w-full">
                            <Share2 className="mr-2 h-4 w-4"/> Share via Email
                        </Button>
                    </div>
                </CardContent>
            </Card>
            
             <Card className="transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground hover:border-primary">
                <CardHeader>
                    <CardTitle>Referral History</CardTitle>
                    <CardDescription>Track the status of your referrals here.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center h-24">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : referralHistory.length === 0 ? (
                         <div className="text-center py-8 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-50"/>
                            <p>You haven't referred anyone yet.</p>
                            <p className="text-xs mt-1">Share your code above to get started!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {referralHistory.map((referral) => (
                                <div key={referral.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/40">
                                    <div>
                                        <p className="font-semibold">{referral.referredShopName}</p>
                                        <p className="text-xs text-muted-foreground">Referred on: {new Date(referral.date).toLocaleDateString()}</p>
                                    </div>
                                    <div className={`flex items-center text-sm font-medium ${referral.status === 'Joined' ? 'text-green-600' : 'text-amber-600'}`}>
                                        {referral.status === 'Joined' ? <CheckCircle className="mr-2 h-4 w-4" /> : <Users className="mr-2 h-4 w-4" />}
                                        {referral.status}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
