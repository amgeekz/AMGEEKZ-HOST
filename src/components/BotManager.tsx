import React, { useState } from 'react';
import { Play, Square, RefreshCw, Terminal, CheckCircle2, AlertTriangle, Cpu, HelpCircle } from 'lucide-react';

interface BotManagerProps {
  bot: any;
  sizeInfo: { sizeMb: number; isHeavy: boolean };
  logs: any[];
  onStart: (method: 'qr' | 'pairing', phoneNumber?: string) => Promise<void>;
  onStop: () => Promise<void>;
  onRefreshStatus: () => void;
  subPackage?: string;
  analytics?: any[];
}

export default function BotManager({ bot, sizeInfo, logs, onStart, onStop, onRefreshStatus, subPackage = 'basic', analytics = [] }: BotManagerProps) {
  const [actionLoading, setActionLoading] = useState(false);
  const [connectionMethod, setConnectionMethod] = useState<'qr' | 'pairing'>('qr');
  const [phoneInput, setPhoneInput] = useState<string>('');

  // Calculate today's hit statistics
  const dateStr = new Date().toISOString().split('T')[0];
  const todayRecord = analytics.find((a: any) => a.date === dateStr);
  const outgoingToday = todayRecord ? todayRecord.messagesSent : 0;
  
  let hitLimit = 100;
  if (subPackage.toLowerCase() === 'premium') hitLimit = 1000;
  if (subPackage.toLowerCase() === 'plus') hitLimit = 10000;

  const progressPercent = Math.min(100, Math.round((outgoingToday / hitLimit) * 100));

  const triggerStart = async () => {
    if (connectionMethod === 'pairing' && !phoneInput.trim()) {
      alert("Masukkan nomor WhatsApp terlebih dahulu untuk metode pairing!");
      return;
    }
    setActionLoading(true);
    try {
      await onStart(connectionMethod, phoneInput);
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
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/35 flex items-center justify-center">
              <RefreshCw className="w-9 h-9 text-amber-500 animate-spin" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#0A0A0B] border border-slate-800/50 flex items-center justify-center">
              <Square className="w-8 h-8 text-slate-500" />
            </div>
          )}

          <div className="text-center space-y-1">
            <h4 className="text-sm font-semibold text-slate-200">
              {bot?.status === 'connected' ? 'Bot WhatsApp Aktif' : bot?.status === 'pairing' ? 'Menghubungkan Perangkat...' : 'Bot Berhenti'}
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

        {/* Pairing Code Displays */}
        {bot?.status === 'pairing' && bot?.pairingCode && (
          <div className="bg-[#0A0A0B] border border-slate-800/50 rounded-xl p-5 flex flex-col items-center space-y-4">
            <span className="text-[10px] text-emerald-400 font-bold tracking-wider uppercase">Masukkan Kode Pairing di HP Anda</span>
            
            <div className="flex items-center gap-2">
              {bot.pairingCode.split('-').map((chunk: string, index: number) => (
                <React.Fragment key={index}>
                  <div className="flex gap-1.5">
                    {chunk.split('').map((char: string, charIdx: number) => (
                      <span
                        key={charIdx}
                        className="w-8 h-10 border border-slate-700 bg-[#111114] rounded-lg flex items-center justify-center font-mono font-bold text-lg text-emerald-450 tracking-tight"
                      >
                        {char}
                      </span>
                    ))}
                  </div>
                  {index === 0 && <span className="text-slate-500 font-bold">-</span>}
                </React.Fragment>
              ))}
            </div>

            <div className="text-xs text-slate-400 space-y-2 bg-[#111114] p-3 rounded-xl border border-slate-800/60 leading-relaxed text-center w-full">
              <p className="font-semibold text-slate-350">📱 Cara Tautkan:</p>
              <ol className="list-decimal list-inside text-[10.5px] text-left space-y-1 pl-1">
                <li>Buka WhatsApp di HP Anda</li>
                <li>Buka <b>Perangkat Tertaut</b></li>
                <li>Tap <b>Tautkan Perangkat</b></li>
                <li>Tap <b>Tautkan dengan nomor telepon saja</b> di bagian bawah screen HP</li>
                <li>Masukkan kode di atas</li>
              </ol>
            </div>
          </div>
        )}

        {/* Connection Setup Methods Form - only show when offline */}
        {bot?.status !== 'connected' && bot?.status !== 'pairing' && (
          <div className="space-y-4 border border-slate-800/60 rounded-xl p-4 bg-[#0A0A0B]/40">
            <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block font-semibold">
              Pilih Metode Koneksi
            </span>
            <div className="grid grid-cols-2 gap-2 bg-[#0A0A0B] p-1 rounded-lg border border-slate-800/50">
              <button
                type="button"
                onClick={() => setConnectionMethod('qr')}
                className={`py-1.5 px-3 text-[11px] font-semibold rounded-md transition cursor-pointer ${
                  connectionMethod === 'qr'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    : 'text-slate-450 hover:text-slate-200'
                }`}
              >
                Scan QR Code
              </button>
              <button
                type="button"
                onClick={() => setConnectionMethod('pairing')}
                className={`py-1.5 px-3 text-[11px] font-semibold rounded-md transition cursor-pointer ${
                  connectionMethod === 'pairing'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    : 'text-slate-450 hover:text-slate-200'
                }`}
              >
                Kode Pairing
              </button>
            </div>

            {connectionMethod === 'pairing' && (
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 block font-mono">Nomor WhatsApp Bot</label>
                <input
                  type="text"
                  placeholder="cth: 628123456789"
                  required
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full bg-[#0A0A0B] border border-slate-805 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/70 font-mono"
                />
                <span className="text-[9px] text-slate-500 block leading-tight">
                  Gunakan kode negara (contoh: 62 untuk Indonesia). Tanpa tanda plus (+) atau spasi.
                </span>
              </div>
            )}
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

        {/* Batas Kuota Hit Harian Indicator */}
        <div className="bg-[#0A0A0B] p-4 rounded-xl border border-slate-800/50 text-slate-400 text-xs mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <Cpu className="text-brand-500 w-4 h-4" />
            <span className="font-semibold text-slate-300 block font-mono uppercase tracking-wider text-[10px]">Kuota Hit Harian ({subPackage.toUpperCase()})</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-mono">
              <span>Terpakai hari ini:</span>
              <span className="font-bold text-white">{outgoingToday} / {hitLimit} Hit</span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-350 ${
                  progressPercent >= 90 ? 'bg-red-500' : progressPercent >= 75 ? 'bg-amber-500' : 'bg-brand-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>

            <span className="text-[9.5px] text-slate-500 block leading-tight pt-1">
              {subPackage.toLowerCase() === 'basic' && 'Paket BASIC dibatasi 100 hit/hari. Upgrade ke PREMIUM untuk 1.000 hit/hari.'}
              {subPackage.toLowerCase() === 'premium' && 'Paket PREMIUM dibatasi 1.000 hit/hari. Upgrade ke PLUS untuk 10.000 hit/hari.'}
              {subPackage.toLowerCase() === 'plus' && 'Paket PLUS memiliki kuota besar 10.000 hit/hari untuk performa operasional optimal.'}
            </span>
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
          <span className="px-2 py-0.5 bg-[#0A0A0B] border border-slate-800/50 text-slate-400 font-mono text-[9px] rounded uppercase tracking-wider">{import.meta.env.VITE_BRAND_NAME || 'GeekzCS'} Live Logs</span>
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
