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
  History,
  QrCode,
  Printer,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  FileSpreadsheet
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
  DialogTitle,
} from "@/components/ui/dialog";
import { Archive, ArchiveType, Loan, Location } from "../types";
import { useArchives } from "../lib/hooks";
import { useLoans } from "../lib/loanHooks";
import { CameraCapture } from "@/src/components/archive/CameraCapture";
import { LoanReceipt } from "@/src/components/archive/LoanReceipt";
import { LoanHistoryDialog } from "@/src/components/archive/LoanHistoryDialog";
import { ExcelImportDialog } from "@/src/components/archive/ExcelImportDialog";
import { BatchQRDialog } from "@/src/components/archive/BatchQRDialog";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from '../lib/auth';
import { motion, AnimatePresence } from "motion/react";
import { JENIS_HAK, JENIS_KEGIATAN } from "@/src/constants";
import { db, auth, collection, addDoc, updateDoc, doc, query, where, getDocs, serverTimestamp, deleteDoc, onSnapshot } from "../lib/firebase";
import * as XLSX from "xlsx";

// Real subdistricts and villages falling back if DB loading
const DISTRICT_VILLAGES_MAP: Record<string, string[]> = {
  "Banjarmasin Barat": [
    "Belitung Darat", "Belitung Selatan", "Kuin Cerucuk", "Kuin Selatan", "Basirih", "Telaga Biru", "Telawang", "Pelambuan", "Teluk Tiram"
  ],
  "Banjarmasin Selatan": [
    "Kelayan Barat", "Kelayan Dalam", "Kelayan Tengah", "Kelayan Timur", "Kelayan Selatan", "Mantuil", "Basirih Selatan", "Murung Raya", "Pekauman", "Pemurus Baru", "Pemurus Dalam"
  ],
  "Banjarmasin Tengah": [
    "Kampung Melayu", "Gadang", "Seberang Mesjid", "Melayu", "Pekapuran Laut", "Sungai Baru", "Kertak Baru Ilir", "Kertak Baru Ulu", "Antasan Besar", "Teluk Dalam", "Mawar", "Pasar Lama"
  ],
  "Banjarmasin Timur": [
    "Kuripan", "Kebun Bunga", "Pekapuran Raya", "Pemurus Luar", "Pengambangan", "Banua Anyar", "Karang Mekar", "Sungai Lulut", "Sungai Bilu"
  ],
  "Banjarmasin Utara": [
    "Kuin Utara", "Alalak Utara", "Alalak Tengah", "Alalak Selatan", "Belitung Utara", "Sungai Miai", "Sungai Jingah", "Surgi Mufti", "Sungai Andai", "Pangeran"
  ]
};

const KECAMATANS = Object.keys(DISTRICT_VILLAGES_MAP);

interface ArchiveListProps {
  type: ArchiveType;
}

