
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const googleProvider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const shopDocRef = doc(db, 'shops', user.uid);
      const shopDocSnap = await getDoc(shopDocRef);

      if (shopDocSnap.exists()) {
        toast({ title: 'Login Successful!', description: 'Welcome back!' });
        router.push('/admin');
      } else {
        await setDoc(
          shopDocRef,
          {
            ownerId: user.uid,
            ownerName: user.displayName,
            ownerEmail: user.email,
            ownerImageUrl: user.photoURL,
            createdAt: new Date(),
          },
          { merge: true }
        );
        toast({
          title: 'Account Created!',
          description: 'Please complete your shop profile to continue.',
        });
        router.push('/admin/complete-profile');
      }
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        console.error('Error during Google Sign-In:', error);
        toast({
          title: 'Error',
          description: 'Something went wrong during sign-in. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      toast({
        title: 'Error',
        description: 'Email and password are required.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: 'Login Successful!', description: 'Welcome back!' });
      router.push('/admin');
    } catch (error: any) {
      console.error('Email/password login error:', error);
      toast({
        title: 'Login Failed',
        description:
          error.code === 'auth/invalid-credential'
            ? 'Invalid email or password.'
            : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-background text-foreground">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
            <Image
            src="https://res.cloudinary.com/dyov4r11v/image/upload/v1762585915/business-woman-working-on-tablet_23-2148405822_yud2y9.jpg"
            alt="A business owner working on a tablet in a modern cafe"
            fill
            className="object-cover"
            priority
            />
            <div className="absolute inset-0 bg-black/50"></div>
        </div>
        
        {/* Main Content Grid */}
        <div className="relative grid min-h-screen md:grid-cols-2">
            
            {/* Left Side - Promotional Text */}
            <div className="hidden md:flex flex-col justify-end p-10 lg:p-16 text-white">
                <div className="max-w-md">
                    <h2 className="text-4xl lg:text-5xl font-bold tracking-tight">
                        Grow Your Business with Saledup
                    </h2>
                    <p className="mt-4 text-lg text-white/80">
                        Join thousands of local shops turning foot traffic into loyal customers, one QR code at a time.
                    </p>
                </div>
            </div>

            {/* Right Side - Form Card */}
            <div className="flex items-center justify-center p-4">
                 <div className="w-full max-w-sm bg-background rounded-lg shadow-2xl p-8 space-y-6">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold tracking-tight">Welcome Back</h1>
                        <p className="mt-2 text-muted-foreground">
                        Sign in to manage your offers and grow your business.
                        </p>
                    </div>

                    <form onSubmit={handleEmailLogin} className="space-y-4">
                        <div>
                        <Label htmlFor="email">Email address</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            required
                            className="mt-1"
                        />
                        </div>
                        <div>
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            required
                            className="mt-1"
                        />
                        </div>
                        <Button
                        type="submit"
                        className="w-full h-11"
                        disabled={loading || googleLoading}
                        >
                        {loading && <Loader2 className="mr-2 animate-spin" />}
                        Login
                        </Button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                        <span className="bg-background px-2 text-muted-foreground">OR</span>
                        </div>
                    </div>

                    <Button
                        onClick={handleGoogleSignIn}
                        variant="outline"
                        className="w-full h-11"
                        disabled={loading || googleLoading}
                    >
                        {googleLoading ? (
                        <Loader2 className="mr-2 animate-spin" />
                        ) : (
                        <svg role="img" viewBox="0 0 24 24" className="mr-2 h-5 w-5">
                            <path
                            fill="currentColor"
                            d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.36 1.67-4.06 1.67-3.4 0-6.17-2.83-6.17-6.23s2.77-6.23 6.17-6.23c1.87 0 3.13.78 3.88 1.48l2.34-2.34C18.37 1.9 15.48 0 12.48 0 5.88 0 .02 5.88.02 12.48s5.86 12.48 12.46 12.48c3.32 0 6.03-1.14 8.04-3.21 2.07-2.07 2.72-5.04 2.72-7.76v-2.1H12.48z"
                            ></path>
                        </svg>
                        )}
                        Continue with Google
                    </Button>

                    <p className="text-center text-sm text-muted-foreground">
                        Don't have an account?{' '}
                        <Link href="/signup" className="font-medium text-primary hover:underline">
                        Sign up
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    </div>
  );
}
