import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import QRLandingPage from "./pages/QRLandingPage";
import AnonymousComplaintPage from "./pages/AnonymousComplaintPage";
import DashboardPage from "./pages/DashboardPage";
import RoomsPage from "./pages/RoomsPage";
import RoomDetailPage from "./pages/RoomDetailPage";
import ComplaintsPage from "./pages/ComplaintsPage";
import CleaningPage from "./pages/CleaningPage";
import CleaningRoomPage from "./pages/CleaningRoomPage";
import UsersPage from "./pages/UsersPage";
import QRManagementPage from "./pages/QRManagementPage";
import ReportsPage from "./pages/ReportsPage";
import NotificationsPage from "./pages/NotificationsPage";
import UserComplaintPage from "./pages/UserComplaintPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode; roles?: string[] }) => {
  const { user, profile, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && profile && !roles.includes(profile.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/qr/:token" element={<QRLandingPage />} />
              <Route path="/complaint/anonymous/:roomId" element={<AnonymousComplaintPage />} />
              <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/rooms" element={<ProtectedRoute roles={['admin', 'manager']}><RoomsPage /></ProtectedRoute>} />
              <Route path="/rooms/:id" element={<ProtectedRoute roles={['admin', 'manager']}><RoomDetailPage /></ProtectedRoute>} />
              <Route path="/complaints" element={<ProtectedRoute roles={['admin', 'manager', 'user']}><ComplaintsPage /></ProtectedRoute>} />
              <Route path="/complaint/room/:roomId" element={<ProtectedRoute><UserComplaintPage /></ProtectedRoute>} />
              <Route path="/cleaning" element={<ProtectedRoute roles={['admin', 'manager', 'cleaner']}><CleaningPage /></ProtectedRoute>} />
              <Route path="/cleaning/room/:roomId" element={<ProtectedRoute roles={['admin', 'cleaner']}><CleaningRoomPage /></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute roles={['admin']}><UsersPage /></ProtectedRoute>} />
              <Route path="/qr-management" element={<ProtectedRoute roles={['admin']}><QRManagementPage /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute roles={['admin', 'manager']}><ReportsPage /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute roles={['admin']}><SettingsPage /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
