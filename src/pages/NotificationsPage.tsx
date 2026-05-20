import * as React from "react";
import { useLoans } from "../lib/loanHooks";
import { useArchives } from "../lib/hooks";
import { useNotifications } from "../lib/notificationHooks";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { 
  Bell, 
  Trash2, 
  CheckCheck, 
  AlertTriangle, 
  AlertOctagon, 
  CheckCircle2, 
  Info, 
  Calendar, 
  Filter, 
  Loader2,
  ChevronRight,
  RefreshCw,
  Search,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/src/lib/utils";
import { toast } from "sonner";

interface NotificationsPageProps {
  onNavigate?: (tabId: string) => void;
}

export function NotificationsPage({ onNavigate }: NotificationsPageProps) {
  const { loans, loading: loansLoading } = useLoans();
  const { archives, loading: archivesLoading } = useArchives();
  const { 
    notifications, 
    loading: notificationsLoading, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    clearAllNotifications 
  } = useNotifications(loans, archives);

  const [activeCategory, setActiveCategory] = React.useState<string>("ALL");
  const [activeStatus, setActiveStatus] = React.useState<string>("ALL"); // ALL, UNREAD, READ
  const [searchQuery, setSearchQuery] = React.useState("");

  const loading = loansLoading || archivesLoading || notificationsLoading;

  // Statistics
  const totalCount = notifications.length;
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const overdueCount = notifications.filter(n => n.category === 'LOAN_OVERDUE').length;
  const missingCount = notifications.filter(n => n.category === 'INVENTORY_COMPLETENESS').length;

  const filteredNotifications = notifications.filter(n => {
    // Category filter
    if (activeCategory !== "ALL" && n.category !== activeCategory) return false;
    
    // Status filter
    if (activeStatus === "UNREAD" && n.isRead) return false;
    if (activeStatus === "READ" && !n.isRead) return false;

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const titleMatch = n.title.toLowerCase().includes(q);
      const bodyMatch = n.body.toLowerCase().includes(q);
      return titleMatch || bodyMatch;
    }

    return true;
  });

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'LOAN_OVERDUE':
        return { label: 'Tenggat Waktu', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'INVENTORY_COMPLETENESS':
        return { label: 'Integritas Berkas', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'LOAN_NEW':
        return { label: 'Peminjaman Baru', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'LOAN_RETURN':
        return { label: 'Pengembalian', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      default:
        return { label: 'Notifikasi', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const getIcon = (type: string, category: string) => {
    if (category === 'LOAN_OVERDUE') return <AlertOctagon size={16} className="text-red-500" />;
    if (category === 'INVENTORY_COMPLETENESS') return <AlertTriangle size={16} className="text-amber-500" />;
    
    switch (type) {
      case 'ALERT': return <AlertOctagon size={16} className="text-red-500" />;
      case 'WARNING': return <AlertTriangle size={16} className="text-amber-500" />;
      case 'SUCCESS': return <CheckCircle2 size={16} className="text-emerald-500" />;
      default: return <Info size={16} className="text-blue-500" />;
    }
  };

  const handleMarkRead = async (id: string) => {
    await markAsRead(id);
    toast.success("Notifikasi ditandai selesai");
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) {
      toast.info("Semua notifikasi sudah dibaca");
      return;
    }
    await markAllAsRead();
    toast.success("Semua notifikasi berhasil ditandai telah dibaca");
  };

  const handleDelete = async (id: string) => {
    await deleteNotification(id);
    toast.success("Notifikasi dihapus");
  };

  const handleClearAll = async () => {
    if (totalCount === 0) {
      toast.info("Tidak ada notifikasi untuk dihapus");
      return;
    }
    if (window.confirm("Apakah Anda yakin ingin menghapus semua history log notifikasi sistem secara permanen?")) {
      await clearAllNotifications();
      toast.success("Seluruh history log notifikasi berhasil dibersihkan");
    }
  };

  const getFormatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "dd MMMM yyyy HH:mm", { locale: id });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upper header statistics widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Unread */}
        <div className="bg-white border border-[#1e293b]/15 rounded-[12px] p-5 flex flex-col justify-between shadow-sm min-h-[120px]">
          <div>
            <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase flex items-center">
              <Bell size={13} className="mr-1.5 text-blue-500" /> UNREAD ALERT
            </span>
            <div className="text-[32px] font-extrabold text-slate-900 mt-2">
              {unreadCount}
            </div>
          </div>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Perlu Peninjauan</p>
        </div>

        {/* Overdue Total */}
        <div className="bg-white border border-[#1e293b]/15 rounded-[12px] p-5 flex flex-col justify-between shadow-sm min-h-[120px]">
          <div>
            <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase flex items-center">
              <AlertOctagon size={13} className="mr-1.5 text-rose-500" /> OVERDUE LOANS
            </span>
            <div className="text-[32px] font-extrabold text-slate-900 mt-2">
              {overdueCount}
            </div>
          </div>
          <p className="text-[9px] text-rose-500 font-black uppercase tracking-wider">Sertipikat Terlambat Kembali</p>
        </div>

        {/* Incomplete Total */}
        <div className="bg-white border border-[#1e293b]/15 rounded-[12px] p-5 flex flex-col justify-between shadow-sm min-h-[120px]">
          <div>
            <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase flex items-center">
              <AlertTriangle size={13} className="mr-1.5 text-amber-500" /> INCOMPLETE FILES
            </span>
            <div className="text-[32px] font-extrabold text-slate-900 mt-2">
              {missingCount}
            </div>
          </div>
          <p className="text-[9px] text-amber-500 font-black uppercase tracking-wider">Fisik Tidak Berada Di Ruang Arsip</p>
        </div>

        {/* Total Notification */}
        <div className="bg-white border border-[#1e293b]/15 rounded-[12px] p-5 flex flex-col justify-between shadow-sm min-h-[120px]">
          <div>
            <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase flex items-center">
              <CheckCircle2 size={13} className="mr-1.5 text-emerald-500" /> TOTAL SYSTEM LOGS
            </span>
            <div className="text-[32px] font-extrabold text-slate-900 mt-2">
              {totalCount}
            </div>
          </div>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Semua Catatan Aktivitas</p>
        </div>
      </div>

      {/* Action Dashboard Panel Grid */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
        {/* Filter header section */}
        <div className="p-6 border-b border-slate-150 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">Manajemen Informasi Notifikasi</h2>
              <p className="text-[10px] text-slate-500 font-medium uppercase mt-0.5 tracking-wide">Penyaringan log sistem, batas jatuh tempo peminjaman, dan sinkronisasi arsip digital kantor pertanahan</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <Button 
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0 || loading}
                variant="outline"
                className="h-10 px-4 rounded-xl space-x-1.5 text-slate-700 border-slate-200 hover:bg-slate-50 font-bold text-[10px] uppercase tracking-wide disabled:opacity-50"
              >
                <CheckCheck size={14} className="text-blue-600" />
                <span>Tandai Semua Dibaca</span>
              </Button>

              <Button 
                onClick={handleClearAll}
                disabled={totalCount === 0 || loading}
                className="h-10 px-4 rounded-xl space-x-1.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 font-black text-[10px] uppercase tracking-wide disabled:opacity-50 shadow-sm"
              >
                <Trash2 size={14} />
                <span>Bersihkan Semua Log</span>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
            {/* Search Input Bar */}
            <div className="md:col-span-4 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <Input
                type="text"
                placeholder="CARI ARSIP / NAMA PEMINJAM..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-10 pl-9 pr-4 text-[10px] font-bold text-slate-700 bg-slate-50 border-slate-200 rounded-xl placeholder:text-slate-400 uppercase tracking-wider"
              />
            </div>

            {/* Filter Categories Selector */}
            <div className="md:col-span-5 flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <span className="text-[9px] font-black uppercase text-slate-400 select-none shrink-0 pr-1 flex items-center">
                <Filter size={10} className="mr-1" /> Kategori:
              </span>
              {[
                { id: "ALL", label: "Semua" },
                { id: "LOAN_OVERDUE", label: "Tenggat Waktu" },
                { id: "INVENTORY_COMPLETENESS", label: "Integritas" },
                { id: "LOAN_NEW", label: "Baru" },
                { id: "LOAN_RETURN", label: "Kembali" }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "h-8 px-3 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all shrink-0",
                    activeCategory === cat.id
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Status Selector */}
            <div className="md:col-span-3 flex items-center justify-end space-x-1">
              <span className="text-[9px] font-black uppercase text-slate-400 select-none shrink-0 pr-1">
                Status:
              </span>
              {[
                { id: "ALL", label: "Semua" },
                { id: "UNREAD", label: "Belum Dibaca" },
                { id: "READ", label: "Dibaca" }
              ].map(st => (
                <button
                  key={st.id}
                  onClick={() => setActiveStatus(st.id)}
                  className={cn(
                    "h-8 px-2.5 rounded-lg text-[8px] font-black uppercase tracking-wider border transition-all shrink-0",
                    activeStatus === st.id
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                  )}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* List of active alerts */}
        <div className="p-6 bg-slate-50/50">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="animate-spin text-blue-600" size={32} />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Melacak Riwayat Database Log...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-24 text-center max-w-sm mx-auto space-y-4">
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                <Bell size={28} />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">LOG BERSIH</h3>
                <p className="text-[10px] text-slate-400 font-medium mt-1 leading-relaxed uppercase">Tidak ada catatan notifikasi yang memenuhi filter pencarian Anda saat ini. Seluruh berkas pertanahan terpantau lapor dengan aman.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
              {filteredNotifications.map((notif) => {
                const badge = getCategoryBadge(notif.category);
                return (
                  <div 
                    key={notif.id}
                    className={cn(
                      "bg-white rounded-2xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-start gap-4 p-5 relative overflow-hidden group",
                      !notif.isRead && "border-l-4 border-l-blue-600"
                    )}
                  >
                    {/* Floating New Banner indicator */}
                    {!notif.isRead && (
                      <span className="absolute top-0 right-0 bg-blue-600 text-white text-[7px] font-black uppercase px-2.5 py-0.5 rounded-bl-lg tracking-widest">
                        BARU
                      </span>
                    )}

                    {/* Leading decorative status icon inside custom box */}
                    <div className={cn(
                      "w-11 h-11 rounded-xl flex items-center justify-center shadow-inner shrink-0",
                      notif.category === 'LOAN_OVERDUE' ? 'bg-red-50' : 
                      notif.category === 'INVENTORY_COMPLETENESS' ? 'bg-amber-50' : 'bg-slate-50'
                    )}>
                      {getIcon(notif.type, notif.category)}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border", badge.bg)}>
                          {badge.label}
                        </span>
                        
                        <div className="flex items-center text-[9px] text-slate-400 font-bold space-x-1.5">
                          <Calendar size={10} />
                          <span>{getFormatDate(notif.createdAt)}</span>
                        </div>
                      </div>

                      <h4 className="text-xs font-black text-slate-950 uppercase mt-1 tracking-tight">
                        {notif.title}
                      </h4>
                      <p className="text-[10px] text-slate-600 font-bold leading-relaxed uppercase tracking-wide">
                        {notif.body}
                      </p>

                      {/* Relational Quick Navigate Hooks */}
                      {notif.referenceId && onNavigate && (
                        <div className="pt-2 flex items-center space-x-3">
                          <button
                            onClick={() => {
                              // Switch active page
                              if (notif.category === 'LOAN_OVERDUE' || notif.category === 'LOAN_NEW' || notif.category === 'LOAN_RETURN') {
                                onNavigate('loans');
                              } else if (notif.category === 'INVENTORY_COMPLETENESS') {
                                onNavigate('buku-tanah'); // Default back to Buku Tanah list for correction
                              }
                            }}
                            className="inline-flex items-center space-x-1 text-[9px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-500 cursor-pointer"
                          >
                            <span>Lihat Detail Sumber</span>
                            <ExternalLink size={10} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Right aligned mark-as-read controls */}
                    <div className="flex items-center space-x-1 bg-slate-50/50 p-1.5 rounded-xl border border-slate-100 self-center">
                      {!notif.isRead && (
                        <button
                          onClick={() => handleMarkRead(notif.id)}
                          className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                          title="Tandai Selesai"
                        >
                          <CheckCheck size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notif.id)}
                        className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Log"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Footer info panel */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between">
          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none">
            ATR / BPN Kantor Pertanahan Kota Banjarmasin
          </p>
          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wide leading-none">
            Keamanan Data & Log Peminjaman Terpusat
          </p>
        </div>
      </div>
    </div>
  );
}
