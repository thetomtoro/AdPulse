import { useState, useEffect } from 'react';
import { getCampaigns, seedData } from '../api';
import StatusBadge from '../components/StatusBadge';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getCampaigns();
      setCampaigns(data.campaigns ?? []);
    } catch {
      setCampaigns([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSeed = async () => {
    setSeeding(true);
    await seedData();
    await load();
    setSeeding(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Campaigns</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your advertising campaigns</p>
        </div>
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {seeding ? 'Seeding...' : 'Seed Demo Data'}
        </button>
      </div>

      {loading ? (
        <div className="text-gray-500 text-center py-20">Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg">No campaigns yet</p>
          <p className="text-gray-600 text-sm mt-2">Click "Seed Demo Data" to create sample campaigns</p>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider px-4 py-3">Name</th>
                <th className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider px-4 py-3">Objective</th>
                <th className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider px-4 py-3">Budget</th>
                <th className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider px-4 py-3">Bid Strategy</th>
                <th className="text-left text-xs text-gray-500 font-medium uppercase tracking-wider px-4 py-3">Pacing</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c: any) => (
                <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm text-white font-medium">{c.name}</p>
                    <p className="text-xs text-gray-600 font-mono">{c.id}</p>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-sm text-gray-400">{c.objective}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-white">${(c.budget.totalBudget / 100).toLocaleString()}</p>
                    <p className="text-xs text-gray-600">${(c.budget.dailyBudget / 100).toLocaleString()}/day</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">{c.budget.bidStrategy}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{c.budget.pacingType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
