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

import Time from "./pages/Time";
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
  // Sistema de configurações globais agora está no SystemConfigProvider
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<div className="animate-fade-in"><Auth /></div>} />
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={
                <AppLayout>
                  <div className="animate-fade-in">
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  </div>
                </AppLayout>
              } />
              <Route path="/time" element={
                <AppLayout>
                  <div className="animate-fade-in">
                    <ProtectedRoute>
                      <Time />
                    </ProtectedRoute>
                  </div>
                </AppLayout>
              } />
              <Route path="/integrations" element={
                <AppLayout>
                  <div className="animate-fade-in">
                    <ProtectedRoute>
                      <Integrations />
                    </ProtectedRoute>
                  </div>
                </AppLayout>
              } />
              <Route path="/inbox" element={
                <AppLayout>
                  <div className="animate-fade-in">
                    <ProtectedRoute>
                      <Inbox />
                    </ProtectedRoute>
                  </div>
                </AppLayout>
              } />
              <Route path="/kanban" element={
                <AppLayout>
                  <div className="animate-fade-in">
                    <ProtectedRoute>
                      <Kanban />
                    </ProtectedRoute>
                  </div>
                </AppLayout>
              } />
              <Route path="/documentation" element={
                <AppLayout>
                  <div className="animate-fade-in">
                    <ProtectedRoute>
                      <Documentation />
                    </ProtectedRoute>
                  </div>
                </AppLayout>
              } />
              <Route path="/admin" element={
                <AppLayout>
                  <div className="animate-fade-in">
                    <ProtectedRoute requireSuperAdmin>
                      <Admin />
                    </ProtectedRoute>
                  </div>
                </AppLayout>
              } />
              <Route path="/customization" element={
                <AppLayout>
                  <div className="animate-fade-in">
                    <ProtectedRoute requireSuperAdmin>
                      <Customization />
                    </ProtectedRoute>
                  </div>
                </AppLayout>
              } />
              <Route path="*" element={
                <AppLayout>
                  <div className="animate-fade-in"><NotFound /></div>
                </AppLayout>
              } />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;