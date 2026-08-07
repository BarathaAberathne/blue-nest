export type MessageRole = 'user' | 'assistant';
export type MessageStatus = 'streaming' | 'complete' | 'error';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  timestamp: number;
}

export interface LeadFormData {
  name: string;
  email: string;
  phone: string;
  childAge: string;
  branch: string;
  consent: boolean;
}

export type PageContext =
  | 'home'
  | 'admissions'
  | 'fees'
  | 'forest-school'
  | 'branches'
  | 'harrow'
  | 'aldershot'
  | 'pinner'
  | 'borehamwood'
  | 'northwood'
  | 'contact'
  | 'why-montessori'
  | 'gallery'
  | 'blog'
  | 'general';
