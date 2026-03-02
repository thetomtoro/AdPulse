import { useState } from 'react';
import { sendBid } from '../api';

const defaultRequest = {
  publisherId: 'pub_demo',
  placementId: 'plc_hero',
  placementType: 'NATIVE',
  userId: 'usr_demo_1',
  segments: 'seg_fashion_enthusiasts',
  country: 'US',
  region: 'NY',
  device: 'MOBILE',
  categories: 'IAB18',
};

export default function Bidding() {
  const [form, setForm] = useState(defaultRequest);
  const [results, setResults] = useState<any[]>([]);
  const [sending, setSending] = useState(false);

  const set = (key: string) => (e: any) => setForm({ ...form, [key]: e.target.value });

  const buildRequest = () => ({
    id: `req_dash_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    publisherId: form.publisherId,
    placementId: form.placementId,
    placementType: form.placementType,
    user: {
      id: form.userId,
      segments: form.segments.split(',').map(s => s.trim()).filter(Boolean),
      geo: { country: form.country, region: form.region },
      device: form.device,
      consentSignals: [{ type: 'CCPA_USP', granted: true }],
    },
    context: { categories: form.categories.split(',').map(s => s.trim()).filter(Boolean) },
  });

  const handleSend = async () => {
    setSending(true);
    const start = performance.now();
    const res = await sendBid(buildRequest(), true);
    const elapsed = performance.now() - start;
    setResults(prev => [{ ...res, _clientLatencyMs: elapsed.toFixed(1) }, ...prev.slice(0, 19)]);
    setSending(false);
  };

  const handleBurst = async () => {
    setSending(true);
    const newResults: any[] = [];
    for (let i = 0; i < 10; i++) {
      const start = performance.now();
      const res = await sendBid(buildRequest(), true);
      const elapsed = performance.now() - start;
      newResults.push({ ...res, _clientLatencyMs: elapsed.toFixed(1) });
    }
    setResults(prev => [...newResults.reverse(), ...prev].slice(0, 30));
    setSending(false);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-1">Live Bidding</h2>
      <p className="text-sm text-gray-500 mb-6">Send real-time bid requests and inspect the scoring pipeline</p>

      <div className="grid grid-cols-3 gap-6">
        {/* Request Form */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-4">Bid Request</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">User ID</label>
              <input value={form.userId} onChange={set('userId')} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Segments</label>
              <input value={form.segments} onChange={set('segments')} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Country</label>
                <input value={form.country} onChange={set('country')} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Region</label>
                <input value={form.region} onChange={set('region')} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Device</label>
              <select value={form.device} onChange={set('device')} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                <option value="MOBILE">MOBILE</option>
                <option value="DESKTOP">DESKTOP</option>
                <option value="TABLET">TABLET</option>
                <option value="CTV">CTV</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">IAB Categories</label>
              <input value={form.categories} onChange={set('categories')} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
            </div>

            <div className="flex gap-2 mt-2">
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
              >
                Send Bid
              </button>
              <button
                onClick={handleBurst}
                disabled={sending}
                className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
              >
                Fire 10
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="col-span-2 bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-4">
            Bid Responses {results.length > 0 && <span className="text-gray-600">({results.length})</span>}
          </h3>

          {results.length === 0 ? (
            <p className="text-sm text-gray-600 text-center py-16">Send a bid request to see results</p>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {results.map((r, i) => (
                <div key={i} className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${r.bids?.length > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
                        {r.bids?.length > 0 ? `${r.bids.length} BID${r.bids.length > 1 ? 'S' : ''}` : 'NO BIDS'}
                      </span>
                      <span className="text-xs text-gray-600 font-mono">{r.requestId}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-gray-500">Server: <span className="text-white">{r.processingTimeMs?.toFixed(2)}ms</span></span>
                      <span className="text-gray-500">Client: <span className="text-white">{r._clientLatencyMs}ms</span></span>
                    </div>
                  </div>

                  {r.bids?.map((bid: any, j: number) => (
                    <div key={j} className="mt-2 p-2 bg-gray-900 rounded border border-gray-700">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-white">{bid.creative?.headline ?? 'Untitled'}</p>
                        <p className="text-xs text-emerald-400 font-mono">${(bid.bidPriceCpm / 100).toFixed(2)} CPM</p>
                      </div>
                      <p className="text-xs text-gray-600 font-mono mt-1 break-all">{bid.campaignId}</p>
                    </div>
                  ))}

                  {r.debugInfo && (
                    <div className="mt-2 text-xs text-gray-600">
                      <span>Candidates: {r.debugInfo.candidateCampaigns}</span>
                      {r.debugInfo.filteredReasons && Object.entries(r.debugInfo.filteredReasons).map(([reason, count]) => (
                        <span key={reason} className="ml-3">{reason}: {count as number}</span>
                      ))}
                      {r.debugInfo.scoringDetails?.map((s: any, k: number) => (
                        <span key={k} className="ml-3 text-indigo-400">
                          Score: {s.finalScore?.toFixed(0)} (base:{s.baseScore} x{s.budgetMultiplier?.toFixed(2)} x{s.relevanceMultiplier?.toFixed(2)})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
