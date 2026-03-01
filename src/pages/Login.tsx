
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { MapPin } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn, user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    // Redirect if already logged in
    if (user) {
        navigate('/');
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
            toast({ title: 'Welcome back!', description: 'You have successfully signed in.' });
            navigate('/');
        } catch (error: any) {
            toast({
                title: 'Sign in failed',
                description: error.message || 'Invalid credentials',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <MapPin className="h-8 w-8 text-primary" />
                        <span className="text-2xl font-bold">CivicTrack</span>
                    </div>
                    <CardTitle>Welcome Back</CardTitle>
                    <CardDescription>Sign in to your account to report issues</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSignIn} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="signin-email">Email</Label>
                            <Input
                                id="signin-email"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="signin-password">Password</Label>
                                {/* Optional: Add Forgot Password link here later */}
                            </div>
                            <Input
                                id="signin-password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Signing in...' : 'Sign In'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col justify-center">
                    <p className="text-sm text-muted-foreground mb-4">
                        Don't have an account?{' '}
                        <Link to="/signup" className="text-primary hover:underline font-medium">
                            Sign Up
                        </Link>
                    </p>
                    <Link to="/admin/login" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                        Admin Access
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
};

export default Login;
