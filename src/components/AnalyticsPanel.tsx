import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';
import { TrendingUp, MessageSquare, ArrowUpRight, Clock, ShieldAlert, Users } from 'lucide-react';

interface AnalyticsPanelProps {
  analytics: any[];
  subPackage: string;
}

export default function AnalyticsPanel({ analytics, subPackage }: AnalyticsPanelProps) {
  const tier = subPackage?.toLowerCase() || 'basic';
  const hasAccess = tier === 'plus';

  if (!hasAccess) {
    return (
      <div className="bg-[#111114] border border-slate-800/50 rounded-2xl p-8 text-center max-w-xl mx-auto space-y-4">
        <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/30 rounded-full flex items-center justify-center mx-auto animate-pulse">
          <ShieldAlert className="text-blue-400 w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-xl font-display font-semibold text-white">Advanced Analytics Dashboard</h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            Periksa grafik interaksi pesan masuk, efisiensi balasan otomatis, dan peningkatan jumlah kontak pelanggan secara detail. Akses istimewa ini eksklusif bagi pemegang lisensi paket <span className="text-blue-400 font-bold">PLUS</span>.
          </p>
        </div>
        <div className="pt-2">
          <span className="inline-block px-3 py-1 bg-blue-500/15 text-blue-300 font-semibold text-[10px] uppercase rounded-full border border-blue-500/30 tracking-wider">
            Plus Package Exclusive
          </span>
        </div>
      </div>
    );
  }

  // Calculate generic dashboard counters
  const totalReceived = analytics.reduce((prev, cur) => prev + cur.messagesReceived, 0);
  const totalSent = analytics.reduce((prev, cur) => prev + cur.messagesSent, 0);
  const uniqueChatsMax = Math.max(...analytics.map(a => a.uniqueChats), 0);
  const avgResponseTime = parseFloat((analytics.reduce((prev, cur) => prev + cur.avgResponseTime, 0) / (analytics.length || 1)).toFixed(1));

  return (
    <div className="space-y-6" id="analytics-module">
      {/* Analytics Counters Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-[#111114] border border-slate-800/50 rounded-2xl p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-400 text-[10px] tracking-wider font-mono uppercase block">Total Pesan Masuk</span>
            <span className="text-2xl font-bold font-display text-white">{totalReceived}</span>
            <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-0.5">
              <ArrowUpRight className="w-3.5 h-3.5" /> +14.2% minggu ini
            </span>
          </div>
          <div className="w-12 h-12 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center justify-center">
            <MessageSquare className="text-brand-500 w-5 h-5" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-[#111114] border border-slate-800/50 rounded-2xl p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-400 text-[10px] tracking-wider font-mono uppercase block">Total Balasan Terkirim</span>
            <span className="text-2xl font-bold font-display text-white">{totalSent}</span>
            <span className="text-brand-500 text-[10px] font-semibold flex items-center gap-0.5">
              <TrendingUp className="w-3.5 h-3.5" /> +20.1% efisiensi
            </span>
          </div>
          <div className="w-12 h-12 bg-brand-500/10 border border-brand-500/30 rounded-xl flex items-center justify-center">
            <TrendingUp className="text-brand-500 w-5 h-5" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-[#111114] border border-slate-800/50 rounded-2xl p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-400 text-[10px] tracking-wider font-mono uppercase block">Unique Chat Thread</span>
            <span className="text-2xl font-bold font-display text-white">{uniqueChatsMax}</span>
            <span className="text-slate-400 text-[10px]">Kontak unik bersinkronisasi</span>
          </div>
          <div className="w-12 h-12 bg-[#0A0A0B] border border-slate-800/50 rounded-xl flex items-center justify-center">
            <Users className="text-slate-300 w-5 h-5" />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-[#111114] border border-slate-800/50 rounded-2xl p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-400 text-[10px] tracking-wider font-mono uppercase block">Rata-rata Respon Bot</span>
            <span className="text-2xl font-bold font-display text-white">{avgResponseTime}s</span>
            <span className="text-emerald-400 text-[10px] font-semibold">Sangat responsif (Real-time)</span>
          </div>
          <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-center">
            <Clock className="text-blue-400 w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Messages Volume */}
        <div className="bg-[#111114] border border-slate-800/50 rounded-2xl p-5 space-y-4">
          <div className="space-y-0.5">
            <h4 className="font-semibold text-slate-200 text-sm">Volume Trafik Pesan Masuk & Keluar</h4>
            <p className="text-xs text-slate-500 font-mono">DIPROSES SECARA REAL-TIME OLEH SOCKET BAILEYS</p>
          </div>
          
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRecv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                <YAxis stroke="#64748b" style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                <Tooltip contentStyle={{ backgroundColor: '#111114', borderColor: '#1e293b', borderRadius: '12px', fontSize: '11px' }} />
                <Legend style={{ fontSize: '11px' }} />
                <Area name="Masuk (Received)" type="monotone" dataKey="messagesReceived" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorRecv)" />
                <Area name="Balasan (Auto-Sent)" type="monotone" dataKey="messagesSent" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorSent)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Reply Delays index */}
        <div className="bg-[#111114] border border-slate-800/50 rounded-2xl p-5 space-y-4">
          <div className="space-y-0.5">
            <h4 className="font-semibold text-slate-200 text-sm">Responsivitas Mesin Auto-Reply (Detik)</h4>
            <p className="text-xs text-slate-500 font-mono">ESTIMASI DETIK HINGGA CHAT BERHASIL DISPATCH</p>
          </div>

          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                <YAxis stroke="#64748b" style={{ fontSize: '10px', fontFamily: 'monospace' }} />
                <Tooltip contentStyle={{ backgroundColor: '#111114', borderColor: '#1e293b', borderRadius: '12px', fontSize: '11px' }} />
                <Legend style={{ fontSize: '11px' }} />
                <Bar name="Response Time (s)" dataKey="avgResponseTime" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
