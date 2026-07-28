import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, ShieldCheck, CheckCircle2, RefreshCw, Filter, Sliders, Bell, Compass, Calendar, Sparkles, X } from 'lucide-react';

export default function AlertsManager({ user, onAlertsCountChanged, onNavigateToTab }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [toastMessage, setToastMessage] = useState(null);
  const [activePage, setActivePage] = useState(1);
  const [resolvedPage, setResolvedPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  const cardsRef = useRef(null);

  // Custom Detail Modal states
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [officers, setOfficers] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [deployingOfficerId, setDeployingOfficerId] = useState('');
  const [deployLoading, setDeployLoading] = useState(false);
  const [deploymentShift, setDeploymentShift] = useState('Day');

  // Confirmation modal state: { type: 'single'|'all', alertId, alertTitle }
  const [confirmModal, setConfirmModal] = useState(null);

  // Sliders UI states
  const [sliderSpike, setSliderSpike] = useState(10);
  const [sliderHotspot, setSliderHotspot] = useState(6);
  const [sliderPatrol, setSliderPatrol] = useState(0.3);

  // Fetch alerts from API
  const fetchAlerts = () => {
    setLoading(true);
    fetch('http://127.0.0.1:8000/api/v1/alerts')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAlerts(data);
          // Notify parent of unacknowledged alert counts
          const unacked = data.filter(a => !a.acknowledged).length;
          if (typeof onAlertsCountChanged === 'function') {
            onAlertsCountChanged(unacked);
          }
        }
      })
      .catch(err => console.error("Failed to load alerts:", err))
      .finally(() => setLoading(false));
  };

  const fetchRosterAndBarangays = () => {
    fetch('http://127.0.0.1:8000/api/v1/officers')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setOfficers(data);
      })
      .catch(err => console.error("Failed to load officers:", err));

    fetch('http://127.0.0.1:8000/api/v1/barangays?year=2025')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setBarangays(data);
      })
      .catch(err => console.error("Failed to load barangays:", err));
  };

  useEffect(() => {
    fetchAlerts();
    fetchRosterAndBarangays();
  }, []);

  // Handle single acknowledge
  const handleAcknowledge = (id) => {
    fetch(`http://127.0.0.1:8000/api/v1/alerts/${id}/acknowledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ user: user?.name || 'Chief of Police' })
    })
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          showToast("Alert acknowledged successfully.");
          fetchAlerts();
        }
      })
      .catch(err => console.error("Acknowledge call failed:", err));
  };

  // Quick Deploy Officer to the alert's barangay sector
  const handleDeployOfficer = () => {
    if (!deployingOfficerId || !selectedAlert) return;
    const officer = officers.find(o => String(o.id) === String(deployingOfficerId));
    if (!officer) return;

    setDeployLoading(true);
    fetch(`http://127.0.0.1:8000/api/v1/officers/${officer.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        badge_number: officer.badge_number,
        full_name: officer.full_name,
        rank: officer.rank,
        shift: deploymentShift,
        status: officer.status,
        assigned_barangay: selectedAlert.barangay
      })
    })
      .then(res => {
        if (!res.ok) throw new Error("API failed to update assignment.");
        return res.json();
      })
      .then(() => {
        showToast(`Successfully deployed ${officer.full_name} to ${selectedAlert.barangay}!`);
        // Acknowledge the alert automatically now that the coverage gap is filled
        handleAcknowledge(selectedAlert.id);
        setSelectedAlert(null);
        fetchRosterAndBarangays();
      })
      .catch(err => {
        console.error(err);
        showToast("Error updating officer assignment.");
      })
      .finally(() => {
        setDeployLoading(false);
      });
  };

  const handleCardClick = (e, alertItem) => {
    setSelectedAlert(alertItem);
    setDeployingOfficerId('');
    setDeploymentShift(alertItem.type === 'Patrol' ? 'Evening / Night' : 'Dawn / Night');
  };

  // Handle acknowledge all
  const handleAcknowledgeAll = () => {
    const unacked = alerts.filter(a => !a.acknowledged);
    if (unacked.length === 0) return;

    const promises = unacked.map(a => 
      fetch(`http://127.0.0.1:8000/api/v1/alerts/${a.id}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: user?.name || 'Chief of Police' })
      })
    );

    Promise.all(promises)
      .then(() => {
        showToast("All active alerts marked as resolved.");
        fetchAlerts();
      })
      .catch(err => console.error("Acknowledge all failed:", err));
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filteredAlerts = alerts.filter(a => {
    const matchSev = filterSeverity === 'all' || a.severity.toLowerCase() === filterSeverity.toLowerCase();
    const matchType = filterType === 'all' || a.type.toLowerCase() === filterType.toLowerCase();
    return matchSev && matchType;
  });

  const activeAlerts   = filteredAlerts.filter(a => !a.acknowledged);
  const resolvedAlerts = filteredAlerts.filter(a =>  a.acknowledged);

  // Reset to page 1 when filters change
  const totalActivePages   = Math.max(1, Math.ceil(activeAlerts.length / ITEMS_PER_PAGE));
  const totalResolvedPages = Math.max(1, Math.ceil(resolvedAlerts.length / ITEMS_PER_PAGE));
  const pagedActive   = activeAlerts.slice((activePage - 1) * ITEMS_PER_PAGE, activePage * ITEMS_PER_PAGE);
  const pagedResolved = resolvedAlerts.slice((resolvedPage - 1) * ITEMS_PER_PAGE, resolvedPage * ITEMS_PER_PAGE);

  // Helper: render compact pagination bar
  const Pagination = ({ page, total, onChangePage }) => {
    if (total <= 1) return null;
    return (
      <div className="flex items-center justify-center gap-1.5 pt-4">
        <button
          onClick={() => onChangePage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          ‹ Prev
        </button>
        {Array.from({ length: total }, (_, i) => i + 1).map(p => (
          <button
            key={p}
            onClick={() => onChangePage(p)}
            className={`w-7 h-7 rounded-lg text-[10px] font-bold border transition-all ${
              p === page
                ? 'bg-brand-600 border-brand-500 text-slate-50 shadow-sm'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onChangePage(Math.min(total, page + 1))}
          disabled={page === total}
          className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          Next ›
        </button>
      </div>
    );
  };
  
  // Count counts for KPIs
  const totalActive = alerts.filter(a => !a.acknowledged).length;
  const totalCritical = alerts.filter(a => !a.acknowledged && a.severity === 'CRITICAL').length;
  const totalResolved = alerts.filter(a => a.acknowledged).length;

  // Relative Time helper
  const getRelativeTime = (dateStr) => {
    let isoDate = dateStr;
    if (isoDate && !isoDate.endsWith('Z') && !isoDate.includes('+')) {
      isoDate = isoDate.replace(' ', 'T') + 'Z';
    }
    const d = new Date(isoDate);
    const diff = Math.floor((Date.now() - d) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  };

  // Mock Predictive Alerts Data
  const predictiveAlerts = [
    {
      id: 'p1',
      severity: 'High',
      colorClass: 'text-orange-450 border-orange-500/20 bg-orange-500/5',
      indicatorClass: 'bg-orange-500',
      title: 'Weekend Crime Surge',
      target: 'Commercial Districts',
      desc: 'Historical patterns indicate a 28-35% rise in incidents on Fri-Sun in key sectors. Pre-position 4 additional patrol units by Friday 6PM.',
      confidence: 87
    },
    {
      id: 'p2',
      severity: 'Medium',
      colorClass: 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5',
      indicatorClass: 'bg-yellow-500',
      title: 'Payday Theft Surge',
      target: 'TETUAN & CANELAR',
      desc: 'Association rule mining detects a co-occurrence of Theft + Evening Hours + Payday weeks. Recommend doubling foot patrols this 15th.',
      confidence: 79
    },
    {
      id: 'p3',
      severity: 'Medium',
      colorClass: 'text-violet-400 border-violet-500/20 bg-violet-500/5',
      indicatorClass: 'bg-violet-500',
      title: 'Late-Night Drug Activity',
      target: 'SANGALI / CALARIAN',
      desc: 'Pattern analysis indicates elevated drug-related incidents (10PM-2AM) during mid-month periods. Recommend tactical team readiness.',
      confidence: 72
    }
  ];

  return (
    <div className="p-8 max-w-[1600px] w-full mx-auto space-y-6">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Alerts & Warnings Engine</h2>
          <p className="text-xs text-slate-500">Live operational alerts and rule-based dispatch warnings</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchAlerts}
            className="p-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center justify-center cursor-pointer"
            title="Refresh Feed"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Critical Live Alert Banner */}
      {totalCritical > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 bg-rose-500 rounded-full shrink-0"></span>
            <p className="text-xs text-rose-300 font-semibold leading-relaxed">
              <strong>🔴 LIVE ALERT:</strong> Critical crime activity detected in active sectors. Immediate tactical reinforcement is recommended.
            </p>
          </div>
          <button 
            onClick={() => onNavigateToTab('recommendations')}
            className="text-[10px] font-bold text-rose-400 hover:text-rose-300 uppercase tracking-wider"
          >
            View Recommendations &rarr;
          </button>
        </div>
      )}

      {/* 4 Summary Stats Card Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Active Alerts</span>
            <span className="text-2xl font-bold text-brand-400 block mt-1">{totalActive}</span>
          </div>
          <div className="w-10 h-10 bg-brand-500/10 text-brand-400 rounded-xl flex items-center justify-center">
            <Bell size={20} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider">Critical Alerts</span>
            <span className="text-2xl font-bold text-rose-450 block mt-1">{totalCritical}</span>
          </div>
          <div className="w-10 h-10 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center">
            <AlertTriangle size={20} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">Resolved Alerts</span>
            <span className="text-2xl font-bold text-emerald-400 block mt-1">{totalResolved}</span>
          </div>
          <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[9px] font-bold text-violet-500 uppercase tracking-wider">AI Forecasts</span>
            <span className="text-2xl font-bold text-violet-400 block mt-1">3</span>
          </div>
          <div className="w-10 h-10 bg-violet-500/10 text-violet-400 rounded-xl flex items-center justify-center">
            <Compass size={20} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: ACTIVE ALERTS FEED */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Header filters */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap gap-3 items-center justify-between shadow-lg">
            <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold">
              <Filter size={14} className="text-slate-500" /> Filters
            </div>
            <div className="flex gap-2">
              <select 
                value={filterSeverity} 
                onChange={(e) => { setFilterSeverity(e.target.value); setActivePage(1); setResolvedPage(1); }}
                className="bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-1.5 text-xs text-slate-350 outline-none"
              >
                <option value="all">All Severities</option>
                <option value="critical">🔴 Critical</option>
                <option value="high">🟠 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>

              <select 
                value={filterType} 
                onChange={(e) => { setFilterType(e.target.value); setActivePage(1); setResolvedPage(1); }}
                className="bg-slate-950 border border-slate-850 rounded-xl px-2.5 py-1.5 text-xs text-slate-350 outline-none"
              >
                <option value="all">All Alert Types</option>
                <option value="spike">Spike Alerts</option>
                <option value="hotspot">Hotspot Alerts</option>
                <option value="patrol">Patrol Coverage</option>
                <option value="predictive">Predictive AI</option>
              </select>
            </div>
          </div>

          {/* Cards List container */}
          <div ref={cardsRef} className="space-y-4">
            {activeAlerts.length === 0 && resolvedAlerts.length === 0 ? (
              <div className="bg-slate-900 border border-slate-850 rounded-3xl p-16 text-center text-slate-550 shadow-xl">
                <ShieldCheck size={32} className="text-emerald-500 mx-auto block mb-3 animate-bounce" />
                <h4 className="font-bold text-slate-300">All Clear</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">No outstanding public safety alerts logged at this time.</p>
              </div>
            ) : (
              <>
                {/* Active Alerts — paginated */}
                {pagedActive.map(a => {
                  const isCritical = a.severity === 'CRITICAL';
                  const isHigh     = a.severity === 'HIGH';
                  const isMedium   = a.severity === 'MEDIUM';

                  return (
                    <div 
                      key={a.id} 
                      onClick={(e) => handleCardClick(e, a)}
                      className={`border rounded-2xl p-5 shadow-lg flex gap-4 transition-all duration-300 relative overflow-hidden cursor-pointer hover:border-slate-500 hover:scale-[1.005] hover:bg-slate-900/30`}
                      style={{
                        borderColor: isCritical ? 'rgba(239,68,68,0.22)' : isHigh ? 'rgba(249,115,22,0.2)' : isMedium ? 'rgba(234,179,8,0.2)' : 'rgba(34,197,94,0.15)',
                        background:  isCritical ? 'rgba(239,68,68,0.04)' : isHigh ? 'rgba(249,115,22,0.03)' : isMedium ? 'rgba(234,179,8,0.02)' : 'rgba(34,197,94,0.02)'
                      }}
                    >
                      <div className="absolute top-0 left-0 bottom-0 w-1.5" style={{
                        backgroundColor: isCritical ? '#ef4444' : isHigh ? '#f97316' : isMedium ? '#eab308' : '#22c55e'
                      }}></div>
                      
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5`} style={{
                        backgroundColor: isCritical ? 'rgba(239,68,68,0.1)' : isHigh ? 'rgba(249,115,22,0.1)' : isMedium ? 'rgba(234,179,8,0.1)' : 'rgba(34,197,94,0.1)',
                        color: isCritical ? '#ef4444' : isHigh ? '#f97316' : isMedium ? '#eab308' : '#22c55e'
                      }}>
                        <AlertTriangle size={18} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-4">
                          <h4 className="text-sm font-bold text-slate-100 truncate pr-6">{a.title}</h4>
                          <span className="text-[10px] text-slate-500 font-mono shrink-0">{getRelativeTime(a.created_at)}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">{a.message}</p>
                        
                        <div className="flex flex-wrap gap-2.5 items-center mt-4">
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-950 border border-slate-850 uppercase tracking-wider text-slate-400">
                            {a.type}
                          </span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                            isCritical ? 'bg-rose-500/15 border-rose-500/25 text-rose-400' :
                            isHigh ? 'bg-amber-500/15 border-amber-500/25 text-amber-400' :
                            'bg-sky-500/15 border-sky-500/25 text-sky-400'
                          }`}>
                            {a.severity} Severity
                          </span>
                          {a.barangay && (
                            <span className="text-[10px] text-slate-500 flex items-center gap-1 font-semibold">
                              Sector: {a.barangay}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col justify-between items-end border-l border-slate-850/50 pl-4 gap-4">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setConfirmModal({ type: 'single', alertId: a.id, alertTitle: a.title }); }}
                          className="bg-brand-600 hover:bg-brand-500 text-slate-50 font-semibold text-[10px] rounded-lg px-3 py-2 shadow transition-all whitespace-nowrap cursor-pointer"
                        >
                          Resolve
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onNavigateToTab('map', a.barangay); }}
                          className="text-[10px] font-bold text-slate-455 hover:text-slate-300 uppercase tracking-wider whitespace-nowrap cursor-pointer"
                        >
                          Map View
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Active pagination */}
                <Pagination page={activePage} total={totalActivePages} onChangePage={(p) => {
                  setActivePage(p);
                  if (cardsRef.current) {
                    const top = cardsRef.current.getBoundingClientRect().top + window.scrollY - 80;
                    window.scrollTo({ top, behavior: 'smooth' });
                  }
                }} />

                {/* Active count context */}
                {activeAlerts.length > 0 && (
                  <p className="text-center text-[10px] text-slate-600 font-mono">
                    Showing {Math.min((activePage - 1) * ITEMS_PER_PAGE + 1, activeAlerts.length)}–{Math.min(activePage * ITEMS_PER_PAGE, activeAlerts.length)} of {activeAlerts.length} active alerts
                  </p>
                )}

                {/* Resolved Section Divider */}
                {resolvedAlerts.length > 0 && (
                  <div className="pt-6 pb-2 border-b border-slate-850 flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <CheckCircle2 size={12} className="text-emerald-500" /> Resolved Archive ({resolvedAlerts.length})
                  </div>
                )}

                {/* Resolved list — paginated */}
                {pagedResolved.map(a => (
                  <div key={a.id} className="bg-slate-900/30 border border-slate-850 rounded-xl p-4 flex gap-4 opacity-50 relative">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                      <ShieldCheck size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-xs font-bold text-slate-350 truncate">{a.title}</h5>
                      <p className="text-[10px] text-slate-500 mt-1 truncate">{a.message}</p>
                      <div className="flex items-center gap-2 mt-2.5 text-[8px] font-bold text-emerald-500 uppercase">
                        <span>✓ Resolved by {a.acknowledged_by || 'Admin'}</span>
                        <span>·</span>
                        <span className="font-mono text-slate-550">{new Date(a.acknowledged_at).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Resolved pagination */}
                <Pagination page={resolvedPage} total={totalResolvedPages} onChangePage={(p) => {
                  setResolvedPage(p);
                  if (cardsRef.current) {
                    const top = cardsRef.current.getBoundingClientRect().top + window.scrollY - 80;
                    window.scrollTo({ top, behavior: 'smooth' });
                  }
                }} />

                {resolvedAlerts.length > 0 && (
                  <p className="text-center text-[10px] text-slate-600 font-mono">
                    Showing {Math.min((resolvedPage - 1) * ITEMS_PER_PAGE + 1, resolvedAlerts.length)}–{Math.min(resolvedPage * ITEMS_PER_PAGE, resolvedAlerts.length)} of {resolvedAlerts.length} resolved
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: TIMELINE & PREDICTIVE SETTINGS */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* AI Predictive Warnings Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-850">
              <Sparkles size={16} className="text-violet-400" />
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">AI Forecast Warnings</h3>
            </div>
            
            <div className="space-y-4">
              {predictiveAlerts.map(p => (
                <div key={p.id} className={`p-4 rounded-xl border ${p.colorClass} space-y-2`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-widest">{p.title}</span>
                    <span className="text-[8px] font-bold bg-slate-950 px-2 py-0.5 rounded-full text-slate-400">
                      {p.confidence}% confidence
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-300">{p.desc}</p>
                  <div className="flex justify-between items-center text-[9px] text-slate-500 font-semibold pt-1">
                    <span>Target: {p.target}</span>
                    <span className="flex items-center gap-1">
                      <Calendar size={10} /> Forecasted
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alert Slider Configurations */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-850">
              <Sliders size={16} className="text-slate-400" />
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Trigger Threshold Config</h3>
            </div>
            
            <div className="space-y-4 text-xs">
              {/* Slider 1 */}
              <div>
                <div className="flex justify-between text-slate-400 font-semibold mb-1">
                  <span>Incident Spike Threshold:</span>
                  <span className="text-brand-400 font-bold">{sliderSpike} incidents</span>
                </div>
                <input 
                  type="range" 
                  min="3" 
                  max="30"
                  value={sliderSpike} 
                  onChange={(e) => setSliderSpike(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-brand-500 focus:outline-none"
                />
              </div>

              {/* Slider 2 */}
              <div>
                <div className="flex justify-between text-slate-400 font-semibold mb-1">
                  <span>Hotspot Cluster Density:</span>
                  <span className="text-rose-450 font-bold">{sliderHotspot} points</span>
                </div>
                <input 
                  type="range" 
                  min="2" 
                  max="20"
                  value={sliderHotspot} 
                  onChange={(e) => setSliderHotspot(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-rose-500 focus:outline-none"
                />
              </div>

              {/* Slider 3 */}
              <div>
                <div className="flex justify-between text-slate-400 font-semibold mb-1">
                  <span>Patrol Gap Alert Ratio:</span>
                  <span className="text-amber-450 font-bold">{sliderPatrol.toFixed(1)} ratio</span>
                </div>
                <input 
                  type="range" 
                  min="0.1" 
                  max="1.0" 
                  step="0.1"
                  value={sliderPatrol} 
                  onChange={(e) => setSliderPatrol(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
                />
              </div>

              <p className="text-[10px] text-slate-500 leading-relaxed pt-2">
                *Adjusting these config parameters calibrates the neural model mapping threshold settings triggers.*
              </p>
            </div>
          </div>

        </div>

      </div>

      {/* ✅ RESOLVE / ACKNOWLEDGE CONFIRMATION MODAL */}
      {confirmModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setConfirmModal(null)}
              className="absolute top-5 right-5 text-slate-500 hover:text-slate-300 p-1.5 hover:bg-slate-850 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Confirm Action</span>
                <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                  {confirmModal.type === 'all' ? 'Resolve All Alerts?' : 'Resolve Alert?'}
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              {confirmModal.type === 'all'
                ? `This will mark all ${totalActive} active alerts as resolved. This action cannot be undone.`
                : (<>Are you sure you want to resolve <strong className="text-slate-200">{confirmModal.alertTitle}</strong>? This action cannot be undone.</>)
              }
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmModal.type === 'all') handleAcknowledgeAll();
                  else handleAcknowledge(confirmModal.alertId);
                  setConfirmModal(null);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-slate-50 font-semibold rounded-xl px-4 py-2 text-xs shadow transition-all cursor-pointer"
              >
                {confirmModal.type === 'all' ? 'Resolve All' : 'Resolve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Success Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-emerald-500/10 border border-emerald-500/30 text-emerald-450 px-5 py-3.5 rounded-xl shadow-2xl z-50 animate-[fadeInUp_0.3s_ease] backdrop-blur-md flex items-center gap-2.5 text-xs font-semibold">
          <CheckCircle2 size={16} />
          {toastMessage}
        </div>
      )}

      {/* 📋 DETAILED ALERT INFORMATION & QUICK DEPLOYMENT MODAL */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative flex flex-col gap-5">
            <button 
              onClick={() => setSelectedAlert(null)}
              className="absolute top-5 right-5 text-slate-500 hover:text-slate-300 p-1.5 hover:bg-slate-850 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Alert Detail Audit</span>
                <h3 className="text-sm font-bold text-slate-100 mt-0.5 whitespace-normal pr-6">{selectedAlert.title}</h3>
                <span className="text-[10px] text-slate-500 font-mono mt-1 block">Logged {getRelativeTime(selectedAlert.created_at)}</span>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-850 rounded-2xl p-4 space-y-3">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Operational Warning Message</span>
              <p className="text-xs text-slate-300 leading-relaxed">{selectedAlert.message}</p>
            </div>

            {/* 📊 BARANGAY ANALYSIS STATS PANEL */}
            {(() => {
              const bInfo = selectedAlert.barangay 
                ? barangays.find(b => b.name.toUpperCase() === selectedAlert.barangay.toUpperCase())
                : null;

              if (!bInfo) return null;

              const isCritical = bInfo.risk === 'Critical';
              const isHigh     = bInfo.risk === 'High';
              const isMedium   = bInfo.risk === 'Medium';

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-slate-950/50 border border-slate-850 rounded-xl p-2.5 text-center">
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block">Total Incidents</span>
                      <span className="text-sm font-extrabold text-slate-200 mt-1 block">{bInfo.incidents} Logs</span>
                    </div>
                    <div className="bg-slate-950/50 border border-slate-850 rounded-xl p-2.5 text-center">
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block">Active Patrols</span>
                      <span className="text-sm font-extrabold text-brand-400 mt-1 block">{bInfo.officers} Officers</span>
                    </div>
                    <div className="bg-slate-950/50 border border-slate-850 rounded-xl p-2.5 text-center">
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block">Risk Level</span>
                      <span className={`text-[10px] font-extrabold mt-1.5 inline-block uppercase tracking-wider ${
                        isCritical ? 'text-rose-400' : isHigh ? 'text-amber-400' : isMedium ? 'text-yellow-400' : 'text-emerald-450'
                      }`}>{bInfo.risk}</span>
                    </div>
                    <div className="bg-slate-950/50 border border-slate-850 rounded-xl p-2.5 text-center">
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block">Trend</span>
                      <span className="text-xs font-semibold text-slate-300 mt-1 block capitalize pr-1">{bInfo.trend}</span>
                    </div>
                  </div>

                  <div className="bg-slate-950/50 border border-slate-850 rounded-2xl p-4 space-y-2">
                    <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wider block">Risk Analysis Breakdown</span>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {selectedAlert.type === 'Patrol' && (
                        `This sector has logged ${bInfo.incidents} incidents but currently has 0 active patrol officers assigned. Patrol presence is required to reduce the risk profile and lower the crime rate.`
                      )}
                      {selectedAlert.type === 'Spike' && (
                        `This area has logged ${bInfo.incidents} incidents, representing an incident spike. The current force of ${bInfo.officers} officers is insufficient to suppress the trend.`
                      )}
                      {selectedAlert.type === 'Predictive' && (
                        `Predictive analysis flags a staffing reduction relative to the incident history of this sector. Deploying active patrol officers is recommended to prevent future incident occurrences.`
                      )}
                      {selectedAlert.type !== 'Patrol' && selectedAlert.type !== 'Spike' && selectedAlert.type !== 'Predictive' && (
                        `Flags active due to incident-to-patrol ratio mismatch. Regular patrol audits recommended.`
                      )}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* 🛠️ QUICK ACTION: SELECT DEPLOYMENT TIME & OFFICER */}
            <div className="border-t border-slate-850 pt-4 space-y-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Deployment Shift / Time</label>
                  <span className="text-[9px] font-extrabold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded">
                    Recommended: {selectedAlert.type === 'Patrol' ? 'Evening / Night Shift' : 'Dawn / Night Shift'}
                  </span>
                </div>
                <select
                  value={deploymentShift}
                  onChange={(e) => setDeploymentShift(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none cursor-pointer"
                >
                  <option value="Morning / Day">☀️ Morning / Day Shift</option>
                  <option value="Afternoon / Day">☀️ Afternoon / Day Shift</option>
                  <option value="Evening / Night">🌆 Evening / Night Shift</option>
                  <option value="Dawn / Night">🌙 Dawn / Night shift</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Deploy Available (Unassigned) Officer</label>
                <select
                  value={deployingOfficerId}
                  onChange={(e) => setDeployingOfficerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none cursor-pointer max-w-full truncate"
                >
                  <option value="">-- Select Free Officer --</option>
                  {officers
                    .filter(o => o.status === 'Active' && (!o.assigned_barangay || o.assigned_barangay === 'Unassigned' || o.assigned_barangay === 'N/A' || o.assigned_barangay === ''))
                    .map(o => (
                      <option key={o.id} value={o.id} className="bg-slate-900 text-slate-100">
                        👮 {o.full_name} ({o.rank} - Current Shift: {o.shift})
                      </option>
                    ))
                  }
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-850">
              <button
                type="button"
                onClick={() => setSelectedAlert(null)}
                className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer"
              >
                Close Audit
              </button>
              <button
                type="button"
                onClick={handleDeployOfficer}
                disabled={!deployingOfficerId || deployLoading}
                className={`font-semibold px-5 py-2.5 text-xs rounded-xl transition-all shadow border text-center ${
                  !deployingOfficerId || deployLoading
                    ? 'bg-slate-200 text-slate-800 cursor-not-allowed border-slate-300'
                    : 'bg-brand-600 hover:bg-brand-500 text-slate-50 cursor-pointer border-transparent'
                }`}
              >
                {deployLoading ? 'Deploying...' : 'Deploy & Resolve'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
