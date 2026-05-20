import * as React from "react";
import { 
  BarChart3, 
  BookText, 
  FileText, 
  Home, 
  LogOut, 
  Search, 
  Menu,
  Database,
  Users,
  Map as MapIcon,
  Files,
  ShieldCheck,
  Clock as ClockIcon,
  Bell,
  ChevronRight
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "motion/react";
import { useLoans } from "@/src/lib/loanHooks";
import { useArchives } from "@/src/lib/hooks";
import { useNotifications } from "@/src/lib/notificationHooks";

interface NavItem {
  title: string;
  icon: React.ElementType;
  id: string;
}

const navItems: NavItem[] = [
  { title: "Dashboard", icon: Home, id: "dashboard" },
  { title: "Buku Tanah", icon: BookText, id: "buku-tanah" },
  { title: "Surat Ukur", icon: MapIcon, id: "surat-ukur" },
  { title: "Warkah", icon: Files, id: "warkah" },
  { title: "Peminjaman", icon: Database, id: "loans" },
  { title: "Notifikasi", icon: Bell, id: "notifications" },
  { title: "Manajemen User", icon: Users, id: "users" },
  { title: "Master Wilayah", icon: MapIcon, id: "locations" },
  { title: "Database Backup", icon: Database, id: "database-sync" },
];

function Clock() {
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center space-x-2 text-white/60 font-mono text-[10px] bg-white/5 px-2.5 py-1 rounded-full border border-white/10 tabular-nums">
      <ClockIcon size={12} className="text-blue-400" />
      <span>{time.toLocaleTimeString("id-ID", { hour12: false })}</span>
    </div>
  );
}

interface ShellProps {
  children: React.ReactNode;
  activeId: string;
  onNavigate: (id: string) => void;
  user: any;
  onLogout: () => void;
}

export function Shell({ children, activeId, onNavigate, user, onLogout }: ShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const { loans } = useLoans();
  const { archives } = useArchives();
  const { notifications } = useNotifications(loans, archives);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filteredNavItems = navItems.filter(item => {
    if (item.id === 'users' || item.id === 'locations') {
      return user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
    }
    if (item.id === 'database-sync') {
      return user?.role === 'SUPER_ADMIN';
    }
    return true;
  });

  const getRoleName = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'Super Admin';
      case 'ADMIN': return 'Administrator';
      case 'PETUGAS_ARSIP': return 'Petugas Arsip';
      default: return 'User';
    }
  };

  const activeLabel = navItems.find(i => i.id === activeId)?.title || "Dashboard";

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans selection:bg-blue-100 selection:text-blue-900">
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 z-40 md:hidden backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "fixed inset-y-0 left-0 w-64 bg-slate-900 z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:flex flex-col border-r border-white/5",
        isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      )}>
        <div className="h-28 flex items-center px-6 bg-slate-950 text-white space-x-4 shrink-0 border-b border-white/5">
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <img src="/Logo_BPN.png" alt="BPN Logo" className="relative w-16 h-16 object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-black leading-tight uppercase tracking-widest text-blue-400">ATR / BPN</h1>
            <p className="text-sm text-white/60 font-bold uppercase tracking-tight leading-none mt-1">Kota Banjarmasin</p>
          </div>
          <button className="md:hidden ml-auto p-1.5 hover:bg-white/10 rounded-lg transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
            <Menu size={20} className="text-white" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] px-4 mb-3">Main Navigation</p>
          {filteredNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                setIsMobileMenuOpen(false);
              }}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all group relative duration-200",
                activeId === item.id
                  ? "bg-blue-600 text-white shadow-xl shadow-blue-900/40 translate-x-1"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <div className="flex items-center space-x-3">
                <item.icon size={18} className={activeId === item.id ? "text-white" : "text-slate-500 group-hover:text-blue-400"} />
                <span className="text-[12px] font-bold uppercase tracking-tight">{item.title}</span>
              </div>
              {activeId === item.id && <ChevronRight size={14} className="text-white/50" />}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5 bg-slate-950/50 space-y-3">
          <div className="flex items-center space-x-3 px-3 py-2.5 bg-white/5 rounded-xl border border-white/5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-blue-900/50">
                {user?.displayName?.[0] || "A"}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-[10px] font-bold truncate text-white uppercase tracking-wider leading-tight">{user?.displayName || "Admin"}</p>
              <div className="flex items-center space-x-1 mt-0.5">
                  <ShieldCheck size={8} className="text-emerald-400" />
                  <p className="text-[8px] text-emerald-400/70 font-bold uppercase tracking-widest leading-none">{getRoleName(user?.role)}</p>
              </div>
            </div>
          </div>

          <Button 
            variant="ghost" 
            className="w-full h-10 justify-start text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-xl px-4 transition-all"
            onClick={onLogout}
          >
            <LogOut size={14} className="mr-3" />
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">Sistem Logout</span>
          </Button>
          <p className="text-[7px] text-white/10 text-center font-bold uppercase tracking-widest">v2.4.1 Production</p>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 relative w-full overflow-hidden">
        <header className="h-16 glass-header bg-brand-blue text-white flex items-center justify-between px-6 shrink-0 z-10 w-full shadow-lg shadow-blue-950/20">
          <div className="flex items-center space-x-6">
            <button className="md:hidden p-2 hover:bg-white/10 rounded-xl transition-colors" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              <Menu size={22} className="text-white" />
            </button>
            <div className="flex items-center space-x-3">
               <div className="hidden lg:flex items-center space-x-2 text-white/40 text-[10px] font-bold uppercase tracking-[0.2em]">
                  <span>System</span>
                  <ChevronRight size={10} />
               </div>
               <h2 className="text-sm font-black uppercase tracking-[0.1em] text-white">
                 {activeLabel}
               </h2>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <Clock />
            <div className="h-4 w-px bg-white/10"></div>
            <div className="flex items-center space-x-4">
               <button 
                 onClick={() => onNavigate('notifications')}
                 className="relative p-2 text-white/60 hover:text-white hover:bg-white/5 rounded-full transition-all cursor-pointer"
               >
                  <Bell size={18} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 bg-red-500 text-white font-black text-[8px] flex items-center justify-center rounded-full border border-brand-blue shrink-0 select-none">
                      {unreadCount}
                    </span>
                  )}
               </button>
               <div className="hidden sm:flex flex-col items-end">
                 <p className="text-[11px] font-black leading-none text-white uppercase tracking-wider">{user?.displayName}</p>
                 <p className="text-[9px] text-blue-300/70 font-bold uppercase tracking-widest mt-1">Terminal ID: {user?.uid?.slice(-6).toUpperCase()}</p>
               </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <div className="max-w-(--breakpoint-3xl) mx-auto w-full">
            <motion.div
              key={activeId}
              initial={{ opacity: 0, y: 15, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            >
              {children}
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
