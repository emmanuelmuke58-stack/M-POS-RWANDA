import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { playScanBeep } from '../utils/audioFeedback';
import {
  Camera,
  X,
  Flashlight,
  Barcode,
  CheckCircle2,
  RefreshCw,
  Zap,
} from 'lucide-react';

interface CameraBarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanProduct: (productId: string) => void;
}

export const CameraBarcodeScannerModal: React.FC<CameraBarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScanProduct,
}) => {
  const { products, notify } = useStore();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [lastScannedName, setLastScannedName] = useState<string | null>(null);
  const [continuousMode, setContinuousMode] = useState(true);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera API not accessible in this browser view. Use the quick test barcodes below.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
        setCameraError(null);
      }
    } catch {
      setCameraError('Camera access unavailable or denied. You can tap any product barcode below to test instant scanning.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  if (!isOpen) return null;

  const handleBarcodeSelect = (prod: (typeof products)[0]) => {
    playScanBeep();
    setLastScannedName(`${prod.name} (${prod.sellingPrice.toLocaleString()} RWF)`);
    onScanProduct(prod.id);
    notify('success', 'Barcode Scanned', `Added ${prod.name} to cart.`);

    if (!continuousMode) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full overflow-hidden text-white shadow-2xl flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>M-POS Camera Scanner</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </h2>
              <p className="text-[10px] text-slate-400">Aim camera at grocery barcode</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewfinder Box */}
        <div className="relative bg-black flex-1 min-h-[220px] max-h-[260px] flex items-center justify-center overflow-hidden">
          {cameraActive ? (
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
            />
          ) : (
            <div className="text-center p-6 space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
                <Barcode className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-xs text-slate-300 font-medium max-w-xs">
                {cameraError || 'M-POS Laser Viewfinder Active'}
              </p>
              <p className="text-[11px] text-slate-500">
                Select an item barcode below for instant beep & scan verification.
              </p>
            </div>
          )}

          {/* Laser Line Overlay Animation */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
            {/* Viewfinder Target Bracket */}
            <div className="w-56 h-36 border-2 border-emerald-400/60 rounded-2xl relative shadow-lg">
              {/* Corner Accents */}
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-400 rounded-tl"></div>
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-400 rounded-tr"></div>
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-400 rounded-bl"></div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-400 rounded-br"></div>
              {/* Red Laser Sweep */}
              <div className="w-full h-0.5 bg-red-500 shadow-[0_0_12px_#ef4444] animate-bounce my-auto mt-16"></div>
            </div>
          </div>

          {/* Flashlight toggle simulation */}
          <button
            onClick={() => setTorchOn(!torchOn)}
            className={`absolute top-3 right-3 p-2 rounded-xl transition-all cursor-pointer ${
              torchOn ? 'bg-amber-400 text-slate-900 shadow-md' : 'bg-black/50 text-white hover:bg-black/70'
            }`}
            title="Toggle Flashlight"
          >
            <Flashlight className="w-4 h-4" />
          </button>
        </div>

        {/* Scan Status Toast in Modal */}
        {lastScannedName && (
          <div className="bg-emerald-950/80 border-y border-emerald-700/60 px-4 py-2 flex items-center gap-2 text-xs text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">
              Scanned: <strong className="text-white">{lastScannedName}</strong>
            </span>
          </div>
        )}

        {/* Fast Tap-to-Scan Barcode Catalog */}
        <div className="p-4 bg-slate-900/90 space-y-2.5 overflow-y-auto max-h-60 custom-scrollbar">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
              Tap Barcode to Scan:
            </span>
            <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={continuousMode}
                onChange={(e) => setContinuousMode(e.target.checked)}
                className="rounded accent-emerald-500"
              />
              <span>Continuous Scan</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {products.slice(0, 8).map((p) => (
              <button
                key={p.id}
                onClick={() => handleBarcodeSelect(p)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-emerald-900/50 border border-slate-700 hover:border-emerald-500/60 text-left transition-all flex flex-col justify-between cursor-pointer group active:scale-97"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                    <span className="font-mono text-emerald-400 font-bold">{p.barcode}</span>
                    <span className="text-slate-500">{p.unit}</span>
                  </div>
                  <p className="text-xs font-semibold text-white truncate group-hover:text-emerald-200">
                    {p.name}
                  </p>
                </div>
                <div className="mt-1 flex items-center justify-between pt-1 border-t border-slate-700/50">
                  <span className="font-bold text-xs text-amber-300 tabular-nums">
                    {p.sellingPrice.toLocaleString()} RWF
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.2 rounded">
                    + Scan
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Audio & haptic beep enabled</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
