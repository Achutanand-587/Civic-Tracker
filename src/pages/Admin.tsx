import { useState } from 'react';
import { useIssues } from '@/contexts/IssueContext';
import { IssueStatus, STATUS_CONFIG, CATEGORY_CONFIG } from '@/types/issue';
import Header from '@/components/Header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MapPin, Calendar, ThumbsUp, Edit2, CheckCircle, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

const Admin = () => {
  const { issues, updateIssueStatus } = useIssues();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user?.email !== 'admin@civic.com') {
    return (
      <div className="min-h-screen bg-gradient-hero">
        <Header />
        <main className="container py-8 flex items-center justify-center min-h-[calc(100vh-80px)]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-md p-6 bg-card rounded-lg shadow-lg border border-border"
          >
            <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-6 h-6 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-6">
              You do not have permission to view the admin dashboard.
            </p>
            <Button onClick={() => navigate('/')} className="w-full">
              Go Home
            </Button>
          </motion.div>
        </main>
      </div>
    );
  }
  const [newStatus, setNewStatus] = useState<IssueStatus>('reported');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const handleUpdateStatus = () => {
    if (selectedIssueId) {
      updateIssueStatus(selectedIssueId, newStatus, resolutionNotes);
      toast.success('Issue status updated successfully!');
      setSelectedIssueId(null);
      setResolutionNotes('');
    }
  };

  const stats = {
    total: issues.length,
    reported: issues.filter((i) => i.status === 'reported').length,
    inProgress: issues.filter((i) => i.status === 'in-progress').length,
    resolved: issues.filter((i) => i.status === 'resolved').length,
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Header />

      <main className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage and update the status of reported issues.
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <Card className="bg-gradient-card border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold font-display text-foreground">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="bg-status-reported/10 border-status-reported/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-status-reported">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold font-display text-status-reported">{stats.reported}</p>
            </CardContent>
          </Card>
          <Card className="bg-status-in-progress/10 border-status-in-progress/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-status-in-progress">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold font-display text-status-in-progress">{stats.inProgress}</p>
            </CardContent>
          </Card>
          <Card className="bg-status-resolved/10 border-status-resolved/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-status-resolved">Resolved</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold font-display text-status-resolved">{stats.resolved}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Issues Table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="font-display">All Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Issue</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Upvotes</TableHead>
                      <TableHead>Reported</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {issues.map((issue) => (
                      <TableRow key={issue.id}>
                        <TableCell>
                          <div className="max-w-[200px]">
                            <p className="font-medium truncate">{issue.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{issue.description}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={issue.category as 'pothole' | 'garbage' | 'streetlight' | 'water' | 'other'}>
                            {CATEGORY_CONFIG[issue.category].icon} {CATEGORY_CONFIG[issue.category].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={issue.status as 'reported' | 'in-progress' | 'resolved'}>
                            {STATUS_CONFIG[issue.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground max-w-[150px]">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{issue.location.address?.split(',')[0] || 'N/A'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <ThumbsUp className="h-3 w-3" />
                            {issue.upvotes}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDistanceToNow(issue.reportedAt, { addSuffix: true })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedIssueId(issue.id);
                                  setNewStatus(issue.status);
                                  setResolutionNotes(issue.resolutionNotes || '');
                                }}
                              >
                                <Edit2 className="h-3 w-3 mr-1" />
                                Update
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Update Issue Status</DialogTitle>
                                <DialogDescription>
                                  Update the status and add notes for this issue.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <p className="text-sm font-medium">Issue: {issue.title}</p>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">New Status</label>
                                  <Select
                                    value={newStatus}
                                    onValueChange={(v) => setNewStatus(v as IssueStatus)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                        <SelectItem key={key} value={key}>
                                          {config.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Resolution Notes</label>
                                  <Textarea
                                    placeholder="Add notes about the resolution or progress..."
                                    value={resolutionNotes}
                                    onChange={(e) => setResolutionNotes(e.target.value)}
                                    rows={3}
                                  />
                                </div>
                                <Button onClick={handleUpdateStatus} className="w-full">
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Update Status
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default Admin;
