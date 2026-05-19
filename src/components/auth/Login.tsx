import * as React from "react";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Database, Lock, User as UserIcon, ShieldCheck, Globe, Activity } from 'lucide-react';
import { useAuth } from "@/src/lib/auth";
import { toast } from "sonner";
import { auth as firebaseAuth } from "@/src/lib/firebase";
import { 
  createUserWithEmailAndPassword, 
  updateProfile,
  sendPasswordResetEmail 
} from "firebase/auth";
import { motion, AnimatePresence } from "motion/react";

export function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const { login } = useAuth();

  const handleForgotPassword = async () => {
    if (!userId) {
      toast.error("Masukan ID Personel terlebih dahulu");
      return;
    }
    try {
      const normalizedId = userId.toLowerCase().trim();
      const finalEmail = normalizedId === 'admin' ? 'admin@bpn.go.id' : (normalizedId.includes('@') ? normalizedId : `${normalizedId}@bpn.go.id`);
      await sendPasswordResetEmail(firebaseAuth!, finalEmail);
      toast.success("Email reset password telah dikirim ke " + finalEmail);
    } catch (error: any) {
      toast.error("Gagal mengirim email reset: " + (error.message || "Pastikan ID terdaftar"));
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    if (isRegistering) {
      try {
        if (!firebaseAuth) throw new Error("Firebase not ready");
        const normalizedId = userId.toLowerCase().trim();
        const finalEmail = normalizedId === 'admin' ? 'admin@bpn.go.id' : (normalizedId.includes('@') ? normalizedId : `${normalizedId}@bpn.go.id`);
        const userCred = await createUserWithEmailAndPassword(firebaseAuth, finalEmail, password);
        const finalName = displayName || (normalizedId === 'admin' ? 'Super Admin' : 'Personel');
        await updateProfile(userCred.user, { displayName: finalName });
        
        toast.success("Aktivasi Berhasil", {
          description: "ID Personel Anda kini aktif dan terhubung ke database."
        });
        setIsRegistering(false);
      } catch (error: any) {
        console.error("Registration Error:", error);
        let message = "Registrasi Gagal";
        if (error.code === 'auth/email-already-in-use') {
          message = "ID Personel ini sudah aktif.";
          toast.info("Sudah Aktif", {
            description: "Silakan gunakan menu Login. Jika lupa password, klik 'Lupa Password' di bawah."
          });
        } else if (error.code === 'auth/weak-password') {
          message = "Password terlalu lemah (min. 6 karakter).";
        } else {
          message = error.message || "Gagal membuat akun.";
        }
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    try {
      const normalizedId = userId.toLowerCase().trim();
      const finalEmail = normalizedId === 'admin' ? 'admin@bpn.go.id' : (normalizedId.includes('@') ? normalizedId : `${normalizedId}@bpn.go.id`);
      
      await login(finalEmail, password);
      toast.success("Akses Berhasil");
    } catch (error: any) {
      console.error("Login Error:", error);
      let message = "Kredensial Tidak Valid";
      
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        message = "ID Personel atau Password salah.";
        toast.info("Butuh Aktivasi?", {
          description: "Jika ini login pertama, registrasikan ID Anda melalui menu REGISTRASI di bawah.",
          duration: 6000
        });
      } else if (error.code === 'auth/too-many-requests') {
        message = "Terlalu banyak percobaan. Silakan coba lagi nanti.";
      } else {
        message = error.message || "Login gagal.";
      }
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Dynamic Background */}
      <div className="absolute inset-0 blueprint-grid opacity-30 select-none pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-950/80 to-blue-900/40 pointer-events-none"></div>
      
      {/* Animated Glowing Orbs */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[160px] pointer-events-none" 
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 rounded-[2rem] overflow-hidden bg-slate-900/40 backdrop-blur-3xl border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] relative z-10"
      >
        <div className="lg:col-span-6 p-8 sm:p-12 xl:p-16 flex flex-col justify-center bg-white">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex items-center space-x-4 mb-10"
          >
            <div className="relative group p-3 bg-slate-50 rounded-[2.5rem]">
              <img src="/Logo_BPN.png" alt="BPN Logo" className="w-24 h-24 object-contain" />
              <div className="absolute -inset-2 bg-blue-500/10 rounded-full blur-xl scale-0 group-hover:scale-100 transition-transform"></div>
            </div>
            <div>
               <h1 className="text-3xl font-black tracking-tighter text-slate-900 leading-none uppercase">ATR / BPN</h1>
               <p className="text-sm text-blue-600 font-bold uppercase tracking-[0.2em] mt-2 flex items-center">
                 <Globe size={14} className="mr-2" />
                 Kota Banjarmasin
               </p>
            </div>
          </motion.div>

          <div className="mb-10">
            <h2 className="text-3xl font-black text-slate-900 leading-tight mb-2 uppercase tracking-tight">
              {isRegistering ? "Aktivasi Akses" : "Login Personel"}
            </h2>
            <p className="text-sm text-slate-500 font-medium max-w-xs leading-relaxed">
              Silakan masukkan ID Personel untuk mengakses basis data arsip.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* First-time setup hint */}
            {!isRegistering && (
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl mb-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <Activity size={18} className="text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-900 mb-1">Panduan Akses</h4>
                    <p className="text-[10px] text-blue-700 font-medium leading-relaxed">
                      Wajib melakukan <strong className="font-black">REGISTRASI</strong> pada login pertama untuk mengaktifkan ID yang didaftarkan Admin.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              {isRegistering && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5 overflow-hidden"
                >
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Nama Lengkap</label>
                  <div className="relative">
                    <UserIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <Input 
                      placeholder="Input Nama Lengkap..." 
                      className="pl-12 h-14 bg-slate-50 border-slate-200 rounded-2xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-blue-600/20 transition-all font-mono"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">ID Personel</label>
              <div className="relative">
                <ShieldCheck size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <Input 
                  type="text"
                  placeholder="CONTOH: INDRA / NIP" 
                  className="pl-12 h-14 bg-slate-50 border-slate-200 rounded-2xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-blue-600/20 transition-all uppercase placeholder:normal-case font-mono"
                  required
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Password</label>
                {!isRegistering && (
                  <button 
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest transition-colors"
                  >
                    Lupa?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                <Input 
                  type="password"
                  placeholder="••••••••" 
                  className="pl-12 h-14 bg-slate-50 border-slate-200 rounded-2xl text-xs font-bold focus:bg-white focus:ring-2 focus:ring-blue-600/20 transition-all font-mono"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-600/20 hover:shadow-blue-600/40 hover:-translate-y-0.5 mt-8"
              disabled={isLoading}
            >
              {isLoading ? "Memproses..." : isRegistering ? "Aktifkan Akun" : "Masuk Sistem"}
            </Button>
            
            <div className="text-center mt-6">
              <button 
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-[10px] text-slate-400 hover:text-blue-600 font-black uppercase tracking-widest transition-colors flex items-center justify-center w-full group"
              >
                <span className="w-8 h-px bg-slate-100 group-hover:bg-blue-100 mr-4 transition-all"></span>
                {isRegistering ? "Sudah Aktif? Login Sekarang" : "Belum Aktif? Aktivasi ID Anda"}
                <span className="w-8 h-px bg-slate-100 group-hover:bg-blue-100 ml-4 transition-all"></span>
              </button>
            </div>
          </form>
        </div>

        <div className="hidden lg:flex lg:col-span-6 p-12 xl:p-16 flex-col justify-between relative bg-slate-900 border-l border-white/5">
          <div className="absolute inset-0 blueprint-grid opacity-20 pointer-events-none"></div>
          
          <div className="relative z-10">
             <div className="w-16 h-1 w-20 bg-blue-500 mb-8 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)]"></div>
             <motion.div
               animate={{ y: [0, -5, 0] }}
               transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
             >
                <p className="text-white font-medium text-2xl leading-none tracking-tight mb-4 uppercase italic flex items-center">
                  Secure Archiving
                  <ShieldCheck size={20} className="ml-3 text-blue-400" />
                </p>
                <p className="text-slate-400 text-sm leading-relaxed max-w-sm mb-10 font-medium">
                  Basis data terenkripsi untuk keamanan informasi pertanahan negara. Setiap akses tercatat secara logistik dalam sistem pusat.
                </p>
             </motion.div>
             
             <div className="space-y-6">
                <div className="flex items-center space-x-4">
                   <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400">
                      <Activity size={20} />
                   </div>
                   <div>
                      <p className="text-white text-xs font-black uppercase tracking-wider">Uptime Sistem</p>
                      <p className="text-slate-400 text-[10px] font-bold mt-1">99.98% Operational Baseline</p>
                   </div>
                </div>
                <div className="flex items-center space-x-4">
                   <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
                      <Database size={20} />
                   </div>
                   <div>
                      <p className="text-white text-xs font-black uppercase tracking-wider">Cloud Data</p>
                      <p className="text-slate-400 text-[10px] font-bold mt-1">Real-time Cloud Sync Active</p>
                   </div>
                </div>
             </div>
          </div>

          <div className="relative z-10 pt-12 border-t border-white/5">
             <p className="text-white/20 text-[9px] uppercase font-black tracking-[0.3em] mb-4">Core Infrastructure</p>
             <div className="flex items-center space-x-6">
                <img src="/Logo_BPN.png" alt="BPN" className="h-10 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700 cursor-pointer" />
                <div className="h-8 w-px bg-white/10"></div>
                <p className="text-white/30 text-[10px] font-bold leading-tight">
                  Kementerian Agraria dan Tata Ruang<br/>
                  Badan Pertanahan Nasional
                </p>
             </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
