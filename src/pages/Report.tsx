import Header from '@/components/Header';
import ReportForm from '@/components/ReportForm';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate, Navigate } from 'react-router-dom';
import { Lock } from 'lucide-react';

const Report = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user?.email === 'admin@civic.com') {
    return <Navigate to="/admin" replace />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-hero">
        <Header />
        <main className="container py-8 flex items-center justify-center min-h-[calc(100vh-80px)]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-md p-6 bg-card rounded-lg shadow-lg border border-border"
          >
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
            <p className="text-muted-foreground mb-6">
              Please sign in to report an issue. This helps us ensure validity and keep you updated.
            </p>
            <Button onClick={() => navigate('/login')} className="w-full">
              Sign In
            </Button>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Header />

      <main className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Report a Civic Issue
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Help make your community better by reporting issues that need attention. Your reports are reviewed by municipal authorities.
          </p>
        </motion.div>

        <ReportForm />
      </main>
    </div>
  );
};

export default Report;
