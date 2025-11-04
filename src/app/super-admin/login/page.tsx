
'use client';

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gem, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function SuperAdminLoginPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState(new Array(6).fill(""));
    const [step, setStep] = useState<'phone' | 'otp'>('phone');
    const [loading, setLoading] = useState(false);
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const otpInputsRef = useRef<HTMLInputElement[]>([]);
    const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
    const recaptchaContainerRef = useRef<HTMLDivElement>(null);
    
    // Hardcoded credentials for the special Super Admin account
    const SUPER_ADMIN_PHONE = "9790296771"; 

    useEffect(() => {
        if (recaptchaContainerRef.current && !recaptchaVerifierRef.current) {
            recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
                'size': 'invisible',
                'callback': (response: any) => {
                    // reCAPTCHA solved, allow signInWithPhoneNumber.
                },
            });
        }
        // Cleanup function
        return () => {
            if (recaptchaVerifierRef.current) {
                recaptchaVerifierRef.current.clear();
            }
        };
    }, []);
    
    useEffect(() => {
        if (step === 'otp') {
            otpInputsRef.current[0]?.focus();
        }
    }, [step]);

    const handleGetOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (phone !== SUPER_ADMIN_PHONE) {
            toast({ title: "Access Denied", description: "This phone number is not authorized for super admin access.", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const phoneNumber = `+91${phone}`;
            const appVerifier = recaptchaVerifierRef.current;
            if (!appVerifier) {
                throw new Error("reCAPTCHA not initialized");
            }
            const result = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
            setConfirmationResult(result);
            setStep('otp');
            toast({ title: "OTP Sent!", description: `An OTP has been sent to your number.` });
        } catch (error) {
            console.error("Error sending OTP:", error);
            toast({ title: "Error", description: "Failed to send OTP.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const enteredOtp = otp.join('');
        if (enteredOtp.length !== 6) {
            toast({ title: "Error", description: "Please enter a valid 6-digit OTP.", variant: "destructive" });
            return;
        }
        if (!confirmationResult) {
            toast({ title: "Error", description: "Please request an OTP first.", variant: "destructive" });
            return;
        }
        setLoading(true);
        try {
            await confirmationResult.confirm(enteredOtp);
            toast({
                title: "Login Successful",
                description: "Redirecting to the Super Admin Dashboard.",
            });
            localStorage.setItem('superAdminAuthenticated', 'true');
            router.push('/super-admin');
        } catch (error) {
            console.error("Error verifying OTP:", error);
            toast({ title: "Error", description: "Invalid OTP or failed to login.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    
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
    };
    
    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6);
        if (/^\d{6}$/.test(pastedData)) {
            setOtp(pastedData.split(''));
            otpInputsRef.current[5]?.focus();
        }
    };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div ref={recaptchaContainerRef}></div>
      <div className="w-full max-w-sm text-center">
        <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary/10 rounded-full">
                <Gem className="h-12 w-12 text-primary"/>
            </div>
        </div>
        <h1 className="text-3xl font-bold">Super Admin Login</h1>
        <p className="text-muted-foreground mt-2 mb-8">
            {step === 'phone' ? 'Enter your master phone number to continue.' : 'Enter the OTP sent to your phone.'}
        </p>

        {step === 'phone' ? (
        <form className="space-y-6 text-left" onSubmit={handleGetOtp}>
            <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex items-center gap-2">
                    <div className="flex h-10 items-center rounded-md border border-input bg-transparent px-3">
                        <span role="img" aria-label="Indian Flag">🇮🇳</span>
                        <span className="ml-2 text-sm font-medium text-muted-foreground">+91</span>
                    </div>
                    <Input id="phone" type="tel" required className="flex-1" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} />
                </div>
            </div>
            <Button type="submit" className="w-full !mt-8" disabled={loading}>
                {loading && <Loader2 className="mr-2 animate-spin" />}
                Send OTP
            </Button>
        </form>
        ) : (
        <form className="space-y-6 text-left" onSubmit={handleLogin}>
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
            <Button type="button" variant="link" size="sm" className="p-0 h-auto" onClick={() => { setStep('phone'); setOtp(new Array(6).fill("")); }}>
                Use a different phone number
            </Button>
            <Button type="submit" className="w-full !mt-8" disabled={loading}>
                 {loading && <Loader2 className="mr-2 animate-spin" />}
                 Verify OTP & Login
            </Button>
        </form>
        )}
      </div>
    </div>
  );
}
