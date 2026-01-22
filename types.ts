
export interface GroundingLink {
  uri: string;
  title: string;
}

export type FieldType = 'name' | 'title' | 'company' | 'linkedin_url' | 'email' | 'ignore';

export interface ColumnMapping {
  header: string;
  mappedTo: FieldType;
  preview: string[];
  autoDetected: boolean;
}

export interface Profile {
  id: string;
  name: string;
  title: string;
  company: string;
  region?: string;
  linkedin_url?: string;
  email?: string;
  selected?: boolean;
  
  // Enriched data
  years_of_experience?: string;
  background?: string;
  what_they_do?: string;
  achievements?: string;
  skills?: string[];
  grounding_urls?: GroundingLink[];
  
  // Agent Recommendation data
  match_reason?: string;
  score?: number;
  
  // Metadata
  enrichment_status: 'pending' | 'processing' | 'success' | 'fallback' | 'error';
  enrichment_source: 'none' | 'gemini_web' | 'title_inference';
}

export interface EnrichmentProgress {
  current: number;
  total: number;
  percentage: string;
  currentName: string;
  phase: 'identifying' | 'extracting';
  logs: Array<{
    name: string;
    status: 'success' | 'error' | 'processing' | 'fallback';
    message: string;
  }>;
}

export interface EnrichmentResult {
  years_of_experience: string;
  background: string;
  what_they_do: string;
  achievements: string;
  skills: string[];
  region: string;
  is_valid: boolean;
  grounding_urls?: GroundingLink[];
  identified_title?: string;
  identified_company?: string;
}

export interface FallbackResult {
  typical_responsibilities: string;
  typical_skills: string[];
}
