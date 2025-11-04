
'use client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Crown, Loader2, Medal, Trophy, ArrowLeft } from "lucide-react";
import type { User } from "../employees/page";
import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { onAuthStateChanged, type User as AuthUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';


export default function LeaderboardPage() {
    const [leaderboardData, setLeaderboardData] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [authUser, setAuthUser] = useState<AuthUser | null>(null);
    const router = useRouter();

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user) {
                setAuthUser(user);
            } else {
                router.push('/admin/login');
            }
        });
        return () => unsubscribeAuth();
    }, [router]);

    useEffect(() => {
        if (!authUser) return;
        const usersCollectionRef = collection(db, 'shops', authUser.uid, 'employees');
        const q = query(usersCollectionRef, where('status', '==', 'Active'), orderBy('points', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setLeaderboardData(usersList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching leaderboard: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [authUser]);

    const getRankIcon = (rank: number, large: boolean = false) => {
        const sizeClass = large ? "h-8 w-8" : "h-6 w-6";
        if (rank === 0) return <Crown className={`${sizeClass} text-yellow-500`} />;
        if (rank === 1) return <Medal className={`${sizeClass} text-gray-400`} />;
        if (rank === 2) return <Trophy className={`${sizeClass} text-orange-400`} />;
        return <span className={`font-bold text-center ${large ? 'text-xl w-8' : 'text-lg w-6'}`}>{rank + 1}</span>;
    }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/settings?tab=gamification">
            <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
            </Button>
        </Link>
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Leaderboard</h1>
            <p className="text-muted-foreground">Top employees by attendance points.</p>
        </div>
      </div>
      <Card className="transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground/30 hover:border-primary">
        <CardHeader>
          <CardTitle>Punctuality Champions</CardTitle>
          <CardDescription>
            These employees have shown outstanding commitment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
             </div>
          ) : leaderboardData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
                <p>No employees on the leaderboard yet. Points are awarded for check-ins!</p>
            </div>
          ) : (
            <>
            {/* Mobile View: Card List */}
            <div className="grid gap-4 md:hidden">
                {leaderboardData.map((entry, index) => (
                    <div key={entry.id} className={`p-4 rounded-lg space-y-4 border-2 ${index <= 2 ? 'border-primary bg-primary/5' : 'border-border bg-muted/50'}`}>
                        <div className="flex items-center gap-4">
                             <div className="flex items-center justify-center w-10">
                                {getRankIcon(index, true)}
                            </div>
                            <Avatar className="h-12 w-12 border-2 border-primary/50 shrink-0">
                                <AvatarImage src={entry.imageUrl} alt={entry.name} />
                                <AvatarFallback>{entry.fallback}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1 min-w-0">
                                <p className="font-bold break-words">{entry.name}</p>
                                <p className="text-muted-foreground font-semibold text-primary">{entry.points.toLocaleString()} Points</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Rank</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboardData.map((entry, index) => (
                    <TableRow key={entry.id} className={index <= 2 ? 'font-bold bg-muted/50' : ''}>
                      <TableCell>
                        <div className="flex items-center justify-center h-full">
                           {getRankIcon(index)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-primary/50">
                            <AvatarImage src={entry.imageUrl} alt={entry.name} />
                            <AvatarFallback>{entry.fallback}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{entry.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-lg">{entry.points.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
          )}
        </CardContent>
      </Card>
       <Card className="transition-all duration-300 ease-out hover:shadow-lg border-2 border-foreground/30 hover:border-primary">
        <CardHeader>
            <CardTitle>How Points Work</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
            <p><strong className="text-primary">+10 points</strong> for each on-time check-in.</p>
            <p><strong className="text-primary">+50 bonus points</strong> for a 5-day on-time streak.</p>
            <p><strong className="text-destructive">-5 points</strong> for each late check-in.</p>
        </CardContent>
      </Card>
    </div>
  );
}

    