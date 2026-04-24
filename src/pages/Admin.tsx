import { useAuth } from '@/contexts/AuthContext';
import { usePMCAuth } from '@/hooks/usePMCAuth';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

import CommissionerDashboard from '@/components/dashboards/CommissionerDashboard';
import WardOfficerDashboard from '@/components/dashboards/WardOfficerDashboard';
import TechnicianPortal from '@/components/dashboards/TechnicianPortal';

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const { claims, loading: claimsLoading } = usePMCAuth();
  const navigate = useNavigate();

  const isLoading = authLoading || claimsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // They must be logged in. Wait to let useEffect navigate, or do it explicitly.
  if (!user) {
    // Ideally use useEffect for navigate, but simple return works with react-router in this pattern if wrapped
    setTimeout(() => navigate('/admin/login'), 0);
    return null;
  }

  // Render the specific portal
  const renderDashboard = () => {
    switch (claims?.pmcRole) {
      case 'COMMISSIONER':
        return <CommissionerDashboard />;
      case 'WARD_OFFICER':
        return <WardOfficerDashboard />;
      case 'HOD':
      case 'JUNIOR_ENGINEER':
      case 'TECHNICIAN':
        return <TechnicianPortal />;
      default:
        // Unauthorized role
        return (
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <ShieldAlert className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Insufficient Permissions</h2>
            <p className="text-muted-foreground mb-6 max-w-md text-center">
              Your account ({user.email}) does not have an active municipal role assigned. 
              Please contact the IT department to provision your Custom Claims.
            </p>
            <Button onClick={() => navigate('/')}>Return to Public Site</Button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col">
      <Header />

      <main className="container py-8 flex-1">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="h-full"
        >
          {renderDashboard()}
        </motion.div>
      </main>
    </div>
  );
};

export default Admin;
