import { useState } from 'react';
import { agentCreateCampaign, agentGetSignals, agentOptimize } from '../api';
import MetricCard from '../components/MetricCard';

const defaultForm = {
  name: 'AI Agent — Summer Promo',
  goal: 'MAXIMIZE_CLICKS',
  totalDollars: '500',
  dailyDollars: '50',
  startDate: '2026-01-01T00:00:00Z',
  endDate: '2026-06-01T00:00:00Z',
  geos: 'US,CA',
  segments: 'seg_fashion_enthusiasts',
  categories: 'IAB18',
  headline: 'Summer Sale — 50% Off',
  body: 'Shop the best deals of the season',
  clickUrl: 'https://shop.example.com/summer',
  brandSafety: 'MODERATE',
};

export default function Agent() {
  const [form, setForm] = useState(defaultForm);
  const [campaign, setCampaign] = useState<any>(null);
  const [signals, setSignals] = useState<any>(null);
  const [optimizations, setOptimizations] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [bidMultiplier, setBidMultiplier] = useState('1.5');

  const set = (key: string) => (e: any) => setForm({ ...form, [key]: e.target.value });

  const handleCreate = async () => {
    setCreating(true);
    setCampaign(null);
    setSignals(null);
    setOptimizations([]);
    try {
      const result = await agentCreateCampaign({
        name: form.name,
        goal: form.goal,
        budget: {
          totalDollars: parseFloat(form.totalDollars),
          dailyDollars: parseFloat(form.dailyDollars),
        },
        schedule: { startDate: form.startDate, endDate: form.endDate, timezone: 'America/New_York' },
        audience: {
          segments: form.segments.split(',').map(s => s.trim()).filter(Boolean),
          geos: form.geos.split(',').map(s => s.trim()).filter(Boolean),
          devices: ['MOBILE', 'DESKTOP'],
          contextualCategories: form.categories.split(',').map(s => s.trim()).filter(Boolean),
        },
        creatives: [{
          type: 'NATIVE',
          name: 'Agent Creative',
          headline: form.headline,
          body: form.body,
          clickUrl: form.clickUrl,
        }],
        constraints: { brandSafetyLevel: form.brandSafety },
      });
      setCampaign(result);
    } catch (err: any) {
      alert('Error creating campaign: ' + err.message);
    }
    setCreating(false);
  };

  const handleSignals = async () => {
    if (!campaign?.id) return;
    const s = await agentGetSignals(campaign.id);
    setSignals(s);
  };

  const handleOptimize = async (action: string, extra: Record<string, any> = {}) => {
    if (!campaign?.id) return;
    const result = await agentOptimize(campaign.id, { action, ...extra });
    setOptimizations(prev => [result, ...prev]);
    // Refresh signals after optimization
    handleSignals();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-1">AI Agent API</h2>
      <p className="text-sm text-gray-500 mb-6">Declarative campaign creation with real-time feedback loop</p>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Create Campaign */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-4">1. Create Campaign</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Campaign Name</label>
              <input value={form.name} onChange={set('name')} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Goal</label>
              <select value={form.goal} onChange={set('goal')} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                <option value="MAXIMIZE_CLICKS">Maximize Clicks</option>
                <option value="MAXIMIZE_CONVERSIONS">Maximize Conversions</option>
                <option value="MAXIMIZE_REACH">Maximize Reach</option>
                <option value="TARGET_CPA">Target CPA</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Total ($)</label>
                <input type="number" value={form.totalDollars} onChange={set('totalDollars')} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Daily ($)</label>
                <input type="number" value={form.dailyDollars} onChange={set('dailyDollars')} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Geos (comma-separated)</label>
              <input value={form.geos} onChange={set('geos')} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Segments</label>
              <input value={form.segments} onChange={set('segments')} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Headline</label>
              <input value={form.headline} onChange={set('headline')} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-full mt-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {creating ? 'Creating...' : 'Create & Activate'}
            </button>
          </div>

          {campaign && (
            <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
              <p className="text-xs text-emerald-400 font-semibold mb-2">Campaign Created & Activated</p>
              <p className="text-xs text-gray-400 font-mono break-all">{campaign.id}</p>
              <div className="mt-2 space-y-1 text-xs text-gray-500">
                <p>Objective: <span className="text-white">{campaign._agent?.resolvedObjective}</span></p>
                <p>Bid Strategy: <span className="text-white">{campaign._agent?.resolvedBidStrategy}</span></p>
                <p>Pacing: <span className="text-white">{campaign._agent?.resolvedPacingType}</span></p>
                <p>Consent: <span className="text-white">{campaign._agent?.resolvedCompliance?.consentTypes?.join(', ') || 'None'}</span></p>
              </div>
            </div>
          )}
        </div>

        {/* Middle: Signals */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-4">2. Performance Signals</h3>
          <button
            onClick={handleSignals}
            disabled={!campaign}
            className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-white text-sm rounded-lg transition-colors mb-4"
          >
            Fetch Signals
          </button>

          {signals ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <MetricCard label="Impressions" value={signals.performance.impressions} />
                <MetricCard label="Clicks" value={signals.performance.clicks} />
                <MetricCard label="CTR" value={`${(signals.performance.ctr * 100).toFixed(2)}%`} />
                <MetricCard label="Conversions" value={signals.performance.conversions} />
              </div>

              <div className="p-3 bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-500 uppercase mb-2">Spend Pacing</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-indigo-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, 100 - signals.spend.budgetRemainingPercent)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">{(100 - signals.spend.budgetRemainingPercent).toFixed(1)}%</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  ${(signals.spend.totalSpent / 100).toFixed(2)} of ${(signals.spend.totalBudget / 100).toFixed(2)} spent
                </p>
              </div>

              {signals.recommendations.length > 0 && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-xs text-yellow-400 font-semibold mb-1">Recommendations</p>
                  {signals.recommendations.map((r: string, i: number) => (
                    <p key={i} className="text-xs text-yellow-300/80 mt-1">{r}</p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600 text-center py-8">
              {campaign ? 'Click "Fetch Signals" to see metrics' : 'Create a campaign first'}
            </p>
          )}
        </div>

        {/* Right: Optimize */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-4">3. Optimize</h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Bid Multiplier</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="5.0"
                  value={bidMultiplier}
                  onChange={(e) => setBidMultiplier(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
                />
                <button
                  onClick={() => handleOptimize('ADJUST_BID', { bidMultiplier: parseFloat(bidMultiplier), reason: 'Manual adjustment via dashboard' })}
                  disabled={!campaign}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white text-xs font-medium rounded-lg"
                >
                  Apply
                </button>
              </div>
            </div>

            <button
              onClick={() => handleOptimize('SHIFT_BUDGET', { newDailyDollars: 75, reason: 'Increase daily spend' })}
              disabled={!campaign}
              className="w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 text-white text-sm rounded-lg"
            >
              Shift Budget to $75/day
            </button>
          </div>

          {optimizations.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 uppercase mb-2">Optimization Log</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {optimizations.map((opt, i) => (
                  <div key={i} className="p-2 bg-gray-800 rounded-lg border border-gray-700">
                    <p className="text-xs font-medium text-emerald-400">{opt.action}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {JSON.stringify(opt.details, null, 0).slice(0, 120)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
