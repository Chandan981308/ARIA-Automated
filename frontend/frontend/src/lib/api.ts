import axios, { AxiosError } from 'axios';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login-json', { email, password });
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
    }
    return response;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },
  me: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
  isAuthenticated: () => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('token');
    }
    return false;
  },
};

// Leads API
export const leadsAPI = {
  list: (params?: Record<string, any>) => api.get('/leads', { params }),
  get: (id: number) => api.get(`/leads/${id}`),
  create: (data: any) => api.post('/leads', data),
  update: (id: number, data: any) => api.put(`/leads/${id}`, data),
  delete: (id: number) => api.delete(`/leads/${id}`),
  initiateCall: (id: number) => api.post(`/leads/${id}/call`),
  bulkAction: (action: string, leadIds: number[], value?: number) =>
    api.post('/leads/bulk-action', { action, lead_ids: leadIds, value }),
  hotLeadsQueue: (limit?: number) => api.get('/leads/hot-leads/queue', { params: { limit } }),
};

// Campaigns API
export const campaignsAPI = {
  list: (params?: Record<string, any>) => api.get('/campaigns', { params }),
  get: (id: number) => api.get(`/campaigns/${id}`),
  create: (data: any) => api.post('/campaigns', data),
  update: (id: number, data: any) => api.put(`/campaigns/${id}`, data),
  start: (id: number) => api.post(`/campaigns/${id}/start`),
  pause: (id: number) => api.post(`/campaigns/${id}/pause`),
  previewLeads: (id: number, limit?: number) =>
    api.get(`/campaigns/${id}/preview-leads`, { params: { limit } }),
};

// Calls API
export const callsAPI = {
  list: (params?: Record<string, any>) => api.get('/calls', { params }),
  get: (id: number) => api.get(`/calls/${id}`),
  live: () => api.get('/calls/live'),
  getRecording: (id: number) => api.get(`/calls/${id}/recording`),
  getTranscript: (id: number) => api.get(`/calls/${id}/transcript`),
  transfer: (id: number, userId: number) => api.post(`/calls/${id}/transfer`, { user_id: userId }),
};

// Analytics API
export const analyticsAPI = {
  dashboard: () => api.get('/analytics/dashboard'),
  callTrend: (days?: number) => api.get('/analytics/call-trend', { params: { days } }),
  classificationBreakdown: (days?: number, campaignId?: number) =>
    api.get('/analytics/classification-breakdown', { params: { days, campaign_id: campaignId } }),
  topObjections: (days?: number, limit?: number) =>
    api.get('/analytics/top-objections', { params: { days, limit } }),
  bestCallingTimes: (days?: number) =>
    api.get('/analytics/best-calling-times', { params: { days } }),
  campaign: (id: number) => api.get(`/analytics/campaign/${id}`),
};

// Compliance API
export const complianceAPI = {
  status: () => api.get('/compliance/status'),
  logs: (params?: Record<string, any>) => api.get('/compliance/logs', { params }),
  optOut: (leadId: number, reason?: string) =>
    api.post('/compliance/opt-out', { lead_id: leadId, reason }),
  requestErasure: (leadId: number, reason?: string) =>
    api.post('/compliance/erasure-request', { lead_id: leadId, reason }),
  processErasure: (leadId: number) => api.post(`/compliance/process-erasure/${leadId}`),
  pendingErasures: () => api.get('/compliance/erasure-pending'),
};

// Users API
export const usersAPI = {
  list: (params?: Record<string, any>) => api.get('/users', { params }),
  get: (id: number) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: number, data: any) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
  availableSalesReps: () => api.get('/users/sales-team/available'),
};

// Settings API
export const settingsAPI = {
  getAll: () => api.get('/settings'),
  getCalling: () => api.get('/settings/calling'),
  updateCalling: (data: any) => api.put('/settings/calling', data),
  getVoice: () => api.get('/settings/voice'),
  updateVoice: (data: any) => api.put('/settings/voice', data),
  getNotifications: () => api.get('/settings/notifications'),
  updateNotifications: (data: any) => api.put('/settings/notifications', data),
  getAssignment: () => api.get('/settings/assignment'),
  updateAssignment: (data: any) => api.put('/settings/assignment', data),
  voiceOptions: () => api.get('/settings/voice/options'),
  scripts: () => api.get('/settings/scripts'),
};

