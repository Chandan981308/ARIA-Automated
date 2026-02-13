export interface Lead {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  platformId: number | null;
  plotId: number | null;
  leadStageId: number | null;
  leadStatusId: number | null;
  assignedTo: number | null;
  tracker: number;
  interestStatus: 'interested' | 'not interested' | null;
  other: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  platform_name: string | null;
  plot_name: string | null;
  assigned_user_name: string | null;
  stage_name: string | null;
  status_name: string | null;
  call_count: number;
  last_call_date: string | null;
  classification: string | null;
}

export interface Campaign {
  id: number;
  name: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  filters: CampaignFilters | null;
  daily_call_limit: number;
  calling_hours_start: string;
  calling_hours_end: string;
  max_attempts_per_lead: number;
  retry_interval_hours: number;
  priority: string;
  total_leads: number;
  completed_leads: number;
  created_by: number | null;
  creator_name: string | null;
  created_at: string;
  updated_at: string;
  stats: CampaignStats | null;
}

export interface CampaignFilters {
  leadStageIds?: number[];
  cities?: string[];
  states?: string[];
  platformIds?: number[];
  interestStatus?: string;
  maxTracker?: number;
  plotIds?: number[];
}

export interface CampaignStats {
  total_leads: number;
  completed_leads: number;
  calls_today: number;
  answered_today: number;
  hot_leads: number;
  warm_leads: number;
  cold_leads: number;
  avg_duration: number;
  answer_rate: number;
}

export interface CallLog {
  id: number;
  lead_id: number;
  call_id: string | null;
  campaign_id: number | null;
  status: string | null;
  duration: number | null;
  recording_url: string | null;
  transcript_url: string | null;
  transcript_text: string | null;
  classification: 'cold' | 'warm' | 'hot' | null;
  sentiment_score: number | null;
  call_outcome: string | null;
  call_summary: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  lead_name: string | null;
  lead_phone: string | null;
  campaign_name: string | null;
}

export interface LiveCall {
  call_id: string;
  lead_id: number;
  lead_name: string;
  lead_phone: string;
  plot_name: string | null;
  campaign_name: string | null;
  state: string;
  duration: number;
  last_transcript: string;
  started_at: string;
}

export interface DashboardMetrics {
  live_calls: number;
  completed_today: number;
  hot_leads_today: number;
  answer_rate: number;
  avg_duration: number;
  qualification_rate: number;
}

export interface CallTrendData {
  date: string;
  total_calls: number;
  answered: number;
  hot_leads: number;
  warm_leads: number;
  cold_leads: number;
}

export interface ClassificationBreakdown {
  hot: number;
  warm: number;
  cold: number;
  hot_percentage: number;
  warm_percentage: number;
  cold_percentage: number;
}

export interface ComplianceStatus {
  trai_compliant: boolean;
  dpdp_compliant: boolean;
  dlt_registration_status: string;
  dlt_expiry_date: string | null;
  calling_window_violations_30d: number;
  opt_out_requests_30d: number;
  pending_erasure_requests: number;
  erasure_due_date: string | null;
  data_encryption_status: string;
  consent_records_count: number;
  recordings_within_policy: number;
  last_audit_date: string | null;
}

export interface ComplianceLog {
  id: number;
  event_type: string;
  lead_id: number | null;
  call_id: string | null;
  details: Record<string, any> | null;
  created_at: string;
  lead_name: string | null;
}

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: 'admin' | 'manager' | 'sales_rep' | 'compliance';
  is_active: boolean;
  is_on_leave: boolean;
  created_at: string;
  updated_at: string;
  assigned_leads_count: number;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  page_size: number;
  total_pages?: number;
}

// Smartflo / My Numbers Types
export interface SmartfloNumber {
  id: string;
  name: string;
  description: string;
  alias: string;
  did: string;
  destination: string | null;
  destination_name: string | null;
  sms_templates: string | null;
  assigned_agent_id: number | null;
  assigned_agent_name: string | null;
  status: 'active' | 'inactive' | 'maintenance';
  label: string;
  call_count_today: number;
  total_calls: number;
}

// Agent Setup Types
export interface AgentCostBreakdown {
  transcriber: number;
  llm: number;
  voice: number;
  telephony: number;
  platform: number;
}

export interface AgentTool {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  config: Record<string, any>;
}

export interface Agent {
  id: string;
  name: string;
  welcomeMessage: string;
  agentPrompt: string;
  hangupUsingPrompt: boolean;
  hangupPrompt: string;
  promptVariables: Record<string, string>;
  llmProvider: string;
  llmModel: string;
  temperature: number;
  maxTokens: number;
  audioLanguage: string;
  // Speech-to-Text
  sttProvider: string;
  sttModel: string;
  sttKeywords: string[];
  // Text-to-Speech
  ttsProvider: string;
  ttsModel: string;
  ttsVoice: string;
  ttsBufferSize: number;
  ttsSpeedRate: number;
  ttsSimilarityBoost: number;
  ttsStability: number;
  ttsStyleExaggeration: number;
  engineType: string;
  engineInterruptSensitivity: number;
  callMaxDuration: number;
  callEndCallAfterSilence: number;
  callRecording: boolean;
  tools: AgentTool[];
  inboundPhoneNumber: string | null;
  routing: string;
  costPerMin: number;
  costBreakdown: AgentCostBreakdown;
  createdAt: string;
  updatedAt: string;
}

// Voice Lab Types
export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  description: string;
  accent: string;
  gender: string;
  age: string;
  language: string;
  use_case: string;
  preview_url: string;
  is_cloned: boolean;
  is_professional: boolean;
  provider: string;
}

export interface ElevenLabsModel {
  model_id: string;
  name: string;
  description: string;
  can_do_text_to_speech: boolean;
  can_do_voice_conversion: boolean;
  languages: { language_id: string; name: string }[];
}

export interface ElevenLabsSubscription {
  tier: string;
  character_count: number;
  character_limit: number;
  voice_limit: number;
  can_extend_character_limit: boolean;
  allowed_to_extend_character_limit: boolean;
  available_models: string[];
}
