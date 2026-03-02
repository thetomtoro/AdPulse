import type { Creative } from '../../shared/types.js';
import type { CreateCreativeInput } from '../../api/schemas/campaign.schema.js';
import type { ICreativeRepository } from './creative.repository.js';
import { creativeId } from '../../shared/ids.js';
import { NotFoundError } from '../../shared/errors.js';

export class MemoryCreativeRepository implements ICreativeRepository {
  private creatives = new Map<string, Creative>();

  async create(campaignId: string, input: CreateCreativeInput): Promise<Creative> {
    const id = creativeId();
    const now = new Date();

    const creative: Creative = {
      id,
      campaignId,
      type: input.type as any,
      name: input.name,
      content: input.content,
      status: 'ACTIVE',
      weight: input.weight ?? 50,
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };

    this.creatives.set(id, creative);
    return creative;
  }

  async findById(id: string): Promise<Creative | null> {
    return this.creatives.get(id) ?? null;
  }

  async findByCampaignId(campaignId: string): Promise<Creative[]> {
    return [...this.creatives.values()]
      .filter(c => c.campaignId === campaignId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findActiveByCampaignId(campaignId: string): Promise<Creative[]> {
    return [...this.creatives.values()]
      .filter(c => c.campaignId === campaignId && c.status === 'ACTIVE');
  }

  async update(id: string, updates: Partial<Creative>): Promise<Creative> {
    const creative = this.creatives.get(id);
    if (!creative) throw new NotFoundError('Creative', id);

    Object.assign(creative, updates, { updatedAt: new Date() });
    return creative;
  }

  async delete(id: string): Promise<void> {
    this.creatives.delete(id);
  }
}
