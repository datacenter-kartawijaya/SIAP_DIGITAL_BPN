import * as React from "react";
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  doc, 
  setDoc, 
  deleteDoc,
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { Location } from '../types';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit, MapPin, Loader2, RefreshCw, Search, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

const INITIAL_LOCATIONS = [
  { 
    kec: "Banjarmasin Selatan", 
    kels: ["Basirih Selatan", "Kelayan Barat", "Kelayan Dalam", "Kelayan Selatan", "Kelayan Tengah", "Kelayan Timur", "Mantuil", "Murung Raya", "Pekauman", "Pemurus Baru", "Pemurus Dalam", "Tanjung Pagar"] 
  },
  { 
    kec: "Banjarmasin Tengah", 
    kels: ["Antasan Besar", "Gadang", "Kelayan Luar", "Kertak Baru Ilir", "Kertak Baru Ulu", "Mawar", "Melayu", "Pasar Lama", "Pekapuran Laut", "Seberang Mesjid", "Sungai Baru", "Teluk Dalam"] 
  },
  { 
    kec: "Banjarmasin Utara", 
    kels: ["Alalak Selatan", "Alalak Tengah", "Alalak Utara", "Antasan Kecil Timur (AKT)", "Pangeran", "Surgi Mufti", "Sungai Jingah", "Sungai Miai", "Kuin Utara"] 
  },
  { 
    kec: "Banjarmasin Timur", 
    kels: ["Benua Anyar", "Karang Mekar", "Kebun Bunga", "Kuripan", "Pekapuran Raya", "Pemurus Luar", "Pengambangan", "Sungai Bilu", "Sungai Lulut"] 
  },
  { 
    kec: "Banjarmasin Barat", 
    kels: ["Basirih", "Belitung Selatan", "Belitung Utara", "Kuin Cerucuk", "Kuin Selatan", "Pelambuan", "Telaga Biru", "Telawang", "Teluk Tiram"] 
  }
];

