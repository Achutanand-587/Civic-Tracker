
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { MapPin, Loader2 } from 'lucide-react';
import { db, auth } from '@/lib/firebase';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '@/contexts/AuthContext';

const Signup = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        fullName: '',
        phoneNumber: '',
        address: '',
        dob: '',
    });


    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password || !formData.fullName || !formData.phoneNumber || !formData.address || !formData.dob) {
            toast({ title: 'Error', description: 'Please fill in all fields', variant: 'destructive' });
            return;
        }
        if (password.length < 6) {
            toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
            return;
        }

        setLoading(true);
        try {
            // Create user using Firebase Auth directly to get the cred immediately or use context if it returns it.
            // Context returns void. So we use auth directly here for clarity and immediate access to uid.
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;

            // Create Firestore document
            await setDoc(doc(db, 'users', uid), {
                fullName: formData.fullName,
                phoneNumber: formData.phoneNumber,
                address: formData.address,
                dob: formData.dob,
                email: email,
                createdAt: Timestamp.now(),
            });

            toast({ title: 'Account created!', description: 'Welcome to CivicTrack.' });
            navigate('/');
        } catch (error: any) {
            console.error(error);
            let message = 'Could not create account';
            if (error.code === 'auth/email-already-in-use') {
                message = 'This email is already registered';
            } else if (error.code === 'auth/invalid-email') {
                message = 'Invalid email address';
            }
            toast({ title: 'Sign up failed', description: message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-lg">
                <CardHeader className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <MapPin className="h-8 w-8 text-primary" />
                        <span className="text-2xl font-bold">CivicTrack</span>
                    </div>
                    <CardTitle>Create an Account</CardTitle>
                    <CardDescription>Sign up to start reporting issues in your community</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSignUp} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="fullname">Full Name</Label>
                            <Input
                                id="fullname"
                                required
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                placeholder="John Doe"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="signup-email">Email</Label>
                            <Input
                                id="signup-email"
                                type="email"
                                required
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="signup-password">Password</Label>
                            <Input
                                id="signup-password"
                                type="password"
                                required
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                                Password must be at least 6 characters long
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input
                                    id="phone"
                                    required
                                    type="tel"
                                    value={formData.phoneNumber}
                                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                    placeholder="+91 9999999999"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="dob">Date of Birth</Label>
                                <Input
                                    id="dob"
                                    required
                                    type="date"
                                    value={formData.dob}
                                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="address">Address</Label>
                            <Input
                                id="address"
                                required
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="House No, Street, City"
                            />
                        </div>



                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Creating account...' : 'Create Account'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <p className="text-sm text-muted-foreground">
                        Already have an account?{' '}
                        <Link to="/login" className="text-primary hover:underline font-medium">
                            Sign In
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
};

export default Signup;
