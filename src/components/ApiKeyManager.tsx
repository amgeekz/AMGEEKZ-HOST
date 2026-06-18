import React, { useState } from 'react';
import { Key, Plus, Trash2, ShieldAlert, Code, CheckCircle, Copy } from 'lucide-react';

interface ApiKeyManagerProps {
  apiKeys: any[];
  subPackage: string;
  onGenerateKey: (name: string) => Promise<void>;
  onDeleteKey: (id: string) => Promise<void>;
}

export default function ApiKeyManager({ apiKeys, subPackage, onGenerateKey, onDeleteKey }: ApiKeyManagerProps) {
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const tier = subPackage?.toLowerCase() || 'basic';
  const hasAccess = tier === 'plus';

  if (!hasAccess) {
    return (
      <div className="bg-[#111114] border border-slate-800/50 rounded-2xl p-8 text-center max-w-xl mx-auto space-y-4" id="api-keys-module">
        <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/30 rounded-full flex items-center justify-center mx-auto animate-pulse">
          <ShieldAlert className="text-blue-400 w-8 h-8" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-xl font-display font-semibold text-white">Security API Keys Access</h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            Kembangkan integrasi program eksternal buatan Anda dengan aman. API Key memungkinkan sistem pihak ketiga mengirim pesan WhatsApp via gateway server HighHost Anda secara terprogram. Akses premium ini eksklusif bagi pemegang lisensi paket <span className="text-blue-400 font-bold">PLUS</span>.
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

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyLabel) return;
    setLoading(true);
    try {
      await onGenerateKey(newKeyLabel);
      setNewKeyLabel('');
    } catch (err) {
      alert("Gagal membuat token.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (keyText: string, id: string) => {
    navigator.clipboard.writeText(keyText);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6" id="api-keys-module">
      <div className="bg-[#111114] border border-slate-800/50 rounded-2xl p-6 space-y-4">
        <div className="space-y-1">
          <h3 className="font-display font-bold text-lg text-white">Developer API Key Management</h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            Gunakan token rahasia ini sebagai header <span className="font-mono text-emerald-400 bg-emerald-500/5 px-1 rounded">X-API-KEY</span> untuk melakukan authentikasi pengiriman pesan HTTP post dari compiler aplikasi Anda secara White-Label.
          </p>
        </div>

        <form onSubmit={handleGenerate} className="flex gap-2">
          <input
            type="text"
            required
            placeholder="Label Token API Anda (cth: Production Server API)"
            value={newKeyLabel}
            onChange={(e) => setNewKeyLabel(e.target.value)}
            className="bg-[#0A0A0B] border border-slate-800/50 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500 flex-1 font-sans"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-brand-500 hover:bg-brand-600 disabled:bg-slate-800 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition duration-150 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Generate Token
          </button>
        </form>
      </div>

      {/* Keys List */}
      <div className="bg-[#111114] border border-slate-800/50 rounded-2xl p-6 space-y-4">
        <h4 className="font-semibold text-slate-200 text-sm">Token Kredensial Pengembang Aktif</h4>
        
        <div className="space-y-3">
          {apiKeys && apiKeys.length > 0 ? (
            apiKeys.map((k: any) => (
              <div key={k.id} className="bg-[#0A0A0B] border border-slate-800/50 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Key className="text-blue-400 w-4 h-4 shrink-0" />
                    <span className="font-bold text-slate-200 font-sans">{k.name}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-[#111114] p-2 rounded border border-slate-800/50 w-fit max-w-full">
                    <span className="text-emerald-400 select-all break-all overflow-x-auto block font-mono pr-2">{k.key}</span>
                    <button
                      onClick={() => handleCopy(k.key, k.id)}
                      title="Salin Token"
                      className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white shrink-0 cursor-pointer"
                    >
                      {copiedId === k.id ? (
                        <CheckCircle className="w-4 h-4 text-brand-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500 font-sans block">Dibuat pada: {new Date(k.createdAt).toLocaleDateString()}</span>
                </div>

                <button
                  onClick={() => onDeleteKey(k.id)}
                  className="p-2 border border-slate-800/50 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition shrink-0 cursor-pointer w-fit"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          ) : (
            <div className="text-center text-slate-500 py-6 text-xs font-sans">
              Belum ada API key khusus yang ditambahkan. Buat kunci kredensial di atas untuk memulai otomatisasi.
            </div>
          )}
        </div>
      </div>

      {/* Developer Sandbox request documentation */}
      <div className="bg-[#111114] border border-slate-800/50 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800/50 pb-3">
          <Code className="text-slate-400 w-5 h-5 shrink-0" />
          <h4 className="font-semibold text-slate-200 text-sm">Dokumentasi API Terintegrasi (POST Send)</h4>
        </div>

        <div className="space-y-3 text-xs text-slate-400">
          <p className="leading-relaxed">
            Kirimkan request HTTP POST ke endpoint server HighHost berikut untuk mengotomatisasikan broadcast WhatsApp dari aplikasi custom ERP, CRM, atau sistem eksternal Anda:
          </p>

          <div className="space-y-2">
            <span className="font-semibold text-slate-300 font-mono block">METHOD &amp; ENDPOINT:</span>
            <span className="p-2 bg-[#0A0A0B] text-brand-500 border border-slate-800/50 rounded block font-mono text-center">
              POST https://highhost.com/api/v1/send-message
            </span>
          </div>

          <div className="space-y-2">
            <span className="font-semibold text-slate-300 font-mono block">HTTP HEADERS:</span>
            <pre className="p-3 bg-[#0A0A0B] border border-slate-800/50 rounded overflow-x-auto text-[10px] text-zinc-400 font-mono leading-relaxed">
{`Content-Type: application/json
X-API-KEY: hhost_live_xxxxxxxxx`}
            </pre>
          </div>

          <div className="space-y-2">
            <span className="font-semibold text-slate-300 font-mono block">REQUEST JSON BODY:</span>
            <pre className="p-3 bg-[#0A0A0B] border border-slate-800/50 rounded overflow-x-auto text-[10px] text-zinc-400 font-mono leading-relaxed">
{`{
  "to": "6289912345678",
  "message": "Isi pesan WhatsApp notifikasi pesanan selesai nomor Invoice #IND-88219"
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
