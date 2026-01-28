export type ProspectStatus = 'pending' | 'analyzed' | 'draft_ready' | 'queued' | 'sent';
export type ProspectSource = 'csv' | 'google_places';
export type QueueStatus = 'pending' | 'sent' | 'failed';
export type FollowUpStatus = 'none' | 'waiting' | 'accepted' | 'refused' | 'no_response' | 'not_prospectable';

export interface Prospect {
  id: string;
  name: string;
  email: string | null;
  url: string | null;
  city: string | null;
  phone: string | null;
  source: ProspectSource;
  status: ProspectStatus;
  followUpStatus: FollowUpStatus | null;
  followUpNote: string | null;
  followUpAt: number | Date | null;
  createdAt: number | Date;
}

export interface DesignIssue {
  category: 'visual' | 'ux' | 'structure' | 'accessibility';
  severity: 'high' | 'medium' | 'low';
  description: string;
}

export interface Analysis {
  id: string;
  prospectId: string;
  httpsValid: boolean;
  hasViewport: boolean;
  ttfbMs: number;
  technologies: string[] | string;
  obsoleteTech: string[] | string;
  designScore: number | null;
  designIssues: DesignIssue[] | string | null;
  designSummary: string | null;
  score: number;
  rawData: Record<string, unknown> | string;
  analyzedAt: number | Date;
}

export interface EmailDraft {
  id: string;
  prospectId: string;
  subject: string;
  body: string;
  generatedAt: number;
}

export interface EmailQueueItem {
  id: string;
  prospectId: string;
  draftId: string;
  scheduledAt: number;
  status: QueueStatus;
  sentAt: number | null;
  error: string | null;
}

export interface DailyLimit {
  date: string;
  count: number;
}

export interface AnalysisResult {
  httpsValid: boolean;
  hasViewport: boolean;
  ttfbMs: number;
  technologies: string[];
  obsoleteTech: string[];
  designScore: number;
  designIssues: DesignIssue[];
  designPositives: string[];
  designSummary: string;
  rawData: Record<string, unknown>;
}

export interface ProspectWithAnalysis extends Prospect {
  analysis?: Analysis | null;
  draft?: EmailDraft | null;
}

export interface DashboardStats {
  totalProspects: number;
  analyzedCount: number;
  draftReadyCount: number;
  queuedCount: number;
  sentCount: number;
  averageScore: number;
}

export interface CSVProspect {
  name: string;
  email?: string;
  url?: string;
  city?: string;
  phone?: string;
}

export interface GooglePlaceResult {
  name: string;
  address: string;
  phone?: string;
  website?: string;
  email?: string;
  placeId: string;
  types: string[];
}
