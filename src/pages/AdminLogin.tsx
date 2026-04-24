import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ShieldAlert, ArrowRight, Loader2 } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { getAuth, signInWithCustomToken } from 'firebase/auth';

const AdminLogin = () => {
    const [step, setStep] = useState<'email' | 'otp'>('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    if (user) {
        navigate('/admin');
        return null;
    }

    const auth = getAuth();

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            toast({ title: 'Error', description: 'Please enter your administrator email', variant: 'destructive' });
            return;
        }
        setLoading(true);
        try {
            const response = await fetch('http://localhost:3001/api/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to send OTP');
            }

            toast({ title: 'OTP Sent', description: 'Please check your email for the verification code.' });
            setStep('otp');
        } catch (error: any) {
            toast({
                title: 'Access Denied',
                description: error.message || 'Failed to send OTP or unauthorized.',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otp.length !== 6) {
            toast({ title: 'Error', description: 'Please enter the 6-digit OTP', variant: 'destructive' });
            return;
        }
        setLoading(true);
        try {
            const response = await fetch('http://localhost:3001/api/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            });
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Invalid or expired OTP');
            }
            
            await signInWithCustomToken(auth, data.token);
            toast({ title: 'Welcome Back', description: 'Secure channel authenticated successfully.' });
            navigate('/admin');
        } catch (error: any) {
            toast({
                title: 'Authentication Failed',
                description: error.message || 'Invalid or expired OTP.',
                variant: 'destructive'
            });
            setOtp('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <Card className="w-full max-w-md border-slate-700 bg-slate-800 text-slate-100">
                <CardHeader className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <ShieldAlert className="h-8 w-8 text-red-500" />
                        <span className="text-2xl font-bold">Secure Portal</span>
                    </div>
                    <CardTitle className="text-slate-100">Admin Authentication</CardTitle>
                    <CardDescription className="text-slate-400">
                        {step === 'email' ? 'Enter credentials to receive a one-time passcode' : `Enter code sent to ${email}`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {step === 'email' ? (
                        <form onSubmit={handleSendOTP} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="admin-email" className="text-slate-200">Municipal Email</Label>
                                <Input
                                    id="admin-email"
                                    type="email"
                                    placeholder="admin@civic.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
                                    disabled={loading}
                                />
                            </div>
                            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {loading ? 'Verifying Identity...' : 'Request Access Code'}
                                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyOTP} className="space-y-6">
                            <div className="flex justify-center">
                                <InputOTP 
                                    maxLength={6} 
                                    value={otp} 
                                    onChange={(v) => setOtp(v)}
                                    disabled={loading}
                                >
                                    <InputOTPGroup>
                                        <InputOTPSlot index={0} className="border-slate-600 text-lg h-12 w-12" />
                                        <InputOTPSlot index={1} className="border-slate-600 text-lg h-12 w-12" />
                                        <InputOTPSlot index={2} className="border-slate-600 text-lg h-12 w-12" />
                                        <InputOTPSlot index={3} className="border-slate-600 text-lg h-12 w-12" />
                                        <InputOTPSlot index={4} className="border-slate-600 text-lg h-12 w-12" />
                                        <InputOTPSlot index={5} className="border-slate-600 text-lg h-12 w-12" />
                                    </InputOTPGroup>
                                </InputOTP>
                            </div>
                            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white" disabled={loading || otp.length !== 6}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {loading ? 'Authenticating...' : 'Sign In Securely'}
                            </Button>
                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={() => setStep('email')}
                                    className="text-sm text-slate-400 hover:text-slate-300 underline"
                                >
                                    Back to Email Entry
                                </button>
                            </div>
                        </form>
                    )}
                </CardContent>
                <CardFooter className="flex justify-center">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">
                        Internal PMC Network Layer 2
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
};

export default AdminLogin;
