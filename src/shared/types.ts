// ============================================================
// Campaign — Top-level container for an advertising campaign
// ============================================================
export interface Campaign {
  id: string;
  advertiserId: string;
  name: string;
  status: CampaignStatus;
  objective: CampaignObjective;
  budget: BudgetConfig;
  schedule: ScheduleConfig;
  targeting: TargetingConfig;
  compliance: ComplianceConfig;
  createdAt: Date;
  updatedAt: Date;
}

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

export enum CampaignObjective {
  AWARENESS = 'AWARENESS',
  TRAFFIC = 'TRAFFIC',
  CONVERSIONS = 'CONVERSIONS',
  REVENUE = 'REVENUE',
}

// ============================================================
// Budget Configuration
// ============================================================
export interface BudgetConfig {
  totalBudget: number;
  dailyBudget: number;
  bidStrategy: BidStrategy;
  maxBidCpm: number;
  pacingType: PacingType;
}

export enum BidStrategy {
  MANUAL_CPM = 'MANUAL_CPM',
  TARGET_CPA = 'TARGET_CPA',
  MAXIMIZE_CLICKS = 'MAXIMIZE_CLICKS',
  MAXIMIZE_CONVERSIONS = 'MAXIMIZE_CONVERSIONS',
}

export enum PacingType {
  EVEN = 'EVEN',
  ACCELERATED = 'ACCELERATED',
  FRONTLOADED = 'FRONTLOADED',
}

// ============================================================
// Targeting Configuration
// ============================================================
export interface TargetingConfig {
  segments: SegmentRule[];
  geo: GeoTarget[];
  devices: DeviceType[];
  dayParting: DayPartRule[];
  frequencyCap: FrequencyCap;
  contextual: ContextualRule[];
}

export interface SegmentRule {
  segmentId: string;
  matchType: 'INCLUDE' | 'EXCLUDE';
}

export interface GeoTarget {
  type: 'COUNTRY' | 'REGION' | 'CITY' | 'POSTAL';
  value: string;
  matchType: 'INCLUDE' | 'EXCLUDE';
}

export interface FrequencyCap {
  maxImpressions: number;
  windowHours: number;
  scope: 'CAMPAIGN' | 'AD_GROUP' | 'CREATIVE';
}

export interface DayPartRule {
  daysOfWeek: number[];
  startHour: number;
  endHour: number;
  timezone: string;
}

export interface ContextualRule {
  categoryId: string;
  matchType: 'INCLUDE' | 'EXCLUDE';
}

