import type { AgentOptimizeInput } from '../../api/schemas/agent.schema.js';
import type { Campaign } from '../../shared/types.js';
import type { ICacheProvider } from '../../infra/interfaces.js';
import type { ICampaignRepository } from '../campaign/campaign.repository.js';
import type { ICreativeRepository } from '../campaign/creative.repository.js';
import { ValidationError, NotFoundError } from '../../shared/errors.js';

const DOLLARS_TO_CENTS = 100;
const BID_MULTIPLIER_KEY = (campaignId: string) => `agent:bid_multiplier:${campaignId}`;

export interface OptimizationResult {
  campaignId: string;
  action: string;
  applied: boolean;
  details: Record<string, unknown>;
}

export class OptimizationService {
  constructor(
    private campaignRepo: ICampaignRepository,
    private creativeRepo: ICreativeRepository,
    private cache: ICacheProvider,
  ) {}

  async applyOptimization(
    campaign: Campaign,
    input: AgentOptimizeInput,
  ): Promise<OptimizationResult> {
    switch (input.action) {
      case 'ADJUST_BID':
        return this.adjustBid(campaign, input);
      case 'PAUSE_CREATIVE':
        return this.pauseCreative(campaign, input);
      case 'RESUME_CREATIVE':
        return this.resumeCreative(campaign, input);
      case 'SHIFT_BUDGET':
        return this.shiftBudget(campaign, input);
      case 'UPDATE_TARGETING':
        return this.updateTargeting(campaign, input);
      default:
        throw new ValidationError(`Unknown action: ${input.action}`);
    }
  }

  private async adjustBid(
    campaign: Campaign,
    input: AgentOptimizeInput,
  ): Promise<OptimizationResult> {
    if (!input.bidMultiplier) {
      throw new ValidationError('bidMultiplier is required for ADJUST_BID action');
    }

    // Store multiplier in cache — the scorer reads this during bid evaluation
    await this.cache.set(
      BID_MULTIPLIER_KEY(campaign.id),
      input.bidMultiplier.toString(),
      86400, // 24h TTL
    );

    return {
      campaignId: campaign.id,
      action: 'ADJUST_BID',
      applied: true,
      details: {
        bidMultiplier: input.bidMultiplier,
        reason: input.reason ?? 'AI agent optimization',
      },
    };
  }

  private async pauseCreative(
    campaign: Campaign,
    input: AgentOptimizeInput,
  ): Promise<OptimizationResult> {
    if (!input.creativeId) {
      throw new ValidationError('creativeId is required for PAUSE_CREATIVE action');
    }

    const creative = await this.creativeRepo.findById(input.creativeId);
    if (!creative || creative.campaignId !== campaign.id) {
      throw new NotFoundError('Creative not found in this campaign');
    }

    await this.creativeRepo.update(input.creativeId, { status: 'PAUSED' });

    return {
      campaignId: campaign.id,
      action: 'PAUSE_CREATIVE',
      applied: true,
      details: { creativeId: input.creativeId, newStatus: 'PAUSED', reason: input.reason },
    };
  }

  private async resumeCreative(
    campaign: Campaign,
    input: AgentOptimizeInput,
  ): Promise<OptimizationResult> {
    if (!input.creativeId) {
      throw new ValidationError('creativeId is required for RESUME_CREATIVE action');
    }

    const creative = await this.creativeRepo.findById(input.creativeId);
    if (!creative || creative.campaignId !== campaign.id) {
      throw new NotFoundError('Creative not found in this campaign');
    }

    await this.creativeRepo.update(input.creativeId, { status: 'ACTIVE' });

    return {
      campaignId: campaign.id,
      action: 'RESUME_CREATIVE',
      applied: true,
      details: { creativeId: input.creativeId, newStatus: 'ACTIVE', reason: input.reason },
    };
  }

  private async shiftBudget(
    campaign: Campaign,
    input: AgentOptimizeInput,
  ): Promise<OptimizationResult> {
    if (!input.newDailyDollars) {
      throw new ValidationError('newDailyDollars is required for SHIFT_BUDGET action');
    }

    const newDailyBudget = Math.round(input.newDailyDollars * DOLLARS_TO_CENTS);
    if (newDailyBudget > campaign.budget.totalBudget) {
      throw new ValidationError('New daily budget cannot exceed total budget');
    }

    await this.campaignRepo.update(campaign.id, {
      budget: { dailyBudget: newDailyBudget },
    });

    return {
      campaignId: campaign.id,
      action: 'SHIFT_BUDGET',
      applied: true,
      details: {
        previousDailyBudget: campaign.budget.dailyBudget,
        newDailyBudget,
        reason: input.reason,
      },
    };
  }

  private async updateTargeting(
    campaign: Campaign,
    input: AgentOptimizeInput,
  ): Promise<OptimizationResult> {
    const currentSegments = campaign.targeting.segments;
    let segments = [...currentSegments];

    if (input.addSegments) {
      for (const seg of input.addSegments) {
        if (!segments.some(s => s.segmentId === seg)) {
          segments.push({ segmentId: seg, matchType: 'INCLUDE' });
        }
      }
    }

    if (input.removeSegments) {
      segments = segments.filter(s => !input.removeSegments!.includes(s.segmentId));
    }

    await this.campaignRepo.update(campaign.id, { targeting: { segments } });

    return {
      campaignId: campaign.id,
      action: 'UPDATE_TARGETING',
      applied: true,
      details: {
        addedSegments: input.addSegments ?? [],
        removedSegments: input.removeSegments ?? [],
        totalSegments: segments.length,
        reason: input.reason,
      },
    };
  }
}
