
'use client';

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult, type User as AuthUser } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { doc, getDoc } from "firebase/firestore";
import Image from "next/image";

export default function LoginPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
    const recaptchaContainerRef = useRef<HTMLDivElement>(null);

     useEffect(() => {
        const verifier = recaptchaVerifierRef.current;
        if (recaptchaContainerRef.current && !verifier) {
            recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
                'size': 'invisible',
                'callback': (response: any) => {},
            });
        }
        return () => {
            if (verifier) {
                verifier.clear();
            }
        };
    }, []);

    const handleOwnerLogin = async (e: React.FormEvent) => {
        e.preventDefault();
         if (!/^\d{10}$/.test(phone)) {
            toast({ title: "Error", description: "Please enter a valid 10-digit phone number.", variant: "destructive" });
            return;
        }
        setLoading(true);
        
        try {
            const phoneNumber = `+91${phone}`;

            // Check if user is an admin/owner
            const phoneLookupRef = doc(db, 'employee_phone_to_shop_lookup', phoneNumber);
            const phoneLookupSnap = await getDoc(phoneLookupRef);

            if (phoneLookupSnap.exists() && phoneLookupSnap.data()?.isAdmin) {
                // User is an existing admin, proceed to login flow
                 localStorage.setItem('loginTarget', 'admin');
                 localStorage.setItem('loginPhone', phone);
                 router.push(`/admin/login?phone=${phone}`);

            } else if (phoneLookupSnap.exists() && !phoneLookupSnap.data()?.isAdmin) {
                // User is an employee, guide them to the correct login
                 toast({ title: "Employee Account", description: "This number is registered as an employee. Please use the 'Login as Employee' button.", variant: "destructive"});

            } else {
                // New user, proceed to signup flow
                localStorage.setItem('loginTarget', 'admin');
                localStorage.setItem('loginPhone', phone);
                router.push(`/admin/signup?phone=${phone}`);
            }

        } catch (error) {
            console.error("Error during owner check:", error);
            toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }


  return (
    <div className="grid grid-cols-1 md:grid-cols-2 min-h-screen w-full">
        <div ref={recaptchaContainerRef}></div>
        {/* Left side with illustration */}
        <div className="hidden md:flex flex-col items-center justify-center bg-[#0C2A6A] p-10 text-white relative overflow-hidden">
            <Image
                src="https://picsum.photos/seed/1/1000/1200"
                alt="Business tools illustration"
                fill
                className="object-cover opacity-10"
                data-ai-hint="business tools"
            />
            <div className="relative z-10 text-center space-y-6">
                <div className="flex justify-center items-center gap-4">
                     <Shield className="h-16 w-16 text-white" />
                     <h1 className="text-6xl font-bold tracking-tighter">SALEDIN</h1>
                </div>
                <Image
                    src="https://storage.googleapis.com/framer-usercontent/images/tHflOaA13praLY311Lg9JA5A.png"
                    alt="Business tools"
                    width={500}
                    height={500}
                    className="mx-auto"
                />
            </div>
        </div>

        {/* Right side with login form */}
        <div className="flex flex-col items-center justify-center bg-background p-8">
            <div className="w-full max-w-sm">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold tracking-tight">India's #1 AI-Powered Business Companion</h1>
                    <p className="text-muted-foreground mt-2 font-semibold">LOG IN OR SIGN UP</p>
                </div>
                
                <form className="space-y-6" onSubmit={handleOwnerLogin}>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 border border-input rounded-md px-3 bg-white">
                             <span role="img" aria-label="Indian Flag" className="text-lg">🇮🇳</span>
                             <span className="text-sm font-medium text-muted-foreground">+91</span>
                            <Input 
                                id="phone" 
                                type="tel" 
                                inputMode="numeric" 
                                placeholder="Enter Phone Number" 
                                required 
                                className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0" 
                                value={phone} 
                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} 
                                maxLength={10} 
                                pattern="\d{10}" 
                                title="Please enter a 10-digit phone number" 
                            />
                        </div>
                    </div>
                    <Button type="submit" className="w-full bg-[#0C2A6A] hover:bg-[#0C2A6A]/90" disabled={loading}>
                        {loading && <Loader2 className="mr-2 animate-spin" />}
                        Continue
                    </Button>
                </form>

                <div className="flex items-center my-8">
                    <hr className="w-full"/>
                    <span className="px-4 text-muted-foreground font-medium">OR</span>
                    <hr className="w-full"/>
                </div>

                <Link href="/employee/login" className="w-full">
                    <Button variant="outline" className="w-full">
                        Login as Employee
                    </Button>
                </Link>
            </div>
        </div>
    </div>
  );
}
