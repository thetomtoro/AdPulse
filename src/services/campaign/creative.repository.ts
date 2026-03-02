import type { Creative } from '../../shared/types.js';
import type { CreateCreativeInput } from '../../api/schemas/campaign.schema.js';

export interface ICreativeRepository {
  create(campaignId: string, input: CreateCreativeInput): Promise<Creative>;
  findById(id: string): Promise<Creative | null>;
  findByCampaignId(campaignId: string): Promise<Creative[]>;
  findActiveByCampaignId(campaignId: string): Promise<Creative[]>;
  update(id: string, updates: Partial<Creative>): Promise<Creative>;
  delete(id: string): Promise<void>;
}
