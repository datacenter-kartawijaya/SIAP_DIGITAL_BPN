import * as React from "react";
import { Loan, Archive } from "@/src/types";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Printer, Download, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface LoanReceiptProps {
  loan: Loan;
  archive: Archive;
  onClose: () => void;
}

export function LoanReceipt({ loan, archive, onClose }: LoanReceiptProps) {
  const [isGenerating, setIsGenerating] = React.useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleSavePDF = async () => {
    const element = document.getElementById("receipt-download-card");
    if (!element) {
      toast.error("Elemen tanda terima tidak ditemukan");
      return;
    }

    setIsGenerating(true);
    const toastId = toast.loading("Sedang memproses dan mengunduh berkas PDF...");

    try {
      // Small timeout to let any rendering settle
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Capture the card element using html2canvas with special workarounds for oklch colors
      const canvas = await html2canvas(element, {
        scale: 2, // 2x resolution for super crisp text and logo
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        onclone: (clonedDoc) => {
          // 1. Sanitize style tags of the cloned document by replacing oklch with hex colors
          const styles = clonedDoc.querySelectorAll("style");
          styles.forEach((style) => {
            style.innerHTML = style.innerHTML.replace(/oklch\([^)]+\)/g, (match) => {
              if (match.includes("0.97") || match.includes("0.96") || match.includes("0.95")) return "#f8fafc";
              if (match.includes("253.514") || match.includes("253.5") || match.includes("250")) return "#2563eb";
              if (match.includes("0.573")) return "#2563eb";
              return "#1e293b";
            });
          });

          // 2. Sanitize all elements in the cloned document by setting safe hex inline styles 
          const allElements = clonedDoc.querySelectorAll("*");
          allElements.forEach((node) => {
            const htmlEl = node as HTMLElement;
            if (htmlEl.style) {
              if (htmlEl.style.cssText) {
                htmlEl.style.cssText = htmlEl.style.cssText.replace(/oklch\([^)]+\)/g, "#1e293b");
              }
              
              let classStr = "";
              if (typeof htmlEl.getAttribute === "function") {
                classStr = htmlEl.getAttribute("class") || "";
              } else if (typeof htmlEl.className === "string") {
                classStr = htmlEl.className;
              }
              const classes = classStr ? classStr.split(/\s+/) : [];
              
              // Apply hard colors to avoid Tailwind V4 custom oklch variables lookup in computedStyle
              if (classes.includes("bg-white")) htmlEl.style.backgroundColor = "#ffffff";
              if (classes.includes("bg-slate-50")) htmlEl.style.backgroundColor = "#f8fafc";
              if (classes.includes("bg-blue-600")) htmlEl.style.backgroundColor = "#2563eb";
              
              if (classes.includes("text-slate-900")) htmlEl.style.color = "#0f172a";
              if (classes.includes("text-slate-700")) htmlEl.style.color = "#334155";
              if (classes.includes("text-slate-500")) htmlEl.style.color = "#64748b";
              if (classes.includes("text-slate-400")) htmlEl.style.color = "#94a3b8";
              if (classes.includes("text-slate-300")) htmlEl.style.color = "#cbd5e1";
              if (classes.includes("text-blue-600")) htmlEl.style.color = "#2563eb";
              if (classes.includes("text-red-600")) htmlEl.style.color = "#dc2626";

              if (classes.includes("border-slate-100")) {
                htmlEl.style.borderColor = "#f1f5f9";
                htmlEl.style.borderStyle = "solid";
                htmlEl.style.borderWidth = "1px";
              }
              if (classes.includes("border-slate-50")) {
                htmlEl.style.borderColor = "#f8fafc";
                htmlEl.style.borderStyle = "solid";
                htmlEl.style.borderWidth = "1px";
              }
              if (classes.includes("border-b-2") && classes.includes("border-slate-900")) {
                htmlEl.style.borderBottom = "2px solid #0f172a";
              }
              if (classes.includes("border-b") && classes.includes("border-slate-900")) {
                htmlEl.style.borderBottom = "1px solid #0f172a";
              }
              if (classes.includes("border-t") && classes.includes("border-slate-50")) {
                htmlEl.style.borderTop = "1px solid #f8fafc";
              }
            }
          });
        },
      });

      const imgData = canvas.toDataURL("image/png");

      // Calculate A4 dimensions (210mm x 297mm)
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Maintain margins and size nicely
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const margin = 10; // 10mm margins
      const targetWidth = pdfWidth - (margin * 2);
      const targetHeight = (canvas.height * targetWidth) / canvas.width;

      // Add image to cover properly
      pdf.addImage(imgData, "PNG", margin, margin, targetWidth, targetHeight, undefined, "FAST");

      const fileName = `bukti_pinjam_${loan.receiptNo ? loan.receiptNo.replace(/\//g, "-") : "tanda_terima"}.pdf`;
      pdf.save(fileName);

      toast.success("PDF Berhasil Diunduh!", {
        id: toastId,
        description: `Berkas ${fileName} telah disimpan.`,
      });
    } catch (err: any) {
      console.error("Gagal melakukan ekspor PDF:", err);
      toast.error("Gagal mengunduh berkas PDF", {
        id: toastId,
        description: err.message || "Silakan coba lagi.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-8 bg-slate-50 print:bg-white print:p-0" id="receipt-content">
        <div 
          id="receipt-download-card"
          className="max-w-2xl mx-auto bg-white shadow-2xl rounded-[2rem] p-10 border border-slate-100 print:shadow-none print:border-none print:rounded-none"
        >
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
                      <p className="text-[7px] font-black text-slate-300 uppercase mb-1">BOKS</p>
                      <p className="text-xs font-black text-slate-700">{archive.boks || archive.bundel || "-"}</p>
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
          <Button 
            variant="outline" 
            onClick={handleSavePDF} 
            disabled={isGenerating}
            className="rounded-2xl h-12 px-6 space-x-2 border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest"
          >
            <Download size={16} />
            <span>{isGenerating ? "Sedang Mengunduh..." : "Simpan PDF"}</span>
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
