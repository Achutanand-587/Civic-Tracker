import { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, getFirestore } from 'firebase/firestore';
import { Issue } from '@/types/issue';
import { toast } from 'sonner';

interface UseTicketDetailsListenerProps {
  ticketId: string;
  onUpdate?: (ticket: Issue) => void;
}

export const useTicketDetailsListener = ({ ticketId, onUpdate }: UseTicketDetailsListenerProps) => {
  const [ticket, setTicket] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const db = getFirestore();
  const prevStatus = useRef<string>();
  const prevEscalationLevel = useRef<number>();

  useEffect(() => {
    if (!ticketId) return;

    const ticketRef = doc(db, 'issues', ticketId);

    const unsubscribe = onSnapshot(
      ticketRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setTicket(null);
          setLoading(false);
          return;
        }

        const data = snapshot.data();
        const ticketData: Issue = {
          id: snapshot.id,
          title: data.title,
          description: data.description,
          category: data.category,
          status: data.status,
          location: data.location,
          imageUrl: data.imageUrl,
          upvotes: data.upvotes || 0,
          upvotedBy: data.upvotedBy || [],
          reportedBy: data.reportedBy,
          reportedAt: data.reportedAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          assignedTo: data.assignedTo,
          resolutionNotes: data.resolutionNotes,
          resolutionPhotoUrl: data.resolutionPhotoUrl,
          resolvedAt: data.resolvedAt?.toDate(),
          resolvedBy: data.resolvedBy,
          resolvedCoords: data.resolvedCoords,
          ward_id: data.ward_id,
          dept_id: data.dept_id,
          ward_name: data.ward_name,
          dept_name: data.dept_name,
          assigned_incharge: data.assigned_incharge,
          severity: data.severity,
          deadline_at: data.deadline_at?.toDate(),
          escalation_level: data.escalation_level ?? 0,
          escalation_history: (data.escalation_history || []).map((entry: any) => ({
            ...entry,
            escalatedAt: entry.escalatedAt?.toDate() || new Date()
          })),
          last_escalated_at: data.last_escalated_at?.toDate()
        };

        setTicket(ticketData);
        setLoading(false);

        // Show snackbar on status change
        if (prevStatus.current && prevStatus.current !== ticketData.status) {
          toast.info(`Ticket status updated to: ${ticketData.status}`);
        }

        // Show snackbar on escalation change
        if (
          prevEscalationLevel.current !== undefined &&
          prevEscalationLevel.current !== ticketData.escalation_level
        ) {
          const levelNames = ['Technician', 'Ward Officer', 'Commissioner'];
          toast.warning(
            `Ticket escalated to ${levelNames[ticketData.escalation_level] || 'Unknown'}`
          );
        }

        prevStatus.current = ticketData.status;
        prevEscalationLevel.current = ticketData.escalation_level;

        if (onUpdate) {
          onUpdate(ticketData);
        }
      },
      (error) => {
        console.error('Error listening to ticket:', error);
        toast.error('Failed to load ticket details');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [ticketId, db, onUpdate]);

  return { ticket, loading };
};
