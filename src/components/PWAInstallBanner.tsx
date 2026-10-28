import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Smartphone, Download, X, Share, PlusSquare, CheckCircle2 } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const { isInstalled, canInstall, isIOS, installPWA } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled || dismissed) return null;

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
    } else {
      const ok = await installPWA();
      if (!ok) {
        setShowIOSGuide(true);
      }
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-emerald-950 via-[#0c4a26] to-[#15803d] text-white px-3.5 py-2 sm:px-5 flex items-center justify-between gap-3 text-xs shadow-md border-b border-emerald-900/60 shrink-0 z-30">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center shrink-0 shadow-2xs">
            <Smartphone className="w-4 h-4 text-emerald-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-white text-xs truncate">Install Fresh & More M-POS</span>
              <span className="text-[10px] bg-emerald-400 text-emerald-950 font-black px-1.5 py-0.2 rounded uppercase">
                Standalone App
              </span>
            </div>
            <p className="text-[11px] text-emerald-200/90 truncate hidden sm:block">
              Fast offline retail register, camera barcode scanning & instant receipts on this device
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-[#0c4a26] hover:bg-emerald-50 text-xs font-bold shadow-xs transition-transform active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install M-POS</span>
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-lg text-emerald-200/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Dismiss install banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* iOS Safari Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 text-slate-800 space-y-4 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#0c4a26] text-white flex items-center justify-center font-bold">
                  <Smartphone className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Install M-POS on Mobile</h3>
                  <p className="text-[11px] text-slate-500">Run as full-screen native mobile register</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-xs">
                  1
                </span>
                <p className="text-slate-700">
                  Tap the <strong className="text-slate-900 font-semibold">Share</strong> button{' '}
                  <Share className="w-3.5 h-3.5 inline mx-0.5 text-blue-600" /> in your Safari / Chrome toolbar.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-xs">
                  2
                </span>
                <p className="text-slate-700">
                  Scroll down and tap <strong className="text-slate-900 font-semibold">Add to Home Screen</strong>{' '}
                  <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-slate-700" />.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-xs">
                  3
                </span>
                <p className="text-slate-700">
                  Tap <strong className="text-slate-900 font-semibold">Add</strong>. Launch from your home screen for instant camera scanning, offline sales & fast checkout!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 bg-[#0c4a26] text-white font-bold rounded-xl text-xs hover:bg-[#08361b] transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
