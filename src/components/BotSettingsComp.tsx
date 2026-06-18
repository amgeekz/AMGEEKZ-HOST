import React, { useState } from 'react';
import { ToggleLeft, ToggleRight, Plus, Trash2, Key, HelpCircle, FileText, Send, Clock, Globe, ShieldAlert } from 'lucide-react';

interface BotSettingsCompProps {
  settings: any;
  subPackage: string;
  onUpdate: (updatedSettings: any) => Promise<any>;
  token: string;
}

export default function BotSettingsComp({ settings, subPackage, onUpdate, token }: BotSettingsCompProps) {
  const [activeTab, setActiveTab] = useState<'keyword' | 'template' | 'schedule' | 'webhook'>('keyword');
  const [saving, setSaving] = useState(false);
  
  // Local forms state
  const [keywordForm, setKeywordForm] = useState({ keyword: '', response: '' });
  const [templateForm, setTemplateForm] = useState({ name: '', content: '' });
  const [scheduleForm, setScheduleForm] = useState({ recipient: '', message: '', time: '08:00', daily: true });
  const [webhookUrl, setWebhookUrl] = useState(settings?.webhookUrl || '');

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
      </div>
    </div>
  );
}
