import { useState } from 'react';
import { useIssues } from '@/contexts/IssueContext';
import { IssueStatus, STATUS_CONFIG, CATEGORY_CONFIG } from '@/types/issue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MapPin, Calendar, ThumbsUp, Edit2, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { usePMCAuth } from '@/hooks/usePMCAuth';

export default function WardOfficerDashboard() {
  const { issues, updateIssueStatus } = useIssues();
  const { claims } = usePMCAuth();
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<IssueStatus>('reported');
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Filter issues specific to this Ward Officer's ward_id
  const wardId = claims?.ward_id || 'unassigned';
  const wardIssues = issues.filter(issue => (issue.ward_id || 'unassigned') === wardId);

  const stats = {
    total: wardIssues.length,
    reported: wardIssues.filter((i) => i.status === 'reported').length,
    inProgress: wardIssues.filter((i) => i.status === 'in-progress').length,
    resolved: wardIssues.filter((i) => i.status === 'resolved').length,
  };

  const handleUpdateStatus = () => {
    if (selectedIssueId) {
      updateIssueStatus(selectedIssueId, newStatus, resolutionNotes);
      toast.success('Issue status updated successfully!');
      setSelectedIssueId(null);
      setResolutionNotes('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tight">Ward Officer Dashboard</h2>
          <p className="text-muted-foreground capitalize">Managing issues for Ward: {wardId}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Ward Issues</CardTitle>
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
      </div>

      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="font-display">Assigned Issues</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Issue / Dept</TableHead>
                  <TableHead>Category / Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Reported</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wardIssues.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No issues found for this ward.
                    </TableCell>
                  </TableRow>
                ) : (
                  wardIssues.map((issue) => (
                    <TableRow key={issue.id}>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <p className="font-medium truncate">{issue.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{issue.description}</p>
                          {issue.dept_name && <p className="text-xs font-semibold mt-1 text-primary">{issue.dept_name}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant={issue.category as any}>
                            {CATEGORY_CONFIG[issue.category]?.icon} {CATEGORY_CONFIG[issue.category]?.label || issue.category}
                          </Badge>
                          {issue.assigned_incharge && (
                            <p className="text-xs text-muted-foreground mt-1">Incharge: <span className="font-medium">{issue.assigned_incharge}</span></p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={issue.status as any}>
                          {STATUS_CONFIG[issue.status]?.label || issue.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground max-w-[150px]">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{issue.location.address?.split(',')[0] || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(new Date(issue.reportedAt || Date.now()), { addSuffix: true })}
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
                                Update the status and add notes for this issue in your ward.
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
