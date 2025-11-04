
'use client';

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { doc, getDoc, setDoc, writeBatch } from "firebase/firestore";
import { IndianFlagIcon } from "@/components/ui/indian-flag-icon";

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
  }
}

export default function AdminSignupPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [phone, setPhone] = useState('');
    const [referralCode, setReferralCode] = useState('');
    const [otp, setOtp] = useState(new Array(6).fill(""));
    const [loading, setLoading] = useState(false);
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const otpInputsRef = useRef<HTMLInputElement[]>([]);
    const recaptchaContainerRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const phoneFromQuery = searchParams.get('phone');
        if (phoneFromQuery) {
            setPhone(phoneFromQuery);
            handleGetOtp(phoneFromQuery);
        } else {
            router.push('/login');
        }
    }, [searchParams, router]);

    useEffect(() => {
        if (typeof window !== 'undefined' && !window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current!, {
                'size': 'invisible',
                'callback': (response: any) => {},
            });
        }
    }, []);

    const handleGetOtp = async (phoneNum: string) => {
        setLoading(true);
        try {
            const phoneNumber = `+91${phoneNum}`;
            const appVerifier = window.recaptchaVerifier;
            if (!appVerifier) {
                throw new Error("reCAPTCHA not initialized");
            }

            const result = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
            setConfirmationResult(result);
            toast({ title: "OTP Sent!", description: `An OTP has been sent to ${phoneNumber}.` });
        } catch (error) {
            console.error("Error sending OTP:", error);
            toast({ title: "Error", description: "Failed to send OTP. Please try again.", variant: "destructive" });
            router.push('/login');
        } finally {
            setLoading(false);
        }
    }

    const handleVerifyAndProceed = async (e: React.FormEvent) => {
        e.preventDefault();
        const enteredOtp = otp.join('');
         if (enteredOtp.length !== 6) {
            toast({ title: "Error", description: "Please enter a valid 6-digit OTP.", variant: "destructive" });
            return;
        }
        if (!confirmationResult) {
            toast({ title: "Error", description: "Confirmation result not found. Please try again.", variant: "destructive" });
            return;
        }
        setLoading(true);
        try {
            const result = await confirmationResult.confirm(enteredOtp);
            const user = result.user;
            const phoneNumber = `+91${phone}`;

            // Create preliminary records
            const batch = writeBatch(db);

            const userDocRef = doc(db, "users", user.uid);
            batch.set(userDocRef, { 
                uid: user.uid,
                phone: phoneNumber,
                role: 'Admin',
                isProfileComplete: false,
                joinDate: new Date().toISOString().split('T')[0],
             });

            const shopDocRef = doc(db, "shops", user.uid);
            batch.set(shopDocRef, {
                ownerId: user.uid,
                status: 'active',
                referredBy: referralCode || null,
            });

            const phoneLookupRef = doc(db, 'employee_phone_to_shop_lookup', phoneNumber);
            batch.set(phoneLookupRef, { 
                shopId: user.uid, 
                employeeDocId: user.uid, 
                isAdmin: true, 
                isProfileComplete: false 
            });

            await batch.commit();
            
            localStorage.setItem('adminUID', user.uid);
            localStorage.setItem('adminPhone', phoneNumber);
            
            toast({ title: "Account Created!", description: "Please complete your shop profile to continue." });
            router.push('/admin/complete-profile');

        } catch (error) {
            console.error("Error verifying OTP:", error);
            toast({ title: "Error", description: "Invalid OTP. Please try again.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }

     const handleOtpChange = (index: number, value: string) => {
        if (isNaN(Number(value))) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);
        if (value && index < 5) {
            otpInputsRef.current[index + 1]?.focus();
        }
    };
    
    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            otpInputsRef.current[index - 1]?.focus();
        }
    }
    
    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6);
        if (/^\d{6}$/.test(pastedData)) {
            const newOtp = pastedData.split('');
            setOtp(newOtp);
            otpInputsRef.current[5]?.focus();
        }
    };

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-background p-4 pt-20 sm:pt-28">
      <div ref={recaptchaContainerRef}></div>
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary/10 rounded-full">
                <UserPlus className="h-12 w-12 text-primary"/>
            </div>
        </div>
        <h1 className="text-3xl font-bold">Create Owner Account</h1>
        <p className="text-muted-foreground mt-2 mb-8">
            Enter the OTP sent to +91 {phone} to verify your number.
        </p>
        
        <form className="space-y-6 text-left" onSubmit={handleVerifyAndProceed}>
            <div className="space-y-2">
                <Label>One-Time Password</Label>
                <div className="flex justify-center gap-2" onPaste={handlePaste}>
                    {otp.map((digit, index) => (
                        <Input
                            key={index}
                            ref={el => otpInputsRef.current[index] = el!}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleOtpChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            className="w-12 h-14 text-center text-2xl font-semibold rounded-lg"
                            required
                        />
                    ))}
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="referralCode">Referral Code (Optional)</Label>
                <Input id="referralCode" placeholder="Enter referral code" value={referralCode} onChange={(e) => setReferralCode(e.target.value)} />
            </div>
            <Button type="button" variant="link" size="sm" className="p-0 h-auto" onClick={() => router.push('/login')}>
                Use a different phone number
            </Button>
            <Button type="submit" className="w-full !mt-8" disabled={loading}>
                 {loading && <Loader2 className="mr-2 animate-spin" />}
                 Verify & Create Account
            </Button>
        </form>
        <p className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
                Log In
            </Link>
        </p>
      </div>
    </div>
  );
}
