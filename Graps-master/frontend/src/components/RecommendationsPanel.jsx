import React, { useState, useMemo, useEffect } from 'react';
import { ShieldCheck, Printer, Check, Star, AlertCircle, Cpu, Clock, Tag } from 'lucide-react';

export default function RecommendationsPanel({ points, onNavigateToTab }) {
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [implementedRecos, setImplementedRecos] = useState(new Set());
  const [toastMessage, setToastMessage] = useState(null);

  // Dynamic Alert Integration State
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Confirmation Modal State
  const [selectedReco, setSelectedReco] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [printingId, setPrintingId] = useState(null);

  const handlePrintSingle = (e, id) => {
    e.stopPropagation();
    setPrintingId(id);
    setTimeout(() => {
      window.print();
      setPrintingId(null);
    }, 100);
  };

  // Fetch active alerts on component mount
  useEffect(() => {
    setLoading(true);
    fetch('http://127.0.0.1:8000/api/v1/alerts')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Filter to show unacknowledged alerts as dynamic recommendations
          setAlerts(data.filter(a => !a.acknowledged));
        }
      })
      .catch(err => console.error("Failed to load alerts in recommendations:", err))
      .finally(() => setLoading(false));
  }, []);

  // Identify top 5 barangays dynamically to embed in recommendation descriptions
  const topBarangays = useMemo(() => {
    const counts = {};
    points.forEach(p => {
      if (p.barangay) {
        counts[p.barangay] = (counts[p.barangay] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);
  }, [points]);

  // Fallback names if database is empty
  const brgy1 = topBarangays[0] || 'TETUAN';
  const brgy2 = topBarangays[1] || 'SANGALI';
  const brgy3 = topBarangays[2] || 'CANELAR';
  const brgy4 = topBarangays[3] || 'MAMPANG';
  const brgy5 = topBarangays[4] || 'CALARIAN';

  // Master recommendation list (seeded with real dynamic database sectors)
  const staticRecommendations = useMemo(() => [
    {
      id: 'static-1',
      priority: 'CRITICAL',
      title: 'Increase Patrol Frequency in Active Sectors',
      desc: `Deploy double-officer foot patrols immediately in the high-density sectors of ${brgy1} and ${brgy2} to deter recurring incidents.`,
      basis: 'Crime Frequency Density & Spatial ClusteredCentroids',
      urgency: 'Immediate',
      iconClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      badgeClass: 'bg-rose-500/10 border-rose-500/35 text-rose-400',
      tags: ['#Patrol', `#${brgy1}`, `#${brgy2}`, '#Tactical'],
      targetTab: 'deployment'
    },
    {
      id: 'static-2',
      priority: 'HIGH',
      title: 'Deploy Tactical Officers During Peak Crime Hours',
      desc: `Deploy mobile response vehicles in ${brgy2} and ${brgy3} between 10:00 AM and 4:00 PM, which corresponds to the temporal crime peak.`,
      basis: 'Association Rule Mining (Temporal Peaks) & Trend Extrapolations',
      urgency: 'Within 48 Hours',
      iconClass: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      badgeClass: 'bg-orange-500/10 border-orange-500/35 text-orange-400',
      tags: ['#PeakHours', `#${brgy2}`, `#${brgy3}`, '#Vehicular'],
      targetTab: 'deployment'
    },
    {
      id: 'static-3',
      priority: 'HIGH',
      title: 'Establish Surveillance Monitoring Posts',
      desc: `Install fixed CCTV infrastructure and establish nightly static patrol checkpoints near key intersections in ${brgy3}.`,
      basis: 'DBSCAN Spatial Pattern Analysis & Coordinate Clusters Density',
      urgency: 'Within 1 Week',
      iconClass: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      badgeClass: 'bg-orange-500/10 border-orange-500/35 text-orange-400',
      tags: ['#CCTV', `#${brgy3}`, '#Surveillance'],
      targetTab: 'map'
    },
    {
      id: 'static-4',
      priority: 'MEDIUM',
      title: 'Optimize Resource Allocation Models',
      desc: `Reallocate active officers from low-density sectors to cover emerging patrol gaps in ${brgy4} and ${brgy5} based on staffing efficiency calculations.`,
      basis: 'Geospatial Regression Analytics & Linear Programming Resource Optimization',
      urgency: 'Within 2 Weeks',
      iconClass: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      badgeClass: 'bg-yellow-500/10 border-yellow-500/35 text-yellow-400',
      tags: ['#ResourceAlloc', `#${brgy4}`, `#${brgy5}`, '#LPModel'],
      targetTab: 'deployment'
    },
    {
      id: 'static-5',
      priority: 'MEDIUM',
      title: 'Adjust Patrol Schedules for Payday Weekend Surges',
      desc: `Establish high-visibility presence around commercial zones and banking institutions during the 15th and 30th of the month.`,
      basis: 'Association Rule Mining (Apriori Commercial Patterns)',
      urgency: 'Monthly Recurring',
      iconClass: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      badgeClass: 'bg-yellow-500/10 border-yellow-500/35 text-yellow-400',
      tags: ['#PaydaySurge', '#Commercial', '#Schedule'],
      targetTab: 'deployment'
    },
    {
      id: 'static-6',
      priority: 'LOW',
      title: 'Implement Barangay Watch Programs',
      desc: `Coordinate crime-prevention seminars and set up alert networks with barangay tanods in the remaining baseline sectors.`,
      basis: 'Trend Analysis & Time-Series Forecasting models',
      urgency: 'Next Quarter',
      iconClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      badgeClass: 'bg-emerald-500/10 border-emerald-500/35 text-emerald-400',
      tags: ['#Community', '#Tanods', '#Prevention'],
      targetTab: 'dashboard'
    }
  ], [brgy1, brgy2, brgy3, brgy4, brgy5]);

  // Construct dynamic recommendations from active database alerts
  const dynamicRecommendations = useMemo(() => {
    return alerts.map((alert) => {
      let title = alert.title;
      let priority = alert.severity || 'HIGH';
      let basis = 'Dynamic Alert Engine calculation';
      let targetTab = 'deployment';
      let iconClass = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      let badgeClass = 'bg-rose-500/10 border-rose-500/35 text-rose-400';

      if (alert.type === 'Patrol') {
        title = `Resolve Patrol Gap in ${alert.barangay}`;
        priority = 'HIGH';
        basis = 'Patrol Coverage Gap checking (0 officers vs incidents)';
        targetTab = 'deployment';
        iconClass = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
        badgeClass = 'bg-rose-500/10 border-rose-500/35 text-rose-400';
      } else if (alert.type === 'Spike') {
        title = `Address Incident Spike in ${alert.barangay}`;
        priority = 'CRITICAL';
        basis = 'Incident Spike detector (exceeded threshold)';
        targetTab = 'deployment';
        iconClass = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
        badgeClass = 'bg-rose-500/10 border-rose-500/35 text-rose-400';
      } else if (alert.type === 'Predictive' && alert.title.includes('Staff Reduction')) {
        title = `Fix Patrol Staff Reduction in ${alert.barangay}`;
        priority = 'HIGH';
        basis = 'Staff count comparison & shift gaps check';
        targetTab = 'deployment';
        iconClass = 'bg-orange-500/10 text-orange-400 border-orange-500/20';
        badgeClass = 'bg-orange-500/10 border-orange-500/35 text-orange-400';
      } else if (alert.type === 'Predictive' && alert.title.includes('Stagnant')) {
        title = `Deploy Force to Stagnant Hotspot: ${alert.barangay}`;
        priority = 'HIGH';
        basis = 'Stagnant volume analysis (+/-15% change)';
        targetTab = 'deployment';
        iconClass = 'bg-orange-500/10 text-orange-400 border-orange-500/20';
        badgeClass = 'bg-orange-500/10 border-orange-500/35 text-orange-400';
      } else if (alert.type === 'Predictive' && alert.title.includes('Optimization')) {
        title = `Optimize Overstaffed Sector: ${alert.barangay}`;
        priority = 'MEDIUM';
        basis = 'Resource Optimization (overstaffed vs understaffed check)';
        targetTab = 'deployment';
        iconClass = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
        badgeClass = 'bg-yellow-500/10 border-yellow-500/35 text-yellow-450';
      } else if (alert.type === 'Predictive') {
        title = `Review AI Peak Forecasts`;
        priority = 'HIGH';
        basis = 'Geospatial Regression Model (Winning Model evaluation)';
        targetTab = 'analytics';
        iconClass = 'bg-violet-500/10 text-violet-400 border-violet-500/20';
        badgeClass = 'bg-violet-500/10 border-violet-500/35 text-violet-400';
      }

      return {
        id: `dynamic-${alert.id}`,
        priority,
        title,
        desc: alert.message,
        basis,
        urgency: priority === 'CRITICAL' ? 'Immediate' : 'Within 24 Hours',
        iconClass,
        badgeClass,
        tags: ['#DynamicAlert', `#${alert.barangay}`, `#${alert.type}`],
        targetTab
      };
    });
  }, [alerts]);

  // Combine dynamic and static recommendations
  const allRecommendations = useMemo(() => {
    return [...dynamicRecommendations, ...staticRecommendations];
  }, [dynamicRecommendations, staticRecommendations]);

  // Handle click on implement button (open confirmation modal)
  const triggerImplement = (reco) => {
    setSelectedReco(reco);
    setShowModal(true);
  };

  // Filter recommendations
  const filteredRecos = filterPriority === 'ALL'
    ? allRecommendations
    : allRecommendations.filter(r => r.priority === filterPriority);

  return (
    <div className="p-8 max-w-[1600px] w-full mx-auto space-y-6">

      {/* Official Print Letterhead (Hidden on Screen, Visible on Print) */}
      <div className="hidden print:block mb-10 text-center text-black">
        <div className="flex justify-between items-center px-8 mb-4">
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Philippine_National_Police_seal.svg/512px-Philippine_National_Police_seal.svg.png" alt="PNP Logo" className="w-24 h-24 object-contain" onError={(e) => e.target.style.display = 'none'} />
          <div className="text-center font-serif leading-tight">
            <p className="text-[13px]">Republic of the Philippines</p>
            <p className="text-[13px] font-bold">NATIONAL POLICE COMMISSION</p>
            <p className="text-lg font-black mt-1">PHILIPPINE NATIONAL POLICE</p>
            <p className="text-base font-bold text-slate-800 mt-1">ZAMBOANGA CITY POLICE OFFICE</p>
            <p className="text-xs mt-1">Zamboanga City, Zamboanga del Sur</p>
          </div>
          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Ph_seal_zamboanga_city.png/512px-Ph_seal_zamboanga_city.png" alt="Zamboanga Logo" className="w-24 h-24 object-contain" onError={(e) => e.target.style.display = 'none'} />
        </div>
        <div className="w-full border-t-2 border-black mb-0.5"></div>
        <div className="w-full border-t border-black mb-8"></div>

        <h1 className="text-2xl font-black uppercase tracking-widest mb-2 font-serif">Prescriptive Recommendations</h1>
        <p className="text-sm font-medium mb-6">System-Generated Automated Patrol Directives & Mitigations</p>
      </div>

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight font-sans">Prescriptive Recommendations</h2>
          <p className="text-xs text-slate-500">Automated model-driven patrol directives and scheduling mitigations</p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
        >
          <Printer size={14} /> Print Report
        </button>
      </div>

      {/* Analytics Engine Badge Banner */}
      <div className="print:hidden bg-slate-900 border border-slate-850 rounded-2xl p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <Star size={16} className="text-violet-400" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Analytical Model Base:</span>
          <div className="flex flex-wrap gap-2 text-[10px] text-slate-400 font-semibold">
            <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-850">SARIMAX Forecast</span>
            <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-850">DBSCAN Clusters</span>
            <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-850">Apriori Rules</span>
            <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-850">KDE Density Mapping</span>
            <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-850">Geospatial MLR / SVM</span>
          </div>
        </div>
      </div>

      {/* Filter tab bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap gap-3 items-center justify-between shadow-lg print:hidden">
        <div className="flex items-center gap-2 text-slate-300 text-xs font-semibold">
          <AlertCircle size={14} className="text-slate-500" /> Filter Directives
        </div>
        <div className="flex gap-2">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(p => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${filterPriority === p
                ? 'bg-brand-600 text-slate-50 shadow'
                : 'text-slate-400 hover:text-slate-200 bg-slate-950 hover:bg-slate-900 border border-slate-850'
                }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredRecos.map((reco) => {
          const isImplemented = implementedRecos.has(reco.id);

          return (
            <div
              key={reco.id}
              onClick={() => { if (!isImplemented) triggerImplement(reco); }}
              className={`break-inside-avoid bg-slate-900 border border-slate-850 rounded-3xl p-6 shadow-xl flex flex-col justify-between transition-all duration-300 ${printingId && printingId !== reco.id ? 'print:hidden' : ''
                } ${isImplemented
                  ? 'opacity-50 print:opacity-100 border-emerald-500/20 bg-slate-900/40 cursor-default'
                  : 'hover:border-slate-700 hover:bg-slate-850/50 cursor-pointer'
                }`}
            >
              <div className="space-y-4">
                {/* Card Title & Icon */}
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${reco.iconClass}`}>
                    <ShieldCheck size={20} />
                  </div>
                  <div className="min-w-0">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-bold border tracking-wider uppercase ${reco.badgeClass}`}>
                      {reco.priority} Priority
                    </span>
                    <h4 className="text-sm font-bold text-slate-100 mt-1 leading-snug">{reco.title}</h4>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-350 leading-relaxed font-medium">{reco.desc}</p>

                {/* Meta grid */}
                <div className="space-y-2 border-t border-slate-850/80 pt-3">
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold">
                    <Cpu size={12} className="text-violet-400 shrink-0" />
                    <span><strong className="text-slate-400">Analytical Basis:</strong> {reco.basis}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold">
                    <Clock size={12} className="text-brand-400 shrink-0" />
                    <span><strong className="text-slate-400">Urgency:</strong> {reco.urgency}</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 pt-1.5">
                  {reco.tags.map(t => (
                    <span key={t} className="inline-flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-full text-[9px] font-bold text-slate-500 border border-slate-850">
                      <Tag size={8} /> {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Implement Button */}
              <div className="mt-6 pt-4 border-t border-slate-850/60 flex justify-end items-center">
                <button
                  onClick={() => triggerImplement(reco)}
                  disabled={isImplemented}
                  className={`flex items-center gap-1.5 font-bold text-xs rounded-xl px-4 py-2.5 shadow transition-all cursor-pointer print:hidden ${isImplemented
                    ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 cursor-not-allowed'
                    : 'bg-brand-600 hover:bg-brand-500 text-slate-50 shadow-brand-500/10 hover:shadow-brand-500/20'
                    }`}
                >
                  {isImplemented ? (
                    <>
                      <Check size={14} /> Implemented
                    </>
                  ) : (
                    'Implement'
                  )}
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {showModal && selectedReco && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-[fadeInScale_0.2s_ease-out]">
            <div className="flex items-center gap-3 text-brand-400">
              <ShieldCheck size={24} />
              <h3 className="text-base font-bold text-slate-100">Confirm Implementation</h3>
            </div>

            <p className="text-xs text-slate-350 leading-relaxed font-medium">
              You are about to implement: <strong className="text-slate-100">"{selectedReco.title}"</strong>.
            </p>

            {selectedReco.targetTab && (
              <div className="bg-slate-950 rounded-xl p-3 border border-slate-850 text-[11px] text-slate-400">
                📌 <strong>Action Redirection:</strong> Fulfilling this directive will automatically navigate you to the <strong className="text-slate-300">{selectedReco.targetTab.toUpperCase()}</strong> workspace.
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedReco(null);
                }}
                className="bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const id = selectedReco.id;
                  setImplementedRecos(prev => {
                    const next = new Set(prev);
                    next.add(id);
                    return next;
                  });
                  setToastMessage(`Recommendation marked as implemented!`);
                  setTimeout(() => setToastMessage(null), 3000);

                  const targetTab = selectedReco.targetTab;
                  setShowModal(false);
                  setSelectedReco(null);

                  if (targetTab && typeof onNavigateToTab === 'function') {
                    setTimeout(() => {
                      onNavigateToTab(targetTab);
                    }, 500);
                  }
                }}
                className="bg-brand-600 hover:bg-brand-500 text-slate-50 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg shadow-brand-500/10 transition-all cursor-pointer"
              >
                Confirm & Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating success toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-emerald-500/10 border border-emerald-500/30 text-emerald-450 px-5 py-3.5 rounded-xl shadow-2xl z-50 animate-[fadeInUp_0.3s_ease] backdrop-blur-md flex items-center gap-2.5 text-xs font-semibold">
          <ShieldCheck size={16} />
          {toastMessage}
        </div>
      )}

    </div>
  );
}
