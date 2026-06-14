import { useState, useEffect } from 'react';
import { Issue } from '@/types/issue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, MapPin, Clock, User, Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { ResolveIssueGeofence } from './ResolveIssueGeofence';
import { EscalationBadge } from './EscalationBadge';
import { useTicketDetailsListener } from '@/hooks/useTicketDetailsListener';
import { usePMCAuth } from '@/hooks/usePMCAuth';
import { formatDistanceToNow, format, isPast, differenceInHours } from 'date-fns';

interface IssueDetailsComponentProps {
  issueId: string;
}

export const IssueDetailsComponent = ({ issueId }: IssueDetailsComponentProps) => {
  const { user } = useAuth();
  const { claims } = usePMCAuth();
  const { ticket, loading } = useTicketDetailsListener({ ticketId: issueId });
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-lg font-semibold">Issue not found</p>
      </div>
    );
  }

  const isResolver = claims?.pmcRole === 'TECHNICIAN' || user?.uid === ticket.assignedTo;
  const canResolve = isResolver && ticket.status !== 'resolved';
  const isOverdue = ticket.deadline_at && isPast(new Date(ticket.deadline_at));
  const hoursUntilDeadline = ticket.deadline_at ? differenceInHours(new Date(ticket.deadline_at), new Date()) : null;

  return (
    <div className="space-y-6">
      {/* Header with Title */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{ticket.title}</h1>
            <p className="text-muted-foreground">{ticket.description}</p>
          </div>
          <Badge variant={ticket.status as 'reported' | 'in-progress' | 'resolved'}>
            {ticket.status}
          </Badge>
        </div>
      </div>

      {/* Escalation Info (if applicable) */}
      {ticket.escalation_level && ticket.escalation_level > 0 && (
        <EscalationBadge issue={ticket} />
      )}

      {/* Deadline Warning */}
      {ticket.deadline_at && (
        <div className={`border rounded-lg p-4 ${
          isOverdue ? 'bg-red-50 border-red-300' : 'bg-amber-50 border-amber-300'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Clock className={`w-5 h-5 ${isOverdue ? 'text-red-600' : 'text-amber-600'}`} />
            <span className={`font-semibold ${isOverdue ? 'text-red-800' : 'text-amber-800'}`}>
              {isOverdue ? 'OVERDUE' : 'Deadline approaching'}
            </span>
          </div>
          <p className={isOverdue ? 'text-red-700' : 'text-amber-700'}>
            {isOverdue ? (
              <>Deadline was {format(new Date(ticket.deadline_at), 'PPp')}</>
            ) : (
              <>Due in {Math.ceil(hoursUntilDeadline || 0)} hours - {format(new Date(ticket.deadline_at), 'PPp')}</>
            )}
          </p>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Location Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Address</p>
                <p className="font-semibold">{ticket.location.address || 'Address not available'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Coordinates</p>
                <p className="font-mono text-sm">
                  {ticket.location.lat.toFixed(6)}, {ticket.location.lng.toFixed(6)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Reported Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5" />
                Report Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Reported by</p>
                <p className="font-semibold">{ticket.reportedBy}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reported at</p>
                <p className="font-semibold">{formatDistanceToNow(ticket.reportedAt, { addSuffix: true })}</p>
              </div>
              {ticket.ward_name && (
                <div>
                  <p className="text-sm text-muted-foreground">Ward</p>
                  <p className="font-semibold">{ticket.ward_name}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resolution Info (if resolved) */}
          {ticket.status === 'resolved' && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-lg text-green-800 flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Resolution Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Resolved by</p>
                  <p className="font-semibold">{ticket.resolvedBy || 'Unknown'}</p>
                </div>
                {ticket.resolvedAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Resolved at</p>
                    <p className="font-semibold">{format(new Date(ticket.resolvedAt), 'PPp')}</p>
                  </div>
                )}
                {ticket.resolutionPhotoUrl && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Resolution Photo</p>
                    <img
                      src={ticket.resolutionPhotoUrl}
                      alt="Resolution"
                      className="w-full h-auto rounded border"
                    />
                  </div>
                )}
                {ticket.resolutionNotes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="font-semibold">{ticket.resolutionNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Actions */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {canResolve && (
                <>
                  <Button
                    onClick={() => setResolveDialogOpen(true)}
                    className="w-full"
                    size="lg"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Resolve with Geofence
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Verify your location with GPS and photo capture
                  </p>
                </>
              )}

              {!canResolve && ticket.status !== 'resolved' && (
                <div className="bg-gray-50 p-3 rounded border">
                  <p className="text-sm">
                    {claims?.pmcRole !== 'TECHNICIAN'
                      ? 'Only assigned technicians can resolve tickets via geofence'
                      : 'You are not assigned to this ticket'}
                  </p>
                </div>
              )}

              {ticket.status === 'resolved' && (
                <div className="bg-green-50 p-3 rounded border border-green-200">
                  <p className="text-sm font-semibold text-green-800">
                    ✓ This ticket has been resolved
                  </p>
                </div>
              )}

              {/* Metadata */}
              <div className="border-t pt-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category:</span>
                  <span className="font-semibold">{ticket.category}</span>
                </div>
                {ticket.severity && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Severity:</span>
                    <span className="font-semibold capitalize">{ticket.severity}</span>
                  </div>
                )}
                {ticket.assignedTo && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Assigned to:</span>
                    <span className="font-semibold">{ticket.assignedTo}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Geofence Resolution Dialog */}
      <ResolveIssueGeofence
        ticketId={issueId}
        open={resolveDialogOpen}
        onClose={() => setResolveDialogOpen(false)}
        onSuccess={() => {
          // Ticket will auto-update via real-time listener
        }}
      />
    </div>
  );
};
