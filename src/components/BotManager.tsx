import React, { useState } from 'react';
import { Play, Square, RefreshCw, Terminal, CheckCircle2, AlertTriangle, Cpu, HelpCircle } from 'lucide-react';

interface BotManagerProps {
  bot: any;
  sizeInfo: { sizeMb: number; isHeavy: boolean };
  logs: any[];
  onStart: () => Promise<void>;
  onStop: () => Promise<void>;
  onRefreshStatus: () => void;
}

export default function BotManager({ bot, sizeInfo, logs, onStart, onStop, onRefreshStatus }: BotManagerProps) {
  const [actionLoading, setActionLoading] = useState(false);

  const triggerStart = async () => {
    setActionLoading(true);
    try {
      await onStart();
    } catch (err) {
      alert("Gagal menyalakan bot.");
    } finally {
      setActionLoading(false);
    }
  };

  const triggerStop = async () => {
    setActionLoading(true);
    try {
      await onStop();
    } catch (err) {
      alert("Gagal menghentikan bot.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="bot-manager-module">
      {/* Bot Connection Control Block */}
      <div className="lg:col-span-1 bg-[#111114] border border-slate-800/50 rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800/50 pb-3">
          <div className="space-y-0.5">
            <h3 className="font-display font-bold text-lg text-white">Status Koneksi</h3>
            <p className="text-slate-500 text-[10px] uppercase font-mono tracking-wider">Device ID: {bot?.botId || 'Offline'}</p>
          </div>
          <button
            onClick={onRefreshStatus}
            title="Sinkronisasi Status"
            className="p-1 px-2.5 bg-slate-800 hover:bg-slate-700 hover:text-white rounded text-xs text-slate-400 transition flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Sync
          </button>
        </div>

        {/* Current State Gauge */}
        <div className="flex flex-col items-center py-4 space-y-3">
          {bot?.status === 'connected' ? (
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/35 flex items-center justify-center animate-pulse">
              <CheckCircle2 className="w-9 h-9 text-brand-500" />
            </div>
          ) : bot?.status === 'pairing' ? (
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/35 flex items-center justify-center animate-spin">
              <RefreshCw className="w-9 h-9 text-amber-500" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#0A0A0B] border border-slate-800/50 flex items-center justify-center">
              <Square className="w-8 h-8 text-slate-500" />
            </div>
          )}

          <div className="text-center space-y-1">
            <h4 className="text-sm font-semibold text-slate-200">
              {bot?.status === 'connected' ? 'Bot WhatsApp Aktif' : bot?.status === 'pairing' ? 'Menunggu Scan QR' : 'Bot Berhenti'}
            </h4>
            <div className="flex items-center justify-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                bot?.status === 'connected' ? 'bg-emerald-500' : bot?.status === 'pairing' ? 'bg-yellow-500 animate-pulse' : 'bg-slate-500'
              }`}></span>
              <span className="text-[11px] text-slate-400 uppercase font-mono tracking-wider">
                {bot?.status || 'No Session'}
              </span>
            </div>
            {bot?.phoneNumber && (
              <p className="text-xs text-emerald-400 font-mono font-medium">{bot.phoneNumber}</p>
            )}
          </div>
        </div>

        <hr className="border-slate-800/50" />

        {/* Multi-Device Authentication Scanner Box */}
        {bot?.status === 'pairing' && bot?.qrCode && (
          <div className="bg-[#0A0A0B] border border-slate-800/50 rounded-xl p-4 flex flex-col items-center space-y-3">
            <span className="text-[10px] text-amber-400 font-bold tracking-wider uppercase">Scan QR Code dengan WA HP Anda</span>
            <div className="bg-white p-2.5 rounded-lg border border-slate-200">
              <img
                src={bot.qrCode}
                alt="WA pairing scan"
                referrerPolicy="no-referrer"
                className="w-40 h-40"
              />
            </div>
            <p className="text-[10px] text-slate-400 text-center leading-relaxed">
              Buka aplikasi WhatsApp &gt; Perangkat Tertaut / Linked Devices &gt; Tautkan Perangkat. Layanan akan otomatis aktif sesaat setelah scan sukses.
            </p>
          </div>
        )}

        {/* Action Controls */}
        <div className="space-y-3">
          {bot?.status !== 'connected' && bot?.status !== 'pairing' ? (
            <button
              onClick={triggerStart}
              disabled={actionLoading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-slate-950 font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition duration-200 cursor-pointer"
            >
              {actionLoading ? (
                <RefreshCw className="w-4.5 h-4.5 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-slate-950" />
              )}
              Nyalakan WA Bot (Baileys)
            </button>
          ) : (
            <button
              onClick={triggerStop}
              disabled={actionLoading}
              className="w-full bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 border border-slate-700 text-slate-200 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition duration-200 cursor-pointer"
            >
              {actionLoading ? (
                <RefreshCw className="w-4.5 h-4.5 animate-spin" />
              ) : (
                <Square className="w-4 h-4 fill-slate-200" />
              )}
              Hentikan Koneksi
            </button>
          )}
        </div>

        {/* Session Folder Disk Space Meta Indicator */}
        <div className="bg-[#0A0A0B] p-4 rounded-xl border border-slate-800/50 text-slate-400 text-xs mt-3 flex items-start gap-2">
          <Cpu className="text-slate-500 w-4 h-4 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-slate-300 block">Status Memori Sesi Lokal</span>
            <p className="text-[11px]">Kapasitas file autentikasi Baileys saat ini:</p>
            <span className="font-mono text-emerald-400 text-[11px] font-bold block">{sizeInfo?.sizeMb || 0} MB</span>
            {sizeInfo?.isHeavy && (
              <span className="text-amber-500 font-semibold text-[10px] flex items-center gap-0.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Kapasitas &gt; 100MB (Wajib Bersih)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Terminal logs block */}
      <div className="lg:col-span-2 bg-[#111114] border border-slate-800/50 rounded-2xl flex flex-col justify-between overflow-hidden">
        <div className="bg-[#111114]/50 px-4 py-3 border-b border-slate-800/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="text-brand-500 w-4.5 h-4.5" />
            <span className="text-xs font-mono font-medium tracking-wide text-slate-300">Terminal Log Aktivitas Sistem (Baileys Engine)</span>
          </div>
          <span className="px-2 py-0.5 bg-[#0A0A0B] border border-slate-800/50 text-slate-400 font-mono text-[9px] rounded uppercase tracking-wider">HighHost Live Logs</span>
        </div>

        <div className="p-4 flex-1 h-[320px] overflow-y-auto font-mono text-xs space-y-1.5 text-slate-300 bg-[#0A0A0B]">
          {logs && logs.length > 0 ? (
            logs.map((log: any, idx) => {
              const dateObj = new Date(log.timestamp);
              const timeString = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}:${String(dateObj.getSeconds()).padStart(2, '0')}`;
              
              let typeClass = 'text-blue-400';
              if (log.type === 'success') typeClass = 'text-emerald-400';
              if (log.type === 'warning') typeClass = 'text-amber-400';
              if (log.type === 'error') typeClass = 'text-rose-500 font-bold';

              return (
                <div key={log.id || idx} className="flex items-start gap-2 hover:bg-slate-900/40 p-0.5 rounded leading-relaxed border-b border-slate-900/20">
                  <span className="text-slate-600 text-[10px] select-none shrink-0">{timeString}</span>
                  <span className={`text-[10px] uppercase shrink-0 font-bold h-fit px-1 bg-slate-900 rounded ${typeClass}`}>
                    [{log.type}]
                  </span>
                  <span className="text-slate-200 leading-normal">{log.activity}</span>
                </div>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 font-sans space-y-2 py-10">
              <Terminal className="w-12 h-12 stroke-1 opacity-20" />
              <p className="text-xs">No active terminal logs recorded yet for this session.</p>
              <p className="text-[10px] opacity-60">Log akan tampil secara real-time saat Anda meremote bot Anda.</p>
            </div>
          )}
        </div>

        <div className="bg-[#111114] border-t border-slate-800/50 p-2.5 px-4 text-[10px] text-slate-500 flex items-center justify-between font-mono">
          <span>Storage path: {bot?.sessionPath || './sessions/'}</span>
          <span className="text-[9px] text-slate-400">WebSocket auto-stream: ACTIVE</span>
        </div>
      </div>
    </div>
  );
}
