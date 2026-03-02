import type { Touchpoint, AttributedCredit, AttributionModel } from '../../shared/types.js';

export function calculateAttribution(
  touchpoints: Touchpoint[],
  model: AttributionModel | string,
  _conversionValue: number,
): AttributedCredit[] {
  const sorted = [...touchpoints].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  if (sorted.length === 0) return [];

  switch (model) {
    case 'LAST_CLICK':
      return lastClickAttribution(sorted);
    case 'FIRST_CLICK':
      return firstClickAttribution(sorted);
    case 'LINEAR':
      return linearAttribution(sorted);
    case 'TIME_DECAY':
      return timeDecayAttribution(sorted);
    case 'POSITION_BASED':
      return positionBasedAttribution(sorted);
    default:
      return lastClickAttribution(sorted);
  }
}

function lastClickAttribution(touchpoints: Touchpoint[]): AttributedCredit[] {
  const last = touchpoints[touchpoints.length - 1];
  return [
    {
      campaignId: last.campaignId,
      creativeId: last.creativeId,
      credit: 1.0,
      model: 'LAST_CLICK' as AttributionModel,
    },
  ];
}

function firstClickAttribution(touchpoints: Touchpoint[]): AttributedCredit[] {
  const first = touchpoints[0];
  return [
    {
      campaignId: first.campaignId,
      creativeId: first.creativeId,
      credit: 1.0,
      model: 'FIRST_CLICK' as AttributionModel,
    },
  ];
}

function linearAttribution(touchpoints: Touchpoint[]): AttributedCredit[] {
  const credit = 1.0 / touchpoints.length;
  return touchpoints.map(tp => ({
    campaignId: tp.campaignId,
    creativeId: tp.creativeId,
    credit: Math.round(credit * 10000) / 10000,
    model: 'LINEAR' as AttributionModel,
  }));
}

export function timeDecayAttribution(
  touchpoints: Touchpoint[],
  halfLifeHours = 168, // 7-day half-life
): AttributedCredit[] {
  const conversionTime = new Date(touchpoints[touchpoints.length - 1].timestamp).getTime();

  const weights = touchpoints.map(tp => {
    const hoursBeforeConversion =
      (conversionTime - new Date(tp.timestamp).getTime()) / 3600000;
    return Math.pow(2, -hoursBeforeConversion / halfLifeHours);
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0);

  return touchpoints.map((tp, i) => ({
    campaignId: tp.campaignId,
    creativeId: tp.creativeId,
    credit: Math.round((weights[i] / totalWeight) * 10000) / 10000,
    model: 'TIME_DECAY' as AttributionModel,
  }));
}

function positionBasedAttribution(touchpoints: Touchpoint[]): AttributedCredit[] {
  if (touchpoints.length === 1) {
    return [
      {
        campaignId: touchpoints[0].campaignId,
        creativeId: touchpoints[0].creativeId,
        credit: 1.0,
        model: 'POSITION_BASED' as AttributionModel,
      },
    ];
  }

  if (touchpoints.length === 2) {
    return touchpoints.map(tp => ({
      campaignId: tp.campaignId,
      creativeId: tp.creativeId,
      credit: 0.5,
      model: 'POSITION_BASED' as AttributionModel,
    }));
  }

  // 40% first, 40% last, 20% distributed among middle
  const middleCredit = 0.2 / (touchpoints.length - 2);
  return touchpoints.map((tp, i) => ({
    campaignId: tp.campaignId,
    creativeId: tp.creativeId,
    credit:
      i === 0
        ? 0.4
        : i === touchpoints.length - 1
          ? 0.4
          : Math.round(middleCredit * 10000) / 10000,
    model: 'POSITION_BASED' as AttributionModel,
  }));
}
