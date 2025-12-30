
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);

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
        const shopData = {
            ownerId: user.uid,
            ownerName: user.displayName,
            ownerEmail: user.email,
            ownerImageUrl: user.photoURL,
            createdAt: new Date(),
        };
        
        setDoc(shopDocRef, shopData, { merge: true })
        .then(() => {
            toast({
                title: 'Account Created!',
                description: 'Please complete your shop profile to continue.',
            });
            router.push('/admin/complete-profile');
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
              path: shopDocRef.path,
              operation: 'create',
              requestResourceData: shopData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
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

  const handleEmailSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const repeatPassword = formData.get('repeat-password') as string;
    const ownerName = email.split('@')[0];

    if (password !== repeatPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      await updateProfile(userCredential.user, { displayName: ownerName });
      
      const user = userCredential.user;

      const shopDocRef = doc(db, 'shops', user.uid);
      const shopData = {
          ownerId: user.uid,
          ownerName: ownerName,
          ownerEmail: user.email,
          createdAt: new Date(),
      };

      setDoc(shopDocRef, shopData, { merge: true })
        .then(() => {
            toast({
                title: 'Account Created!',
                description: 'Please complete your shop profile to continue.',
            });
            router.push('/admin/complete-profile');
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
              path: shopDocRef.path,
              operation: 'create',
              requestResourceData: shopData,
            });
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setLoading(false);
        });

    } catch (error: any) {
      console.error('Email sign up error:', error);
      let description = 'An unexpected error occurred.';
      if (error.code === 'auth/email-already-in-use') {
        description = 'This email is already in use. Please log in instead.';
      } else if (error.code === 'auth/weak-password') {
        description = 'Password should be at least 6 characters long.';
      }
      toast({
        title: 'Sign Up Failed',
        description,
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
     <div className="w-full min-h-screen">
       {/* Mobile View */}
       <div className="flex flex-col min-h-screen lg:hidden bg-background">
            <Image
                src="https://res.cloudinary.com/dyov4r11v/image/upload/v1762585069/WhatsApp_Image_2025-11-08_at_12.26.33_9ac0131f_qj21tx.jpg"
                alt="Welcome"
                width={1200}
                height={800}
                className="w-full h-auto object-cover"
            />
            <div className="flex-grow flex flex-col justify-center p-6">
                <div className="w-full max-w-md mx-auto">
                    <div className="grid gap-2 text-center mb-6">
                        <h1 className="text-3xl font-bold">Start Growing Today</h1>
                        <p className="text-balance text-muted-foreground">
                        Create an account to launch instant offers and connect with customers.
                        </p>
                    </div>
                    <form onSubmit={handleEmailSignUp} className="grid gap-4">
                        <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            name="email"
                            placeholder="m@example.com"
                            required
                        />
                        </div>
                        <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <div className="relative">
                            <Input
                            id="password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            className="pr-10"
                            />
                            <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute inset-y-0 right-0 h-full px-3"
                            onClick={() => setShowPassword(!showPassword)}
                            >
                            {showPassword ? (
                                <EyeOff className="h-5 w-5 text-muted-foreground" />
                            ) : (
                                <Eye className="h-5 w-5 text-muted-foreground" />
                            )}
                            <span className="sr-only">
                                {showPassword ? 'Hide password' : 'Show password'}
                            </span>
                            </Button>
                        </div>
                        </div>
                        <div className="grid gap-2">
                        <Label htmlFor="repeat-password">Repeat Password</Label>
                        <div className="relative">
                            <Input
                            id="repeat-password"
                            name="repeat-password"
                            type={showRepeatPassword ? 'text' : 'password'}
                            required
                            className="pr-10"
                            />
                            <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute inset-y-0 right-0 h-full px-3"
                            onClick={() => setShowRepeatPassword(!showRepeatPassword)}
                            >
                            {showRepeatPassword ? (
                                <EyeOff className="h-5 w-5 text-muted-foreground" />
                            ) : (
                                <Eye className="h-5 w-5 text-muted-foreground" />
                            )}
                            <span className="sr-only">
                                {showRepeatPassword ? 'Hide password' : 'Show password'}
                            </span>
                            </Button>
                        </div>
                        </div>
                        <Button type="submit" className="w-full" disabled={loading || googleLoading}>
                            {loading && <Loader2 className="mr-2 animate-spin" />}
                        Sign Up
                        </Button>
                        {/*
                        <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={loading || googleLoading}>
                        {googleLoading ? (
                            <Loader2 className="mr-2 animate-spin" />
                        ) : (
                            <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
                                <path
                                fill="currentColor"
                                d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.36 1.67-4.06 1.67-3.4 0-6.17-2.83-6.17-6.23s2.77-6.23 6.17-6.23c1.87 0 3.13.78 3.88 1.48l2.34-2.34C18.37 1.9 15.48 0 12.48 0 5.88 0 .02 5.88.02 12.48s5.86 12.48 12.46 12.48c3.32 0 6.03-1.14 8.04-3.21 2.07-2.07 2.72-5.04 2.72-7.76v-2.1H12.48z"
                                ></path>
                            </svg>
                        )}
                        Sign up with Google
                        </Button>
                        */}
                    </form>
                    <div className="mt-4 text-center text-sm">
                        Already have an account?{' '}
                        <Link href="/login" className="underline">
                        Login
                        </Link>
                    </div>
                </div>
            </div>
       </div>

        {/* Desktop View */}
       <div className="hidden lg:flex min-h-screen w-full relative">
            <Image
                src="https://res.cloudinary.com/dyov4r11v/image/upload/v1762585069/WhatsApp_Image_2025-11-08_at_12.26.33_9ac0131f_qj21tx.jpg"
                alt="Background"
                fill
                style={{objectFit: 'cover'}}
                className="dark:brightness-[0.6]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent"></div>

            <div className="relative z-10 flex flex-col justify-end p-12 text-white w-1/2">
                <h2 className="text-4xl font-bold leading-tight">The Future of Local Commerce Starts Here.</h2>
                <p className="mt-4 text-lg text-white/80">Supercharge your business with easy integrations, powerful dashboards, and more.</p>
            </div>
        
            <div className="relative z-10 flex items-center justify-center w-1/2 p-8">
                <div className="w-full max-w-md bg-background p-8 rounded-xl shadow-2xl">
                    <div className="mx-auto grid gap-6">
                        <div className="grid gap-2 text-center">
                            <h1 className="text-3xl font-bold">Start Growing Today</h1>
                            <p className="text-balance text-muted-foreground">
                            Create an account to launch instant offers and connect with customers.
                            </p>
                        </div>
                        <form onSubmit={handleEmailSignUp} className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="email-desktop">Email</Label>
                                <Input
                                    id="email-desktop"
                                    type="email"
                                    name="email"
                                    placeholder="m@example.com"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="password-desktop">Password</Label>
                                <div className="relative">
                                    <Input
                                    id="password-desktop"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    className="pr-10"
                                    />
                                    <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute inset-y-0 right-0 h-full px-3"
                                    onClick={() => setShowPassword(!showPassword)}
                                    >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5 text-muted-foreground" />
                                    ) : (
                                        <Eye className="h-5 w-5 text-muted-foreground" />
                                    )}
                                    <span className="sr-only">
                                        {showPassword ? 'Hide password' : 'Show password'}
                                    </span>
                                    </Button>
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="repeat-password-desktop">Repeat Password</Label>
                                <div className="relative">
                                    <Input
                                    id="repeat-password-desktop"
                                    name="repeat-password"
                                    type={showRepeatPassword ? 'text' : 'password'}
                                    required
                                    className="pr-10"
                                    />
                                    <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute inset-y-0 right-0 h-full px-3"
                                    onClick={() => setShowRepeatPassword(!showRepeatPassword)}
                                    >
                                    {showRepeatPassword ? (
                                        <EyeOff className="h-5 w-5 text-muted-foreground" />
                                    ) : (
                                        <Eye className="h-5 w-5 text-muted-foreground" />
                                    )}
                                    <span className="sr-only">
                                        {showRepeatPassword ? 'Hide password' : 'Show password'}
                                    </span>
                                    </Button>
                                </div>
                            </div>
                            <Button type="submit" className="w-full" disabled={loading || googleLoading}>
                                {loading && <Loader2 className="mr-2 animate-spin" />}
                            Sign Up
                            </Button>
                            {/*
                            <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={loading || googleLoading}>
                            {googleLoading ? (
                                <Loader2 className="mr-2 animate-spin" />
                            ) : (
                                <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
                                    <path
                                    fill="currentColor"
                                    d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.36 1.67-4.06 1.67-3.4 0-6.17-2.83-6.17-6.23s2.77-6.23 6.17-6.23c1.87 0 3.13.78 3.88 1.48l2.34-2.34C18.37 1.9 15.48 0 12.48 0 5.88 0 .02 5.88.02 12.48s5.86 12.48 12.46 12.48c3.32 0 6.03-1.14 8.04-3.21 2.07-2.07 2.72-5.04 2.72-7.76v-2.1H12.48z"
                                    ></path>
                                </svg>
                            )}
                            Sign up with Google
                            </Button>
                            */}
                        </form>
                        <div className="mt-4 text-center text-sm">
                            Already have an account?{' '}
                            <Link href="/login" className="underline">
                            Login
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
       </div>
    </div>
  );
}
