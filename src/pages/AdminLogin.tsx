
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ShieldAlert } from 'lucide-react';

const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn, user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    // Redirect if already logged in
    if (user) {
        if (user.email === 'admin@civic.com') {
            navigate('/admin');
        } else {
            navigate('/');
        }
        return null;
    }

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast({ title: 'Error', description: 'Please fill in all fields', variant: 'destructive' });
            return;
        }
        setLoading(true);
        try {
            await signIn(email, password);
            if (email === 'admin@civic.com') {
                toast({ title: 'Welcome Admin', description: 'Access granted to admin portal.' });
                navigate('/admin');
            } else {
                toast({ title: 'Access Denied', description: 'This portal is for administrators only.', variant: 'destructive' });
                // Optionally sign them out immediately if you want to be strict, but for now just redirect home
                navigate('/');
            }
        } catch (error: any) {
            toast({
                title: 'Authentication failed',
                description: error.message || 'Invalid credentials',
                variant: 'destructive'
            });
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
                        <span className="text-2xl font-bold">Admin Portal</span>
                    </div>
                    <CardTitle className="text-slate-100">Restricted Access</CardTitle>
                    <CardDescription className="text-slate-400">Authorized personnel only</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSignIn} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="admin-email" className="text-slate-200">Email</Label>
                            <Input
                                id="admin-email"
                                type="email"
                                placeholder="admin@civic.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="admin-password" className="text-slate-200">Password</Label>
                            <Input
                                id="admin-password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-500"
                            />
                        </div>
                        <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white" disabled={loading}>
                            {loading ? 'Authenticating...' : 'Access Dashboard'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <p className="text-sm text-slate-500">
                        Secure Connection Established
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
};

export default AdminLogin;
