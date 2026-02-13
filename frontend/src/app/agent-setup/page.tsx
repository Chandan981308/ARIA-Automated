'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Search,
  Upload,
  Bot,
  Brain,
  Volume2,
  Cpu,
  Phone,
  PhoneIncoming,
  Wrench,
  BarChart3,
  Info,
  Sparkles,
  Save,
  Trash2,
  FileText,
  MessageSquare,
  Copy,
  Share2,
  ExternalLink,
  X,
  Mic,
  Languages,
  Loader2,
  Send,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { agentsAPI } from '@/lib/api';
import type { Agent } from '@/types';

// ============================================================================
// Backend ↔ Frontend field mapping helpers
// ============================================================================

function mapBackendToFrontend(data: any): Agent {
  return {
    id: String(data.id),
    name: data.name,
    welcomeMessage: data.welcome_message || '',
    agentPrompt: data.agent_prompt || '',
    hangupUsingPrompt: data.hangup_using_prompt || false,
    hangupPrompt: data.hangup_prompt || '',
    promptVariables: data.prompt_variables || {},
    llmProvider: data.llm_provider || 'openai',
    llmModel: data.llm_model || 'gpt-4-turbo',
    temperature: data.temperature ?? 0.7,
    maxTokens: data.max_tokens || 1024,
    audioLanguage: data.audio_language || 'hi-IN',
    sttProvider: data.stt_provider || 'elevenlabs',
    sttModel: data.stt_model || 'scribe_v2_realtime',
    sttKeywords: data.stt_keywords || [],
    ttsProvider: data.tts_provider || 'elevenlabs',
    ttsModel: data.tts_model || 'eleven_turbo_v2_5',
    ttsVoice: data.tts_voice || 'mnm',
    ttsBufferSize: data.tts_buffer_size || 200,
    ttsSpeedRate: data.tts_speed_rate ?? 1,
    ttsSimilarityBoost: data.tts_similarity_boost ?? 0.75,
    ttsStability: data.tts_stability ?? 0.35,
    ttsStyleExaggeration: data.tts_style_exaggeration ?? 0,
    engineType: data.engine_type || 'default',
    engineInterruptSensitivity: data.engine_interrupt_sensitivity ?? 0.5,
    callMaxDuration: data.call_max_duration || 480,
    callEndCallAfterSilence: data.call_end_after_silence || 10,
    callRecording: data.call_recording ?? true,
    tools: (data.tools || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      type: t.type,
      enabled: t.enabled,
      config: t.config || {},
    })),
    inboundPhoneNumber: data.inbound_phone_number || null,
    routing: data.routing || 'India routing',
    costPerMin: data.cost_per_min || 0.100,
    costBreakdown: data.cost_breakdown || {
      transcriber: 0.015, llm: 0.045, voice: 0.025, telephony: 0.010, platform: 0.005,
    },
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

