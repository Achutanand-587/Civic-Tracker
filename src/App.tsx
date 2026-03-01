import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { IssueProvider } from "@/contexts/IssueContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Issues from "./pages/Issues";
import Report from "./pages/Report";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";

import NotFound from "./pages/NotFound";
import { useAuth } from "./contexts/AuthContext";
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// ProfileGuard removed
const ProfileGuard = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <IssueProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ProfileGuard>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/issues" element={<Issues />} />
                <Route path="/report" element={<Report />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ProfileGuard>
          </BrowserRouter>
        </TooltipProvider>
      </IssueProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
