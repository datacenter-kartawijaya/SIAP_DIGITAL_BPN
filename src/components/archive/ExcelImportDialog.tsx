import * as React from "react";
import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, Upload, AlertTriangle, Eye } from "lucide-react";
import { toast } from "sonner";
import { Archive, ArchiveType } from "@/src/types";
import { db, auth } from "@/src/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

interface ExcelImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type: ArchiveType;
  onCompleted: () => void;
}

export function ExcelImportDialog({ isOpen, onClose, type, onCompleted }: ExcelImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const typeText = type === "BUKU_TANAH" ? "Buku Tanah" : type === "SURAT_UKUR" ? "Surat Ukur" : "Data Warkah";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setErrorMessage(null);
      parseExcel(selectedFile);
    }
  };

  const parseExcel = (fileObj: File) => {
    setParsing(true);
    setParsedData([]);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error("Gagal membaca berkas.");

        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0]; // read first sheet
        const sheet = workbook.Sheets[sheetName];
        
        const rawRows = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[];
        
        if (rawRows.length === 0) {
          throw new Error("Berkas Excel kosong atau tidak memiliki baris data.");
        }

        // Apply heuristic column mapping
        const mappedRows = rawRows.map((row, idx) => {
          const rowKeys = Object.keys(row);
          const findValue = (possibleNames: string[]): any => {
            const matchedKey = rowKeys.find(k => 
              possibleNames.some(p => k.toLowerCase().replace(/[^a-z0-9]/g, "").includes(p))
            );
            return matchedKey ? row[matchedKey] : undefined;
          };

          // Heuristic mappings
          const namaPemegang = findValue(["namapemeganghak", "namapeganghak", "pemeganghak", "pemegang", "nama"]) || "";
          const kec = findValue(["kecamatan", "kec"]) || "";
          const kel = findValue(["kelurahan", "kelurahandesa", "desa", "kel"]) || "";
          const rk = findValue(["rak"]) || "";
          const sf = findValue(["shaft"]) || "";
          const bndl = findValue(["bundel", "boks", "box", "lokasisimpan"]) || "";
          const ket = findValue(["keterangan", "ket", "notes"]) || "";

          // Specific values
          const noHak = findValue(["nohak", "nomorhak"]) || "";
          const jenisHak = findValue(["jenishak", "tipehak"]) || "Hak Milik (HM)";
          const noSU = findValue(["nosu", "nomorsu", "suratukur"]) || "";
          const tahunSU = findValue(["tahunsu", "tahunsuratukur"]);
          const noSK = findValue(["nosk", "nomorsk", "sk"]) || "";
          const hasBTStr = String(findValue(["bukutanah", "hasbukutanah", "bt"]) || "ADA").toUpperCase();
          const hasSUStr = String(findValue(["suratukur", "hassuratukur", "su"]) || "ADA").toUpperCase();

          const noDI208 = findValue(["nodi208", "di208", "nomordi208"]) || "";
          const jenisWarkah = findValue(["jeniswarkah", "tipewarkah"]) || "Peralihan Hak";
          const jenisKegiatan = findValue(["jeniskegiatan", "kegiatan"]) || "Jual Beli";
          const tahun = findValue(["tahun", "tahundoc", "tahunwarkah"]);

          // Build final mapped object
          const result: any = {
            idExcel: idx + 1,
            namaPemegangHak: String(namaPemegang).toUpperCase().trim(),
            kecamatan: String(kec).toUpperCase().trim(),
            kelurahan: String(kel).toUpperCase().trim(),
            rak: String(rk).toUpperCase().trim() || "RAK A",
            shaft: String(sf).toUpperCase().trim() || "S1",
            keterangan: ket ? String(ket).trim() : "",
            status: "Available",
          };

          if (type === "BUKU_TANAH") {
            result.noHak = String(noHak).trim();
            result.jenisHak = String(jenisHak).trim();
            result.noSU = String(noSU).trim();
            result.tahunSU = tahunSU ? Number(tahunSU) : "";
            result.hasBukuTanah = !hasBTStr.includes("TIDAK") && !hasBTStr.includes("FALSE");
            result.hasSuratUkur = !hasSUStr.includes("TIDAK") && !hasSUStr.includes("FALSE");
            result.bundel = String(bndl).toUpperCase().trim() || "B-01";
            result.noSK = String(noSK).trim();
          } else if (type === "SURAT_UKUR") {
            result.noSU = String(noSU).trim();
            result.tahunSU = tahunSU ? Number(tahunSU) : "";
            result.noHak = String(noHak).trim();
            result.jenisHak = String(jenisHak).trim();
            result.hasBukuTanah = !hasBTStr.includes("TIDAK") && !hasBTStr.includes("FALSE");
            result.hasSuratUkur = true;
            result.bundel = String(bndl).toUpperCase().trim() || "B-01";
            result.noSK = String(noSK).trim();
          } else { // WARKAH
            result.noDI208 = String(noDI208).trim();
            result.jenisWarkah = String(jenisWarkah).trim();
            result.jenisKegiatan = String(jenisKegiatan).trim();
            result.tahun = tahun ? Number(tahun) : "";
            result.noHak = String(noHak).trim();
            result.noSK = String(noSK).trim();
            result.boks = String(bndl).toUpperCase().trim() || "BOX-01";
          }

          // Validation verification
          const errors: string[] = [];
          if (!result.namaPemegangHak) errors.push("Nama Pemegang HAK kosong");
          if (type === "BUKU_TANAH" && !result.noHak) errors.push("No. Hak kosong");
          if (type === "SURAT_UKUR" && !result.noSU) errors.push("No. SU kosong");
          if (type === "WARKAH" && !result.noDI208) errors.push("No. DI 208 kosong");

          result._isValid = errors.length === 0;
          result._errors = errors;

          return result;
        });

        setParsedData(mappedRows);
        toast.success(`Berhasil memetakan ${mappedRows.length} baris data dari Excel`);
      } catch (err: any) {
        setErrorMessage(err.message || "Gagal memproses berkas Excel.");
        toast.error("Gagal membaca berkas Excel");
      } finally {
        setParsing(false);
      }
    };

    reader.onerror = () => {
      setErrorMessage("Koneksi gagal membaca berkas.");
      setParsing(false);
    };

    reader.readAsBinaryString(fileObj);
  };

  const handleStartImport = async () => {
    if (parsedData.length === 0) return;
    setImporting(true);
    setImportProgress({ current: 0, total: parsedData.length });

    const collectionRef = collection(db!, "archives");
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i];
      if (!row._isValid) {
        failedCount++;
        setImportProgress(p => ({ ...p, current: i + 1 }));
        continue;
      }

      // Prepare payload to insert
      const { idExcel, _isValid, _errors, ...cleanPayload } = row;
      const finalPayload = {
        ...cleanPayload,
        type,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: auth?.currentUser?.uid || "anonymous_excel_import"
      };

      try {
        await addDoc(collectionRef, finalPayload);
        successCount++;
      } catch (e) {
        console.error("Failed to import excel row", row, e);
        failedCount++;
      }

      setImportProgress(p => ({ ...p, current: i + 1 }));
    }

    setImporting(false);
    toast.success(`Proses Impor Selesai! ${successCount} berhasil, ${failedCount} gagal.`);
    
    // Cleanup state
    setFile(null);
    setParsedData([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    
    onCompleted();
    onClose();
  };

  const validRows = parsedData.filter(r => r._isValid).length;
  const invalidRows = parsedData.filter(r => !r._isValid).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!importing && !open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col justify-start">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-lg font-black leading-tight uppercase tracking-wider text-slate-800 flex items-center">
            <FileSpreadsheet className="mr-2 text-emerald-600" size={22} />
            Impor XLS {typeText}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-4 py-4 pr-1">
          {/* File Upload Field Area */}
          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50 flex flex-col items-center justify-center transition-all hover:bg-slate-100 relative group cursor-pointer">
            <input 
              type="file" 
              accept=".xls,.xlsx" 
              onChange={handleFileChange} 
              className="absolute inset-0 opacity-0 cursor-pointer" 
              disabled={parsing || importing}
              ref={fileInputRef}
            />
            {file ? (
              <div className="text-center">
                <FileSpreadsheet className="mx-auto text-emerald-600 mb-2 scale-110 duration-200" size={40} />
                <p className="text-xs font-black text-slate-800 break-all">{file.name}</p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-bold">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="mx-auto text-slate-400 mb-2 group-hover:text-blue-500 transition-colors" size={40} />
                <p className="text-xs font-bold text-slate-700">Pilih atau Seret berkas Spreadsheet Excel (.xls / .xlsx)</p>
                <p className="text-[10px] text-slate-400 mt-1 font-mono uppercase tracking-widest">Kolom opsional akan dipetakan otomatis</p>
              </div>
            )}
          </div>

          {parsing && (
            <div className="flex items-center justify-center py-8 space-x-2 text-slate-500">
              <Loader2 className="animate-spin" size={20} />
              <span className="text-xs font-mono uppercase tracking-wider">Memproses dan Memetakan Kolom Excel...</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-2.5 text-red-800 text-xs">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Parsed Rows Preview Container */}
          {parsedData.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider px-1">
                <span className="font-bold text-slate-500">Pratinjau Mapped Excel (Maks. 10 baris pertama)</span>
                <div className="flex space-x-3">
                  <span className="text-emerald-700 font-black bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center">
                    <CheckCircle2 size={10} className="mr-1" /> {validRows} VALID
                  </span>
                  {invalidRows > 0 && (
                    <span className="text-amber-700 font-black bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 flex items-center">
                      <AlertTriangle size={10} className="mr-1" /> {invalidRows} BUTUH PERBAIKAN
                    </span>
                  )}
                </div>
              </div>

              <div className="border border-slate-100 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader className="bg-slate-50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="w-10 text-center font-bold text-slate-700 text-[10px] uppercase">No</TableHead>
                      <TableHead className="font-bold text-slate-700 text-[10px] uppercase">Pemegang Hak</TableHead>
                      <TableHead className="font-bold text-slate-700 text-[10px] uppercase">Wilayah (Kec/Kel)</TableHead>
                      <TableHead className="font-bold text-slate-700 text-[10px] uppercase">Lokasi (Rak/Sft)</TableHead>
                      {type === "BUKU_TANAH" && (
                        <>
                          <TableHead className="font-bold text-slate-700 text-[10px] uppercase">No Hak</TableHead>
                          <TableHead className="font-bold text-slate-700 text-[10px] uppercase">No/Thn SU</TableHead>
                          <TableHead className="font-bold text-slate-700 text-[10px] uppercase">BT/SU Phys</TableHead>
                        </>
                      )}
                      {type === "SURAT_UKUR" && (
                        <>
                          <TableHead className="font-bold text-slate-700 text-[10px] uppercase">No SU</TableHead>
                          <TableHead className="font-bold text-slate-700 text-[10px] uppercase">Tahun SU</TableHead>
                          <TableHead className="font-bold text-slate-700 text-[10px] uppercase">No Hak</TableHead>
                        </>
                      )}
                      {type === "WARKAH" && (
                        <>
                          <TableHead className="font-bold text-slate-700 text-[10px] uppercase">No DI 208</TableHead>
                          <TableHead className="font-bold text-slate-700 text-[10px] uppercase">Jenis / Kegiatan</TableHead>
                          <TableHead className="font-bold text-slate-700 text-[10px] uppercase">Tahun</TableHead>
                        </>
                      )}
                      <TableHead className="font-bold text-slate-700 text-[10px] uppercase text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 10).map((row, idx) => (
                      <TableRow key={idx} className={row._isValid ? "" : "bg-red-50/50 hover:bg-red-50/50"}>
                        <TableCell className="text-center font-mono text-[11px] text-slate-400">{row.idExcel}</TableCell>
                        <TableCell className="font-semibold text-slate-800 text-[11.5px] max-w-[150px] truncate" title={row.namaPemegangHak}>
                          {row.namaPemegangHak || <span className="text-red-500 italic">Kosong</span>}
                        </TableCell>
                        <TableCell className="font-medium text-slate-600 text-[11px] uppercase">
                          {row.kecamatan || "-"}/{row.kelurahan || "-"}
                        </TableCell>
                        <TableCell className="font-mono text-[11px] text-slate-500 uppercase">
                          {row.rak}/{row.shaft}
                        </TableCell>
                        {type === "BUKU_TANAH" && (
                          <>
                            <TableCell className="font-bold text-blue-900 text-[11.5px]">{row.noHak || "-"}</TableCell>
                            <TableCell className="font-mono text-[11px] text-slate-500">{row.noSU || "-"}/{row.tahunSU || "-"}</TableCell>
                            <TableCell className="text-[11px] text-slate-500 font-medium">
                              {row.hasBukuTanah ? "BT" : "-"} | {row.hasSuratUkur ? "SU" : "-"}
                            </TableCell>
                          </>
                        )}
                        {type === "SURAT_UKUR" && (
                          <>
                            <TableCell className="font-bold text-blue-900 text-[11.5px]">{row.noSU || "-"}</TableCell>
                            <TableCell className="font-mono text-[11px] text-slate-500">{row.tahunSU || "-"}</TableCell>
                            <TableCell className="font-medium text-slate-500 text-[11px]">{row.noHak || "-"}</TableCell>
                          </>
                        )}
                        {type === "WARKAH" && (
                          <>
                            <TableCell className="font-bold text-indigo-900 text-[11.5px]">{row.noDI208 || "-"}</TableCell>
                            <TableCell className="text-slate-500 text-[11px] max-w-[120px] truncate" title={`${row.jenisWarkah} - ${row.jenisKegiatan}`}>
                              {row.jenisWarkah} / {row.jenisKegiatan}
                            </TableCell>
                            <TableCell className="font-mono text-[11px] text-slate-500">{row.tahun || "-"}</TableCell>
                          </>
                        )}
                        <TableCell className="text-right">
                          {row._isValid ? (
                            <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Ready</span>
                          ) : (
                            <span className="text-[10px] font-black uppercase text-red-700 bg-red-100 px-1.5 py-0.5 rounded shrink-0 cursor-help" title={row._errors.join(", ")}>Invalid</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {parsedData.length > 10 && (
                <p className="text-[10px] font-mono text-slate-400 text-center uppercase">...menampilkan 10 dari total {parsedData.length} baris data Excel...</p>
              )}
            </div>
          )}

          {importing && (
            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-950 text-white space-y-3 shadow-inner">
              <div className="flex justify-between items-center text-xs font-mono uppercase tracking-wider">
                <span className="text-blue-400 flex items-center">
                  <Loader2 className="animate-spin mr-1.5" size={14} /> 
                  Menyinkronkan data ke cloud...
                </span>
                <span>{importProgress.current} / {importProgress.total} Baris</span>
              </div>
              
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-500 h-full transition-all duration-150" 
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 font-mono text-center">Harap jangan menutup modal atau me-refresh aplikasi saat impor berlangsung.</p>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 pt-2 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} disabled={importing} className="rounded-xl font-mono text-xs uppercase tracking-wider">
            Batal
          </Button>
          <Button 
            onClick={handleStartImport} 
            disabled={parsedData.length === 0 || validRows === 0 || importing || parsing}
            className="rounded-xl font-mono text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Mulai Impor ({validRows} Baris)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
