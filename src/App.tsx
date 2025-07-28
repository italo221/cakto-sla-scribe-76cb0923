import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { useSystemColors } from "@/hooks/useSystemColors";
import ProtectedRoute from "@/components/ProtectedRoute";
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
  // Carregar cores do sistema na inicialização
  useSystemColors();
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="animate-fade-in">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/integrations" element={
                  <ProtectedRoute>
                    <Integrations />
                  </ProtectedRoute>
                } />
                <Route path="/inbox" element={
                  <ProtectedRoute>
                    <Inbox />
                  </ProtectedRoute>
                } />
                <Route path="/kanban" element={
                  <ProtectedRoute>
                    <Kanban />
                  </ProtectedRoute>
                } />
                <Route path="/documentation" element={
                  <ProtectedRoute>
                    <Documentation />
                  </ProtectedRoute>
                } />
                <Route path="/admin" element={
                  <ProtectedRoute requireSuperAdmin>
                    <Admin />
                  </ProtectedRoute>
                } />
                <Route path="/customization" element={
                  <ProtectedRoute requireSuperAdmin>
                    <Customization />
                  </ProtectedRoute>
                } />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;