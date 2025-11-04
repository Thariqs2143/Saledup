
'use client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { IndianFlagIcon } from "@/components/ui/indian-flag-icon";

export default function EmployeeLoginPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState(new Array(6).fill(""));
    const [step, setStep] = useState<'phone' | 'otp'>('phone');
    const [loading, setLoading] = useState(false);
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const otpInputsRef = useRef<HTMLInputElement[]>([]);
    const recaptchaContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && !window.recaptchaVerifier) {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current!, {
                'size': 'invisible',
                'callback': (response: any) => {
                    // reCAPTCHA solved, allow signInWithPhoneNumber.
                },
            });
        }
    }, []);
    
    useEffect(() => {
        if (step === 'otp') {
            otpInputsRef.current[0]?.focus();
        }
    }, [step]);


    const handleGetOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!/^\d{10}$/.test(phone)) {
            toast({ title: "Error", description: "Please enter a valid 10-digit phone number.", variant: "destructive" });
            return;
        }
        
        setLoading(true);
        try {
            const phoneNumber = `+91${phone}`;
            const appVerifier = window.recaptchaVerifier;
            if (!appVerifier) {
                throw new Error("reCAPTCHA not initialized");
            }
            const result = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
            setConfirmationResult(result);
            setStep('otp');
            toast({ title: "OTP Sent!", description: `An OTP has been sent to ${phoneNumber}.` });
        } catch (error) {
            console.error("Error sending OTP:", error);
            toast({ title: "Error", description: "Failed to send OTP. Please ensure your number is registered by your employer.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }
    
    const handleOtpChange = (index: number, value: string) => {
        if (isNaN(Number(value))) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        // Move to next input
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
            const result = await confirmationResult.confirm(enteredOtp);
            const user = result?.user;

            if (user && user.phoneNumber) {
                let phoneNumber = user.phoneNumber;
                 if (!phoneNumber.startsWith('+')) {
                    phoneNumber = `+${phoneNumber}`;
                }
                
                const phoneLookupRef = doc(db, "employee_phone_to_shop_lookup", phoneNumber);
                const phoneLookupSnap = await getDoc(phoneLookupRef);

                if (phoneLookupSnap.exists()) {
                    const lookupData = phoneLookupSnap.data();

                    // Check if the associated shop is disabled
                    const shopDocRef = doc(db, 'shops', lookupData.shopId);
                    const shopDocSnap = await getDoc(shopDocRef);

                    if (!shopDocSnap.exists() || shopDocSnap.data().status === 'disabled') {
                        toast({ title: "Access Denied", description: "Your employer's shop account has been disabled. Please contact them.", variant: "destructive" });
                        await auth.signOut();
                        setLoading(false);
                        return;
                    }
                    
                    if (lookupData.isProfileComplete) {
                        toast({ title: "Login Successful!" });
                        router.push('/employee');
                    } else {
                        localStorage.setItem('newUserPhone', phoneNumber || '');
                        localStorage.setItem('newUserUID', user.uid);
                        localStorage.setItem('newUserShopId', lookupData.shopId);
                        localStorage.setItem('newUserDocId', lookupData.employeeDocId);

                        toast({ title: "Welcome!", description: "Please complete your profile." });
                        router.push('/employee/complete-profile');
                    }
                } else {
                    toast({ title: "Not Registered", description: "This phone number is not registered. Please contact your shop owner.", variant: "destructive"});
                    await auth.signOut();
                }
            } else {
                 throw new Error("User or phone number not found after authentication.");
            }
        } catch (error) {
            console.error("Error verifying OTP:", error);
            toast({ title: "Error", description: "Invalid OTP or failed to login.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-start bg-background p-4 pt-20 sm:pt-28">
            <div ref={recaptchaContainerRef}></div>
            <div className="w-full max-w-sm text-center">
                <div className="flex justify-center mb-6">
                    <div className="p-4 bg-primary/10 rounded-full">
                        <User className="h-12 w-12 text-primary"/>
                    </div>
                </div>
                <h1 className="text-3xl font-bold">Employee Login</h1>
                <p className="text-muted-foreground mt-2 mb-8">
                    {step === 'phone' ? 'Enter your phone number to continue.' : 'Enter the OTP sent to your phone.'}
                </p>
            
                {step === 'phone' ? (
                     <form className="space-y-6 text-left" onSubmit={handleGetOtp}>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <div className="flex items-center gap-2">
                                <div className="flex h-10 items-center rounded-md border border-input bg-transparent px-3">
                                    <IndianFlagIcon />
                                    <span className="ml-2 text-sm font-medium text-muted-foreground">+91</span>
                                </div>
                                <Input id="phone" name="phone" type="tel" inputMode="numeric" placeholder="10-digit mobile number" required className="flex-1" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} maxLength={10} pattern="\d{10}" title="Please enter a 10-digit phone number" />
                            </div>
                        </div>
                        <Button type="submit" className="w-full !mt-8" disabled={loading}>
                            {loading && <Loader2 className="mr-2 animate-spin" />}
                            Send OTP
                        </Button>
                    </form>
                ): (
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
                <p className="mt-8 text-center text-sm text-muted-foreground">
                    Not an employee?{' '}
                    <Link href="/login" className="text-primary hover:underline font-medium">
                        Login as Shop Owner
                    </Link>
                </p>
            </div>
        </div>
    );
}
