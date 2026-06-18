import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Smartphone, Shield, Key, Mail, Lock, User, Phone, CheckCircle, RefreshCw, Cpu, Star, ArrowRight, Zap, HelpCircle } from 'lucide-react';
import Navbar from './components/Navbar';
import BotManager from './components/BotManager';
import BotSettingsComp from './components/BotSettingsComp';
import PricingTable from './components/PricingTable';
import AnalyticsPanel from './components/AnalyticsPanel';
import ApiKeyManager from './components/ApiKeyManager';
import AdminPortal from './components/AdminPortal';

export default function App() {
  // Authentication states
  const [token, setToken] = useState<string | null>(localStorage.getItem('hhost_token'));
  const [user, setUser] = useState<any | null>(null);
  const [isLoginView, setIsLoginView] = useState(true);

  // Auth fields
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '', phone: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Tab navigation
  const [activeTab, setActiveTab] = useState<string>('bot');

  // SaaS states
  const [subscription, setSubscription] = useState<any | null>(null);
  const [botDoc, setBotDoc] = useState<any | null>(null);
  const [sizeInfo, setSizeInfo] = useState({ sizeMb: 0, isHeavy: false });
  const [logs, setLogs] = useState<any[]>([]);
  const [settings, setSettings] = useState<any | null>(null);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [apiKeys, setApiKeys] = useState<any[]>([]);

  // Socket
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);

  // Synchronizers
  const fetchProfile = async (authToken: string) => {
    try {
      const res = await fetch('/api/user/profile', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        handleLogout();
      }
    } catch {
      handleLogout();
    }
  };

  const fetchSubscription = async (authToken: string) => {
    try {
      const res = await fetch('/api/user/subscription', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSubscription(data.subscription);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBotStatus = async (authToken: string) => {
    try {
      const res = await fetch('/api/bot/status', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBotDoc(data.bot);
        setSizeInfo(data.sizeInfo || { sizeMb: 0, isHeavy: false });
        setLogs(data.logs || []);
      } else if (res.status === 404) {
        // Trigger auto-creation bot on first log-in if not present
        await fetch('/api/bot/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          }
        });
        // retry
        const retryRes = await fetch('/api/bot/status', {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (retryRes.ok) {
          const rData = await retryRes.json();
          setBotDoc(rData.bot);
          setSizeInfo(rData.sizeInfo || { sizeMb: 0, isHeavy: false });
          setLogs(rData.logs || []);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBotSettings = async (authToken: string) => {
    try {
      const res = await fetch('/api/bot/settings', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAnalytics = async (authToken: string) => {
    try {
      const res = await fetch('/api/analytics/daily', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data.analytics || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchApiKeys = async (authToken: string) => {
    try {
      const res = await fetch('/api/keys', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.keys || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Main synchronous dispatcher
  const synchronizeAll = (authToken: string) => {
    fetchProfile(authToken);
    fetchSubscription(authToken);
    fetchBotStatus(authToken);
    fetchBotSettings(authToken);
    fetchAnalytics(authToken);
    fetchApiKeys(authToken);
  };

  // Auth Submit Handlers
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    const endpoint = isLoginView ? '/api/auth/login' : '/api/auth/register';
    const payload = isLoginView
      ? { email: authForm.email, password: authForm.password }
      : { email: authForm.email, password: authForm.password, name: authForm.name, phone: authForm.phone };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem('hhost_token', data.token);
        setToken(data.token);
        setUser(data.user);
        setAuthForm({ email: '', password: '', name: '', phone: '' });
      } else {
        setAuthError(data.error || 'Terjadi kesalahan autentikasi.');
      }
    } catch (err) {
      setAuthError('Gagal terhubung ke gateway auth.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('hhost_token');
    setToken(null);
    setUser(null);
    setSubscription(null);
    setBotDoc(null);
    setLogs([]);
    setActiveTab('bot');
  };

  // Init and socket connection
  useEffect(() => {
    if (!token) return;

    synchronizeAll(token);

    // Boot real-time WebSocket connection to the hosting server
    const activeSocket = io(window.location.origin);
    setSocket(activeSocket);

    activeSocket.on('connect', () => {
      setSocketConnected(true);
      console.log('🔗 WebSocket connection live inside browser');
    });

    activeSocket.on('disconnect', () => {
      setSocketConnected(false);
    });

    // Receive live updates regarding active pairing scans or session connected changes
    activeSocket.on('bot-status-updated', (data: { botId: string; status: string; qrCode?: string; pairingCode?: string; phoneNumber?: string }) => {
      setBotDoc((prev: any) => {
        if (!prev || prev.botId !== data.botId) return prev;
        return {
          ...prev,
          status: data.status,
          qrCode: data.qrCode || null,
          pairingCode: data.pairingCode || null,
          phoneNumber: data.phoneNumber || prev.phoneNumber
        };
      });
    });

    // Receive live activity terminal lines immediately as simulated messages arrive
    activeSocket.on('bot-log-added', (data: { botId: string; log: any }) => {
      setLogs((prev) => {
        // limit records to latest 50 to maintain rendering performance
        const nextLogs = [...prev, data.log];
        return nextLogs.slice(-50);
      });
    });

    return () => {
      activeSocket.disconnect();
    };
  }, [token]);

  // Handle direct payment checkout creations inside tables
  const handleUpgradeSubscription = async (targetTier: 'basic' | 'premium' | 'plus') => {
    const res = await fetch('/api/user/upgrade', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ packageTier: targetTier })
    });
    if (res.ok) {
      return await res.json();
    }
    throw new Error("Stall payment initialization");
  };

  // Triggers regarding bot configurations
  const handleSettingsUpdate = async (newSettingsPayload: any) => {
    if (newSettingsPayload === null) {
      // Trigger sync
      if (token) synchronizeAll(token);
      return;
    }

    try {
      const res = await fetch('/api/bot/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newSettingsPayload)
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        // Sync bot document logs
        if (token) fetchBotStatus(token);
        return data;
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Plus tier keys creations
  const handleGenerateApiKey = async (name: string) => {
    const res = await fetch('/api/keys/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ name })
    });
    if (res.ok) {
      if (token) fetchApiKeys(token);
    } else {
      const data = await res.json();
      alert(data.error || "Gagal membuat key");
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    const res = await fetch(`/api/keys/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      if (token) fetchApiKeys(token);
    }
  };

  // Device actions
  const handleStartBotInstance = async (method: 'qr' | 'pairing' = 'qr', phoneNumber?: string) => {
    const res = await fetch('/api/bot/start', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ method, phoneNumber })
    });
    if (res.ok) {
      const data = await res.json();
      setBotDoc(data.bot);
    }
  };

  const handleStopBotInstance = async () => {
    const res = await fetch('/api/bot/stop', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      setBotDoc(data.bot);
    }
  };

  // View: PUBLIC MARKETING GUEST SCREEN
  if (!token) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex flex-col justify-between selection:bg-brand-500/30 selection:text-white">
        
        {/* Guest Header */}
        <header className="border-b border-slate-800/50 bg-[#111114]/90 p-4 sticky top-0 z-10 backdrop-blur-md">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-brand-500/10 border border-brand-500/30 rounded-xl flex items-center justify-center">
                <Smartphone className="text-brand-500 w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="font-display font-bold text-white text-sm tracking-tight block">{(import.meta.env.VITE_BRAND_NAME || 'GeekzCS') + ' WA'}</span>
                <p className="text-[8px] uppercase tracking-wider text-slate-500 font-mono leading-none">Automated Bot Platform</p>
              </div>
            </div>
            <button
              onClick={() => setIsLoginView(!isLoginView)}
              className="text-xs bg-slate-900 border border-slate-800 hover:bg-slate-800 font-semibold px-4 py-1.5 rounded-lg text-slate-200 transition cursor-pointer"
            >
              {isLoginView ? 'Buat Akun Baru' : 'Login ke Dashboard'}
            </button>
          </div>
        </header>

        {/* Hero split layout */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center flex-1">
          {/* Slogan details Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-1.5 bg-brand-500/10 border border-brand-500/20 px-3 py-1 rounded-full text-brand-500 text-[10px] font-mono tracking-wider uppercase">
              <Star className="w-3.5 h-3.5 fill-brand-500" />
              WhatsApp Multi-Device Gateway
            </div>
            
            <h1 className="text-4xl md:text-5xl font-display font-extrabold text-white tracking-tight leading-tight">
              Hosting Bot WhatsApp Tanpa Ribet, <br className="hidden md:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-emerald-400">
                Aktif 24 Jam Non-Stop!
              </span>
            </h1>

            <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-xl">
              {import.meta.env.VITE_BRAND_DESCRIPTION || "Platform hosting bot WhatsApp berbasis library Baileys performa tinggi. Otomatisasikan keyword teks, broadcast harian, hingga asisten AI Customer Service interaktif yang memahami bahasa alami pelanggan."}
            </p>

            {/* Micro feature cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="bg-[#111114] p-4 border border-slate-800/50 rounded-xl space-y-1">
                <span className="font-semibold text-slate-200 text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Lokal Session Storage (Baileys)
                </span>
                <p className="text-xs text-slate-400 leading-normal">
                  Kredensial disimpan privat di local disk storage, memangkas biaya Firebase Firestore secara hemat bagi Anda.
                </p>
              </div>

              <div className="bg-[#111114] p-4 border border-slate-800/50 rounded-xl space-y-1">
                <span className="font-semibold text-slate-200 text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500"></span>
                  Metode Bayar QRIS Instan
                </span>
                <p className="text-xs text-slate-400 leading-normal">
                  Integrasi instan dengan payment gateway Pakasir (QRIS &amp; Virtual Account) untuk perpanjangan paket instan.
                </p>
              </div>
            </div>
          </div>

          {/* Authentication forms Column */}
          <div className="lg:col-span-15 xl:col-span-5 bg-[#111114] border border-slate-800/50 rounded-2xl p-6 md:p-8 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-display font-bold text-white">
                {isLoginView ? 'Selamat Datang Kembali' : 'Mulai Hosting WA Anda'}
              </h2>
              <p className="text-xs text-slate-400">
                {isLoginView ? 'Masuk dengan kredensial terdaftar untuk memonitoring' : 'Daftarkan email Anda dan deploy bot instan dalam 30 detik'}
              </p>
            </div>

            {authError && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg text-rose-400 text-xs font-semibold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {!isLoginView && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block font-semibold">Nama Lengkap</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 text-slate-500 w-4.5 h-4.5" />
                      <input
                        type="text"
                        required
                        placeholder="Cth: Muhammad Daffa"
                        value={authForm.name}
                        onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                        className="w-full bg-[#0A0A0B] border border-slate-800/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-brand-500 text-sans"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block font-semibold">Nomor WhatsApp Pribadi</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 text-slate-500 w-4.5 h-4.5" />
                      <input
                        type="tel"
                        placeholder="Cth: 628129991212"
                        value={authForm.phone}
                        onChange={(e) => setAuthForm({ ...authForm, phone: e.target.value })}
                        className="w-full bg-[#0A0A0B] border border-slate-800/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block font-semibold">Alamat Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-slate-500 w-4.5 h-4.5" />
                  <input
                    type="email"
                    required
                    placeholder="nama@email.com"
                    value={authForm.email}
                    onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                    className="w-full bg-[#0A0A0B] border border-slate-800/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-brand-500 font-sans"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block font-semibold">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-slate-500 w-4.5 h-4.5" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={authForm.password}
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                    className="w-full bg-[#0A0A0B] border border-slate-800/50 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-brand-500 font-sans"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition duration-150 cursor-pointer"
              >
                {authLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                ) : isLoginView ? (
                  'Masuk ke Dashboard'
                ) : (
                  'Daftarkan Akun & Mulai'
                )}
                {!authLoading && <ArrowRight className="w-4 h-4 text-slate-950" />}
              </button>
            </form>



            <div className="text-center pt-2 border-t border-slate-850/60">
              <button
                onClick={() => {
                  setAuthForm({ email: '', password: '', name: '', phone: '' });
                  setAuthError(null);
                  setIsLoginView(!isLoginView);
                }}
                className="text-xs text-slate-400 hover:text-brand-500 text-sans cursor-pointer"
              >
                {isLoginView ? 'Belum punya akun? Registrasi Sekarang' : 'Sudah punya akun? Login di sini'}
              </button>
            </div>
          </div>
        </main>

        <footer className="border-t border-slate-800/50 bg-[#111114] py-6 text-center text-[11px] text-slate-500 font-mono">
          &copy; 2026 {import.meta.env.VITE_BRAND_NAME || 'GeekzCS'} WA Gateway hosting. All rights reserved. &middot; Powered by Baileys library
        </footer>
      </div>
    );
  }

  // View: SAAS MAIN DASHBOARD (LOGGED IN CLIENT STATE)
  const isSubscriberActive = subscription?.status === 'active';
  const subTierName = subscription?.package || 'basic';

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex flex-col justify-between selection:bg-brand-500/20 selection:text-white">
      <div>
        <Navbar
          user={user}
          subPackage={subTierName}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onLogout={handleLogout}
          token={token}
          onProfileUpdated={() => fetchProfile(token)}
        />

        {/* Dynamic content rendering column */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Global subscriber warning header if trial expires */}
          {!isSubscriberActive && (
            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="font-semibold text-amber-500 text-sm">Paket Langganan Kedaluwarsa!</h4>
                <p className="text-slate-450 text-xs">Untuk mengaktifkan kembali auto-reply, jadwalkan broadcast, dan terminal Baileys, cukup pilih dan perpanjang paket di bawah.</p>
              </div>
              <button
                onClick={() => setActiveTab('pricing')}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs px-4 py-2 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Zap className="w-4 h-4 fill-slate-950" /> Perbarui Sekarang
              </button>
            </div>
          )}

          {/* Sub Navigation Layout pages content */}
          {activeTab === 'bot' && (
            <BotManager
              bot={botDoc}
              sizeInfo={sizeInfo}
              logs={logs}
              onStart={handleStartBotInstance}
              onStop={handleStopBotInstance}
              onRefreshStatus={() => fetchBotStatus(token)}
              subPackage={subTierName}
              analytics={analytics}
            />
          )}

          {activeTab === 'settings' && (
            <BotSettingsComp
              settings={settings}
              subPackage={subTierName}
              onUpdate={handleSettingsUpdate}
              token={token}
            />
          )}

          {activeTab === 'pricing' && (
            <PricingTable
              currentPackage={subTierName}
              onUpgrade={handleUpgradeSubscription}
              token={token}
              onSubSuccess={() => {
                synchronizeAll(token);
                setActiveTab('bot');
              }}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsPanel
              analytics={analytics}
              subPackage={subTierName}
            />
          )}

          {activeTab === 'keys' && (
            <ApiKeyManager
              apiKeys={apiKeys}
              subPackage={subTierName}
              onGenerateKey={handleGenerateApiKey}
              onDeleteKey={handleDeleteApiKey}
            />
          )}

          {activeTab === 'admin' && user?.role === 'admin' && (
            <AdminPortal token={token} />
          )}

        </main>
      </div>

      <footer className="border-t border-slate-800/50 bg-[#111114] p-5 text-center text-xs text-slate-500 font-mono flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        <span className="text-slate-450">{import.meta.env.VITE_BRAND_NAME || 'GeekzCS'} Cloud Gateway &middot; Sandbox</span>
        <div className="flex gap-4">
          <span className="text-emerald-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            Real-time Sync: OK
          </span>
          <span className="text-slate-600">v1.4.0</span>
        </div>
      </footer>
    </div>
  );
}
