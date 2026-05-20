import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JENIS_HAK, JENIS_KEGIATAN } from "@/src/constants";
import { ArchiveType, Location } from "@/src/types";
import { collection, query, where, getDocs } from "firebase/firestore";

import { db } from "../../lib/firebase";

const archiveSchema = z.object({
  type: z.enum(["BUKU_TANAH", "WARKAH", "SURAT_UKUR"]),
  namaPemegangHak: z.string().min(1, "Nama pemegang hak wajib diisi"),
  kecamatan: z.string().min(1, "Kecamatan wajib dipilih"),
  kelurahan: z.string().min(1, "Kelurahan wajib dipilih"),
  rak: z.string().min(1, "Nomor rak wajib diisi"),
  shaft: z.string().min(1, "Nomor shaft wajib diisi"),
  boks: z.string().optional(),
  bundel: z.string().optional(),
  keterangan: z.string().optional(),
  
  // BT fields
  noHak: z.string().optional(),
  jenisHak: z.string().optional(),
  noSU: z.string().optional(),
  tahunSU: z.string().optional(),
  
  // Warkah fields
  noDI208: z.string().optional(),
  jenisWarkah: z.string().optional(),
  jenisKegiatan: z.string().optional(),
  tahun: z.string().optional(),
});

type ArchiveFormValues = z.infer<typeof archiveSchema>;

interface ArchiveFormProps {
  onSubmit: (values: ArchiveFormValues) => void;
  initialValues?: Partial<ArchiveFormValues>;
  type: ArchiveType;
}

