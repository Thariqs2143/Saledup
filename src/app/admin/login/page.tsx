
'use client';

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { RecaptchaVerifier, signInWithPhoneNumber, type ConfirmationResult, type User as AuthUser } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { doc, getDoc } from "firebase/firestore";
import Image from "next/image";

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}


export default function AdminLoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState(new Array(6).fill(""));
    const [loading, setLoading] = useState(false);
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const otpInputsRef = useRef<HTMLInputElement[]>([]);
    const recaptchaContainerRef = useRef<HTMLDivElement>(null);
    const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

     useEffect(() => {
        const phoneFromQuery = searchParams.get('phone');
        if (!phoneFromQuery) {
            router.push('/login');
            return;
        }
        setPhone(phoneFromQuery);

        const setupRecaptcha = () => {
            if (!recaptchaVerifierRef.current && recaptchaContainerRef.current) {
                const verifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
                    'size': 'invisible',
                    'callback': () => {},
                });
                recaptchaVerifierRef.current = verifier;
                verifier.render().then(() => {
                    handleGetOtp(phoneFromQuery, verifier);
                }).catch(error => {
                    console.error("reCAPTCHA render error:", error);
                    toast({ title: "reCAPTCHA Error", description: "Could not initialize reCAPTCHA. Please refresh the page.", variant: "destructive"});
                });
            } else if (recaptchaVerifierRef.current) {
                 handleGetOtp(phoneFromQuery, recaptchaVerifierRef.current);
            }
        };
        
        // Delay setup to ensure DOM is ready
        const timeoutId = setTimeout(setupRecaptcha, 100);

        return () => clearTimeout(timeoutId);
    }, [searchParams, router, toast]);


    const handleGetOtp = async (phoneNum: string, appVerifier: RecaptchaVerifier) => {
        if (!/^\d{10}$/.test(phoneNum)) {
            toast({ title: "Error", description: "Invalid phone number.", variant: "destructive" });
            return;
        }
        setLoading(true);
        
        try {
            const phoneNumber = `+91${phoneNum}`;
            const result = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
            setConfirmationResult(result);
            toast({ title: "OTP Sent!", description: `An OTP has been sent to ${phoneNumber}.` });
        } catch (error) {
            console.error("Error sending OTP:", error);
            toast({ title: "Error", description: "Failed to send OTP. Please try again.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }

    const checkUserProfile = async (user: AuthUser) => {
        let phoneNumber = user.phoneNumber;
        if (!phoneNumber) {
             toast({ title: "Error", description: "Phone number not found.", variant: "destructive" });
             await auth.signOut();
             return;
        }
        if (!phoneNumber.startsWith('+')) {
            phoneNumber = `+${phoneNumber}`;
        }
        
        const phoneLookupRef = doc(db, "employee_phone_to_shop_lookup", phoneNumber);
        const phoneLookupSnap = await getDoc(phoneLookupRef);
        
        if (!phoneLookupSnap.exists() || !phoneLookupSnap.data()?.isAdmin) {
             toast({ title: "Access Denied", description: "User is not registered as a shop owner.", variant: "destructive" });
             await auth.signOut();
             router.push('/login');
             return;
        }

        const lookupData = phoneLookupSnap.data();
        const shopDocRef = doc(db, 'shops', lookupData.shopId);
        const shopDocSnap = await getDoc(shopDocRef);
        
        if (!shopDocSnap.exists() || shopDocSnap.data()?.status === 'disabled') {
            const description = shopDocSnap.data()?.status === 'disabled'
                ? "This shop account has been disabled. Please contact support."
                : "Shop profile not found. Please contact support.";
            toast({ title: "Access Denied", description, variant: "destructive" });
            await auth.signOut();
            return;
        }

        if (lookupData.isProfileComplete) {
            toast({ title: "Login Successful!", description: "Redirecting to dashboard..." });
            router.push('/admin');
        } else {
            localStorage.setItem('adminUID', user.uid);
            localStorage.setItem('adminPhone', phoneNumber);
            toast({ title: "Welcome!", description: "Please complete your shop profile." });
            router.push('/admin/complete-profile');
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

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const enteredOtp = otp.join('');
         if (enteredOtp.length !== 6) {
            toast({ title: "Error", description: "Please enter a valid 6-digit OTP.", variant: "destructive" });
            return;
        }
        if (!confirmationResult) {
            toast({ title: "Error", description: "Confirmation result not found. Please try sending OTP again.", variant: "destructive" });
            return;
        }
        setLoading(true);
        try {
            const result = await confirmationResult.confirm(enteredOtp);
            const user = result.user;
            await checkUserProfile(user);
        } catch (error) {
            console.error("Error verifying OTP:", error);
            toast({ title: "Error", description: "Invalid OTP. Please try again.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }

  return (
    <div className="min-h-screen bg-background md:grid md:grid-cols-2">
      <div ref={recaptchaContainerRef}></div>
      {/* LEFT SIDE - Desktop Image */}
      <div className="relative hidden md:block">
          <Image
          src="https://res.cloudinary.com/dnkghymx5/image/upload/v1762241011/Generated_Image_November_04_2025_-_12_50PM_1_hslend.png"
          alt="Attendry illustration"
          fill
          className="object-cover"
          priority
          />
      </div>

       {/* RIGHT SIDE - Form Section */}
      <div className="flex flex-col items-center justify-center py-12 md:py-0 px-4 md:px-12">
           {/* TOP IMAGE for Mobile */}
            <div className="md:hidden w-screen relative -mt-12 -mx-4">
                <Image
                src="https://res.cloudinary.com/dnkghymx5/image/upload/v1762241011/Generated_Image_November_04_2025_-_12_50PM_1_hslend.png"
                alt="Attendry illustration"
                width={800}
                height={600}
                className="w-full h-auto object-cover"
                priority
                />
            </div>
          <div className="w-full max-w-sm text-center pt-8">
            <h1 className="text-3xl font-bold">Shop Owner Verification</h1>
            <p className="text-muted-foreground mt-2 mb-8">
                Enter the OTP sent to +91 {phone}.
            </p>

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
                <Button type="button" variant="link" size="sm" className="p-0 h-auto" onClick={() => router.push('/login')}>
                    Use a different phone number
                </Button>
                <Button type="submit" className="w-full !mt-8" disabled={loading}>
                    {loading && <Loader2 className="mr-2 animate-spin" />}
                    Verify OTP & Login
                </Button>
            </form>
          </div>
      </div>
    </div>
  );
}
