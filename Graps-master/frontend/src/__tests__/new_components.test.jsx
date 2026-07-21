import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import IncidentsLog from '../components/IncidentsLog';
import AlertsManager from '../components/AlertsManager';
import OfficerDeployment from '../components/OfficerDeployment';
import RecommendationsPanel from '../components/RecommendationsPanel';
import RichAnalyticsPage from '../components/RichAnalyticsPage';
import SettingsPanel from '../components/SettingsPanel';

// ─────────────────────────────────────────────────────────────────────────────
// Recharts Mocks (jsdom has no SVG dimension measurement support)
// ─────────────────────────────────────────────────────────────────────────────
jest.mock('recharts', () => {
  return {
    ResponsiveContainer: ({ children }) => <div data-testid="mock-responsive-container">{children}</div>,
    BarChart: ({ children }) => <div data-testid="mock-bar-chart">{children}</div>,
    Bar: () => <div data-testid="mock-bar" />,
    LineChart: ({ children }) => <div data-testid="mock-line-chart">{children}</div>,
    Line: () => <div data-testid="mock-line" />,
    ScatterChart: ({ children }) => <div data-testid="mock-scatter-chart">{children}</div>,
    Scatter: () => <div data-testid="mock-scatter" />,
    PieChart: ({ children }) => <div data-testid="mock-pie-chart">{children}</div>,
    Pie: ({ children }) => <div data-testid="mock-pie">{children}</div>,
    Cell: () => <div data-testid="mock-cell" />,
    XAxis: () => null,
    YAxis: () => null,
    Tooltip: () => null,
    Legend: () => null,
    CartesianGrid: () => null,
    ReferenceLine: () => null
  };
});

// Mock fetch globally
beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve([])
    })
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});

const samplePoints = [
  { id: 101, latitude: 6.92, longitude: 122.07, name: 'Theft incident', value: 25.0, date_committed: '2026-05-15', time_committed: '14:30', barangay: 'Santa Maria', incident_type: 'Theft', offense: 'THEFT' },
  { id: 102, latitude: 6.91, longitude: 122.06, name: 'Drug buy bust', value: 100.0, date_committed: '2026-05-16', time_committed: '22:15', barangay: 'Tetuan', incident_type: 'Drugs', offense: 'DRUGS' }
];

