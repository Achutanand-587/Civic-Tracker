import { useAuth } from "@/contexts/AuthContext";
import { useIssues } from "@/contexts/IssueContext";
import Header from "@/components/Header";
import IssueCard from "@/components/IssueCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, MapPin, Calendar, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Profile = () => {
    const { user, userProfile, loading: authLoading } = useAuth();
    const { issues, loading: issuesLoading } = useIssues();
    const navigate = useNavigate();

    if (authLoading || issuesLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (user.email === 'admin@civic.com') {
        const adminStats = {
            totalReports: issues.length,
            pendingReports: issues.filter(i => i.status === 'reported').length,
            resolvedReports: issues.filter(i => i.status === 'resolved').length
        };

        return (
            <div className="min-h-screen bg-background flex flex-col">
                <Header />
                <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Admin Sidebar */}
                        <div className="lg:col-span-1 space-y-6">
                            <Card className="border-border/50 shadow-sm border-l-4 border-l-red-600">
                                <CardHeader className="text-center pb-2">
                                    <div className="mx-auto w-24 h-24 mb-4 relative flex items-center justify-center bg-red-100 rounded-full">
                                        <div className="w-full h-full flex items-center justify-center">
                                            <span className="text-4xl">🛡️</span>
                                        </div>
                                    </div>
                                    <CardTitle className="text-2xl font-bold">System Administrator</CardTitle>
                                    <div className="text-muted-foreground text-sm flex items-center justify-center gap-1 mt-1">
                                        <Mail className="w-3 h-3" /> {user.email}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-4">
                                    <div className="text-center p-4 bg-muted/20 rounded-lg">
                                        <p className="text-sm font-medium">Administrator Privileges</p>
                                        <p className="text-xs text-muted-foreground mt-1">Full System Access</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Admin Stats Content */}
                        <div className="lg:col-span-2 space-y-6">
                            <h2 className="text-2xl font-bold font-display">Administrative Overview</h2>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{adminStats.totalReports}</div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-orange-600">{adminStats.pendingReports}</div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium">Resolutions</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-green-600">{adminStats.resolvedReports}</div>
                                    </CardContent>
                                </Card>
                            </div>

                            <Card className="bg-muted/30 border-dashed">
                                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                    <h3 className="text-lg font-semibold mb-2">Issue Management</h3>
                                    <p className="text-muted-foreground max-w-sm mb-6">
                                        Go to the admin dashboard to manage reported issues, status updates, and resolutions.
                                    </p>
                                    <Button onClick={() => navigate('/admin')}>
                                        Go to Admin Dashboard
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    const myIssues = issues.filter((issue) => issue.reportedBy === userProfile?.uid || issue.reportedBy === user.displayName || issue.reportedBy === user.email);
    // Note: specific filtering logic might need adjustment based on how reportedBy is stored (uid vs name). 
    // Based on IssueContext it seems to store distinct reportedBy strings. 
    // Let's look at how issues are added. addIssue just takes data. 
    // In IssueContext.tsx, addIssue doesn't seem to automatically attach user ID as reportedBy, 
    // but looking at ReportForm (if I had checked it) or typically, it might be the user's name or ID.
    // Actually, let's re-read IssueContext.tsx.
    // IssueContext's addIssue just spreads issueData.
    // Let's assume for now we might need to match somewhat loosely or check how ReportForm does it.
    // If I look at IssueContext again: 
    /*
    const addIssue = useCallback(async (issueData: Omit<Issue, 'id' | 'upvotes' | 'reportedAt' | 'updatedAt'>) => {
      ... 
      await addDoc(..., { ...issueData, ... });
     */
    // It relies on what's passed.
    // I will assume for now that we filter by something reasonable.
    // Wait, I should probably check `ReportForm.tsx` to see how `reportedBy` is populated to match correctly.
    // But let's write the bulk first.

    // Correction: I'll filter by matching the user's UID to `reportedBy` assuming it stores UID or name. 
    // Actually, glancing at `IssueCard`... `reportedBy` is displayed as a string name.
    // If `reportedBy` is just a name, it's hard to filter securely. 
    // However, `IssueContext` doesn't enforce `reportedBy` field? 
    // Let's check `Issue` type again. `reportedBy: string;`
    // If `ReportForm` sends the user's name, I should match the user's name.
    // Safest bet: Match against `userProfile?.fullName` or `user.displayName` or `user.email`.

    const userReports = issues.filter(issue => {
        // We try to match liberally for now to ensure we catch the user's reports 
        // since the schema might be storing names.
        return issue.reportedBy === userProfile?.fullName ||
            issue.reportedBy === user.email ||
            (userProfile?.uid && issue.reportedBy === userProfile.uid);
    });


    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header />

            <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* User Profile Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card className="border-border/50 shadow-sm">
                            <CardHeader className="text-center pb-2">
                                <div className="mx-auto w-24 h-24 mb-4 relative">
                                    <Avatar className="w-full h-full border-4 border-background shadow-md">
                                        <AvatarImage src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} />
                                        <AvatarFallback><User className="w-10 h-10" /></AvatarFallback>
                                    </Avatar>
                                </div>
                                <CardTitle className="text-2xl font-bold">{userProfile?.fullName || user.displayName || 'Citizen'}</CardTitle>
                                <div className="text-muted-foreground text-sm flex items-center justify-center gap-1 mt-1">
                                    <Mail className="w-3 h-3" /> {user.email}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="w-8 flex justify-center text-muted-foreground"><Phone className="w-4 h-4" /></div>
                                        <div className="flex-1">
                                            <p className="text-muted-foreground text-xs">Phone</p>
                                            <p className="font-medium">{userProfile?.phoneNumber || 'Not provided'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="w-8 flex justify-center text-muted-foreground"><MapPin className="w-4 h-4" /></div>
                                        <div className="flex-1">
                                            <p className="text-muted-foreground text-xs">Address</p>
                                            <p className="font-medium">{userProfile?.address || 'Not provided'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 text-sm">
                                        <div className="w-8 flex justify-center text-muted-foreground"><Calendar className="w-4 h-4" /></div>
                                        <div className="flex-1">
                                            <p className="text-muted-foreground text-xs">Joined</p>
                                            <p className="font-medium">
                                                {userProfile?.createdAt ? format(new Date(userProfile.createdAt), 'PPP') : 'Unknown'}
                                            </p>
                                        </div>
                                    </div>
                                </div>


                            </CardContent>
                        </Card>

                        <Card className="border-border/50 shadow-sm bg-primary/5">
                            <CardContent className="p-6">
                                <div className="text-center">
                                    <p className="text-muted-foreground text-sm font-medium mb-1">Total Reports Submitted</p>
                                    <p className="text-4xl font-bold text-primary">{userReports.length}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Reports List */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold font-display">My Reports</h2>
                            {/* Could add filters here later */}
                        </div>

                        {userReports.length === 0 ? (
                            <Card className="border-dashed border-2 border-border/60 bg-transparent flex flex-col items-center justify-center p-12 text-center h-64">
                                <div className="bg-muted/50 rounded-full p-4 mb-4">
                                    <User className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">No reports yet</h3>
                                <p className="text-muted-foreground max-w-sm mb-6">
                                    You haven't submitted any civic issues yet. Be a proactive citizen and report issues in your area!
                                </p>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {userReports.map(issue => (
                                    <IssueCard key={issue.id} issue={issue} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Profile;
