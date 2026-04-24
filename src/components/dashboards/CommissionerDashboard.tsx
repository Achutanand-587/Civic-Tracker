import { useIssues } from '@/contexts/IssueContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useState, useMemo } from 'react';
import { CATEGORY_CONFIG, STATUS_CONFIG } from '@/types/issue';
import { BarChart, Activity, CheckCircle, Clock } from 'lucide-react';

export default function CommissionerDashboard() {
  const { issues } = useIssues();
  const [selectedWard, setSelectedWard] = useState<string | null>(null);

  const stats = useMemo(() => {
    return {
      total: issues.length,
      resolved: issues.filter(i => i.status === 'resolved').length,
      inProgress: issues.filter(i => i.status === 'in-progress').length,
      reported: issues.filter(i => i.status === 'reported').length,
    };
  }, [issues]);

  const wardPerformance = useMemo(() => {
    const wards: Record<string, { total: number, resolved: number, inProgress: number, reported: number }> = {};
    issues.forEach(issue => {
      const wId = issue.ward_id || 'unassigned';
      if (!wards[wId]) {
        wards[wId] = { total: 0, resolved: 0, inProgress: 0, reported: 0 };
      }
      wards[wId].total += 1;
      if (issue.status === 'resolved') wards[wId].resolved += 1;
      else if (issue.status === 'in-progress') wards[wId].inProgress += 1;
      else wards[wId].reported += 1;
    });
    return wards;
  }, [issues]);

  const displayedWardIssues = useMemo(() => {
    if (!selectedWard) return [];
    return issues.filter(i => (i.ward_id || 'unassigned') === selectedWard);
  }, [selectedWard, issues]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-display font-bold tracking-tight">City Overview (Commissioner)</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-status-resolved/10 border-status-resolved/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-status-resolved">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-status-resolved" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-status-resolved">{stats.resolved}</div>
          </CardContent>
        </Card>
        <Card className="bg-status-in-progress/10 border-status-in-progress/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-status-in-progress">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-status-in-progress" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-status-in-progress">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card className="bg-status-reported/10 border-status-reported/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-status-reported">Reported</CardTitle>
            <BarChart className="h-4 w-4 text-status-reported" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-display text-status-reported">{stats.reported}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-gradient-card border-border/50">
          <CardHeader>
            <CardTitle className="font-display">Ward Performance Tracker</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ward</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Resolved</TableHead>
                  <TableHead>Pending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(wardPerformance).map(([ward, data]) => (
                  <TableRow 
                    key={ward} 
                    className={`cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${selectedWard === ward ? 'bg-slate-100 dark:bg-slate-800' : ''}`} 
                    onClick={() => setSelectedWard(ward)}
                  >
                    <TableCell className="font-medium capitalize">{ward}</TableCell>
                    <TableCell>{data.total}</TableCell>
                    <TableCell className="text-status-resolved font-medium">{data.resolved}</TableCell>
                    <TableCell>{data.reported + data.inProgress}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {selectedWard ? (
          <Card className="bg-gradient-card border-border/50">
            <CardHeader>
              <CardTitle className="font-display capitalize">Issues in {selectedWard}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[300px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Issue</TableHead>
                      <TableHead>Category / Dept</TableHead>
                      <TableHead>Assigned To</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedWardIssues.map(issue => (
                      <TableRow key={issue.id}>
                        <TableCell className="font-medium">
                          <p className="truncate max-w-[150px]">{issue.title}</p>
                          {issue.ward_name && <p className="text-xs text-muted-foreground">{issue.ward_name}</p>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={issue.category as any}>{CATEGORY_CONFIG[issue.category]?.label || issue.category}</Badge>
                          {issue.dept_name && <p className="text-xs text-muted-foreground mt-1">{issue.dept_name}</p>}
                        </TableCell>
                        <TableCell>
                          {issue.assigned_incharge ? (
                            <span className="text-sm font-medium">{issue.assigned_incharge}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={issue.status as any}>{STATUS_CONFIG[issue.status]?.label || issue.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex items-center justify-center p-8 text-muted-foreground bg-slate-50/50 dark:bg-slate-900/50 border-dashed">
            <p>Select a ward from the table to view its detailed issues.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
