import React, { useState } from 'react';
import { ToggleLeft, ToggleRight, Plus, Trash2, Key, HelpCircle, FileText, Send, Clock, Globe, ShieldAlert } from 'lucide-react';

interface BotSettingsCompProps {
  settings: any;
  subPackage: string;
  onUpdate: (updatedSettings: any) => Promise<any>;
  token: string;
}

export default function BotSettingsComp({ settings, subPackage, onUpdate, token }: BotSettingsCompProps) {
  const [activeTab, setActiveTab] = useState<'keyword' | 'template' | 'schedule' | 'webhook' | 'ai-agent'>('ai-agent'); // Default to AI Agent tab for highlighting the feature
  const [saving, setSaving] = useState(false);
  
  // Local forms state
  const [keywordForm, setKeywordForm] = useState({ keyword: '', response: '' });
  const [templateForm, setTemplateForm] = useState({ name: '', content: '' });
  const [scheduleForm, setScheduleForm] = useState({ recipient: '', message: '', time: '08:00', daily: true });
  const [webhookUrl, setWebhookUrl] = useState(settings?.webhookUrl || '');

  // AI Agent forms state
  const [aiForm, setAiForm] = useState({
    agentName: settings?.agentName || import.meta.env.VITE_BRAND_NAME || 'GeekzCS',
    systemPrompt: settings?.systemPrompt || '',
    adminContacts: settings?.adminContacts || '',
    productSyncUrl: settings?.productSyncUrl || '',
    customProductData: settings?.customProductData || '',
    aiMode: settings?.aiMode || 'single',
    salesAgentName: settings?.salesAgentName || 'GeekzSales',
    salesAgentPrompt: settings?.salesAgentPrompt || '',
    techAgentName: settings?.techAgentName || 'GeekzTech',
    techAgentPrompt: settings?.techAgentPrompt || '',
    billingAgentName: settings?.billingAgentName || 'GeekzBilling',
    billingAgentPrompt: settings?.billingAgentPrompt || ''
  });

  React.useEffect(() => {
    if (settings) {
      setWebhookUrl(settings.webhookUrl || '');
      setAiForm({
        agentName: settings.agentName || import.meta.env.VITE_BRAND_NAME || 'GeekzCS',
        systemPrompt: settings.systemPrompt || '',
        adminContacts: settings.adminContacts || '',
        productSyncUrl: settings.productSyncUrl || '',
        customProductData: settings.customProductData || '',
        aiMode: settings.aiMode || 'single',
        salesAgentName: settings.salesAgentName || 'GeekzSales',
        salesAgentPrompt: settings.salesAgentPrompt || '',
        techAgentName: settings.techAgentName || 'GeekzTech',
        techAgentPrompt: settings.techAgentPrompt || '',
        billingAgentName: settings.billingAgentName || 'GeekzBilling',
        billingAgentPrompt: settings.billingAgentPrompt || ''
      });
    }
  }, [settings]);

  const tier = subPackage?.toLowerCase() || 'basic';
  const hasAiPermission = tier === 'premium' || tier === 'plus';
  const hasWebhookPermission = tier === 'plus';

  const triggerSave = async (newSettingsObj: any) => {
    setSaving(true);
    try {
      await onUpdate(newSettingsObj);
    } catch (err) {
      alert("Gagal merubah konfigurasi.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAutoReply = () => {
    const updated = { ...settings, autoReply: !settings.autoReply };
    triggerSave(updated);
  };

  const handleToggleAiEnabled = () => {
    if (!hasAiPermission) {
      alert("Fitur Auto-Reply AI membutuhkan akses paket PREMIUM atau PLUS. Silakan lakukan upgrade paket terlebih dahulu.");
      return;
    }
    const updated = { ...settings, aiEnabled: !settings.aiEnabled };
    triggerSave(updated);
  };

  const handleCreateKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keywordForm.keyword || !keywordForm.response) return;

    // Basic package count limit check
    if (tier === 'basic' && settings.keywordResponses.length >= 10) {
      alert("Batas Maksimal Terlampaui! Paket BASIC dibatasi maksimal 10 keyword auto-reply.");
      return;
    }

    const keywordList = [...settings.keywordResponses];
    keywordList.push({
      id: 'k-' + Math.random().toString(36).substring(2, 9),
      keyword: keywordForm.keyword,
      response: keywordForm.response
    });

    const updated = { ...settings, keywordResponses: keywordList };
    triggerSave(updated);
    setKeywordForm({ keyword: '', response: '' });
  };

  const handleDeleteKeyword = (id: string) => {
    const keywordList = settings.keywordResponses.filter((k: any) => k.id !== id);
    const updated = { ...settings, keywordResponses: keywordList };
    triggerSave(updated);
  };

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.name || !templateForm.content) return;

    if (tier === 'basic' && settings.templates.length >= 5) {
      alert("Batas template terlampaui! Paket BASIC dibatasi maksimal 5 template chat.");
      return;
    }

    const templateList = [...settings.templates];
    templateList.push({
      id: 't-' + Math.random().toString(36).substring(2, 9),
      name: templateForm.name,
      content: templateForm.content
    });

    const updated = { ...settings, templates: templateList };
    triggerSave(updated);
    setTemplateForm({ name: '', content: '' });
  };

  const handleDeleteTemplate = (id: string) => {
    const templateList = settings.templates.filter((t: any) => t.id !== id);
    const updated = { ...settings, templates: templateList };
    triggerSave(updated);
  };

  // Schedules addition utilizes individual fetch post endpoints as requested to support dynamic verification
  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleForm.recipient || !scheduleForm.message || !scheduleForm.time) return;

    try {
      setSaving(true);
      const response = await fetch('/api/bot/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(scheduleForm)
      });
      if (response.ok) {
        setScheduleForm({ recipient: '', message: '', time: '08:00', daily: true });
        // Emit trigger sync status
        onUpdate(null);
      } else {
        const errJson = await response.json();
        alert(errJson.error || "Gagal menyetel jadwal broadcast.");
      }
    } catch (err) {
      alert("Error adding schedule.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      setSaving(true);
      const res = await fetch(`/api/bot/schedule/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        onUpdate(null);
      } else {
        alert("Gagal menghapus.");
      }
    } catch (err) {
      alert("Error removing schedule item.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasWebhookPermission) {
      alert("Fitur Webhook eksklusif hanya untuk pelanggan paket PLUS. Silakan lakukan upgrade paket.");
      return;
    }
    const updated = { ...settings, webhookUrl };
    triggerSave(updated);
  };

  return (
    <div className="space-y-6" id="bot-settings-module">
      {/* Grid of Toggle Switches */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Keyword Switch Card */}
        <div className="bg-[#111114] border border-slate-800/50 rounded-2xl p-5 flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-slate-100 flex items-center gap-1.5 text-sm">
              <Key className="text-emerald-400 w-4 h-4" />
              Auto-Reply Keyword Teks
            </h3>
            <p className="text-xs text-slate-400 leading-normal">
              Membalas pesan instan secara otomatis berdasarkan keyword teks yang cocok.
            </p>
          </div>
          <button
            onClick={handleToggleAutoReply}
            disabled={saving}
            className="text-slate-200 transition focus:outline-none shrink-0"
          >
            {settings?.autoReply ? (
              <ToggleRight className="w-12 h-12 text-brand-500 fill-brand-500/10 cursor-pointer" />
            ) : (
              <ToggleLeft className="w-12 h-12 text-slate-600 cursor-pointer" />
            )}
          </button>
        </div>

        {/* AI Switch Card */}
        <div className={`border rounded-2xl p-5 flex items-center justify-between ${
          hasAiPermission ? 'bg-[#111114] border-slate-800/50' : 'bg-[#0A0A0B] border-slate-800/50 opacity-90'
        }`}>
          <div className="space-y-1">
            <h3 className="font-semibold text-slate-100 flex items-center gap-1.5 text-sm">
              <FileText className="text-blue-400 w-4 h-4" />
              Sistem Auto-Reply CS AI (Gemini)
            </h3>
            <p className="text-xs text-slate-400 leading-normal">
              Otomatisasi asisten chat menjawab pertanyaan bebas pelanggan secara humanis menggunakan AI.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <button
              onClick={handleToggleAiEnabled}
              disabled={saving}
              className="text-slate-200 transition focus:outline-none"
            >
              {settings?.aiEnabled ? (
                <ToggleRight className="w-12 h-12 text-brand-500 fill-brand-500/10 cursor-pointer" />
              ) : (
                <ToggleLeft className="w-12 h-12 text-slate-600 cursor-pointer" />
              )}
            </button>
            {!hasAiPermission && (
              <span className="text-[9px] bg-slate-800/80 text-amber-500 font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5 uppercase tracking-wide">
                Premium Locked
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Configurations Navigation Section */}
      <div className="bg-[#111114] border border-slate-800/50 rounded-2xl p-6 space-y-6">
        <div className="flex border-b border-slate-800/50 overflow-x-auto gap-2">
          <button
            onClick={() => setActiveTab('keyword')}
            className={`pb-3 px-4 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'keyword' ? 'border-brand-500 text-brand-500' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Manage Keywords ({settings?.keywordResponses?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('template')}
            className={`pb-3 px-4 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'template' ? 'border-brand-500 text-brand-500' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Template Pesan ({settings?.templates?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`pb-3 px-4 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'schedule' ? 'border-brand-500 text-brand-500' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Jadwal Broadcast ({settings?.schedules?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('webhook')}
            className={`pb-3 px-4 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'webhook' ? 'border-brand-500 text-brand-500' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Webhook Integration
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ai-agent')}
            className={`pb-3 px-4 text-xs font-semibold border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'ai-agent' ? 'border-brand-500 text-brand-500' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🤖 Agen CS AI ({import.meta.env.VITE_BRAND_NAME || 'GeekzCS'})
          </button>
        </div>

        {/* Tab CONTENT Area */}
        {activeTab === 'keyword' && (
          <div className="space-y-6">
            <form onSubmit={handleCreateKeyword} className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Target Keyword (cth: harga)"
                value={keywordForm.keyword}
                onChange={(e) => setKeywordForm({ ...keywordForm, keyword: e.target.value })}
                className="bg-[#0A0A0B] border border-slate-800/50 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
              />
              <input
                type="text"
                placeholder="Balas Otomatis (cth: Harga paket basic adalah 50rb...)"
                value={keywordForm.response}
                onChange={(e) => setKeywordForm({ ...keywordForm, response: e.target.value })}
                className="bg-[#0A0A0B] border border-slate-800/50 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500 md:col-span-2"
              />
              <button
                type="submit"
                className="bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold px-4 py-2 text-xs rounded-xl flex items-center justify-center gap-1.5 transition duration-150 cursor-pointer"
              >
                <Plus className="w-4 h-4 shrink-0" />
                Tambah Keyword
              </button>
            </form>

            <div className="overflow-x-auto rounded-xl border border-slate-800/50">
              <table className="w-full text-xs text-left text-slate-300">
                <thead className="bg-[#0A0A0B] text-slate-400 text-[10px] font-mono tracking-wider uppercase">
                  <tr>
                    <th className="px-4 py-3">Keyword Trigger</th>
                    <th className="px-4 py-3">Response Message Output</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {settings?.keywordResponses?.length > 0 ? (
                    settings.keywordResponses.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-950/20">
                        <td className="px-4 py-3 bg-brand-500/5 font-mono text-emerald-400 font-semibold">{item.keyword}</td>
                        <td className="px-4 py-3">{item.response}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeleteKeyword(item.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                        Belum ada keyword auto-reply tambahan. Masukkan kata kunci untuk merespon chat pelanggan Anda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'template' && (
          <div className="space-y-6">
            <form onSubmit={handleCreateTemplate} className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Nama Template (cth: Tagihan)"
                value={templateForm.name}
                onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                className="bg-[#0A0A0B] border border-slate-800/50 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              />
              <input
                type="text"
                placeholder="Isi Template Pesan WhatsApp..."
                value={templateForm.content}
                onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                className="bg-[#0A0A0B] border border-slate-800/50 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500 md:col-span-2"
              />
              <button
                type="submit"
                className="bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold px-4 py-2 text-xs rounded-xl flex items-center justify-center gap-1.5 transition duration-150 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Tambah Template
              </button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {settings?.templates?.length > 0 ? (
                settings.templates.map((t: any) => (
                  <div key={t.id} className="bg-[#0A0A0B]/60 border border-slate-800/50 rounded-xl p-4 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <FileText className="text-zinc-400 w-4 h-4 shrink-0" />
                        <h4 className="font-semibold text-slate-200 text-sm">{t.name}</h4>
                      </div>
                      <p className="text-slate-400 leading-normal text-xs bg-[#0A0A0B] p-2.5 rounded border border-slate-800/20 font-sans">{t.content}</p>
                    </div>
                    <div className="flex justify-end pt-3">
                      <button
                        onClick={() => handleDeleteTemplate(t.id)}
                        className="text-slate-500 hover:text-rose-500 text-xs flex items-center gap-1 hover:bg-rose-500/5 px-2.5 py-1 rounded transition border border-transparent hover:border-rose-500/10 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Hapus
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center col-span-2 text-slate-500 py-6">
                  Tidak ada template chat yang dideklarasikan.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <form onSubmit={handleCreateSchedule} className="bg-[#0A0A0B] border border-slate-800/50 p-4 rounded-xl space-y-4">
              <span className="text-[10px] uppercase font-mono tracking-wider text-brand-500 font-semibold block">Buat Broadcast Pesan Terjadwal</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Nomor WA Recipient (cth: 62812345678)"
                  value={scheduleForm.recipient}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, recipient: e.target.value })}
                  className="bg-[#111114] border border-slate-800/50 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
                />
                <input
                  type="time"
                  value={scheduleForm.time}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                  className="bg-[#111114] border border-slate-800/50 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
                />
                <div className="flex items-center gap-2 px-1">
                  <input
                    type="checkbox"
                    id="daily-check"
                    checked={scheduleForm.daily}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, daily: e.target.checked })}
                    className="w-4 h-4 accent-brand-500"
                  />
                  <label htmlFor="daily-check" className="text-xs text-slate-300 cursor-pointer selection:bg-transparent">Ulangi setiap hari (daily)</label>
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Isi pesan broadcast yang akan dikirim secara berkala..."
                  value={scheduleForm.message}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, message: e.target.value })}
                  className="bg-[#111114] border border-slate-800/50 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 flex-1"
                />
                <button
                  type="submit"
                  className="bg-brand-500 hover:bg-brand-600 text-slate-950 font-bold px-5 py-2 rounded-lg text-xs flex items-center gap-1 transition shrink-0 cursor-pointer"
                >
                  <Clock className="w-4 h-4" /> Simpan Jadwal
                </button>
              </div>
            </form>

            <div className="overflow-x-auto rounded-xl border border-slate-800/50">
              <table className="w-full text-xs text-left text-slate-300">
                <thead className="bg-[#0A0A0B] text-slate-400 text-[10px] font-mono tracking-wider uppercase">
                  <tr>
                    <th className="px-4 py-3">Penerima</th>
                    <th className="px-4 py-3">Pesan yang Dijadwalkan</th>
                    <th className="px-4 py-3">Waktu Dispatched</th>
                    <th className="px-4 py-3">Interasi Harian</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {settings?.schedules?.length > 0 ? (
                    settings.schedules.map((s: any) => (
                      <tr key={s.id} className="hover:bg-slate-950/40">
                        <td className="px-4 py-3 font-mono text-slate-300">{s.recipient}</td>
                        <td className="px-4 py-3">{s.message}</td>
                        <td className="px-4 py-3 font-mono text-emerald-400 font-semibold">{s.time}</td>
                        <td className="px-4 py-3">{s.daily ? 'YA (Daily)' : 'SATU KALI'}</td>
                        <td className="px-4 py-3">
                          <span className="px-1.5 py-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded font-mono text-[9px] uppercase">
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeleteSchedule(s.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                        Belum ada tugas broadcast pesan. Deklarasikan penerima dan jam kirim di atas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'webhook' && (
          <div className="space-y-6">
            {!hasWebhookPermission && (
              <div className="bg-blue-500/5 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
                <ShieldAlert className="text-blue-400 w-5 h-5 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <h4 className="font-semibold text-blue-300 text-sm uppercase font-mono">Fitur Khusus Paket PLUS</h4>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Integrasi Webhook Outbound memungkinkan server Anda menerima payload instan setiap kali bot menerima pesan WhatsApp dari konsumen secara real-time. Terhubung dengan otomatisasi system eksternal Anda.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveWebhook} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-slate-400 block font-mono">URL Webhook Receiver (JSON POST Payload)</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://server-anda.com/webhook/receive"
                    disabled={!hasWebhookPermission}
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="bg-[#0A0A0B] border border-slate-800/50 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 flex-1 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={!hasWebhookPermission || saving}
                    className="bg-brand-500 hover:bg-brand-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition duration-150 cursor-pointer"
                  >
                    <Globe className="w-4.5 h-4.5" />
                    Simpan Webhook
                  </button>
                </div>
              </div>

              <div className="bg-[#0A0A0B] p-4 rounded-xl border border-slate-800/50 space-y-3 text-xs text-slate-400">
                <span className="font-semibold text-slate-300 block font-mono">Contoh JSON Data Payload dikirim:</span>
                <pre className="p-3 bg-[#111114] border border-slate-800/50 rounded text-[10px] text-zinc-400 overflow-x-auto leading-relaxed font-mono">
{`{
  "botId": "${settings?.botId || 'bot-123'}",
  "sender": "628129991212",
  "name": "Budi Santoso",
  "message": "Halo, informasi produk",
  "timestamp": "${new Date().toISOString()}"
}`}
                </pre>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'ai-agent' && (
          <div className="space-y-6">
            <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl flex items-start gap-3">
              <Plus className="text-emerald-400 w-5 h-5 mt-0.5 shrink-0 rotate-45" />
              <div className="space-y-1">
                <h4 className="font-semibold text-emerald-300 text-sm uppercase font-mono">Pengaturan Model Agen CS AI (Tanpa Coding)</h4>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Modifikasi kepribadian, nama panggilan, cara menjawab, daftar kontak darurat admin, hingga sumber produk untuk asisten AI Anda di WA. Perubahan akan langsung disinkronisasi ke engine AI secara real-time.
                </p>
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const updated = {
                ...settings,
                agentName: aiForm.agentName,
                systemPrompt: aiForm.systemPrompt,
                adminContacts: aiForm.adminContacts,
                productSyncUrl: aiForm.productSyncUrl,
                customProductData: aiForm.customProductData,
                aiMode: aiForm.aiMode,
                salesAgentName: aiForm.salesAgentName,
                salesAgentPrompt: aiForm.salesAgentPrompt,
                techAgentName: aiForm.techAgentName,
                techAgentPrompt: aiForm.techAgentPrompt,
                billingAgentName: aiForm.billingAgentName,
                billingAgentPrompt: aiForm.billingAgentPrompt
              };
              triggerSave(updated);
            }} className="space-y-5">
              {/* AI MODE SELECTION */}
              <div className="bg-[#0A0A0B]/65 border border-slate-800/40 p-4 rounded-xl space-y-3">
                <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block font-semibold">
                  Mode Arsitektur AI Agent
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAiForm({ ...aiForm, aiMode: 'single' })}
                    className={`py-3 px-4 rounded-xl text-xs font-semibold border flex flex-col gap-1 items-start text-left transition duration-150 ${
                      aiForm.aiMode === 'single'
                        ? 'bg-brand-500/10 border-brand-500/40 text-brand-400'
                        : 'bg-slate-900/45 border-slate-850 text-slate-400 hover:border-slate-800'
                    }`}
                  >
                    <span className="font-bold">🧑‍💼 Single Agent Mode</span>
                    <span className="text-[10px] text-slate-500 font-normal">Satu asisten utama menangani seluruh pertanyaan pembeli secara umum.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiForm({ ...aiForm, aiMode: 'multi' })}
                    className={`py-3 px-4 rounded-xl text-xs font-semibold border flex flex-col gap-1 items-start text-left transition duration-150 ${
                      aiForm.aiMode === 'multi'
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                        : 'bg-slate-900/45 border-slate-850 text-slate-400 hover:border-slate-800'
                    }`}
                  >
                    <span className="font-bold">🤖 Multi-Agent System (Cooperative)</span>
                    <span className="text-[10px] text-slate-500 font-normal">Tiga asisten ahli (Sales, Tech & Billing) dikoordinasikan secara cerdas berdasarkan analisa pesan.</span>
                  </button>
                </div>
              </div>

              {aiForm.aiMode === 'single' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block font-semibold">Nama Panggilan Agen (Agent AI Name)</label>
                      <input
                        type="text"
                        required={aiForm.aiMode === 'single'}
                        placeholder={`Contoh: ${import.meta.env.VITE_BRAND_NAME || 'GeekzCS'}`}
                        value={aiForm.agentName}
                        onChange={(e) => setAiForm({ ...aiForm, agentName: e.target.value })}
                        className="w-full bg-[#0A0A0B] border border-slate-800/50 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 font-sans"
                      />
                      <span className="text-[10.5px] text-slate-500 block leading-tight">Digunakan AI untuk memperkenalkan diri ke pelanggan.</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block font-semibold">Nomor Kontak Admin (Tampil Jika AI Bingung)</label>
                      <textarea
                        rows={1}
                        placeholder="Inod: +62 856-4945-5626&#10;Michael: +62 812-4809-5727"
                        value={aiForm.adminContacts}
                        onChange={(e) => setAiForm({ ...aiForm, adminContacts: e.target.value })}
                        className="w-full bg-[#0A0A0B] border border-slate-800/50 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
                      />
                      <span className="text-[10.5px] text-slate-500 block leading-tight">Digunakan jika pelanggan menanyakan info rujukan detail.</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block font-semibold">Sistem Prompt Awal / Petunjuk Kepribadian AI Agent</label>
                    <textarea
                      rows={6}
                      required={aiForm.aiMode === 'single'}
                      placeholder="Contoh: Kamu adalah Customer service amgeekz.com. Panggil pembeli dengan Kak..."
                      value={aiForm.systemPrompt}
                      onChange={(e) => setAiForm({ ...aiForm, systemPrompt: e.target.value })}
                      className="w-full bg-[#0A0A0B] border border-slate-800/50 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 leading-relaxed font-sans"
                    />
                    <span className="text-[10.5px] text-slate-500 block leading-tight">
                      Tulis aturan kepemimpinan, aturan chat, dilarang kasar, batas refund, diskon dll di sini. Gunakan tag <code className="bg-slate-850 px-1 py-0.5 rounded text-slate-300 font-mono text-[9.5px]">{"{AGENT_NAME}"}</code> untuk merujuk pada Nama Agen secara dinamis.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 border-l-2 border-emerald-500/30 pl-4">
                  <div className="bg-[#0A0A0B]/40 p-3 rounded-lg text-xs text-slate-400 leading-tight">
                    🔥 <b className="text-emerald-400">Arsitektur Multi-Agent Aktif:</b> Router AI kami akan secara otomatis membaca topik pesan masuk dari pelanggan dan mengarahkannya ke asisten ahli yang memiliki petunjuk prompt paling spesifik di bawah ini.
                  </div>

                  {/* 1. AGENT SALES */}
                  <div className="bg-[#111114] border border-slate-850 rounded-xl p-4 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-850 pb-2">
                      <span className="text-lg">📣</span>
                      <div>
                        <h5 className="font-bold text-xs text-slate-200 uppercase font-mono tracking-wide">Agen Spesialis 1: Sales & Marketing CS</h5>
                        <p className="text-[10px] text-slate-500">Merespon chat umum, sambutan, perkenalan, serta penawaran rujukan diskon produk.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-1 space-y-1.5">
                        <label className="text-[10px] font-mono text-slate-450 block font-semibold">Nama Agen Sales</label>
                        <input
                          type="text"
                          required={aiForm.aiMode === 'multi'}
                          value={aiForm.salesAgentName}
                          onChange={(e) => setAiForm({ ...aiForm, salesAgentName: e.target.value })}
                          className="w-full bg-[#0A0A0B] border border-slate-800/50 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="md:col-span-3 space-y-1.5">
                        <label className="text-[10px] font-mono text-slate-450 block font-semibold">Panduan Prompt Spesifik Sales (Persuasi & Layanan)</label>
                        <textarea
                          rows={3}
                          required={aiForm.aiMode === 'multi'}
                          value={aiForm.salesAgentPrompt}
                          onChange={(e) => setAiForm({ ...aiForm, salesAgentPrompt: e.target.value })}
                          className="w-full bg-[#0A0A0B] border border-slate-800/50 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 2. AGENT TECH */}
                  <div className="bg-[#111114] border border-slate-850 rounded-xl p-4 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-850 pb-2">
                      <span className="text-lg">🔧</span>
                      <div>
                        <h5 className="font-bold text-xs text-slate-200 uppercase font-mono tracking-wide">Agen Spesialis 2: Bantuan Teknis (Tech Support)</h5>
                        <p className="text-[10px] text-slate-500">Merespon chat tentang masalah server, cara setup bot WA, error Baileys, atau konfigurasi VPS.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-1 space-y-1.5">
                        <label className="text-[10px] font-mono text-slate-450 block font-semibold">Nama Agen Teknis</label>
                        <input
                          type="text"
                          required={aiForm.aiMode === 'multi'}
                          value={aiForm.techAgentName}
                          onChange={(e) => setAiForm({ ...aiForm, techAgentName: e.target.value })}
                          className="w-full bg-[#0A0A0B] border border-slate-800/50 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="md:col-span-3 space-y-1.5">
                        <label className="text-[10px] font-mono text-slate-450 block font-semibold">Panduan Prompt Spesifik Teknis (Instruksi Solusi Error)</label>
                        <textarea
                          rows={3}
                          required={aiForm.aiMode === 'multi'}
                          value={aiForm.techAgentPrompt}
                          onChange={(e) => setAiForm({ ...aiForm, techAgentPrompt: e.target.value })}
                          className="w-full bg-[#0A0A0B] border border-slate-800/50 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. AGENT BILLING */}
                  <div className="bg-[#111114] border border-slate-850 rounded-xl p-4 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-850 pb-2">
                      <span className="text-lg">💳</span>
                      <div>
                        <h5 className="font-bold text-xs text-slate-200 uppercase font-mono tracking-wide">Agen Spesialis 3: Keuangan & Billing Admin</h5>
                        <p className="text-[10px] text-slate-500">Merespon chat tentang harga pendaftaran, metode bayar (QRIS/Bank), invoice, dan kebijakan refund.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-1 space-y-1.5">
                        <label className="text-[10px] font-mono text-slate-450 block font-semibold">Nama Agen Billing</label>
                        <input
                          type="text"
                          required={aiForm.aiMode === 'multi'}
                          value={aiForm.billingAgentName}
                          onChange={(e) => setAiForm({ ...aiForm, billingAgentName: e.target.value })}
                          className="w-full bg-[#0A0A0B] border border-slate-800/50 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="md:col-span-3 space-y-1.5">
                        <label className="text-[10px] font-mono text-slate-450 block font-semibold">Panduan Prompt Spesifik Billing (Metode Bayar & S&K Refund)</label>
                        <textarea
                          rows={3}
                          required={aiForm.aiMode === 'multi'}
                          value={aiForm.billingAgentPrompt}
                          onChange={(e) => setAiForm({ ...aiForm, billingAgentPrompt: e.target.value })}
                          className="w-full bg-[#0A0A0B] border border-slate-800/50 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block font-semibold">Nomor Rujukan Admin (Cadangan untuk Semua Agen)</label>
                    <textarea
                      rows={1}
                      placeholder="Inod: +62 856-4945-5626"
                      value={aiForm.adminContacts}
                      onChange={(e) => setAiForm({ ...aiForm, adminContacts: e.target.value })}
                      className="w-full bg-[#0A0A0B] border border-slate-800/50 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="border-t border-slate-850/60 pt-4 space-y-4">
                <h4 className="text-xs font-semibold text-slate-200 uppercase font-mono tracking-wider">Sumber Katalog Produk Agen (CS Knowledgebase)</h4>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block font-semibold">URL Sinkronisasi Layanan / Produk Live (API HTTP GET)</label>
                  <input
                    type="url"
                    placeholder="Contoh: https://amgeekz.com/api/service"
                    value={aiForm.productSyncUrl}
                    onChange={(e) => setAiForm({ ...aiForm, productSyncUrl: e.target.value })}
                    className="w-full bg-[#0A0A0B] border border-slate-800/50 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
                  />
                  <span className="text-[10.5px] text-slate-500 block leading-tight">
                    Setiap kali ada pesan WA masuk, bot akan mencoba mengunduh daftar produk real-time dari API ini secara otomatis sebagai modal menjawab chat pembeli.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block font-semibold">Data Produk Cadangan Offline (Format JSON Array)</label>
                  <textarea
                    rows={4}
                    placeholder={`[
  { "nama_layanan": "Topup Pulsa", "brand": "Telkomsel", "status": "Tersedia", "price": "Rp 12,000" }
]`}
                    value={aiForm.customProductData}
                    onChange={(e) => setAiForm({ ...aiForm, customProductData: e.target.value })}
                    className="w-full bg-[#0A0A0B] border border-slate-800/50 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 font-mono leading-relaxed"
                  />
                  <span className="text-[10.5px] text-slate-500 block leading-tight">
                    Digunakan jika URL sinkronisasi di atas kosong, offline, atau terjadi kendala server eksternal. Sediakan format JSON array yang benar.
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-850/60">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-brand-500 hover:bg-brand-600 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition duration-150 cursor-pointer"
                >
                  {saving ? (
                    <Clock className="w-4.5 h-4.5 animate-spin" />
                  ) : (
                    <Send className="w-4.5 h-4.5 transition group-hover:translate-x-0.5" />
                  )}
                  {saving ? 'Menyimpan...' : 'Simpan Konfigurasi Agen CS AI'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
