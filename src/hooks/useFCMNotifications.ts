import { useEffect, useCallback } from 'react';
import { initFCM, setupFCMListener } from '@/lib/firebase';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc, arrayUnion, getFirestore } from 'firebase/firestore';

export const useFCMNotifications = () => {
  const { user } = useAuth();
  const db = getFirestore();

  // Initialize FCM and save token to Firestore
  useEffect(() => {
    if (!user) return;

    const initializeFCM = async () => {
      try {
        const token = await initFCM();
        if (token) {
          // Save token to Firestore user document
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            fcmTokens: arrayUnion(token)
          });
          console.log('FCM token saved to Firestore');
        }
      } catch (error) {
        console.error('Error initializing FCM:', error);
      }
    };

    initializeFCM();
  }, [user, db]);

  // Setup message listener
  useEffect(() => {
    const handleMessage = (payload: any) => {
      console.log('FCM message received:', payload);

      const title = payload.notification?.title || 'Notification';
      const body = payload.notification?.body || 'New update available';

      // Show toast notification
      toast.info(`${title}: ${body}`, {
        duration: 5000
      });

      // Handle specific notification types
      const data = payload.data || {};
      if (data.type === 'escalation') {
        // Could refresh the issue list or navigate to the escalated issue
        console.log('Escalation notification for ticket:', data.ticketId);
      } else if (data.type === 'resolution') {
        console.log('Resolution notification for ticket:', data.ticketId);
      }
    };

    try {
      setupFCMListener(handleMessage);
    } catch (error) {
      console.error('Error setting up FCM listener:', error);
    }
  }, []);
};
