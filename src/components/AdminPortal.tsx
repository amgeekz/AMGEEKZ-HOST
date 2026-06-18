import React, { useState, useEffect } from 'react';
import { Shield, Users, CreditCard, DollarSign, Activity, AlertCircle, RefreshCw } from 'lucide-react';

interface AdminPortalProps {
  token: string;
}

export default function AdminPortal({ token }: AdminPortalProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [usersRes, paymentsRes, statsRes] = await Promise.all([
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/payments', { headers }),
        fetch('/api/admin/stats', { headers })
      ]);

      if (usersRes.ok && paymentsRes.ok && statsRes.ok) {
        const usersData = await usersRes.json();
        const paymentsData = await paymentsRes.json();
        const statsData = await statsRes.json();

        setUsers(usersData.users || []);
        setPayments(paymentsData.payments || []);
        setStats(statsData.stats || null);
      }
    } catch (err) {
      console.error("Error loaded data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [token]);

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const nextRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      const res = await fetch(`/api/admin/user/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: nextRole })
      });
      if (res.ok) {
        fetchAdminData();
      } else {
        alert("Gagal merubah status role.");
      }
    } catch (err) {
      alert("Error.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3 font-mono text-xs">
        <RefreshCw className="w-8 h-8 animate-spin text-brand-500" />
        <span>Authenticating and fetching Admin metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in" id="admin-module">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Shield className="text-brand-500 w-6 h-6 shrink-0" />
            Portal Admin HighHost
          </h2>
          <p className="text-xs text-slate-400">Panel pengawasan real-time, ledger pembayaran, dan peran pengguna SaaS.</p>
        </div>
        <button
          onClick={fetchAdminData}
          className="p-1.5 px-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-300 transition flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reload Stats
        </button>
      </div>

      {/* Admin metrics grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono text-slate-500 block">Total Pengguna</span>
              <span className="text-2xl font-bold font-display text-white">{stats.totalUsers || 0}</span>
              <span className="text-[10px] text-zinc-400 block">Terdaftar resmi</span>
            </div>
            <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-center">
              <Users className="text-blue-400 w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono text-slate-500 block">Total Pendapatan</span>
              <span className="text-2xl font-bold font-display text-brand-500">
                Rp {(stats.revenue || 0).toLocaleString('id-ID')}
              </span>
              <span className="text-[10px] text-zinc-400 block">Ledger lunas (PAID)</span>
            </div>
            <div className="w-10 h-10 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center justify-center">
              <DollarSign className="text-brand-500 w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono text-slate-500 block">Sesi Bot Menyalak</span>
              <span className="text-2xl font-bold font-display text-white">{stats.activeBots || 0}</span>
              <span className="text-[10px] text-emerald-400 block">Connected Baileys socket</span>
            </div>
            <div className="w-10 h-10 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center justify-center">
              <Activity className="text-yellow-400 w-5 h-5 animate-pulse" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
            <div className="space-y-1 flex-1">
              <span className="text-[10px] uppercase font-mono text-slate-500 block">SaaS Tiers Level</span>
              <div className="flex gap-2 text-[10px] font-mono justify-between text-slate-300 pt-1">
                <span>Tr: {stats.trialBots || 0}</span>
                <span>Pr: {stats.premiumBots || 0}</span>
                <span>Pl: {stats.plusBots || 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main split row users vs payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Users list */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <span className="font-semibold text-slate-200 text-sm block">Database Pengguna Platform</span>
          
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 text-[10px] font-mono tracking-wider uppercase">
                <tr>
                  <th className="px-4 py-3">Nama/Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {users && users.length > 0 ? (
                  users.map((item: any) => (
                    <tr key={item.userId} className="hover:bg-slate-950/40">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-white block">{item.name}</span>
                        <span className="text-[10px] text-slate-500 block font-mono">{item.email}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-1.5 py-0.5 rounded font-mono text-[9px] uppercase font-bold ${
                          item.role === 'admin' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {item.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleToggleRole(item.userId, item.role)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] rounded hover:text-white cursor-pointer"
                        >
                          Ubah ke {item.role === 'admin' ? 'User' : 'Admin'}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-slate-500">Tidak ada data pengguna.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payments ledger log */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <span className="font-semibold text-slate-200 text-sm block">Ledger Riwayat Transaksi Invoice</span>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-xs text-left text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 text-[10px] font-mono tracking-wider uppercase">
                <tr>
                  <th className="px-4 py-3">Order ID / Tanggal</th>
                  <th className="px-4 py-3">Rincian Paket</th>
                  <th className="px-4 py-3">Nominal Check</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                {payments && payments.length > 0 ? (
                  payments.map((p: any) => (
                    <tr key={p.orderId} className="hover:bg-slate-950/40">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-300 block">{p.orderId}</span>
                        <span className="text-[10px] text-slate-500 block font-normal">{new Date(p.createdAt).toLocaleDateString()}</span>
                      </td>
                      <td className="px-4 py-3 text-emerald-400 font-semibold uppercase">{p.package}</td>
                      <td className="px-4 py-3 text-white">Rp {p.amount?.toLocaleString('id-ID')}</td>
                      <td className="px-4 py-3">
                        <span className={`px-1.5 py-0.5 rounded font-bold text-[9px] uppercase ${
                          p.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-500 font-sans">Tidak ada transaksi tercatat.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
