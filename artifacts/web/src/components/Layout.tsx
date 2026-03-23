import { ReactNode, useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import {
  Home, BarChart2, Users, Calendar, ClipboardList,
  Settings, LogOut, Menu, X, ChevronDown, ChevronRight,
  Shield, BookOpen, UserCheck, Layers, CalendarDays, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  requiresSuper?: boolean;
  requiresInvisible?: boolean;
  children?: NavItem[];
}

function NavLink({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isActive
              ? "bg-amber-500/20 text-amber-400"
              : "text-gray-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          <span className="flex-shrink-0">{item.icon}</span>
          <span className="flex-1 text-left">{item.label}</span>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        {open && (
          <div className="ml-4 mt-1 space-y-1 border-l border-white/10 pl-3">
            {item.children.map((child) => (
              <NavLink key={child.href} item={child} onClick={onClick} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? "bg-amber-500/20 text-amber-400"
          : "text-gray-300 hover:bg-white/5 hover:text-white"
      }`}
    >
      <span className="flex-shrink-0">{item.icon}</span>
      <span>{item.label}</span>
    </Link>
  );
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, logout, isSuperusuario } = useAuth();
  const [, navigate] = useLocation();

  const isColector = user?.rol === "estandar" && !user?.isInvisible;

  const navItems: NavItem[] = [
    { label: "Inicio", href: "/", icon: <Home size={16} /> },
    ...(isSuperusuario()
      ? [{ label: "Dashboard", href: "/dashboard", icon: <BarChart2 size={16} /> }]
      : []),
    ...(isColector
      ? [{ label: "Dashboard", href: "/colector-dashboard", icon: <BarChart2 size={16} /> }]
      : []),
    ...(isSuperusuario()
      ? [{
          label: "Administración", href: "/admin", icon: <Settings size={16} />,
          children: [
            { label: "Historial", href: "/admin/historial", icon: <BookOpen size={14} /> },
            { label: "Usuarios", href: "/admin/usuarios", icon: <UserCheck size={14} /> },
            { label: "Pelotones", href: "/admin/pelotones", icon: <Shield size={14} /> },
            { label: "Personas", href: "/admin/personas", icon: <Users size={14} /> },
            { label: "Procesos", href: "/admin/procesos", icon: <Layers size={14} /> },
            { label: "Calendario", href: "/admin/asistencias", icon: <CalendarDays size={14} /> },
            { label: "Control Asistencia", href: "/admin/bloqueo", icon: <Lock size={14} /> },
          ],
        }]
      : []),
    ...(user?.isInvisible
      ? [{ label: "Calendario", href: "/admin/asistencias", icon: <Calendar size={16} /> }]
      : []),
  ];

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="flex flex-col h-full bg-[#0D1B2A] border-r border-white/10">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <Shield size={16} className="text-amber-400" />
          </div>
          <div>
            <div className="text-white font-semibold text-sm leading-tight">GPA</div>
            <div className="text-gray-500 text-xs">Sistema de Asistencia</div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} onClick={onClose} />
        ))}
      </nav>

      <div className="p-3 border-t border-white/10">
        <div className="px-3 py-2 mb-2">
          <div className="text-white text-sm font-medium truncate">{user?.nombre}</div>
          <div className="text-gray-400 text-xs truncate">{user?.email}</div>
          {user?.pelotonNombre && (
            <div className="text-amber-400 text-xs mt-1">{user.pelotonNombre}</div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start text-gray-400 hover:text-white hover:bg-white/5"
        >
          <LogOut size={14} className="mr-2" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#0D1B2A]">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 z-50">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-[#0D1B2A] border-b border-white/10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-white"
          >
            <Menu size={20} />
          </button>
          <span className="text-white font-semibold">GPA</span>
        </div>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
