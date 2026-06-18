import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle, Smartphone, Zap, Sparkles, HelpCircle, RefreshCw } from 'lucide-react';

interface PricingTableProps {
  currentPackage: string;
  onUpgrade: (tier: 'basic' | 'premium' | 'plus') => Promise<any>;
  token: string;
  onSubSuccess: () => void;
}

export default function PricingTable({ currentPackage, onUpgrade, token, onSubSuccess }: PricingTableProps) {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const [activeInvoice, setActiveInvoice] = useState<any | null>(null);
  const [polling, setPolling] = useState(false);
  const [bypassLoading, setBypassLoading] = useState(false);

  const tiers = [
    {
      id: 'basic',
      name: 'BASIC',
      price: 'Rp 50.000',
      period: 'per bulan',
      description: 'Solusi hemat untuk kebutuhan pesan otomatis sederhana.',
      features: [
        'Auto-reply teks (Maks 10 keyword)',
        'Schedule 10 pesan / hari',
        '5 template pesan siap pakai',
        'Start / Stop bot sewaktu-waktu',
        'Status online / offline real-time',
        'Support standard'
      ],
      color: 'border-slate-800/50 bg-[#111114]',
      badge: null,
      btnColor: 'bg-slate-800 hover:bg-slate-700 text-slate-100'
    },
    {
      id: 'premium',
      name: 'PREMIUM',
      price: 'Rp 150.000',
      period: 'per bulan',
      description: 'Dilengkapi kecerdasan buatan AI untuk customer service otomatis.',
      features: [
        'Semua fitur BASIC',
        'Auto-reply AI (Gemini/OpenAI) Unlimited',
        'Sistem Proteksi Anti-Spam & Anti-Block',
        'Schedule 50 pesan / hari',
        'Template Chat Unlimited',
        'Serta ekspor riwayat chat history',
        'Support prioritas 12 Jam'
      ],
      color: 'border-emerald-500/50 bg-[#111114] ring-2 ring-emerald-500/10',
      badge: 'Paling Populer',
      btnColor: 'bg-emerald-500 hover:bg-emerald-600 text-emerald-950 font-semibold'
    },
    {
      id: 'plus',
      name: 'PLUS',
      price: 'Rp 300.000',
      period: 'per bulan',
      description: 'Fitur terlengkap untuk integrasi enterprise & developer.',
      features: [
        'Semua fitur PREMIUM',
        'Custom Kustomisasi AI Training',
        'Advanced Analytics Dashboard',
        'Integrasi API & Webhook Keluar',
        'Multi-device support',
        'White-label (No watermark)',
        'Support VIP 24/7 Unlimited',
        'Schedule pesan tanpa batasan'
      ],
      color: 'border-blue-500/40 bg-[#111114]',
      badge: 'Rekomendasi CS',
      btnColor: 'bg-blue-600 hover:bg-blue-700 text-blue-50 font-medium'
    }
  ];

  const handleUpgradeClick = async (tier: 'basic' | 'premium' | 'plus') => {
    setLoadingTier(tier);
    try {
      const orderData = await onUpgrade(tier);
      if (orderData && orderData.order) {
        setActiveInvoice(orderData.order);
        setPolling(true);
      }
    } catch (err) {
      alert("Gagal melakukan checkout Pakasir.");
    } finally {
      setLoadingTier(null);
    }
  };

  // Poll Pakasir status
  useEffect(() => {
    if (!polling || !activeInvoice) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/payment/status/${activeInvoice.orderId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (data && data.order && data.order.status === 'paid') {
            setActiveInvoice(data.order);
            setPolling(false);
            clearInterval(interval);
            onSubSuccess();
          }
        }
      } catch (err) {
        console.error("Checking error:", err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [polling, activeInvoice, token]);

  const handleSimulatePayment = async () => {
    if (!activeInvoice) return;
    setBypassLoading(true);
    try {
      const res = await fetch('/api/payment/simulate-success', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ orderId: activeInvoice.orderId })
      });
      if (res.ok) {
        setPolling(false);
        setActiveInvoice(prev => ({ ...prev, status: 'paid' }));
        setTimeout(() => {
          onSubSuccess();
        }, 1500);
      } else {
        alert("Gagal memicu simulasi sukses.");
      }
    } catch (err) {
      alert("Error bypass payment.");
    } finally {
      setBypassLoading(false);
    }
  };

  return (
    <div className="space-y-8" id="pricing-module">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <h2 className="text-3xl font-display font-bold tracking-tight text-white">
          Paket Layanan WhatsApp Bot Hosting
        </h2>
        <p className="text-slate-400 text-sm">
          Semua nomor siap tayang secara andal 24 jam sehari. Pilih lisensi terbaik berdasarkan volume pesan Anda.
        </p>
      </div>

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {tiers.map((t) => {
          const isActive = currentPackage.toLowerCase() === t.id;
          return (
            <div key={t.id} className={`rounded-2xl border p-6 flex flex-col justify-between transition relative ${t.color}`}>
              {t.badge && (
                <span className="absolute -top-3 right-6 bg-brand-500 text-slate-950 font-bold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {t.badge}
                </span>
              )}
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xl font-display font-semibold text-slate-100">{t.name}</h3>
                  <p className="text-xs text-slate-400">{t.description}</p>
                </div>

                <div className="py-2">
                  <span className="text-3xl font-bold font-display text-white">{t.price}</span>
                  <span className="text-slate-400 text-xs font-normal"> / {t.period}</span>
                </div>

                {isActive && (
                  <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-lg p-2.5 flex items-center gap-2">
                    <CheckCircle className="text-emerald-400 w-4 h-4 shrink-0" />
                    <span className="text-xs text-emerald-300 font-medium font-sans">Paket Aktif Anda Saat Ini</span>
                  </div>
                )}

                <hr className="border-slate-800/50" />

                <ul className="space-y-2 text-xs text-slate-300">
                  {t.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Smartphone className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-6">
                <button
                  type="button"
                  disabled={isActive || loadingTier !== null}
                  onClick={() => handleUpgradeClick(t.id as any)}
                  className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition duration-200 cursor-pointer ${
                    isActive ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : t.btnColor
                  }`}
                >
                  {loadingTier === t.id ? (
                    <>
                      <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                      Membuat Invoice...
                    </>
                  ) : isActive ? (
                    'Sangat Aktif'
                  ) : (
                    `Langganan ${t.name}`
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Invoice Modal for payment verification */}
      {activeInvoice && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111114] border border-slate-800/50 rounded-2xl w-full max-w-md p-6 relative space-y-6">
            <button
              onClick={() => {
                setActiveInvoice(null);
                setPolling(false);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 font-bold text-lg"
            >
              &times;
            </button>

            <div className="text-center space-y-2">
              <span className="text-xs text-brand-500 font-semibold tracking-wider uppercase block">Pembayaran Invoice QRIS (Gateway Pakasir)</span>
              <h4 className="text-xl font-display font-bold text-white">Selesaikan Transaksi</h4>
              <p className="text-xs text-slate-400">Order ID: <span className="font-mono text-emerald-400">{activeInvoice.orderId}</span></p>
            </div>

            {activeInvoice.status === 'unpaid' ? (
              <div className="flex flex-col items-center space-y-4">
                <div className="bg-white p-3 rounded-xl qr-glow">
                  <img
                    referrerPolicy="no-referrer"
                    src={activeInvoice.qrCodeUrl}
                    alt="Pakasir QRIS"
                    className="w-48 h-48"
                  />
                </div>
                
                <div className="text-center space-y-1">
                  <span className="text-2xl font-bold font-display text-white">Rp {activeInvoice.amount.toLocaleString('id-ID')}</span>
                  <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 animate-pulse">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                    <span>Menunggu verifikasi transfer QRIS dari Pakasir...</span>
                  </div>
                </div>

                {/* Local testing sandbox bypass container */}
                <div className="w-full bg-[#0A0A0B] p-4 rounded-xl border border-slate-800/50 text-center space-y-3">
                  <span className="text-[10px] text-slate-400 font-mono uppercase block">SaaS Dev Sandbox Tools</span>
                  <p className="text-[11px] text-slate-400">
                    Anda sedang berada di mode ujicoba. Klik tombol di bawah untuk menyimulasikan konfirmasi webhook pembayaran dari Pakasir secara gratis.
                  </p>
                  <button
                    onClick={handleSimulatePayment}
                    disabled={bypassLoading}
                    className="w-full py-1.5 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-700/50 text-[11px] text-slate-950 px-4 rounded font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    {bypassLoading ? (
                      'Processing...'
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Simulasi Sukses (Bypass Pakasir Webhook)
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center py-6 space-y-3">
                <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/50 rounded-full flex items-center justify-center">
                  <CheckCircle className="text-brand-500 w-10 h-10 animate-bounce" />
                </div>
                <h5 className="text-lg font-bold text-white">Pembayaran Berhasil!</h5>
                <p className="text-xs text-slate-400">
                  Pembayaran untuk paket <span className="text-emerald-400 font-bold uppercase">{activeInvoice.package}</span> telah lunas. Sistem otomatis memperbarui status langganan nomor Anda.
                </p>
              </div>
            )}

            <div className="text-slate-500 text-[9px] text-center font-mono">
              Integrasi Terenkripsi &middot; Env: {process.env.NODE_ENV || 'development'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
