import type { Campaign, CampaignStatus, Advertiser } from '../../shared/types.js';
import type { CreateCampaignInput, UpdateCampaignInput, CampaignQuery } from '../../api/schemas/campaign.schema.js';

export interface ICampaignRepository {
  create(advertiserId: string, input: CreateCampaignInput): Promise<Campaign>;
  findById(id: string): Promise<Campaign | null>;
  findAll(advertiserId: string, query: CampaignQuery): Promise<{ campaigns: Campaign[]; total: number }>;
  update(id: string, updates: UpdateCampaignInput): Promise<Campaign>;
  updateStatus(id: string, status: CampaignStatus): Promise<Campaign>;
  findActive(): Promise<Campaign[]>;

  // Advertiser operations (co-located for simplicity)
  findAdvertiserByKeyHash(keyHash: string): Promise<Advertiser | null>;
  findAdvertiserById(id: string): Promise<Advertiser | null>;
  createAdvertiser(advertiser: Omit<Advertiser, 'createdAt'>): Promise<Advertiser>;
  createApiKey(advertiserId: string, keyHash: string, keyPrefix: string): Promise<void>;
}
