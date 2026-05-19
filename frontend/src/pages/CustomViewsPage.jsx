import UsageActivityChart from '../components/customViews/UsageActivityChart';
import EngagementHeatmap from '../components/customViews/EngagementHeatmap';
import ActivitySummaryPDF from '../components/customViews/ActivitySummaryPDF';
import PreferenceRulesEditor from '../components/customViews/PreferenceRulesEditor';

export default function CustomViewsPage() {
  return (
    <div style={{ padding: 24, color: '#f1f5f9' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Custom Views</h1>
        <p style={{ color: '#94a3b8', marginTop: 6 }}>
          Personalized analytics and configuration views: activity charts, engagement heatmaps,
          downloadable activity report, and a rules editor for tuning recommendations.
        </p>
      </div>

      <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))' }}>
        <UsageActivityChart />
        <EngagementHeatmap />
      </div>

      <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', marginTop: 18 }}>
        <ActivitySummaryPDF />
        <PreferenceRulesEditor />
      </div>
    </div>
  );
}
