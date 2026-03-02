import type { Campaign, CampaignStatus, Advertiser, ApiKey } from '../../shared/types.js';
import type { CreateCampaignInput, UpdateCampaignInput, CampaignQuery } from '../../api/schemas/campaign.schema.js';
import type { ICampaignRepository } from './campaign.repository.js';
import { campaignId } from '../../shared/ids.js';
import { NotFoundError } from '../../shared/errors.js';

export class MemoryCampaignRepository implements ICampaignRepository {
  private campaigns = new Map<string, Campaign>();
  private advertisers = new Map<string, Advertiser>();
  private apiKeys = new Map<string, ApiKey>(); // keyHash -> ApiKey

  async create(advertiserId: string, input: CreateCampaignInput): Promise<Campaign> {
    const id = campaignId();
    const now = new Date();

    const campaign: Campaign = {
      id,
      advertiserId,
      name: input.name,
      status: 'DRAFT' as CampaignStatus,
      objective: input.objective as any,
      budget: input.budget as any,
      schedule: {
        startDate: new Date(input.schedule.startDate),
        endDate: input.schedule.endDate ? new Date(input.schedule.endDate) : undefined,
        timezone: input.schedule.timezone,
      },
      targeting: input.targeting as any,
      compliance: input.compliance as any,
      createdAt: now,
      updatedAt: now,
    };

    this.campaigns.set(id, campaign);
    return campaign;
  }

  async findById(id: string): Promise<Campaign | null> {
    return this.campaigns.get(id) ?? null;
  }

  async findAll(
    advertiserId: string,
    query: CampaignQuery,
  ): Promise<{ campaigns: Campaign[]; total: number }> {
    let results = [...this.campaigns.values()].filter(
      c => c.advertiserId === advertiserId && c.status !== 'ARCHIVED',
    );

    if (query.status) {
      results = results.filter(c => c.status === query.status);
    }
    if (query.objective) {
      results = results.filter(c => c.objective === query.objective);
    }

    // Sort by createdAt descending
    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = results.length;
    const campaigns = results.slice(query.offset, query.offset + query.limit);

    return { campaigns, total };
  }

  async update(id: string, updates: UpdateCampaignInput): Promise<Campaign> {
    const campaign = this.campaigns.get(id);
    if (!campaign) throw new NotFoundError('Campaign', id);

    if (updates.name !== undefined) campaign.name = updates.name;
    if (updates.objective !== undefined) campaign.objective = updates.objective as any;
    if (updates.budget) campaign.budget = { ...campaign.budget, ...updates.budget } as any;
    if (updates.schedule) {
      campaign.schedule = {
        ...campaign.schedule,
        ...(updates.schedule.startDate && { startDate: new Date(updates.schedule.startDate) }),
        ...(updates.schedule.endDate && { endDate: new Date(updates.schedule.endDate) }),
        ...(updates.schedule.timezone && { timezone: updates.schedule.timezone }),
      };
    }
    if (updates.targeting) campaign.targeting = { ...campaign.targeting, ...updates.targeting } as any;
    if (updates.compliance) campaign.compliance = { ...campaign.compliance, ...updates.compliance } as any;

    campaign.updatedAt = new Date();
    return campaign;
  }

  async updateStatus(id: string, status: CampaignStatus): Promise<Campaign> {
    const campaign = this.campaigns.get(id);
    if (!campaign) throw new NotFoundError('Campaign', id);

    campaign.status = status;
    campaign.updatedAt = new Date();
    return campaign;
  }

  async findActive(): Promise<Campaign[]> {
    return [...this.campaigns.values()].filter(c => c.status === 'ACTIVE');
  }

  // Advertiser operations
  async findAdvertiserByKeyHash(keyHash: string): Promise<Advertiser | null> {
    const apiKey = this.apiKeys.get(keyHash);
    if (!apiKey) return null;
    return this.advertisers.get(apiKey.advertiserId) ?? null;
  }

  async findAdvertiserById(id: string): Promise<Advertiser | null> {
    return this.advertisers.get(id) ?? null;
  }

  async createAdvertiser(advertiser: Omit<Advertiser, 'createdAt'>): Promise<Advertiser> {
    const full: Advertiser = { ...advertiser, createdAt: new Date() };
    this.advertisers.set(advertiser.id, full);
    return full;
  }

  async createApiKey(advertiserId: string, keyHash: string, keyPrefix: string): Promise<void> {
    this.apiKeys.set(keyHash, {
      id: crypto.randomUUID(),
      advertiserId,
      keyHash,
      keyPrefix,
      scopes: ['read', 'write'],
      createdAt: new Date(),
    });
  }
}
