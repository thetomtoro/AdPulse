import type { Campaign, CampaignStatus } from '../../shared/types.js';
import type { ICampaignRepository } from './campaign.repository.js';
import type { ICreativeRepository } from './creative.repository.js';
import type {
  CreateCampaignInput,
  UpdateCampaignInput,
  CampaignQuery,
} from '../../api/schemas/campaign.schema.js';
import { validateCampaignBusiness } from './campaignValidator.js';
import { NotFoundError, ValidationError } from '../../shared/errors.js';

export class CampaignService {
  constructor(
    private campaignRepo: ICampaignRepository,
    private creativeRepo: ICreativeRepository,
  ) {}

  async createCampaign(advertiserId: string, input: CreateCampaignInput) {
    // Business rule validation
    validateCampaignBusiness(input);

    // Create campaign
    const campaign = await this.campaignRepo.create(advertiserId, input);

    // Create creatives
    const creatives = await Promise.all(
      input.creatives.map(c => this.creativeRepo.create(campaign.id, c)),
    );

    return {
      id: campaign.id,
      status: campaign.status,
      name: campaign.name,
      creatives: creatives.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
      })),
      createdAt: campaign.createdAt.toISOString(),
    };
  }

  async getCampaign(id: string): Promise<Campaign & { creatives: any[] }> {
    const campaign = await this.campaignRepo.findById(id);
    if (!campaign) throw new NotFoundError('Campaign', id);

    const creatives = await this.creativeRepo.findByCampaignId(id);

    return { ...campaign, creatives };
  }

  async listCampaigns(advertiserId: string, query: CampaignQuery) {
    return this.campaignRepo.findAll(advertiserId, query);
  }

  async updateCampaign(id: string, updates: UpdateCampaignInput): Promise<Campaign> {
    const existing = await this.campaignRepo.findById(id);
    if (!existing) throw new NotFoundError('Campaign', id);

    if (existing.status === 'ARCHIVED') {
      throw new ValidationError('Cannot update an archived campaign');
    }

    return this.campaignRepo.update(id, updates);
  }

  async activateCampaign(id: string): Promise<Campaign> {
    const campaign = await this.campaignRepo.findById(id);
    if (!campaign) throw new NotFoundError('Campaign', id);

    if (campaign.status !== 'DRAFT' && campaign.status !== 'PAUSED') {
      throw new ValidationError(
        `Cannot activate campaign with status '${campaign.status}'. Must be DRAFT or PAUSED.`,
      );
    }

    // Verify campaign has at least one active creative
    const creatives = await this.creativeRepo.findActiveByCampaignId(id);
    if (creatives.length === 0) {
      throw new ValidationError('Campaign must have at least one active creative to be activated');
    }

    return this.campaignRepo.updateStatus(id, 'ACTIVE' as CampaignStatus);
  }

  async pauseCampaign(id: string): Promise<Campaign> {
    const campaign = await this.campaignRepo.findById(id);
    if (!campaign) throw new NotFoundError('Campaign', id);

    if (campaign.status !== 'ACTIVE') {
      throw new ValidationError(
        `Cannot pause campaign with status '${campaign.status}'. Must be ACTIVE.`,
      );
    }

    return this.campaignRepo.updateStatus(id, 'PAUSED' as CampaignStatus);
  }

  async archiveCampaign(id: string): Promise<void> {
    const campaign = await this.campaignRepo.findById(id);
    if (!campaign) throw new NotFoundError('Campaign', id);

    if (campaign.status === 'ARCHIVED') {
      throw new ValidationError('Campaign is already archived');
    }

    await this.campaignRepo.updateStatus(id, 'ARCHIVED' as CampaignStatus);
  }
}
