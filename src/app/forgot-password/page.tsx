
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Mail, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handlePasswordReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: 'Reset Email Sent',
        description: 'Please check your inbox for password reset instructions.',
      });
      setEmailSent(true);
    } catch (error: any) {
      console.error('Password reset error:', error);
      let description = 'An unexpected error occurred. Please try again.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
        description = 'This email address is not registered with us.';
      }
      toast({
        title: 'Error',
        description,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-muted/30">
        <div className="w-full max-w-md bg-background p-8 rounded-xl shadow-2xl m-4">
            <div className="mx-auto grid gap-6">

                {emailSent ? (
                    <div className="text-center">
                         <div className="flex justify-center mb-6">
                            <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full">
                                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400"/>
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold">Check Your Email</h1>
                        <p className="text-balance text-muted-foreground mt-2">
                           We've sent a password reset link to <span className="font-semibold text-primary">{email}</span>. Please follow the instructions in the email.
                        </p>
                        <div className="mt-6">
                            <Link href="/login">
                                <Button className="w-full">Back to Login</Button>
                            </Link>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="grid gap-2 text-center">
                            <h1 className="text-3xl font-bold">Forgot Password?</h1>
                            <p className="text-balance text-muted-foreground">
                            No problem. Enter your email and we'll send you a link to reset it.
                            </p>
                        </div>
                        <form onSubmit={handlePasswordReset} className="grid gap-4">
                            <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    placeholder="m@example.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            </div>
                            <Button type="submit" className="w-full mt-2" disabled={loading}>
                            {loading && <Loader2 className="mr-2 animate-spin" />}
                            Send Reset Link
                            </Button>
                        </form>
                        <div className="mt-4 text-center text-sm">
                            Remember your password?{' '}
                            <Link href="/login" className="underline">
                            Login here
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    </div>
  );
}
