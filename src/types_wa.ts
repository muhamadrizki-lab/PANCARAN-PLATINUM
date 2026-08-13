export interface WaSessionData {
  id: string; // user email
  email: string;
  status: 'disconnected' | 'connecting' | 'connected';
  connectedPhone: string;
  updatedAt: string;
}

export interface WaTemplateData {
  id: string;
  name: string;
  category: string;
  content: string;
  imageUrl?: string;
  createdAt?: string;
}
