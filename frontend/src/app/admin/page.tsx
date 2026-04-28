'use client';

import React, { useEffect, useState } from 'react';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
      const [statsRes, reportsRes] = await Promise.all([
        fetch(`${backendUrl}/api/admin/stats`),
        fetch(`${backendUrl}/api/admin/reports`)
      ]);
      setStats(await statsRes.json());
      setReports(await reportsRes.json());
    } catch (err) {
      console.error('Admin fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleBan = async (ipHash: string) => {
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'}/api/admin/ban`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ipHash })
      });
      fetchAdminData();
  };

  if (loading) return <div className="p-10 text-white min-h-screen bg-[#0c1324] font-body">Initializing secure admin console...</div>;

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
            display: inline-block;
            vertical-align: middle;
        }
        body {
            background-color: #0c1324;
            color: #dce1fb;
        }
      `}} />
      <div className="font-body selection:bg-primary-container selection:text-on-primary-container bg-surface-dim min-h-screen text-on-surface">
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet"/>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>

        {/* SideNavBar */}
        <aside className="h-screen w-64 fixed left-0 top-0 overflow-y-auto bg-surface-container-low shadow-2xl flex flex-col p-4 font-headline antialiased tracking-tight z-50">
          <div className="mb-10 px-2 flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#6366f1] flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-sm" style={{fontVariationSettings: "'FILL' 1"}}>terminal</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tighter text-white">StrangerChat</h1>
              <p className="text-[10px] text-slate-400 border-t border-slate-800 mt-1 uppercase tracking-widest pt-1">Admin Console</p>
            </div>
          </div>
          
          <nav className="flex-1 space-y-1">
            <a className="flex items-center gap-3 px-4 py-3 text-white bg-[#6366f1] rounded-md font-semibold transition-transform scale-95 active:scale-100" href="#">
              <span className="material-symbols-outlined">dashboard</span>
              <span>Overview</span>
            </a>
            <a className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-all duration-200 hover:bg-slate-800" href="#">
              <span className="material-symbols-outlined">gavel</span>
              <span>Moderation</span>
            </a>
            <a className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-all duration-200 hover:bg-slate-800" href="#">
              <span className="material-symbols-outlined">group</span>
              <span>User Management</span>
            </a>
            <a className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-all duration-200 hover:bg-slate-800" href="#">
              <span className="material-symbols-outlined">settings</span>
              <span>Settings</span>
            </a>
          </nav>

          <div className="mt-auto pt-4 border-t border-slate-800 space-y-1">
            <a className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-all duration-200 hover:bg-slate-800" href="#">
              <span className="material-symbols-outlined">help</span>
              <span>Support</span>
            </a>
            <a className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-all duration-200 hover:bg-slate-800" href="#">
              <span className="material-symbols-outlined">logout</span>
              <span>Logout</span>
            </a>
          </div>
        </aside>

        {/* TopAppBar */}
        <header className="fixed top-0 right-0 left-64 h-16 z-40 flex items-center justify-between px-8 bg-surface-dim/60 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-500">
                <span className="material-symbols-outlined text-sm">search</span>
              </span>
              <input className="bg-surface-container-highest/50 border border-white/5 rounded-md pl-10 pr-4 py-1.5 text-[10px] tracking-widest font-headline uppercase focus:ring-1 focus:ring-[#6366f1] w-64 text-white placeholder-slate-600 transition-all outline-none" placeholder="SEARCH SYSTEM..." type="text"/>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="font-headline uppercase tracking-[0.1em] text-[10px] text-[#6366f1] font-bold">System Online</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <button className="text-slate-400 hover:text-white transition-opacity opacity-80 hover:opacity-100">
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <button className="text-slate-400 hover:text-white transition-opacity opacity-80 hover:opacity-100">
                <span className="material-symbols-outlined">security</span>
              </button>
              <button className="text-slate-400 hover:text-white transition-opacity opacity-80 hover:opacity-100">
                <span className="material-symbols-outlined">dns</span>
              </button>
            </div>
            <div className="h-8 w-[1px] bg-slate-800"></div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="font-headline uppercase tracking-[0.1em] text-[10px] text-white font-bold">StrangerChat ADMIN</div>
                <div className="font-headline text-[10px] text-slate-500">Superuser</div>
              </div>
              <div className="w-8 h-8 rounded-md bg-gradient-to-tr from-blue-500 to-purple-500 ring-1 ring-slate-700"></div>
            </div>
          </div>
        </header>

        {/* Main Content Canvas */}
        <main className="ml-64 pt-24 p-8 min-h-screen bg-surface-dim">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-4xl font-headline font-extrabold tracking-tighter text-white">System Monitor</h2>
              <p className="text-on-surface-variant font-label text-sm mt-1">Real-time engagement and infrastructure health metrics.</p>
            </div>
            <button onClick={fetchAdminData} className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-highest border border-outline-variant/20 rounded-md hover:bg-surface-variant transition-all group">
              <span className="material-symbols-outlined text-primary text-sm group-hover:rotate-180 transition-transform duration-500">refresh</span>
              <span className="text-[11px] font-headline font-bold uppercase tracking-widest text-primary">Refresh System</span>
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            <div className="bg-surface-container-low p-6 rounded-md group hover:bg-surface-container transition-all relative overflow-hidden shadow-lg border border-white/5">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-6xl">group</span>
              </div>
              <div className="flex flex-col h-full justify-between relative z-10">
                <span className="text-[10px] font-headline font-bold uppercase tracking-[0.2em] text-on-surface-variant">Online Users</span>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-5xl font-headline font-extrabold text-white">{stats?.onlineCount || 0}</span>
                </div>
              </div>
            </div>
            <div className="bg-surface-container-low p-6 rounded-md group hover:bg-surface-container transition-all relative overflow-hidden shadow-lg border border-white/5">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-6xl">chat_bubble</span>
              </div>
              <div className="flex flex-col h-full justify-between relative z-10">
                <span className="text-[10px] font-headline font-bold uppercase tracking-[0.2em] text-on-surface-variant">Active Chats</span>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-5xl font-headline font-extrabold text-white">{stats?.activeRooms || 0}</span>
                </div>
              </div>
            </div>
            <div className="bg-surface-container-low p-6 rounded-md group hover:bg-surface-container transition-all relative overflow-hidden shadow-lg border border-white/5">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-6xl">hourglass_empty</span>
              </div>
              <div className="flex flex-col h-full justify-between relative z-10">
                <span className="text-[10px] font-headline font-bold uppercase tracking-[0.2em] text-on-surface-variant">Waiting Queue</span>
                <div className="mt-4">
                  <span className="text-5xl font-headline font-extrabold text-white">{stats?.waitingQueue || 0}</span>
                </div>
              </div>
            </div>
            <div className="bg-surface-container-low p-6 rounded-md border border-[#6366f1]/20 group hover:bg-surface-container transition-all relative overflow-hidden shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-[#6366f1]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex flex-col h-full justify-between relative z-10">
                <span className="text-[10px] font-headline font-bold uppercase tracking-[0.2em] text-[#6366f1]">System Uptime</span>
                <div className="mt-4">
                  <span className="text-4xl font-headline font-extrabold text-white">{Math.floor((stats?.uptime || 0) / 60)}m</span>
                  <div className="mt-2 w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div className="bg-[#6366f1] h-full" style={{ width: '99.9%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Moderation Table Section */}
          <div className="bg-surface-container-low rounded-md overflow-hidden border border-outline-variant/10 shadow-xl">
            <div className="px-8 py-5 flex items-center justify-between border-b border-outline-variant/10">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#6366f1]">gavel</span>
                <h3 className="text-sm font-headline font-bold uppercase tracking-widest text-white">Live Moderation Queue</h3>
              </div>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-surface-container-highest rounded-md text-[10px] font-bold text-on-surface-variant border border-outline-variant/20 uppercase tracking-tighter">Filter: All Reports</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-highest/30">
                    <th className="px-8 py-4 text-[10px] font-headline font-bold uppercase tracking-widest text-slate-500">Time</th>
                    <th className="px-8 py-4 text-[10px] font-headline font-bold uppercase tracking-widest text-slate-500">Reporter</th>
                    <th className="px-8 py-4 text-[10px] font-headline font-bold uppercase tracking-widest text-slate-500">Offender (IP Hash)</th>
                    <th className="px-8 py-4 text-[10px] font-headline font-bold uppercase tracking-widest text-slate-500">Reason</th>
                    <th className="px-8 py-4 text-[10px] font-headline font-bold uppercase tracking-widest text-slate-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {reports.map((r: any) => (
                    <tr key={r.id} className="group hover:bg-surface-container-highest/20 transition-colors">
                      <td className="px-8 py-5 text-xs font-mono text-slate-400">{new Date(r.created_at).toLocaleTimeString()}</td>
                      <td className="px-8 py-5">
                        <span className="text-xs font-mono bg-surface-container-highest px-2 py-1 rounded text-on-surface">{r.reporter_id.slice(0, 8)}...</span>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-xs font-mono text-primary">{r.reported_user_id.slice(0, 12)}...</span>
                      </td>
                      <td className="px-8 py-5">
                        <span className="px-2.5 py-1 rounded-full bg-error-container/20 text-error text-[10px] font-bold uppercase tracking-tight">{r.reason}</span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button onClick={() => handleBan(r.reported_user_id)} className="px-4 py-1.5 bg-error-container text-on-error-container rounded-md text-[10px] font-bold uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all">
                            Ban User
                        </button>
                      </td>
                    </tr>
                  ))}
                  {reports.length === 0 && (
                     <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-500 italic">No reports found. System is clean.</td>
                     </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-8 py-4 bg-surface-container-highest/10 flex items-center justify-between">
              <span className="text-[10px] font-headline text-slate-500 uppercase tracking-widest">Showing {reports.length} results</span>
              <div className="flex gap-4">
                <button className="text-xs text-slate-500 hover:text-white transition-colors disabled:opacity-30" disabled>Previous</button>
                <button className="text-xs text-slate-500 hover:text-white transition-colors disabled:opacity-30" disabled={reports.length === 0}>Next</button>
              </div>
            </div>
          </div>

          {/* Secondary Information Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-10">
            <div className="lg:col-span-2 bg-surface-container-low p-6 rounded-md h-64 border border-outline-variant/10 relative overflow-hidden shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] font-headline font-bold uppercase tracking-[0.2em] text-on-surface-variant">Global Traffic Activity</span>
                <span className="text-[10px] font-headline font-bold uppercase text-[#6366f1]">Live Stream</span>
              </div>
              <div className="flex items-end justify-between h-32 gap-1 px-4">
                {/* Faux Bar Chart */}
                {[40, 60, 30, 55, 80, 70, 95, 65, 45, 50, 35, 40].map((h, i) => (
                  <div key={i} className={'w-full rounded-t'} style={{ height: `${h}%`, backgroundColor: h >= 65 ? (h >= 90 ? '#6366f1' : 'rgba(99,102,241,0.6)') : '#1e293b' }}></div>
                ))}
              </div>
            </div>
            <div className="bg-[#151b2d] shadow-xl rounded-md p-6 border border-[#6366f1]/10 flex flex-col justify-center items-center text-center">
              <div className="w-16 h-16 rounded-full bg-[#6366f1]/10 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[#6366f1] text-3xl">shield_with_heart</span>
              </div>
              <h4 className="text-white font-headline font-bold text-lg">System Integrity</h4>
              <p className="text-slate-400 text-xs mt-2 font-body px-4 leading-relaxed">Infrastructure operating within nominal parameters. AI moderation active and learning from current sessions.</p>
              <div className="mt-6 flex gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                <span className="w-2 h-2 rounded-full bg-slate-700"></span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
