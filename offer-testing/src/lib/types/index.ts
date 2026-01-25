/**
 * Types Index
 * 
 * Barrel export for all types.
 * This allows importing like: import { Offer, Company, Contact } from '@/lib/types'
 */

// Offer types
export type {
  OfferType,
  OfferOwnership,
  OfferStatus,
  Offer,
  CreateOfferInput,
  UpdateOfferInput,
  ICP,
  CompanyProfile,
  BuyerProfile,
  SearchQueries,
  ScoringRubric,
  EmailSequence,
  EmailTemplate,
  LinkedInTemplates,
  PersonalizationVariables,
} from './offer'

// Company types
export type {
  CompanySize,
  CompanyPriority,
  CompanyStatus,
  SourceTool,
  Company,
  CompanySignals,
  CreateCompanyInput,
  UpdateCompanyInput,
} from './company'

// Contact types
export type {
  ConnectionDegree,
  Seniority,
  EmailStatus,
  ContactPriority,
  ContactStatus,
  Contact,
  ContactWithCompany,
  CreateContactInput,
  UpdateContactInput,
} from './contact'

// Campaign & outreach types
export type {
  AccountType,
  AccountStatus,
  Account,
  CampaignChannel,
  CampaignType,
  CampaignStatus,
  Campaign,
  SchedulingConfig,
  SequenceConfig,
  SequenceStep,
  CampaignContactStatus,
  ReplySentiment,
  CampaignContact,
  MessageChannel,
  MessageStatus,
  Message,
  SendQueueStatus,
  SendQueueItem,
  MessageEventType,
  MessageEvent,
  OutreachHistory,
  MessageTemplateStatus,
  MessageTemplate,
  PipelineRunStatus,
  PipelineStepStatus,
  PipelineRun,
  PipelineStep,
  ActivityAction,
  ActivityStatus,
  AccountActivity,
  CreateCampaignInput,
  CreateCampaignContactInput,
  CreateMessageInput,
  CreateAccountActivityInput,
  LinkedInDailyCount,
} from './campaign'

// Networking campaign types
export type {
  RelationshipStrength,
  CampaignResponse,
  ConnectionPriority,
  LinkedInConnection,
  CreateLinkedInConnectionInput,
  UpdateLinkedInConnectionInput,
  LinkedInConversation,
  CreateLinkedInConversationInput,
  MessageType,
  LinkedInMessage,
  CreateLinkedInMessageInput,
  NetworkingBatchStatus,
  NetworkingTargetFilters,
  NetworkingCampaignBatch,
  CreateNetworkingBatchInput,
  UpdateNetworkingBatchInput,
  NetworkingOutreachStatus,
  NetworkingOutreach,
  CreateNetworkingOutreachInput,
  UpdateNetworkingOutreachInput,
  RecencyCategory,
  NetworkingContactReady,
  NetworkingBatchPerformance,
} from './networking'
