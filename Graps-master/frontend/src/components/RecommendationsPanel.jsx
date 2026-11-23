import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShieldCheck, Printer, Check, Star, AlertCircle, Cpu, Clock, Tag, 
  FileText, Plus, CheckCircle, XCircle, Edit3, Send, ShieldAlert, Sparkles, X, ChevronRight, UserCheck
} from 'lucide-react';

export default function RecommendationsPanel({ points = [], user, onNavigateToTab }) {
  const isAnalyst = user?.role === 'analyst';
  const isChief = user?.role === 'decision_maker';
  const isAdmin = user?.role === 'admin';

  const [filterPriority, setFilterPriority] = useState('ALL');
  const [implementedRecos, setImplementedRecos] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('graps_implemented_recos') || '[]'));
    } catch (e) {
      return new Set();
    }
  });
  const [toastMessage, setToastMessage] = useState(null);

  // Dynamic Alert Integration State
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [printingId, setPrintingId] = useState(null);

  // Analyst Human-in-the-Loop States
  const [endorsedMap, setEndorsedMap] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('graps_analyst_endorsements') || '{}');
    } catch (e) {
      return {};
    }
  });

  const [modifiedMap, setModifiedMap] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('graps_analyst_modifications') || '{}');
    } catch (e) {
      return {};
    }
  });

  const [rejectedSet, setRejectedSet] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('graps_analyst_rejected') || '[]'));
    } catch (e) {
      return new Set();
    }
  });

  const [customProposals, setCustomProposals] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('graps_analyst_custom_proposals') || '[]');
    } catch (e) {
      return [];
    }
  });

  const [briefSubmitted, setBriefSubmitted] = useState(() => {
    return localStorage.getItem('graps_brief_submitted_to_chief') === 'true';
  });

  // Modal States
  const [selectedReco, setSelectedReco] = useState(null);
  const [showChiefModal, setShowChiefModal] = useState(false);
  const [showEndorseModal, setShowEndorseModal] = useState(false);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showProposeModal, setShowProposeModal] = useState(false);

  // Form inputs for modals
  const [endorseNotes, setEndorseNotes] = useState('');
  const [modifyForm, setModifyForm] = useState({ title: '', desc: '', priority: 'HIGH', urgency: 'Immediate', rationale: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [newProposal, setNewProposal] = useState({
    title: '',
    barangay: 'Tetuan',
    priority: 'HIGH',
    urgency: 'Within 24 Hours',
    desc: '',
    tacticalRationale: '',
    targetTab: 'deployment'
  });

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch active alerts on component mount
  useEffect(() => {
    setLoading(true);
    fetch('http://127.0.0.1:8000/api/v1/alerts')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAlerts(data.filter(a => !a.acknowledged));
        }
      })
      .catch(err => console.error("Failed to load alerts in recommendations:", err))
      .finally(() => setLoading(false));
  }, []);

  const handlePrintSingle = (e, id) => {
    e.stopPropagation();
    setPrintingId(id);
    setTimeout(() => {
      window.print();
      setPrintingId(null);
    }, 100);
  };

  // Save state helpers
  const saveEndorsement = (recoId, notes) => {
    const updated = {
      ...endorsedMap,
      [recoId]: {
        endorsed: true,
        notes: notes || 'Verified with current geospatial hotspot patterns.',
        analystName: user?.name || 'Intelligence Analyst',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    };
    setEndorsedMap(updated);
    localStorage.setItem('graps_analyst_endorsements', JSON.stringify(updated));
    triggerToast('Recommendation successfully endorsed with analyst notes!');
    setShowEndorseModal(false);
  };

  const saveModification = (recoId, formData) => {
    const updated = {
      ...modifiedMap,
      [recoId]: {
        ...formData,
        analystName: user?.name || 'Intelligence Analyst',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    };
    setModifiedMap(updated);
    localStorage.setItem('graps_analyst_modifications', JSON.stringify(updated));
    triggerToast('Directive parameters modified with tactical rationale.');
    setShowModifyModal(false);
  };

  const saveRejection = (recoId, reason) => {
    const updated = new Set(rejectedSet);
    updated.add(recoId);
    setRejectedSet(updated);
    localStorage.setItem('graps_analyst_rejected', JSON.stringify(Array.from(updated)));
    triggerToast('Flagged as false alarm / rejected from tactical brief.');
    setShowRejectModal(false);
  };

  const saveCustomProposal = () => {
    if (!newProposal.title || !newProposal.desc) {
      triggerToast('Please provide both a title and operational action description.');
      return;
    }
    const createdItem = {
      id: `custom-analyst-${Date.now()}`,
      priority: newProposal.priority,
      title: newProposal.title,
      desc: newProposal.desc,
      basis: `Analyst Tactical Initiative: ${newProposal.tacticalRationale || 'Field intelligence observation'}`,
      urgency: newProposal.urgency,
      iconClass: 'bg-brand-500/10 text-brand-400 border-brand-500/20',
      badgeClass: 'bg-brand-500/10 border-brand-500/35 text-brand-400',
      tags: ['#AnalystInitiative', `#${newProposal.barangay}`, '#SpecialOps'],
      targetTab: newProposal.targetTab,
      isCustomAnalyst: true,
      author: user?.name || 'Intelligence Analyst',
      createdAt: new Date().toLocaleDateString()
    };

    const updated = [createdItem, ...customProposals];
    setCustomProposals(updated);
    localStorage.setItem('graps_analyst_custom_proposals', JSON.stringify(updated));
    triggerToast(`Tactical directive "${newProposal.title}" created!`);
    setShowProposeModal(false);
    setNewProposal({
      title: '',
      barangay: 'Tetuan',
      priority: 'HIGH',
      urgency: 'Within 24 Hours',
      desc: '',
      tacticalRationale: '',
      targetTab: 'deployment'
    });
  };

  const submitBriefToChief = () => {
    setBriefSubmitted(true);
    localStorage.setItem('graps_brief_submitted_to_chief', 'true');
    triggerToast('Official Situation Assessment & Brief submitted to the Chief of Police!');
  };

  // Top 5 barangays dynamically
  const topBarangays = useMemo(() => {
    const counts = {};
    points.forEach(p => {
      if (p.barangay) counts[p.barangay] = (counts[p.barangay] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);
  }, [points]);

  const brgy1 = topBarangays[0] || 'TETUAN';
  const brgy2 = topBarangays[1] || 'SANGALI';
  const brgy3 = topBarangays[2] || 'CANELAR';
  const brgy4 = topBarangays[3] || 'MAMPANG';
  const brgy5 = topBarangays[4] || 'CALARIAN';

  // Master recommendation list
  const staticRecommendations = useMemo(() => [
    {
      id: 'static-1',
      priority: 'CRITICAL',
      title: 'Increase Patrol Frequency in Active Sectors',
      desc: `Deploy double-officer foot patrols immediately in the high-density sectors of ${brgy1} and ${brgy2} to deter recurring incidents.`,
      basis: 'Crime Frequency Density & Spatial Clustered Centroids',
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
    }
  ], [brgy1, brgy2, brgy3, brgy4, brgy5]);

  // Dynamic recommendations generated from active backend alerts
  const dynamicRecommendations = useMemo(() => {
    return alerts.map(alert => {
      let priority = 'MEDIUM';
      let title = `Tactical Action Required: ${alert.title}`;
      let urgency = 'Within 3 Days';
      let targetTab = 'deployment';
      let iconClass = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      let badgeClass = 'bg-rose-500/10 border-rose-500/35 text-rose-400';

      if (alert.type === 'Patrol') {
        title = `Resolve Patrol Gap in ${alert.barangay}`;
        priority = 'HIGH';
        urgency = 'Immediate Action';
        iconClass = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
        badgeClass = 'bg-rose-500/10 border-rose-500/35 text-rose-400';
      } else if (alert.type === 'Spike') {
        title = `Suppress Incident Spike in ${alert.barangay}`;
        priority = 'CRITICAL';
        urgency = 'Within 24 Hours';
        iconClass = 'bg-rose-600/20 text-rose-300 border-rose-500/40';
        badgeClass = 'bg-rose-600/20 border-rose-500/50 text-rose-300 font-extrabold';
      }

      return {
        id: `alert-reco-${alert.id}`,
        alertId: alert.id,
        priority,
        title,
        desc: alert.message,
        basis: `Live Automated Alert: ${alert.type} Rule Trigger`,
        urgency,
        iconClass,
        badgeClass,
        tags: ['#LiveAlert', `#${alert.barangay || 'CityWide'}`, `#${alert.type}`],
        targetTab
      };
    });
  }, [alerts]);

  // Combined master pool including analyst custom proposals, excluding rejected
  const allRecommendations = useMemo(() => {
    const combined = [...customProposals, ...dynamicRecommendations, ...staticRecommendations];
    return combined.filter(r => !rejectedSet.has(r.id)).map(r => {
      // Overlay analyst modifications if present
      if (modifiedMap[r.id]) {
        const mod = modifiedMap[r.id];
        return {
          ...r,
          title: mod.title || r.title,
          desc: mod.desc || r.desc,
          priority: mod.priority || r.priority,
          urgency: mod.urgency || r.urgency,
          isModifiedByAnalyst: true,
          analystRationale: mod.rationale
        };
      }
      return r;
    });
  }, [customProposals, dynamicRecommendations, staticRecommendations, rejectedSet, modifiedMap]);

  const filteredRecos = useMemo(() => {
    if (filterPriority === 'ALL') return allRecommendations;
    return allRecommendations.filter(r => r.priority === filterPriority);
  }, [allRecommendations, filterPriority]);

  const endorsedCount = Object.keys(endorsedMap).length;

  return (
    <div className="p-8 max-w-[1600px] w-full mx-auto space-y-6">

      {/* Official Print Letterhead */}
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
        <p className="text-sm font-medium mb-6">Automated Patrol Directives & Analyst Tactical Intelligence</p>
      </div>

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-100 tracking-tight font-sans">Prescriptive Recommendations</h2>
            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
              isChief ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
              isAnalyst ? 'bg-brand-500/10 text-brand-400 border-brand-500/20' :
              'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {isChief ? 'Command Authority Mode' : isAnalyst ? 'Analyst Assessment Mode' : 'IT System Audit'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAnalyst 
              ? 'Human-in-the-loop: Review, endorse, modify, or propose tactical directives for the Chief of Police.'
              : isChief 
              ? 'Executive Command: Review intelligence briefs and officially authorize deployment operations.'
              : 'Read-only view of police operational recommendations.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isAnalyst && (
            <button
              onClick={() => setShowProposeModal(true)}
              className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-slate-50 px-3.5 py-2.5 rounded-xl text-xs font-semibold shadow transition-colors cursor-pointer"
            >
              <Plus size={15} /> Propose Directive
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
          >
            <Printer size={14} /> Print Report
          </button>
        </div>
      </div>

      {/* 🚀 ANALYST TO CHIEF SITUATION ASSESSMENT BANNER */}
      {isAnalyst && (
        <div className="print:hidden bg-slate-900/90 border border-brand-500/30 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600/15 border border-brand-500/25 text-brand-400 flex items-center justify-center shrink-0">
              <FileText size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                Analyst Intelligence Assessment Status
                {briefSubmitted && <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold px-2 py-0.5 rounded-full">Submitted to Chief</span>}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                <strong>{endorsedCount}</strong> recommendations endorsed • <strong>{customProposals.length}</strong> custom initiatives drafted • <strong>{rejectedSet.size}</strong> false alarms dismissed.
              </p>
            </div>
          </div>

          <button
            onClick={submitBriefToChief}
            disabled={briefSubmitted}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold shadow transition-all cursor-pointer ${
              briefSubmitted 
                ? 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 cursor-default'
                : 'bg-brand-600 hover:bg-brand-500 text-slate-50 shadow-brand-500/20'
            }`}
          >
            {briefSubmitted ? <><CheckCircle size={14} /> Brief Dispatched to Chief</> : <><Send size={14} /> Submit Brief to Chief</>}
          </button>
        </div>
      )}

      {/* 👑 CHIEF EXECUTIVE REVIEW BANNER */}
      {isChief && (
        <div className="print:hidden bg-slate-900/90 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 text-amber-400 flex items-center justify-center shrink-0">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                Command Authority: Chief of Police
                {briefSubmitted ? (
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold px-2 py-0.5 rounded-full">
                    ✅ Intelligence Brief Ready for Approval
                  </span>
                ) : (
                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold px-2 py-0.5 rounded-full">
                    Analyst Review in Progress
                  </span>
                )}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                You hold exclusive authority to authorize patrol redeployments and officially sign off on directives.
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
            Executive Command Mode
          </span>
        </div>
      )}

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

      {/* Recommendations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredRecos.map((reco) => {
          const isImplemented = implementedRecos.has(reco.id);
          const endorsement = endorsedMap[reco.id];
          const isModified = reco.isModifiedByAnalyst;

          return (
            <div
              key={reco.id}
              className={`break-inside-avoid bg-slate-900 border rounded-3xl p-6 shadow-xl flex flex-col justify-between transition-all duration-300 ${
                printingId && printingId !== reco.id ? 'print:hidden' : ''
              } ${
                isImplemented
                  ? 'border-emerald-500/30 bg-slate-900/40 opacity-75'
                  : endorsement
                  ? 'border-brand-500/40 bg-slate-900'
                  : 'border-slate-850 hover:border-slate-700'
              }`}
            >
              <div className="space-y-4">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${reco.iconClass}`}>
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-bold border tracking-wider uppercase ${reco.badgeClass}`}>
                          {reco.priority} Priority
                        </span>
                        {reco.isCustomAnalyst && (
                          <span className="bg-brand-500/10 text-brand-400 border border-brand-500/20 text-[8px] font-bold px-2 py-0.5 rounded tracking-wider uppercase">
                            Analyst Initiative
                          </span>
                        )}
                        {endorsement && (
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                            <CheckCircle size={10} /> Endorsed by Analyst
                          </span>
                        )}
                        {isModified && (
                          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[8px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                            <Edit3 size={10} /> Modified
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-100 mt-1 leading-snug">{reco.title}</h4>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handlePrintSingle(e, reco.id)}
                    title="Print single directive"
                    className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0 print:hidden"
                  >
                    <Printer size={13} />
                  </button>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-350 leading-relaxed font-medium">{reco.desc}</p>

                {/* Analyst Notes Block if Endorsed or Modified */}
                {(endorsement || reco.analystRationale) && (
                  <div className="bg-slate-950/80 border border-brand-500/20 rounded-xl p-3 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-brand-400">
                      <span className="flex items-center gap-1"><UserCheck size={12} /> Intelligence Analyst Assessment:</span>
                      {endorsement && <span className="text-slate-500 text-[9px]">{endorsement.timestamp}</span>}
                    </div>
                    <p className="text-xs text-slate-300 italic">
                      "{endorsement ? endorsement.notes : reco.analystRationale}"
                    </p>
                  </div>
                )}

                {/* Meta details */}
                <div className="space-y-1.5 border-t border-slate-850/80 pt-3 text-[10px] text-slate-500 font-semibold">
                  <div className="flex items-center gap-2">
                    <Cpu size={12} className="text-violet-400 shrink-0" />
                    <span><strong className="text-slate-400">Analytical Basis:</strong> {reco.basis}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={12} className="text-brand-400 shrink-0" />
                    <span><strong className="text-slate-400">Urgency:</strong> {reco.urgency}</span>
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {reco.tags.map(t => (
                    <span key={t} className="inline-flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-full text-[9px] font-bold text-slate-500 border border-slate-850">
                      <Tag size={8} /> {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="mt-6 pt-4 border-t border-slate-850/80 flex flex-wrap justify-between items-center gap-3 print:hidden">
                {/* Analyst Controls */}
                {isAnalyst && !isImplemented && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedReco(reco);
                        setEndorseNotes(endorsement ? endorsement.notes : '');
                        setShowEndorseModal(true);
                      }}
                      className="px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/25 rounded-xl text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1"
                    >
                      <CheckCircle size={12} /> {endorsement ? 'Edit Notes' : 'Endorse'}
                    </button>

                    <button
                      onClick={() => {
                        setSelectedReco(reco);
                        setModifyForm({
                          title: reco.title,
                          desc: reco.desc,
                          priority: reco.priority,
                          urgency: reco.urgency,
                          rationale: reco.analystRationale || ''
                        });
                        setShowModifyModal(true);
                      }}
                      className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-350 hover:text-slate-200 border border-slate-850 rounded-xl text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Edit3 size={12} /> Modify
                    </button>

                    <button
                      onClick={() => {
                        setSelectedReco(reco);
                        setShowRejectModal(true);
                      }}
                      className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 rounded-xl text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1"
                    >
                      <XCircle size={12} /> Reject
                    </button>
                  </div>
                )}

                {/* Right side: Execution status / Chief authority */}
                <div className="ml-auto flex items-center gap-2">
                  {isImplemented ? (
                    <span className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-3 py-1.5 rounded-xl text-xs font-bold">
                      <Check size={14} /> Implemented by Chief
                    </span>
                  ) : isChief ? (
                    <button
                      onClick={() => {
                        setSelectedReco(reco);
                        setShowChiefModal(true);
                      }}
                      className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-xl px-4 py-2 shadow-lg shadow-amber-600/10 transition-all cursor-pointer"
                    >
                      <ShieldCheck size={14} /> Approve & Authorize
                    </button>
                  ) : isAnalyst ? (
                    <span className="text-[10px] font-semibold text-slate-500 italic">
                      Pending Chief Sign-off
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-500 italic">
                      IT View Only
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 👑 CHIEF APPROVE & AUTHORIZE MODAL */}
      {showChiefModal && selectedReco && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-amber-400">
                <ShieldAlert size={22} />
                <h3 className="text-base font-bold text-slate-100">Command Authorization</h3>
              </div>
              <button onClick={() => { setShowChiefModal(false); setSelectedReco(null); }} className="text-slate-500 hover:text-slate-300">
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              As <strong>Chief of Police</strong>, you are officially signing off to approve and authorize execution of:
            </p>

            <div className="bg-slate-950 rounded-2xl p-3.5 border border-slate-800">
              <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider block">Directive Title</span>
              <h4 className="text-xs font-bold text-slate-100 mt-0.5">{selectedReco.title}</h4>
              <p className="text-[11px] text-slate-400 mt-1">{selectedReco.desc}</p>
            </div>

            {selectedReco.targetTab && (
              <div className="bg-slate-950 rounded-xl p-3 border border-slate-850 text-[11px] text-slate-400">
                📌 <strong>Operational Route:</strong> Proceeding will navigate to the <strong className="text-slate-200">{selectedReco.targetTab.toUpperCase()}</strong> operational console.
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setShowChiefModal(false); setSelectedReco(null); }}
                className="bg-slate-850 hover:bg-slate-800 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const id = selectedReco.id;
                  const updated = new Set(implementedRecos);
                  updated.add(id);
                  setImplementedRecos(updated);
                  localStorage.setItem('graps_implemented_recos', JSON.stringify(Array.from(updated)));
                  triggerToast(`Directive "${selectedReco.title}" officially authorized and signed!`);

                  const targetTab = selectedReco.targetTab;
                  setShowChiefModal(false);
                  setSelectedReco(null);

                  if (targetTab && typeof onNavigateToTab === 'function') {
                    setTimeout(() => onNavigateToTab(targetTab), 600);
                  }
                }}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                Sign & Authorize Deployment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📝 ANALYST ENDORSE & NOTES MODAL */}
      {showEndorseModal && selectedReco && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-brand-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-brand-400">
                <CheckCircle size={20} />
                <h3 className="text-base font-bold text-slate-100">Endorse Recommendation</h3>
              </div>
              <button onClick={() => { setShowEndorseModal(false); setSelectedReco(null); }} className="text-slate-500 hover:text-slate-300">
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Provide your qualitative assessment notes for <strong>"{selectedReco.title}"</strong> before it reaches the Chief of Police.
            </p>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Qualitative Assessment & Situation Notes</label>
              <textarea
                value={endorseNotes}
                onChange={(e) => setEndorseNotes(e.target.value)}
                rows={4}
                placeholder="e.g. Verified with local precinct blotter; recent fiesta activity caused the temporary incident spike. Recommend extra foot patrols."
                className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-xl p-3 text-xs text-slate-200 outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setShowEndorseModal(false); setSelectedReco(null); }}
                className="bg-slate-850 hover:bg-slate-800 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => saveEndorsement(selectedReco.id, endorseNotes)}
                className="bg-brand-600 hover:bg-brand-500 text-slate-50 px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-brand-500/10 cursor-pointer"
              >
                Save Endorsement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✏️ ANALYST MODIFY MODAL */}
      {showModifyModal && selectedReco && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-slate-200">
                <Edit3 size={18} />
                <h3 className="text-base font-bold text-slate-100">Modify Directive Parameters</h3>
              </div>
              <button onClick={() => { setShowModifyModal(false); setSelectedReco(null); }} className="text-slate-500 hover:text-slate-300">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Directive Title</label>
                <input
                  type="text"
                  value={modifyForm.title}
                  onChange={(e) => setModifyForm({ ...modifyForm, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Priority Level</label>
                  <select
                    value={modifyForm.priority}
                    onChange={(e) => setModifyForm({ ...modifyForm, priority: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none cursor-pointer"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Urgency</label>
                  <input
                    type="text"
                    value={modifyForm.urgency}
                    onChange={(e) => setModifyForm({ ...modifyForm, urgency: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Operational Description</label>
                <textarea
                  value={modifyForm.desc}
                  onChange={(e) => setModifyForm({ ...modifyForm, desc: e.target.value })}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-xl p-3 text-xs text-slate-200 outline-none resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Modification Rationale</label>
                <input
                  type="text"
                  placeholder="e.g. Adjusted patrol schedule based on localized evening robbery reports."
                  value={modifyForm.rationale}
                  onChange={(e) => setModifyForm({ ...modifyForm, rationale: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setShowModifyModal(false); setSelectedReco(null); }}
                className="bg-slate-850 hover:bg-slate-800 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => saveModification(selectedReco.id, modifyForm)}
                className="bg-brand-600 hover:bg-brand-500 text-slate-50 px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-brand-500/10 cursor-pointer"
              >
                Save Modifications
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚫 ANALYST REJECT / FALSE ALARM MODAL */}
      {showRejectModal && selectedReco && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-rose-500/30 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-rose-400">
                <XCircle size={20} />
                <h3 className="text-base font-bold text-slate-100">Dismiss Recommendation</h3>
              </div>
              <button onClick={() => { setShowRejectModal(false); setSelectedReco(null); }} className="text-slate-500 hover:text-slate-300">
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to dismiss <strong>"{selectedReco.title}"</strong> as a false alarm or tactical non-issue?
            </p>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rejection Reason</label>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Statistical anomaly due to one-time community festival."
                className="w-full bg-slate-950 border border-slate-850 focus:border-rose-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => { setShowRejectModal(false); setSelectedReco(null); }}
                className="bg-slate-850 hover:bg-slate-800 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => saveRejection(selectedReco.id, rejectReason)}
                className="bg-rose-600 hover:bg-rose-500 text-slate-50 px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-rose-600/10 cursor-pointer"
              >
                Dismiss Directive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 💡 ANALYST PROPOSE DIRECTIVE MODAL */}
      {showProposeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-brand-500/30 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-brand-400">
                <Plus size={20} />
                <h3 className="text-base font-bold text-slate-100">Propose Tactical Initiative</h3>
              </div>
              <button onClick={() => setShowProposeModal(false)} className="text-slate-500 hover:text-slate-300">
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Draft a qualitative tactical directive from human situation assessment to submit to the Chief of Police.
            </p>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Initiative Title</label>
                <input
                  type="text"
                  placeholder="e.g. Oplan Bakal Checkpoint in Tetuan Commercial District"
                  value={newProposal.title}
                  onChange={(e) => setNewProposal({ ...newProposal, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Barangay</label>
                  <input
                    type="text"
                    placeholder="e.g. Tetuan"
                    value={newProposal.barangay}
                    onChange={(e) => setNewProposal({ ...newProposal, barangay: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Priority</label>
                  <select
                    value={newProposal.priority}
                    onChange={(e) => setNewProposal({ ...newProposal, priority: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none cursor-pointer"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Operational Directive Details</label>
                <textarea
                  value={newProposal.desc}
                  onChange={(e) => setNewProposal({ ...newProposal, desc: e.target.value })}
                  rows={3}
                  placeholder="Specific tactical instructions for deployed personnel..."
                  className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-xl p-3 text-xs text-slate-200 outline-none resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tactical & Intelligence Rationale</label>
                <input
                  type="text"
                  placeholder="e.g. Confidential informant intel indicates illegal firearms transit."
                  value={newProposal.tacticalRationale}
                  onChange={(e) => setNewProposal({ ...newProposal, tacticalRationale: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowProposeModal(false)}
                className="bg-slate-850 hover:bg-slate-800 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={saveCustomProposal}
                className="bg-brand-600 hover:bg-brand-500 text-slate-50 px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-brand-500/10 cursor-pointer"
              >
                Add to Tactical Brief
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
