'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  MessageSquare,
  AlertCircle,
  Check,
  Loader2,
  BookOpen,
  HelpCircle,
  Shield,
  Settings,
  Bot,
  Globe,
  ChevronDown,
  ChevronUp,
  Database,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { knowledgeBaseAPI } from '@/lib/api';

// ============================================================================
// Types
// ============================================================================

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface CustomData {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at?: string;
}

interface Objection {
  id?: string;
  objection: string;
  response_en: string;
  response_hi: string;
}

interface KBConfig {
  company_name: string;
  agent_name: string;
  agent_identity: string;
  system_prompt: string;
  welcome_message: string;
  call_objective: string;
  next_step: string;
  llm_model: string;
  temperature: number;
  max_tokens: number;
  faqs: FAQ[];
  custom_data: CustomData[];
  objection_handling: Objection[];
  updated_at: string;
}

// ============================================================================
// Collapsible Section
// ============================================================================

function Section({
  title,
  icon: Icon,
  children,
  count,
  defaultOpen = true,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
  count?: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          {count !== undefined && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
              {count}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>
      {open && <CardContent>{children}</CardContent>}
    </Card>
  );
}

// ============================================================================
// Main Knowledge Base Page
// ============================================================================

export default function KnowledgeBasePage() {
  const [config, setConfig] = useState<KBConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states for agent config
  const [companyName, setCompanyName] = useState('');
  const [agentName, setAgentName] = useState('');
  const [agentIdentity, setAgentIdentity] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [callObjective, setCallObjective] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [llmModel, setLlmModel] = useState('gpt-4-turbo');
  const [temperature, setTemperature] = useState(0.7);

  // FAQ form
  const [newFaqQuestion, setNewFaqQuestion] = useState('');
  const [newFaqAnswer, setNewFaqAnswer] = useState('');
  const [newFaqCategory, setNewFaqCategory] = useState('General');
  const [addingFaq, setAddingFaq] = useState(false);

  // Custom data form
  const [newDataTitle, setNewDataTitle] = useState('');
  const [newDataContent, setNewDataContent] = useState('');
  const [newDataCategory, setNewDataCategory] = useState('General');
  const [addingData, setAddingData] = useState(false);

  // Objection form
  const [newObjection, setNewObjection] = useState('');
  const [newObjResponseEn, setNewObjResponseEn] = useState('');
  const [newObjResponseHi, setNewObjResponseHi] = useState('');
  const [addingObj, setAddingObj] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await knowledgeBaseAPI.getConfig();
      const kb = res.data;
      setConfig(kb);
      setCompanyName(kb.company_name || '');
      setAgentName(kb.agent_name || '');
      setAgentIdentity(kb.agent_identity || '');
      setSystemPrompt(kb.system_prompt || '');
      setWelcomeMessage(kb.welcome_message || '');
      setCallObjective(kb.call_objective || '');
      setNextStep(kb.next_step || '');
      setLlmModel(kb.llm_model || 'gpt-4-turbo');
      setTemperature(kb.temperature || 0.7);
    } catch (err: any) {
      setError('Failed to load knowledge base');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Save config
  const saveConfig = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await knowledgeBaseAPI.updateConfig({
        company_name: companyName,
        agent_name: agentName,
        agent_identity: agentIdentity,
        system_prompt: systemPrompt,
        welcome_message: welcomeMessage,
        call_objective: callObjective,
        next_step: nextStep,
        llm_model: llmModel,
        temperature,
      });
      setSuccess('Knowledge base saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
      fetchConfig();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // FAQ handlers
  const addFaq = async () => {
    if (!newFaqQuestion.trim() || !newFaqAnswer.trim()) return;
    setAddingFaq(true);
    try {
      await knowledgeBaseAPI.addFaq({
        question: newFaqQuestion,
        answer: newFaqAnswer,
        category: newFaqCategory,
      });
      setNewFaqQuestion('');
      setNewFaqAnswer('');
      setNewFaqCategory('General');
      fetchConfig();
    } catch (err: any) {
      setError('Failed to add FAQ');
    } finally {
      setAddingFaq(false);
    }
  };

  const deleteFaq = async (faqId: string) => {
    try {
      await knowledgeBaseAPI.deleteFaq(faqId);
      fetchConfig();
    } catch (e) {
      setError('Failed to delete FAQ');
    }
  };

  // Custom data handlers
  const addCustomData = async () => {
    if (!newDataTitle.trim() || !newDataContent.trim()) return;
    setAddingData(true);
    try {
      await knowledgeBaseAPI.addCustomData({
        title: newDataTitle,
        content: newDataContent,
        category: newDataCategory,
      });
      setNewDataTitle('');
      setNewDataContent('');
      setNewDataCategory('General');
      fetchConfig();
    } catch (e) {
      setError('Failed to add data');
    } finally {
      setAddingData(false);
    }
  };

  const deleteCustomData = async (entryId: string) => {
    try {
      await knowledgeBaseAPI.deleteCustomData(entryId);
      fetchConfig();
    } catch (e) {
      setError('Failed to delete');
    }
  };

  // Objection handlers
  const addObjection = async () => {
    if (!newObjection.trim() || !newObjResponseEn.trim()) return;
    setAddingObj(true);
    try {
      await knowledgeBaseAPI.addObjection({
        objection: newObjection,
        response_en: newObjResponseEn,
        response_hi: newObjResponseHi,
      });
      setNewObjection('');
      setNewObjResponseEn('');
      setNewObjResponseHi('');
      fetchConfig();
    } catch (e) {
      setError('Failed to add objection');
    } finally {
      setAddingObj(false);
    }
  };

  const deleteObjection = async (objId: string) => {
    try {
      await knowledgeBaseAPI.deleteObjection(objId);
      fetchConfig();
    } catch (e) {
      setError('Failed to delete');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Knowledge Base</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage your AI Sales Agent&apos;s data, prompts, and responses
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchConfig}>
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Refresh
          </Button>
          <Button size="sm" onClick={saveConfig} loading={saving}>
            <Save className="w-4 h-4 mr-1.5" />
            Save All
          </Button>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 flex items-center gap-2">
          <Check className="w-4 h-4 text-green-500" />
          <span className="text-sm text-green-700 dark:text-green-400">{success}</span>
        </div>
      )}

      {/* Agent Identity & Config */}
      <Section title="Agent Identity & Configuration" icon={Bot} defaultOpen={true}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Company Name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="RSC Group Dholera"
          />
          <Input
            label="Agent Name"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder="Chitti"
          />
          <div className="md:col-span-2">
            <Input
              label="Agent Identity"
              value={agentIdentity}
              onChange={(e) => setAgentIdentity(e.target.value)}
              placeholder="I am Chitti from RSC Group Dholera"
            />
          </div>
          <Input
            label="LLM Model"
            value={llmModel}
            onChange={(e) => setLlmModel(e.target.value)}
            placeholder="gpt-4-turbo"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Temperature: {temperature}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
          </div>
        </div>
      </Section>

      {/* System Prompt */}
      <Section title="System Prompt" icon={Settings} defaultOpen={false}>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Master Agent Prompt (defines personality, tone, guardrails)
          </label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={12}
            className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors px-4 py-2.5 text-sm font-mono resize-y"
            placeholder="Enter the master system prompt..."
          />
          <p className="text-xs text-gray-500 mt-2">
            This prompt defines how the AI Sales Agent behaves. The agent will ONLY respond based on this prompt and the knowledge base data.
          </p>
        </div>
      </Section>

      {/* Welcome Message */}
      <Section title="Welcome Message & Call Flow" icon={MessageSquare} defaultOpen={false}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Welcome Message (Agent&apos;s opening line)
            </label>
            <textarea
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              rows={4}
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors px-4 py-2.5 text-sm resize-y"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Call Objective
            </label>
            <textarea
              value={callObjective}
              onChange={(e) => setCallObjective(e.target.value)}
              rows={2}
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors px-4 py-2.5 text-sm resize-y"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Ideal Next Step
            </label>
            <textarea
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              rows={2}
              className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors px-4 py-2.5 text-sm resize-y"
            />
          </div>
        </div>
      </Section>

      {/* FAQs */}
      <Section title="FAQs" icon={HelpCircle} count={config?.faqs?.length} defaultOpen={true}>
        <div className="space-y-4">
          {/* Existing FAQs */}
          {config?.faqs?.map((faq) => (
            <div
              key={faq.id}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                      {faq.category}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    Q: {faq.question}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">A: {faq.answer}</p>
                </div>
                <button
                  onClick={() => deleteFaq(faq.id)}
                  className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-2"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          ))}

          {/* Add FAQ Form */}
          <div className="p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Add New FAQ</h4>
            <div className="space-y-3">
              <Input
                placeholder="Question"
                value={newFaqQuestion}
                onChange={(e) => setNewFaqQuestion(e.target.value)}
              />
              <textarea
                placeholder="Answer"
                value={newFaqAnswer}
                onChange={(e) => setNewFaqAnswer(e.target.value)}
                rows={2}
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors px-4 py-2.5 text-sm resize-none"
              />
              <div className="flex items-center gap-3">
                <Input
                  placeholder="Category"
                  value={newFaqCategory}
                  onChange={(e) => setNewFaqCategory(e.target.value)}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={addFaq}
                  loading={addingFaq}
                  disabled={!newFaqQuestion.trim() || !newFaqAnswer.trim()}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Custom Knowledge Data */}
      <Section title="Custom Knowledge Data" icon={BookOpen} count={config?.custom_data?.length} defaultOpen={false}>
        <div className="space-y-4">
          {config?.custom_data?.map((d) => (
            <div
              key={d.id}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      {d.category}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{d.title}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{d.content}</p>
                </div>
                <button
                  onClick={() => deleteCustomData(d.id)}
                  className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-2"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          ))}

          {/* Add Custom Data Form */}
          <div className="p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Add Custom Data</h4>
            <div className="space-y-3">
              <Input
                placeholder="Title"
                value={newDataTitle}
                onChange={(e) => setNewDataTitle(e.target.value)}
              />
              <textarea
                placeholder="Content - Add your custom knowledge here..."
                value={newDataContent}
                onChange={(e) => setNewDataContent(e.target.value)}
                rows={4}
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors px-4 py-2.5 text-sm resize-y"
              />
              <div className="flex items-center gap-3">
                <Input
                  placeholder="Category"
                  value={newDataCategory}
                  onChange={(e) => setNewDataCategory(e.target.value)}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={addCustomData}
                  loading={addingData}
                  disabled={!newDataTitle.trim() || !newDataContent.trim()}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Objection Handling */}
      <Section title="Objection Handling" icon={Shield} count={config?.objection_handling?.length} defaultOpen={false}>
        <div className="space-y-4">
          {config?.objection_handling?.map((obj, idx) => (
            <div
              key={obj.id || idx}
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-red-500 dark:text-red-400">
                    Objection: &ldquo;{obj.objection}&rdquo;
                  </p>
                  <div className="flex items-start gap-1">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 mt-0.5">EN</span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{obj.response_en}</p>
                  </div>
                  {obj.response_hi && (
                    <div className="flex items-start gap-1">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 mt-0.5">HI</span>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{obj.response_hi}</p>
                    </div>
                  )}
                </div>
                {obj.id && (
                  <button
                    onClick={() => deleteObjection(obj.id!)}
                    className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-2"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add Objection Form */}
          <div className="p-4 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Add Objection Handling</h4>
            <div className="space-y-3">
              <Input
                placeholder="Objection (e.g. I am not interested)"
                value={newObjection}
                onChange={(e) => setNewObjection(e.target.value)}
              />
              <textarea
                placeholder="Response in English"
                value={newObjResponseEn}
                onChange={(e) => setNewObjResponseEn(e.target.value)}
                rows={2}
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors px-4 py-2.5 text-sm resize-none"
              />
              <textarea
                placeholder="Response in Hindi (optional)"
                value={newObjResponseHi}
                onChange={(e) => setNewObjResponseHi(e.target.value)}
                rows={2}
                className="block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors px-4 py-2.5 text-sm resize-none"
              />
              <Button
                size="sm"
                onClick={addObjection}
                loading={addingObj}
                disabled={!newObjection.trim() || !newObjResponseEn.trim()}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Objection
              </Button>
            </div>
          </div>
        </div>
      </Section>

      {/* Footer */}
      <div className="flex items-center justify-between py-4">
        <p className="text-xs text-gray-400">
          The AI Sales Agent will ONLY respond based on this knowledge base. No off-topic responses allowed.
        </p>
        <a
          href="/sales-agent"
          className="text-sm text-orange-400 hover:text-orange-300 transition-colors font-medium"
        >
          Test Sales Agent &rarr;
        </a>
      </div>
    </div>
  );
}
