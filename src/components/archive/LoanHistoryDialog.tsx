import * as React from "react";
import { Loan, Archive } from "@/src/types";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { 
  History, 
  ArrowRight, 
  CheckCircle2, 
  Calendar,
  User,
  AlertCircle
} from "lucide-react";
import { cn } from "@/src/lib/utils";

interface LoanHistoryDialogProps {
  archive: Archive;
  loans: Loan[];
}

export function LoanHistoryDialog({ archive, loans }: LoanHistoryDialogProps) {
  const archiveLoans = loans
    .filter(l => l.archiveId === archive.id)
    .sort((a, b) => new Date(b.loanDate).getTime() - new Date(a.loanDate).getTime());

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-slate-900 p-8 shrink-0">
         <div className="flex items-center space-x-3 mb-2">
            <History size={16} className="text-blue-400" />
            <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em]">Log Aktivitas Dokumen</p>
         </div>
         <h2 className="text-white text-2xl font-black uppercase tracking-tight">Riwayat Peminjaman</h2>
         <p className="text-slate-400 text-[10px] font-medium mt-1">
           {archive.type === 'BUKU_TANAH' ? `HAK ${archive.jenisHak} NO. ${archive.noHak}` : `WARKAH NO. ${archive.noDI208}`}
         </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
        {archiveLoans.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center space-y-4 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
             <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300">
                <History size={32} />
             </div>
             <div>
                <p className="text-xs font-black text-slate-900 uppercase">Belum Ada Riwayat</p>
                <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase tracking-wide">Arsip ini belum pernah dipinjamkan.</p>
             </div>
          </div>
        ) : (
          <div className="space-y-4">
            {archiveLoans.map((loan) => (
              <div 
                key={loan.id} 
                className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 overflow-hidden flex items-center justify-center">
                      {loan.borrowerPhoto ? (
                        <img src={loan.borrowerPhoto} className="w-full h-full object-cover" />
                      ) : (
                        <User size={20} className="text-slate-300" />
                      )}
                    </div>
                    <div>
                       <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{loan.borrowerName}</p>
                       <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">ID: {loan.receiptNo}</p>
                    </div>
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                    loan.status === 'Active' ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                  )}>
                    {loan.status}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center">
                      <Calendar size={10} className="mr-1.5" /> Tanggal Keluar
                    </p>
                    <p className="text-[10px] font-black text-slate-700 uppercase">
                      {format(new Date(loan.loanDate), 'dd MMM yyyy HH:mm', { locale: id })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center">
                      <CheckCircle2 size={10} className="mr-1.5 text-emerald-500" /> Tanggal Kembali
                    </p>
                    <p className="text-[10px] font-black text-slate-700 uppercase">
                      {loan.actualReturnDate 
                        ? format(new Date(loan.actualReturnDate), 'dd MMM yyyy HH:mm', { locale: id })
                        : "BLM DIKEMBALIKAN"}
                    </p>
                  </div>
                </div>

                {loan.notes && (
                  <div className="mt-4 p-3 bg-slate-50 rounded-xl">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Catatan</p>
                    <p className="text-[10px] font-medium text-slate-600 italic">"{loan.notes}"</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-6 bg-white border-t border-slate-100 text-center">
         <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">Sistem Arsip Digital - Kantor Pertanahan Kota Banjarmasin</p>
      </div>
    </div>
  );
}
