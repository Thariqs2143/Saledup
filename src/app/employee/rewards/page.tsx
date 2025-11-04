
'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Trophy, Award, Star, ShieldCheck, Flame, CalendarCheck, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { onAuthStateChanged, type User as AuthUser } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, collection, query, orderBy, getDocs, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import type { User as AppUser } from "@/app/admin/employees/page";

const badges = [
    { id: "streak", icon: <Flame className="h-8 w-8" />, name: "Hot Streak", description: "10-day on-time streak", unlocked: (user: AppUser) => user.streak >= 10 },
    { id: "points", icon: <Trophy className="h-8 w-8" />, name: "Punctuality Pro", description: "1000 total points", unlocked: (user: AppUser) => user.points >= 1000 },
    { id: "month", icon: <Award className="h-8 w-8" />, name: "Perfect Month", description: "No late check-ins for a month", unlocked: (user: AppUser) => false }, // Needs more complex logic
    { id: "early", icon: <Star className="h-8 w-8" />, name: "Early Bird", description: "Check in before 8:30 AM", unlocked: (user: AppUser) => false }, // Needs more complex logic
    { id: "rank", icon: <ShieldCheck className="h-8 w-8" />, name: "Top Performer", description: "Reach #1 on the leaderboard", unlocked: (user: AppUser, rank: number) => rank === 1 },
];


export default function RewardsPage() {
    const router = useRouter();
    const [userProfile, setUserProfile] = useState<AppUser | null>(null);
    const [rank, setRank] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserData = async (user: AuthUser) => {
             if (!user.phoneNumber) {
                setLoading(false);
                router.push('/employee/login');
                return;
            }
            try {
                const phoneLookupRef = doc(db, "employee_phone_to_shop_lookup", user.phoneNumber);
                const phoneLookupSnap = await getDoc(phoneLookupRef);

                if (phoneLookupSnap.exists()) {
                    const { shopId, employeeDocId } = phoneLookupSnap.data();
                    const employeeDocRef = doc(db, "shops", shopId, "employees", employeeDocId);
                    const employeeDocSnap = await getDoc(employeeDocRef);

                    if (employeeDocSnap.exists()) {
                        const profile = { id: employeeDocSnap.id, ...employeeDocSnap.data() } as AppUser;
                        setUserProfile(profile);
                        await fetchRank(employeeDocSnap.id, shopId);
                    } else {
                        router.push('/employee/login');
                    }
                } else {
                    router.push('/employee/login');
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            } finally {
                setLoading(false);
            }
        };

        const fetchRank = async (employeeId: string, shopId: string) => {
            const usersCollectionRef = collection(db, 'shops', shopId, 'employees');
            const q = query(usersCollectionRef, orderBy('points', 'desc'));
            const querySnapshot = await getDocs(q);
            const userRank = querySnapshot.docs.findIndex(doc => doc.id === employeeId) + 1;
            setRank(userRank);
        };
        
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                await fetchUserData(user);
            } else {
                setLoading(false);
                router.push('/employee/login');
            }
        });

        return () => unsubscribe();
    }, [router]);


  if (loading || !userProfile) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Loading your rewards...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Rewards</h1>
        <p className="text-muted-foreground">Your achievements and progress.</p>
      </div>
      <Separator />

      <Card className="w-full bg-gradient-to-tr from-primary to-blue-700 text-primary-foreground border-none transition-all duration-300 ease-out hover:shadow-lg">
        <CardHeader>
            <CardTitle className="text-2xl text-white">Your Progress</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-center">
            <div className="flex flex-col items-center p-4 bg-white/10 rounded-lg">
                <Trophy className="h-8 w-8 sm:h-10 sm:w-10 text-yellow-300 mb-2"/>
                <p className="text-2xl sm:text-3xl font-bold text-white">{userProfile.points.toLocaleString()}</p>
                <p className="text-xs sm:text-sm text-blue-200">Total Points</p>
            </div>
            <div className="flex flex-col items-center p-4 bg-white/10 rounded-lg">
                <Award className="h-8 w-8 sm:h-10 sm:w-10 text-yellow-300 mb-2"/>
                <p className="text-2xl sm:text-3xl font-bold text-white">{rank > 0 ? `#${rank}` : 'N/A'}</p>
                <p className="text-xs sm:text-sm text-blue-200">Current Rank</p>
            </div>
             <div className="flex flex-col items-center p-4 bg-white/10 rounded-lg">
                <Flame className="h-8 w-8 sm:h-10 sm:w-10 text-yellow-300 mb-2"/>
                <p className="text-2xl sm:text-3xl font-bold text-white">{userProfile.streak}</p>
                <p className="text-xs sm:text-sm text-blue-200">Day Streak</p>
            </div>
            <div className="flex flex-col items-center p-4 bg-white/10 rounded-lg">
                <CalendarCheck className="h-8 w-8 sm:h-10 sm:w-10 text-yellow-300 mb-2"/>
                <p className="text-2xl sm:text-3xl font-bold text-white">0</p>
                <p className="text-xs sm:text-sm text-blue-200">Perfect Days</p>
            </div>
        </CardContent>
      </Card>
      
      <Card className="transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground/30 hover:border-primary">
        <CardHeader>
            <CardTitle>Achievement Badges</CardTitle>
            <CardDescription>Collect badges for your accomplishments.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {badges.map(badge => {
                const isUnlocked = badge.unlocked(userProfile, rank);
                return (
                    <div key={badge.id} className={`flex flex-col items-center justify-start text-center p-4 border rounded-lg transition-all ${isUnlocked ? 'border-primary bg-primary/5' : 'border-dashed opacity-50'}`}>
                       <div className={`mb-3 text-primary ${!isUnlocked && 'grayscale'}`}>
                            {badge.icon}
                       </div>
                       <p className={`font-semibold text-sm ${isUnlocked ? 'text-primary' : 'text-muted-foreground'}`}>{badge.name}</p>
                       <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
                       {!isUnlocked && <Badge variant="outline" className="mt-3">Locked</Badge>}
                    </div>
                );
            })}
        </CardContent>
      </Card>

    </div>
  );
}

    