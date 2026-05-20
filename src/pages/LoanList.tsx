import * as React from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Database, 
  RotateCcw, 
  CheckCircle2,
  Clock,
  User,
  Calendar,
  Layers,
  History,
  ArrowRight,
  ShieldCheck,
  Search,
  Eye,
  Printer,
  AlertCircle,
  Pencil,
  Trash2,
  MoreVertical,
  X
} from "lucide-react";
import { useLoans } from "../lib/loanHooks";
import { useArchives } from "../lib/hooks";
import { format, isAfter } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/src/lib/utils";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "motion/react";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoanReceipt } from "@/src/components/archive/LoanReceipt";
import { Loan, Archive } from "../types";

export function LoanList() {
  const [search, setSearch] = React.useState("");
  const [selectedPhoto, setSelectedPhoto] = React.useState<string | null>(null);
  const [receiptLoan, setReceiptLoan] = React.useState<{ loan: Loan; archive: Archive } | null>(null);
  const [editingLoan, setEditingLoan] = React.useState<Loan | null>(null);
  
  const { loans, loading, returnLoan, updateLoan, deleteLoan } = useLoans();
  const { archives } = useArchives();

  const handleReturn = async (loanId: string, archiveId: string) => {
    const notes = window.prompt("Tambahkan catatan pengembalian (opsional):");
    if (notes === null) return; // Cancelled
    
    try {
      await returnLoan(loanId, archiveId, notes);
      toast.success("Log peminjaman ditutup: Arsip diterima");
    } catch (error) {
      toast.error("Gagal sinkronisasi pengembalian");
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLoan) return;

    try {
      await updateLoan(editingLoan.id, {
        borrowerName: editingLoan.borrowerName,
        purpose: editingLoan.purpose,
        notes: editingLoan.notes,
        expectedReturnDate: editingLoan.expectedReturnDate
      });
      toast.success("Data peminjaman diperbarui");
      setEditingLoan(null);
    } catch (error) {
      toast.error("Gagal memperbarui data");
    }
  };

  const handleDelete = async (loanId: string, archiveId: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus data peminjaman ini? Tindakan ini akan mengembalikan status arsip menjadi Tersedia jika peminjaman masih aktif.")) return;

    try {
      await deleteLoan(loanId, archiveId);
      toast.success("Data peminjaman dihapus");
    } catch (error) {
      toast.error("Gagal menghapus data");
    }
  };

  const getArchive = (id: string) => archives.find(a => a.id === id);

  const filtered = loans.filter(l => {
    const archive = getArchive(l.archiveId);
    const term = search.toLowerCase();
    return (
      l.borrowerName.toLowerCase().includes(term) ||
      l.notes?.toLowerCase().includes(term) ||
      l.purpose?.toLowerCase().includes(term) ||
      archive?.namaPemegangHak.toLowerCase().includes(term) ||
      archive?.noHak?.toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <Clock className="animate-spin text-blue-600" size={48} />
        </div>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Memuat Histori Peminjaman...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <History size={20} className="mr-3 text-blue-600" />
            Monitoring Peminjaman
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Log pergerakan fisik dokumen dalam basis data sistem
          </p>
        </div>

        <div className="relative group w-full lg:w-80">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <Input 
            placeholder="Cari Peminjam atau Catatan..." 
            className="pl-11 h-12 w-full rounded-2xl bg-white border-slate-200 text-xs font-bold focus:ring-4 focus:ring-blue-100 transition-all uppercase placeholder:normal-case"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/50">
        <div className="overflow-x-auto custom-scrollbar">
          <Table>
            <TableHeader className="bg-slate-50/50 border-b border-slate-100">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-14 font-black text-slate-500 text-[9px] uppercase tracking-[0.2em] px-6">Peminjam & Bukti</TableHead>
                <TableHead className="h-14 font-black text-slate-500 text-[9px] uppercase tracking-[0.2em] px-6">Detail Arsip</TableHead>
                <TableHead className="h-14 font-black text-slate-500 text-[9px] uppercase tracking-[0.2em] px-6">Masa Pinjam</TableHead>
                <TableHead className="h-14 font-black text-slate-500 text-[9px] uppercase tracking-[0.2em] px-6 text-center">Status</TableHead>
                <TableHead className="h-14 w-48 px-6"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center space-y-4 py-12">
                        <div className="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center">
                           <History size={40} className="text-slate-200" />
                        </div>
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Log Kosong</p>
                          <p className="text-[10px] text-slate-300 font-bold mt-1">Belum ada aktivitas peminjaman aktif</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((loan, idx) => {
                    const archive = getArchive(loan.archiveId);
                    const isOverdue = loan.status === 'Active' && isAfter(new Date(), new Date(loan.expectedReturnDate));

                    return (
                    <motion.tr
                      key={loan.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.03, duration: 0.4 }}
                      className={cn(
                        "group hover:bg-blue-50/20 transition-all border-b border-slate-50 last:border-0",
                        idx % 2 === 1 && "bg-slate-50/30"
                      )}
                    >
                      <TableCell className="px-6 py-5">
                        <div className="flex items-center space-x-4">
                           <div 
                            className="relative w-12 h-12 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center overflow-hidden cursor-pointer group/photo"
                            onClick={() => loan.borrowerPhoto && setSelectedPhoto(loan.borrowerPhoto)}
                           >
                              {loan.borrowerPhoto ? (
                                <img src={loan.borrowerPhoto} className="w-full h-full object-cover group-hover/photo:scale-110 transition-transform" />
                              ) : (
                                <User size={18} className="text-slate-300" />
                              )}
                              <div className="absolute inset-0 bg-blue-600/60 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye size={16} className="text-white" />
                              </div>
                           </div>
                           <div>
                              <p className="font-black text-slate-900 text-xs tracking-tight uppercase leading-none">{loan.borrowerName}</p>
                              <div className="flex items-center space-x-1.5 mt-1.5">
                                <span className="text-[8px] font-black px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-md uppercase tracking-wider">LOG-{loan.id.slice(-6).toUpperCase()}</span>
                                <p className="text-[9px] text-slate-400 font-bold uppercase truncate max-w-[100px]">{loan.purpose}</p>
                              </div>
                           </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-5">
                        <div className="space-y-1">
                          <p className="text-xs font-black text-slate-800 uppercase leading-none">
                            {archive?.type === 'BUKU_TANAH' ? `HAK ${archive.jenisHak} ${archive.noHak}` : `WARKAH ${archive?.noDI208}`}
                          </p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight truncate max-w-[150px]">
                            {archive?.namaPemegangHak || "Arsip Tidak Ditemukan"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-5">
                        <div className="flex flex-col space-y-1.5">
                           <div className="flex items-center space-x-1.5 text-slate-800 font-black text-[10px] uppercase">
                              <Calendar size={12} className="text-blue-500 shrink-0" />
                              <span>{format(new Date(loan.loanDate), 'dd MMM yy')}</span>
                              <ArrowRight size={10} className="text-slate-300" />
                              <span className={cn(isOverdue ? "text-red-600" : "text-slate-800")}>
                                {format(new Date(loan.expectedReturnDate), 'dd MMM yy')}
                              </span>
                           </div>
                           {loan.actualReturnDate && (
                             <p className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full w-fit uppercase tracking-widest">
                               Diterima: {format(new Date(loan.actualReturnDate), 'dd/MM/yy')}
                             </p>
                           )}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-5 text-center">
                        <div className={cn(
                          "status-chip mx-auto py-1",
                          loan.status === 'Active' 
                            ? (isOverdue ? "bg-red-50 text-red-600 border-red-100" : "bg-amber-50 text-amber-600 border-amber-100")
                            : "bg-emerald-50 text-emerald-600 border-emerald-100"
                        )}>
                          <div className={cn("w-1.5 h-1.5 rounded-full mr-2", 
                            loan.status === 'Active' ? (isOverdue ? "bg-red-500" : "bg-amber-500") : "bg-emerald-500"
                          )}></div>
                          <span>{loan.status === 'Active' ? (isOverdue ? 'Overdue' : 'Borrowed') : 'Returned'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-5 text-right">
                        <div className="flex items-center space-x-2">
                           <Button 
                            variant="outline" 
                            size="icon" 
                            className="rounded-xl h-9 w-9 shrink-0 group/print"
                            onClick={() => archive && setReceiptLoan({ loan, archive })}
                           >
                             <Printer size={14} className="text-slate-400 group-hover/print:text-blue-600 transition-colors" />
                           </Button>

                           {loan.status === 'Active' ? (
                             <Button 
                               className="bg-blue-600 hover:bg-blue-500 rounded-xl h-9 px-4 space-x-2 text-white font-black text-[9px] uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:-translate-y-0.5 transition-all flex-1"
                               onClick={() => handleReturn(loan.id, loan.archiveId)}
                             >
                               <span>Kembali</span>
                             </Button>
                           ) : (
                             <div className="flex-1 inline-flex items-center space-x-2 bg-emerald-50 text-emerald-600 px-4 h-9 rounded-xl justify-center">
                                <CheckCircle2 size={12} />
                                <span className="text-[8px] font-black uppercase tracking-widest">Closed</span>
                             </div>
                           )}

                           <DropdownMenu>
                              <DropdownMenuTrigger render={(triggerProps) => (
                                <Button {...triggerProps} variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                                  <MoreVertical size={14} className="text-slate-400" />
                                </Button>
                              )} />
                              <DropdownMenuContent align="end" className="rounded-2xl border-slate-100 shadow-xl p-1.5 w-40">
                                <DropdownMenuItem 
                                  className="rounded-xl cursor-pointer font-bold text-[10px] uppercase tracking-widest text-slate-600 focus:bg-blue-50 focus:text-blue-600"
                                  onClick={() => setEditingLoan(loan)}
                                >
                                  <Pencil size={14} className="mr-2" />
                                  Edit Data
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="rounded-xl cursor-pointer font-bold text-[10px] uppercase tracking-widest text-red-600 focus:bg-red-50 focus:text-red-700"
                                  onClick={() => handleDelete(loan.id, loan.archiveId)}
                                >
                                  <Trash2 size={14} className="mr-2" />
                                  Hapus Log
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                           </DropdownMenu>
                        </div>
                      </TableCell>
                    </motion.tr>
                    );
                  })
                )}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Overdue Alert Banner if any overdue */}
      {loans.some(l => l.status === 'Active' && isAfter(new Date(), new Date(l.expectedReturnDate))) && (
        <div className="bg-red-50 border border-red-100 rounded-3xl p-4 flex items-center space-x-4">
           <div className="w-10 h-10 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 shrink-0">
              <AlertCircle size={20} />
           </div>
           <div>
              <p className="text-[10px] font-black text-red-700 uppercase tracking-widest">Peringatan Keterlambatan</p>
              <p className="text-[9px] font-bold text-red-600/80 mt-0.5 uppercase">Terdapat berkas yang telah melewati batas waktu pengembalian. Segera hubungi peminjam.</p>
           </div>
        </div>
      )}

      {/* Edit Loan Dialog */}
      <Dialog open={!!editingLoan} onOpenChange={() => setEditingLoan(null)}>
        <DialogContent className="max-w-xl sm:rounded-[2.5rem] border-none shadow-2xl p-0 w-[95vw] sm:w-full bg-white overflow-hidden max-h-[90vh] flex flex-col">
          <div className="bg-slate-900 px-8 py-8 shrink-0">
             <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-1 bg-amber-500 rounded-full"></div>
                <p className="text-[9px] font-black text-amber-400 uppercase tracking-[0.2em]">Koreksi Log Peminjaman</p>
             </div>
             <DialogTitle className="text-white text-2xl font-black uppercase tracking-tight text-left">Edit Data</DialogTitle>
          </div>
          
          <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 custom-scrollbar">
             <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Peminjam</Label>
                    <Input 
                      value={editingLoan?.borrowerName || ''}
                      onChange={(e) => editingLoan && setEditingLoan({...editingLoan, borrowerName: e.target.value})}
                      className="rounded-2xl h-12 bg-slate-50 border-none font-bold text-xs focus:ring-4 focus:ring-blue-100 uppercase"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Batas Pengembalian</Label>
                    <Input 
                      type="date"
                      value={editingLoan?.expectedReturnDate?.split('T')[0] || ''}
                      onChange={(e) => editingLoan && setEditingLoan({...editingLoan, expectedReturnDate: new Date(e.target.value).toISOString()})}
                      className="rounded-2xl h-12 bg-slate-50 border-none font-bold text-xs focus:ring-4 focus:ring-blue-100"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tujuan Peminjaman</Label>
                  <Input 
                    value={editingLoan?.purpose || ''}
                    onChange={(e) => editingLoan && setEditingLoan({...editingLoan, purpose: e.target.value})}
                    className="rounded-2xl h-12 bg-slate-50 border-none font-bold text-xs focus:ring-4 focus:ring-blue-100 uppercase"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Catatan Tambahan</Label>
                  <Textarea 
                    value={editingLoan?.notes || ''}
                    onChange={(e) => editingLoan && setEditingLoan({...editingLoan, notes: e.target.value})}
                    className="rounded-2xl min-h-[100px] bg-slate-50 border-none font-bold text-xs focus:ring-4 focus:ring-blue-100 p-4"
                  />
                </div>
             </div>

             <div className="pt-4 flex gap-3">
                <Button type="button" variant="ghost" onClick={() => setEditingLoan(null)} className="rounded-2xl flex-1 h-12 font-black text-[10px] uppercase tracking-widest text-slate-400">Batal</Button>
                <Button 
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 rounded-2xl flex-1 h-12 font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-blue-600/20"
                >
                  Simpan Perubahan
                </Button>
             </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Photo Preview Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-xl p-0 overflow-hidden rounded-[2.5rem] border-none bg-black aspect-video flex items-center justify-center">
          {selectedPhoto && <img src={selectedPhoto} className="w-full h-full object-contain" />}
        </DialogContent>
      </Dialog>

      {/* Receipt Re-printing Dialog */}
      <Dialog open={!!receiptLoan} onOpenChange={() => setReceiptLoan(null)}>
        <DialogContent className="max-w-4xl sm:rounded-[2.5rem] border-none shadow-2xl p-0 w-full sm:w-[95vw] bg-white h-screen sm:h-[90vh] overflow-hidden flex flex-col">
          {receiptLoan && (
            <LoanReceipt 
              loan={receiptLoan.loan}
              archive={receiptLoan.archive}
              onClose={() => setReceiptLoan(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