export function LocationManagement() {
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [editingLocation, setEditingLocation] = React.useState<Location | null>(null);
  const [formData, setFormData] = React.useState({
    name: '',
    type: 'KECAMATAN' as 'KECAMATAN' | 'KELURAHAN',
    parentId: '',
  });

  React.useEffect(() => {
    let unsubscribe: () => void;
    
    const init = async () => {
      const collectionPath = 'locations';
      try {
        if (!db) return;

        const q = collection(db, collectionPath);
        unsubscribe = onSnapshot(q, (snapshot) => {
          const locs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location));
          setLocations(locs);
          setLoading(false);
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, collectionPath);
          setLoading(false);
        });
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    };

    init();
    return () => unsubscribe?.();
  }, []);

  const handleSeedData = async () => {
    if (!window.confirm("Ini akan menambahkan daftar wilayah default. Data yang sudah ada tidak akan dihapus. Lanjutkan?")) return;
    
    try {
      if (!db) return;

      const batch = writeBatch(db);
      
      INITIAL_LOCATIONS.forEach(item => {
        const kecId = item.kec.toLowerCase().replace(/\s+/g, '-');
        const kecRef = doc(db, 'locations', kecId);
        batch.set(kecRef, {
          name: item.kec,
          type: 'KECAMATAN'
        });

        item.kels.forEach(kel => {
          const kelId = `${kecId}-${kel.toLowerCase().replace(/\s+/g, '-')}`;
          const kelRef = doc(db, 'locations', kelId);
          batch.set(kelRef, {
            name: kel,
            type: 'KELURAHAN',
            parentId: kecId
          });
        });
      });

      await batch.commit();
      toast.success("Data wilayah berhasil diinisialisasi");
    } catch (error) {
      console.error(error);
      toast.error("Gagal menginisialisasi data wilayah");
    }
  };

  const handleOpenForm = (loc?: Location) => {
    if (loc) {
      setEditingLocation(loc);
      setFormData({
        name: loc.name,
        type: loc.type,
        parentId: loc.parentId || '',
      });
    } else {
      setEditingLocation(null);
      setFormData({
        name: '',
        type: 'KECAMATAN',
        parentId: '',
      });
    }
    setIsFormOpen(true);
  };

  const handleSaveLocation = async () => {
    if (!formData.name) return toast.error("Nama wajib diisi");
    if (formData.type === 'KELURAHAN' && !formData.parentId) return toast.error("Kecamatan wajib dipilih untuk Kelurahan");

    try {
      if (!db) return;

      const id = editingLocation?.id || formData.name.toLowerCase().replace(/\s+/g, '-');
      await setDoc(doc(db, 'locations', id), {
        name: formData.name,
        type: formData.type,
        ...(formData.type === 'KELURAHAN' ? { parentId: formData.parentId } : {}),
      }, { merge: true });

      toast.success("Wilayah berhasil disimpan");
      setIsFormOpen(false);
    } catch (error) {
      toast.error("Gagal menyimpan data wilayah");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Hapus wilayah ${name}?`)) return;

    try {
      if (!db) return;

      await deleteDoc(doc(db, 'locations', id));
      toast.success("Wilayah berhasil dihapus");
    } catch (error) {
      toast.error("Gagal menghapus wilayah");
    }
  };

  const kecamatans = locations.filter(l => l.type === 'KECAMATAN' && l.name.toLowerCase().includes(search.toLowerCase()));
  const kelurahans = locations.filter(l => l.type === 'KELURAHAN' && l.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <Loader2 className="animate-spin text-blue-600" size={48} />
          <div className="absolute inset-0 flex items-center justify-center">
             <MapPin size={16} className="text-blue-400" />
          </div>
        </div>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Sinkronisasi Wilayah...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <MapPin size={24} className="mr-3 text-blue-600" />
            Master Wilayah
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Manajemen struktur administrasi tingkat kecamatan dan kelurahan
          </p>
        </div>
        
        <div className="flex flex-col sm:row items-stretch sm:items-center gap-3">
          <div className="relative group w-full sm:w-64">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500" />
            <Input 
              placeholder="Cari Wilayah..." 
              className="pl-11 h-12 rounded-2xl bg-white border-slate-200 text-xs font-bold focus:ring-4 focus:ring-blue-50 transition-all uppercase"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              className="bg-blue-600 hover:bg-blue-500 h-12 px-6 rounded-2xl space-x-2 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all"
              onClick={() => handleOpenForm()}
            >
              <Plus size={16} />
              <span>Tambah Baru</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Kecamatan List */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/50">
          <div className="bg-slate-50/50 px-8 py-5 border-b border-slate-100 flex justify-between items-center">
             <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                   <Layers size={14} />
                </div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Daftar Kecamatan</h3>
             </div>
             <span className="text-[10px] font-black px-3 py-1 bg-white border border-slate-200 text-blue-600 rounded-full">{kecamatans.length}</span>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-transparent">
                <TableRow className="hover:bg-transparent border-b-0">
                  <TableHead className="text-[10px] uppercase font-black tracking-widest px-8 h-12 text-slate-400">Nama Administrasi</TableHead>
                  <TableHead className="w-[120px] px-8 h-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kecamatans.length === 0 ? (
                  <TableRow>
                     <TableCell colSpan={2} className="h-48 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">Data Tidak Ditemukan</TableCell>
                  </TableRow>
                ) : (
                  kecamatans.map(kec => (
                    <TableRow key={kec.id} className="group hover:bg-blue-50/20 border-b border-slate-50 last:border-0">
                      <TableCell className="font-black text-slate-900 py-5 px-8 text-sm tracking-tight uppercase group-hover:text-blue-600 transition-colors">{kec.name}</TableCell>
                      <TableCell className="py-5 px-8">
                         <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-white shadow-sm border border-transparent hover:border-slate-100" onClick={() => handleOpenForm(kec)}>
                              <Edit size={14} className="text-slate-400" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-red-50 hover:text-red-600 shadow-sm border border-transparent hover:border-red-100" onClick={() => handleDelete(kec.id, kec.name)}>
                              <Trash2 size={14} className="text-slate-400" />
                            </Button>
                         </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Kelurahan List */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/50">
          <div className="bg-slate-50/50 px-8 py-5 border-b border-slate-100 flex justify-between items-center">
             <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                   <Layers size={14} />
                </div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Daftar Kelurahan</h3>
             </div>
             <span className="text-[10px] font-black px-3 py-1 bg-white border border-slate-200 text-emerald-600 rounded-full">{kelurahans.length}</span>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-transparent">
                <TableRow className="hover:bg-transparent border-b-0">
                  <TableHead className="text-[10px] uppercase font-black tracking-widest px-8 h-12 text-slate-400">Nama Kelurahan</TableHead>
                  <TableHead className="text-[10px] uppercase font-black tracking-widest px-8 h-12 text-slate-400">Parent Kecamatan</TableHead>
                  <TableHead className="w-[120px] px-8 h-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kelurahans.length === 0 ? (
                  <TableRow>
                     <TableCell colSpan={3} className="h-48 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">Data Tidak Ditemukan</TableCell>
                  </TableRow>
                ) : (
                  kelurahans.map(kel => (
                    <TableRow key={kel.id} className="group hover:bg-emerald-50/20 border-b border-slate-50 last:border-0">
                      <TableCell className="font-black text-slate-900 py-5 px-8 text-sm tracking-tight uppercase group-hover:text-emerald-600 transition-colors">{kel.name}</TableCell>
                      <TableCell className="px-8">
                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-md">
                           {kecamatans.find(k => k.id === kel.parentId)?.name || '-'}
                         </span>
                      </TableCell>
                      <TableCell className="py-5 px-8">
                         <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-white shadow-sm border border-transparent hover:border-slate-100" onClick={() => handleOpenForm(kel)}>
                              <Edit size={14} className="text-slate-400" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-red-50 hover:text-red-600 shadow-sm border border-transparent hover:border-red-100" onClick={() => handleDelete(kel.id, kel.name)}>
                              <Trash2 size={14} className="text-slate-400" />
                            </Button>
                         </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-xl w-[95vw] rounded-[2.5rem] border-none shadow-2xl p-0 bg-white focus:outline-none flex flex-col max-h-[90vh] overflow-hidden">
          <div className="bg-slate-900 px-8 py-8 relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/20 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <DialogHeader className="relative z-10">
               <div className="w-8 h-1 bg-blue-500 rounded-full mb-3"></div>
               <DialogTitle className="text-white text-2xl font-black uppercase tracking-tight">
                 {editingLocation ? "Update Wilayah" : "Area Registrasi"}
               </DialogTitle>
               <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] mt-1">Struktur Administrasi Pertanahan</p>
            </DialogHeader>
          </div>
          
          <div className="p-8 space-y-6 bg-white overflow-y-visible">
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Kategori Wilayah</Label>
                <Select 
                  value={formData.type || "KECAMATAN"} 
                  onValueChange={(val: any) => setFormData({...formData, type: val, parentId: val === 'KECAMATAN' ? '' : formData.parentId})}
                  disabled={!!editingLocation}
                >
                  <SelectTrigger className="h-12 w-full rounded-xl border-slate-100 bg-slate-50/50 font-black text-xs shadow-none focus:ring-4 focus:ring-blue-50 transition-all uppercase cursor-pointer">
                    <SelectValue placeholder="PILIH TINGKATAN" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 rounded-xl shadow-2xl p-2 focus:outline-none">
                    <SelectItem value="KECAMATAN" className="focus:bg-blue-600 focus:text-white py-2.5 px-4 rounded-lg font-black text-[10px] uppercase tracking-widest cursor-pointer transition-colors">Kecamatan</SelectItem>
                    <SelectItem value="KELURAHAN" className="focus:bg-blue-600 focus:text-white py-2.5 px-4 rounded-lg font-black text-[10px] uppercase tracking-widest cursor-pointer transition-colors">Kelurahan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Nama Geografis</Label>
                <Input 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="INPUT NAMA WILAYAH..."
                  className="h-12 rounded-xl border-slate-100 bg-slate-50/50 font-black text-xs focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all uppercase"
                />
              </div>
  
              {formData.type === 'KELURAHAN' && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Kecamatan Induk</Label>
                  <Select 
                    value={formData.parentId || ""} 
                    onValueChange={(val) => setFormData({...formData, parentId: val})}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50/50 font-black text-xs shadow-none focus:ring-4 focus:ring-blue-50 transition-all uppercase cursor-pointer">
                      <SelectValue placeholder="PILIH INDUK" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 rounded-xl shadow-2xl p-2 focus:outline-none">
                      {kecamatans.map(k => (
                        <SelectItem key={k.id} value={k.id} className="focus:bg-blue-600 focus:text-white py-2.5 px-4 rounded-lg font-black text-[10px] uppercase tracking-widest cursor-pointer transition-colors">{k.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
  
          <div className="p-8 bg-white border-t border-slate-50 flex flex-col gap-3 shrink-0">
            <Button 
              onClick={handleSaveLocation}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] h-12 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
            >
              Simpan Perubahan
            </Button>
            <Button variant="ghost" onClick={() => setIsFormOpen(false)} className="w-full rounded-xl text-[10px] font-black uppercase tracking-widest h-10 text-slate-400 hover:text-slate-600">Batalkan Prosedur</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
