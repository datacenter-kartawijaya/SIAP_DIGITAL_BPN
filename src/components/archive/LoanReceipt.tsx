import * as React from "react";
import { Loan, Archive } from "@/src/types";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Printer, Download, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

interface LoanReceiptProps {
  loan: Loan;
  archive: Archive;
  onClose: () => void;
}

export function LoanReceipt({ loan, archive, onClose }: LoanReceiptProps) {
  const [isDownloading, setIsDownloading] = React.useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById("receipt-card");
    if (!element) return;

    try {
      setIsDownloading(true);

      const canvas = await html2canvas(element, {
        scale: 2, // improve resolution
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        onclone: (clonedDoc) => {
          const oklchToRgb = (lVal: string, cVal: string, hVal: string, aVal: string = "1") => {
            let l = lVal.includes("%") ? parseFloat(lVal) / 100 : parseFloat(lVal);
            let c = parseFloat(cVal) || 0;
            let h = parseFloat(hVal) || 0;

            const hRad = (h * Math.PI) / 180;
            const aValNum = aVal !== undefined && aVal !== null ? parseFloat(aVal) : 1;
            const okLabA = c * Math.cos(hRad);
            const okLabB = c * Math.sin(hRad);

            const l_ = l + 0.3963377774 * okLabA + 0.2158037573 * okLabB;
            const m_ = l - 0.1055613458 * okLabA - 0.0638541728 * okLabB;
            const s_ = l - 0.0894841775 * okLabA - 1.2914855480 * okLabB;

            const lFinal = l_ * l_ * l_;
            const mFinal = m_ * m_ * m_;
            const sFinal = s_ * s_ * s_;

            const rLin = 4.0767416621 * lFinal - 3.3077115913 * mFinal + 0.2309699292 * sFinal;
            const gLin = -1.2684380046 * lFinal + 2.6097574011 * mFinal - 0.3413193965 * sFinal;
            const bLin = -0.0041960863 * lFinal - 0.7034186147 * mFinal + 1.7076147010 * sFinal;

            const gamma = (v: number) => {
              return v > 0.0031308 ? 1.055 * Math.pow(v, 1 / 2.4) - 0.055 : 12.92 * v;
            };

            const r = Math.max(0, Math.min(255, Math.round(gamma(rLin) * 255)));
            const g = Math.max(0, Math.min(255, Math.round(gamma(gLin) * 255)));
            const b = Math.max(0, Math.min(255, Math.round(gamma(bLin) * 255)));

            if (aValNum !== 1 && !isNaN(aValNum)) {
              return `rgba(${r}, ${g}, ${b}, ${aValNum})`;
            }
            return `rgb(${r}, ${g}, ${b})`;
          };

          const replaceOklchWithRgb = (cssText: string): string => {
            const oklchRegex = /oklch\s*\(\s*([^/,\)\s]+)[,\s]+([^/,\)\s]+)[,\s]+([^/,\)\s]+)(?:\s*[\/\s,]\s*([^,\)\s]+))?\s*\)/gi;
            return cssText.replace(oklchRegex, (match, l, c, h, a) => {
              try {
                return oklchToRgb(l, c, h, a);
              } catch {
                return "rgb(120, 120, 120)";
              }
            });
          };

          // 1. Convert any inline styles in any element
          clonedDoc.querySelectorAll("[style]").forEach((el) => {
            const style = el.getAttribute("style");
            if (style && style.toLowerCase().includes("oklch")) {
              el.setAttribute("style", replaceOklchWithRgb(style));
            }
          });

          // 2. Convert raw <style> tags
          clonedDoc.querySelectorAll("style").forEach((styleEl) => {
            if (styleEl.textContent && styleEl.textContent.toLowerCase().includes("oklch")) {
              styleEl.textContent = replaceOklchWithRgb(styleEl.textContent);
            }
          });

          // 3. Convert rules within stylesheet objects
          Array.from(clonedDoc.styleSheets).forEach((sheet) => {
            try {
              let rulesText = "";
              const rules = Array.from(sheet.cssRules);
              let hasOklch = false;
              rules.forEach((rule) => {
                let txt = rule.cssText;
                if (txt.toLowerCase().includes("oklch")) {
                  hasOklch = true;
                  txt = replaceOklchWithRgb(txt);
                }
                rulesText += txt + "\n";
              });
              if (hasOklch) {
                const styleEl = clonedDoc.createElement("style");
                styleEl.textContent = rulesText;
                clonedDoc.head.appendChild(styleEl);
                if (sheet.ownerNode && sheet.ownerNode.parentNode) {
                  sheet.ownerNode.parentNode.removeChild(sheet.ownerNode);
                }
              }
            } catch (e) {
              // Ignore cross-origin error
            }
          });
        },
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const margin = 12; // 12mm page margin
      const usableWidth = pdfWidth - (margin * 2);
      const imgWidth = usableWidth;
      const imgHeight = (canvas.height * usableWidth) / canvas.width;

      // Center vertically if it fits perfectly on A4, otherwise align with top margin
      const yOffset = imgHeight < (pdfHeight - margin * 2)
        ? (pdfHeight - imgHeight) / 2
        : margin;

      pdf.addImage(imgData, "PNG", margin, yOffset, imgWidth, imgHeight);

      // Sanitize print receipt name for the file name
      const safeReceiptNo = loan.receiptNo.replace(/[^a-zA-Z0-9-]/g, "_");
      pdf.save(`Bukti_Pinjam_${safeReceiptNo}.pdf`);
    } catch (error) {
      console.error("Gagal mengunduh PDF:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-8 bg-slate-50 print:bg-white print:p-0" id="receipt-content">
        <div id="receipt-card" className="max-w-2xl mx-auto bg-white shadow-2xl rounded-[2rem] p-10 border border-slate-100 print:shadow-none print:border-none print:rounded-none">
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
          <Button 
            variant="outline" 
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="rounded-2xl h-12 px-6 space-x-2 border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} className={isDownloading ? "animate-bounce text-blue-600" : ""} />
            <span>{isDownloading ? "Mengunduh..." : "Simpan PDF"}</span>
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
