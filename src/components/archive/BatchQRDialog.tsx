import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Download, 
  Printer, 
  Search, 
  QrCode, 
  Layers, 
  FileText, 
  Database,
  CheckCircle2,
  Info,
  X,
  FileDown,
  Loader2
} from "lucide-react";
import { Archive, ArchiveType } from "../../types";
import { toast } from "sonner";
import QRCode from "qrcode";

interface BatchQRDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type: ArchiveType;
  archives: Archive[];
}

interface QRGroup {
  id: string; // Unique group identifier
  key1: string; // kelurahan (for BT) or boks (for Warkah)
  key2?: string; // bundel (for BT)
  title: string;
  subtitle: string;
  documentCount: number;
  qrContent: string;
  fileName: string;
  itemsList: string[];
}

export function BatchQRDialog({ isOpen, onClose, type, archives }: BatchQRDialogProps) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [groupList, setGroupList] = React.useState<QRGroup[]>([]);
  const [qrPreviews, setQrPreviews] = React.useState<Record<string, string>>({});
  const [downloadProgress, setDownloadProgress] = React.useState<{ current: number; total: number } | null>(null);

  // 1. Process and rebuild QR groups whenever archives, type or search is changed
  React.useEffect(() => {
    if (!isOpen || !archives || archives.length === 0) {
      setGroupList([]);
      return;
    }

    // Filter relevant archives of the current type
    const relevantArchives = archives.filter(a => a.type === type);

    if (type === "BUKU_TANAH" || type === "SURAT_UKUR") {
      // Group by Kelurahan + Bundel
      const groupsMap: Record<string, Archive[]> = {};

      relevantArchives.forEach(arc => {
        const kel = (arc.kelurahan || "TANPA KELURAHAN").toUpperCase().trim();
        const bndl = (arc.bundel || "B-01").toUpperCase().trim();
        const mapKey = `${kel} || ${bndl}`;
        if (!groupsMap[mapKey]) {
          groupsMap[mapKey] = [];
        }
        groupsMap[mapKey].push(arc);
      });

      const processedGroups: QRGroup[] = Object.entries(groupsMap).map(([mapKey, items]) => {
        const [kel, bndl] = mapKey.split(" || ");
        
        // Sort items by noHak numerically or alphabetically
        const sortedItems = [...items].sort((a, b) => {
          const numA = parseInt(a.noHak || "", 10);
          const numB = parseInt(b.noHak || "", 10);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return (a.noHak || "").localeCompare(b.noHak || "");
        });

        // Format items: "noHak, SU.noSU, tahunSU;" or fallback
        const itemsTextLines = sortedItems.map(item => {
          const noHak = item.noHak || "-";
          
          let rawSU = item.noSU || "";
          let formattedSU = "SU.-";
          if (rawSU) {
            formattedSU = rawSU.toUpperCase().startsWith("SU.") ? rawSU : `SU.${rawSU}`;
          }
          
          const tahun = item.tahunSU ? `, ${item.tahunSU}` : "";
          return `${noHak}, ${formattedSU}${tahun};`;
        });

        // Header for Buku Tanah / Surat Ukur
        const header = `Buku Tanah dan Surat Ukur, Tahun\n,Bundel-${bndl};`;
        const qrContent = `${header}\n${itemsTextLines.join("\n")}`;
        const fileName = `Bundel-${bndl}_${kel.replace(/\s+/g, "_")}.png`;

        return {
          id: mapKey,
          key1: kel,
          key2: bndl,
          title: `Bundel ${bndl}`,
          subtitle: `Kelurahan ${kel}`,
          documentCount: items.length,
          qrContent: qrContent,
          fileName: fileName,
          itemsList: itemsTextLines
        };
      });

      setGroupList(processedGroups);
    } else {
      // WARKAH: Group by Boks
      const groupsMap: Record<string, Archive[]> = {};

      relevantArchives.forEach(arc => {
        const bks = (arc.boks || "BOX-1").toUpperCase().trim();
        if (!groupsMap[bks]) {
          groupsMap[bks] = [];
        }
        groupsMap[bks].push(arc);
      });

      const processedGroups: QRGroup[] = Object.entries(groupsMap).map(([boks, items]) => {
        // Sort items by noDI208
        const sortedItems = [...items].sort((a, b) => {
          const numA = parseInt(a.noDI208 || "", 10);
          const numB = parseInt(b.noDI208 || "", 10);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return (a.noDI208 || "").localeCompare(b.noDI208 || "");
        });

        // Format items: "noDI208, NAMA_PEMEGANG;"
        const itemsTextLines = sortedItems.map(item => {
          const noDI = item.noDI208 || "-";
          const nama = (item.namaPemegangHak || "TANPA NAMA").toUpperCase();
          return `${noDI}, ${nama};`;
        });

        const header = `Data Warkah,${boks};`;
        const qrContent = `${header}\n${itemsTextLines.join("\n")}`;
        const fileName = `Warkah_${boks.replace(/\s+/g, "_")}.png`;

        return {
          id: boks,
          key1: boks,
          title: boks,
          subtitle: "Arsip Warkah",
          documentCount: items.length,
          qrContent: qrContent,
          fileName: fileName,
          itemsList: itemsTextLines
        };
      });

      setGroupList(processedGroups);
    }
  }, [isOpen, archives, type]);

  // 2. Pre-generate QR Code image previews for all processed groups
  React.useEffect(() => {
    if (groupList.length === 0) {
      setQrPreviews({});
      return;
    }

    const generateAllPreviews = async () => {
      const previews: Record<string, string> = {};
      for (const group of groupList) {
        try {
          const url = await QRCode.toDataURL(group.qrContent, {
            width: 250,
            margin: 1,
            errorCorrectionLevel: "L" // Use low error correction for high density data payload fit
          });
          previews[group.id] = url;
        } catch (err) {
          console.error("Failed to generate QR preview", err);
        }
      }
      setQrPreviews(previews);
    };

    generateAllPreviews();
  }, [groupList]);

  // Filter groups search
  const filteredGroups = groupList.filter(g => {
    const search = searchTerm.toLowerCase();
    return (
      g.title.toLowerCase().includes(search) ||
      g.subtitle.toLowerCase().includes(search) ||
      g.id.toLowerCase().includes(search)
    );
  });

  // Action: Single scan text visualization popover
  const showContentToast = (group: QRGroup) => {
    toast.info(
      <div className="space-y-2 p-1 max-h-[300px] overflow-y-auto text-left font-mono text-[9px]">
        <p className="font-bold text-slate-800 border-b pb-1">Encodasi QR ({group.title})</p>
        <pre className="whitespace-pre-wrap">{group.qrContent}</pre>
      </div>,
      { duration: 6000 }
    );
  };

  // Action: Download single QR code
  const handleDownloadSingle = (group: QRGroup) => {
    const dataUrl = qrPreviews[group.id];
    if (!dataUrl) {
      toast.error("QR Code belum siap, silakan coba lagi");
      return;
    }

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = group.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Berhasil mengunduh label ${group.title}`);
  };

  // Action: Sequential batch download
  const handleDownloadAll = async () => {
    if (filteredGroups.length === 0) {
      toast.error("Tidak ada data QR yang tersedia untuk diunduh");
      return;
    }

    toast.info(`Memulai pengunduhan ${filteredGroups.length} QR Code secara otomatis...`);
    setDownloadProgress({ current: 0, total: filteredGroups.length });

    for (let i = 0; i < filteredGroups.length; i++) {
      const group = filteredGroups[i];
      const dataUrl = qrPreviews[group.id];
      if (dataUrl) {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = group.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Stagger to let browser register downloads
        await new Promise((resolve) => setTimeout(resolve, 350));
        setDownloadProgress({ current: i + 1, total: filteredGroups.length });
      }
    }

    setTimeout(() => {
      setDownloadProgress(null);
      toast.success(`Berhasil mengunduh ${filteredGroups.length} berkas QR Code!`);
    }, 500);
  };

  // Action: Print Single QR Label
  const handlePrintSingle = (group: QRGroup) => {
    const qrImage = qrPreviews[group.id];
    if (!qrImage) {
      toast.error("QR image tidak siap");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup diblokir oleh browser. Harap izinkan popup untuk mencetak.");
      return;
    }

    const typeLabel = type === "BUKU_TANAH" ? "BUKU TANAH" : type === "SURAT_UKUR" ? "SURAT UKUR" : "WARKAH";
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak Label QR - ${group.title}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background-color: white;
            }
            .label-card {
              border: 2px solid #000;
              padding: 20px;
              width: 320px;
              text-align: center;
              border-radius: 12px;
              box-sizing: border-box;
            }
            .title {
              font-size: 11px;
              font-weight: 900;
              letter-spacing: 0.1em;
              text-transform: uppercase;
              margin-bottom: 2px;
            }
            .sub {
              font-size: 9px;
              color: #555;
              text-transform: uppercase;
              font-weight: bold;
              margin-bottom: 12px;
            }
            .qr-img {
              width: 180px;
              height: 180px;
              object-fit: contain;
              margin-bottom: 12px;
            }
            .info-box {
              background-color: #f0f0f0;
              padding: 8px;
              border-radius: 4px;
              font-size: 10px;
              font-weight: bold;
              font-family: monospace;
              text-transform: uppercase;
            }
            .footer {
              font-size: 8px;
              color: #777;
              margin-top: 8px;
              font-weight: bold;
              letter-spacing: 0.05em;
            }
            @media print {
              body { height: auto; }
              .label-card { border: 1px solid #000; box-shadow: none; page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="label-card">
            <div class="title">ATR / BPN KOTA BANJARMASIN</div>
            <div class="sub">SIAP DIGITAL - SISTEM ARSIP DIGITAL</div>
            <img src="${qrImage}" class="qr-img" />
            <div class="info-box">
              ${typeLabel}<br/>
              ${group.title}<br/>
              ${group.subtitle}<br/>
              (${group.documentCount} BERKAS)
            </div>
            <div class="footer">CV. KARTAWIJAYA MANDIRI</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Action: Print All QR Labels on a sheet
  const handlePrintAll = () => {
    if (filteredGroups.length === 0) {
      toast.error("Tidak ada data QR yang tersedia untuk dicetak");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup diblokir oleh browser. Harap izinkan popup untuk mencetak.");
      return;
    }

    const typeLabel = type === "BUKU_TANAH" ? "BUKU TANAH" : type === "SURAT_UKUR" ? "SURAT UKUR" : "WARKAH";
    
    let labelsHTML = "";
    filteredGroups.forEach(group => {
      const qrImage = qrPreviews[group.id];
      if (qrImage) {
        labelsHTML += `
          <div class="label-card">
            <div class="title">ATR / BPN KOTA BANJARMASIN</div>
            <div class="sub">SIAP DIGITAL - SISTEM ARSIP DIGITAL</div>
            <img src="${qrImage}" class="qr-img" />
            <div class="info-box">
              ${typeLabel}<br/>
              ${group.title}<br/>
              ${group.subtitle}<br/>
              (${group.documentCount} BERKAS)
            </div>
            <div class="footer">CV. KARTAWIJAYA MANDIRI</div>
          </div>
        `;
      }
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak Semua Label QR (${filteredGroups.length})</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              margin: 0;
              padding: 20px;
              background-color: white;
            }
            .grid-container {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
              gap: 20px;
              justify-content: center;
            }
            .label-card {
              border: 1px solid #000;
              padding: 12px;
              text-align: center;
              border-radius: 8px;
              box-sizing: border-box;
              background: white;
              page-break-inside: avoid;
            }
            .title {
              font-size: 9px;
              font-weight: 900;
              letter-spacing: 0.05em;
              text-transform: uppercase;
              margin-bottom: 1px;
            }
            .sub {
              font-size: 7.5px;
              color: #555;
              text-transform: uppercase;
              font-weight: bold;
              margin-bottom: 8px;
            }
            .qr-img {
              width: 140px;
              height: 140px;
              object-fit: contain;
              margin-bottom: 8px;
            }
            .info-box {
              background-color: #f7f7f7;
              padding: 6px;
              border-radius: 4px;
              font-size: 8px;
              line-height: 1.3;
              font-weight: bold;
              font-family: monospace;
              text-transform: uppercase;
            }
            .footer {
              font-size: 7px;
              color: #777;
              margin-top: 6px;
              font-weight: bold;
              letter-spacing: 0.05em;
            }
            @media print {
              body { padding: 0; }
              .grid-container {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 15px;
              }
              .label-card {
                border: 1px dashed #666;
              }
            }
          </style>
        </head>
        <body>
          <h2 style="font-size: 12px; text-transform: uppercase; text-align: center; font-weight: bold; margin-bottom: 20px;" class="no-print">
            Preview Lembar Cetak Label QR (Total: ${filteredGroups.length} Label)
          </h2>
          <div class="grid-container">
            ${labelsHTML}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 1000);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const currentTypeText = type === "BUKU_TANAH" ? "Buku Tanah" : type === "SURAT_UKUR" ? "Surat Ukur" : "Data Warkah";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl sm:rounded-[2.5rem] border-none shadow-2xl p-0 w-[95vw] sm:w-full bg-slate-900 text-white min-h-[85vh] max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header section with high visual contrast */}
        <DialogHeader className="p-6 md:p-8 border-b border-white/5 bg-slate-950 shrink-0 relative">
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X size={20} />
          </button>

          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <QrCode size={24} />
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-tight">QR Code Batch Generator</DialogTitle>
              <DialogDescription className="text-slate-400 text-xs mt-1 font-medium">
                Digitalisasi register {currentTypeText} Kabupaten Tanah Bumbu / Kota Banjarmasin. 
                {type === "BUKU_TANAH" || type === "SURAT_UKUR" 
                  ? " QR dihasilkan per Kelurahan per Bundel." 
                  : " QR dihasilkan per Box (Warkah)."
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Top filter toolbar */}
        <div className="p-4 md:px-8 md:py-4 bg-slate-950/60 border-b border-white/5 shrink-0 flex flex-wrap gap-4 items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <Input
              type="text"
              placeholder={type === "BUKU_TANAH" || type === "SURAT_UKUR" ? "Cari Kelurahan / No. Bundel..." : "Cari Box..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 bg-slate-900 border-white/10 rounded-xl text-xs font-semibold focus:border-purple-500 text-white placeholder-slate-500"
            />
          </div>

          <div className="flex items-center space-x-2 shrink-0 w-full sm:w-auto mt-2 sm:mt-0 justify-end">
            <Button
              variant="outline"
              onClick={handlePrintAll}
              disabled={filteredGroups.length === 0}
              className="h-10 border-white/10 rounded-xl hover:bg-white/5 text-xs font-black uppercase tracking-widest text-slate-300 hover:text-white"
            >
              <Printer size={16} className="mr-2 text-purple-400" />
              Cetak Semua Label
            </Button>

            <Button
              onClick={handleDownloadAll}
              disabled={filteredGroups.length === 0 || downloadProgress !== null}
              className="bg-purple-600 hover:bg-purple-500 h-10 rounded-xl text-xs font-black uppercase tracking-widest text-white shadow-lg"
            >
              <Download size={16} className="mr-2" />
              {downloadProgress ? `${downloadProgress.current}/${downloadProgress.total} Unduh` : "Unduh Semua PNG"}
            </Button>
          </div>
        </div>

        {/* Dynamic download progress bar */}
        {downloadProgress && (
          <div className="bg-purple-900/50 px-8 py-2 border-b border-purple-500/20 text-xs font-black flex items-center justify-between shrink-0">
            <span className="flex items-center text-purple-300 animate-pulse">
              <FileDown size={14} className="mr-2" />
              Mengunduh berkas label QR kelompok ({downloadProgress.current} dari {downloadProgress.total})
            </span>
            <span className="text-purple-200">
              {Math.round((downloadProgress.current / downloadProgress.total) * 100)}%
            </span>
          </div>
        )}

        {/* Main interactive grid content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-900/90 blueprint-grid relative">
          <div className="absolute inset-0 bg-slate-900/40 pointer-events-none backdrop-blur-[1px]"></div>
          
          <div className="relative z-10">
            {filteredGroups.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-center max-w-md mx-auto">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 mb-4 shadow-inner">
                  <Layers size={28} />
                </div>
                <h3 className="font-extrabold text-white text-base">Tidak Ada Kelompok Ditemukan</h3>
                <p className="text-sm text-slate-400 mt-1.5 font-medium leading-relaxed">
                  Tidak ditemukan record arsip {currentTypeText} dengan data pengelompokan yang valid, atau tidak cocok dengan filter pencarian.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGroups.map(group => {
                  const qrUrl = qrPreviews[group.id];
                  return (
                    <div 
                      key={group.id} 
                      className="bg-slate-950/65 border border-white/5 rounded-3xl p-5 hover:border-purple-500/30 transition-all duration-300 flex flex-col justify-between backdrop-blur-md shadow-xl"
                    >
                      <div className="space-y-4">
                        {/* Title of group */}
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-black uppercase bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
                              {type === "BUKU_TANAH" || type === "SURAT_UKUR" ? "BT / SU Bundle" : "Warkah Box"}
                            </span>
                            <h4 className="text-white font-black text-sm uppercase tracking-tight mt-1.5">{group.title}</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{group.subtitle}</p>
                          </div>
                          <span className="text-[10px] font-mono bg-slate-900 text-slate-300 border border-white/5 px-2 py-1 rounded-xl">
                            {group.documentCount} Berkas
                          </span>
                        </div>

                        {/* Interactive QR Display & click preview */}
                        <div className="flex justify-center bg-slate-900/50 p-4 rounded-2xl border border-white/5 hover:bg-slate-900/80 transition-all duration-300 group cursor-pointer relative">
                          {qrUrl ? (
                            <img 
                              src={qrUrl} 
                              alt={`QR ${group.title}`} 
                              className="w-36 h-36 object-contain image-rendering-pixelated group-hover:scale-105 transition-transform duration-500" 
                            />
                          ) : (
                            <div className="w-36 h-36 flex items-center justify-center text-slate-600">
                              <Loader2 className="animate-spin" size={20} />
                            </div>
                          )}
                          <div 
                            onClick={() => showContentToast(group)}
                            className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-[10px] font-bold text-slate-200 uppercase tracking-widest gap-2 rounded-2xl"
                          >
                            <Info size={18} className="text-purple-400" />
                            Klik Lihat Enkripsi QR
                          </div>
                        </div>

                        {/* Quick scroll contents */}
                        <div className="border border-white/5 p-3 rounded-2xl bg-slate-900/30 font-mono text-[8px] max-h-[85px] overflow-y-auto leading-normal text-slate-400">
                          <p className="font-extrabold text-white/50 border-b border-white/5 pb-1 uppercase flex items-center tracking-wider">
                            <Database size={8} className="mr-1 text-purple-400" />
                            Daftar Record di QR:
                          </p>
                          <div className="pt-1.5 space-y-0.5">
                            {group.itemsList.slice(0, 10).map((line, idx) => (
                              <p key={idx} className="hover:text-white transition-colors">{line}</p>
                            ))}
                            {group.itemsList.length > 10 && (
                              <p className="text-purple-400 font-black italic mt-1 font-sans">
                                ... Dan {group.itemsList.length - 10} lembar berkas lainnya
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Button footer controls */}
                      <div className="grid grid-cols-2 gap-2.5 pt-4 border-t border-white/5 mt-4 shrink-0">
                        <Button
                          variant="outline"
                          onClick={() => handlePrintSingle(group)}
                          className="h-9 border-white/10 rounded-xl hover:bg-white/5 text-[9px] font-black uppercase tracking-widest text-slate-300 hover:text-white"
                        >
                          <Printer size={12} className="mr-1.5 text-slate-400" />
                          Cetak Label
                        </Button>
                        <Button
                          onClick={() => handleDownloadSingle(group)}
                          className="bg-purple-900/40 hover:bg-purple-600 hover:text-white h-9 rounded-xl text-[9px] font-black uppercase tracking-widest border border-purple-500/20 text-purple-300 transition-all duration-300 shadow-md"
                        >
                          <Download size={12} className="mr-1.5" />
                          Unduh PNG
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Dialog footer block */}
        <div className="p-6 border-t border-white/5 flex gap-3 shrink-0 bg-slate-950 justify-between items-center">
          <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">
            SISTEM ARSIP DIGITAL ATR / BPN • CV. KARTAWIJAYA MANDIRI
          </p>
          <Button 
            variant="ghost" 
            onClick={onClose} 
            className="rounded-xl h-10 px-6 font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 border border-white/5"
          >
            Tutup Panel
          </Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
