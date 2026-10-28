import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { SUPPORTED_TIMEZONES } from '../services/timeSyncService';
import {
  Clock,
  Globe2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  WifiOff,
  Sliders,
  X,
  Info,
} from 'lucide-react';

interface TimeSyncModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
}

export const TimeSyncModal: React.FC<TimeSyncModalProps> = ({ open, isOpen, onClose }) => {
  const isVisible = open ?? isOpen ?? false;
  const {
    currentTime,
    timeZone,
    timeFormat,
    syncStatus,
    isOnline,
    lastSyncedAt,
    offsetMs,
    syncTimeNow,
    setTimeZone,
    setTimeFormat,
    formatDate,
    formatTime,
  } = useStore();

  const [isSyncing, setIsSyncing] = useState(false);

  if (!isVisible) return null;

  const handleManualSync = async () => {
    setIsSyncing(true);
    await syncTimeNow();
    setIsSyncing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden text-slate-800">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0c4a26] text-white flex items-center justify-center shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Automatic Time Synchronization</h2>
              <p className="text-[11px] text-slate-500">
                Network-synchronized authoritative timestamp engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Live Clock Hero Box */}
          <div className="bg-gradient-to-br from-[#0c4a26] via-[#115e32] to-[#0a381d] text-white rounded-2xl p-5 shadow-inner text-center space-y-1 relative overflow-hidden">
            <div className="flex items-center justify-center gap-1.5 text-emerald-200 text-[11px] font-semibold">
              <Globe2 className="w-3.5 h-3.5" />
              <span>{timeZone} (CAT, UTC+2)</span>
            </div>

            {/* Live Ticking Time */}
            <div className="text-4xl font-extrabold tracking-tight font-mono tabular-nums py-1 drop-shadow-xs">
              {formatTime(currentTime, timeFormat, true)}
            </div>

            {/* Formatted Date */}
            <p className="text-emerald-100 text-xs font-medium">
              {formatDate(currentTime, { weekday: 'long', includeYear: true })}
            </p>

            {/* Sync Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full text-[11px] font-bold bg-white/15 backdrop-blur-xs border border-white/20">
              {syncStatus === 'synced' ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Network Synced (±{Math.abs(offsetMs)}ms offset)</span>
                </>
              ) : syncStatus === 'syncing' || isSyncing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-blue-300 animate-spin" />
                  <span>Synchronizing with Time Servers...</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
                  <span>Offline • Local Device Clock Fallback</span>
                </>
              )}
            </div>
          </div>

          {/* Sync Diagnostics & Connectivity */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-1.5 text-slate-500 font-medium mb-1 text-[11px]">
                {isOnline ? (
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                )}
                <span>Network Status</span>
              </div>
              <p className="font-bold text-slate-800 text-xs">
                {isOnline ? 'Connected (Online)' : 'Disconnected (Offline)'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {isOnline ? 'HTTP Date / NTP Active' : 'Fallback active'}
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-1.5 text-slate-500 font-medium mb-1 text-[11px]">
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                <span>Last Synchronized</span>
              </div>
              <p className="font-bold text-slate-800 text-xs truncate">
                {lastSyncedAt ? formatTime(lastSyncedAt, timeFormat, true) : 'Pending sync'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Periodic auto-sync (3m)</p>
            </div>
          </div>

          {/* Configuration Form */}
          <div className="space-y-3 pt-1 border-t border-slate-100">
            {/* Time Zone Selector */}
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Business Time Zone</span>
                <span className="text-[10px] font-normal text-slate-400">Default: Africa/Kigali</span>
              </label>
              <select
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-medium focus:outline-none focus:border-[#0c4a26]"
              >
                {SUPPORTED_TIMEZONES.map((tz) => (
                  <option key={tz.id} value={tz.id}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Time Format (12h vs 24h) */}
            <div>
              <label className="block font-bold text-slate-700 mb-1">Display Time Format</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTimeFormat('24h')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    timeFormat === '24h'
                      ? 'bg-[#0c4a26] text-white border-[#0c4a26] shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>24-Hour (14:30)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFormat('12h')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    timeFormat === '12h'
                      ? 'bg-[#0c4a26] text-white border-[#0c4a26] shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>12-Hour (02:30 PM)</span>
                </button>
              </div>
            </div>

            {/* Offline Safeguard Guarantee Notice */}
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-start gap-2.5 text-[11px] text-amber-900">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5 leading-relaxed">
                <span className="font-bold">Offline & Discrepancy Protection:</span>
                <p className="text-amber-800 text-[10.5px]">
                  All modules (POS, sales ledger, stock movements, shift cash registers, and immutable audit logs) use this synchronized clock to ensure zero discrepancy across registers. If internet connectivity drops, transactions anchor smoothly to calibrated device time and automatically re-align upon restoration.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <button
            onClick={handleManualSync}
            disabled={isSyncing || !isOnline}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#0c4a26] ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync with Server Now'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#0c4a26] text-white font-bold text-xs rounded-xl hover:bg-[#093a1d] shadow-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