export function ArchiveForm({ onSubmit, initialValues, type }: ArchiveFormProps) {
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [loadingLocs, setLoadingLocs] = React.useState(true);

  React.useEffect(() => {
    const fetchLocations = async () => {
      try {
        if (!db) return;
        const q = collection(db, "locations");
        const snap = await getDocs(q);
        const locs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location));
        setLocations(locs);

        // If editing, map names back to IDs for the dropdowns
        if (initialValues?.kecamatan || initialValues?.kelurahan) {
          const kecId = locs.find(l => l.name === initialValues.kecamatan && l.type === 'KECAMATAN')?.id;
          const kelId = locs.find(l => l.name === initialValues.kelurahan && l.type === 'KELURAHAN')?.id;
          
          if (kecId) form.setValue('kecamatan', kecId);
          if (kelId) form.setValue('kelurahan', kelId);
        }
      } catch (err) {
        console.error("Failed to fetch locations", err);
      } finally {
        setLoadingLocs(false);
      }
    };
    fetchLocations();
  }, [initialValues]);

  const form = useForm<ArchiveFormValues>({
    resolver: zodResolver(archiveSchema),
    defaultValues: {
      type,
      namaPemegangHak: "",
      kecamatan: "",
      kelurahan: "",
      rak: "",
      shaft: "",
      noHak: "",
      jenisHak: "",
      noSU: "",
      tahunSU: "",
      noDI208: "",
      jenisWarkah: "",
      jenisKegiatan: "",
      tahun: "",
      ...initialValues,
    },
  });

  const selectedKecId = form.watch("kecamatan");
  const filteredKelurahans = locations.filter(l => l.type === 'KELURAHAN' && l.parentId === selectedKecId);
  const kecamatans = locations.filter(l => l.type === 'KECAMATAN');

  // Handle submit to replace IDs with names if we want to store names (easier for display in tables)
  // Or just store IDs. Let's store Names for simple display in ArchiveList.
  const handleInternalSubmit = (values: ArchiveFormValues) => {
    const kecName = locations.find(l => l.id === values.kecamatan)?.name || values.kecamatan;
    const kelName = locations.find(l => l.id === values.kelurahan)?.name || values.kelurahan;
    
    onSubmit({
      ...values,
      kecamatan: kecName,
      kelurahan: kelName
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleInternalSubmit)} className="space-y-8">
        <div className="bg-white border border-slate-100 rounded-[2rem] p-6 lg:p-10 shadow-sm ring-1 ring-slate-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            
            {/* LEFT COLUMN - IDENTITAS DOKUMEN */}
            <div className="space-y-6">
              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.3em] pb-2 border-b-2 border-blue-600 inline-block">
                Detail Identitas Data Arsip
              </h3>

              {/* 1. Jenis Arsip (Read-only / Display) */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] ml-1">Jenis Arsip</label>
                <Input 
                  value={type === 'BUKU_TANAH' ? "Buku Tanah" : type === 'WARKAH' ? "Data Warkah" : "Surat Ukur"} 
                  disabled 
                  className="h-12 rounded-xl bg-slate-50 border-none text-xs font-black text-slate-600 tracking-wider uppercase px-4" 
                />
              </div>

              {/* CONDITIONAL SPECIFIC FIELDS FOR BUKU_TANAH */}
              {type === 'BUKU_TANAH' && (
                <>
                  {/* 2. No. HAK */}
                  <FormField
                    control={form.control}
                    name="noHak"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] ml-1">No. HAK</FormLabel>
                        <FormControl>
                          <Input placeholder="CONTOH: 5004" {...field} className="h-12 rounded-xl bg-white border-slate-200 text-xs font-bold shadow-sm" />
                        </FormControl>
                        <FormMessage className="text-[9px] font-medium text-red-500 ml-1" />
                      </FormItem>
                    )}
                  />

                  {/* 3. Jenis HAK */}
                  <FormField
                    control={form.control}
                    name="jenisHak"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] ml-1">Jenis HAK</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-xl bg-white border-slate-200 text-xs shadow-sm font-bold">
                              <SelectValue placeholder="PILIH JENIS HAK" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white border-slate-200 rounded-xl shadow-2xl">
                            {JENIS_HAK.map(h => (
                              <SelectItem key={h} value={h} className="text-xs focus:bg-blue-50 font-semibold py-2 cursor-pointer">{h}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-[9px] font-medium text-red-500 ml-1" />
                      </FormItem>
                    )}
                  />

                  {/* 4. Nama Pemegang HAK */}
                  <FormField
                    control={form.control}
                    name="namaPemegangHak"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] ml-1">Nama Pemegang HAK</FormLabel>
                        <FormControl>
                          <Input placeholder="NAMA LENGKAP" {...field} className="h-12 rounded-xl bg-white border-slate-200 text-xs focus:ring-4 focus:ring-blue-50 transition-all font-bold placeholder:text-slate-300 shadow-sm uppercase" />
                        </FormControl>
                        <FormMessage className="text-[9px] font-medium text-red-500 ml-1" />
                      </FormItem>
                    )}
                  />

                  {/* 5. No. SU */}
                  <FormField
                    control={form.control}
                    name="noSU"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] ml-1">No. SU</FormLabel>
                        <FormControl>
                          <Input placeholder="CONTOH: 5" {...field} className="h-12 rounded-xl bg-white border-slate-200 text-xs font-bold shadow-sm" />
                        </FormControl>
                        <FormMessage className="text-[9px] font-medium text-red-500 ml-1" />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* CONDITIONAL SPECIFIC FIELDS FOR WARKAH */}
              {type === 'WARKAH' && (
                <>
                  {/* 2. No. DI 208 */}
                  <FormField
                    control={form.control}
                    name="noDI208"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] ml-1">No. DI 208</FormLabel>
                        <FormControl>
                          <Input placeholder="CONTOH: 101" {...field} className="h-12 rounded-xl bg-white border-slate-200 text-xs font-bold shadow-sm" />
                        </FormControl>
                        <FormMessage className="text-[9px] font-medium text-red-500 ml-1" />
                      </FormItem>
                    )}
                  />

                  {/* 3. Nama Pemegang HAK */}
                  <FormField
                    control={form.control}
                    name="namaPemegangHak"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] ml-1">Nama Pemegang HAK</FormLabel>
                        <FormControl>
                          <Input placeholder="NAMA LENGKAP" {...field} className="h-12 rounded-xl bg-white border-slate-200 text-xs focus:ring-4 focus:ring-blue-50 transition-all font-bold placeholder:text-slate-300 shadow-sm uppercase" />
                        </FormControl>
                        <FormMessage className="text-[9px] font-medium text-red-500 ml-1" />
                      </FormItem>
                    )}
                  />

                  {/* 4. Jenis Kegiatan */}
                  <FormField
                    control={form.control}
                    name="jenisKegiatan"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] ml-1">Jenis Kegiatan</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-xl bg-white border-slate-200 text-xs shadow-sm font-bold">
                              <SelectValue placeholder="PILIH JENIS KEGIATAN" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-white border-slate-200 rounded-xl shadow-2xl">
                            {JENIS_KEGIATAN.map(k => (
                              <SelectItem key={k} value={k} className="text-xs focus:bg-blue-50 font-semibold py-2 cursor-pointer">{k}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-[9px] font-medium text-red-500 ml-1" />
                      </FormItem>
                    )}
                  />

                  {/* 5. Tahun SU */}
                  <FormField
                    control={form.control}
                    name="tahun"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] ml-1">Tahun SU</FormLabel>
                        <FormControl>
                          <Input placeholder="CONTOH: 2022" {...field} className="h-12 rounded-xl bg-white border-slate-200 text-xs font-bold shadow-sm" />
                        </FormControl>
                        <FormMessage className="text-[9px] font-medium text-red-500 ml-1" />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* CONDITIONAL SPECIFIC FIELDS FOR SURAT_UKUR */}
              {type === 'SURAT_UKUR' && (
                <>
                  {/* 2. No. SU */}
                  <FormField
                    control={form.control}
                    name="noSU"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] ml-1">Nomor SU</FormLabel>
                        <FormControl>
                          <Input placeholder="CONTOH: 12345" {...field} className="h-12 rounded-xl bg-white border-slate-200 text-xs font-bold shadow-sm" />
                        </FormControl>
                        <FormMessage className="text-[9px] font-medium text-red-500 ml-1" />
                      </FormItem>
                    )}
                  />

                  {/* 3. Tahun SU */}
                  <FormField
                    control={form.control}
                    name="tahunSU"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] ml-1">Tahun SU</FormLabel>
                        <FormControl>
                          <Input placeholder="YYYY" {...field} className="h-12 rounded-xl bg-white border-slate-200 text-xs font-bold shadow-sm" />
                        </FormControl>
                        <FormMessage className="text-[9px] font-medium text-red-500 ml-1" />
                      </FormItem>
                    )}
                  />

                  {/* 4. Nama Pemegang Hak */}
                  <FormField
                    control={form.control}
                    name="namaPemegangHak"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] ml-1">Nama Pemegang HAK</FormLabel>
                        <FormControl>
                          <Input placeholder="NAMA LENGKAP" {...field} className="h-12 rounded-xl bg-white border-slate-200 text-xs focus:ring-4 focus:ring-blue-50 transition-all font-bold placeholder:text-slate-300 shadow-sm uppercase" />
                        </FormControl>
                        <FormMessage className="text-[9px] font-medium text-red-500 ml-1" />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </div>

            {/* RIGHT COLUMN - LOKASI, KETERANGAN & PENYIMPANAN (RAK/SHAFT/BOKS) */}
            <div className="space-y-6">
              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.3em] pb-2 border-b-2 border-blue-600 inline-block">
                Wilayah &amp; Posisi Penyimpanan
              </h3>

              {/* 5. Tahun SU (for Buku Tanah - moves to RHS for balancing) */}
              {type === 'BUKU_TANAH' && (
                <FormField
                  control={form.control}
                  name="tahunSU"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] ml-1">Tahun SU</FormLabel>
                      <FormControl>
                        <Input placeholder="CONTOH: 2014" {...field} className="h-12 rounded-xl bg-white border-slate-200 text-xs font-bold shadow-sm" />
                      </FormControl>
                      <FormMessage className="text-[9px] font-medium text-red-500 ml-1" />
                    </FormItem>
                  )}
                />
              )}

              {/* 6. Kecamatan */}
              <FormField
                control={form.control}
                name="kecamatan"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] ml-1">Kecamatan</FormLabel>
                    <Select onValueChange={(val) => {
                      field.onChange(val);
                      form.setValue("kelurahan", ""); 
                    }} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger className="h-12 rounded-xl bg-white border-slate-200 text-xs shadow-sm font-bold">
                          <SelectValue placeholder={loadingLocs ? "..." : "PILIH KECAMATAN"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white border-slate-200 rounded-xl shadow-2xl">
                        {kecamatans.map(k => (
                          <SelectItem key={k.id} value={k.id} className="text-xs focus:bg-blue-50 font-semibold py-2 cursor-pointer">{k.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[9px] font-medium text-red-500 ml-1" />
                  </FormItem>
                )}
              />

              {/* 7. Kelurahan/Desa */}
              <FormField
                control={form.control}
                name="kelurahan"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] ml-1">Kelurahan/Desa</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""} disabled={!selectedKecId}>
                      <FormControl>
                        <SelectTrigger className="h-12 rounded-xl bg-white border-slate-200 text-xs shadow-sm font-bold disabled:bg-slate-50 disabled:border-slate-100">
                          <SelectValue placeholder="PILIH KELURAHAN/DESA" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white border-slate-200 rounded-xl shadow-2xl">
                        {filteredKelurahans.map(k => (
                          <SelectItem key={k.id} value={k.id} className="text-xs focus:bg-blue-50 font-semibold py-2 cursor-pointer">{k.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[9px] font-medium text-red-500 ml-1" />
                  </FormItem>
                )}
              />

              {/* 8. Keterangan */}
              <FormField
                control={form.control}
                name="keterangan"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] ml-1">Keterangan</FormLabel>
                    <FormControl>
                      <Input placeholder="CONTOH: SIMPAN / RUSAK / PINJAM" {...field} className="h-12 rounded-xl bg-white border-slate-200 text-xs font-bold shadow-sm uppercase px-4" />
                    </FormControl>
                    <FormMessage className="text-[9px] font-medium text-red-500 ml-1" />
                  </FormItem>
                )}
              />

              {/* 9. Rak, Shaft, Boks (Symmetrical 3-Column side-by-side Layout) */}
              <div className="grid grid-cols-3 gap-4 pt-1 pointer-events-auto">
                <FormField
                  control={form.control}
                  name="rak"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] text-center block">Rak</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="1" className="h-12 rounded-xl bg-white border-slate-200 text-xs uppercase font-black text-center focus:ring-4 focus:ring-blue-50 transition-all shadow-sm" />
                      </FormControl>
                      <FormMessage className="text-[9px] font-medium text-red-500 text-center" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="shaft"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] text-center block">Shaft</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="1" className="h-12 rounded-xl bg-white border-slate-200 text-xs uppercase font-black text-center focus:ring-4 focus:ring-blue-50 transition-all shadow-sm" />
                      </FormControl>
                      <FormMessage className="text-[9px] font-medium text-red-500 text-center" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="boks"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[10px] font-bold uppercase text-slate-400 tracking-[0.2em] text-center block">Boks</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="1" className="h-12 rounded-xl bg-white border-slate-200 text-xs uppercase font-black text-center focus:ring-4 focus:ring-blue-50 transition-all shadow-sm" />
                      </FormControl>
                      <FormMessage className="text-[9px] font-medium text-red-500 text-center" />
                    </FormItem>
                  )}
                />
              </div>

            </div>

          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <Button type="submit" className="w-full sm:w-auto bg-[#1e3a8a] hover:bg-[#1e40af] px-16 rounded-xl text-xs font-black uppercase tracking-[0.2em] text-white transition-all h-14 shadow-xl shadow-blue-900/10 active:scale-95 leading-none">
            Simpan Registrasi Berkas
          </Button>
        </div>
      </form>
    </Form>
  );
}

function CardSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-100 rounded-[32px] p-6 lg:p-10 shadow-sm ring-1 ring-slate-50">
      <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.3em] mb-10 inline-block border-b-2 border-blue-600 pb-2">{title}</h3>
      <div>
        {children}
      </div>
    </div>
  );
}
