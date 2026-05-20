import * as React from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Download,
  Eye,
  Edit,
  Trash2,
  Loader2,
  Database,
  ArrowRight,
  MapPin,
  Calendar,
  Layers,
  ArrowUpDown,
  BookText,
  Files,
  History
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Archive, ArchiveType, Loan } from "../types";
import { useArchives } from "../lib/hooks";
import { useLoans } from "../lib/loanHooks";
import { ArchiveForm } from "@/src/components/archive/ArchiveForm";
import { CameraCapture } from "@/src/components/archive/CameraCapture";
import { LoanReceipt } from "@/src/components/archive/LoanReceipt";
import { LoanHistoryDialog } from "@/src/components/archive/LoanHistoryDialog";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from '../lib/auth';
import { motion, AnimatePresence } from "motion/react";

interface ArchiveListProps {
  type: ArchiveType;
}

export function ArchiveList({ type }: ArchiveListProps) {
  const [search, setSearch] = React.useState("");
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isLoanOpen, setIsLoanOpen] = React.useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = React.useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
  const [activeLoan, setActiveLoan] = React.useState<Loan | null>(null);
  const [historyArchive, setHistoryArchive] = React.useState<Archive | null>(null);
  const [editingArchive, setEditingArchive] = React.useState<Archive | null>(null);
  const [loanArchive, setLoanArchive] = React.useState<Archive | null>(null);
  const [borrowerName, setBorrowerName] = React.useState("");
  const [loanPurpose, setLoanPurpose] = React.useState("");
  const [loanNotes, setLoanNotes] = React.useState("");
  const [borrowerPhoto, setBorrowerPhoto] = React.useState("");
  
  const { archives, loading, addArchive, updateArchive, removeArchive } = useArchives(type);
  const { createLoan, loans } = useLoans();
  const { currentUser } = useAuth();

  const handleLoanSubmit = async () => {
    if (!borrowerName) return toast.error("Identitas peminjam wajib diisi");
    if (!loanPurpose) return toast.error("Tujuan peminjaman wajib diisi");
    
    try {
      const result = await createLoan(loanArchive!.id, borrowerName, loanPurpose, borrowerPhoto, loanNotes);
      if (result) {
        setActiveLoan(result as Loan);
        toast.success("Log peminjaman berhasil disimpan");
        setIsLoanOpen(false);
        setIsReceiptOpen(true);
        // Reset states
        setBorrowerName("");
        setLoanPurpose("");
        setLoanNotes("");
        setBorrowerPhoto("");
      }
    } catch (error) {
      toast.error("Gagal sinkronisasi data peminjaman");
    }
  };

  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';

  const filtered = archives.filter(a => {
    const term = search.toLowerCase();
    return (
      a.namaPemegangHak.toLowerCase().includes(term) ||
      (a.noHak?.toLowerCase().includes(term)) ||
      (a.noDI208?.toLowerCase().includes(term)) ||
      (a.noSU?.toLowerCase().includes(term)) ||
      (a.kelurahan?.toLowerCase().includes(term))
    );
  });

  const handleSubmit = async (values: any) => {
    try {
      if (editingArchive) {
        await updateArchive(editingArchive.id, values);
        toast.success("Arsip berhasil diperbarui");
      } else {
        await addArchive({ ...values, type });
        toast.success("Arsip baru berhasil ditambahkan");
      }
      setIsFormOpen(false);
      setEditingArchive(null);
    } catch (error) {
      console.error(error);
      toast.error("Gagal menyimpan arsip. Pastikan Firebase sudah Aktif.");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus arsip ini?")) {
      try {
        await removeArchive(id);
        toast.success("Arsip berhasil dihapus");
      } catch (error) {
        toast.error("Gagal menghapus arsip");
      }
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <Loader2 className="animate-spin text-blue-600" size={48} />
          <div className="absolute inset-0 flex items-center justify-center">
             <Database size={16} className="text-blue-400" />
          </div>
        </div>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Sinkronisasi Basis Data...</p>
      </div>
    );
  }

  const typeLabel = type.replace('_', ' ');

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <Layers size={20} className="mr-3 text-blue-600" />
            Repositori {typeLabel}
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Total {filtered.length} arsip ditemukan dalam basis data sistem
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative group flex-1 sm:flex-none">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <Input 
              placeholder="Cari Nomor, Nama, Wilayah..." 
              className="pl-11 h-12 w-full sm:w-80 rounded-2xl bg-white border-slate-200 text-xs font-bold focus:ring-4 focus:ring-blue-100 transition-all placeholder:font-medium uppercase"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" className="rounded-2xl h-12 px-6 space-x-2 border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50">
              <Download size={16} />
              <span className="hidden xs:inline">Ekspor</span>
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-500 rounded-2xl h-12 px-6 space-x-2 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all"
              onClick={() => {
                setEditingArchive(null);
                setIsFormOpen(true);
              }}
            >
              <Plus size={16} />
              <span>Input Baru</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/50">
        <div className="overflow-x-auto custom-scrollbar">
          <Table>
            <TableHeader className="bg-slate-50/50 border-b border-slate-100">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-14 font-black text-slate-500 text-[9px] uppercase tracking-[0.2em] px-6">
                  <div className="flex items-center space-x-2 cursor-pointer hover:text-blue-600 transition-colors">
                    <span>Identitas Arsip</span>
                    <ArrowUpDown size={10} />
                  </div>
                </TableHead>
                <TableHead className="h-14 font-black text-slate-500 text-[9px] uppercase tracking-[0.2em] px-6">Kepemilikan</TableHead>
                <TableHead className="h-14 font-black text-slate-500 text-[9px] uppercase tracking-[0.2em] px-6">Wilayah Kerja</TableHead>
                <TableHead className="h-14 font-black text-slate-500 text-[9px] uppercase tracking-[0.2em] px-6">Manajemen Lokasi</TableHead>
                <TableHead className="h-14 font-black text-slate-500 text-[9px] uppercase tracking-[0.2em] px-6 text-center">Status</TableHead>
                <TableHead className="h-14 w-20 px-0"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4 py-12">
                        <div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center">
                           <Database size={40} className="text-slate-200" />
                        </div>
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Data Tidak Ditemukan</p>
                          <p className="text-[10px] text-slate-300 font-bold mt-1">Gunakan kata kunci pencarian yang berbeda</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((archive, idx) => (
                    <motion.tr
                      key={archive.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.03, duration: 0.4 }}
                      className={cn(
                        "group hover:bg-blue-50/20 transition-all border-b border-slate-50 last:border-0",
                        idx % 2 === 1 && "bg-slate-50/30"
                      )}
                    >
                      <TableCell className="px-6 py-5">
                        <div className="flex items-center space-x-4">
                           <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                              {type === 'BUKU_TANAH' ? <BookText size={18} /> : type === 'SURAT_UKUR' ? <MapPin size={18} /> : <Files size={18} />}
                           </div>
                           <div>
                              <p className="font-mono text-xs font-black text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors uppercase">
                                {type === 'BUKU_TANAH' ? (archive.noHak || "-") : type === 'SURAT_UKUR' ? (archive.noSU || "-") : (archive.noDI208 || "-")}
                              </p>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="text-[8px] font-black px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-md uppercase tracking-wider">RID: {archive.id.slice(-6)}</span>
                                {archive.tahunSU && <span className="text-[8px] font-black px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md uppercase tracking-wider">{archive.tahunSU}</span>}
                              </div>
                           </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-5">
                        <div className="space-y-1">
                          <p className="font-black text-slate-900 text-xs tracking-tight uppercase leading-none">{archive.namaPemegangHak}</p>
                          <div className="flex items-center space-x-1.5 text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                            <span className="text-blue-500/70">{type === 'BUKU_TANAH' ? archive.jenisHak : type === 'SURAT_UKUR' ? 'Surat Ukur' : archive.jenisWarkah}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-5">
                        <div className="space-y-1">
                          <p className="text-slate-800 text-xs font-black uppercase tracking-tight leading-none">{archive.kelurahan}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{archive.kecamatan}</p>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-5">
                        <div className="grid grid-cols-2 gap-1 w-32">
                           <div className="bg-slate-50 border border-slate-100 rounded-lg p-1.5 text-center">
                              <p className="text-[7px] font-black text-slate-300 uppercase leading-none mb-1">RAK</p>
                              <p className="text-[10px] font-black text-slate-600 leading-none uppercase">{archive.rak}</p>
                           </div>
                           <div className="bg-slate-50 border border-slate-100 rounded-lg p-1.5 text-center">
                              <p className="text-[7px] font-black text-slate-300 uppercase leading-none mb-1">SHFT</p>
                              <p className="text-[10px] font-black text-slate-600 leading-none uppercase">{archive.shaft}</p>
                           </div>
                           {archive.bundel && (
                              <div className="col-span-2 bg-blue-50/50 border border-blue-100 rounded-lg p-1.5 text-center">
                                 <div className="flex items-center justify-center space-x-1">
                                    <p className="text-[7px] font-black text-blue-300 uppercase leading-none">BNDL</p>
                                    <p className="text-[10px] font-black text-blue-600 leading-none uppercase">{archive.bundel}</p>
                                 </div>
                              </div>
                           )}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-5 text-center">
                        <div className={cn(
                          "status-chip mx-auto py-1",
                          archive.status === 'Available' 
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                            : "bg-amber-50 text-amber-600 border-amber-100"
                        )}>
                          <div className={cn("w-1.5 h-1.5 rounded-full mr-2", archive.status === 'Available' ? "bg-emerald-500" : "bg-amber-500")}></div>
                          <span>{archive.status === 'Available' ? 'Ready' : 'In Use'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-5 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="flex items-center justify-center h-10 w-10 rounded-2xl hover:bg-slate-100 transition-all mx-auto active:scale-90">
                            <MoreHorizontal size={18} className="text-slate-400 group-hover:text-slate-900" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-2xl p-2 w-48 border-slate-100 shadow-2xl focus:outline-none">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 p-2">Tindakan</DropdownMenuLabel>
                              <DropdownMenuItem className="rounded-xl text-[10px] font-black uppercase tracking-widest py-3 cursor-pointer group focus:bg-blue-50 focus:text-blue-700">
                                <Eye size={14} className="mr-3 text-slate-300 group-focus:text-blue-500" /> <span>Lihat Rincian</span>
                                <ArrowRight size={12} className="ml-auto opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="rounded-xl text-[10px] font-black uppercase tracking-widest py-3 cursor-pointer group focus:bg-amber-50 focus:text-amber-700"
                                onClick={() => {
                                  if (archive.status === 'Available') {
                                    setLoanArchive(archive);
                                    setIsLoanOpen(true);
                                  } else {
                                    toast.error("Arsip sedang dipinjam");
                                  }
                                }}
                              >
                                <Database size={14} className="mr-3 text-slate-300 group-focus:text-amber-500" /> <span>Input Pinjaman</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="rounded-xl text-[10px] font-black uppercase tracking-widest py-3 cursor-pointer group focus:bg-indigo-50 focus:text-indigo-700"
                                onClick={() => {
                                  setHistoryArchive(archive);
                                  setIsHistoryOpen(true);
                                }}
                              >
                                <History size={14} className="mr-3 text-slate-300 group-focus:text-indigo-500" /> <span>Riwayat Pinjam</span>
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator className="my-2 bg-slate-50" />
                            <DropdownMenuGroup>
                              <DropdownMenuItem 
                                className="rounded-xl text-[10px] font-black uppercase tracking-widest py-3 cursor-pointer group focus:bg-blue-50 focus:text-blue-700"
                                onClick={() => {
                                  setEditingArchive(archive);
                                  setIsFormOpen(true);
                                }}
                              >
                                <Edit size={14} className="mr-3 text-slate-300 group-focus:text-blue-500" /> <span>Update Data</span>
                              </DropdownMenuItem>
                              {isAdmin && (
                                <DropdownMenuItem 
                                  className="rounded-xl text-[10px] font-black uppercase tracking-widest py-3 cursor-pointer text-red-500 focus:text-red-600 focus:bg-red-50 group"
                                  onClick={() => handleDelete(archive.id)}
                                >
                                  <Trash2 size={14} className="mr-3 text-red-300 group-focus:text-red-500" /> <span>Hapus Permanen</span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-6xl w-[95vw] sm:w-full p-0 overflow-hidden sm:rounded-[2rem] border-none shadow-2xl bg-white focus:outline-none max-h-[95vh] flex flex-col">
          <div className="bg-slate-900 px-8 py-8 relative overflow-hidden shrink-0">
             <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full -mr-10 -mt-10 blur-2xl"></div>
             <DialogHeader className="relative z-10 text-left">
                <div className="flex items-center space-x-3 mb-2">
                   <div className="w-8 h-1 bg-blue-500 rounded-full"></div>
                   <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em]">Sistem Manajemen Arsip v2.4</p>
                </div>
               <DialogTitle className="text-white text-2xl font-black uppercase tracking-tight">
                 {editingArchive ? "Modifikasi Arsip" : "Formulir Input Arsip"}
               </DialogTitle>
               <p className="text-slate-400 text-[10px] font-medium mt-1">
                 Pastikan seluruh informasi dokumen telah diverifikasi secara fisik sebelum disimpan.
               </p>
             </DialogHeader>
          </div>
          <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar bg-white">
            <ArchiveForm 
              type={type} 
              onSubmit={handleSubmit} 
              initialValues={editingArchive ? (editingArchive as any) : undefined} 
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isLoanOpen} onOpenChange={setIsLoanOpen}>
        <DialogContent className="max-w-xl sm:rounded-[2.5rem] border-none shadow-2xl p-0 w-[95vw] sm:w-full bg-white overflow-hidden max-h-[90vh] flex flex-col">
          <div className="bg-slate-900 px-8 py-8 shrink-0">
             <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-1 bg-blue-500 rounded-full"></div>
                <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em]">Otoritas Keluar Dokumen</p>
             </div>
             <DialogTitle className="text-white text-2xl font-black uppercase tracking-tight text-left">Input Peminjaman</DialogTitle>
             <p className="text-slate-400 text-[10px] font-medium mt-1 text-left">
               {loanArchive?.type === 'BUKU_TANAH' ? `HAK ${loanArchive.jenisHak} NO. ${loanArchive.noHak}` : `WARKAH NO. ${loanArchive?.noDI208}`}
             </p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Peminjam</Label>
                <Input 
                  placeholder="PETUGAS / PIHAK LUAR..." 
                  className="rounded-2xl border-slate-100 h-12 bg-slate-50 font-bold text-xs focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all uppercase"
                  value={borrowerName}
                  onChange={(e) => setBorrowerName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tujuan</Label>
                <Input 
                  placeholder="PEMELIHARAAN / SCAN / DLL..." 
                  className="rounded-2xl border-slate-100 h-12 bg-slate-50 font-bold text-xs focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all uppercase"
                  value={loanPurpose}
                  onChange={(e) => setLoanPurpose(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bukti Foto Peminjam</Label>
              <CameraCapture 
                value={borrowerPhoto}
                onCapture={setBorrowerPhoto}
                onClear={() => setBorrowerPhoto("")}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Catatan Logistik Pelengkap</Label>
              <Textarea 
                placeholder="Tulis rincian kondisi fisik atau pesan tambahan..." 
                className="rounded-2xl border-slate-100 min-h-[80px] bg-slate-50 text-xs font-medium focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all"
                value={loanNotes}
                onChange={(e) => setLoanNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="p-6 sm:p-8 border-t border-slate-50 flex gap-3 shrink-0">
            <Button variant="ghost" onClick={() => setIsLoanOpen(false)} className="rounded-2xl flex-1 h-12 font-black text-[10px] uppercase tracking-widest text-slate-400">Batal</Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-500 rounded-2xl flex-1 h-12 font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20"
              onClick={handleLoanSubmit}
            >
              OK, Pinjamkan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="max-w-3xl sm:rounded-[2.5rem] border-none shadow-2xl p-0 w-[95vw] sm:w-full bg-white h-[90vh] sm:h-[85vh] max-h-[90vh] overflow-hidden flex flex-col">
          {activeLoan && loanArchive && (
            <LoanReceipt 
              loan={activeLoan}
              archive={loanArchive}
              onClose={() => setIsReceiptOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-2xl sm:rounded-[2.5rem] border-none shadow-2xl p-0 w-[95vw] sm:w-full bg-white h-[80vh] sm:h-[75vh] max-h-[85vh] overflow-hidden flex flex-col">
          {historyArchive && (
            <LoanHistoryDialog 
              archive={historyArchive}
              loans={loans}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

