import * as React from "react";
import { useState } from "react";
import { 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  FileJson, 
  ShieldAlert,
  HelpCircle,
  Loader2,
  Trash2,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { db, auth } from "../lib/firebase";
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  writeBatch,
  serverTimestamp 
} from "firebase/firestore";

interface BackupData {
  users: any[];
  archives: any[];
  loans: any[];
  locations: any[];
  notifications: any[];
}

export function DatabaseBackup() {
  const [loading, setLoading] = useState(false);
  const [syncMode, setSyncMode] = useState<"MERGE" | "OVERWRITE">("MERGE");
  const [importConfirmText, setImportConfirmText] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedPreview, setParsedPreview] = useState<{
    format: "JSON" | "SQL";
    collections: Record<string, number>;
    rawRowsCount: number;
    isValid: boolean;
    data?: BackupData;
  } | null>(null);

  const colNames = ["users", "archives", "loans", "locations", "notifications"];

  // --------------------------------------------------
  // 1. Fetch all Firestore data as structured collections map
  // --------------------------------------------------
  const fetchAllData = async (): Promise<BackupData> => {
    if (!db) throw new Error("Database tidak terhubung.");
    
    const result: BackupData = {
      users: [],
      archives: [],
      loans: [],
      locations: [],
      notifications: []
    };

    for (const col of colNames) {
      const snap = await getDocs(collection(db, col));
      result[col as keyof BackupData] = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }

    return result;
  };

  // --------------------------------------------------
  // 2. Export Database to JSON File
  // --------------------------------------------------
  const handleExportJSON = async () => {
    setLoading(true);
    setStatusMessage("Mempersiapkan data ekspor JSON...");
    try {
      const dbAll = await fetchAllData();
      const jsonString = JSON.stringify(dbAll, null, 2);
      
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `SINKRON_DB_FULL_${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success("Database berhasil diekspor ke file JSON");
    } catch (error: any) {
      toast.error("Gagal melakukan ekspor JSON: " + error.message);
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };

  // --------------------------------------------------
  // 3. Export Database to Relational SQL Script
  // --------------------------------------------------
  const handleExportSQL = async () => {
    setLoading(true);
    setStatusMessage("Membentuk relasi data dan script SQL...");
    try {
      const dbAll = await fetchAllData();
      let sqlText = `-- ========================================================\n`;
      sqlText += `-- SINKRONISASI DATABASE CADANGAN (KANTOR PERTANAHAN BANJARMASIN)\n`;
      sqlText += `-- Tanggal Dibuat: ${new Date().toISOString()}\n`;
      sqlText += `-- Format: PostgreSQL / MySQL Relational Script\n`;
      sqlText += `-- ========================================================\n\n`;

      // Structure declarations
      sqlText += `CREATE TABLE IF NOT EXISTS users (\n`;
      sqlText += `  uid VARCHAR(128) PRIMARY KEY,\n`;
      sqlText += `  email VARCHAR(255),\n`;
      sqlText += `  displayName VARCHAR(255),\n`;
      sqlText += `  role VARCHAR(64),\n`;
      sqlText += `  isActive BOOLEAN,\n`;
      sqlText += `  createdAt TIMESTAMP\n`;
      sqlText += `);\n\n`;

      sqlText += `CREATE TABLE IF NOT EXISTS archives (\n`;
      sqlText += `  id VARCHAR(128) PRIMARY KEY,\n`;
      sqlText += `  type VARCHAR(64),\n`;
      sqlText += `  namaPemegangHak VARCHAR(255),\n`;
      sqlText += `  kecamatan VARCHAR(255),\n`;
      sqlText += `  kelurahan VARCHAR(255),\n`;
      sqlText += `  rak VARCHAR(64),\n`;
      sqlText += `  shaft VARCHAR(64),\n`;
      sqlText += `  bundel VARCHAR(64),\n`;
      sqlText += `  boks VARCHAR(64),\n`;
      sqlText += `  keterangan TEXT,\n`;
      sqlText += `  status VARCHAR(64),\n`;
      sqlText += `  createdAt TIMESTAMP,\n`;
      sqlText += `  updatedAt TIMESTAMP,\n`;
      sqlText += `  createdBy VARCHAR(128),\n`;
      sqlText += `  noHak VARCHAR(128),\n`;
      sqlText += `  jenisHak VARCHAR(255),\n`;
      sqlText += `  noSU VARCHAR(128),\n`;
      sqlText += `  tahunSU INT,\n`;
      sqlText += `  noSK VARCHAR(255),\n`;
      sqlText += `  hasBukuTanah BOOLEAN,\n`;
      sqlText += `  hasSuratUkur BOOLEAN,\n`;
      sqlText += `  noDI208 VARCHAR(128),\n`;
      sqlText += `  jenisWarkah VARCHAR(255),\n`;
      sqlText += `  jenisKegiatan VARCHAR(255),\n`;
      sqlText += `  tahun INT\n`;
      sqlText += `);\n\n`;

      sqlText += `CREATE TABLE IF NOT EXISTS loans (\n`;
      sqlText += `  id VARCHAR(128) PRIMARY KEY,\n`;
      sqlText += `  archiveId VARCHAR(128),\n`;
      sqlText += `  borrowerName VARCHAR(255),\n`;
      sqlText += `  purpose TEXT,\n`;
      sqlText += `  borrowerPhoto TEXT,\n`;
      sqlText += `  receiptNo VARCHAR(128),\n`;
      sqlText += `  loanDate TIMESTAMP,\n`;
      sqlText += `  expectedReturnDate TIMESTAMP,\n`;
      sqlText += `  actualReturnDate TIMESTAMP,\n`;
      sqlText += `  status VARCHAR(64),\n`;
      sqlText += `  notes TEXT,\n`;
      sqlText += `  createdBy VARCHAR(128),\n`;
      sqlText += `  returnedBy VARCHAR(128),\n`;
      sqlText += `  reminderSent BOOLEAN\n`;
      sqlText += `);\n\n`;

      sqlText += `CREATE TABLE IF NOT EXISTS locations (\n`;
      sqlText += `  id VARCHAR(128) PRIMARY KEY,\n`;
      sqlText += `  name VARCHAR(255),\n`;
      sqlText += `  type VARCHAR(64),\n`;
      sqlText += `  parentId VARCHAR(128)\n`;
      sqlText += `);\n\n`;

      sqlText += `CREATE TABLE IF NOT EXISTS notifications (\n`;
      sqlText += `  id VARCHAR(128) PRIMARY KEY,\n`;
      sqlText += `  title VARCHAR(255),\n`;
      sqlText += `  body TEXT,\n`;
      sqlText += `  type VARCHAR(64),\n`;
      sqlText += `  category VARCHAR(64),\n`;
      sqlText += `  isRead BOOLEAN,\n`;
      sqlText += `  createdAt TIMESTAMP,\n`;
      sqlText += `  referenceId VARCHAR(128)\n`;
      sqlText += `);\n\n`;

      // Helper to escape SQL values safely
      const escapeSQLValue = (val: any): string => {
        if (val === undefined || val === null) return "NULL";
        if (typeof val === "boolean") return val ? "true" : "false";
        if (typeof val === "number") return String(val);
        
        // Handle firestore serverTimestamp / Date strings
        let strVal = "";
        if (typeof val === "object" && val.seconds) {
          strVal = new Date(val.seconds * 1000).toISOString();
        } else {
          strVal = String(val);
        }
        
        // Escape single quotes for SQL insertion
        const cleanStr = strVal.replace(/'/g, "''");
        return `'${cleanStr}'`;
      };

      // Generate INSERT lines for each table
      const schemas: Record<string, string[]> = {
        users: ["uid", "email", "displayName", "role", "isActive", "createdAt"],
        archives: [
          "id", "type", "namaPemegangHak", "kecamatan", "kelurahan", "rak", "shaft", "bundel", "boks",
          "keterangan", "status", "createdAt", "updatedAt", "createdBy", "noHak", "jenisHak", "noSU",
          "tahunSU", "noSK", "hasBukuTanah", "hasSuratUkur", "noDI208", "jenisWarkah", "jenisKegiatan", "tahun"
        ],
        loans: [
          "id", "archiveId", "borrowerName", "purpose", "borrowerPhoto", "receiptNo", "loanDate",
          "expectedReturnDate", "actualReturnDate", "status", "notes", "createdBy", "returnedBy", "reminderSent"
        ],
        locations: ["id", "name", "type", "parentId"],
        notifications: ["id", "title", "body", "type", "category", "isRead", "createdAt", "referenceId"]
      };

      for (const col of colNames) {
        const rows = dbAll[col as keyof BackupData] || [];
        if (rows.length > 0) {
          sqlText += `-- Data Inserts for: ${col}\n`;
          const colsList = schemas[col];
          
          for (const row of rows) {
            // For columns, handle primary key mappings: document path ID
            const values = colsList.map(field => {
              if (field === "uid" && col === "users") return escapeSQLValue(row.uid || row.id);
              if (field === "id") return escapeSQLValue(row.id);
              return escapeSQLValue(row[field]);
            });

            sqlText += `INSERT INTO ${col} (${colsList.join(", ")}) VALUES (${values.join(", ")});\n`;
          }
          sqlText += `\n`;
        }
      }

      const blob = new Blob([sqlText], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `SINKRON_DB_FULL_${new Date().toISOString().slice(0, 10)}.sql`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success("Database berhasil diekspor ke format SQL");
    } catch (error: any) {
      toast.error("Gagal melakukan ekspor SQL: " + error.message);
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };

  // --------------------------------------------------
  // 4. Character-by-character SQL INSERT statement parser
  // --------------------------------------------------
  const parseSQLFileContents = (text: string): BackupData => {
    const result: BackupData = {
      users: [],
      archives: [],
      loans: [],
      locations: [],
      notifications: []
    };

    const lines = text.split("\n");
    // Regex matches: INSERT INTO tablename (cols) VALUES (vals);
    const sqlInsertRegex = /^\s*INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\((.+)\);?\s*$/i;

    for (const line of lines) {
      const match = sqlInsertRegex.exec(line);
      if (match) {
        const tableName = match[1].toLowerCase();
        
        if (colNames.includes(tableName)) {
          const colsString = match[2];
          const valsString = match[3];

          // Parse column names
          const cols = colsString.split(",").map(c => c.trim());

          // Character-by-character stateful single-quote splitter for values list
          const vals: string[] = [];
          let currentToken = "";
          let inString = false;
          
          for (let i = 0; i < valsString.length; i++) {
            const char = valsString[i];
            
            if (char === "''") {
              currentToken += "'"; // double quotes representing escaped quote!
            } else if (char === "'") {
              inString = !inString;
            } else if (char === "," && !inString) {
              vals.push(currentToken.trim());
              currentToken = "";
            } else {
              currentToken += char;
            }
          }
          vals.push(currentToken.trim()); // Append final token

          // Recompile fields into objects
          const item: Record<string, any> = {};
          
          for (let i = 0; i < cols.length; i++) {
            const field = cols[i];
            let valStr = vals[i];

            if (valStr === undefined) continue;

            // Type converts
            if (valStr.toUpperCase() === "NULL") {
              item[field] = null;
            } else if (valStr.toLowerCase() === "true") {
              item[field] = true;
            } else if (valStr.toLowerCase() === "false") {
              item[field] = false;
            } else if (/^\d+$/.test(valStr)) {
              item[field] = Number(valStr);
            } else {
              item[field] = valStr;
            }
          }

          // Document ID resolution
          const finalId = item.uid || item.id || `sql_${Math.random().toString(36).substring(7)}`;
          item.id = finalId;

          // Push into matching collection
          result[tableName as keyof BackupData].push(item);
        }
      }
    }

    return result;
  };

  // --------------------------------------------------
  // 5. File selection & Pratinjau parser
  // --------------------------------------------------
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setParsedPreview(null);
      setImportConfirmText("");

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const textContents = evt.target?.result as string;
          
          if (file.name.endsWith(".json")) {
            const json = JSON.parse(textContents) as BackupData;
            
            // Check dictionary format integrity
            const counts: Record<string, number> = {};
            let isOk = true;
            let totalRows = 0;

            for (const col of colNames) {
              const list = json[col as keyof BackupData];
              if (!Array.isArray(list)) {
                isOk = false;
              } else {
                counts[col] = list.length;
                totalRows += list.length;
              }
            }

            setParsedPreview({
              format: "JSON",
              collections: counts,
              rawRowsCount: totalRows,
              isValid: isOk,
              data: json
            });

            if (isOk) {
              toast.success(`File JSON berhasil diverifikasi! Ditemukan total ${totalRows} records.`);
            } else {
              toast.error("Format file JSON tidak sah. Harus memiliki properties core tabel.");
            }
          } else if (file.name.endsWith(".sql")) {
            const dataSqlParsed = parseSQLFileContents(textContents);
            
            const counts: Record<string, number> = {};
            let totalRows = 0;
            for (const col of colNames) {
              counts[col] = (dataSqlParsed[col as keyof BackupData] || []).length;
              totalRows += counts[col];
            }

            setParsedPreview({
              format: "SQL",
              collections: counts,
              rawRowsCount: totalRows,
              isValid: totalRows > 0,
              data: dataSqlParsed
            });

            if (totalRows > 0) {
              toast.success(`File SQL berhasil diproses! Ditemukan total ${totalRows} baris INSERT.`);
            } else {
              toast.error("Tidak mendeteksi baris SQL INSERT yang cocok dengan schema.");
            }
          } else {
            toast.error("Ekstensi berkas tidak terdukung. Gunakan .json / .sql");
          }
        } catch (error: any) {
          toast.error("Gagal mengurai file cadangan: " + error.message);
        }
      };

      reader.readAsText(file);
    }
  };

  // --------------------------------------------------
  // 6. Restore / Sync Trigger Action
  // --------------------------------------------------
  const handleImportDatabase = async () => {
    if (!db) return;
    if (!parsedPreview || !parsedPreview.data) {
      toast.error("Tidak ada data pratinjau cadangan.");
      return;
    }

    if (importConfirmText.toUpperCase() !== "KONFIRMASI") {
      toast.error("Silakan ketik 'KONFIRMASI' untuk memverifikasi tindakan Anda.");
      return;
    }

    setLoading(true);
    setProgress({ current: 0, total: parsedPreview.rawRowsCount });

    try {
      const data = parsedPreview.data;

      // 1. Overwrite clean processing
      if (syncMode === "OVERWRITE") {
        setStatusMessage("Sedang mengosongkan database lama (Overwrite)...");
        for (const col of colNames) {
          const snap = await getDocs(collection(db, col));
          
          // Delete in batches of 200 for safe quota
          const docsArr = snap.docs;
          for (let i = 0; i < docsArr.length; i += 200) {
            const chunk = docsArr.slice(i, i + 200);
            const batch = writeBatch(db);
            chunk.forEach(d => batch.delete(d.ref));
            await batch.commit();
          }
        }
      }

      // 2. Insert new synchronized records
      setStatusMessage("Menyisipkan data cadangan ke cloud... ");
      let processedCount = 0;

      for (const col of colNames) {
        const rows = data[col as keyof BackupData] || [];
        if (rows.length === 0) continue;

        // Write sequentially using server timestamp conversion
        const chunkLength = 50; 
        for (let idx = 0; idx < rows.length; idx += chunkLength) {
          const chunk = rows.slice(idx, idx + chunkLength);
          const batch = writeBatch(db);
          
          for (const row of chunk) {
            const { id, ...payload } = row;
            const finalId = id || row.uid;
            
            // Format timestamps properly if they came as string representation
            const processedPayload = { ...payload };
            
            ["createdAt", "updatedAt", "loanDate", "expectedReturnDate", "actualReturnDate"].forEach(f => {
              if (processedPayload[f] && typeof processedPayload[f] === "string") {
                // Ensure valid ISO date format
                try {
                  const d = new Date(processedPayload[f]);
                  if (!isNaN(d.getTime())) {
                    processedPayload[f] = d.toISOString();
                  }
                } catch (_) {}
              }
            });

            const docRef = doc(db, col, finalId);
            batch.set(docRef, processedPayload, { merge: syncMode === "MERGE" });
          }

          await batch.commit();
          processedCount += chunk.length;
          setProgress({ current: processedCount, total: parsedPreview.rawRowsCount });
        }
      }

      toast.success("Database Khas Banjar berhasil disinkronkan & di-restore!");
      
      // Clear imports states
      setSelectedFile(null);
      setParsedPreview(null);
      setImportConfirmText("");
    } catch (err: any) {
      console.error(err);
      toast.error("Kegagalan kritis pemulihan database: " + err.message);
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-black text-slate-800 uppercase tracking-wider flex items-center">
            <Database className="mr-2.5 text-blue-600 animate-pulse" size={24} />
            Koneksi & database cadangan
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1 uppercase">MENU KHUSUS SUPER ADMIN • KELOLA PORT INTEGRASI & RECOVERY SINKRONISASI</p>
        </div>

        <div className="flex items-center space-x-2 text-[10px] font-black uppercase text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
          <ShieldAlert size={12} className="mr-1" /> Super Admin Authorization Verified
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* LEFT COLUMN: Export Tool Card */}
        <Card className="rounded-3xl border-slate-200 shadow-xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
            <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center">
              <Download className="mr-2 text-blue-600" size={18} />
              Ekspor Lengkap Seluruh Data
            </CardTitle>
            <CardDescription className="text-xs">
              Buat rincian duplikasi cadangan dari kelima tabel database utama ATR/BPN Kota Banjarmasin.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <p className="text-[11.5px] text-slate-500 leading-relaxed font-medium">
              Sistem akan memuat seluruh baris real-time dari tabel <code className="font-mono bg-slate-50 p-0.5 px-1 border rounded text-blue-900">users</code>, <code className="font-mono bg-slate-50 p-0.5 px-1 border rounded text-blue-900">archives</code>, <code className="font-mono bg-slate-50 p-0.5 px-1 border rounded text-blue-900">loans</code>, <code className="font-mono bg-slate-50 p-0.5 px-1 border rounded text-blue-900">locations</code>, dan <code className="font-mono bg-slate-50 p-0.5 px-1 border rounded text-blue-900">notifications</code> secara sinkron.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                onClick={handleExportJSON}
                disabled={loading}
                className="flex flex-col items-center justify-center p-5 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-100 active:scale-95 duration-200 group text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 mb-2 group-hover:scale-110 duration-200">
                  <FileJson size={22} />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">Ekspor JSON</span>
                <span className="text-[9px] text-slate-400 mt-0.5">Compatible with NoSQL REST API</span>
              </button>

              <button
                onClick={handleExportSQL}
                disabled={loading}
                className="flex flex-col items-center justify-center p-5 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-100 active:scale-95 duration-200 group text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 mb-2 group-hover:scale-110 duration-200">
                  <Database size={22} />
                </div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">Ekspor Relasional SQL</span>
                <span className="text-[9px] text-slate-400 mt-0.5">Compatible with Postgres/MySQL</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* RIGHT COLUMN: Import & Sync Recovery Card */}
        <Card className="rounded-3xl border-slate-200 shadow-xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
            <CardTitle className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center">
              <Upload className="mr-2 text-indigo-600" size={18} />
              Impor & Pulihkan Database
            </CardTitle>
            <CardDescription className="text-xs">
              Menerima berkas cadangan komprehensif (.json atau .sql) untuk dipulihkan dan disinkronkan.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-6 bg-slate-50 hover:bg-slate-100/60 duration-200 text-center flex flex-col items-center justify-center cursor-pointer">
              <input
                type="file"
                accept=".json,.sql"
                onChange={handleFileSelect}
                disabled={loading}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload size={30} className="text-slate-400 mb-2" />
              <p className="text-xs font-bold text-slate-700">
                {selectedFile ? selectedFile.name : "Pilih Berkas Cadangan (.json/.sql)"}
              </p>
              <p className="text-[10px] text-slate-400 mt-1 uppercase font-mono tracking-widest">Maksimal Ukuran Berkas: 15 MB</p>
            </div>

            {parsedPreview && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex justify-between items-center text-xs font-mono uppercase tracking-wider">
                  <span className="font-bold text-slate-500">Pratinjau Sinkronisasi ({parsedPreview.format})</span>
                  <span className={parsedPreview.isValid ? "text-emerald-700 bg-emerald-100 p-1 px-2 rounded-lg font-black" : "text-red-700 bg-red-100 p-1 px-2 rounded-lg font-black"}>
                    {parsedPreview.isValid ? "VERIFIKASI LOLOS" : "VERIFIKASI GAGAL"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono uppercase">
                  {colNames.map(col => (
                    <div key={col} className="p-2 border rounded-xl bg-white flex justify-between">
                      <span className="text-slate-400">{col}</span>
                      <span className="font-bold text-slate-800">{parsedPreview.collections[col] || 0}</span>
                    </div>
                  ))}
                </div>

                {parsedPreview.isValid && (
                  <div className="space-y-4 pt-2 border-t border-slate-200">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Metode Sinkronisasi</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setSyncMode("MERGE")}
                          className={`p-2.5 rounded-xl border text-center text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                            syncMode === "MERGE"
                              ? "bg-slate-900 border-slate-950 text-white shadow-md"
                              : "bg-white text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          Gabung (Merge/Upsert)
                        </button>
                        <button
                          onClick={() => setSyncMode("OVERWRITE")}
                          className={`p-2.5 rounded-xl border text-center text-xs font-black uppercase tracking-wider transition-all duration-200 ${
                            syncMode === "OVERWRITE"
                              ? "bg-red-800 border-red-950 text-white shadow-md font-black"
                              : "bg-white text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          TIMPA TOTAL (Overwrite)
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-snug">
                        {syncMode === "OVERWRITE" 
                          ? "PERINGATAN: Metode TIMPA akan menghapus data pada kelima tabel sebelum cadangan baru di-restore!" 
                          : "Metode GABUNG akan menggabungkan data cadangan tanpa menghapus rekod yang sudah ada."}
                      </p>
                    </div>

                    <div className="space-y-2 pt-1">
                      <label className="text-[10px] font-black uppercase text-red-500 tracking-wider flex items-center">
                        <AlertTriangle className="mr-1 inline" size={12} />
                        Konfirmasi Keamanan Tinggi
                      </label>
                      <Input
                        placeholder="Ketik 'KONFIRMASI' untuk memverifikasi"
                        value={importConfirmText}
                        onChange={(e) => setImportConfirmText(e.target.value)}
                        className="rounded-xl border-red-100 focus:bg-white text-xs uppercase font-bold tracking-widest text-center"
                      />
                    </div>

                    <Button
                      onClick={handleImportDatabase}
                      disabled={importConfirmText.toUpperCase() !== "KONFIRMASI" || loading}
                      className="w-full h-11 bg-slate-900 hover:bg-slate-950 text-white rounded-xl font-mono text-xs uppercase tracking-widest"
                    >
                      Mulai Sinkronisasi Sekarang
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {loading && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex flex-col items-center justify-center p-6">
          <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 max-w-md w-full text-center space-y-4 shadow-2xl animate-fade-in">
            <Loader2 className="animate-spin mx-auto text-blue-500" size={36} />
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-blue-400">{statusMessage}</h3>
              <p className="text-[10px] text-slate-400 mt-1 uppercase font-mono">Proses sinkronisasi cloud berjalan...</p>
            </div>

            {progress.total > 0 && (
              <div className="space-y-2">
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="bg-blue-500 h-full transition-all duration-150" 
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest text-slate-400">
                  <span>Progres sinkronisasi</span>
                  <span>{progress.current} / {progress.total} Rekor</span>
                </div>
              </div>
            )}
            <p className="text-[9px] text-red-400 uppercase font-bold leading-normal">PENTING: JANGAN MENUTUP WINDOW ATAU REFRESH HALAMAN SEBELUM PROSES SINKRON SELESAI.</p>
          </div>
        </div>
      )}
    </div>
  );
}
