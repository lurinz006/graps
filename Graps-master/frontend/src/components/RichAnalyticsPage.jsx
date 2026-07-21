import React, { useState, useEffect, useMemo } from 'react';
import { Cpu, Activity, AlertCircle, Link, BarChart3, ScatterChart as ScatterIcon, Layers } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, Cell, LineChart, Line, ScatterChart, Scatter, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ReferenceLine, LabelList } from 'recharts';

export default function RichAnalyticsPage() {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentYear  = new Date().getFullYear().toString();
  const currentMonthIdx = new Date().getMonth(); // 0-based

  const [year, setYear]   = useState(currentYear);
  const [month, setMonth] = useState('all'); // 'all' or 1-12 numeric string
  const [analytics, setAnalytics] = useState(null);
  const [clusters, setClusters]   = useState([]);
  const [loading, setLoading]     = useState(false);

  const fetchAnalyticsData = () => {
    setLoading(true);
    const monthParam = month !== 'all' ? `&month=${month}` : '';
    Promise.all([
      fetch(`http://127.0.0.1:8000/api/v1/analytics?year=${year}${monthParam}`).then(res => res.json()),
      fetch(`http://127.0.0.1:8000/api/v1/clusters?year=${year}`).then(res => res.json())
    ])
      .then(([analyticsData, clusterData]) => {
        setAnalytics(analyticsData);
        setClusters(clusterData);
      })
      .catch(err => console.error("Failed to load analytics payload:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [year, month]);

  // Format hourly data for recharts bar chart
  const hourlyDataFormatted = useMemo(() => {
    if (!analytics || !analytics.hourly) return [];
    
    // Convert 24 hourly buckets to chart dataset
    const maxVal = Math.max(...analytics.hourly, 1);
    return analytics.hourly.map((val, hour) => {
      // Determine color intensiveness: >=75% max -> red, >=50% -> orange, >=25% -> yellow, else blue
      let fill = '#3b82f6';
      if (val >= maxVal * 0.75) fill = '#ef4444';
      else if (val >= maxVal * 0.50) fill = '#f97316';
      else if (val >= maxVal * 0.25) fill = '#eab308';
      
      const label = `${hour.toString().padStart(2, '0')}:00`;
      return {
        name: label,
        count: val,
        fill: fill
      };
    });
  }, [analytics]);

  // Format monthly trend forecast for recharts line chart
  const monthlyDataFormatted = useMemo(() => {
    if (!analytics || !analytics.monthly) return [];
    const monthly = analytics.monthly;
    return monthly.labels.map((label, idx) => ({
      name: label,
      Actual: monthly.actual[idx],
      Forecast: monthly.forecast[idx]
    }));
  }, [analytics]);

  // Format regression coordinate points
  const regressionDataFormatted = useMemo(() => {
    if (!analytics || !analytics.regression) return [];
    return analytics.regression.map(r => ({
      name: r.barangay,
      x: r.actual,
      y: r.predicted
    }));
  }, [analytics]);

  // Top 10 Crime types for a simple breakdown
  const crimeTypesData = useMemo(() => {
    if (!analytics || !analytics.crimeTypes) return [];
    return analytics.crimeTypes;
  }, [analytics]);

  return (
    <div className="p-8 max-w-[1600px] w-full mx-auto space-y-6">
      
      {/* Page Title & Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight font-sans">Geospatial Analytics & AI Forecasting</h2>
          <p className="text-xs text-slate-500">Apriori rules, SARIMAX extrapolations, and DBSCAN spatial clustering audits</p>
        </div>
        {/* Year + Month Filters */}
        <div className="flex items-center gap-2">
          {/* Year */}
          <select
            value={year}
            onChange={(e) => {
              const y = e.target.value;
              setYear(y);
              // If switching to current year and selected month is future, clamp it
              if (y === currentYear && month !== 'all' && parseInt(month) - 1 > currentMonthIdx) {
                setMonth((currentMonthIdx + 1).toString());
              }
            }}
            className="bg-slate-900 border border-slate-800 focus:border-brand-500 text-slate-300 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none shadow-lg cursor-pointer"
          >
            <option value="2026">Year 2026 (YTD)</option>
            <option value="2025">Year 2025</option>
            <option value="2024">Year 2024</option>
          </select>

          {/* Month */}
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="bg-slate-900 border border-slate-800 focus:border-brand-500 text-slate-300 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none shadow-lg cursor-pointer"
          >
            <option value="all">All Months</option>
            {MONTHS.map((m, idx) => {
              const isFuture = year === currentYear && idx > currentMonthIdx;
              return (
                <option key={m} value={idx + 1} disabled={isFuture}>
                  {m}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Model Tech Badges Banner */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-850 p-3.5 rounded-2xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center shrink-0">
            <Link size={16} />
          </div>
          <div>
            <span className="text-[8px] font-bold text-slate-500 uppercase block tracking-wider">Association</span>
            <span className="text-xs font-bold text-slate-200 block">Apriori Rules</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-850 p-3.5 rounded-2xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-450 flex items-center justify-center shrink-0">
            <Activity size={16} />
          </div>
          <div>
            <span className="text-[8px] font-bold text-slate-500 uppercase block tracking-wider">Trend Analysis</span>
            <span className="text-xs font-bold text-slate-200 block">SARIMAX Forecast</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-850 p-3.5 rounded-2xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
            <BarChart3 size={16} />
          </div>
          <div>
            <span className="text-[8px] font-bold text-slate-500 uppercase block tracking-wider">Frequencies</span>
            <span className="text-xs font-bold text-slate-200 block">Temporal Peaks</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-850 p-3.5 rounded-2xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
            <Layers size={16} />
          </div>
          <div>
            <span className="text-[8px] font-bold text-slate-500 uppercase block tracking-wider">Spatial Clusters</span>
            <span className="text-xs font-bold text-slate-200 block">DBSCAN Centroids</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-850 p-3.5 rounded-2xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0">
            <ScatterIcon size={16} />
          </div>
          <div>
            <span className="text-[8px] font-bold text-slate-500 uppercase block tracking-wider">Geospatial ML</span>
            <span className="text-xs font-bold text-slate-200 block">Regression Scatter</span>
          </div>
        </div>
      </div>

      {/* Row 1: Apriori Association Rules Mined */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-850">
          <Link size={16} className="text-violet-400" />
          <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider">Apriori Association Rules Mined</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {analytics && analytics.associationRules ? (
            analytics.associationRules.map((rule, idx) => (
              <div key={idx} className="bg-slate-950 p-4 rounded-2xl border border-slate-850/80 space-y-3.5">
                <div className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">Rule #{idx + 1}</div>
                
                <div className="space-y-1 text-xs">
                  <span className="text-slate-450 block font-semibold">IF Location & Hours:</span>
                  <div className="flex flex-wrap gap-1">
                    {rule.antecedent.map(ant => (
                      <span key={ant} className="bg-slate-900 text-slate-200 px-2 py-0.5 rounded border border-slate-800 font-semibold">{ant}</span>
                    ))}
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <span className="text-violet-400 block font-bold">&rarr; THEN Offense Category:</span>
                  <span className="text-slate-200 font-bold block">{rule.consequent}</span>
                </div>

                <div className="space-y-2 border-t border-slate-900 pt-3">
                  <div className="text-[10px] text-slate-500 font-semibold">
                    <div className="flex justify-between mb-1">
                      <span>Support:</span>
                      <span className="text-slate-300 font-bold">{Math.round(rule.support * 100)}%</span>
                    </div>
                    <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-850">
                      <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500" style={{ width: `${rule.support * 100}%` }} />
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 font-semibold">
                    <div className="flex justify-between mb-1">
                      <span>Confidence:</span>
                      <span className="text-slate-300 font-bold">{Math.round(rule.confidence * 100)}%</span>
                    </div>
                    <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-850">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${rule.confidence * 100}%` }} />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 font-semibold">
                    <span>Lift Index:</span>
                    <span className="text-orange-450 font-bold">{rule.lift.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-4 text-center py-6 text-slate-500">Loading mined association rules...</div>
          )}
        </div>
      </div>

      {/* Row 2: SARIMAX Monthly Trend & Hourly Activity Peak */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* SARIMAX Line Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider mb-1">SARIMAX Month-by-Month Trend Analysis</h3>
            <p className="text-[10px] text-slate-500">Shows actual recorded YTD values alongside forecast extrapolations</p>
          </div>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyDataFormatted} margin={{ left: -15, right: 10, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#475569" fontSize={9} />
                <YAxis stroke="#475569" fontSize={9} />
                <Tooltip contentStyle={{ backgroundColor: '#0d1228', borderColor: '#1e293b', borderRadius: '10px' }} />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} />
                <Line type="monotone" dataKey="Actual" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Forecast" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 24-Hour Bar Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider mb-1">24-Hour Crime Distribution Peaks</h3>
            <p className="text-[10px] text-slate-500">Aggregates hourly incident counts (red bars represent peak crime activity)</p>
          </div>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyDataFormatted} margin={{ left: -15, right: 10, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#475569" fontSize={8} interval={2} />
                <YAxis stroke="#475569" fontSize={9} />
                <Tooltip contentStyle={{ backgroundColor: '#0d1228', borderColor: '#1e293b', borderRadius: '10px' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {hourlyDataFormatted.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Row 3: Multiple Linear Regression Scatter plot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Regression Scatter */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
          <div>
            <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider mb-1">Multiple Linear Regression Density (Geospatial)</h3>
            <p className="text-[10px] text-slate-500">Plots actual incident count against model predicted risk score per barangay (Dashed red line represents Perfect Fit)</p>
          </div>
          <div className="h-72 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ left: -15, right: 15, top: 10, bottom: 5 }}>
                <CartesianGrid stroke="#1e293b" />
                <XAxis type="number" dataKey="x" name="Actual Incidents" stroke="#475569" fontSize={9} />
                <YAxis type="number" dataKey="y" name="Predicted Risk" stroke="#475569" fontSize={9} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#0d1228', borderColor: '#1e293b', borderRadius: '10px' }} />
                <ReferenceLine x={0} y={0} stroke="#94a3b8" />
                <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 50, y: 50 }]} stroke="#ef4444" strokeDasharray="5 5" strokeWidth={2} label={{ value: 'Perfect Fit', position: 'top', fill: '#ef4444', fontSize: 9 }} />
                <Scatter name="Barangay Coordinate Node" data={regressionDataFormatted} fill="#3b82f6" shape="circle" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Crimes Breakdown list */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Crime Type Ingestion %</h3>
          <div className="space-y-4">
            {crimeTypesData.slice(0, 5).map((ct, idx) => (
              <div key={ct.label} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-300 truncate max-w-[180px]">{ct.label}</span>
                  <span className="text-slate-400 font-mono">{ct.value}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-850">
                  <div 
                    className="h-full rounded-full"
                    style={{ 
                      width: `${ct.value}%`,
                      backgroundColor: idx === 0 ? '#3b82f6' : idx === 1 ? '#8b5cf6' : idx === 2 ? '#f97316' : idx === 3 ? '#22c55e' : '#ec4899'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 pt-4 leading-relaxed border-t border-slate-850/80 mt-4">
            *Crime category distribution percentages dynamically resolved over ZPPU source records.*
          </p>
        </div>

      </div>

      {/* Row 4: Dynamic Incident Growth & Comparison Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-850">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-brand-400" />
            <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider font-sans">Dynamic Incident Growth &amp; Comparison Matrix</h3>
          </div>
          {month !== 'all' && (
            <span className="text-[10px] font-semibold text-brand-400 bg-brand-500/10 border border-brand-500/20 px-2.5 py-1 rounded-full">
              Scoped: {MONTHS[parseInt(month) - 1]} {year}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3">Incident Classification</th>
                <th className="py-2.5 px-3 text-center">Selected Month</th>
                <th className="py-2.5 px-3 text-center">Previous Month</th>
                <th className="py-2.5 px-3 text-center">MoM Trend</th>
                <th className="py-2.5 px-3 text-center">Preceding 5-Mo Avg</th>
                <th className="py-2.5 px-3 text-center">5-Month Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/30 text-xs">
              {analytics && analytics.comparisonMatrix && analytics.comparisonMatrix.length > 0 ? (
                analytics.comparisonMatrix.map((row) => (
                  <tr key={row.type} className="hover:bg-slate-950/20">
                    <td className="py-3.5 px-3 font-semibold text-slate-200">{row.type}</td>
                    <td className="py-3.5 px-3 text-center font-bold text-slate-300">{row.current_count}</td>
                    <td className="py-3.5 px-3 text-center text-slate-400 font-mono">{row.prev_count}</td>
                    <td className="py-3.5 px-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        row.mom_percent > 0 ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                        row.mom_percent < 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                        'bg-slate-500/10 border-slate-500/20 text-slate-400'
                      }`}>
                        {row.mom_percent > 0 ? '▲' : row.mom_percent < 0 ? '▼' : '•'} 
                        {row.mom_percent > 0 ? `+${row.mom_percent}%` : `${row.mom_percent}%`}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center text-slate-400 font-mono">{row.avg5_count}</td>
                    <td className="py-3.5 px-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        row.avg5_percent > 0 ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                        row.avg5_percent < 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                        'bg-slate-500/10 border-slate-500/20 text-slate-400'
                      }`}>
                        {row.avg5_percent > 0 ? '▲' : row.avg5_percent < 0 ? '▼' : '•'} 
                        {row.avg5_percent > 0 ? `+${row.avg5_percent}%` : `${row.avg5_percent}%`}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500 italic">
                    {loading ? 'Crunching comparison metrics...' : 'No comparative historical logs available for this period.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 5: DBSCAN Clusters centroid table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-850">
          <Layers size={16} className="text-cyan-400" />
          <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider font-sans">DBSCAN Spatial Cluster Centroids</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3">Cluster ID</th>
                <th className="py-2.5 px-3">Core Barangay Centroid</th>
                <th className="py-2.5 px-3 text-center">Incidents Count</th>
                <th className="py-2.5 px-3 text-center">Radius (km)</th>
                <th className="py-2.5 px-3">Density Type</th>
                <th className="py-2.5 px-3">Dominant Crime Type</th>
                <th className="py-2.5 px-3 text-right">Patrol Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/30 text-xs">
              {clusters.map((c) => (
                <tr key={c.id} className="hover:bg-slate-950/20">
                  <td className="py-3.5 px-3 font-mono text-[10px] text-cyan-400 font-semibold">{c.id}</td>
                  <td className="py-3.5 px-3 font-semibold text-slate-200">{c.core}</td>
                  <td className="py-3.5 px-3 text-center font-bold text-slate-350">{c.count}</td>
                  <td className="py-3.5 px-3 text-center text-slate-400 font-mono">{c.radius} km</td>
                  <td className="py-3.5 px-3">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-bold border uppercase tracking-wider ${
                      c.type === 'Dense' ? 'bg-rose-500/10 border-rose-500/25 text-rose-400' :
                      c.type === 'Moderate' ? 'bg-amber-500/10 border-amber-500/25 text-amber-400' :
                      'bg-sky-500/10 border-sky-500/25 text-sky-400'
                    }`}>
                      {c.type}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-slate-300 font-medium">{c.crime}</td>
                  <td className="py-3.5 px-3 text-right text-slate-400 italic font-medium">{c.reco}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
