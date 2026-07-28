import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Shield, Users, AlertOctagon, Activity, Download, Search, CheckCircle, X, Edit2, Trash2 } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export default function OfficerDeployment({ user, filterYear, filterMonth }) {
  const [officers, setOfficers] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRisk, setFilterRisk] = useState('all');
  const [filterStation, setFilterStation] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [filterYearLocal, setFilterYearLocal] = useState(() => {
    return (filterYear && filterYear !== 'all' && filterYear !== '2025')
      ? filterYear
      : new Date().getFullYear().toString();
  });
  const [filterMonthLocal, setFilterMonthLocal] = useState(() => {
    return (filterMonth && filterMonth !== 'all')
      ? filterMonth
      : 'all';
  });

  const [sortField, setSortField] = useState('incidents');
  const [sortDirection, setSortDirection] = useState('desc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  // New Roster sub-tab states & CRUD handlers
  const [deploymentTab, setDeploymentTab] = useState('sectors'); // 'sectors' or 'roster'
  const [toastMessage, setToastMessage] = useState(null);
  const [newBadge, setNewBadge] = useState('');
  const [newName, setNewName] = useState('');
  const [newRank, setNewRank] = useState('Patrolman');
  const [newShift, setNewShift] = useState('Day');
  const [newStatus, setNewStatus] = useState('Active');
  const [newBarangay, setNewBarangay] = useState('Santa Maria');
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterPage, setRosterPage] = useState(1);
  const rosterItemsPerPage = 10;
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);

  // Edit & Delete Modal states
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [officerToDelete, setOfficerToDelete] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [officerToEdit, setOfficerToEdit] = useState(null);
  const [editBadge, setEditBadge] = useState('');
  const [editName, setEditName] = useState('');
  const [editRank, setEditRank] = useState('Patrolman');
  const [editShift, setEditShift] = useState('Day');
  const [editStatus, setEditStatus] = useState('Active');
  const [editBarangay, setEditBarangay] = useState('Santa Maria');
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [pendingImportOfficers, setPendingImportOfficers] = useState([]);

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target.result;
        const parseCSV = (csvText) => {
          const result = [];
          let currentRecord = [''];
          let inQuotes = false;
          for (let i = 0; i < csvText.length; i++) {
            const char = csvText[i];
            const nextChar = csvText[i + 1];
            if (char === '"') {
              if (inQuotes && nextChar === '"') { currentRecord[currentRecord.length - 1] += '"'; i++; }
              else inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              currentRecord.push('');
            } else if ((char === '\r' || char === '\n') && !inQuotes) {
              if (char === '\r' && nextChar === '\n') i++;
              result.push(currentRecord);
              currentRecord = [''];
            } else {
              currentRecord[currentRecord.length - 1] += char;
            }
          }
          if (currentRecord.length > 1 || currentRecord[0] !== '') result.push(currentRecord);
          return result;
        };

        const csvRecords = parseCSV(text);
        if (csvRecords.length <= 1) {
          triggerToast("Error: Empty or invalid CSV file.");
          return;
        }

        const headers = csvRecords[0].map(h => h.trim().replace(/^\uFEFF/, ''));
        const parsedOfficers = [];

        for (let i = 1; i < csvRecords.length; i++) {
          const row = csvRecords[i];
          if (row.length === 1 && !row[0].trim()) continue;
          const obj = {};
          headers.forEach((header, idx) => {
            if (header) {
              obj[header] = row[idx]?.trim() || '';
            }
          });

          const badge = obj.badge_number || obj.badge || '';
          const name = obj.full_name || obj.name || '';
          const rank = obj.rank || 'Patrolman';
          const barangay = obj.assigned_barangay || obj.barangay || '';
          let shift = obj.shift || 'Day';
          if (shift === 'Morning / Day') shift = 'Day';
          else if (shift === 'Afternoon / Day') shift = 'Afternoon';
          else if (shift === 'Evening / Night') shift = 'Evening';
          else if (shift === 'Dawn / Night') shift = 'Night';
          const status = obj.status || 'Active';
          const station = obj.police_station || obj.station || 'PS 01';

          if (badge && name) {
            parsedOfficers.push({
              badge_number: badge,
              full_name: name,
              rank: rank,
              assigned_barangay: barangay,
              shift: shift,
              status: status,
              police_station: station
            });
          }
        }

        if (parsedOfficers.length === 0) {
          triggerToast("Error: No valid officer records found (must contain badge_number and full_name).");
          return;
        }

        setPendingImportOfficers(parsedOfficers);
        setIsImportConfirmOpen(true);
      } catch (err) {
        triggerToast(`Error parsing CSV: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = () => {
    if (pendingImportOfficers.length === 0) return;
    setImporting(true);
    setIsImportConfirmOpen(false);

    fetch('http://127.0.0.1:8000/api/v1/officers/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ officers: pendingImportOfficers })
    })
      .then(res => {
        if (!res.ok) throw new Error("Bulk import request failed.");
        return res.json();
      })
      .then(res => {
        triggerToast(`Success: Imported ${res.count} patrol officers.`);
        fetchDeploymentData();
        if (fileInputRef.current) fileInputRef.current.value = '';
      })
      .catch(err => triggerToast(`Error: ${err.message}`))
      .finally(() => {
        setImporting(false);
        setPendingImportOfficers([]);
      });
  };

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCreateOfficer = (e) => {
    e.preventDefault();
    if (!newBadge.trim() || !newName.trim()) {
      triggerToast("Error: Badge number and full name are required.");
      return;
    }
    fetch('http://127.0.0.1:8000/api/v1/officers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        badge_number: newBadge,
        full_name: newName,
        rank: newRank,
        shift: newShift,
        status: newStatus,
        assigned_barangay: newBarangay,
        police_station: 'PS 01'
      })
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => { throw new Error(err.error?.badge_number?.[0] || 'Registration failed') });
        }
        return res.json();
      })
      .then(() => {
        triggerToast("Success: Registered new patrol officer.");
        setNewBadge('');
        setNewName('');
        fetchDeploymentData();
      })
      .catch(err => triggerToast(`Error: ${err.message}`));
  };

  const handleDeleteOfficer = (id) => {
    fetch(`http://127.0.0.1:8000/api/v1/officers/${id}`, {
      method: 'DELETE'
    })
      .then(res => {
        if (!res.ok) throw new Error("Decommissioning failed");
        return res.json();
      })
      .then(() => {
        triggerToast("Success: Decommissioned officer profile.");
        fetchDeploymentData();
      })
      .catch(err => triggerToast(`Error: ${err.message}`));
  };

  const handleDeleteClick = (officer) => {
    setOfficerToDelete(officer);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!officerToDelete) return;
    handleDeleteOfficer(officerToDelete.id);
    setIsDeleteConfirmOpen(false);
    setOfficerToDelete(null);
  };

  const handleEditClick = (officer) => {
    setOfficerToEdit(officer);
    setEditBadge(officer.badge_number || '');
    setEditName(officer.full_name || '');
    setEditRank(officer.rank || 'Patrolman');
    let editShiftVal = officer.shift || 'Morning / Day';
    if (editShiftVal === 'Day') editShiftVal = 'Morning / Day';
    else if (editShiftVal === 'Evening') editShiftVal = 'Evening / Night';
    else if (editShiftVal === 'Night') editShiftVal = 'Dawn / Night';
    setEditShift(editShiftVal);
    setEditStatus(officer.status || 'Active');
    setEditBarangay(officer.assigned_barangay || 'Santa Maria');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!officerToEdit) return;
    if (!editBadge.trim() || !editName.trim()) {
      triggerToast("Error: Badge number and full name are required.");
      return;
    }
    fetch(`http://127.0.0.1:8000/api/v1/officers/${officerToEdit.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        badge_number: editBadge,
        full_name: editName,
        rank: editRank,
        shift: editShift,
        status: editStatus,
        assigned_barangay: editBarangay
      })
    })
      .then(res => {
        if (!res.ok) {
          return res.json().then(err => { throw new Error(err.error?.badge_number?.[0] || 'Update failed') });
        }
        return res.json();
      })
      .then(() => {
        triggerToast("Success: Updated officer profile.");
        setIsEditModalOpen(false);
        setOfficerToEdit(null);
        fetchDeploymentData();
      })
      .catch(err => triggerToast(`Error: ${err.message}`));
  };

  const handleUpdateStatus = (id, currentStatus) => {
    const statuses = ['Active', 'Deployed', 'On-Leave', 'Off-Duty'];
    const nextIdx = (statuses.indexOf(currentStatus) + 1) % statuses.length;
    const nextStatus = statuses[nextIdx];

    fetch(`http://127.0.0.1:8000/api/v1/officers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus })
    })
      .then(res => {
        if (!res.ok) throw new Error("Update failed");
        return res.json();
      })
      .then(() => {
        triggerToast(`Success: Updated status to ${nextStatus}.`);
        fetchDeploymentData();
      })
      .catch(err => triggerToast(`Error: ${err.message}`));
  };

  const handleUpdateShift = (id, currentShift) => {
    const shifts = ['Morning / Day', 'Afternoon / Day', 'Evening / Night', 'Dawn / Night'];
    let nextIdx = (shifts.indexOf(currentShift) + 1) % shifts.length;
    if (nextIdx < 0) nextIdx = 0; // fallback if currentShift is not in list
    const nextShift = shifts[nextIdx];

    fetch(`http://127.0.0.1:8000/api/v1/officers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shift: nextShift })
    })
      .then(res => {
        if (!res.ok) throw new Error("Update failed");
        return res.json();
      })
      .then(() => {
        triggerToast(`Success: Updated shift to ${nextShift}.`);
        fetchDeploymentData();
      })
      .catch(err => triggerToast(`Error: ${err.message}`));
  };

  const fetchDeploymentData = () => {
    setLoading(true);
    // Fetch both endpoints concurrently
    Promise.all([
      fetch('http://127.0.0.1:8000/api/v1/officers').then(res => res.json()),
      fetch(`http://127.0.0.1:8000/api/v1/barangays?year=${filterYearLocal}&month=${filterMonthLocal}`).then(res => res.json())
    ])
      .then(([officerData, barangayData]) => {
        if (Array.isArray(officerData)) setOfficers(officerData);
        if (Array.isArray(barangayData)) setBarangays(barangayData);
      })
      .catch(err => console.error("Failed to load deployment data:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDeploymentData();
  }, [filterYearLocal, filterMonthLocal]);

  // Sync with global filterYear/filterMonth when they change, ignoring default globals '2025' and 'all'
  useEffect(() => {
    if (filterYear && filterYear !== 'all' && filterYear !== '2025') {
      setFilterYearLocal(filterYear);
    }
  }, [filterYear]);

  useEffect(() => {
    if (filterMonth && filterMonth !== 'all') {
      setFilterMonthLocal(filterMonth);
    }
  }, [filterMonth]);

  // Compute stats
  const totalOfficers = officers.length;
  const criticalBarangaysCount = barangays.filter(b => b.risk === 'Critical').length;

  // Coverage rate: % of barangays with officers >= 3
  const coveredBarangaysCount = barangays.filter(b => b.officers >= 3).length;
  const coverageRate = barangays.length > 0 ? Math.round((coveredBarangaysCount / barangays.length) * 100) : 0;

  // Shift counts
  const shiftDistribution = useMemo(() => {
    let morningDay = 0, afternoonDay = 0, eveningNight = 0, dawnNight = 0;
    officers.forEach(o => {
      if (o.shift === 'Morning / Day') morningDay++;
      else if (o.shift === 'Afternoon / Day') afternoonDay++;
      else if (o.shift === 'Evening / Night') eveningNight++;
      else if (o.shift === 'Dawn / Night') dawnNight++;
      // Handle legacy shifts safely so they fall back to new groups
      else if (o.shift === 'Day') morningDay++;
      else if (o.shift === 'Evening') eveningNight++;
      else if (o.shift === 'Night') dawnNight++;
    });
    return { morningDay, afternoonDay, eveningNight, dawnNight };
  }, [officers]);

  // Aggregate officers per Police Station
  const stationChartData = useMemo(() => {
    const stationMap = {};
    officers.forEach(o => {
      if (o.police_station) {
        stationMap[o.police_station] = (stationMap[o.police_station] || 0) + 1;
      }
    });
    return Object.entries(stationMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [officers]);

  // Donut chart colors
  const SHIFT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
  const shiftChartData = [
    { name: 'Morning / Day Shift', value: shiftDistribution.morningDay },
    { name: 'Afternoon / Day Shift', value: shiftDistribution.afternoonDay },
    { name: 'Evening / Night Shift', value: shiftDistribution.eveningNight },
    { name: 'Dawn / Night shift', value: shiftDistribution.dawnNight },
  ];

  // List of Police Stations for filter
  const stationsList = useMemo(() => {
    const stations = new Set();
    officers.forEach(o => {
      if (o.police_station) stations.add(o.police_station);
    });
    return Array.from(stations).sort();
  }, [officers]);

  // Aggregate deployment list
  const deploymentList = useMemo(() => {
    return barangays
      .map(b => {
        // Calculate shift splits dynamically based on standard 40% Day, 35% Eve, 25% Night formula
        const total = b.officers;
        const day = Math.round(total * 0.40);
        const evening = Math.round(total * 0.35);
        const night = total - day - evening;

        // Find associated police station
        const stationMatch = officers.find(o => o.assigned_barangay === b.name);
        const ps = stationMatch ? stationMatch.police_station : 'PS 12';

        // Efficiency score formula: min(100, officers / (incidents * 0.4) * 100)
        const efficiency = b.incidents > 0
          ? Math.min(100, Math.round((total / Math.max(b.incidents * 0.4, 1)) * 100))
          : 100;

        return {
          ...b,
          ps,
          day,
          evening,
          night,
          efficiency
        };
      })
      .filter(b => {
        const searchLower = searchTerm.toLowerCase();
        const matchSearch = searchTerm === '' || b.name.toLowerCase().includes(searchLower) || b.ps.toLowerCase().includes(searchLower);
        const matchRisk = filterRisk === 'all' || b.risk.toLowerCase() === filterRisk.toLowerCase();
        const matchStation = filterStation === 'all' || b.ps === filterStation;
        return matchSearch && matchRisk && matchStation;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        // Handle string comparison for barangay name (name)
        if (typeof valA === 'string') {
          return sortDirection === 'asc'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }

        // Handle numeric comparison
        return sortDirection === 'asc'
          ? valA - valB
          : valB - valA;
      });
  }, [barangays, officers, searchTerm, filterRisk, filterStation, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(deploymentList.length / itemsPerPage) || 1;
  const paginatedDeployments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return deploymentList.slice(start, start + itemsPerPage);
  }, [deploymentList, currentPage]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Filtered officers list for roster subview
  const filteredRoster = useMemo(() => {
    return officers.filter(o => {
      const searchLower = rosterSearch.toLowerCase();
      return rosterSearch === '' ||
        o.full_name.toLowerCase().includes(searchLower) ||
        o.badge_number.toLowerCase().includes(searchLower) ||
        (o.assigned_barangay && o.assigned_barangay.toLowerCase().includes(searchLower)) ||
        (o.rank && o.rank.toLowerCase().includes(searchLower));
    });
  }, [officers, rosterSearch]);

  const totalRosterPages = Math.ceil(filteredRoster.length / rosterItemsPerPage) || 1;
  const safeRosterPage = Math.min(rosterPage, totalRosterPages);
  const paginatedRoster = useMemo(() => {
    const start = (safeRosterPage - 1) * rosterItemsPerPage;
    return filteredRoster.slice(start, start + rosterItemsPerPage);
  }, [filteredRoster, safeRosterPage]);

  const handleRosterPageChange = (page) => {
    if (page >= 1 && page <= totalRosterPages) {
      setRosterPage(page);
    }
  };

  // Export deployment list as CSV
  const handleExportCSV = () => {
    const headers = 'Barangay,Police Station,Incidents count,Risk Level,Total Officers,Day Shift,Evening Shift,Night Shift,Efficiency %\n';
    const rows = deploymentList.map(b => {
      return `"${b.name}","${b.ps}","${b.incidents}","${b.risk}","${b.officers}","${b.day}","${b.evening}","${b.night}","${b.efficiency}%"`;
    }).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `GRAPS_officer_deployment_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Matrix Top 10 barangays Day/Night scheduling matrix
  const matrixBarangays = useMemo(() => {
    return barangays
      .filter(b => b.incidents > 0)
      .sort((a, b) => b.incidents - a.incidents)
      .slice(0, 10);
  }, [barangays]);

  return (
    <div className="p-8 max-w-[1600px] w-full mx-auto space-y-6">

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Officer Deployment Matrix</h2>
          <p className="text-xs text-slate-500">Tactical staffing grids and station patrol efficiency audits</p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={deploymentList.length === 0}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 disabled:text-slate-650 disabled:bg-slate-950/20 disabled:border-slate-900 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl px-5 py-3.5 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle size={16} className="text-emerald-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Sub-tab Selection */}
      <div className="flex border-b border-slate-850 gap-4 text-xs font-semibold">
        <button
          onClick={() => setDeploymentTab('sectors')}
          className={`pb-3 px-1 transition-all border-b-2 cursor-pointer ${deploymentTab === 'sectors' ? 'border-brand-500 text-brand-400 font-bold' : 'border-transparent text-slate-450 hover:text-slate-200'
            }`}
        >
          Sectors & Coverage Levels
        </button>
        <button
          onClick={() => setDeploymentTab('roster')}
          className={`pb-3 px-1 transition-all border-b-2 cursor-pointer ${deploymentTab === 'roster' ? 'border-brand-500 text-brand-400 font-bold' : 'border-transparent text-slate-450 hover:text-slate-200'
            }`}
        >
          Active Patrol Roster
        </button>
      </div>

      {deploymentTab === 'sectors' && (
        <>
          {/* KPIs Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 flex items-center justify-between shadow-lg">
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Total Staff Deployed</span>
                <span className="text-xl font-bold text-slate-200 mt-1 block">{totalOfficers} Officers</span>
              </div>
              <div className="w-10 h-10 bg-brand-500/10 text-brand-400 rounded-xl flex items-center justify-center">
                <Users size={18} />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 flex items-center justify-between shadow-lg">
              <div>
                <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wider block">Critical Zones</span>
                <span className="text-xl font-bold text-rose-450 mt-1 block">{criticalBarangaysCount} Zones</span>
              </div>
              <div className="w-10 h-10 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center">
                <AlertOctagon size={18} />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 flex items-center justify-between shadow-lg">
              <div>
                <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider block">Coverage Index</span>
                <span className="text-xl font-bold text-emerald-450 mt-1 block">{coverageRate}% Covered</span>
              </div>
              <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center">
                <Shield size={18} />
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 flex items-center justify-between shadow-lg">
              <div>
                <span className="text-[9px] font-bold text-violet-500 uppercase tracking-wider block">Active Shift Splits</span>
                <span className="text-[10px] text-slate-350 mt-1 block font-semibold leading-relaxed">
                  Morn: {shiftDistribution.morningDay} | Aft: {shiftDistribution.afternoonDay} | Eve: {shiftDistribution.eveningNight} | Dawn: {shiftDistribution.dawnNight}
                </span>
              </div>
              <div className="w-10 h-10 bg-violet-500/10 text-violet-400 rounded-xl flex items-center justify-center">
                <Activity size={18} />
              </div>
            </div>
          </div>

          {/* Visual Analytics Charts Split */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

            {/* Police Station Distribution Chart */}
            <div className="md:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Officers per Police Station</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stationChartData} layout="vertical" margin={{ left: -10, right: 10, top: 0, bottom: 0 }}>
                    <XAxis type="number" stroke="#475569" fontSize={9} />
                    <YAxis dataKey="name" type="category" stroke="#475569" fontSize={9} width={50} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0d1228', borderColor: '#1e293b', borderRadius: '10px' }}
                      labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold' }}
                      itemStyle={{ color: '#3b82f6', fontSize: '11px' }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Shift Distribution Donut Chart */}
            <div className="md:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Staff Shift Split</h3>
              <div className="h-44 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={shiftChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {shiftChartData.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={SHIFT_COLORS[idx % SHIFT_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>

                {/* Center absolute indicator count */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
                  <span className="text-lg font-bold text-slate-100">{totalOfficers}</span>
                  <span className="text-[8px] text-slate-500 uppercase tracking-wider font-semibold">Total Staff</span>
                </div>
              </div>

              {/* Shift legend details */}
              <div className="space-y-1.5 pt-2">
                {shiftChartData.map((entry, idx) => (
                  <div key={entry.name} className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: SHIFT_COLORS[idx] }}></span>
                      <span className="text-slate-400">{entry.name}</span>
                    </div>
                    <span className="font-mono text-slate-200 font-semibold">{entry.value} officers</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Barangay Staffing Allocation Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">

            {/* Table filters */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="relative w-full sm:max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  placeholder="Search barangay or station..."
                  className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-650 outline-none"
                />
              </div>

              <div className="flex gap-2.5 w-full sm:w-auto">
                {/* Year filter */}
                <select
                  value={filterYearLocal}
                  onChange={(e) => { setFilterYearLocal(e.target.value); setCurrentPage(1); }}
                  className="bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-350 outline-none cursor-pointer"
                >
                  <option value="2024">📅 Year 2024</option>
                  <option value="2025">📅 Year 2025</option>
                  <option value="2026">📅 Year 2026</option>
                </select>

                {/* Month filter */}
                <select
                  value={filterMonthLocal}
                  onChange={(e) => { setFilterMonthLocal(e.target.value); setCurrentPage(1); }}
                  className="bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-350 outline-none cursor-pointer"
                >
                  <option value="all">📅 All Months</option>
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, idx) => {
                    const currentYear = new Date().getFullYear().toString();
                    const currentMonthIdx = new Date().getMonth();
                    const isDisabled = filterYearLocal === currentYear && idx > currentMonthIdx;
                    return (
                      <option key={m} value={m} disabled={isDisabled}>
                        {m}
                      </option>
                    );
                  })}
                </select>

                {/* Risk filter */}
                <select
                  value={filterRisk}
                  onChange={(e) => { setFilterRisk(e.target.value); setCurrentPage(1); }}
                  className="bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-350 outline-none"
                >
                  <option value="all">All Risk Levels</option>
                  <option value="critical">🔴 Critical</option>
                  <option value="high">🟠 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">🟢 Low</option>
                </select>

                {/* Station filter */}
                <select
                  value={filterStation}
                  onChange={(e) => { setFilterStation(e.target.value); setCurrentPage(1); }}
                  className="bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-350 outline-none"
                >
                  <option value="all">All Stations</option>
                  {stationsList.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Staff Table Grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider select-none">
                    <th className="py-2.5 px-3">Rank #</th>
                    <th
                      onClick={() => handleSort('name')}
                      className="py-2.5 px-3 hover:text-slate-300 cursor-pointer transition-colors"
                    >
                      Barangay {sortField === 'name' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th className="py-2.5 px-3">Police Station</th>
                    <th
                      onClick={() => handleSort('incidents')}
                      className="py-2.5 px-3 text-center hover:text-slate-300 cursor-pointer transition-colors"
                    >
                      Incidents {sortField === 'incidents' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th className="py-2.5 px-3">Risk Level</th>
                    <th
                      onClick={() => handleSort('officers')}
                      className="py-2.5 px-3 text-center hover:text-slate-300 cursor-pointer transition-colors"
                    >
                      Staff Count {sortField === 'officers' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th
                      onClick={() => handleSort('day')}
                      className="py-2.5 px-3 text-center hover:text-slate-300 cursor-pointer transition-colors"
                    >
                      Day Shift {sortField === 'day' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th
                      onClick={() => handleSort('evening')}
                      className="py-2.5 px-3 text-center hover:text-slate-300 cursor-pointer transition-colors"
                    >
                      Eve Shift {sortField === 'evening' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th
                      onClick={() => handleSort('night')}
                      className="py-2.5 px-3 text-center hover:text-slate-300 cursor-pointer transition-colors"
                    >
                      Night Shift {sortField === 'night' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th
                      onClick={() => handleSort('efficiency')}
                      className="py-2.5 px-3 text-right hover:text-slate-300 cursor-pointer transition-colors"
                    >
                      Patrol Efficiency {sortField === 'efficiency' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/40 text-xs">
                  {paginatedDeployments.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="py-10 text-center text-slate-500">
                        No active deployment sectors match your criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedDeployments.map((b, index) => {
                      const rank = (currentPage - 1) * itemsPerPage + index + 1;
                      const isCritical = b.risk === 'Critical';
                      const isHigh = b.risk === 'High';
                      const isMedium = b.risk === 'Medium';

                      return (
                        <tr key={b.name} className="hover:bg-slate-950/20 transition-colors">
                          <td className="py-3 px-3 font-semibold text-slate-500">{rank}</td>
                          <td className="py-3 px-3 font-semibold text-slate-200">{b.name}</td>
                          <td className="py-3 px-3 text-slate-400 font-medium">{b.ps}</td>
                          <td className="py-3 px-3 text-center font-semibold text-slate-350">{b.incidents}</td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${isCritical ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                isHigh ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                  isMedium ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              }`}>
                              {b.risk}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-brand-400">{b.officers}</td>
                          <td className="py-3 px-3 text-center text-slate-350">{b.day}</td>
                          <td className="py-3 px-3 text-center text-slate-350">{b.evening}</td>
                          <td className="py-3 px-3 text-center text-slate-350">{b.night}</td>

                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-2.5">
                              <span className="font-mono font-bold text-[10px] text-slate-300">{b.efficiency}%</span>
                              <div className="w-16 h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-850">
                                <div
                                  className={`h-full rounded-full ${b.efficiency >= 80 ? 'bg-emerald-500' :
                                      b.efficiency >= 50 ? 'bg-yellow-500' :
                                        'bg-rose-500'
                                    }`}
                                  style={{ width: `${b.efficiency}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination actions */}
            {totalPages > 1 && (
              <div className="bg-slate-950/20 border-t border-slate-800/80 px-4 pt-4 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-semibold">
                  Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, deploymentList.length)} of {deploymentList.length} sectors
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="bg-slate-900 border border-slate-850 hover:bg-slate-850 text-slate-350 disabled:text-slate-600 disabled:bg-slate-900/50 disabled:border-slate-900 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="bg-slate-900 border border-slate-850 hover:bg-slate-850 text-slate-355 disabled:text-slate-600 disabled:bg-slate-900/50 disabled:border-slate-900 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Weekly Staffing Patrol Matrix (Top 10 most active) */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <div>
              <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider">Weekly Staffing Matrix</h3>
              <p className="text-[10px] text-slate-550 mt-0.5">Top 10 sectors active shift schedule. Weekend shifts highlight the tactical boost (🔺 +1 Officer).</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-850 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 text-left pl-3">Sectors / Barangay</th>
                    <th className="py-2.5">Mon</th>
                    <th className="py-2.5">Tue</th>
                    <th className="py-2.5">Wed</th>
                    <th className="py-2.5">Thu</th>
                    <th className="py-2.5">Fri</th>
                    <th className="py-2.5 bg-violet-500/5 text-violet-400">Sat (Boost)</th>
                    <th className="py-2.5 bg-violet-500/5 text-violet-400">Sun (Boost)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/30 text-xs">
                  {matrixBarangays.map((b) => {
                    const total = b.officers > 0 ? b.officers : Math.max(2, Math.floor(b.incidents / 15));
                    const isCritOrHigh = b.risk === 'Critical' || b.risk === 'High';

                    return (
                      <tr key={b.name + '-matrix'} className="hover:bg-slate-950/20">
                        <td className="py-3 text-left pl-3 font-semibold text-slate-300">{b.name}</td>

                        {/* Weekdays */}
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
                          <td key={day} className="py-3 text-slate-400 font-mono font-semibold">
                            {total}
                          </td>
                        ))}

                        {/* Weekends with +1 boost for Critical/High */}
                        <td className="py-3 bg-violet-500/5 text-slate-300 font-mono font-bold">
                          {isCritOrHigh ? (
                            <span className="inline-flex items-center gap-0.5 text-violet-400">
                              {total + 1} <span className="text-[8px] animate-pulse">🔺</span>
                            </span>
                          ) : total}
                        </td>
                        <td className="py-3 bg-violet-500/5 text-slate-300 font-mono font-bold">
                          {isCritOrHigh ? (
                            <span className="inline-flex items-center gap-0.5 text-violet-400">
                              {total + 1} <span className="text-[8px] animate-pulse">🔺</span>
                            </span>
                          ) : total}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {deploymentTab === 'roster' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">

          {/* Admin Tools: Hire Officer Form */}
          {user?.role === 'admin' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">Register / Hire Patrol Officers</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Enlist active personnel into duty rosters manually or via CSV upload</p>
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleImportCSV}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importing}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-brand-500/10 text-brand-400 border border-brand-500/20 hover:bg-brand-500/20 transition-all cursor-pointer"
                  >
                    {importing ? "Importing Roster..." : "Upload Roster CSV"}
                  </button>
                </div>
              </div>

              <form onSubmit={handleCreateOfficer} className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-850">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Badge Number</label>
                  <input
                    type="text"
                    value={newBadge}
                    onChange={(e) => setNewBadge(e.target.value)}
                    placeholder="PCG-2024..."
                    className="bg-slate-900 border border-slate-800 text-slate-200 placeholder:text-slate-600 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="bg-slate-900 border border-slate-800 text-slate-200 placeholder:text-slate-600 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Rank</label>
                  <select
                    value={newRank}
                    onChange={(e) => setNewRank(e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 cursor-pointer transition-colors"
                  >
                    <option value="Patrolman">Patrolman</option>
                    <option value="Patrolwoman">Patrolwoman</option>
                    <option value="Police Corporal">Police Corporal</option>
                    <option value="Police Staff Sergeant">Police Staff Sergeant</option>
                    <option value="Police Master Sergeant">Police Master Sergeant</option>
                    <option value="Police Senior Master Sergeant">Police Senior Master Sergeant</option>
                    <option value="Police Chief Master Sergeant">Police Chief Master Sergeant</option>
                    <option value="Police Lieutenant">Police Lieutenant</option>
                    <option value="Police Captain">Police Captain</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Shift</label>
                  <select
                    value={newShift}
                    onChange={(e) => setNewShift(e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 cursor-pointer transition-colors"
                  >
                    <option value="Day">Morning / Day Shift</option>
                    <option value="Afternoon">Afternoon Shift</option>
                    <option value="Evening">Evening Shift</option>
                    <option value="Night">Night Shift</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Barangay</label>
                  <select
                    value={newBarangay}
                    onChange={(e) => setNewBarangay(e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 cursor-pointer transition-colors"
                  >
                    {barangays.map(b => (
                      <option key={b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col justify-end">
                  <button
                    type="submit"
                    className="w-full bg-brand-600 hover:bg-brand-500 text-slate-50 font-bold px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer h-[30px]"
                  >
                    Register
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Roster Database List */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-200">Enlisted Personnel Directory</h3>
                <p className="text-xs text-slate-500 mt-0.5">Browse active duty ZCPO officers and check sector locations</p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  value={rosterSearch}
                  onChange={(e) => { setRosterSearch(e.target.value); setRosterPage(1); }}
                  placeholder="Search by name, badge, rank or sector..."
                  className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 text-slate-300 rounded-xl pl-9 pr-4 py-2.5 text-xs outline-none shadow-lg"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-850 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-850 bg-slate-950/60 text-[9px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                    <th className="py-2.5 px-3">Badge No</th>
                    <th className="py-2.5 px-3">Officer Name</th>
                    <th className="py-2.5 px-3">Rank</th>
                    <th className="py-2.5 px-3">Barangay Sector</th>
                    <th className="py-2.5 px-3 text-center">Shift Schedule</th>
                    <th className="py-2.5 px-3 text-center">Duty Status</th>
                    {user?.role === 'admin' && <th className="py-2.5 px-3 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/40 text-slate-350 bg-slate-900/50">
                  {paginatedRoster.length > 0 ? (
                    paginatedRoster.map((off) => (
                      <tr key={off.id} className="hover:bg-slate-950/20">
                        <td className="py-2.5 px-3 font-mono text-[10px] text-brand-400 font-semibold">{off.badge_number}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-200">{off.full_name}</td>
                        <td className="py-2.5 px-3 text-slate-400">{off.rank}</td>
                        <td className="py-2.5 px-3 text-slate-300 font-medium">{off.assigned_barangay || 'Unassigned'}</td>
                        <td className="py-2.5 px-3 text-center">
                          {user?.role === 'admin' ? (
                            <button
                              type="button"
                              onClick={() => handleUpdateShift(off.id, off.shift)}
                              className="px-2 py-0.5 rounded text-[9px] font-semibold bg-slate-950 border border-slate-850 hover:bg-slate-850 text-slate-300 transition-all cursor-pointer"
                            >
                              {off.shift || 'N/A'}
                            </button>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-slate-950 border border-slate-850 text-slate-400">
                              {off.shift || 'N/A'}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {user?.role === 'admin' ? (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(off.id, off.status)}
                              className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider cursor-pointer ${off.status === 'Active' || off.status === 'Deployed' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' :
                                  off.status === 'On-Leave' ? 'bg-amber-500/10 border-amber-500/25 text-amber-400' :
                                    'bg-slate-500/10 border-slate-500/25 text-slate-400'
                                }`}
                            >
                              {off.status}
                            </button>
                          ) : (
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${off.status === 'Active' || off.status === 'Deployed' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' :
                                off.status === 'On-Leave' ? 'bg-amber-500/10 border-amber-500/25 text-amber-400' :
                                  'bg-slate-500/10 border-slate-500/25 text-slate-400'
                              }`}>
                              {off.status}
                            </span>
                          )}
                        </td>
                        {user?.role === 'admin' && (
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex justify-end gap-3 items-center">
                              <button
                                type="button"
                                onClick={() => handleEditClick(off)}
                                className="text-[10px] font-semibold text-brand-400 hover:text-brand-300 cursor-pointer flex items-center gap-1"
                              >
                                <Edit2 size={10} /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteClick(off)}
                                className="text-[10px] font-semibold text-rose-400 hover:text-rose-300 cursor-pointer flex items-center gap-1"
                              >
                                <Trash2 size={10} /> Decommission
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={user?.role === 'admin' ? 7 : 6} className="py-8 text-center text-slate-500 italic">
                        No patrol officers found matching search query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination actions */}
            {totalRosterPages > 1 && (
              <div className="bg-slate-950/20 border-t border-slate-800/80 pt-4 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-semibold">
                  Showing {(safeRosterPage - 1) * rosterItemsPerPage + 1}–{Math.min(safeRosterPage * rosterItemsPerPage, filteredRoster.length)} of {filteredRoster.length} officers
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRosterPageChange(safeRosterPage - 1)}
                    disabled={safeRosterPage === 1}
                    className="bg-slate-900 border border-slate-850 hover:bg-slate-850 text-slate-350 disabled:text-slate-600 disabled:bg-slate-900/50 disabled:border-slate-900 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handleRosterPageChange(safeRosterPage + 1)}
                    disabled={safeRosterPage === totalRosterPages}
                    className="bg-slate-900 border border-slate-850 hover:bg-slate-850 text-slate-355 disabled:text-slate-600 disabled:bg-slate-900/50 disabled:border-slate-900 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      )}


      {/* ⚠️ DECOMMISSION OFFICER CONFIRMATION MODAL */}
      {isDeleteConfirmOpen && officerToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="absolute top-5 right-5 text-slate-500 hover:text-slate-300 p-1.5 hover:bg-slate-850 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <AlertOctagon size={20} />
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Action Required</span>
                <h3 className="text-sm font-bold text-slate-100 mt-0.5">Confirm Decommission</h3>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Are you sure you want to decommission <strong className="text-slate-200">{officerToDelete.full_name}</strong> (Badge: <code className="text-brand-400 font-semibold">{officerToDelete.badge_number}</code>)? This will permanently remove them from the deployment roster.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="bg-rose-600 hover:bg-rose-500 text-slate-50 font-semibold rounded-xl px-4 py-2 text-xs shadow transition-all cursor-pointer"
              >
                Decommission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✏️ EDIT OFFICER DETAILS MODAL */}
      {isEditModalOpen && officerToEdit && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-5 right-5 text-slate-500 hover:text-slate-300 p-1.5 hover:bg-slate-850 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-brand-600 text-slate-50 flex items-center justify-center">
                <Edit2 size={18} />
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Administration</span>
                <h3 className="text-sm font-bold text-slate-100 mt-0.5">Edit Patrol Officer</h3>
              </div>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Badge Number</label>
                  <input
                    type="text"
                    value={editBadge}
                    onChange={(e) => setEditBadge(e.target.value)}
                    placeholder="PCG-2024..."
                    className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-xl px-4 py-2.5 text-xs text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-xl px-4 py-2.5 text-xs text-slate-100 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Rank</label>
                <select
                  value={editRank}
                  onChange={(e) => setEditRank(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-xl px-4 py-2.5 text-xs text-slate-150 outline-none cursor-pointer"
                >
                  <option value="Patrolman">Patrolman</option>
                  <option value="Patrolwoman">Patrolwoman</option>
                  <option value="Police Corporal">Police Corporal</option>
                  <option value="Police Staff Sergeant">Police Staff Sergeant</option>
                  <option value="Police Master Sergeant">Police Master Sergeant</option>
                  <option value="Police Senior Master Sergeant">Police Senior Master Sergeant</option>
                  <option value="Police Chief Master Sergeant">Police Chief Master Sergeant</option>
                  <option value="Police Lieutenant">Police Lieutenant</option>
                  <option value="Police Captain">Police Captain</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Shift Schedule</label>
                  <select
                    value={editShift}
                    onChange={(e) => setEditShift(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-xl px-3 py-2.5 text-xs text-slate-150 outline-none cursor-pointer"
                  >
                    <option value="Day">Morning / Day Shift</option>
                    <option value="Afternoon">Afternoon Shift</option>
                    <option value="Evening">Evening Shift</option>
                    <option value="Night">Night Shift</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Duty Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-xl px-3 py-2.5 text-xs text-slate-150 outline-none cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Deployed">Deployed</option>
                    <option value="On-Leave">On-Leave</option>
                    <option value="Off-Duty">Off-Duty</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Assigned Barangay Sector</label>
                <select
                  value={editBarangay}
                  onChange={(e) => setEditBarangay(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 focus:border-brand-500 rounded-xl px-4 py-2.5 text-xs text-slate-150 outline-none cursor-pointer"
                >
                  {barangays.map(b => (
                    <option key={b.name} value={b.name}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-brand-600 hover:bg-brand-500 text-slate-50 font-semibold rounded-xl px-4 py-2.5 text-xs shadow transition-all cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* 📥 CSV ROSTER IMPORT CONFIRMATION MODAL */}
      {isImportConfirmOpen && pendingImportOfficers.length > 0 && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => { setIsImportConfirmOpen(false); setPendingImportOfficers([]); }}
              className="absolute top-5 right-5 text-slate-500 hover:text-slate-300 p-1.5 hover:bg-slate-850 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center shrink-0">
                <Upload size={20} />
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Roster Upload</span>
                <h3 className="text-sm font-bold text-slate-100 mt-0.5">Confirm Import</h3>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              You are about to import <strong className="text-slate-200">{pendingImportOfficers.length} patrol officers</strong> from the selected CSV file into the database. Do you wish to proceed?
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setIsImportConfirmOpen(false); setPendingImportOfficers([]); }}
                className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                className="bg-brand-600 hover:bg-brand-500 text-slate-50 font-semibold rounded-xl px-4 py-2 text-xs shadow transition-all cursor-pointer"
              >
                Confirm Import
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