describe('🛡️ GRAPS Pending UI Components Test Suite', () => {

  // 1. IncidentsLog Test
  describe('IncidentsLog Component', () => {
    test('renders search input, filter controls and rows', () => {
      render(<IncidentsLog points={samplePoints} user={{ role: 'admin' }} />);
      
      expect(screen.getByPlaceholderText(/Search by ID/i)).toBeInTheDocument();
      expect(screen.getByText(/Total Mapped/i)).toBeInTheDocument();
      
      // Checking row values are shown
      expect(screen.getByText('Santa Maria')).toBeInTheDocument();
      expect(screen.getByText('Tetuan')).toBeInTheDocument();
    });

    test('opens report incident modal for administrator role', () => {
      render(<IncidentsLog points={samplePoints} user={{ role: 'admin' }} />);
      const btn = screen.getByText(/Report Incident/i);
      fireEvent.click(btn);
      expect(screen.getByText(/Submit Incident Entry/i)).toBeInTheDocument();
    });

    test('does not show report button for non-admin user', () => {
      render(<IncidentsLog points={samplePoints} user={{ role: 'decision_maker' }} />);
      expect(screen.queryByText(/Report Incident/i)).not.toBeInTheDocument();
    });
  });

  // 2. AlertsManager Test
  describe('AlertsManager Component', () => {
    test('fetches and renders alerts feed', async () => {
      const mockAlerts = [
        { id: '1', type: 'spike', severity: 'CRITICAL', title: 'Crime Spike in Tetuan', message: 'Theft increased by 15%', barangay: 'Tetuan', acknowledged: false, created_at: new Date().toISOString() }
      ];
      
      global.fetch = jest.fn().mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockAlerts)
        })
      );

      render(<AlertsManager user={{ name: 'Officer' }} />);
      
      await waitFor(() => {
        expect(screen.getByText('Crime Spike in Tetuan')).toBeInTheDocument();
      });
      expect(screen.getByText(/Theft increased by 15%/i)).toBeInTheDocument();
    });

    test('renders slider config elements', () => {
      render(<AlertsManager user={{ name: 'Officer' }} />);
      expect(screen.getByText(/Incident Spike Threshold/i)).toBeInTheDocument();
      expect(screen.getByText(/Hotspot Cluster Density/i)).toBeInTheDocument();
      expect(screen.getByText(/Patrol Gap Alert Ratio/i)).toBeInTheDocument();
    });
  });

  // 3. OfficerDeployment Test
  describe('OfficerDeployment Component', () => {
    test('renders staffing metric headers and shift splits', async () => {
      global.fetch = jest.fn().mockImplementation((url) => {
        if (url.includes('/officers')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([
            { id: 1, badge_number: '123', full_name: 'P/Cpl John Doe', rank: 'Patrolman', assigned_barangay: 'Santa Maria', shift: 'Day', status: 'Active', police_station: 'PS 01' }
          ])});
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([
          { name: 'Santa Maria', incidents: 10, officers: 4, risk: 'High' }
        ])});
      });

      render(<OfficerDeployment />);
      
      await waitFor(() => {
        expect(screen.getByText(/Total Staff Deployed/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/Coverage Index/i)).toBeInTheDocument();
    });

    test('renders Enlisted Personnel Directory with pagination', async () => {
      const officersList = Array.from({ length: 12 }, (_, i) => ({
        id: i + 1,
        badge_number: `PCG-100${i}`,
        full_name: `Officer Number ${i + 1}`,
        rank: 'Patrolman',
        assigned_barangay: 'Santa Maria',
        shift: 'Day',
        status: 'Active',
        police_station: 'PS 01'
      }));

      global.fetch = jest.fn().mockImplementation((url) => {
        if (url.includes('/officers')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(officersList) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([
          { name: 'Santa Maria', incidents: 10, officers: 4, risk: 'High' }
        ])});
      });

      render(<OfficerDeployment user={{ role: 'admin' }} />);

      const rosterTabButton = screen.getByText(/Active Patrol Roster/i);
      fireEvent.click(rosterTabButton);

      await waitFor(() => {
        expect(screen.getByText(/Enlisted Personnel Directory/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/Officer Number 1$/i)).toBeInTheDocument();
      expect(screen.getByText(/Officer Number 10$/i)).toBeInTheDocument();
      expect(screen.queryByText(/Officer Number 11$/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Showing 1–10 of 12 officers/i)).toBeInTheDocument();

      const nextBtn = screen.getByRole('button', { name: /Next/i });
      fireEvent.click(nextBtn);

      expect(screen.getByText(/Officer Number 11$/i)).toBeInTheDocument();
      expect(screen.getByText(/Officer Number 12$/i)).toBeInTheDocument();
      expect(screen.queryByText(/Officer Number 1$/i)).not.toBeInTheDocument();
      expect(screen.getByText(/Showing 11–12 of 12 officers/i)).toBeInTheDocument();
    });
  });

  // 4. RecommendationsPanel Test
  describe('RecommendationsPanel Component', () => {
    test('renders priority directive cards and basis tags', () => {
      render(<RecommendationsPanel points={samplePoints} />);
      expect(screen.getByText(/Patrol Frequency in Active Sectors/i)).toBeInTheDocument();
      expect(screen.getByText(/Surveillance Monitoring Posts/i)).toBeInTheDocument();
      expect(screen.getByText(/Optimize Resource Allocation Models/i)).toBeInTheDocument();
    });

    test('marks recommendation as implemented when clicked', () => {
      render(<RecommendationsPanel points={samplePoints} />);
      const buttons = screen.getAllByRole('button', { name: /Implement/i });
      fireEvent.click(buttons[0]);
      const confirmButton = screen.getByRole('button', { name: /Confirm & Proceed/i });
      fireEvent.click(confirmButton);
      expect(screen.getAllByText(/Implemented/i)[0]).toBeInTheDocument();
    });
  });

  // 5. RichAnalyticsPage Test
  describe('RichAnalyticsPage Component', () => {
    test('renders mined association rule widgets and DBSCAN cluster titles', async () => {
      const mockPayload = {
        hourly: Array(24).fill(2),
        monthly: { labels: ['Jan', 'Feb'], actual: [10, 12], forecast: [10, 14] },
        regression: [{ barangay: 'Santa Maria', actual: 10, predicted: 11 }],
        crimeTypes: [{ label: 'Theft', value: 45 }],
        associationRules: [
          { antecedent: ['Santa Maria', 'Morning'], consequent: 'Theft', support: 0.12, confidence: 0.85, lift: 2.3 }
        ]
      };
      
      const mockClusters = [
        { id: 'C1', core: 'Tetuan', count: 12, radius: 0.35, type: 'Dense', crime: 'Theft', reco: 'Increase patrols' }
      ];

      global.fetch = jest.fn().mockImplementation((url) => {
        if (url.includes('/analytics')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPayload) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockClusters) });
      });

      render(<RichAnalyticsPage />);
      
      await waitFor(() => {
        expect(screen.getByText(/Apriori Association Rules Mined/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/DBSCAN Spatial Cluster Centroids/i)).toBeInTheDocument();
      expect(screen.getByText('Tetuan')).toBeInTheDocument();
      expect(screen.getByText('C1')).toBeInTheDocument();
  });

  // 6. SettingsPanel Test
  describe('SettingsPanel Component', () => {
    test('renders profile preferences and tabs correctly', () => {
      render(
        <SettingsPanel 
          user={{ name: 'Admin User', role: 'admin', email: 'admin@graps.gov' }} 
          dbStatus="Connected"
          clearConfirmStep={0}
          setClearConfirmStep={() => {}}
          handleClearDatabase={() => {}}
          dashboardViewMode="all"
          updateDashboardViewMode={() => {}}
        />
      );
      expect(screen.getByText(/Profile Settings/i)).toBeInTheDocument();
      expect(screen.getByText(/Designated Rank/i)).toBeInTheDocument();
      expect(screen.getByText(/System Admin/i)).toBeInTheDocument();
    });

    test('renders hyperparameters tab only for analyst role', () => {
      render(
        <SettingsPanel 
          user={{ name: 'Analyst User', role: 'analyst', email: 'analyst@graps.gov' }} 
          dbStatus="Connected"
          clearConfirmStep={0}
          setClearConfirmStep={() => {}}
          handleClearDatabase={() => {}}
          dashboardViewMode="all"
          updateDashboardViewMode={() => {}}
        />
      );
      
      const tabBtn = screen.getByText(/AI Hyperparameters/i);
      fireEvent.click(tabBtn);
      
      expect(screen.getByText(/DBSCAN MinPoints Density/i)).toBeInTheDocument();
      expect(screen.getByText(/Apriori Min Support/i)).toBeInTheDocument();
    });

    test('renders dispatch alerts settings only for chief of police role', () => {
      render(
        <SettingsPanel 
          user={{ name: 'Chief User', role: 'decision_maker', email: 'chief@graps.gov' }} 
          dbStatus="Connected"
          clearConfirmStep={0}
          setClearConfirmStep={() => {}}
          handleClearDatabase={() => {}}
          dashboardViewMode="all"
          updateDashboardViewMode={() => {}}
        />
      );
      
      const tabBtn = screen.getByText(/Dispatch Settings/i);
      fireEvent.click(tabBtn);
      
      expect(screen.getByText(/SMS Warning Integration/i)).toBeInTheDocument();
      expect(screen.getByText(/Dispatch Recommendation Rules/i)).toBeInTheDocument();
    });
  });

});

});
