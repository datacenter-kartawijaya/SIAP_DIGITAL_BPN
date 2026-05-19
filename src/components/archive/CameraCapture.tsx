import * as React from "react";
import { Camera, Image as ImageIcon, RotateCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  onClear: () => void;
  value?: string;
}

export function CameraCapture({ onCapture, onClear, value }: CameraCaptureProps) {
  const [isCameraActive, setIsCameraActive] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = React.useState<MediaStream | null>(null);
  const [isMirrored, setIsMirrored] = React.useState(false);

  React.useEffect(() => {
    if (isCameraActive && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.error("Video play failed", e));
    }
  }, [isCameraActive, stream]);

  const startCamera = async () => {
    try {
      setIsCameraActive(true); // Render video element first
      
      const constraints: MediaStreamConstraints = { 
        video: { facingMode: { ideal: "environment" } },
        audio: false 
      };
      
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        console.warn("Facing mode ideal failed, fallback to generic video", e);
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      setStream(mediaStream);
      
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        setIsMirrored(settings.facingMode !== 'environment');
      }
    } catch (err) {
      console.error("Camera access error:", err);
      alert("Gagal mengakses kamera. Pastikan izin kamera telah diberikan.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        if (isMirrored) {
          context.translate(canvas.width, 0);
          context.scale(-1, 1);
        }
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Reset transform
        context.setTransform(1, 0, 0, 1, 0, 0);
        
        // Compress and convert to base64
        const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
        onCapture(dataUrl);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onCapture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {value ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative rounded-2xl overflow-hidden aspect-video bg-black border-4 border-white shadow-xl shadow-slate-200"
          >
            <img src={value} alt="Borrower Proof" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center space-x-3">
               <Button 
                variant="destructive" 
                size="sm" 
                className="rounded-full h-10 px-4 font-black uppercase text-[10px] tracking-widest"
                onClick={onClear}
               >
                 <X size={14} className="mr-2" /> Hapus Foto
               </Button>
               <label className="bg-white text-slate-900 hover:bg-slate-100 h-10 px-4 rounded-full flex items-center justify-center font-black uppercase text-[10px] tracking-widest cursor-pointer transition-colors shadow-lg">
                 <RotateCw size={14} className="mr-2" /> Ganti Foto
                 <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
               </label>
            </div>
          </motion.div>
        ) : isCameraActive ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative rounded-2xl overflow-hidden aspect-video bg-black"
          >
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              className={cn("w-full h-full object-cover", isMirrored && "mirror")}
            />
            <div className="absolute bottom-6 inset-x-0 flex justify-center space-x-4">
               <Button 
                onClick={capturePhoto} 
                className="bg-white hover:bg-slate-100 text-blue-600 rounded-full h-14 w-14 flex items-center justify-center p-0 shadow-2xl"
               >
                  <div className="w-10 h-10 border-2 border-blue-600 rounded-full flex items-center justify-center">
                    <div className="w-8 h-8 bg-blue-600 rounded-full"></div>
                  </div>
               </Button>
               <Button 
                variant="destructive" 
                size="icon" 
                onClick={stopCamera}
                className="rounded-full h-14 w-14 shadow-2xl"
               >
                  <X size={20} />
               </Button>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <button 
              type="button"
              onClick={startCamera}
              className="flex flex-col items-center justify-center space-y-4 p-8 rounded-3xl border-2 border-dashed border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all group"
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Camera size={28} />
              </div>
              <div className="text-center">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Gunakan Kamera</p>
                 <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">Ambil Foto Langsung</p>
              </div>
            </button>
            <label className="flex flex-col items-center justify-center space-y-4 p-8 rounded-3xl border-2 border-dashed border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all group cursor-pointer">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ImageIcon size={28} />
              </div>
              <div className="text-center">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">Upload Berkas</p>
                 <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">Pilih Dari Galeri</p>
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
            </label>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
