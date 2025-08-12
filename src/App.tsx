import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useSystemColors } from "@/hooks/useSystemColors";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Integrations from "./pages/Integrations";
import Inbox from "./pages/Inbox";
import Kanban from "./pages/Kanban";
import Documentation from "./pages/Documentation";
import Admin from "./pages/Admin";
import Customization from "./pages/Customization";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Create query client outside component to prevent recreation
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppLayout>
              <Routes>
                <Route path="/" element={<div className="animate-fade-in"><Index /></div>} />
                <Route path="/auth" element={<div className="animate-fade-in"><Auth /></div>} />
                <Route path="/dashboard" element={
                  <div className="animate-fade-in">
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  </div>
                } />
                <Route path="/integrations" element={
                  <div className="animate-fade-in">
                    <ProtectedRoute>
                      <Integrations />
                    </ProtectedRoute>
                  </div>
                } />
                <Route path="/inbox" element={
                  <div className="animate-fade-in">
                    <ProtectedRoute>
                      <Inbox />
                    </ProtectedRoute>
                  </div>
                } />
                <Route path="/kanban" element={
                  <div className="animate-fade-in">
                    <ProtectedRoute>
                      <Kanban />
                    </ProtectedRoute>
                  </div>
                } />
                <Route path="/documentation" element={
                  <div className="animate-fade-in">
                    <ProtectedRoute>
                      <Documentation />
                    </ProtectedRoute>
                  </div>
                } />
                <Route path="/admin" element={
                  <div className="animate-fade-in">
                    <ProtectedRoute requireSuperAdmin>
                      <Admin />
                    </ProtectedRoute>
                  </div>
                } />
                <Route path="/customization" element={
                  <div className="animate-fade-in">
                    <ProtectedRoute requireSuperAdmin>
                      <Customization />
                    </ProtectedRoute>
                  </div>
                } />
                <Route path="*" element={<div className="animate-fade-in"><NotFound /></div>} />
              </Routes>
            </AppLayout>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;