// ============================================================
// Creative
// ============================================================
export interface Creative {
  id: string;
  campaignId: string;
  type: CreativeType;
  name: string;
  content: CreativeContent;
  status: 'ACTIVE' | 'PAUSED' | 'REJECTED';
  weight: number;
  metadata: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export enum CreativeType {
  BANNER = 'BANNER',
  NATIVE = 'NATIVE',
  SPONSORED_LISTING = 'SPONSORED_LISTING',
  VIDEO = 'VIDEO',
}

export interface CreativeContent {
  headline?: string;
  body?: string;
  imageUrl?: string;
  clickUrl: string;
  impressionTracker?: string;
  displayUrl?: string;
}

// ============================================================
// Schedule Configuration
// ============================================================
export interface ScheduleConfig {
  startDate: Date;
  endDate?: Date;
  timezone: string;
}

// ============================================================
// Compliance Configuration
// ============================================================
export interface ComplianceConfig {
  requireConsent: boolean;
  consentTypes: ConsentType[];
  dataRetentionDays: number;
  restrictedCategories: string[];
  brandSafetyLevel: 'STRICT' | 'MODERATE' | 'PERMISSIVE';
}

export enum ConsentType {
  GDPR_TCF = 'GDPR_TCF',
  CCPA_USP = 'CCPA_USP',
  CUSTOM = 'CUSTOM',
}

// ============================================================
// Ad Request — Incoming bid request from a publisher/platform
// ============================================================
export interface AdRequest {
  id: string;
  publisherId: string;
  placementId: string;
  placementType: CreativeType;
  user: AdRequestUser;
  context: AdRequestContext;
  timestamp: Date;
}

export interface AdRequestUser {
  id?: string;
  segments: string[];
  geo: { country: string; region?: string; city?: string };
  device: DeviceType;
  consentSignals: ConsentSignal[];
}

export interface ConsentSignal {
  type: ConsentType;
  granted: boolean;
  raw?: string;
}

export interface AdRequestContext {
  pageUrl?: string;
  categories: string[];
  keywords?: string[];
}

export enum DeviceType {
  DESKTOP = 'DESKTOP',
  MOBILE = 'MOBILE',
  TABLET = 'TABLET',
  CTV = 'CTV',
}

// ============================================================
// Bid Response
// ============================================================
export interface BidResponse {
  requestId: string;
  bids: Bid[];
  processingTimeMs: number;
  debugInfo?: BidDebugInfo;
}

export interface Bid {
  campaignId: string;
  creativeId: string;
  bidPriceCpm: number;
  creative: CreativeContent;
  trackingUrls: {
    impression: string;
    click: string;
    viewable: string;
  };
}

export interface BidDebugInfo {
  candidateCampaigns: number;
  filteredReasons: Record<string, number>;
  scoringDetails: ScoringDetail[];
}

export interface ScoringDetail {
  campaignId: string;
  baseScore: number;
  budgetMultiplier: number;
  relevanceMultiplier: number;
  finalScore: number;
  eligible: boolean;
  filterReason?: string;
}

// ============================================================
// Events
// ============================================================
export interface AdEvent {
  id: string;
  type: EventType;
  campaignId: string;
  creativeId: string;
  requestId: string;
  publisherId: string;
  userId?: string;
  timestamp: Date;
  metadata: Record<string, string>;
}

export enum EventType {
  IMPRESSION = 'IMPRESSION',
  VIEWABLE = 'VIEWABLE',
  CLICK = 'CLICK',
  CONVERSION = 'CONVERSION',
}

// ============================================================
// Attribution
// ============================================================
export interface AttributionEvent {
  conversionId: string;
  conversionType: string;
  conversionValue?: number;
  touchpoints: Touchpoint[];
  attributionModel: AttributionModel;
  attributedCredits: AttributedCredit[];
}

export interface Touchpoint {
  eventId: string;
  eventType: EventType;
  campaignId: string;
  creativeId: string;
  timestamp: Date;
}

export interface AttributedCredit {
  campaignId: string;
  creativeId: string;
  credit: number;
  model: AttributionModel;
}

export enum AttributionModel {
  LAST_CLICK = 'LAST_CLICK',
  FIRST_CLICK = 'FIRST_CLICK',
  LINEAR = 'LINEAR',
  TIME_DECAY = 'TIME_DECAY',
  POSITION_BASED = 'POSITION_BASED',
}

// ============================================================
// Advertiser
// ============================================================
export interface Advertiser {
  id: string;
  name: string;
  apiKeyHash: string;
  rateLimitRps: number;
  complianceDefaults: Partial<ComplianceConfig>;
  createdAt: Date;
}

// ============================================================
// API Key
// ============================================================
export interface ApiKey {
  id: string;
  advertiserId: string;
  keyPrefix: string;
  keyHash: string;
  scopes: string[];
  expiresAt?: Date;
  createdAt: Date;
}

// ============================================================
// Webhook
// ============================================================
export interface Webhook {
  id: string;
  advertiserId: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  createdAt: Date;
}

// ============================================================
// Tracking Token Payload
// ============================================================
export interface TrackingPayload {
  rid: string;  // request ID
  cid: string;  // campaign ID
  crt: string;  // creative ID
  pid: string;  // publisher ID
  uid?: string; // user ID (only if consent)
  ts: number;   // timestamp
  exp: number;  // expiry
}

// ============================================================
// Consent Result
// ============================================================
export interface ConsentResult {
  allowed: boolean;
  dataScope: 'FULL' | 'CONTEXTUAL_ONLY' | 'BLOCKED';
  restrictions?: string[];
}
