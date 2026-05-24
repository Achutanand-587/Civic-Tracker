import { AlertTriangle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { differenceInHours, isPast } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Issue } from '@/types/issue';

interface EscalationBadgeProps {
  issue: Issue;
}

export const EscalationBadge = ({ issue }: EscalationBadgeProps) => {
  if (!issue.deadline_at || issue.escalation_level === 0) {
    return null;
  }

  const isOverdue = issue.deadline_at && isPast(new Date(issue.deadline_at));
  const hoursOverdue = issue.deadline_at ? -differenceInHours(new Date(), new Date(issue.deadline_at)) : 0;

  const escalationLevelNames = ['Technician', 'Ward Officer', 'Commissioner'];
  const levelName = escalationLevelNames[issue.escalation_level] || 'Unknown';

  const getColorScheme = () => {
    switch (issue.escalation_level) {
      case 1:
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 2:
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className={`border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow ${getColorScheme()}`}>
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">
                Escalated to {levelName}
              </div>
              {isOverdue && (
                <div className="flex items-center gap-1 mt-1 text-xs">
                  <Clock className="w-3 h-3" />
                  <span>{Math.round(hoursOverdue)} hours overdue</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Escalation History</DialogTitle>
          <DialogDescription>
            Track the escalation timeline for this issue
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Status */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Current Status</h3>
            <div className="space-y-1 text-sm text-blue-800">
              <p>
                <strong>Escalation Level:</strong> {escalationLevelNames[issue.escalation_level] || 'Unknown'}
              </p>
              {issue.deadline_at && (
                <p>
                  <strong>Deadline:</strong> {new Date(issue.deadline_at).toLocaleString()}
                </p>
              )}
              {isOverdue && (
                <p className="text-red-600">
                  <strong>Status:</strong> OVERDUE by {Math.round(hoursOverdue)} hours
                </p>
              )}
            </div>
          </div>

          {/* History Timeline */}
          {issue.escalation_history && issue.escalation_history.length > 0 ? (
            <div className="space-y-3">
              <h3 className="font-semibold">Timeline</h3>
              <div className="space-y-4">
                {issue.escalation_history.map((entry, idx) => (
                  <div key={idx} className="relative pl-6 pb-4 border-l border-gray-300 last:border-l-transparent">
                    <div className="absolute -left-2.5 top-0 w-5 h-5 bg-white border-2 border-gray-400 rounded-full" />

                    <div className="space-y-1">
                      <div className="font-medium text-sm">
                        {escalationLevelNames[entry.fromLevel]} → {escalationLevelNames[entry.toLevel]}
                      </div>
                      <div className="text-xs text-gray-600">
                        {new Date(entry.escalatedAt).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        Reason: {entry.reason === 'SLA_BREACH' ? 'SLA Breach' : entry.reason}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500 p-3 bg-gray-50 rounded">
              No escalation history yet
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
