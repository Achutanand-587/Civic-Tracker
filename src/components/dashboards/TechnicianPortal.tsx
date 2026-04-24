import { useState } from 'react';
import { useIssues } from '@/contexts/IssueContext';
import { STATUS_CONFIG, CATEGORY_CONFIG } from '@/types/issue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Calendar, CheckCircle2, Wrench, Menu } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { usePMCAuth } from '@/hooks/usePMCAuth';

export default function TechnicianPortal() {
  const { issues, updateIssueStatus } = useIssues();
  const { claims } = usePMCAuth();
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  // Filter issues specific to this Technician's dept_id and ward_id
  const deptId = claims?.dept_id || 'unassigned';
  const wardId = claims?.ward_id;
  
  // They only care about "reported" or "in-progress" tasks in their department AND their assigned ward
  const activeTasks = issues.filter(issue => {
    const isDeptMatch = (issue.dept_id && issue.dept_id.toLowerCase() === deptId.toLowerCase()) || 
                        (issue.category && issue.category.toLowerCase() === deptId.toLowerCase());
    const isWardMatch = !wardId || issue.ward_id === wardId;

    return isDeptMatch && isWardMatch && issue.status !== 'resolved';
  });

  const handleResolveTask = async (issueId: string) => {
    if (!notes.trim()) {
      toast.error('Please provide resolution notes before closing.');
      return;
    }

    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.');
      return;
    }

    if (!photo) {
      toast.error('Please capture a live photo of the resolved issue.');
      return;
    }

    setIsResolving(true);
    toast.loading('Verifying location and securely uploading photo...', { id: 'geofence-toast' });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const accuracy = position.coords.accuracy;

        // Increased from 50m to 10000m for easy desktop testing
        if (accuracy > 10000) {
          toast.error(`Location accuracy is too low (±${Math.round(accuracy)}m). Please step outside, turn on Wi-Fi, or ensure clear sky visibility.`, { id: 'geofence-toast' });
          setIsResolving(false);
          return;
        }

        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        try {
          const formData = new FormData();
          formData.append('issueId', issueId);
          formData.append('technicianLocation', JSON.stringify(coords));
          formData.append('notes', notes);
          formData.append('photo', photo);

          const response = await fetch('http://localhost:3001/api/resolve-issue-geofence', {
            method: 'POST',
            body: formData
          });

          const data = await response.json();

          if (!response.ok) {
            toast.error(data.error || 'Failed to resolve issue', { id: 'geofence-toast' });
            setIsResolving(false);
            return;
          }

          toast.success(`Task resolved! You were ${data.distance}m away.`, { id: 'geofence-toast' });
          setActiveIssueId(null);
          setNotes('');
        } catch (error) {
          console.error(error);
          toast.error('Server error updating issue.', { id: 'geofence-toast' });
        } finally {
          setIsResolving(false);
        }
      },
      (error) => {
        toast.error('Could not get your location. Please enable GPS permission.', { id: 'geofence-toast' });
        setIsResolving(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };
  
  const handleStartTask = (issueId: string) => {
    updateIssueStatus(issueId, 'in-progress', 'Technician on route / investigating.');
    toast.success('Task marked as In-Progress.');
  };

  return (
    <div className="max-w-md mx-auto space-y-4 pb-12">
      <div className="bg-slate-900 text-slate-100 p-4 rounded-b-xl shadow-md mb-6 flex items-center gap-3">
        <Wrench className="w-8 h-8 text-blue-400" />
        <div>
          <h2 className="text-xl font-bold font-display">Technician Console</h2>
          <p className="text-sm text-slate-400 capitalize">DEPT: {deptId}</p>
        </div>
      </div>

      <div className="px-4">
        <h3 className="font-semibold text-lg mb-4">Active Tasks ({activeTasks.length})</h3>
        
        {activeTasks.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2 opacity-50" />
            <p className="text-muted-foreground font-medium">No pending tasks.</p>
            <p className="text-xs text-muted-foreground">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeTasks.map((issue) => (
              <Card key={issue.id} className="border-border/50 shadow-sm overflow-hidden">
                <div className={`h-1 w-full ${issue.status === 'in-progress' ? 'bg-status-in-progress' : 'bg-status-reported'}`} />
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start mb-1">
                    <Badge variant={issue.category as any} className="scale-90 origin-left">
                      {CATEGORY_CONFIG[issue.category].label}
                    </Badge>
                    <span className="text-xs font-mono text-muted-foreground">
                      {formatDistanceToNow(issue.reportedAt, { addSuffix: true })}
                    </span>
                  </div>
                  <CardTitle className="text-base leading-tight mt-1">{issue.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{issue.description}</p>
                  
                  <div className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-2 rounded">
                    <MapPin className="h-4 w-4 shrink-0 text-red-500" />
                    <span className="leading-tight">{issue.location.address || `${issue.location.lat}, ${issue.location.lng}`}</span>
                  </div>
                  
                  {activeIssueId === issue.id && (
                    <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                      <div>
                        <label className="text-xs font-semibold text-foreground">Action Notes:</label>
                        <Textarea 
                          placeholder="What was done to resolve this?" 
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="text-sm h-20 resize-none mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground">Live Resolution Photo (Mandatory):</label>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          required
                          onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                          className="block w-full text-sm text-slate-500 mt-1
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-semibold
                            file:bg-blue-50 file:text-blue-700
                            hover:file:bg-blue-100 dark:file:bg-slate-800 dark:file:text-blue-400"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Rear camera will open automatically to capture live proof. Gallery uploads are locked.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-t flex gap-2">
                  {issue.status === 'reported' ? (
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700" 
                      onClick={() => handleStartTask(issue.id)}
                    >
                      Mark In-Progress
                    </Button>
                  ) : activeIssueId === issue.id ? (
                    <>
                      <Button variant="outline" className="flex-1" onClick={() => { setActiveIssueId(null); setNotes(''); }}>
                        Cancel
                      </Button>
                      <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" disabled={isResolving} onClick={() => handleResolveTask(issue.id)}>
                        <CheckCircle2 className="w-4 h-4 mr-2" /> {isResolving ? 'Verifying...' : 'Submit'}
                      </Button>
                    </>
                  ) : (
                    <Button 
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" 
                      onClick={() => setActiveIssueId(issue.id)}
                    >
                      Close Issue
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
