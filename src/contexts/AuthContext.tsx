import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { UserProfile } from '@/types/user';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Subscribe to user profile changes
        const unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), (doc) => {
          if (doc.exists()) {
            // Convert Firestore Timestamp to Date if necessary, or let it be handled
            // Ideally we handle the data transformation here.
            const data = doc.data();
            setUserProfile({
              uid: user.uid,
              email: user.email || '',
              fullName: data.fullName,
              phoneNumber: data.phoneNumber,
              address: data.address,
              dob: data.dob,

              createdAt: data.createdAt?.toDate() || new Date(),
            } as UserProfile);
          } else {
            setUserProfile(null);
          }
          setLoading(false);
        });
        return () => unsubscribeProfile();
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const signUp = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signUp, signIn, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
