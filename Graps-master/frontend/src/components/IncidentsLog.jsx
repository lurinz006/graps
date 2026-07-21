import React, { useState, useMemo } from 'react';
import { Search, Plus, Eye, Download, X, Calendar, MapPin, ShieldAlert, FileText, Clock, Trash2, AlertCircle } from 'lucide-react';

export default function IncidentsLog({ points, onAddPoint, onDeletePoint, barangayList = [], user }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const itemsPerPage = 10;

  // Deletion states
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [incidentToDelete, setIncidentToDelete] = useState(null);

  const canDeleteIncident = (incident) => {
    if (!incident || !incident.created_at) return false;
    const created = new Date(incident.created_at);
    const now = new Date();
    const diffMs = now - created;
    const diffMins = diffMs / 1000 / 60;
    return diffMins >= 0 && diffMins < 5;
  };

  // Custom Wizard Picker states
  const [activeDateWizard, setActiveDateWizard] = useState(null);
  const [activeTimeWizard, setActiveTimeWizard] = useState(null);

  // Form states for adding incident
  const [formBarangay, setFormBarangay] = useState('Santa Maria');
  const [formType, setFormType] = useState('Theft');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formTime, setFormTime] = useState('12:00');
  const [formSeverity, setFormSeverity] = useState('Medium');
  const [formDescription, setFormDescription] = useState('');

  // Extract unique crime types
  const crimeTypes = useMemo(() => {
    const types = new Set();
    points.forEach(p => {
      if (p.incident_type && p.incident_type !== 'N/A') {
        types.add(p.incident_type);
      }
    });
    return Array.from(types).sort();
  }, [points]);

  // Extract unique years
  const uniqueYears = useMemo(() => {
    const years = new Set();
    points.forEach(p => {
      if (p.date_committed && p.date_committed !== 'N/A') {
        const yr = p.date_committed.split('-')[0];
        if (yr && yr.length === 4 && !isNaN(yr)) {
          years.add(yr);
        }
      }
    });
    return Array.from(years).sort();
  }, [points]);

  // Filter and Search logic
  const filteredIncidents = useMemo(() => {
    return points.filter(p => {
      // Search term
      const searchLower = searchTerm.toLowerCase();
      const matchSearch =
        searchTerm === '' ||
        (p.id && p.id.toString().toLowerCase().includes(searchLower)) ||
        (p.barangay && p.barangay.toLowerCase().includes(searchLower)) ||
        (p.incident_type && p.incident_type.toLowerCase().includes(searchLower)) ||
        (p.offense && p.offense.toLowerCase().includes(searchLower)) ||
        (p.description && p.description.toLowerCase().includes(searchLower));

      // Year filter
      const year = p.date_committed && p.date_committed !== 'N/A' ? p.date_committed.split('-')[0] : '';
      const matchYear = filterYear === 'all' || year === filterYear;

      // Severity filter
      const sev = p.value >= 100 ? 'critical' : p.value >= 50 ? 'high' : p.value >= 25 ? 'medium' : 'low';
      const matchSeverity = filterSeverity === 'all' || sev === filterSeverity.toLowerCase();

      // Type filter
      const matchType = filterType === 'all' || p.incident_type === filterType;

      return matchSearch && matchYear && matchSeverity && matchType;
    });
  }, [points, searchTerm, filterYear, filterSeverity, filterType]);

  // Pagination logic
  const totalPages = Math.ceil(filteredIncidents.length / itemsPerPage) || 1;
  const paginatedIncidents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredIncidents.slice(start, start + itemsPerPage);
  }, [filteredIncidents, currentPage, itemsPerPage]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = 'Incident ID,Date Committed,Time Committed,Barangay,Incident Type,Offense,Severity,Coordinates\n';
    const rows = filteredIncidents.map(p => {
      const sev = p.value >= 100 ? 'Critical' : p.value >= 50 ? 'High' : p.value >= 25 ? 'Medium' : 'Low';
      const cleanOffense = p.offense ? p.offense.replace(/"/g, '""') : '';
      return `"${p.id || 'N/A'}","${p.date_committed}","${p.time_committed}","${p.barangay}","${p.incident_type}","${cleanOffense}","${sev}","${p.latitude}, ${p.longitude}"`;
    }).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `GRAPS_incidents_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle Add Incident Form Submit
  const handleAddSubmit = (e) => {
    e.preventDefault();
    
    // Fake coordinates around the selected barangay centroid for mock submission
    const fakeLat = 6.9214 + (Math.random() - 0.5) * 0.05;
    const fakeLng = 122.0790 + (Math.random() - 0.5) * 0.05;
    
    let sevValue = 1.0;
    if (formSeverity === 'Critical') sevValue = 100.0;
    else if (formSeverity === 'High') sevValue = 50.0;
    else if (formSeverity === 'Medium') sevValue = 25.0;

    const category = formType === 'Drug-Related (Buy Bust)' ? 'Operation' : 'Incident';
    const cleanOffense = formType === 'Drug-Related (Buy Bust)' ? 'Buy Bust' : formType;
    const formattedIncidentType = `(${category}) ${cleanOffense}`;

    const newIncident = {
      id: `INC-${formDate.split('-')[0]}-${Math.floor(1000 + Math.random() * 9000)}`,
      latitude: fakeLat,
      longitude: fakeLng,
      name: `${category} - ${cleanOffense} (${formBarangay})`,
      description: formDescription || `Incident reported via administrator panel in Brgy. ${formBarangay}`,
      created_at: formTime,
      monthly: new Date(formDate).toLocaleString('en-US', { month: 'short' }),
      date_committed: formDate,
      time_committed: formTime,
      barangay: formBarangay,
      offense: cleanOffense,
      incident_type: formattedIncidentType,
      value: sevValue
    };

    if (typeof onAddPoint === 'function') {
      onAddPoint(newIncident);
    }
    
    setIsAddModalOpen(false);
    // Reset form
    setFormDescription('');
  };

  return (
    <div className="p-8 max-w-[1600px] w-full mx-auto space-y-6">
      
      {/* Page Title & Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Incident Reports Log</h2>
          <p className="text-xs text-slate-500">Search and audit ZCPO geo-referenced safety incidents</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 transition-colors"
          >
            <Download size={14} /> Export CSV
          </button>
          {user?.role === 'admin' && (
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-slate-50 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg shadow-brand-500/10 hover:shadow-brand-500/20 transition-all"
            >
              <Plus size={14} /> Report Incident
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Mini Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-850/80 p-4 rounded-2xl">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Mapped</span>
          <span className="text-xl font-bold text-slate-200 mt-1 block">{filteredIncidents.length}</span>
        </div>
        <div className="bg-slate-900/60 border border-slate-850/80 p-4 rounded-2xl">
          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">Critical Severity</span>
          <span className="text-xl font-bold text-rose-450 mt-1 block">
            {filteredIncidents.filter(p => p.value >= 100).length}
          </span>
        </div>
        <div className="bg-slate-900/60 border border-slate-850/80 p-4 rounded-2xl">
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">High Severity</span>
          <span className="text-xl font-bold text-amber-450 mt-1 block">
            {filteredIncidents.filter(p => p.value >= 50 && p.value < 100).length}
          </span>
        </div>
        <div className="bg-slate-900/60 border border-slate-850/80 p-4 rounded-2xl">
          <span className="text-[10px] font-bold text-sky-550 uppercase tracking-wider block">Medium / Low</span>
          <span className="text-xl font-bold text-sky-400 mt-1 block">
            {filteredIncidents.filter(p => p.value < 50).length}
          </span>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search Input */}
        <div className="relative w-full md:max-w-md">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            placeholder="Search by ID, Barangay, Offense, or details..."
            className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-650 outline-none transition-all"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {/* Year Filter */}
          <select 
            value={filterYear}
            onChange={(e) => { setFilterYear(e.target.value); setCurrentPage(1); }}
            className="bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs font-semibold text-slate-355 outline-none focus:border-brand-500"
          >
            <option value="all">All Years</option>
            {uniqueYears.map(yr => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>

          {/* Severity Filter */}
          <select 
            value={filterSeverity}
            onChange={(e) => { setFilterSeverity(e.target.value); setCurrentPage(1); }}
            className="bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs font-semibold text-slate-355 outline-none focus:border-brand-500"
          >
            <option value="all">All Severities</option>
            <option value="Critical">🔴 Critical</option>
            <option value="High">🟠 High</option>
            <option value="Medium">🟡 Medium</option>
            <option value="Low">🟢 Low</option>
          </select>

          {/* Type Filter */}
          <select 
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
            className="bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs font-semibold text-slate-355 outline-none focus:border-brand-500 max-w-[200px]"
          >
            <option value="all">All Crime Types</option>
            {crimeTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-950/20">
                <th className="py-4 px-5">Incident ID</th>
                <th className="py-4 px-5">Date Committed</th>
                <th className="py-4 px-5">Time</th>
                <th className="py-4 px-5">Barangay</th>
                <th className="py-4 px-5">Incident Type</th>
                <th className="py-4 px-5">Severity</th>
                <th className="py-4 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/40 text-xs">
              {paginatedIncidents.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-16 text-center text-slate-500">
                    <ShieldAlert size={26} className="mx-auto block mb-2 text-slate-600 animate-pulse" />
                    No incidents found matching the selected query filters.
                  </td>
                </tr>
              ) : (
                paginatedIncidents.map((pt) => {
                  const isCritical = pt.value >= 100;
                  const isHigh = pt.value >= 50 && pt.value < 100;
                  const isMedium = pt.value >= 25 && pt.value < 50;

                  return (
                    <tr key={pt.id} className="hover:bg-slate-950/20 transition-colors">
                      <td className="py-3.5 px-5 font-mono text-[11px] text-brand-400 font-semibold">{pt.id || `INC-${pt.monthly}-${pt.created_at.slice(0,2)}`}</td>
                      <td className="py-3.5 px-5 text-slate-350">{pt.date_committed || 'N/A'}</td>
                      <td className="py-3.5 px-5 text-slate-400 font-mono">{pt.time_committed || 'N/A'}</td>
                      <td className="py-3.5 px-5 text-slate-200 font-medium">{pt.barangay || 'N/A'}</td>
                      <td className="py-3.5 px-5 text-slate-300 truncate max-w-[200px]" title={pt.offense || pt.name}>
                        {pt.incident_type || pt.name}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                          isCritical ? 'bg-rose-500/10 text-rose-450 border-rose-500/20' :
                          isHigh ? 'bg-amber-500/10 text-amber-450 border-amber-500/20' :
                          isMedium ? 'bg-yellow-500/10 text-yellow-450 border-yellow-500/20' :
                          'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {isCritical ? 'Critical' : isHigh ? 'High' : isMedium ? 'Medium' : 'Low'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex justify-end gap-2 items-center">
                          <button 
                            onClick={() => setSelectedIncident(pt)}
                            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors inline-flex items-center justify-center cursor-pointer"
                            title="View Details"
                          >
                            <Eye size={14} />
                          </button>
                          {onDeletePoint && user?.role === 'admin' && canDeleteIncident(pt) && (
                            <button 
                              onClick={() => {
                                setIncidentToDelete(pt);
                                setIsDeleteConfirmOpen(true);
                              }}
                              className="p-1.5 hover:bg-rose-950/40 rounded-lg text-rose-450 hover:text-rose-350 transition-colors inline-flex items-center justify-center cursor-pointer"
                              title="Delete Incident (Within 5m)"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Actions */}
        {totalPages > 1 && (
          <div className="bg-slate-950/20 border-t border-slate-800 px-5 py-4 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500">
              Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredIncidents.length)} of {filteredIncidents.length} records
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="bg-slate-900 border border-slate-850 hover:bg-slate-850 text-slate-350 disabled:text-slate-600 disabled:bg-slate-900/50 disabled:border-slate-900 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="bg-slate-900 border border-slate-850 hover:bg-slate-850 text-slate-355 disabled:text-slate-600 disabled:bg-slate-900/50 disabled:border-slate-900 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 🔍 DETAILED INCIDENT DIALOG MODAL */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button 
              onClick={() => setSelectedIncident(null)}
              className="absolute top-5 right-5 text-slate-500 hover:text-slate-300 p-1.5 hover:bg-slate-850 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center">
                <FileText size={20} />
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Incident Audit Detail</span>
                <h3 className="text-sm font-bold text-slate-100 font-mono mt-0.5">{selectedIncident.id || 'N/A'}</h3>
              </div>
            </div>

            <div className="space-y-4">
              {/* Offense & Code details */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Offense / Law Reference</span>
                <p className="text-xs text-slate-200 mt-1.5 leading-relaxed font-semibold">
                  {selectedIncident.offense || selectedIncident.name}
                </p>
                {selectedIncident.description && (
                  <p className="text-[11px] text-slate-450 mt-2 italic leading-relaxed border-t border-slate-900 pt-2">
                    {selectedIncident.description}
                  </p>
                )}
              </div>

              {/* Grid Metadata details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-850/60 flex items-center gap-3">
                  <Calendar size={14} className="text-slate-500" />
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase block font-bold">Date Committed</span>
                    <span className="text-xs text-slate-300 font-semibold">{selectedIncident.date_committed}</span>
                  </div>
                </div>

                <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-850/60 flex items-center gap-3">
                  <Clock size={14} className="text-slate-500" />
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase block font-bold">Time Committed</span>
                    <span className="text-xs text-slate-300 font-mono">{selectedIncident.time_committed}</span>
                  </div>
                </div>

                <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-850/60 flex items-center gap-3">
                  <MapPin size={14} className="text-brand-400" />
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase block font-bold">Barangay Sector</span>
                    <span className="text-xs text-slate-300 font-semibold">{selectedIncident.barangay}</span>
                  </div>
                </div>

                <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-850/60 flex items-center gap-3">
                  <ShieldAlert size={14} className="text-slate-500" />
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase block font-bold">Coordinates</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {selectedIncident.latitude.toFixed(5)}, {selectedIncident.longitude.toFixed(5)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setSelectedIncident(null)}
                className="bg-slate-950 hover:bg-slate-850 border border-slate-850 text-slate-300 font-semibold text-xs rounded-xl px-5 py-2.5 transition-colors cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ➕ ADMIN REPORT INCIDENT FORM MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button 
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-5 right-5 text-slate-500 hover:text-slate-300 p-1.5 hover:bg-slate-850 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-brand-600 text-slate-50 flex items-center justify-center">
                <Plus size={20} />
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Report Ingestion</span>
                <h3 className="text-sm font-bold text-slate-100 mt-0.5">Submit Incident Entry</h3>
              </div>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Barangay Name</label>
                <select
                  value={formBarangay}
                  onChange={(e) => setFormBarangay(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-xl px-4 py-2.5 text-xs text-slate-100 outline-none"
                >
                  {(() => {
                    const finalBarangays = barangayList.length > 0 
                      ? barangayList.map(b => b.name) 
                      : ['Santa Maria', 'Tetuan', 'Calarian', 'Ayala', 'Sangali', 'Pasonanca', 'Divisoria', 'Mampang', 'Putik', 'Talon-talon'];
                    return finalBarangays.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ));
                  })()}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Incident Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-xl px-3 py-2.5 text-xs text-slate-100 outline-none"
                  >
                    <option value="Theft">Theft</option>
                    <option value="Robbery">Robbery</option>
                    <option value="Vehicular Accident">Vehicular Accident</option>
                    <option value="Violence Against Women and Children">VAWC</option>
                    <option value="Drug-Related (Buy Bust)">Drugs</option>
                    <option value="Physical Injury">Physical Injury</option>
                    <option value="Rape">Rape</option>
                    <option value="Stabbing">Stabbing</option>
                    <option value="Shooting">Shooting</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Severity Level</label>
                  <select
                    value={formSeverity}
                    onChange={(e) => setFormSeverity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-xl px-3 py-2.5 text-xs text-slate-100 outline-none"
                  >
                    <option value="Low">🟢 Low</option>
                    <option value="Medium">🟡 Medium</option>
                    <option value="High">🟠 High</option>
                    <option value="Critical">🔴 Critical</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Date Committed</label>
                  <div
                    onClick={() => setActiveDateWizard({ field: 'formDate', step: 1, year: null, month: null, day: null })}
                    className="w-full bg-slate-950 border border-slate-850 hover:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100 outline-none cursor-pointer flex justify-between items-center transition-colors"
                  >
                    <span>{formDate}</span>
                    <Calendar size={13} className="text-slate-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Time Committed</label>
                  <div
                    onClick={() => setActiveTimeWizard({ field: 'formTime', step: 1, ampm: null, hour: null, minute: null })}
                    className="w-full bg-slate-950 border border-slate-850 hover:border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100 outline-none cursor-pointer flex justify-between items-center transition-colors"
                  >
                    <span>{formTime}</span>
                    <Clock size={13} className="text-slate-500" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Incident Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Detail the circumstances, weapon used, or incident details..."
                  rows="3"
                  className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-xl px-4 py-2.5 text-xs text-slate-100 outline-none placeholder-slate-650 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="bg-slate-950 hover:bg-slate-850 border border-slate-850 text-slate-350 font-semibold text-xs rounded-xl px-4 py-2.5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-brand-600 hover:bg-brand-500 text-slate-50 font-semibold text-xs rounded-xl px-5 py-2.5 shadow-lg shadow-brand-500/10 transition-all cursor-pointer"
                >
                  Submit Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ⚠️ DELETE INCIDENT CONFIRMATION MODAL */}
      {isDeleteConfirmOpen && incidentToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button 
              onClick={() => { setIsDeleteConfirmOpen(false); setIncidentToDelete(null); }}
              className="absolute top-5 right-5 text-slate-500 hover:text-slate-300 p-1.5 hover:bg-slate-850 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                <AlertCircle size={20} />
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Incident Report</span>
                <h3 className="text-sm font-bold text-slate-100 mt-0.5">Delete Incident?</h3>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Are you sure you want to delete <strong className="text-slate-200">{incidentToDelete.offense || 'this incident'}</strong>? This action will permanently remove the record from the database.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setIsDeleteConfirmOpen(false); setIncidentToDelete(null); }}
                className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeletePoint(incidentToDelete.id).then(success => {
                    if (success) {
                      setIsDeleteConfirmOpen(false);
                      setIncidentToDelete(null);
                    }
                  });
                }}
                className="bg-rose-600 hover:bg-rose-500 text-slate-50 font-semibold rounded-xl px-4 py-2 text-xs shadow transition-all cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📅 CUSTOM 3-STEP DATE WIZARD PICKER MODAL */}
      {activeDateWizard && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button 
              onClick={() => setActiveDateWizard(null)}
              className="absolute top-5 right-5 text-slate-500 hover:text-slate-300 p-1.5 hover:bg-slate-850 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center shrink-0">
                <Calendar size={20} />
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Wizard Step {activeDateWizard.step} of 3</span>
                <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                  {activeDateWizard.step === 1 && 'Select Calendar Year'}
                  {activeDateWizard.step === 2 && 'Select Month'}
                  {activeDateWizard.step === 3 && 'Select Calendar Day'}
                </h3>
              </div>
            </div>

            {/* STEP 1: Select Year */}
            {activeDateWizard.step === 1 && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[2023, 2024, 2025, 2026].map(y => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setActiveDateWizard({ ...activeDateWizard, step: 2, year: y })}
                    className="p-3 bg-slate-950 hover:bg-brand-600 hover:text-slate-50 border border-slate-850 hover:border-brand-500 rounded-xl text-slate-200 text-xs font-semibold transition-all cursor-pointer"
                  >
                    {y}
                  </button>
                ))}
              </div>
            )}

            {/* STEP 2: Select Month */}
            {activeDateWizard.step === 2 && (
              <div className="grid grid-cols-3 gap-2.5 mb-4">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, idx) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setActiveDateWizard({ ...activeDateWizard, step: 3, month: idx })}
                    className="p-2 bg-slate-950 hover:bg-brand-600 hover:text-slate-50 border border-slate-850 hover:border-brand-500 rounded-xl text-slate-200 text-xs font-semibold transition-all cursor-pointer"
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}

            {/* STEP 3: Select Day */}
            {activeDateWizard.step === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-7 gap-1.5 max-h-[220px] overflow-y-auto p-1 bg-slate-950 border border-slate-850 rounded-xl">
                  {(() => {
                    const daysInMonth = new Date(activeDateWizard.year, activeDateWizard.month + 1, 0).getDate();
                    const dayButtons = [];
                    for (let d = 1; d <= daysInMonth; d++) {
                      dayButtons.push(
                        <button
                          key={d}
                          type="button"
                          onClick={() => {
                            const formattedMonth = String(activeDateWizard.month + 1).padStart(2, '0');
                            const formattedDay = String(d).padStart(2, '0');
                            const fullDate = `${activeDateWizard.year}-${formattedMonth}-${formattedDay}`;
                            setFormDate(fullDate);
                            setActiveDateWizard(null);
                          }}
                          className="aspect-square flex items-center justify-center p-1 bg-slate-900 hover:bg-brand-600 hover:text-slate-50 border border-slate-800 rounded-lg text-slate-200 text-[11px] font-semibold transition-all cursor-pointer"
                        >
                          {d}
                        </button>
                      );
                    }
                    return dayButtons;
                  })()}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDateWizard({ ...activeDateWizard, step: 2, month: null })}
                  className="w-full bg-slate-950 border border-slate-800 text-[10px] text-slate-400 hover:text-slate-200 py-2 rounded-xl transition-colors"
                >
                  &larr; Back to Month Selection
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ⏰ CUSTOM 3-STEP TIME WIZARD PICKER MODAL */}
      {activeTimeWizard && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button 
              onClick={() => setActiveTimeWizard(null)}
              className="absolute top-5 right-5 text-slate-500 hover:text-slate-300 p-1.5 hover:bg-slate-850 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center shrink-0">
                <Clock size={20} />
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Wizard Step {activeTimeWizard.step} of 3</span>
                <h3 className="text-sm font-bold text-slate-100 mt-0.5">
                  {activeTimeWizard.step === 1 && 'Select Morning or Afternoon'}
                  {activeTimeWizard.step === 2 && 'Select Hour (1 - 12)'}
                  {activeTimeWizard.step === 3 && 'Select Minutes'}
                </h3>
              </div>
            </div>

            {/* STEP 1: Select AM / PM */}
            {activeTimeWizard.step === 1 && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                {['AM', 'PM'].map(ampm => (
                  <button
                    key={ampm}
                    type="button"
                    onClick={() => setActiveTimeWizard({ ...activeTimeWizard, step: 2, ampm })}
                    className="p-4 bg-slate-950 hover:bg-brand-600 hover:text-slate-50 border border-slate-850 hover:border-brand-500 rounded-xl text-slate-200 text-sm font-bold tracking-wider transition-all cursor-pointer"
                  >
                    {ampm}
                  </button>
                ))}
              </div>
            )}

            {/* STEP 2: Select Hour */}
            {activeTimeWizard.step === 2 && (
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setActiveTimeWizard({ ...activeTimeWizard, step: 3, hour: h })}
                    className="p-3 bg-slate-950 hover:bg-brand-600 hover:text-slate-50 border border-slate-850 hover:border-brand-500 rounded-xl text-slate-200 text-xs font-semibold transition-all cursor-pointer"
                  >
                    {h}
                  </button>
                ))}
              </div>
            )}

            {/* STEP 3: Select Minutes */}
            {activeTimeWizard.step === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        let finalHour = activeTimeWizard.hour;
                        if (activeTimeWizard.ampm === 'PM' && finalHour !== 12) {
                          finalHour += 12;
                        } else if (activeTimeWizard.ampm === 'AM' && finalHour === 12) {
                          finalHour = 0;
                        }
                        const formattedHour = String(finalHour).padStart(2, '0');
                        const fullTime = `${formattedHour}:${m}:00`;
                        setFormTime(fullTime);
                        setActiveTimeWizard(null);
                      }}
                      className="p-3 bg-slate-950 hover:bg-brand-600 hover:text-slate-50 border border-slate-850 hover:border-brand-500 rounded-xl text-slate-200 text-xs font-semibold transition-all cursor-pointer"
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTimeWizard({ ...activeTimeWizard, step: 2, hour: null })}
                  className="w-full bg-slate-950 border border-slate-800 text-[10px] text-slate-400 hover:text-slate-200 py-2 rounded-xl transition-colors"
                >
                  &larr; Back to Hour Selection
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