export function ArchiveList({ type }: ArchiveListProps) {
  // -----------------------------
  // Data Loading Hooks
  // -----------------------------
  const { archives, loading, addArchive, updateArchive, removeArchive } = useArchives(type);
  const { createLoan, loans } = useLoans();
  const { currentUser } = useAuth();

  // -----------------------------
  // Shared Dialog Hooks & State
  // -----------------------------
  const [isLoanOpen, setIsLoanOpen] = React.useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = React.useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [isQRGeneratorOpen, setIsQRGeneratorOpen] = React.useState(false);
  const [activeLoan, setActiveLoan] = React.useState<Loan | null>(null);
  const [historyArchive, setHistoryArchive] = React.useState<Archive | null>(null);
  const [loanArchive, setLoanArchive] = React.useState<Archive | null>(null);

  const [borrowerName, setBorrowerName] = React.useState("");
  const [loanPurpose, setLoanPurpose] = React.useState("");
  const [loanNotes, setLoanNotes] = React.useState("");
  const [borrowerPhoto, setBorrowerPhoto] = React.useState("");

  // -----------------------------
  // Master / Selection state
  // -----------------------------
  const [selectedArchiveId, setSelectedArchiveId] = React.useState<string | null>(null);

  // -----------------------------
  // Real-time Master Wilayah Loading from Firestore
  // -----------------------------
  const [dbLocations, setDbLocations] = React.useState<Location[]>([]);

  React.useEffect(() => {
    if (!db) return;
    const q = collection(db, 'locations');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const locs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location));
      setDbLocations(locs);
    }, (err) => {
      console.error("Gagal memuat wilayah dari DB: ", err);
    });
    return () => unsubscribe();
  }, []);

  // Compute dynamic DISTRICT_VILLAGES_MAP merging DB locations and static/default fallbacks
  const computedDistrictVillagesMap = React.useMemo(() => {
    // Start with a clone of STATIC fallback map
    const map: Record<string, string[]> = JSON.parse(JSON.stringify(DISTRICT_VILLAGES_MAP));

    if (dbLocations.length > 0) {
      const dbKecamatans = dbLocations.filter(l => l.type === 'KECAMATAN');
      const dbKelurahans = dbLocations.filter(l => l.type === 'KELURAHAN');

      // Add any Kecamatan from DB that is not in the static map
      dbKecamatans.forEach(kec => {
        // Find if this kecamatan name (case insensitive) is already in the map
        const existingKey = Object.keys(map).find(k => k.toLowerCase() === kec.name.toLowerCase());
        const targetKey = existingKey || kec.name;
        if (!map[targetKey]) {
          map[targetKey] = [];
        }

        // Add corresponding kelurahans for this kecamatan
        const childKels = dbKelurahans.filter(kel => kel.parentId === kec.id);
        childKels.forEach(kel => {
          // Add kel.name if not already present (case insensitive)
          const alreadyHas = map[targetKey].some(v => v.toLowerCase() === kel.name.toLowerCase());
          if (!alreadyHas) {
            map[targetKey].push(kel.name);
          }
        });
      });

      // Also process other Kelurahans that might map to existing static Kecamatan keys
      dbKelurahans.forEach(kel => {
        if (kel.parentId) {
          const parentKec = dbKecamatans.find(k => k.id === kel.parentId);
          if (parentKec) {
            const existingKey = Object.keys(map).find(k => k.toLowerCase() === parentKec.name.toLowerCase());
            if (existingKey) {
              const alreadyHas = map[existingKey].some(v => v.toLowerCase() === kel.name.toLowerCase());
              if (!alreadyHas) {
                map[existingKey].push(kel.name);
              }
            }
          }
        }
      });
    }

    // Sort villages inside each kecamatan alphabetically
    Object.keys(map).forEach(key => {
      map[key] = [...new Set(map[key])].sort();
    });

    return map;
  }, [dbLocations]);

  // Compute dynamic KECAMATANS list
  const computedKecamatans = React.useMemo(() => {
    return Object.keys(computedDistrictVillagesMap).sort();
  }, [computedDistrictVillagesMap]);

  // -----------------------------
  // Left panel Search states
  // -----------------------------
  const [searchNo, setSearchNo] = React.useState("");
  const [searchBoks, setSearchBoks] = React.useState("");
  const [searchNama, setSearchNama] = React.useState("");
  const [searchKecamatan, setSearchKecamatan] = React.useState("");
  const [searchKelurahan, setSearchKelurahan] = React.useState("");
  
  // Realized filter trigger state (for clicking the "Cari" red button)
  const [filterNo, setFilterNo] = React.useState("");
  const [filterBoks, setFilterBoks] = React.useState("");
  const [filterNama, setFilterNama] = React.useState("");
  const [filterKecamatan, setFilterKecamatan] = React.useState("");
  const [filterKelurahan, setFilterKelurahan] = React.useState("");

  // -----------------------------
  // Right Entry Form states
  // -----------------------------
  const [formDataNoHak, setFormDataNoHak] = React.useState("");
  const [formDataJenisHak, setFormDataJenisHak] = React.useState("Hak Milik (HM)");
  const [formDataNamaPemegangHak, setFormDataNamaPemegangHak] = React.useState("");
  const [formDataNoSU, setFormDataNoSU] = React.useState("");
  const [formDataTahunSU, setFormDataTahunSU] = React.useState("");
  const [formDataKecamatan, setFormDataKecamatan] = React.useState("");
  const [formDataKelurahan, setFormDataKelurahan] = React.useState("");
  const [formDataKeterangan, setFormDataKeterangan] = React.useState("");
  const [formDataRak, setFormDataRak] = React.useState("");
  const [formDataShaft, setFormDataShaft] = React.useState("");
  const [formDataBoks, setFormDataBoks] = React.useState(""); // Maps to boks (WARKAH) or bundel (BT / SU)
  
  // Inventory status flags (Buku Tanah / Surat Ukur exists)
  const [inventoryBukuTanah, setInventoryBukuTanah] = React.useState<"ADA" | "TIDAK ADA">("ADA");
  const [inventorySuratUkur, setInventorySuratUkur] = React.useState<"ADA" | "TIDAK ADA">("ADA");

  // Warkah Specific
  const [formDataNoDI208, setFormDataNoDI208] = React.useState("");
  const [formDataJenisWarkah, setFormDataJenisWarkah] = React.useState("Peralihan Hak");
  const [formDataJenisKegiatan, setFormDataJenisKegiatan] = React.useState("Jual Beli");
  const [formDataTahun, setFormDataTahun] = React.useState("");
  const [noSK, setNoSK] = React.useState("");

  // -----------------------------
  // Pagination State
  // -----------------------------
  const [currentPage, setCurrentPage] = React.useState(1);
  const [gotoPageValue, setGotoPageValue] = React.useState("");
  const itemsPerPage = 8;

  const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';

  // Resets the entry forms on active type changed
  React.useEffect(() => {
    handleNew();
    setSearchNo("");
    setSearchBoks("");
    setSearchNama("");
    setSearchKecamatan("");
    setSearchKelurahan("");
    setFilterNo("");
    setFilterBoks("");
    setFilterNama("");
    setFilterKecamatan("");
    setFilterKelurahan("");
  }, [type]);

  // Handle search villages list based on searchKecamatan
  const availableSearchVillages = React.useMemo(() => {
    if (!searchKecamatan) return [];
    return computedDistrictVillagesMap[searchKecamatan] || [];
  }, [searchKecamatan, computedDistrictVillagesMap]);

  // Handle villages list based on selected Kecamatan
  const availableVillages = React.useMemo(() => {
    if (!formDataKecamatan) return [];
    return computedDistrictVillagesMap[formDataKecamatan] || [];
  }, [formDataKecamatan, computedDistrictVillagesMap]);

  // Handle Search Cari Function
  const handleCari = () => {
    setFilterNo(searchNo);
    setFilterBoks(searchBoks);
    setFilterNama(searchNama);
    setFilterKecamatan(searchKecamatan);
    setFilterKelurahan(searchKelurahan);
    setCurrentPage(1);
  };

  // Filter logic
  const filtered = React.useMemo(() => {
    return archives.filter(a => {
      // Filter by Document No. Hak / SU / DI208
      if (filterNo) {
        const noLower = filterNo.toLowerCase();
        const noHakMatch = (a.noHak || "").toLowerCase().includes(noLower);
        const noSUMatch = (a.noSU || "").toLowerCase().includes(noLower);
        const di208Match = (a.noDI208 || "").toLowerCase().includes(noLower);
        if (!noHakMatch && !noSUMatch && !di208Match) return false;
      }

      // Filter by Rak / Shaft / Boks / Bundel
      if (filterBoks) {
        const boxLower = filterBoks.toLowerCase();
        const boksMatch = (a.boks || "").toLowerCase().includes(boxLower);
        const bundelMatch = (a.bundel || "").toLowerCase().includes(boxLower);
        const rakMatch = (a.rak || "").toLowerCase().includes(boxLower);
        const shaftMatch = (a.shaft || "").toLowerCase().includes(boxLower);
        if (!boksMatch && !bundelMatch && !rakMatch && !shaftMatch) return false;
      }

      // Filter by Pemegang Hak
      if (filterNama) {
        const nameLower = filterNama.toLowerCase();
        if (!(a.namaPemegangHak || "").toLowerCase().includes(nameLower)) return false;
      }

      // Filter by Kecamatan
      if (filterKecamatan) {
        if ((a.kecamatan || "").toLowerCase() !== filterKecamatan.toLowerCase()) return false;
      }

      // Filter by Kelurahan
      if (filterKelurahan) {
        if ((a.kelurahan || "").toLowerCase() !== filterKelurahan.toLowerCase()) return false;
      }

      return true;
    });
  }, [archives, filterNo, filterBoks, filterNama, filterKecamatan, filterKelurahan]);

  // Paginated records
  const paginatedItems = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;

  // Handle row click
  const handleSelectArchive = (a: Archive) => {
    setSelectedArchiveId(a.id);
    setFormDataNamaPemegangHak(a.namaPemegangHak || "");
    setFormDataKecamatan(a.kecamatan || "");
    setFormDataKelurahan(a.kelurahan || "");
    setFormDataKeterangan(a.keterangan || "");
    setFormDataRak(a.rak || "");
    setFormDataShaft(a.shaft || "");
    
    // Manage location Boks vs Bundel
    if (a.type === "WARKAH") {
      setFormDataBoks(a.boks || "");
    } else {
      setFormDataBoks(a.bundel || "");
    }

    // Set document specifics
    if (a.type === 'BUKU_TANAH') {
      setFormDataNoHak(a.noHak || "");
      setFormDataJenisHak(a.jenisHak || "Hak Milik (HM)");
      setFormDataNoSU(a.noSU || "");
      setFormDataTahunSU(a.tahunSU ? String(a.tahunSU) : "");
      setInventoryBukuTanah(a.hasBukuTanah !== false ? "ADA" : "TIDAK ADA");
      setInventorySuratUkur(a.hasSuratUkur !== false ? "ADA" : "TIDAK ADA");
      setNoSK(a.noSK || "");
    } else if (a.type === 'SURAT_UKUR') {
      setFormDataNoSU(a.noSU || "");
      setFormDataTahunSU(a.tahunSU ? String(a.tahunSU) : "");
      setFormDataNoHak(a.noHak || "");
      setFormDataJenisHak(a.jenisHak || "Hak Milik (HM)");
      setInventoryBukuTanah(a.hasBukuTanah !== false ? "ADA" : "TIDAK ADA");
      setInventorySuratUkur(a.hasSuratUkur !== false ? "ADA" : "TIDAK ADA");
      setNoSK(a.noSK || "");
    } else if (a.type === 'WARKAH') {
      setFormDataNoDI208(a.noDI208 || "");
      setFormDataJenisWarkah(a.jenisWarkah || "Peralihan Hak");
      setFormDataJenisKegiatan(a.jenisKegiatan || "Jual Beli");
      setFormDataTahun(a.tahun ? String(a.tahun) : "");
      setFormDataNoHak(a.noHak || "");
      setNoSK(a.noSK || "");
    }
  };

  // Clear Form State
  const handleNew = () => {
    setSelectedArchiveId(null);
    setFormDataNoHak("");
    setFormDataJenisHak("Hak Milik (HM)");
    setFormDataNamaPemegangHak("");
    setFormDataNoSU("");
    setFormDataTahunSU("");
    setFormDataKecamatan("");
    setFormDataKelurahan("");
    setFormDataKeterangan("");
    setFormDataRak("");
    setFormDataShaft("");
    setFormDataBoks("");
    setInventoryBukuTanah("ADA");
    setInventorySuratUkur("ADA");
    setFormDataNoDI208("");
    setFormDataJenisWarkah("Peralihan Hak");
    setFormDataJenisKegiatan("Jual Beli");
    setFormDataTahun("");
    setNoSK("");
  };

  // Submit form payload ("Save" button)
  const handleSave = async () => {
    if (!formDataNamaPemegangHak) {
      toast.error("Nama pemegang HAK wajib diisi");
      return;
    }
    if (!formDataRak || !formDataShaft || !formDataBoks) {
      toast.error("Informasi lokasi simpan (Rak, Shaft, Boks/Bundel) wajib diisi");
      return;
    }

    const payload: any = {
      type: type, // Matches current page tab repository
      namaPemegangHak: formDataNamaPemegangHak.toUpperCase(),
      kecamatan: formDataKecamatan,
      kelurahan: formDataKelurahan,
      rak: formDataRak.toUpperCase(),
      shaft: formDataShaft.toUpperCase(),
      keterangan: formDataKeterangan,
      status: selectedArchiveId 
        ? (archives.find(arc => arc.id === selectedArchiveId)?.status || "Available") 
        : "Available",
    };

    if (type === 'BUKU_TANAH') {
      payload.noHak = formDataNoHak;
      payload.jenisHak = formDataJenisHak;
      payload.noSU = formDataNoSU;
      payload.tahunSU = formDataTahunSU ? Number(formDataTahunSU) : "";
      payload.hasBukuTanah = inventoryBukuTanah === "ADA";
      payload.hasSuratUkur = inventorySuratUkur === "ADA";
      payload.bundel = formDataBoks; // save location bundel
    } else if (type === 'SURAT_UKUR') {
      payload.noSU = formDataNoSU;
      payload.tahunSU = formDataTahunSU ? Number(formDataTahunSU) : "";
      payload.noHak = formDataNoHak;
      payload.jenisHak = formDataJenisHak;
      payload.hasBukuTanah = inventoryBukuTanah === "ADA";
      payload.hasSuratUkur = inventorySuratUkur === "ADA";
      payload.bundel = formDataBoks; // save location bundel
    } else { // WARKAH
      payload.noDI208 = formDataNoDI208;
      payload.jenisWarkah = formDataJenisWarkah;
      payload.jenisKegiatan = formDataJenisKegiatan;
      payload.tahun = formDataTahun ? Number(formDataTahun) : "";
      payload.noHak = formDataNoHak;
      payload.boks = formDataBoks; // save location boks
    }

    try {
      if (selectedArchiveId) {
        // Edit 
        await updateArchive(selectedArchiveId, payload);
        toast.success("Log data arsip berhasil diperbarui");
      } else {
        // Create
        await addArchive(payload);
        toast.success("Log data arsip baru berhasil disimpan");
      }

      // Requirement 2: Buku Tanah & Surat ukur saling berkaitan.
      // If we save/add a BUKU_TANAH document, and we filled in `noSU` and `tahunSU`, 
      // automatically generate or update the connected `SURAT_UKUR` archive too!
      if (type === 'BUKU_TANAH' && formDataNoSU && formDataTahunSU) {
        if (!db) return;
        
        // Search if direct Surat Ukur already exists
        const suQuery = query(
          collection(db, "archives"),
          where("type", "==", "SURAT_UKUR"),
          where("noSU", "==", formDataNoSU),
          where("tahunSU", "==", Number(formDataTahunSU))
        );
        const suSnap = await getDocs(suQuery);

        const suPayloadSpec = {
          type: "SURAT_UKUR" as ArchiveType,
          noSU: formDataNoSU,
          tahunSU: Number(formDataTahunSU),
          noHak: formDataNoHak,
          jenisHak: formDataJenisHak,
          namaPemegangHak: formDataNamaPemegangHak.toUpperCase(),
          kecamatan: formDataKecamatan,
          kelurahan: formDataKelurahan,
          rak: formDataRak.toUpperCase(),
          shaft: formDataShaft.toUpperCase(),
          bundel: formDataBoks, // save to bundel
          status: "Available" as const,
          keterangan: `Tercipta otomatis dari keterkaitan Buku Tanah No. Hak: ${formDataNoHak || '-'}`,
          hasBukuTanah: inventoryBukuTanah === "ADA",
          hasSuratUkur: true,
          updatedAt: serverTimestamp()
        };

        if (!suSnap.empty) {
          // Update the existing Surat Ukur to ensure sync
          const existingSuId = suSnap.docs[0].id;
          await updateDoc(doc(db, "archives", existingSuId), suPayloadSpec);
          toast.info("Data Surat Ukur terkait telah otomatis disinkronkan");
        } else {
          // Creates a new SU
          await addDoc(collection(db, "archives"), {
            ...suPayloadSpec,
            createdAt: serverTimestamp(),
            createdBy: auth?.currentUser?.uid || 'anonymous'
          });
          toast.info("Surat Ukur terkait berhasil diciptakan otomatis!");
        }
      }

      handleNew();
    } catch (error) {
      console.error(error);
      toast.error("Gagal sinkronisasi data arsip");
    }
  };

  // Delete current selection
  const handleDelete = async () => {
    if (!selectedArchiveId) {
      toast.error("Silakan pilih record dari tabel terlebih dahulu");
      return;
    }

    if (window.confirm("Apakah Anda yakin ingin menghapus data arsip terpilih secara permanen?")) {
      try {
        await removeArchive(selectedArchiveId);
        toast.success("Arsip berhasil dihapus secara permanen");
        handleNew();
      } catch (err) {
        toast.error("Gagal menghapus arsip ");
      }
    }
  };

  // Input Peminjaman handler trigger
  const handleOpenPeminjamanDirect = () => {
    if (!selectedArchiveId) {
      toast.error("Silakan pilih arsip dari tabel terlebih dahulu untuk mencatat peminjaman");
      return;
    }

    const currentSel = archives.find(a => a.id === selectedArchiveId);
    if (!currentSel) return;

    if (currentSel.status !== 'Available') {
      toast.error("Gagal: Arsip ini sedang dalam peminjaman aktif");
      return;
    }

    setLoanArchive(currentSel);
    setIsLoanOpen(true);
  };

  // Form submit for loan checkout
  const handleLoanSubmit = async () => {
    if (!borrowerName) return toast.error("Identitas nama peminjam wajib diisi");
    if (!loanPurpose) return toast.error("Tujuan peminjaman wajib diisi");
    
    try {
      const result = await createLoan(loanArchive!.id, borrowerName, loanPurpose, borrowerPhoto, loanNotes);
      if (result) {
        setActiveLoan(result as Loan);
        toast.success("Log peminjaman berhasil disimpan ke dalam sistem");
        setIsLoanOpen(false);
        setIsReceiptOpen(true);
        // Reset local States
        setBorrowerName("");
        setLoanPurpose("");
        setLoanNotes("");
        setBorrowerPhoto("");
        handleNew(); // Refreshes page state
      }
    } catch (error) {
      toast.error("Gagal sinkronisasi log peminjaman");
    }
  };

  // -----------------------------
  // Excel Report Generation 
  // -----------------------------
  const handleExportExcel = () => {
    if (archives.length === 0) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }

    if (type === 'BUKU_TANAH' || type === 'SURAT_UKUR') {
      // 1. Export sheets: "DATA BT & SU ADA" and "DATA BT & SU TIDAK ADA"
      const adaList = archives.filter(a => a.hasBukuTanah !== false && a.hasSuratUkur !== false);
      const tidakAdaList = archives.filter(a => a.hasBukuTanah === false || a.hasSuratUkur === false);

      const mapRow = (a: Archive, idx: number) => ({
        "NO": idx + 1,
        "NO HAK": a.noHak || "-",
        "JENIS HAK": a.jenisHak || "-",
        "NAMA PEGANG HAK": (a.namaPemegangHak || "").toUpperCase(),
        "NO SU": a.noSU || "-",
        "TAHUN SU": a.tahunSU || "-",
        "KECAMATAN": (a.kecamatan || "").toUpperCase(),
        "KELURAHAN/DESA": (a.kelurahan || "").toUpperCase(),
        "NOMOR SK": a.noSK || "-",
        "BUKU TANAH (INVENT)": a.hasBukuTanah !== false ? "ADA" : "TIDAK ADA",
        "SURAT UKUR (INVENT)": a.hasSuratUkur !== false ? "ADA" : "TIDAK ADA",
        "RAK": a.rak || "-",
        "SHAFT": a.shaft || "-",
        "BUNDEL": a.bundel || a.boks || "-"
      });

      const wsAda = XLSX.utils.json_to_sheet(adaList.map((a, i) => mapRow(a, i)));
      const wsTidakAda = XLSX.utils.json_to_sheet(tidakAdaList.map((a, i) => mapRow(a, i)));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsAda, "DATA BT & SU ADA");
      XLSX.utils.book_append_sheet(wb, wsTidakAda, "DATA BT & SU TIDAK ADA");

      XLSX.writeFile(wb, "1. BUKU TANAH DAN SURAT UKUR LENGKAP.xlsx");
      toast.success("Excel Buku Tanah & Surat Ukur Lengkap berhasil diekspor");
    } else {
      // 2. Export sheets: "DATA WARKAH PERALIHAN HAK" and "DATA WARKAH SK,PTSL,DLL"
      const isPeralihan = (a: Archive) => {
        const jW = (a.jenisWarkah || "").toUpperCase();
        const jK = (a.jenisKegiatan || "").toUpperCase();
        return jW.includes("PERALIHAN") || jK.includes("PERALIHAN") || jK.includes("JUAL BELI") || jK.includes("WARIS");
      };

      const peralihanList = archives.filter(a => isPeralihan(a));
      const skPtslList = archives.filter(a => !isPeralihan(a));

      const mapRowPeralihan = (a: Archive, idx: number) => ({
        "NO": idx + 1,
        "NO DI 208": a.noDI208 || "-",
        "NAMA PEGANG HAK": (a.namaPemegangHak || "").toUpperCase(),
        "JENIS WARKAH": a.jenisWarkah || "Peralihan Hak",
        "JENIS KEGIATAN": a.jenisKegiatan || "Jual Beli",
        "JENIS HAK": a.jenisHak || "HM",
        "TAHUN": a.tahun || a.tahunSU || "-",
        "KECAMATAN": (a.kecamatan || "").toUpperCase(),
        "KELURAHAN/DESA": (a.kelurahan || "").toUpperCase(),
        "RAK": a.rak || "-",
        "SHAFT": a.shaft || "-",
        "BOKS": a.boks || "-"
      });

      const mapRowSkPtsl = (a: Archive, idx: number) => ({
        "NO": idx + 1,
        "NO DI 208": a.noDI208 || "-",
        "NAMA PEGANG HAK": (a.namaPemegangHak || "").toUpperCase(),
        "JENIS WARKAH": a.jenisWarkah || "SK / PTSL",
        "NOMOR HAK / NOMOR SK": a.noHak || a.noSK || "-",
        "TAHUN": a.tahun || a.tahunSU || "-",
        "KECAMATAN": (a.kecamatan || "").toUpperCase(),
        "KELURAHAN/DESA": (a.kelurahan || "").toUpperCase(),
        "RAK": a.rak || "-",
        "SHAFT": a.shaft || "-",
        "BOKS": a.boks || "-"
      });

      const wsPeralihan = XLSX.utils.json_to_sheet(peralihanList.map((a, i) => mapRowPeralihan(a, i)));
      const wsSkPtsl = XLSX.utils.json_to_sheet(skPtslList.map((a, i) => mapRowSkPtsl(a, i)));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsPeralihan, "DATA WARKAH PERALIHAN HAK");
      XLSX.utils.book_append_sheet(wb, wsSkPtsl, "DATA WARKAH SK,PTSL,DLL");

      XLSX.writeFile(wb, "2. DATA WARKAH PERALIHAN DAN SK_PTSL.xlsx");
      toast.success("Excel Data Warkah Lengkap berhasil diekspor");
    }
  };

  // Page index helpers
  const handlePageFirst = () => setCurrentPage(1);
  const handlePagePrev = () => setCurrentPage(prev => Math.max(1, prev - 1));
  const handlePageNext = () => setCurrentPage(prev => Math.min(totalPages, prev + 1));
  const handlePageLast = () => setCurrentPage(totalPages);

  const handleGotoPageSubmit = () => {
    const val = parseInt(gotoPageValue, 10);
    if (!isNaN(val) && val >= 1 && val <= totalPages) {
      setCurrentPage(val);
      setGotoPageValue("");
    } else {
      toast.error(`Pilih halaman antara 1 sampai ${totalPages}`);
    }
  };

  // Convert types visually
  const typeText = type === "BUKU_TANAH" ? "Buku Tanah" : type === "SURAT_UKUR" ? "Surat Ukur" : "Data Warkah";

  return (
    <div className="space-y-4">
      {/* -----------------------------
          Desktop Utilities Panel Row
          ----------------------------- */}
      <div className="bg-slate-100 p-2 md:p-3 rounded-2xl flex flex-wrap items-center justify-between border border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="flex space-x-1.5 p-1 bg-white rounded-lg shadow-inner">
            <button 
              onClick={() => toast.info("Modul scan QR siap menerima masukan.")} 
              className="p-1.5 text-blue-800 hover:bg-slate-100 rounded-md transition-colors" 
              title="Scan QR Code"
            >
              <QrCode size={20} />
            </button>
            <button 
              onClick={() => setIsQRGeneratorOpen(true)} 
              className="p-1.5 text-purple-700 hover:bg-slate-50 rounded-md transition-colors" 
              title="Batch QR Code BPN (Cetak & Unduh)"
            >
              <QrCode className="text-purple-600 stroke-[2.5]" size={20} />
            </button>
            <button 
              onClick={handleExportExcel} 
              className="p-1.5 text-emerald-700 hover:bg-slate-100 rounded-md transition-colors" 
              title="Ekspor ke Excel Lengkap (.xlsx)"
            >
              <Download size={20} />
            </button>
            <button 
              onClick={() => setIsImportOpen(true)} 
              className="p-1.5 text-indigo-600 hover:bg-slate-100 rounded-md transition-colors" 
              title="Impor dari Excel (.xls / .xlsx)"
            >
              <FileSpreadsheet size={20} />
            </button>
            <button 
              onClick={() => toast.info("Gunakan menu detail baris tabel untuk mencetak slip/tanda bukti khusus.")} 
              className="p-1.5 text-indigo-700 hover:bg-slate-100 rounded-md transition-colors" 
              title="Print Layout"
            >
              <Printer size={20} />
            </button>
          </div>
          <span className="text-[10px] uppercase font-black tracking-widest text-slate-500 hidden sm:inline">Data Register {typeText}</span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[10px] px-2.5 py-1 font-black leading-none bg-blue-100 text-blue-700 rounded-full flex items-center uppercase">
            <ShieldCheck size={10} className="mr-1" /> Database Koneksi Aktif
          </span>
        </div>
      </div>

      {/* -----------------------------
          Split Workspace Columns
          ----------------------------- */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* ========================================================
            LEFT COLUMN: Daftar Arsip (55%)
            ======================================================== */}
        <div className="xl:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col">
          {/* Logo Brand Header Block */}
          <div className="p-4 md:p-6 bg-white border-b border-slate-100 flex items-center space-x-4">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center shadow-inner shrink-0 p-1">
              <img src="/Logo_BPN.png" alt="BPN Logo" className="w-12 h-12 object-contain" />
            </div>
            <div>
              <h2 className="text-xs md:text-sm font-black text-slate-800 uppercase tracking-tight leading-snug">
                Kantor Pertanahan
              </h2>
              <h3 className="text-sm md:text-base font-black text-blue-900 uppercase tracking-wide leading-none">
                Kota Banjarmasin
              </h3>
            </div>
          </div>

          {/* Form Pencarian Block (Mirrors screenshot) */}
          <div className="p-4 md:p-5 bg-slate-50/50 border-b border-slate-100">
            <div className="border border-slate-200 rounded-2xl p-4 bg-white relative">
              <span className="absolute -top-3 left-4 bg-white px-2.5 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                Pencarian
              </span>

              <div className="space-y-3 mt-1">
                {/* Row 1: Document type, Document No, Box/Bundel, Pemegang Hak */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-3 space-y-1">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Jenis Arsip</Label>
                    <Input 
                      type="text" 
                      value={typeText} 
                      disabled 
                      className="h-10 text-[11px] font-black bg-slate-50 border-slate-200 text-slate-700 select-none uppercase tracking-wider" 
                    />
                  </div>

                  <div className="md:col-span-3 space-y-1">
                    <Label className="text-[9px] font-black uppercase text-slate-400">No. Dokumen</Label>
                    <Input 
                      placeholder="Contoh: 5004 / 101" 
                      value={searchNo} 
                      onChange={(e) => setSearchNo(e.target.value)} 
                      className="h-10 text-[11px] font-bold border-slate-200" 
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Box/Bundel</Label>
                    <Input 
                      placeholder="Rak / Bocs" 
                      value={searchBoks} 
                      onChange={(e) => setSearchBoks(e.target.value)} 
                      className="h-10 text-[11px] font-bold border-slate-200" 
                    />
                  </div>

                  <div className="md:col-span-4 space-y-1">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Pemegang Hak</Label>
                    <Input 
                      placeholder="Identitas Nama" 
                      value={searchNama} 
                      onChange={(e) => setSearchNama(e.target.value)} 
                      className="h-10 text-[11px] font-bold border-slate-200 w-full" 
                    />
                  </div>
                </div>

                {/* Row 2: Kecamatan, Kelurahan, Cari Button */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end pt-1">
                  <div className="md:col-span-5 space-y-1">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Kecamatan</Label>
                    <select
                      value={searchKecamatan}
                      onChange={(e) => {
                        setSearchKecamatan(e.target.value);
                        setSearchKelurahan("");
                      }}
                      className="w-full h-10 rounded-lg border border-slate-200 text-[11px] font-bold uppercase px-3 bg-white"
                    >
                      <option value="">Semua Kecamatan</option>
                      {computedKecamatans.map(k => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-5 space-y-1">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Kelurahan/Desa</Label>
                    <select
                      value={searchKelurahan}
                      onChange={(e) => setSearchKelurahan(e.target.value)}
                      disabled={!searchKecamatan}
                      className="w-full h-10 rounded-lg border border-slate-200 text-[11px] font-bold uppercase px-3 bg-white disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <option value="">Semua Kelurahan/Desa</option>
                      {availableSearchVillages.map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <button 
                      onClick={handleCari}
                      className="w-full h-10 bg-red-600 hover:bg-red-500 text-white font-black text-[10px] uppercase tracking-wider rounded-lg shadow-md hover:scale-[1.02] transition-all flex items-center justify-center gap-1.5"
                    >
                      <Search size={12} />
                      Cari
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Grid/Table of records (Daftar Arsip) */}
          <div className="flex-1 overflow-x-auto custom-scrollbar">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="animate-spin text-blue-600" size={32} />
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sinkronisasi Log Arsip...</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="h-11 px-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Status / Jenis</TableHead>
                    <TableHead className="h-11 px-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Wilayah (Kec/Kel)</TableHead>
                    <TableHead className="h-11 px-4 text-[9px] font-black uppercase tracking-widest text-slate-500">
                      {type === "BUKU_TANAH" ? "No. Hak" : type === "SURAT_UKUR" ? "No. SU" : "No. DI 208"}
                    </TableHead>
                    <TableHead className="h-11 px-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Nama Pemegang HAK</TableHead>
                    <TableHead className="h-11 px-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Penyimpanan</TableHead>
                    <TableHead className="h-11 px-4 text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Pinjam</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">
                        Data Arsip Kosong / Hasil Cari Tidak Ditemukan
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedItems.map((a) => {
                      const isSelected = selectedArchiveId === a.id;
                      return (
                        <TableRow 
                          key={a.id} 
                          onClick={() => handleSelectArchive(a)}
                          className={cn(
                            "cursor-pointer transition-all border-b border-slate-50 select-none",
                            isSelected 
                              ? "bg-blue-600 text-white hover:bg-blue-600 font-bold" 
                              : "hover:bg-blue-50/40 text-slate-700"
                          )}
                        >
                          <TableCell className="px-4 py-3 text-[10px] uppercase font-black">
                            {a.type === "BUKU_TANAH" ? "Buku Tanah" : a.type === "SURAT_UKUR" ? "Surat Ukur" : "Data Warkah"}
                          </TableCell>
                          <TableCell className="px-4 py-3">
                            <div className="flex flex-col text-[9px] uppercase leading-tight">
                              <span className={cn(
                                "font-extrabold leading-none",
                                isSelected ? "text-white animate-pulse" : "text-blue-900"
                              )}>{a.kelurahan || "-"}</span>
                              <span className={cn(
                                "text-[7.5px] font-bold mt-0.5 leading-none",
                                isSelected ? "text-blue-200" : "text-slate-400"
                              )}>{a.kecamatan || "-"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-[11px] font-mono font-black tracking-tight uppercase">
                            {a.type === "BUKU_TANAH" ? (a.noHak || "-") : a.type === "SURAT_UKUR" ? (a.noSU || "-") : (a.noDI208 || "-")}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-[10px] font-black uppercase tracking-tight">
                            {a.namaPemegangHak}
                          </TableCell>
                          <TableCell className="px-4 py-3 text-[10px]">
                            <div className="flex items-center space-x-1.5 uppercase font-mono tracking-tight leading-none text-[9px]">
                              <span>R:{a.rak || "-"}</span>
                              <span>S:{a.shaft || "-"}</span>
                              <span>P:{(a.type === "WARKAH" ? a.boks : a.bundel) || "-"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-3 text-center">
                            <span className={cn(
                              "text-[8px] font-black px-1.5 py-0.5 rounded uppercase leading-none",
                              a.status === 'Available'
                                ? (isSelected ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-700 border border-emerald-200")
                                : (isSelected ? "bg-red-500 text-white" : "bg-amber-100 text-amber-800")
                            )}>
                              {a.status === 'Available' ? "Ready" : "Borrowed"}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Desktop Pagination panel (matches footer on screenshot) */}
          <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Halaman {currentPage} dari {totalPages} (Total {filtered.length} Berkas)
            </span>

            <div className="flex flex-wrap items-center gap-1.5">
              <Button 
                onClick={handlePageFirst} 
                disabled={currentPage === 1} 
                variant="outline" 
                size="sm" 
                className="h-8 text-[10px] font-black uppercase tracking-wider rounded-lg px-2 bg-white"
              >
                First
              </Button>
              <Button 
                onClick={handlePagePrev} 
                disabled={currentPage === 1} 
                variant="outline" 
                size="sm" 
                className="h-8 text-[10px] font-black uppercase tracking-wider rounded-lg px-2 bg-white"
              >
                Previous
              </Button>
              <Button 
                onClick={handlePageNext} 
                disabled={currentPage === totalPages} 
                variant="outline" 
                size="sm" 
                className="h-8 text-[10px] font-black uppercase tracking-wider rounded-lg px-2 bg-white"
              >
                Next
              </Button>
              <Button 
                onClick={handlePageLast} 
                disabled={currentPage === totalPages} 
                variant="outline" 
                size="sm" 
                className="h-8 text-[10px] font-black uppercase tracking-wider rounded-lg px-2 bg-white"
              >
                Last
              </Button>

              <div className="flex items-center space-x-1 ml-2">
                <span className="text-[9px] font-bold uppercase text-slate-400">Goto:</span>
                <Input 
                  type="text" 
                  value={gotoPageValue} 
                  onChange={(e) => setGotoPageValue(e.target.value)} 
                  className="w-10 h-8 text-[10px] px-1 text-center font-black rounded-lg border-slate-200 bg-white" 
                />
                <Button 
                  onClick={handleGotoPageSubmit} 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-[10px] font-black uppercase px-2 bg-white"
                >
                  ..
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            RIGHT COLUMN: Detail Data Arsip (45%)
            ======================================================== */}
        <div className="xl:col-span-5 bg-slate-50 p-5 rounded-3xl border border-slate-200 shadow-xl flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest pl-1 border-l-4 border-blue-600">
              Detail Data Arsip
            </h2>
            {selectedArchiveId && (
              <span className="text-[8px] font-mono tracking-tight bg-blue-100 text-blue-700 py-0.5 px-2 rounded-md font-bold uppercase">
                RID: {selectedArchiveId.slice(-6)}
              </span>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 space-y-4 flex-1 shadow-inner">
            {/* Real Select Jenis Arsip Dropdown */}
            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase text-slate-400">Jenis Arsip (Log)</Label>
              <Input 
                type="text" 
                value={typeText} 
                disabled 
                className="h-10 text-[11px] font-black bg-slate-100 border-slate-200 text-slate-700 select-none uppercase tracking-wider" 
              />
            </div>

            {/* DYNAMIC FIELDSET CONDITIONAL FOR TYPE === 'BUKU_TANAH' */}
            {type === 'BUKU_TANAH' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase text-slate-400">No. HAK</Label>
                    <Input 
                      placeholder="Contoh: 5004" 
                      value={formDataNoHak} 
                      onChange={(e) => setFormDataNoHak(e.target.value)} 
                      className="h-10 text-xs font-bold border-slate-200 uppercase"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Jenis HAK</Label>
                    <select 
                      value={formDataJenisHak} 
                      onChange={(e) => setFormDataJenisHak(e.target.value)}
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:ring-4 focus:ring-blue-100 text-slate-700 uppercase"
                    >
                      {JENIS_HAK.map(j => (
                        <option key={j} value={j}>{j}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase text-slate-400">Nama Pemegang HAK</Label>
                  <Input 
                    placeholder="Contoh: ENDAH" 
                    value={formDataNamaPemegangHak} 
                    onChange={(e) => setFormDataNamaPemegangHak(e.target.value)} 
                    className="h-10 text-xs font-bold border-slate-200 uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase text-slate-400">No. SU (Surat Ukur)</Label>
                    <Input 
                      placeholder="Contoh: 5" 
                      value={formDataNoSU} 
                      onChange={(e) => setFormDataNoSU(e.target.value)} 
                      className="h-10 text-xs font-bold border-slate-200 uppercase"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Tahun SU</Label>
                    <Input 
                      placeholder="Contoh: 2014" 
                      value={formDataTahunSU} 
                      onChange={(e) => setFormDataTahunSU(e.target.value)} 
                      className="h-10 text-xs font-bold border-slate-200 uppercase"
                    />
                  </div>
                </div>

                {/* Nomor SK optional column for Books */}
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase text-slate-400">Nomor SK (Optional)</Label>
                  <Input 
                    placeholder="Nomor Ketetapan SK Pendaftaran" 
                    value={noSK} 
                    onChange={(e) => setNoSK(e.target.value)} 
                    className="h-10 text-xs font-bold border-slate-200 uppercase"
                  />
                </div>
              </div>
            )}

            {/* DYNAMIC FIELDSET CONDITIONAL FOR TYPE === 'SURAT_UKUR' */}
            {type === 'SURAT_UKUR' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase text-slate-400">No. SU</Label>
                    <Input 
                      placeholder="Contoh: 5" 
                      value={formDataNoSU} 
                      onChange={(e) => setFormDataNoSU(e.target.value)} 
                      className="h-10 text-xs font-bold border-slate-200 uppercase"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Tahun SU</Label>
                    <Input 
                      placeholder="Contoh: 2014" 
                      value={formDataTahunSU} 
                      onChange={(e) => setFormDataTahunSU(e.target.value)} 
                      className="h-10 text-xs font-bold border-slate-200 uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase text-slate-400">Nama Pemegang HAK</Label>
                  <Input 
                    placeholder="Contoh: ENDAH" 
                    value={formDataNamaPemegangHak} 
                    onChange={(e) => setFormDataNamaPemegangHak(e.target.value)} 
                    className="h-10 text-xs font-bold border-slate-200 uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase text-slate-400">No. HAK Berkaitan</Label>
                    <Input 
                      placeholder="Contoh: 5004" 
                      value={formDataNoHak} 
                      onChange={(e) => setFormDataNoHak(e.target.value)} 
                      className="h-10 text-xs font-bold border-slate-200 uppercase"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Jenis HAK</Label>
                    <select 
                      value={formDataJenisHak} 
                      onChange={(e) => setFormDataJenisHak(e.target.value)}
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:ring-4 focus:ring-blue-100 text-slate-700 uppercase"
                    >
                      {JENIS_HAK.map(j => (
                        <option key={j} value={j}>{j}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* DYNAMIC FIELDSET CONDITIONAL FOR TYPE === 'WARKAH' */}
            {type === 'WARKAH' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase text-slate-400">No. DI 208</Label>
                    <Input 
                      placeholder="Contoh: 101" 
                      value={formDataNoDI208} 
                      onChange={(e) => setFormDataNoDI208(e.target.value)} 
                      className="h-10 text-xs font-bold border-slate-200 uppercase"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Tahun</Label>
                    <Input 
                      placeholder="Contoh: 2022" 
                      value={formDataTahun} 
                      onChange={(e) => setFormDataTahun(e.target.value)} 
                      className="h-10 text-xs font-bold border-slate-200 uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase text-slate-400">Nama Pemegang HAK</Label>
                  <Input 
                    placeholder="Contoh: SUMIATI" 
                    value={formDataNamaPemegangHak} 
                    onChange={(e) => setFormDataNamaPemegangHak(e.target.value)} 
                    className="h-10 text-xs font-bold border-slate-200 uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Jenis Warkah / Kegiatan</Label>
                    <select 
                      value={formDataJenisWarkah} 
                      onChange={(e) => setFormDataJenisWarkah(e.target.value)}
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:ring-4 focus:ring-blue-100 text-slate-700 uppercase"
                    >
                      <option value="Peralihan Hak">Peralihan Hak</option>
                      <option value="SK HAK / KANTA">SK HAK / KANTA</option>
                      <option value="Pendaftaran Pertama Kali">Pendaftaran Pertama Kali</option>
                      <option value="Format PTSL">Format PTSL</option>
                      <option value="Redistribusi Tanah">Redistribusi Tanah</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Jenis Kegiatan (Sertipikasi)</Label>
                    <select 
                      value={formDataJenisKegiatan} 
                      onChange={(e) => setFormDataJenisKegiatan(e.target.value)}
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:ring-4 focus:ring-blue-100 text-slate-700 uppercase"
                    >
                      {JENIS_KEGIATAN.map(j => (
                        <option key={j} value={j}>{j}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[9px] font-black uppercase text-slate-400">Nomor HAK Terkait (Contoh: HM, HGB)</Label>
                  <Input 
                    placeholder="Contoh: HM 00101 / HGB 00224" 
                    value={formDataNoHak} 
                    onChange={(e) => setFormDataNoHak(e.target.value)} 
                    className="h-10 text-xs font-bold border-slate-200 uppercase"
                  />
                </div>
              </div>
            )}

            {/* SHARED REGIONAL AND LOCALIZATION BLOCKS */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase text-slate-400">Kecamatan</Label>
                <select 
                  value={formDataKecamatan} 
                  onChange={(e) => {
                    setFormDataKecamatan(e.target.value);
                    setFormDataKelurahan("");
                  }}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:ring-4 focus:ring-blue-100 text-slate-700 uppercase"
                >
                  <option value="">-- Pilih --</option>
                  {computedKecamatans.map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[9px] font-black uppercase text-slate-400">Kelurahan/Desa</Label>
                <select 
                  value={formDataKelurahan} 
                  onChange={(e) => setFormDataKelurahan(e.target.value)}
                  disabled={!formDataKecamatan}
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:ring-4 focus:ring-blue-100 text-slate-700 uppercase disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">-- Pilih --</option>
                  {availableVillages.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dynamic Keterangan Hasil Invent (ADA/TIDAK ADA) */}
            {(type === 'BUKU_TANAH' || type === 'SURAT_UKUR') && (
              <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 space-y-3">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block font-bold">Keterangan Hasil Inventarisasi</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[8px] font-bold uppercase text-slate-500">FISIK BUKU TANAH</Label>
                    <select 
                      value={inventoryBukuTanah} 
                      onChange={(e) => setInventoryBukuTanah(e.target.value as any)}
                      className="w-full h-9 px-2 bg-white border border-slate-200 rounded-lg text-xs font-extrabold text-blue-800 focus:ring-4 focus:ring-blue-100 uppercase"
                    >
                      <option value="ADA">ADA</option>
                      <option value="TIDAK ADA">TIDAK ADA</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[8px] font-bold uppercase text-slate-500">FISIK SURAT UKUR</Label>
                    <select 
                      value={inventorySuratUkur} 
                      onChange={(e) => setInventorySuratUkur(e.target.value as any)}
                      className="w-full h-9 px-2 bg-white border border-slate-200 rounded-lg text-xs font-extrabold text-indigo-800 focus:ring-4 focus:ring-indigo-100 uppercase"
                    >
                      <option value="ADA">ADA</option>
                      <option value="TIDAK ADA">TIDAK ADA</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[9px] font-black uppercase text-slate-400">Keterangan</Label>
              <Input 
                placeholder="Contoh: simpan / arsip baik" 
                value={formDataKeterangan} 
                onChange={(e) => setFormDataKeterangan(e.target.value)} 
                className="h-10 text-xs font-bold border-slate-200"
              />
            </div>

            {/* Compact Rak - Shaft - Boks Row mirroring image */}
            <div className="grid grid-cols-3 gap-3 pt-2 bg-slate-50 p-2.5 rounded-xl border border-dashed border-slate-200">
              <div className="space-y-1 text-center">
                <Label className="text-[9px] font-black uppercase text-slate-500">Rak</Label>
                <Input 
                  placeholder="Rak" 
                  value={formDataRak} 
                  onChange={(e) => setFormDataRak(e.target.value)} 
                  className="h-9 font-mono font-black text-center text-xs bg-white border-slate-250 uppercase"
                />
              </div>
              <div className="space-y-1 text-center">
                <Label className="text-[9px] font-black uppercase text-slate-500">Shaft</Label>
                <Input 
                  placeholder="Shaft" 
                  value={formDataShaft} 
                  onChange={(e) => setFormDataShaft(e.target.value)} 
                  className="h-9 font-mono font-black text-center text-xs bg-white border-slate-250 uppercase"
                />
              </div>
              <div className="space-y-1 text-center">
                <Label className="text-[9px] font-black uppercase text-slate-500">
                  {type === "WARKAH" ? "Boks" : "Bundel"}
                </Label>
                <Input 
                  placeholder={type === "WARKAH" ? "Boks" : "Bndl"} 
                  value={formDataBoks} 
                  onChange={(e) => setFormDataBoks(e.target.value)} 
                  className="h-9 font-mono font-black text-center text-xs bg-white border-slate-250 uppercase"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons Row directly in detail footer panel */}
          <div className="space-y-3 shrink-0">
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={handleNew}
                className="flex items-center justify-center space-x-1.5 h-12 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl font-bold text-[11px] uppercase tracking-wider border border-emerald-200 shadow-sm active:scale-[0.97] transition-all"
              >
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full flex items-center justify-center text-white text-[8px] font-black">+</span>
                <span>New</span>
              </button>

              <button 
                onClick={handleSave}
                className="flex items-center justify-center space-x-1.5 h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-[11px] uppercase tracking-wider shadow-md hover:shadow-blue-600/30 active:scale-[0.97] transition-all"
              >
                <Database size={13} />
                <span>Save</span>
              </button>

              <button 
                onClick={handleDelete}
                disabled={!selectedArchiveId}
                className="flex items-center justify-center space-x-1.5 h-12 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-50 disabled:hover:bg-rose-50 disabled:cursor-not-allowed rounded-xl font-bold text-[11px] uppercase tracking-wider border border-rose-200 shadow-sm active:scale-[0.97] transition-all"
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={handleOpenPeminjamanDirect}
                disabled={!selectedArchiveId}
                className="flex items-center justify-center space-x-2 h-12 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-black text-[10px] uppercase tracking-wider shadow-lg active:scale-[0.98] transition-all"
              >
                <UserCheck size={14} className="text-yellow-400 shrink-0" />
                <span className="truncate">Input Peminjaman</span>
              </button>

              <button 
                onClick={() => {
                  const selectedArc = archives.find(a => a.id === selectedArchiveId);
                  if (selectedArc) {
                    setHistoryArchive(selectedArc);
                    setIsHistoryOpen(true);
                  }
                }}
                disabled={!selectedArchiveId}
                className="flex items-center justify-center space-x-2 h-12 bg-white hover:bg-slate-100 border border-slate-250 disabled:opacity-50 disabled:cursor-not-allowed text-slate-800 rounded-xl font-black text-[10px] uppercase tracking-wider shadow-sm active:scale-[0.98] transition-all"
              >
                <History size={14} className="text-blue-600 shrink-0" />
                <span className="truncate">Riwayat Peminjaman</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* -----------------------------
          MODALS / EXTRA DIALOGS
          ----------------------------- */}
      <Dialog open={isLoanOpen} onOpenChange={setIsLoanOpen}>
        <DialogContent className="max-w-xl sm:rounded-[2.5rem] border-none shadow-2xl p-0 w-[95vw] sm:w-full bg-white overflow-hidden max-h-[90vh] flex flex-col">
          <div className="bg-slate-900 px-8 py-8 shrink-0 text-left">
             <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-1 bg-blue-500 rounded-full"></div>
                <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em]">Otoritas Keluar Dokumen</p>
             </div>
             <DialogTitle className="text-white text-2xl font-black uppercase tracking-tight">Input Peminjaman</DialogTitle>
             <p className="text-slate-400 text-[10px] font-medium mt-1">
               {loanArchive?.type === 'BUKU_TANAH' ? `HAK ${loanArchive.jenisHak} NO. ${loanArchive.noHak}` : loanArchive?.type === 'SURAT_UKUR' ? `SURAT UKUR NO. ${loanArchive.noSU}` : `WARKAH NO. ${loanArchive?.noDI208}`}
             </p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 custom-scrollbar bg-white">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Peminjam</Label>
                <Input 
                  placeholder="PETUGAS / PIHAK LUAR..." 
                  className="rounded-2xl border-slate-100 h-10 bg-slate-50 font-bold text-xs focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all uppercase"
                  value={borrowerName}
                  onChange={(e) => setBorrowerName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tujuan</Label>
                <Input 
                  placeholder="PEMELIHARAAN / SCAN / DLL..." 
                  className="rounded-2xl border-slate-100 h-10 bg-slate-50 font-bold text-xs focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all uppercase"
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

          <div className="p-6 border-t border-slate-100 flex gap-3 shrink-0 bg-white">
            <Button variant="ghost" onClick={() => setIsLoanOpen(false)} className="rounded-2xl flex-1 h-12 font-black text-[10px] uppercase tracking-widest text-slate-400">Batal</Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-500 rounded-2xl flex-1 h-12 font-black text-[10px] uppercase tracking-[0.2em] shadow-xl text-white"
              onClick={handleLoanSubmit}
            >
              OK, Pinjamkan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="max-w-3xl sm:rounded-[2.5rem] border-none shadow-2xl p-0 w-[95vw] sm:w-full bg-white h-[90vh]">
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
        <DialogContent className="max-w-2xl sm:rounded-[2.5rem] border-none shadow-2xl p-0 w-[95vw] sm:w-full bg-white h-[80vh]">
          {historyArchive && (
            <LoanHistoryDialog 
              archive={historyArchive}
              loans={loans}
            />
          )}
        </DialogContent>
      </Dialog>

      <ExcelImportDialog 
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        type={type}
        onCompleted={() => {
          toast.success("Database berhasil disinkronkan dengan data Excel baru!");
        }}
      />

      <BatchQRDialog
        isOpen={isQRGeneratorOpen}
        onClose={() => setIsQRGeneratorOpen(false)}
        type={type}
        archives={archives}
      />
    </div>
  );
}
