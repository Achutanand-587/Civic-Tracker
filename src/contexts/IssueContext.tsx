import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Issue, IssueStatus, IssueCategory } from '@/types/issue';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  increment,
  arrayUnion,
  getDoc
} from 'firebase/firestore';

interface IssueContextType {
  issues: Issue[];
  loading: boolean;
  addIssue: (issue: Omit<Issue, 'id' | 'upvotes' | 'reportedAt' | 'updatedAt'>) => Promise<void>;
  updateIssueStatus: (id: string, status: IssueStatus, notes?: string) => Promise<void>;
  upvoteIssue: (id: string) => Promise<void>;
  getIssueById: (id: string) => Issue | undefined;
  filterByStatus: (status: IssueStatus | 'all') => Issue[];
  filterByCategory: (category: IssueCategory | 'all') => Issue[];
}

const IssueContext = createContext<IssueContextType | undefined>(undefined);

const ISSUES_COLLECTION = 'issues';

export const IssueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Subscribe to Firestore issues collection
  useEffect(() => {
    const q = query(collection(db, ISSUES_COLLECTION), orderBy('reportedAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const issuesData: Issue[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
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
        } as Issue;
      });
      setIssues(issuesData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching issues:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const addIssue = useCallback(async (issueData: Omit<Issue, 'id' | 'upvotes' | 'reportedAt' | 'updatedAt'>) => {
    if (!user) {
      throw new Error('User must be logged in to report an issue');
    }

    const now = Timestamp.now();

    // Compute deadline based on severity
    const SLA_HOURS: Record<string, number> = {
      critical: 4,
      high: 24,
      medium: 72,
      low: 168  // 7 days
    };

    const hours = SLA_HOURS[issueData.severity as string] ?? 72;
    const deadlineDate = new Date();
    deadlineDate.setHours(deadlineDate.getHours() + hours);

    await addDoc(collection(db, ISSUES_COLLECTION), {
      ...issueData,
      upvotes: 0,
      upvotedBy: [],
      reportedAt: now,
      updatedAt: now,
      deadline_at: Timestamp.fromDate(deadlineDate),
      escalation_level: 0,
      escalation_history: []
    });
  }, [user]);

  const updateIssueStatus = useCallback(async (id: string, status: IssueStatus, notes?: string) => {
    const issueRef = doc(db, ISSUES_COLLECTION, id);
    const updateData: Record<string, unknown> = {
      status,
      updatedAt: Timestamp.now(),
    };
    if (notes) {
      updateData.resolutionNotes = notes;
    }
    await updateDoc(issueRef, updateData);
  }, []);

  const upvoteIssue = useCallback(async (id: string) => {
    if (!user) {
      throw new Error('User must be logged in to upvote');
    }

    const issueRef = doc(db, ISSUES_COLLECTION, id);
    const issueDoc = await getDoc(issueRef);

    if (!issueDoc.exists()) {
      throw new Error('Issue not found');
    }

    const issueData = issueDoc.data() as Issue;
    const upvotedBy = issueData.upvotedBy || [];

    if (upvotedBy.includes(user.uid)) {
      throw new Error('You have already upvoted this issue');
    }

    await updateDoc(issueRef, {
      upvotes: increment(1),
      upvotedBy: arrayUnion(user.uid)
    });
  }, [user]);

  const getIssueById = useCallback((id: string) => {
    return issues.find(issue => issue.id === id);
  }, [issues]);

  const filterByStatus = useCallback((status: IssueStatus | 'all') => {
    if (status === 'all') return issues;
    return issues.filter(issue => issue.status === status);
  }, [issues]);

  const filterByCategory = useCallback((category: IssueCategory | 'all') => {
    if (category === 'all') return issues;
    return issues.filter(issue => issue.category === category);
  }, [issues]);

  return (
    <IssueContext.Provider
      value={{
        issues,
        loading,
        addIssue,
        updateIssueStatus,
        upvoteIssue,
        getIssueById,
        filterByStatus,
        filterByCategory,
      }}
    >
      {children}
    </IssueContext.Provider>
  );
};

export const useIssues = () => {
  const context = useContext(IssueContext);
  if (!context) {
    throw new Error('useIssues must be used within an IssueProvider');
  }
  return context;
};