// Agents API
export const agentsAPI = {
  list: (params?: Record<string, any>) => api.get('/agents', { params }),
  get: (id: number) => api.get(`/agents/${id}`),
  create: (data: any) => api.post('/agents', data),
  update: (id: number, data: any) => api.put(`/agents/${id}`, data),
  delete: (id: number) => api.delete(`/agents/${id}`),
  aiEdit: (data: { prompt: string; instruction?: string; agent_name?: string; language?: string }) =>
    api.post('/agents/ai-edit', data),
  chat: (data: { message: string; agent_id: number; conversation_history?: any[] }) =>
    api.post('/agents/chat', data),
};

// Smartflo API
export const smartfloAPI = {
  info: () => api.get('/smartflo/info'),
  sessions: () => api.get('/smartflo/sessions'),
  myNumbers: () => api.get('/smartflo/my-numbers'),
  smartfloUsers: (params?: Record<string, any>) => api.get('/smartflo/users', { params }),
  assignAgent: (numberId: string, agentId: number) =>
    api.post(`/smartflo/my-numbers/${numberId}/assign-agent`, { agent_id: agentId }),
  unassignAgent: (numberId: string) =>
    api.post(`/smartflo/my-numbers/${numberId}/unassign-agent`),
  updateNumberConfig: (numberId: string, data: { label?: string; status?: string }) =>
    api.put(`/smartflo/my-numbers/${numberId}/config`, data),
};

// Voice Lab API
export const voicelabAPI = {
  listVoices: (search?: string) =>
    api.get('/voicelab/voices', { params: search ? { search } : {} }),
  getVoice: (voiceId: string) => api.get(`/voicelab/voices/${voiceId}`),
  cloneVoice: (formData: FormData) =>
    api.post('/voicelab/voices/clone', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    }),
  importVoice: (voiceId: string, provider: string = 'elevenlabs') =>
    api.post('/voicelab/voices/import', { voice_id: voiceId, provider }),
  deleteVoice: (voiceId: string) => api.delete(`/voicelab/voices/${voiceId}`),
  listModels: () => api.get('/voicelab/models'),
  subscription: () => api.get('/voicelab/subscription'),
};

// Knowledge Base API
export const knowledgeBaseAPI = {
  getConfig: () => api.get('/knowledge-base/config'),
  updateConfig: (data: Record<string, any>) => api.put('/knowledge-base/config', data),
  listFaqs: () => api.get('/knowledge-base/faqs'),
  addFaq: (data: { question: string; answer: string; category?: string }) =>
    api.post('/knowledge-base/faqs', data),
  deleteFaq: (faqId: string) => api.delete(`/knowledge-base/faqs/${faqId}`),
  listCustomData: () => api.get('/knowledge-base/custom-data'),
  addCustomData: (data: { title: string; content: string; category?: string }) =>
    api.post('/knowledge-base/custom-data', data),
  deleteCustomData: (entryId: string) => api.delete(`/knowledge-base/custom-data/${entryId}`),
  addObjection: (data: { objection: string; response_en: string; response_hi?: string }) =>
    api.post('/knowledge-base/objections', data),
  deleteObjection: (objId: string) => api.delete(`/knowledge-base/objections/${objId}`),
  chat: (data: { message: string; conversation_history: any[]; language_preference?: string }) =>
    api.post('/knowledge-base/chat', data, { timeout: 60000 }),
};

// WebSocket Manager
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private url: string;

  constructor(endpoint: string) {
    this.url = `${WS_BASE_URL}${endpoint}`;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected:', this.url);
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const eventType = data.event || data.type || 'message';

            // Notify listeners for this event type
            const eventListeners = this.listeners.get(eventType);
            if (eventListeners) {
              eventListeners.forEach((listener) => listener(data));
            }

            // Notify 'all' listeners
            const allListeners = this.listeners.get('all');
            if (allListeners) {
              allListeners.forEach((listener) => listener(data));
            }
          } catch (e) {
            console.error('Failed to parse WebSocket message:', e);
          }
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => this.connect(), this.reconnectDelay * this.reconnectAttempts);
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: any) => void) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Create singleton instances for common WebSocket connections
export const liveCallsWS = new WebSocketManager('/ws/live-calls');
export const smartfloWS = new WebSocketManager('/ws/smartflo');

// Voice Agent WebSocket - direct connection (not using WebSocketManager due to binary data)
export function createVoiceAgentWS(): WebSocket {
  const token = localStorage.getItem('token') || '';
  const wsUrl = `ws://localhost:8000/ws/voice-agent?token=${token}`;
  return new WebSocket(wsUrl);
}

export default api;
