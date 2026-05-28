import * as React from "react";
import { useState, useEffect } from 'react';
import { 
  auth, 
  db,
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  setDoc,
  serverTimestamp,
  orderBy
} from '../lib/firebase';
import { User, UserRole } from '../types';
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
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
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
import { MoreVertical, UserPlus, Shield, User as UserIcon, Trash2, CheckCircle2, XCircle, Edit, Calendar, Loader2, Key } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { cn } from "@/src/lib/utils";
import { handleFirestoreError, OperationType } from '../lib/error-handler';
import { useAuth } from '../lib/auth';

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    role: 'PETUGAS_ARSIP' as UserRole,
  });

  const { currentUser } = useAuth();

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initUsers = async () => {
      if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN')) {
        setLoading(false);
        return;
      }

      const collectionPath = 'users';
      if (!db) {
        setLoading(false);
        return;
      }
      
      const q = query(collection(db, collectionPath), orderBy('createdAt', 'desc'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        const userList = snapshot.docs.map(doc => ({
          ...doc.data(),
          uid: doc.id
        })) as User[];
        setUsers(userList);
        setLoading(false);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, collectionPath);
        setLoading(false);
      });
    };

    initUsers();
    return () => unsubscribe?.();
  }, [currentUser]);

  const handleOpenForm = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        displayName: user.displayName,
        email: user.email,
        password: '',
        role: user.role,
      });
    } else {
      setEditingUser(null);
      setFormData({
        displayName: '',
        email: '',
        password: '',
        role: 'PETUGAS_ARSIP',
      });
    }
    setIsFormOpen(true);
  };

  const handleSaveUser = async () => {
    if (!formData.displayName || !formData.email) {
      toast.error("Nama dan ID Pengguna wajib diisi");
      return;
    }

    if (!editingUser && !formData.password) {
      toast.error("Kata Sandi wajib diisi untuk pengguna baru");
      return;
    }

    try {
      if (!db) return;

      if (editingUser) {
        // Update
        await updateDoc(doc(db, 'users', editingUser.uid), {
          displayName: formData.displayName,
          role: formData.role,
        });
        toast.success("Profil pengguna diperbarui");
      } else {
        // Create skeleton profile with temporary password for first-time login
        const normalizedInput = formData.email.toLowerCase().trim();
        const finalEmail = normalizedInput.includes('@') ? normalizedInput : `${normalizedInput}@bpn.go.id`;
        const tempUid = normalizedInput.replace(/[^a-zA-Z0-9]/g, '_');
        
        await setDoc(doc(db, 'users', tempUid), {
          displayName: formData.displayName,
          email: finalEmail,
          role: formData.role,
          tempPassword: formData.password, 
          isActive: true,
          createdAt: serverTimestamp(),
        });
        toast.success("Pengguna berhasil ditambahkan ke sistem");
      }
      setIsFormOpen(false);
    } catch (error) {
      toast.error("Gagal menyimpan data pengguna");
    }
  };

  const handleUpdateRole = async (uid: string, newRole: UserRole) => {
    try {
      if (!db) return;
      await updateDoc(doc(db, 'users', uid), {
        role: newRole
      });
      toast.success(`Role diperbarui ke ${newRole}`);
    } catch (error) {
      toast.error("Gagal memperbarui role");
    }
  };

  const toggleActiveStatus = async (uid: string, currentStatus: boolean) => {
    try {
      if (!db) return;
      await updateDoc(doc(db, 'users', uid), {
        isActive: !currentStatus
      });
      toast.success(`User ${!currentStatus ? 'diaktifkan' : 'dinonaktifkan'}`);
    } catch (error) {
      toast.error("Gagal mengubah status");
    }
  };

  const handleDeleteUser = async (userToDelete: User) => {
    if (userToDelete.uid === currentUser?.uid) {
      toast.error("Anda tidak bisa menghapus akun Anda sendiri");
      return;
    }

    if (userToDelete.role === 'SUPER_ADMIN' && currentUser?.role !== 'SUPER_ADMIN') {
      toast.error("Hanya Super Admin yang bisa menghapus Super Admin");
      return;
    }

    if (!window.confirm(`PERINGATAN KRITIS: Menghapus pengguna ${userToDelete.displayName} akan mencabut semua hak aksesnya ke sistem secara permanen. Lanjutkan?`)) return;

    try {
      if (!db) return;
      await deleteDoc(doc(db, 'users', userToDelete.uid));
      toast.success("Pengguna dihapus");
    } catch (error) {
      toast.error("Gagal menghapus pengguna");
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200 text-[9px] font-bold uppercase">Super Admin</Badge>;
      case 'ADMIN':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200 text-[9px] font-bold uppercase">Admin</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-slate-200 text-[9px] font-bold uppercase">Petugas</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <Loader2 className="animate-spin text-blue-600" size={48} />
          <div className="absolute inset-0 flex items-center justify-center">
             <UserIcon size={16} className="text-blue-400" />
          </div>
        </div>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Sinkronisasi Otoritas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center">
            <Shield size={24} className="mr-3 text-blue-600" />
            Control Center Pengguna
          </h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            Manajemen hak akses, role, dan kredensial personel sistem
          </p>
        </div>
        
        <Button 
          className="bg-blue-600 hover:bg-blue-500 h-14 px-8 rounded-2xl space-x-3 text-white font-black text-[11px] uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all lg:w-auto w-full"
          onClick={() => handleOpenForm()}
        >
          <UserPlus size={18} />
          <span>Daftarkan Profil Database</span>
        </Button>
      </div>

      <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 mb-6">
        <p className="text-[10px] text-blue-700 font-bold uppercase tracking-widest leading-relaxed">
          <span className="bg-blue-600 text-white px-2 py-0.5 rounded mr-2">Catatan Admin</span>
          Menambahkan user di sini hanya akan membuat profil di database. Personel wajib melakukan <strong className="text-blue-900 underline">AKTIVASI</strong> melalui halaman login menggunakan ID yang didaftarkan untuk bisa mengakses sistem.
        </p>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/50">
        <div className="overflow-x-auto custom-scrollbar">
          <Table>
            <TableHeader className="bg-slate-50/50 border-b border-slate-100">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-16 font-black text-slate-500 text-[9px] uppercase tracking-[0.2em] px-8">Profil & ID Personel</TableHead>
                <TableHead className="h-16 font-black text-slate-500 text-[9px] uppercase tracking-[0.2em] px-8">Otoritas Role</TableHead>
                <TableHead className="h-16 font-black text-slate-500 text-[9px] uppercase tracking-[0.2em] px-8 text-center">Status Akses</TableHead>
                <TableHead className="h-16 font-black text-slate-500 text-[9px] uppercase tracking-[0.2em] px-8">Waktu Registrasi</TableHead>
                <TableHead className="h-16 w-20 px-0"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user, idx) => (
                <TableRow key={user.uid} className={cn(
                  "group hover:bg-blue-50/20 transition-all border-b border-slate-50 last:border-0",
                  idx % 2 === 1 && "bg-slate-50/30"
                )}>
                  <TableCell className="px-8 py-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                        <UserIcon size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <p className="font-black text-slate-900 text-sm tracking-tight uppercase leading-none group-hover:text-blue-600 transition-colors">{user.displayName}</p>
                          {(user as any).tempPassword && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[8px] h-4 font-black uppercase tracking-tighter">Draft / Belum Aktif</Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{user.email.replace('@bpn.go.id', '')}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-8 py-6">
                    <div className="flex flex-col">
                      {getRoleBadge(user.role)}
                    </div>
                  </TableCell>
                  <TableCell className="px-8 py-6 text-center">
                    <div className={cn(
                      "status-chip mx-auto py-1",
                      user.isActive 
                        ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                        : "bg-red-50 text-red-600 border-red-100"
                    )}>
                      <div className={cn("w-1.5 h-1.5 rounded-full mr-2", user.isActive ? "bg-emerald-500" : "bg-red-500")}></div>
                      <span>{user.isActive ? "Authorized" : "Blocked"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-8 py-6">
                    <div className="flex items-center space-x-2 text-slate-500">
                      <Calendar size={12} className="text-slate-300" />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {user.createdAt ? (user.createdAt.toDate ? user.createdAt.toDate().toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'}) : new Date(user.createdAt).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year: 'numeric'})) : '-'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="px-8 py-6 text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex items-center justify-center h-10 w-10 rounded-2xl hover:bg-slate-100 transition-all mx-auto active:scale-90">
                        <MoreVertical size={18} className="text-slate-400 group-hover:text-slate-900" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-[1.5rem] p-2 w-56 border-slate-100 shadow-2xl focus:outline-none bg-white">
                        <DropdownMenuGroup>
                          <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 p-3">Modifikasi Akses</DropdownMenuLabel>
                          <DropdownMenuItem 
                            className="rounded-xl text-[10px] font-black uppercase tracking-widest py-3 cursor-pointer focus:bg-blue-50 focus:text-blue-700"
                            onClick={() => handleOpenForm(user)}
                          >
                            <Edit size={14} className="mr-3 text-slate-300" /> Edit User Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="rounded-xl text-[10px] font-black uppercase tracking-widest py-3 cursor-pointer focus:bg-amber-50 focus:text-amber-700"
                            onClick={() => {
                              toast.info(`Info Kredensial: ${user.displayName}`, {
                                description: `ID: ${user.email} | Password: ${user.tempPassword || 'Sudah diganti user'}`,
                                duration: 10000
                              });
                            }}
                          >
                            <Key size={14} className="mr-3 text-amber-300" /> Lihat Info Login
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator className="my-2 bg-slate-50" />
                        <DropdownMenuGroup>
                          <DropdownMenuItem 
                            className="rounded-xl text-[10px] font-black uppercase tracking-widest py-3 cursor-pointer focus:bg-purple-50 focus:text-purple-700"
                            onClick={() => handleUpdateRole(user.uid, 'ADMIN')}
                          >
                            <Shield size={14} className="mr-3 text-purple-300" /> Upgrade ke Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="rounded-xl text-[10px] font-black uppercase tracking-widest py-3 cursor-pointer focus:bg-blue-50 focus:text-blue-700"
                            onClick={() => handleUpdateRole(user.uid, 'PETUGAS_ARSIP')}
                          >
                            <UserIcon size={14} className="mr-3 text-blue-300" /> Jadikan Petugas
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator className="my-2 bg-slate-50" />
                        <DropdownMenuGroup>
                          <DropdownMenuItem 
                            className={cn(
                               "rounded-xl text-[10px] font-black uppercase tracking-widest py-3 cursor-pointer",
                               user.isActive ? "focus:bg-amber-50 focus:text-amber-700" : "focus:bg-emerald-50 focus:text-emerald-700"
                            )}
                            onClick={() => toggleActiveStatus(user.uid, user.isActive)}
                          >
                            {user.isActive ? <XCircle size={14} className="mr-3 text-amber-300" /> : <CheckCircle2 size={14} className="mr-3 text-emerald-300" />}
                            {user.isActive ? "Non-Aktifkan Unit" : "Aktifkan Kembali"}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="rounded-xl text-[10px] font-black uppercase tracking-widest py-3 cursor-pointer text-red-500 focus:text-red-600 focus:bg-red-50"
                            onClick={() => handleDeleteUser(user)}
                          >
                            <Trash2 size={14} className="mr-3" /> Hapus Permanen
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-xl w-[95vw] rounded-[2rem] border-none shadow-2xl p-0 bg-white focus:outline-none flex flex-col max-h-[90vh]">
          <div className="bg-slate-900 px-8 py-8 relative overflow-hidden shrink-0">
             <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full -mr-10 -mt-10 blur-2xl"></div>
             <DialogHeader className="relative z-10">
               <div className="w-8 h-1 bg-blue-500 rounded-full mb-3"></div>
               <DialogTitle className="text-white text-xl font-black uppercase tracking-tight leading-none">
                 {editingUser ? "Edit Profil" : "Draft Profil Baru"}
               </DialogTitle>
               <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] mt-1">
                 {editingUser ? "Modifikasi data di database" : "Menyimpan data di database (Belum teraktivasi)"}
               </p>
             </DialogHeader>
          </div>
          <div className="p-8 space-y-5 bg-white">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Identitas Lengkap</Label>
              <Input 
                value={formData.displayName}
                onChange={e => setFormData({...formData, displayName: e.target.value})}
                placeholder="NAMA LENGKAP PERSONEL..."
                className="h-12 rounded-xl border-slate-100 bg-slate-50/50 font-black text-xs focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">ID Personel (Username)</Label>
              <Input 
                value={formData.email.replace('@bpn.go.id', '')}
                onChange={e => setFormData({...formData, email: e.target.value})}
                placeholder="CONTOH: INDRA / NIP..."
                disabled={!!editingUser}
                className="h-12 rounded-xl border-slate-100 bg-slate-50/50 font-black text-xs focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all uppercase font-mono"
              />
            </div>
            {!editingUser && (
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Password Inisial</Label>
                <Input 
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  placeholder="MINIMAL 6 KARAKTER..."
                  className="h-12 rounded-xl border-slate-100 bg-slate-50/50 font-black text-xs focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all uppercase"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">Otoritas Tingkatan (Role)</Label>
              <Select 
                value={formData.role} 
                onValueChange={(val: UserRole) => setFormData({...formData, role: val})}
              >
                <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50/50 font-black text-[10px] uppercase tracking-widest shadow-none focus:ring-4 focus:ring-blue-50 transition-all">
                  <SelectValue placeholder="PILIH ROLE" />
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 rounded-xl shadow-2xl p-2 focus:outline-none">
                  <SelectItem value="PETUGAS_ARSIP" className="focus:bg-blue-600 focus:text-white py-3 px-4 rounded-lg font-black text-[10px] uppercase tracking-widest cursor-pointer transition-colors">Petugas Arsip</SelectItem>
                  <SelectItem value="ADMIN" className="focus:bg-blue-600 focus:text-white py-3 px-4 rounded-lg font-black text-[10px] uppercase tracking-widest cursor-pointer transition-colors">Administrator</SelectItem>
                  <SelectItem value="SUPER_ADMIN" className="focus:bg-blue-600 focus:text-white py-3 px-4 rounded-lg font-black text-[10px] uppercase tracking-widest cursor-pointer transition-colors">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="p-8 pt-0 bg-white flex flex-col gap-3 shrink-0">
            <Button 
              onClick={handleSaveUser}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] h-12 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
            >
              Simpan Data User
            </Button>
            <Button variant="ghost" onClick={() => setIsFormOpen(false)} className="w-full rounded-xl text-[10px] font-black uppercase tracking-widest h-10 text-slate-400 hover:text-slate-600">Batalkan Prosedur</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
