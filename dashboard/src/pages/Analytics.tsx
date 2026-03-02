import { useState, useEffect } from 'react';
import { getCampaigns, getPerformance } from '../api';
import MetricCard from '../components/MetricCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function Analytics() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [perf, setPerf] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getCampaigns().then(data => {
      const list = data.campaigns ?? [];
      setCampaigns(list);
      if (list.length > 0) setSelectedId(list[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    getPerformance(selectedId).then(setPerf).catch(() => setPerf(null)).finally(() => setLoading(false));
  }, [selectedId]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Analytics</h2>
          <p className="text-sm text-gray-500 mt-1">Campaign performance metrics and insights</p>
        </div>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white min-w-[280px]"
        >
          {campaigns.length === 0 && <option value="">No campaigns — seed data first</option>}
          {campaigns.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500 text-center py-20">Loading analytics...</p>
      ) : !perf ? (
        <p className="text-gray-500 text-center py-20">Select a campaign to view analytics</p>
      ) : (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-6 gap-4 mb-6">
            <MetricCard label="Impressions" value={perf.summary.impressions.toLocaleString()} />
            <MetricCard label="Clicks" value={perf.summary.clicks.toLocaleString()} />
            <MetricCard label="CTR" value={`${(perf.summary.ctr * 100).toFixed(2)}%`} />
            <MetricCard label="Conversions" value={perf.summary.conversions.toLocaleString()} />
            <MetricCard label="Spend" value={`$${(perf.summary.spend / 100).toFixed(2)}`} />
            <MetricCard label="CPM" value={`$${(perf.summary.cpm / 100).toFixed(2)}`} />
          </div>

          {/* Chart */}
          {perf.timeseries?.length > 0 ? (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 mb-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-4">Impressions & Clicks Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={perf.timeseries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis
                    dataKey="bucket"
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    tickFormatter={(v: string) => v.slice(5, 10)}
                  />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#9ca3af' }}
                  />
                  <Bar dataKey="impressions" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="clicks" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-10 mb-6 text-center">
              <p className="text-gray-600">No time-series data yet. Run <code className="text-indigo-400">npm run simulate</code> to generate traffic.</p>
            </div>
          )}

          {/* Creative Breakdown */}
          {perf.byCreative?.length > 0 && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-800">
                <h3 className="text-sm font-semibold text-gray-400">Creative Breakdown</h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-xs text-gray-500 font-medium uppercase px-5 py-2">Creative ID</th>
                    <th className="text-right text-xs text-gray-500 font-medium uppercase px-5 py-2">Impressions</th>
                    <th className="text-right text-xs text-gray-500 font-medium uppercase px-5 py-2">Clicks</th>
                    <th className="text-right text-xs text-gray-500 font-medium uppercase px-5 py-2">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {perf.byCreative.map((c: any) => (
                    <tr key={c.creativeId} className="border-b border-gray-800/50">
                      <td className="px-5 py-2 text-sm text-gray-300 font-mono">{c.creativeId}</td>
                      <td className="px-5 py-2 text-sm text-white text-right">{c.impressions}</td>
                      <td className="px-5 py-2 text-sm text-white text-right">{c.clicks}</td>
                      <td className="px-5 py-2 text-sm text-white text-right">{(c.ctr * 100).toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
