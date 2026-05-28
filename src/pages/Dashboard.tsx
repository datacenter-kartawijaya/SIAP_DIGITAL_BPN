import { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { 
  BookText, 
  Database, 
  ArrowUpRight, 
  Map as MapIcon, 
  Files, 
  Search, 
  Plus, 
  History,
  TrendingUp,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { cn } from "@/src/lib/utils";
import { useArchives } from '../lib/hooks';
import { useLoans } from '../lib/loanHooks';
import { isAfter } from 'date-fns';

const barData = [
  { name: 'Sen', buku: 40, suratUkur: 15, warkah: 24 },
  { name: 'Sel', buku: 30, suratUkur: 12, warkah: 13 },
  { name: 'Rab', buku: 20, suratUkur: 45, warkah: 98 },
  { name: 'Kam', buku: 27, suratUkur: 22, warkah: 39 },
  { name: 'Jum', buku: 18, suratUkur: 28, warkah: 48 },
  { name: 'Sab', buku: 23, suratUkur: 10, warkah: 20 },
  { name: 'Min', buku: 15, suratUkur: 5, warkah: 12 },
];

const pieData = [
  { name: 'Bjm Barat', value: 45 },
  { name: 'Bjm Timur', value: 25 },
  { name: 'Bjm Utara', value: 20 },
  { name: 'Bjm Selatan', value: 10 },
];

const PIE_COLORS = ['#1e3a8a', '#3b82f6', '#60a5fa', '#93c5fd'];

export function Dashboard({ onNavigate }: { onNavigate?: (id: string) => void }) {
  const { archives, loading: archivesLoading } = useArchives();
  const { loans, loading: loansLoading } = useLoans();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeLoans = loans.filter(l => l.status === 'Active');
  const overdueLoans = activeLoans.filter(l => isAfter(new Date(), new Date(l.expectedReturnDate)));
  
  const countBukuTanah = archives.filter(a => a.type === 'BUKU_TANAH').length;
  const countSuratUkur = archives.filter(a => a.type === 'SURAT_UKUR').length;
  const countWarkah = archives.filter(a => a.type === 'WARKAH').length;
  const countPeminjaman = activeLoans.length;

  const totalBukuTanah = 12450 + countBukuTanah;
  const totalSuratUkur = 5630 + countSuratUkur;
  const totalWarkah = 8920 + countWarkah;
  const totalPeminjaman = 42 + countPeminjaman;

  const inputHariIni = 128 + archives.filter(a => {
    if (!a.createdAt) return false;
    const dateObj = (a.createdAt as any).toDate ? (a.createdAt as any).toDate() : new Date(a.createdAt);
    const today = new Date();
    return dateObj.getDate() === today.getDate() &&
           dateObj.getMonth() === today.getMonth() &&
           dateObj.getFullYear() === today.getFullYear();
  }).length;

  if (archivesLoading || loansLoading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center space-y-4">
        <Zap className="animate-pulse text-blue-600" size={48} />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Menghitung Data Real-time...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-slate-900 rounded-3xl p-8 mb-8 shadow-2xl shadow-slate-200 border border-white/10 group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full -ml-20 -mb-20 blur-3xl"></div>
        
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-blue-400 font-bold uppercase tracking-[0.2em] text-[10px]">
              <Zap size={14} className="animate-pulse" />
              <span>Sistem Operasi Aktif</span>
            </div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tight">Selamat Datang, Admin</h1>
            <p className="text-slate-400 text-sm max-w-md font-medium">Basis data kantor pertanahan terhubung dengan {archives.length} dokumen terdigitalisasi.</p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
             <button 
              onClick={() => onNavigate?.('buku-tanah')}
              className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-900/30 hover:-translate-y-0.5 active:translate-y-0"
             >
                <Plus size={16} />
                <span>Registrasi Arsip</span>
             </button>
             <button 
              onClick={() => onNavigate?.('warkah')}
              className="flex items-center justify-center space-x-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all backdrop-blur-sm"
             >
                <Search size={16} />
                <span>Cari Warkah</span>
             </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Card 1: TOTAL BUKU TANAH */}
        <div className="bg-white border border-[#1e293b]/20 md:border-[#1e293b]/15 rounded-[12px] p-5 flex flex-col justify-between selection:bg-blue-100 min-h-[140px] shadow-sm hover:shadow-md transition-shadow">
          <div>
            <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase">
              TOTAL BUKU TANAH
            </span>
            <div className="text-[32px] font-extrabold text-slate-900 leading-tight mt-1 mb-1">
              {totalBukuTanah.toLocaleString('id-ID')}
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-50">
            <div className="flex items-center space-x-1 text-emerald-600 text-xs font-bold font-sans">
              <span>↗</span>
              <span>+12%</span>
            </div>
            <BookText size={18} className="text-blue-400/80" />
          </div>
        </div>

        {/* Card 2: TOTAL SURAT UKUR */}
        <div className="bg-white border border-[#1e293b]/20 md:border-[#1e293b]/15 rounded-[12px] p-5 flex flex-col justify-between min-h-[140px] shadow-sm hover:shadow-md transition-shadow">
          <div>
            <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase">
              TOTAL SURAT UKUR
            </span>
            <div className="text-[32px] font-extrabold text-slate-900 leading-tight mt-1 mb-1">
              {totalSuratUkur.toLocaleString('id-ID')}
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-50">
            <div className="flex items-center space-x-1 text-emerald-600 text-xs font-bold font-sans">
              <span>↗</span>
              <span>+8.1%</span>
            </div>
            <MapIcon size={18} className="text-blue-400/80" />
          </div>
        </div>

        {/* Card 3: TOTAL WARKAH */}
        <div className="bg-white border border-[#1e293b]/20 md:border-[#1e293b]/15 rounded-[12px] p-5 flex flex-col justify-between min-h-[140px] shadow-sm hover:shadow-md transition-shadow">
          <div>
            <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase">
              TOTAL WARKAH
            </span>
            <div className="text-[32px] font-extrabold text-slate-900 leading-tight mt-1 mb-1">
              {totalWarkah.toLocaleString('id-ID')}
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-50">
            <div className="flex items-center space-x-1 text-emerald-600 text-xs font-bold font-sans">
              <span>↗</span>
              <span>+5.4%</span>
            </div>
            <Files size={18} className="text-[#3cd5a9]" />
          </div>
        </div>

        {/* Card 4: PEMINJAMAN */}
        <div className="bg-white border border-[#1e293b]/20 md:border-[#1e293b]/15 rounded-[12px] p-5 flex flex-col justify-between min-h-[140px] shadow-sm hover:shadow-md transition-shadow">
          <div>
            <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase">
              PEMINJAMAN
            </span>
            <div className="text-[32px] font-extrabold text-slate-900 leading-tight mt-1 mb-1">
              {totalPeminjaman}
            </div>
          </div>
          <div className="mt-2 pt-1">
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-1">
              <div className="bg-[#ff9800] h-full rounded-full w-[35%]" />
            </div>
            <span className="text-[8px] font-extrabold text-slate-400 tracking-wider uppercase">
              BERKAS AKTIF
            </span>
          </div>
        </div>

        {/* Card 5: INPUT HARI INI */}
        <div className="bg-white border border-[#1e293b]/20 md:border-[#1e293b]/15 rounded-[12px] p-5 flex flex-col justify-between min-h-[140px] shadow-sm hover:shadow-md transition-shadow">
          <div>
            <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase">
              INPUT HARI INI
            </span>
            <div className="text-[32px] font-extrabold text-slate-900 leading-tight mt-1 mb-1">
              {inputHariIni}
            </div>
          </div>
          <div className="mt-2 pt-1">
            <button 
              onClick={() => onNavigate?.('buku-tanah')} 
              className="text-[#005cff] hover:text-blue-500 font-extrabold text-[11px] uppercase tracking-wider underline cursor-pointer decoration-2 underline-offset-4"
            >
              Lihat Rincian
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-8 border-none shadow-sm rounded-3xl overflow-hidden bg-white flex flex-col h-[480px]">
          <div className="p-6 pb-0 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Produktivitas Pengarsipan</h3>
              <p className="text-xs text-slate-400 font-bold mt-1">Statistik input berkas 7 hari terakhir</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl">
               <button className="px-4 py-2 bg-white rounded-lg shadow-sm text-[10px] font-black uppercase tracking-widest text-slate-900">Weekly</button>
               <button className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-700">Monthly</button>
            </div>
          </div>
          <CardContent className="flex-1 p-6 pt-10 min-h-0 flex flex-col justify-end">
            {mounted ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 700}} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 700}} 
                  />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{
                      fontSize: '11px', 
                      borderRadius: '16px', 
                      border: 'none', 
                      fontWeight: 'bold',
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Bar dataKey="buku" fill="#1e3a8a" radius={[6, 6, 0, 0]} barSize={24} />
                  <Bar dataKey="suratUkur" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={24} />
                  <Bar dataKey="warkah" fill="#10b981" radius={[6, 6, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full bg-slate-50 animate-pulse rounded-2xl" />
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-4 border-none shadow-sm rounded-3xl overflow-hidden bg-white flex flex-col h-[480px]">
          <div className="p-6">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Distribusi Wilayah</h3>
            <p className="text-xs text-slate-400 font-bold mt-1">Persentase berkas per kecamatan</p>
          </div>
          <CardContent className="flex-1 flex flex-col items-center justify-center p-6 pt-0">
            <div className="w-full h-48 relative mb-8">
               {mounted ? (
                 <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                 </ResponsiveContainer>
               ) : (
                 <div className="w-full h-full bg-slate-50 animate-pulse rounded-full" />
               )}
               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-900 leading-none">12.4k</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase mt-1">Total Arsip</span>
               </div>
            </div>
            <div className="w-full space-y-3">
               {pieData.map((item, i) => (
                 <div key={i} className="flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center space-x-3">
                       <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }}></div>
                       <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">{item.name}</span>
                    </div>
                    <span className="text-[11px] font-black text-slate-900">{item.value}%</span>
                 </div>
               ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 border-none shadow-sm rounded-3xl overflow-hidden bg-white p-6">
           <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Aktivitas Sistem Terkini</h3>
              <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">View All</button>
           </div>
           <div className="space-y-4">
              {[
                { type: 'input', user: 'Nurul Huda', action: 'Input Buku Tanah Baru', target: 'M-1205/Banjarmasin', time: '12 menit yang lalu', icon: Plus, color: 'bg-blue-100 text-blue-600' },
                { type: 'loan', user: 'Ahmad Syarif', action: 'Peminjaman Warkah', target: 'W-992/Utara', time: '25 menit yang lalu', icon: History, color: 'bg-amber-100 text-amber-600' },
                { type: 'verify', user: 'System Bot', action: 'Otomasi Validasi NIB', target: 'Klaim-902', time: '45 menit yang lalu', icon: TrendingUp, color: 'bg-emerald-100 text-emerald-600' }
              ].map((act, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 rounded-3xl border border-slate-50 hover:bg-slate-50 transition-all cursor-pointer group">
                   <div className={cn("p-3 rounded-2xl shrink-0 group-hover:scale-110 transition-transform", act.color)}>
                      <act.icon size={18} />
                   </div>
                   <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[11px] font-black text-slate-900 uppercase tracking-wider truncate">{act.action}</p>
                        <span className="text-[9px] text-slate-400 font-bold shrink-0">{act.time}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                         <span className="text-[10px] text-slate-500 font-bold">{act.user}</span>
                         <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                         <span className="text-[10px] text-blue-600 font-black truncate">{act.target}</span>
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </Card>

        <Card className={cn(
          "border-none shadow-sm rounded-3xl overflow-hidden p-6 text-white text-center flex flex-col justify-center items-center relative group transition-all duration-500",
          overdueLoans.length > 0 ? "bg-red-950/90" : "bg-slate-900"
        )}>
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <AlertTriangle size={80} />
           </div>
           
           {overdueLoans.length > 0 ? (
             <>
               <div className="w-16 h-16 bg-red-500/20 rounded-3xl flex items-center justify-center text-red-500 mb-6 animate-pulse">
                  <AlertTriangle size={32} />
               </div>
               <h3 className="text-xl font-black uppercase tracking-tight mb-2 text-red-100">Peringatan Kritis</h3>
               <p className="text-red-200/60 text-xs font-semibold mb-6 px-4">
                 Terdapat {overdueLoans.length} berkas yang telah melewati batas waktu pengembalian.
               </p>
               <button className="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-500 transition-colors shadow-lg shadow-red-900/50">
                  Lihat Berkas Terlambat
               </button>
             </>
           ) : (
             <>
               <div className="w-16 h-16 bg-emerald-500/20 rounded-3xl flex items-center justify-center text-emerald-500 mb-6">
                  <Zap size={32} />
               </div>
               <h3 className="text-xl font-black uppercase tracking-tight mb-2 text-white">Status Aman</h3>
               <p className="text-slate-400 text-xs font-semibold mb-6 px-4">
                 Seluruh log pergerakan berkas saat ini terpantau dalam kondisi normal.
               </p>
               <button className="w-full bg-white/5 text-white/50 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border border-white/5 cursor-default">
                  Sistem Berjalan Optimal
               </button>
             </>
           )}
        </Card>
      </div>
    </div>
  );
}
