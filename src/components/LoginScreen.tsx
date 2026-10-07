import React, { useState } from 'react';
import {
  Ship,
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
  HardHat,
  Anchor,
  Compass,
  Database,
  ArrowRight,
  ArrowLeft,
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { authService, DEFAULT_SHIPYARD_USERS } from '../services/authService';
import { UserProfile } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
  pendingProjectName?: string | null;
  onBackToHub?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  pendingProjectName,
  onBackToHub,
}) => {
  const [identifier, setIdentifier] = useState<string>('munthaha');
  const [password, setPassword] = useState<string>('••••••••');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!identifier.trim()) {
      setErrorMessage('Silakan masukkan Username, Email, atau NIK.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const result = authService.login(identifier, password, rememberMe);
      setIsLoading(false);
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setErrorMessage(result.message || 'Gagal masuk. Periksa kembali data login Anda.');
      }
    }, 400);
  };

  const handleQuickLogin = (user: UserProfile) => {
    setIdentifier(user.username);
    setIsLoading(true);
    setTimeout(() => {
      const loggedUser = authService.quickLogin(user.id, rememberMe);
      setIsLoading(false);
      if (loggedUser) {
        onLoginSuccess(loggedUser);
      }
    }, 300);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      {/* Background Decorative Grid and Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Top Brand Navbar */}
      <header className="relative z-10 w-full px-6 py-4 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-900/30 ring-1 ring-emerald-400/30">
            <Ship className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base text-white tracking-wide">
                SHIPYARD ERP &bull; SIMREP
              </span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                Enterprise v2.5
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Sistem Manajemen Proyek Reparasi &amp; Estimasi Galangan Kapal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onBackToHub && (
            <button
              onClick={onBackToHub}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
              <span>Kembali ke Portofolio Kapal</span>
            </button>
          )}
          <div className="hidden sm:flex items-center gap-4 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>SQLite Offline Engine Active</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>BKI &amp; ABS Class Ready</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Login Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Hero Overview */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-semibold shadow-inner">
              <HardHat className="w-4 h-4 text-emerald-400" />
              <span>Portal Terpadu Tim PPC, Pimpro &amp; Owner Rep</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Kelola Seluruh Proyek <br />
                <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                  Reparasi &amp; Docking Kapal
                </span>
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-lg">
                Solusi galangan terintegrasi untuk penyusunan Repair List, kalkulasi otomatis tonase baja, survey kerusakan offline, RAB, hingga kurva S monitoring progres kapal.
              </p>
            </div>

            {/* Feature Badges Grid */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                  <Anchor className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Multi-Kapal &amp; Portofolio</h4>
                  <p className="text-[11px] text-slate-400">Monitoring seluruh armada docking aktif di galangan</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 shrink-0">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Tonnage &amp; BOQ Dinamis</h4>
                  <p className="text-[11px] text-slate-400">Formula otomatis pelat, pipa, dan profil baja</p>
                </div>
              </div>
            </div>

            {/* Quick Profile Selector Section */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
                  Masuk Cepat Berdasarkan Peran (1-Click Demo)
                </span>
                <span className="text-[11px] text-emerald-400/80 font-mono">Pilih Akun:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {DEFAULT_SHIPYARD_USERS.slice(0, 4).map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleQuickLogin(user)}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/50 transition-all text-left group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-800 text-white font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-500/40">
                      {user.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-200 group-hover:text-emerald-300 truncate flex items-center justify-between">
                        <span>{user.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {user.title} &bull; <span className="text-emerald-400">{user.role}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Right Login Box */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl relative">
              {/* Card Header */}
              <div className="text-center space-y-1.5 pb-6 border-b border-slate-800">
                <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-1">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Autentikasi Pengguna
                </h2>
                <p className="text-xs text-slate-400">
                  {pendingProjectName
                    ? `Silakan login terlebih dahulu untuk mengakses workspace proyek ${pendingProjectName}`
                    : 'Masukkan kredensial akun galangan untuk mengakses sistem'}
                </p>
              </div>

              {/* Pending Project Alert Banner */}
              {pendingProjectName && (
                <div className="mt-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5">
                  <Ship className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Proyek Dipilih: <strong className="text-white">{pendingProjectName}</strong>. Setelah login, Anda akan langsung diarahkan ke workspace.
                  </span>
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="mt-4 p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleFormSubmit} className="space-y-4 mt-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Username / ID Karyawan (NIK)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="login-username"
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Contoh: munthaha, fadel, hendra"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/90 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 transition-all outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      Kata Sandi (Password)
                    </label>
                    <span className="text-[11px] text-slate-500">Default: bebas</span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan kata sandi..."
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-950/90 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 transition-all outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-800 text-emerald-600 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                    />
                    <span>Ingat sesi di perangkat ini</span>
                  </label>
                </div>

                <button
                  id="btn-login-submit"
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Memvalidasi Sesi...
                    </span>
                  ) : (
                    <>
                      <span>Masuk ke Galangan (SIMREP)</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Security Footnote */}
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  Sesi Terenkripsi &amp; Aman
                </span>
                <span>Standar HSE &amp; ISO 9001</span>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Yard Footer */}
      <footer className="relative z-10 w-full py-3 px-6 border-t border-slate-800/80 bg-slate-950/80 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          &copy; 2026 PT. Dock &amp; Perkapalan Indonesia - Divisi Perencanaan &amp; Pengendalian Produksi (PPC).
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span>K3 &amp; Keselamatan Kerja Utama</span>
          <span>&bull;</span>
          <span>SOP Docking Repair v4</span>
        </div>
      </footer>
    </div>
  );
};
