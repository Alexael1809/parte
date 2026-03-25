import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ReactNode, useEffect } from "react";
import { Loader2 } from "lucide-react";

import LoginPage from "@/pages/login";
import HomePage from "@/pages/home";
import DashboardPage from "@/pages/dashboard";
import AsistenciaPage from "@/pages/asistencia";
import HistorialPage from "@/pages/historial";
import HistorialDetallePage from "@/pages/historial-detalle";
import PelotonesPage from "@/pages/admin/pelotones";
import PersonasPage from "@/pages/admin/personas";
import ProcesosPage from "@/pages/admin/procesos";
import UsuariosPage from "@/pages/admin/usuarios";
import AsistenciasCalendario from "@/pages/admin/asistencias";
import BloqueoPage from "@/pages/admin/bloqueo";
import ColectorDashboardPage from "@/pages/colector-dashboard";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [isLoading, user, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0D1B2A]">
        <Loader2 size={28} className="animate-spin text-amber-400" />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0D1B2A]">
      <div className="text-center">
        <div className="text-6xl font-bold text-amber-400/30 mb-4">404</div>
        <p className="text-gray-400">Página no encontrada</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />

      <Route path="/">
        {() => <ProtectedRoute><HomePage /></ProtectedRoute>}
      </Route>

      <Route path="/dashboard">
        {() => <ProtectedRoute><DashboardPage /></ProtectedRoute>}
      </Route>

      <Route path="/asistencia/:pelotonId">
        {(params) => <ProtectedRoute><AsistenciaPage /></ProtectedRoute>}
      </Route>

      <Route path="/asistencia">
        {() => <ProtectedRoute><HomePage /></ProtectedRoute>}
      </Route>

      <Route path="/colector-dashboard">
        {() => <ProtectedRoute><ColectorDashboardPage /></ProtectedRoute>}
      </Route>

      <Route path="/admin/historial/:personaId">
        {() => <ProtectedRoute><HistorialDetallePage /></ProtectedRoute>}
      </Route>

      <Route path="/admin/historial">
        {() => <ProtectedRoute><HistorialPage /></ProtectedRoute>}
      </Route>

      <Route path="/admin/pelotones">
        {() => <ProtectedRoute><PelotonesPage /></ProtectedRoute>}
      </Route>

      <Route path="/admin/personas">
        {() => <ProtectedRoute><PersonasPage /></ProtectedRoute>}
      </Route>

      <Route path="/admin/procesos">
        {() => <ProtectedRoute><ProcesosPage /></ProtectedRoute>}
      </Route>

      <Route path="/admin/usuarios">
        {() => <ProtectedRoute><UsuariosPage /></ProtectedRoute>}
      </Route>

      <Route path="/admin/asistencias">
        {() => <ProtectedRoute><AsistenciasCalendario /></ProtectedRoute>}
      </Route>

      <Route path="/admin/bloqueo">
        {() => <ProtectedRoute><BloqueoPage /></ProtectedRoute>}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
