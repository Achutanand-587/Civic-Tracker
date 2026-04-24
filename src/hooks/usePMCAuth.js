import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

export function usePMCAuth() {
  const [user, setUser] = useState(null);
  const [claims, setClaims] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          // Fetch the JWT Token Result which contains our custom claims
          // Pass true to forceRefresh if you want to ensure the latest claims are fetched
          const tokenResult = await currentUser.getIdTokenResult(false);
          setClaims({
            pmcRole: tokenResult.claims.pmcRole || null,
            ward_id: tokenResult.claims.ward_id || null,
            dept_id: tokenResult.claims.dept_id || null,
            access_level: tokenResult.claims.pmc_access_level || null
          });
        } catch (error) {
          console.error("Error fetching custom claims:", error);
          setClaims(null);
        }
      } else {
        setUser(null);
        setClaims(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, claims, loading };
}
