import * as React from "react";
import { Loan, Archive } from "@/src/types";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Printer, Download, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LoanReceiptProps {
  loan: Loan;
  archive: Archive;
  onClose: () => void;
}

export function LoanReceipt({ loan, archive, onClose }: LoanReceiptProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-8 bg-slate-50 print:bg-white print:p-0" id="receipt-content">
        <div className="max-w-2xl mx-auto bg-white shadow-2xl rounded-[2rem] p-10 border border-slate-100 print:shadow-none print:border-none print:rounded-none">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-8 mb-8">
            <div className="flex items-center space-x-4">
              <img src="/Logo_BPN.png" alt="BPN Logo" className="w-16 h-16 object-contain" />
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900 leading-none">ATR / BPN</h2>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Kota Banjarmasin</p>
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-black uppercase tracking-tighter text-blue-600">Bukti Pinjam</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">{loan.receiptNo}</p>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-8">
            <section>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Informasi Peminjam</h3>
              <div className="grid grid-cols-2 gap-6 bg-slate-50 rounded-2xl p-6">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Nama Peminjam</p>
                  <p className="text-sm font-black text-slate-900 uppercase mt-1">{loan.borrowerName}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Tujuan Peminjaman</p>
                  <p className="text-sm font-black text-slate-900 uppercase mt-1">{loan.purpose}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Tanggal Pinjam</p>
                  <p className="text-sm font-black text-slate-900 uppercase mt-1">{format(new Date(loan.loanDate), 'dd MMMM yyyy', { locale: id })}</p>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Batas Pengembalian</p>
                  <p className="text-sm font-black text-red-600 uppercase mt-1">{format(new Date(loan.expectedReturnDate), 'dd MMMM yyyy', { locale: id })}</p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Detail Arsip</h3>
              <div className="border border-slate-100 rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Identitas Dokumen</p>
                    <p className="text-lg font-black text-slate-900 uppercase mt-1">
                      {archive.type === 'BUKU_TANAH' ? `HAK ${archive.jenisHak} NO. ${archive.noHak}` : `WARKAH NO. ${archive.noDI208}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-slate-400 uppercase">Wilayah</p>
                    <p className="text-xs font-black text-slate-900 uppercase mt-1">{archive.kelurahan}, {archive.kecamatan}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-50">
                   <div className="bg-slate-50 rounded-xl p-3 text-center">
                      <p className="text-[7px] font-black text-slate-300 uppercase mb-1">RAK</p>
                      <p className="text-xs font-black text-slate-700">{archive.rak}</p>
                   </div>
                   <div className="bg-slate-50 rounded-xl p-3 text-center">
                      <p className="text-[7px] font-black text-slate-300 uppercase mb-1">SHFT</p>
                      <p className="text-xs font-black text-slate-700">{archive.shaft}</p>
                   </div>
                   <div className="bg-slate-50 rounded-xl p-3 text-center">
                      <p className="text-[7px] font-black text-slate-300 uppercase mb-1">BNDL</p>
                      <p className="text-xs font-black text-slate-700">{archive.bundel || "-"}</p>
                   </div>
                </div>
              </div>
            </section>

            {/* Footer / Signatures */}
            <div className="grid grid-cols-2 gap-12 pt-12">
               <div className="text-center space-y-20">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Petugas Arsip</p>
                  <div className="border-b border-slate-900 w-40 mx-auto"></div>
               </div>
               <div className="text-center space-y-20">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Penerima Berkas</p>
                  <p className="text-xs font-black text-slate-900 uppercase">{loan.borrowerName}</p>
               </div>
            </div>

            <div className="pt-8 text-center">
               <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest italic">
                 Dokumen ini dicetak secara otomatis oleh Sistem Arsip Digital BPN Kota Banjarmasin pada {format(new Date(), 'dd/MM/yyyy HH:mm')}
               </p>
            </div>
          </div>
        </div>
      </div>

      <div className="shrink-0 p-6 bg-white border-t border-slate-100 flex items-center justify-between print:hidden">
        <Button variant="ghost" onClick={onClose} className="rounded-2xl h-12 px-6 font-black uppercase text-[10px] tracking-widest text-slate-400">Tutup</Button>
        <div className="flex items-center space-x-3">
          <Button variant="outline" className="rounded-2xl h-12 px-6 space-x-2 border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest">
            <Download size={16} />
            <span>Simpan PDF</span>
          </Button>
          <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-500 rounded-2xl h-12 px-8 space-x-2 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-600/20">
            <Printer size={16} />
            <span>Cetak Tanda Terima</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
