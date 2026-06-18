import React, { useState } from 'react';
import { Smartphone, LogOut, ShieldAlert, Cpu, Settings, Tag, AreaChart, Key, User, Edit3, X, HelpCircle, RefreshCw } from 'lucide-react';

interface NavbarProps {
  user: any;
  subPackage: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  token: string;
  onProfileUpdated: () => void;
}

export default function Navbar({ user, subPackage, activeTab, setActiveTab, onLogout, token, onProfileUpdated }: NavbarProps) {
  const [profileModal, setProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.role === 'admin';

  const menuItems = [
    { id: 'bot', label: 'Monitor Bot', icon: Cpu },
    { id: 'settings', label: 'Konfigurasi WA', icon: Settings },
    { id: 'pricing', label: 'Daftar Paket', icon: Tag },
    { id: 'analytics', label: 'Analytics Chart', icon: AreaChart, badge: 'Plus Only' },
    { id: 'keys', label: 'API Keys', icon: Key, badge: 'Plus Only' },
  ];

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileForm)
      });
      if (res.ok) {
        onProfileUpdated();
        setProfileModal(false);
        alert("Profil berhasil diperbarui!");
      } else {
        alert("Gagal memperbarui profil.");
      }
    } catch (err) {
      alert("Error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <nav className="border-b border-slate-800/50 bg-[#111114]/90 backdrop-blur-md sticky top-0 z-40" id="main-navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Branded Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-600/10 border border-brand-500/40 rounded-xl flex items-center justify-center">
              <Smartphone className="text-brand-500 w-5.5 h-5.5" />
            </div>
            <div>
              <span className="font-display font-bold text-white text-base tracking-tight block">{(import.meta.env.VITE_BRAND_NAME || 'GeekzCS') + ' WA'}</span>
              <p className="text-[9px] uppercase tracking-wider text-slate-500 font-mono leading-none">Automated CS AI Agent</p>
            </div>
          </div>

          {/* Navigation Links (Desktop) */}
          <div className="hidden md:flex items-center gap-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                    isActive ? 'bg-[#0A0A0B] text-brand-500 border border-slate-800/50' : 'text-slate-400 hover:text-slate-205 hover:bg-[#111114]/55'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[8px] bg-blue-500/10 text-blue-400 px-1 py-0.5 rounded font-mono font-normal">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
            
            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                  activeTab === 'admin' ? 'bg-rose-950/20 text-rose-400 border border-rose-900/40' : 'text-rose-500/70 hover:text-rose-400 hover:bg-rose-950/10'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Portal Admin</span>
              </button>
            )}
          </div>

          {/* Right Section: User Profile & Actions */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-semibold text-slate-200 block pr-1 leading-tight">{user?.name}</span>
              <span className="text-[10px] bg-brand-500/15 border border-brand-500/30 text-emerald-400 font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                {subPackage}
              </span>
            </div>

            <button
              onClick={() => {
                setProfileForm({ name: user?.name || '', phone: user?.phone || '' });
                setProfileModal(true);
              }}
              title="Edit Profile"
              className="p-2 border border-slate-800 hover:border-slate-700 hover:text-white rounded-lg text-slate-400 transition cursor-pointer"
            >
              <User className="w-4 h-4" />
            </button>

            <button
              onClick={onLogout}
              title="Logout"
              className="p-2 border border-slate-850 hover:bg-rose-950/20 hover:border-rose-900/40 hover:text-rose-400 rounded-lg text-slate-500 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Links (Mobile Panel) */}
      <div className="md:hidden flex items-center justify-around border-t border-slate-800/50 py-2 bg-[#111114] px-2 overflow-x-auto gap-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 p-1 rounded transition text-[10px] whitespace-nowrap px-2 cursor-pointer ${
                isActive ? 'text-brand-500 font-semibold' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
        {isAdmin && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex flex-col items-center gap-1 p-1 text-[10px] whitespace-nowrap px-2 cursor-pointer ${
              activeTab === 'admin' ? 'text-rose-400 font-semibold' : 'text-rose-600/70'
            }`}
          >
            <ShieldAlert className="w-4.5 h-4.5" /> <span>Admin</span>
          </button>
        )}
      </div>

      {/* Profile Modal */}
      {profileModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111114] border border-slate-800/50 rounded-2xl w-full max-w-sm p-6 relative space-y-6">
            <button
              onClick={() => setProfileModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-display font-bold text-white">Perbarui Profil Anda</h3>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-400 block font-mono">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full bg-[#0A0A0B] border border-slate-800/50 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] text-slate-400 block font-mono">Nomor Handphone (Akun)</label>
                <input
                  type="text"
                  placeholder="cth: 628123456789"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full bg-[#0A0A0B] border border-slate-800/50 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-800 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Edit3 className="w-4 h-4" />
                )}
                Simpan Perubahan
              </button>
            </form>
          </div>
        </div>
      )}
    </nav>
  );
}