function mapFrontendToBackend(agent: Partial<Agent>): Record<string, any> {
  const map: Record<string, any> = {};
  if (agent.name !== undefined) map.name = agent.name;
  if (agent.welcomeMessage !== undefined) map.welcome_message = agent.welcomeMessage;
  if (agent.agentPrompt !== undefined) map.agent_prompt = agent.agentPrompt;
  if (agent.hangupUsingPrompt !== undefined) map.hangup_using_prompt = agent.hangupUsingPrompt;
  if (agent.hangupPrompt !== undefined) map.hangup_prompt = agent.hangupPrompt;
  if (agent.promptVariables !== undefined) map.prompt_variables = agent.promptVariables;
  if (agent.llmProvider !== undefined) map.llm_provider = agent.llmProvider;
  if (agent.llmModel !== undefined) map.llm_model = agent.llmModel;
  if (agent.temperature !== undefined) map.temperature = agent.temperature;
  if (agent.maxTokens !== undefined) map.max_tokens = agent.maxTokens;
  if (agent.audioLanguage !== undefined) map.audio_language = agent.audioLanguage;
  if (agent.sttProvider !== undefined) map.stt_provider = agent.sttProvider;
  if (agent.sttModel !== undefined) map.stt_model = agent.sttModel;
  if (agent.sttKeywords !== undefined) map.stt_keywords = agent.sttKeywords;
  if (agent.ttsProvider !== undefined) map.tts_provider = agent.ttsProvider;
  if (agent.ttsModel !== undefined) map.tts_model = agent.ttsModel;
  if (agent.ttsVoice !== undefined) map.tts_voice = agent.ttsVoice;
  if (agent.ttsBufferSize !== undefined) map.tts_buffer_size = agent.ttsBufferSize;
  if (agent.ttsSpeedRate !== undefined) map.tts_speed_rate = agent.ttsSpeedRate;
  if (agent.ttsSimilarityBoost !== undefined) map.tts_similarity_boost = agent.ttsSimilarityBoost;
  if (agent.ttsStability !== undefined) map.tts_stability = agent.ttsStability;
  if (agent.ttsStyleExaggeration !== undefined) map.tts_style_exaggeration = agent.ttsStyleExaggeration;
  if (agent.engineType !== undefined) map.engine_type = agent.engineType;
  if (agent.engineInterruptSensitivity !== undefined) map.engine_interrupt_sensitivity = agent.engineInterruptSensitivity;
  if (agent.callMaxDuration !== undefined) map.call_max_duration = agent.callMaxDuration;
  if (agent.callEndCallAfterSilence !== undefined) map.call_end_after_silence = agent.callEndCallAfterSilence;
  if (agent.callRecording !== undefined) map.call_recording = agent.callRecording;
  if (agent.tools !== undefined) map.tools = agent.tools;
  if (agent.inboundPhoneNumber !== undefined) map.inbound_phone_number = agent.inboundPhoneNumber;
  if (agent.routing !== undefined) map.routing = agent.routing;
  if (agent.costPerMin !== undefined) map.cost_per_min = agent.costPerMin;
  if (agent.costBreakdown !== undefined) map.cost_breakdown = agent.costBreakdown;
  return map;
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function AgentSetupPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('agent');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewAgentModalOpen, setIsNewAgentModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Fetch agents from API on mount
  const fetchAgents = useCallback(async () => {
    try {
      const response = await agentsAPI.list();
      const mapped = (response.data.agents || []).map(mapBackendToFrontend);
      setAgents(mapped);
      if (mapped.length > 0 && !selectedAgentId) {
        setSelectedAgentId(mapped[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];
  const filteredAgents = agents.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Update agent locally (optimistic UI)
  const updateAgent = (updates: Partial<Agent>) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === selectedAgentId
          ? { ...a, ...updates, updatedAt: new Date().toISOString() }
          : a
      )
    );
  };

  // Save agent to backend
  const handleSaveAgent = async () => {
    if (!selectedAgent) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const backendData = mapFrontendToBackend(selectedAgent);
      await agentsAPI.update(parseInt(selectedAgent.id), backendData);
      setSaveMessage('Agent saved successfully!');
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => setSaveMessage(null), 3000);
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Failed to save agent';
      setSaveMessage(`Error: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  // Create new agent via API
  const handleCreateAgent = async (name: string) => {
    try {
      const response = await agentsAPI.create({ name });
      const newAgent = mapBackendToFrontend(response.data);
      setAgents((prev) => [...prev, newAgent]);
      setSelectedAgentId(newAgent.id);
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Failed to create agent';
      alert(msg);
    }
  };

  // Delete agent via API
  const handleDeleteAgent = async () => {
    if (agents.length <= 1 || !selectedAgent) return;
    if (!confirm(`Delete agent "${selectedAgent.name}"? This cannot be undone.`)) return;
    try {
      await agentsAPI.delete(parseInt(selectedAgent.id));
      const remaining = agents.filter((a) => a.id !== selectedAgentId);
      setAgents(remaining);
      if (remaining.length > 0) setSelectedAgentId(remaining[0].id);
    } catch (error: any) {
      alert(error?.response?.data?.detail || 'Failed to delete agent');
    }
  };

  // AI Edit prompt
  const handleAIEdit = async () => {
    if (!selectedAgent?.agentPrompt) return;
    setSaving(true);
    try {
      const response = await agentsAPI.aiEdit({
        prompt: selectedAgent.agentPrompt,
        agent_name: selectedAgent.name,
        language: selectedAgent.audioLanguage === 'hi-IN' ? 'hi' : 'en',
      });
      const { improved_prompt, changes_summary } = response.data;
      updateAgent({ agentPrompt: improved_prompt });
      alert(`AI improved the prompt!\n\nChanges:\n${changes_summary}`);
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'AI Edit failed';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          <p className="text-gray-500 dark:text-gray-400">Loading agents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Agent Setup</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Fine tune your agents</p>
      </div>

      {/* Cost Indicator Bar */}
      <CostIndicatorBar agent={selectedAgent} />

      {/* Three-Column Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Agent List */}
        <AgentListPanel
          agents={filteredAgents}
          selectedAgentId={selectedAgentId}
          onSelect={(id) => {
            setSelectedAgentId(id);
            setActiveTab('agent');
          }}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onNewAgent={() => setIsNewAgentModalOpen(true)}
        />

        {/* Center: Tabbed Config */}
        <AgentConfigPanel
          agent={selectedAgent}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onUpdate={updateAgent}
          onAIEdit={handleAIEdit}
          aiEditLoading={saving}
        />

        {/* Right: Actions */}
        <AgentActionsPanel
          agent={selectedAgent}
          onSave={handleSaveAgent}
          onDelete={handleDeleteAgent}
          saving={saving}
          saveMessage={saveMessage}
          onAIEdit={handleAIEdit}
        />
      </div>

      {/* New Agent Modal */}
      <NewAgentModal
        isOpen={isNewAgentModalOpen}
        onClose={() => setIsNewAgentModalOpen(false)}
        onCreate={handleCreateAgent}
      />
    </div>
  );
}

// ============================================================================
// Cost Indicator Bar
// ============================================================================

function CostIndicatorBar({ agent }: { agent: Agent }) {
  const { costBreakdown } = agent;
  const total =
    costBreakdown.transcriber +
    costBreakdown.llm +
    costBreakdown.voice +
    costBreakdown.telephony +
    costBreakdown.platform;

  const segments = [
    { label: 'Transcriber', color: 'bg-cyan-500', value: costBreakdown.transcriber },
    { label: 'LLM', color: 'bg-red-500', value: costBreakdown.llm },
    { label: 'Voice', color: 'bg-emerald-600', value: costBreakdown.voice },
    { label: 'Telephony', color: 'bg-orange-500', value: costBreakdown.telephony },
    { label: 'Platform', color: 'bg-blue-600', value: costBreakdown.platform },
  ];

  return (
    <Card>
      <CardContent className="py-3 px-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Left: Cost */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <Info className="w-3.5 h-3.5" />
              <span>
                Cost per min: ~{' '}
                <span className="font-semibold text-gray-900 dark:text-white">
                  ${agent.costPerMin.toFixed(3)}
                </span>
              </span>
            </div>
            <Badge>{agent.routing}</Badge>
          </div>

          {/* Right: Provider Breakdown */}
          <div className="flex items-center gap-4">
            <div className="flex h-3 w-48 rounded-full overflow-hidden">
              {segments.map((seg) => (
                <div
                  key={seg.label}
                  className={seg.color}
                  style={{ width: `${total > 0 ? (seg.value / total) * 100 : 20}%` }}
                />
              ))}
            </div>
            <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              {segments.map((seg) => (
                <span key={seg.label} className="flex items-center gap-1">
                  <span className={cn('w-2 h-2 rounded-full', seg.color)} />
                  {seg.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Agent List Panel (Left)
// ============================================================================

function AgentListPanel({
  agents,
  selectedAgentId,
  onSelect,
  searchQuery,
  onSearchChange,
  onNewAgent,
}: {
  agents: Agent[];
  selectedAgentId: string;
  onSelect: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onNewAgent: () => void;
}) {
  return (
    <div className="w-full lg:w-72 shrink-0">
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Your Agents</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Upload className="w-3.5 h-3.5" />
              Import
            </Button>
            <Button size="sm" onClick={onNewAgent}>
              <Plus className="w-3.5 h-3.5" />
              New Agent
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 space-y-3">
          <Input
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
          <nav className="space-y-1">
            {agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => onSelect(agent.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-left',
                  selectedAgentId === agent.id
                    ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                )}
              >
                <Bot className="w-5 h-5" />
                {agent.name}
              </button>
            ))}
            {agents.length === 0 && (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                No agents found
              </p>
            )}
          </nav>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Agent Config Panel (Center) — Tab Bar + Content
// ============================================================================

const CONFIG_TABS = [
  { id: 'agent', label: 'Agent', icon: Bot },
  { id: 'llm', label: 'LLM', icon: Brain },
  { id: 'audio', label: 'Audio', icon: Volume2 },
  { id: 'engine', label: 'Engine', icon: Cpu },
  { id: 'call', label: 'Call', icon: Phone },
  { id: 'tools', label: 'Tools', icon: Wrench },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'inbound', label: 'Inbound', icon: PhoneIncoming },
];

function AgentConfigPanel({
  agent,
  activeTab,
  onTabChange,
  onUpdate,
  onAIEdit,
  aiEditLoading,
}: {
  agent: Agent;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onUpdate: (updates: Partial<Agent>) => void;
  onAIEdit?: () => void;
  aiEditLoading?: boolean;
}) {
  return (
    <div className="flex-1 min-w-0">
      {/* Agent Name Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{agent.name}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Copy className="w-3.5 h-3.5" />
            Agent ID
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="w-3.5 h-3.5" />
            Share
          </Button>
        </div>
      </div>

      {/* Horizontal Tab Bar */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto">
        <nav className="flex gap-0 -mb-px whitespace-nowrap">
          {CONFIG_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'agent' && <AgentTabContent agent={agent} onUpdate={onUpdate} onAIEdit={onAIEdit} aiEditLoading={aiEditLoading} />}
      {activeTab === 'llm' && <LLMTabContent agent={agent} onUpdate={onUpdate} />}
      {activeTab === 'audio' && <AudioTabContent agent={agent} onUpdate={onUpdate} />}
      {activeTab === 'engine' && <EngineTabContent agent={agent} onUpdate={onUpdate} />}
      {activeTab === 'call' && <CallTabContent agent={agent} onUpdate={onUpdate} />}
      {activeTab === 'tools' && <ToolsTabContent agent={agent} onUpdate={onUpdate} />}
      {activeTab === 'analytics' && <AnalyticsTabContent />}
      {activeTab === 'inbound' && <InboundTabContent agent={agent} onUpdate={onUpdate} />}
    </div>
  );
}

// ============================================================================
// Agent Tab Content (FULLY FUNCTIONAL)
// ============================================================================

function AgentTabContent({
  agent,
  onUpdate,
  onAIEdit,
  aiEditLoading,
}: {
  agent: Agent;
  onUpdate: (updates: Partial<Agent>) => void;
  onAIEdit?: () => void;
  aiEditLoading?: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Agent Welcome Message */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Agent Welcome Message</CardTitle>
            <button
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              title="The first message spoken when a call connects"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <textarea
            className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors px-4 py-2.5 text-sm min-h-[80px] resize-y"
            value={agent.welcomeMessage}
            onChange={(e) => onUpdate({ welcomeMessage: e.target.value })}
            placeholder="Enter welcome message..."
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            You can define variables using {'{variable_name}'}
          </p>
        </CardContent>
      </Card>

      {/* Agent Prompt */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Agent Prompt</CardTitle>
            <button
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              title="The system prompt that defines the agent's behavior"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={onAIEdit} loading={aiEditLoading}>
            <Sparkles className="w-3.5 h-3.5" />
            AI Edit
          </Button>
        </CardHeader>
        <CardContent>
          <textarea
            className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors px-4 py-2.5 text-sm min-h-[300px] resize-y"
            value={agent.agentPrompt}
            onChange={(e) => onUpdate({ agentPrompt: e.target.value })}
            placeholder="Enter the agent's system prompt..."
          />
        </CardContent>
      </Card>

      {/* Prompt Variables Testing */}
      <Card>
        <CardContent className="space-y-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            You can fill in your following prompt variables for testing
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Timezone"
              value={agent.promptVariables.timezone || 'Asia/Kolkata'}
              onChange={(e) =>
                onUpdate({
                  promptVariables: { ...agent.promptVariables, timezone: e.target.value },
                })
              }
              options={[
                { value: 'Asia/Kolkata', label: 'Asia/Kolkata UTC+05:30' },
                { value: 'America/New_York', label: 'America/New_York UTC-05:00' },
                { value: 'Europe/London', label: 'Europe/London UTC+00:00' },
                { value: 'Asia/Dubai', label: 'Asia/Dubai UTC+04:00' },
                { value: 'Asia/Singapore', label: 'Asia/Singapore UTC+08:00' },
              ]}
            />
            <Input
              label="name"
              value={agent.promptVariables.name || ''}
              onChange={(e) =>
                onUpdate({
                  promptVariables: { ...agent.promptVariables, name: e.target.value },
                })
              }
              placeholder="Enter name variable"
            />
          </div>
        </CardContent>
      </Card>

      {/* Hangup Using a Prompt */}
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Hangup using a prompt
              </span>
              <button
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                title="Configure when the agent should end the call"
              >
                <Info className="w-4 h-4" />
              </button>
              <a href="#" className="text-xs text-orange-500 hover:underline ml-1">
                View Docs
              </a>
            </div>
            <button
              onClick={() => onUpdate({ hangupUsingPrompt: !agent.hangupUsingPrompt })}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                agent.hangupUsingPrompt ? 'bg-orange-600' : 'bg-gray-300 dark:bg-gray-600'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  agent.hangupUsingPrompt ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>

          {agent.hangupUsingPrompt && (
            <textarea
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors px-4 py-2.5 text-sm min-h-[100px] resize-y"
              value={agent.hangupPrompt}
              onChange={(e) => onUpdate({ hangupPrompt: e.target.value })}
              placeholder="Enter hangup prompt..."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// LLM Tab Content
// ============================================================================

function LLMTabContent({
  agent,
  onUpdate,
}: {
  agent: Agent;
  onUpdate: (updates: Partial<Agent>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>LLM Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Select
          label="Provider"
          value={agent.llmProvider}
          onChange={(e) => onUpdate({ llmProvider: e.target.value })}
          options={[
            { value: 'openai', label: 'OpenAI' },
            { value: 'anthropic', label: 'Anthropic' },
            { value: 'google', label: 'Google Gemini' },
            { value: 'groq', label: 'Groq' },
            { value: 'deepseek', label: 'DeepSeek' },
          ]}
        />
        <Select
          label="Model"
          value={agent.llmModel}
          onChange={(e) => onUpdate({ llmModel: e.target.value })}
          options={[
            { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
            { value: 'gpt-4o', label: 'GPT-4o' },
            { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
            { value: 'claude-3-opus', label: 'Claude 3 Opus' },
            { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
            { value: 'gemini-pro', label: 'Gemini Pro' },
          ]}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Temperature: {agent.temperature}
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={agent.temperature}
            onChange={(e) => onUpdate({ temperature: parseFloat(e.target.value) })}
            className="w-full accent-orange-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0 (Precise)</span>
            <span>1 (Balanced)</span>
            <span>2 (Creative)</span>
          </div>
        </div>
        <Input
          label="Max Tokens"
          type="number"
          value={agent.maxTokens}
          onChange={(e) => onUpdate({ maxTokens: parseInt(e.target.value) || 1024 })}
        />
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Audio Tab Content
// ============================================================================

function AudioTabContent({
  agent,
  onUpdate,
}: {
  agent: Agent;
  onUpdate: (updates: Partial<Agent>) => void;
}) {
  const [keywordInput, setKeywordInput] = useState('');

  const addKeyword = () => {
    const trimmed = keywordInput.trim();
    if (trimmed && !agent.sttKeywords.includes(trimmed)) {
      onUpdate({ sttKeywords: [...agent.sttKeywords, trimmed] });
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    onUpdate({ sttKeywords: agent.sttKeywords.filter((k) => k !== keyword) });
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  };

  return (
    <div className="space-y-6">
      {/* Configure Language */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="w-5 h-5 text-primary-500" />
            Configure Language
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            label="Language"
            value={agent.audioLanguage}
            onChange={(e) => onUpdate({ audioLanguage: e.target.value })}
            options={[
              { value: 'hi-IN', label: 'Hindi' },
              { value: 'en-IN', label: 'English (India)' },
              { value: 'en-US', label: 'English (US)' },
              { value: 'en-GB', label: 'English (UK)' },
              { value: 'ta-IN', label: 'Tamil' },
              { value: 'te-IN', label: 'Telugu' },
              { value: 'bn-IN', label: 'Bengali' },
              { value: 'mr-IN', label: 'Marathi' },
              { value: 'gu-IN', label: 'Gujarati' },
              { value: 'multi', label: 'Multilingual' },
            ]}
          />
        </CardContent>
      </Card>

      {/* Speech-to-Text */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-blue-500" />
            Speech-to-Text
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Select
            label="Provider"
            value={agent.sttProvider}
            onChange={(e) => onUpdate({ sttProvider: e.target.value })}
            options={[
              { value: 'elevenlabs', label: 'Elevenlabs' },
              { value: 'deepgram', label: 'Deepgram' },
              { value: 'whisper', label: 'OpenAI Whisper' },
              { value: 'google', label: 'Google Speech-to-Text' },
              { value: 'azure', label: 'Azure Speech-to-Text' },
            ]}
          />
          <Select
            label="Model"
            value={agent.sttModel}
            onChange={(e) => onUpdate({ sttModel: e.target.value })}
            options={
              agent.sttProvider === 'elevenlabs'
                ? [
                    { value: 'scribe_v2_realtime', label: 'Scribe V2 Realtime' },
                    { value: 'scribe_v2', label: 'Scribe V2' },
                    { value: 'scribe_v1', label: 'Scribe V1' },
                  ]
                : agent.sttProvider === 'deepgram'
                ? [
                    { value: 'nova-2', label: 'Nova-2' },
                    { value: 'nova', label: 'Nova' },
                    { value: 'enhanced', label: 'Enhanced' },
                    { value: 'base', label: 'Base' },
                  ]
                : agent.sttProvider === 'whisper'
                ? [
                    { value: 'whisper-1', label: 'Whisper-1' },
                    { value: 'whisper-large-v3', label: 'Whisper Large V3' },
                  ]
                : [
                    { value: 'default', label: 'Default' },
                  ]
            }
          />

          {/* Keywords */}
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Keywords
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Boost recognition accuracy for specific words. Format: word:boost (e.g., Bruce:100)
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleKeywordKeyDown}
                placeholder="e.g. Bruce:100"
                className="block flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors px-4 py-2.5 text-sm"
              />
              <Button variant="outline" size="sm" onClick={addKeyword} className="shrink-0">
                <Plus className="w-4 h-4" />
                Add
              </Button>
            </div>
            {agent.sttKeywords.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {agent.sttKeywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
                  >
                    {keyword}
                    <button
                      onClick={() => removeKeyword(keyword)}
                      className="p-0.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Text-to-Speech */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-green-500" />
            Text-to-Speech
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <Select
            label="Provider"
            value={agent.ttsProvider}
            onChange={(e) => onUpdate({ ttsProvider: e.target.value })}
            options={[
              { value: 'elevenlabs', label: 'Elevenlabs' },
              { value: 'polly', label: 'AWS Polly' },
              { value: 'azure_tts', label: 'Azure TTS' },
              { value: 'google_tts', label: 'Google TTS' },
              { value: 'openai_tts', label: 'OpenAI TTS' },
            ]}
          />
          <Select
            label="Model"
            value={agent.ttsModel}
            onChange={(e) => onUpdate({ ttsModel: e.target.value })}
            options={
              agent.ttsProvider === 'elevenlabs'
                ? [
                    { value: 'eleven_turbo_v2_5', label: 'Eleven Turbo v2.5' },
                    { value: 'eleven_v3', label: 'Eleven v3' },
                    { value: 'eleven_turbo_v2', label: 'eleven_turbo_v2' },
                    { value: 'eleven_multilingual_v2', label: 'eleven_multilingual_v2' },
                    { value: 'eleven_monolingual_v1', label: 'eleven_monolingual_v1' },
                  ]
                : agent.ttsProvider === 'openai_tts'
                ? [
                    { value: 'tts-1', label: 'TTS-1' },
                    { value: 'tts-1-hd', label: 'TTS-1-HD' },
                  ]
                : [
                    { value: 'default', label: 'Default' },
                  ]
            }
          />

          {/* Voice + Add voices */}
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Voice
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Select
                  value={agent.ttsVoice}
                  onChange={(e) => onUpdate({ ttsVoice: e.target.value })}
                  options={[
                    { value: 'mnm', label: 'mnm' },
                    { value: 'rachel', label: 'Rachel' },
                    { value: 'josh', label: 'Josh' },
                    { value: 'bella', label: 'Bella' },
                    { value: 'elli', label: 'Elli' },
                    { value: 'adam', label: 'Adam' },
                    { value: 'domi', label: 'Domi' },
                    { value: 'sam', label: 'Sam' },
                    { value: 'antoni', label: 'Antoni' },
                    { value: 'arnold', label: 'Arnold' },
                  ]}
                />
              </div>
              <Button variant="outline" size="sm" className="shrink-0 whitespace-nowrap">
                <Plus className="w-4 h-4" />
                Add voices
              </Button>
            </div>
          </div>

          {/* Buffer Size */}
          <Input
            label="Buffer Size"
            type="number"
            value={agent.ttsBufferSize}
            onChange={(e) => onUpdate({ ttsBufferSize: parseInt(e.target.value) || 100 })}
          />

          {/* Speed Rate */}
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Speed rate
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={agent.ttsSpeedRate}
                onChange={(e) => onUpdate({ ttsSpeedRate: parseFloat(e.target.value) })}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12 text-right">
                {agent.ttsSpeedRate.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0.5x</span>
              <span>2.0x</span>
            </div>
          </div>

          {/* Similarity Boost */}
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Similarity Boost
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={agent.ttsSimilarityBoost}
                onChange={(e) => onUpdate({ ttsSimilarityBoost: parseFloat(e.target.value) })}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12 text-right">
                {agent.ttsSimilarityBoost.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>

          {/* Stability */}
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Stability
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={agent.ttsStability}
                onChange={(e) => onUpdate({ ttsStability: parseFloat(e.target.value) })}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12 text-right">
                {agent.ttsStability.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>More variable</span>
              <span>More stable</span>
            </div>
          </div>

          {/* Style Exaggeration */}
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Style Exaggeration
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={agent.ttsStyleExaggeration}
                onChange={(e) => onUpdate({ ttsStyleExaggeration: parseFloat(e.target.value) })}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12 text-right">
                {agent.ttsStyleExaggeration.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>None</span>
              <span>Exaggerated</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Engine Tab Content
// ============================================================================

function EngineTabContent({
  agent,
  onUpdate,
}: {
  agent: Agent;
  onUpdate: (updates: Partial<Agent>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Engine Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Select
          label="Engine Type"
          value={agent.engineType}
          onChange={(e) => onUpdate({ engineType: e.target.value })}
          options={[
            { value: 'default', label: 'Default' },
            { value: 'low_latency', label: 'Low Latency' },
            { value: 'high_quality', label: 'High Quality' },
          ]}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Interrupt Sensitivity: {agent.engineInterruptSensitivity.toFixed(1)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={agent.engineInterruptSensitivity}
            onChange={(e) =>
              onUpdate({ engineInterruptSensitivity: parseFloat(e.target.value) })
            }
            className="w-full accent-orange-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Low</span>
            <span>Medium</span>
            <span>High</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Call Tab Content
// ============================================================================

function CallTabContent({
  agent,
  onUpdate,
}: {
  agent: Agent;
  onUpdate: (updates: Partial<Agent>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Call Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Input
          label="Max Call Duration (seconds)"
          type="number"
          value={agent.callMaxDuration}
          onChange={(e) => onUpdate({ callMaxDuration: parseInt(e.target.value) || 480 })}
        />
        <Input
          label="End Call After Silence (seconds)"
          type="number"
          value={agent.callEndCallAfterSilence}
          onChange={(e) =>
            onUpdate({ callEndCallAfterSilence: parseInt(e.target.value) || 10 })
          }
        />
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Enable Call Recording
          </span>
          <button
            onClick={() => onUpdate({ callRecording: !agent.callRecording })}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              agent.callRecording ? 'bg-orange-600' : 'bg-gray-300 dark:bg-gray-600'
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                agent.callRecording ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Tools Tab Content
// ============================================================================

function ToolsTabContent({
  agent,
  onUpdate,
}: {
  agent: Agent;
  onUpdate: (updates: Partial<Agent>) => void;
}) {
  const toggleTool = (toolId: string) => {
    const updatedTools = agent.tools.map((t) =>
      t.id === toolId ? { ...t, enabled: !t.enabled } : t
    );
    onUpdate({ tools: updatedTools });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Agent Tools</CardTitle>
        <Button variant="outline" size="sm">
          <Plus className="w-3.5 h-3.5" />
          Add Tool
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {agent.tools.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
            No tools configured. Add tools to extend your agent&apos;s capabilities.
          </p>
        )}
        {agent.tools.map((tool) => (
          <div
            key={tool.id}
            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <Wrench className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  {tool.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{tool.type}</p>
              </div>
            </div>
            <button
              onClick={() => toggleTool(tool.id)}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                tool.enabled ? 'bg-orange-600' : 'bg-gray-300 dark:bg-gray-600'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  tool.enabled ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Analytics Tab Content
// ============================================================================

function AnalyticsTabContent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <BarChart3 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
            No analytics data yet
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Analytics will appear here once the agent starts making calls. Start a campaign or
            test the agent to begin collecting data.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Inbound Tab Content
// ============================================================================

function InboundTabContent({
  agent,
  onUpdate,
}: {
  agent: Agent;
  onUpdate: (updates: Partial<Agent>) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Inbound Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Inbound Phone Number
          </label>
          {agent.inboundPhoneNumber ? (
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg">
              <Phone className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                {agent.inboundPhoneNumber}
              </span>
              <Badge variant="success">Active</Badge>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
              <Phone className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                No phone number assigned
              </span>
            </div>
          )}
        </div>
        <Select
          label="Routing"
          value={agent.routing}
          onChange={(e) => onUpdate({ routing: e.target.value })}
          options={[
            { value: 'India routing', label: 'India Routing' },
            { value: 'US routing', label: 'US Routing' },
            { value: 'Global routing', label: 'Global Routing' },
          ]}
        />
        <div className="pt-2">
          <a
            href="#"
            className="text-sm text-orange-500 hover:underline flex items-center gap-1"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Purchase phone numbers
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Agent Actions Panel (Right)
// ============================================================================

function AgentActionsPanel({
  agent,
  onSave,
  onDelete,
  saving,
  saveMessage,
  onAIEdit,
}: {
  agent: Agent;
  onSave: () => void;
  onDelete: () => void;
  saving?: boolean;
  saveMessage?: string | null;
  onAIEdit?: () => void;
}) {
  const timeAgo = getRelativeTime(agent.updatedAt);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setChatLoading(true);
    try {
      const res = await agentsAPI.chat({
        message: userMsg,
        agent_id: parseInt(agent.id),
        conversation_history: chatMessages,
      });
      setChatMessages((prev) => [...prev, { role: 'assistant', content: res.data.response }]);
    } catch (error: any) {
      const msg = error?.response?.data?.detail || 'Chat failed';
      setChatMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${msg}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="w-full lg:w-72 shrink-0 space-y-4">
      {/* Primary Actions */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white" size="lg">
            <Phone className="w-4 h-4" />
            Get call from agent
          </Button>
          <Button className="w-full" variant="outline">
            <PhoneIncoming className="w-4 h-4" />
            Set inbound agent
          </Button>
          <a
            href="#"
            className="block text-center text-xs text-orange-500 hover:underline"
          >
            Purchase phone numbers
          </a>
        </CardContent>
      </Card>

      {/* Save & Call Logs */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Button className="w-full" variant="outline">
            <ExternalLink className="w-4 h-4" />
            See all call logs
          </Button>
          <div className="flex gap-2">
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              size="lg"
              onClick={onSave}
              loading={saving}
            >
              <Save className="w-4 h-4" />
              Save agent
            </Button>
            <Button variant="outline" size="lg" onClick={onDelete} title="Delete agent">
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          </div>
          {saveMessage && (
            <p className={cn(
              "text-xs text-center font-medium",
              saveMessage.startsWith('Error') ? 'text-red-500' : 'text-green-500'
            )}>
              {saveMessage}
            </p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Updated {timeAgo}
          </p>
        </CardContent>
      </Card>

      {/* Chat with Agent */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Button
            className="w-full"
            variant="outline"
            onClick={() => {
              setChatOpen(!chatOpen);
              if (!chatOpen) setChatMessages([]);
            }}
          >
            <MessageSquare className="w-4 h-4" />
            {chatOpen ? 'Close chat' : 'Chat with agent'}
          </Button>

          {chatOpen && (
            <div className="space-y-2">
              <div className="h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2 space-y-2 bg-gray-50 dark:bg-gray-900">
                {chatMessages.length === 0 && (
                  <p className="text-xs text-gray-400 text-center mt-4">
                    Start chatting to test {agent.name}
                  </p>
                )}
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={cn(
                      "text-xs p-2 rounded-lg max-w-[90%]",
                      msg.role === 'user'
                        ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200 ml-auto'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    )}
                  >
                    {msg.content}
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Loader2 className="w-3 h-3 animate-spin" /> Thinking...
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                  placeholder="Type a message..."
                  className="flex-1 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-2 py-1.5 focus:ring-1 focus:ring-primary-500"
                />
                <Button size="sm" onClick={handleChat} disabled={chatLoading || !chatInput.trim()}>
                  <Send className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Chat is the fastest way to test and refine
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// New Agent Modal
// ============================================================================

function NewAgentModal({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState('');

  const handleCreate = () => {
    if (!name.trim()) return;
    onCreate(name.trim());
    setName('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Agent" size="sm">
      <div className="space-y-4">
        <Input
          label="Agent Name"
          placeholder="e.g., sales_agent_v1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
        <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim()}>
            <Plus className="w-4 h-4" />
            Create Agent
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ============================================================================
// Utility: Relative Time
// ============================================================================

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 30) return `${diffDays} days ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}
