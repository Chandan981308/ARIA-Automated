'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Hash,
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Bot,
  RefreshCw,
  Search,
  Settings,
  Copy,
  Check,
  Loader2,
  Signal,
  SignalZero,
  Wrench,
  X,
  ChevronDown,
  ExternalLink,
  Tag,
  Zap,
  BarChart3,
  Globe,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { smartfloAPI, agentsAPI } from '@/lib/api';
import type { SmartfloNumber } from '@/types';

// ============================================================================
// Helper Components
// ============================================================================

function formatPhoneNumber(did: string): string {
  // Format +919228170262 → +91 92281 70262
  if (did.startsWith('+91') && did.length === 13) {
    return `+91 ${did.slice(3, 8)} ${did.slice(8)}`;
  }
  return did;
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-500',
    inactive: 'bg-gray-400',
    maintenance: 'bg-yellow-500',
  };
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${colors[status] || 'bg-gray-400'}`} />
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'success' | 'default' | 'warning'> = {
    active: 'success',
    inactive: 'default',
    maintenance: 'warning',
  };
  return (
    <Badge variant={variants[status] || 'default'} size="sm">
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      title="Copy number"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-500" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
      )}
    </button>
  );
}

// ============================================================================
// Stat Cards at the top
// ============================================================================

function StatsRow({ numbers }: { numbers: SmartfloNumber[] }) {
  const totalNumbers = numbers.length;
  const activeNumbers = numbers.filter((n) => n.status === 'active').length;
  const assignedNumbers = numbers.filter((n) => n.assigned_agent_id).length;
  const unassignedNumbers = totalNumbers - assignedNumbers;

  const stats = [
    {
      label: 'Total Numbers',
      value: totalNumbers,
      icon: Hash,
      color: 'text-orange-500',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
    },
    {
      label: 'Active',
      value: activeNumbers,
      icon: Signal,
      color: 'text-green-500',
      bg: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: 'Agent Assigned',
      value: assignedNumbers,
      icon: Bot,
      color: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Unassigned',
      value: unassignedNumbers,
      icon: AlertCircle,
      color: 'text-orange-500',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${s.bg}`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// Number Card Component
// ============================================================================

interface NumberCardProps {
  number: SmartfloNumber;
  agents: { id: number; name: string }[];
  onAssignAgent: (numberId: string, agentId: number) => Promise<void>;
  onUnassignAgent: (numberId: string) => Promise<void>;
  onUpdateConfig: (numberId: string, data: { label?: string; status?: string }) => Promise<void>;
}

function NumberCard({ number, agents, onAssignAgent, onUnassignAgent, onUpdateConfig }: NumberCardProps) {
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [labelValue, setLabelValue] = useState(number.label || '');
  const [assigning, setAssigning] = useState(false);

  const handleAssign = async (agentId: number) => {
    setAssigning(true);
    try {
      await onAssignAgent(number.id, agentId);
    } finally {
      setAssigning(false);
      setShowAgentDropdown(false);
    }
  };

  const handleUnassign = async () => {
    setAssigning(true);
    try {
      await onUnassignAgent(number.id);
    } finally {
      setAssigning(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    await onUpdateConfig(number.id, { status: newStatus });
    setShowStatusDropdown(false);
  };

  const handleLabelSave = async () => {
    await onUpdateConfig(number.id, { label: labelValue });
    setIsEditing(false);
  };

  const smsTemplateCount = number.sms_templates
    ? number.sms_templates.split(',').filter(Boolean).length
    : 0;

  return (
    <Card className="relative overflow-visible">
      {/* Top color bar based on status */}
      <div
        className={`h-1 ${
          number.status === 'active'
            ? 'bg-green-500'
            : number.status === 'maintenance'
            ? 'bg-yellow-500'
            : 'bg-gray-400'
        }`}
      />

      <CardContent className="p-5">
        {/* Header row: phone icon + number + status + copy */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <Phone className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-gray-900 dark:text-white font-mono">
                  {formatPhoneNumber(number.did)}
                </span>
                <CopyButton text={number.did} />
              </div>
              {/* Label / alias */}
              <div className="flex items-center gap-2 mt-0.5">
                {isEditing ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={labelValue}
                      onChange={(e) => setLabelValue(e.target.value)}
                      className="text-xs border border-gray-300 dark:border-gray-600 rounded px-1.5 py-0.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-32"
                      placeholder="Add label..."
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleLabelSave();
                        if (e.key === 'Escape') setIsEditing(false);
                      }}
                    />
                    <button onClick={handleLabelSave} className="text-green-500 hover:text-green-600">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 flex items-center gap-1"
                  >
                    <Tag className="w-3 h-3" />
                    {number.label || `ID: ${number.alias}`}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Status dropdown */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowStatusDropdown(!showStatusDropdown); }}
              className="flex items-center gap-1.5"
            >
              <StatusBadge status={number.status} />
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>
            {showStatusDropdown && (
              <>
                <div className="fixed inset-0 z-40" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setShowStatusDropdown(false); }} />
                <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 py-1 z-50" onClick={(e) => e.stopPropagation()}>
                  {['active', 'inactive', 'maintenance'].map((s) => (
                    <button
                      key={s}
                      onClick={(e) => { e.stopPropagation(); handleStatusChange(s); }}
                      className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        number.status === s ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <StatusDot status={s} />
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2.5">
            <p className="text-xs text-gray-500 dark:text-gray-400">Smartflo ID</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{number.id}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2.5">
            <p className="text-xs text-gray-500 dark:text-gray-400">SMS Templates</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{smsTemplateCount}</p>
          </div>
        </div>

        {/* Destination */}
        {number.destination_name && (
          <div className="mb-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg p-2.5">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Destination</p>
            <p className="text-sm text-blue-800 dark:text-blue-300">{number.destination_name}</p>
          </div>
        )}

        {/* Agent Assignment */}
        <div className="border-t dark:border-gray-700 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Agent</span>
            </div>
            {number.assigned_agent_name ? (
              <div className="flex items-center gap-2">
                <Badge variant="success" size="sm">
                  <Bot className="w-3 h-3 mr-1" />
                  {number.assigned_agent_name}
                </Badge>
                <button
                  onClick={handleUnassign}
                  className="text-red-400 hover:text-red-500 p-0.5"
                  title="Unassign agent"
                  disabled={assigning}
                >
                  {assigning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                </button>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowAgentDropdown(!showAgentDropdown); }}
                  className="text-xs px-2.5 py-1 rounded-md bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors font-medium flex items-center gap-1"
                  disabled={assigning}
                >
                  {assigning ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Zap className="w-3 h-3" />
                  )}
                  Assign Agent
                </button>
                {showAgentDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setShowAgentDropdown(false); }} />
                    <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 py-1 z-50 max-h-48 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                      {agents.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">No agents available</p>
                      ) : (
                        agents.map((agent) => (
                          <button
                            key={agent.id}
                            onClick={(e) => { e.stopPropagation(); handleAssign(agent.id); }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                          >
                            <Bot className="w-3.5 h-3.5 text-orange-500" />
                            {agent.name}
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Numbers Table Component (alternative view)
// ============================================================================

interface NumbersTableProps {
  numbers: SmartfloNumber[];
  agents: { id: number; name: string }[];
  onAssignAgent: (numberId: string, agentId: number) => Promise<void>;
  onUnassignAgent: (numberId: string) => Promise<void>;
  onUpdateConfig: (numberId: string, data: { label?: string; status?: string }) => Promise<void>;
}

function NumbersTable({ numbers, agents, onAssignAgent, onUnassignAgent, onUpdateConfig }: NumbersTableProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null);

  const handleAssign = async (numberId: string, agentId: number) => {
    setAssigning(numberId);
    try {
      await onAssignAgent(numberId, agentId);
    } finally {
      setAssigning(null);
      setActiveDropdown(null);
    }
  };

  const handleUnassign = async (numberId: string) => {
    setAssigning(numberId);
    try {
      await onUnassignAgent(numberId);
    } finally {
      setAssigning(null);
    }
  };

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Phone Number</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Smartflo ID</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Assigned Agent</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">SMS Templates</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Destination</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-700">
            {numbers.map((num) => {
              const smsCount = num.sms_templates ? num.sms_templates.split(',').filter(Boolean).length : 0;
              return (
                <tr key={num.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  {/* Phone Number */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-orange-50 dark:bg-orange-900/20 rounded">
                        <Phone className="w-4 h-4 text-orange-500" />
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
                          {formatPhoneNumber(num.did)}
                        </span>
                        <CopyButton text={num.did} />
                        {num.label && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{num.label}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* ID */}
                  <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400 font-mono">{num.id}</td>

                  {/* Status */}
                  <td className="px-5 py-4">
                    <StatusBadge status={num.status} />
                  </td>

                  {/* Agent */}
                  <td className="px-5 py-4">
                    {num.assigned_agent_name ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="success" size="sm">
                          <Bot className="w-3 h-3 mr-1" />
                          {num.assigned_agent_name}
                        </Badge>
                        <button
                          onClick={() => handleUnassign(num.id)}
                          className="text-red-400 hover:text-red-500"
                          disabled={assigning === num.id}
                        >
                          {assigning === num.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <X className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="relative inline-block">
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === num.id ? null : num.id); }}
                          className="text-xs px-2 py-1 rounded bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 font-medium flex items-center gap-1"
                          disabled={assigning === num.id}
                        >
                          {assigning === num.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Zap className="w-3 h-3" />
                          )}
                          Assign
                        </button>
                        {activeDropdown === num.id && (
                          <>
                            <div className="fixed inset-0 z-40" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setActiveDropdown(null); }} />
                            <div className="absolute left-0 mt-1 w-44 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 py-1 z-50 max-h-40 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                              {agents.length === 0 ? (
                                <p className="px-3 py-2 text-xs text-gray-500">No agents</p>
                              ) : (
                                agents.map((agent) => (
                                  <button
                                    key={agent.id}
                                    onClick={(e) => { e.stopPropagation(); handleAssign(num.id, agent.id); }}
                                    className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                  >
                                    <Bot className="w-3.5 h-3.5 text-orange-500" />
                                    {agent.name}
                                  </button>
                                ))
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </td>

                  {/* SMS Templates */}
                  <td className="px-5 py-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{smsCount}</span>
                  </td>

                  {/* Destination */}
                  <td className="px-5 py-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {num.destination_name || '—'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4 text-right">
                    <CopyButton text={num.did} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function MyNumbersPage() {
  const [numbers, setNumbers] = useState<SmartfloNumber[]>([]);
  const [agents, setAgents] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch numbers from Smartflo via backend
  const fetchNumbers = useCallback(async () => {
    try {
      setError(null);
      const res = await smartfloAPI.myNumbers();
      setNumbers(res.data.numbers || []);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to fetch numbers';
      setError(msg);
      console.error('Error fetching numbers:', err);
    }
  }, []);

  // Fetch agents for assignment dropdown
  const fetchAgents = useCallback(async () => {
    try {
      const res = await agentsAPI.list();
      const agentList = (res.data.agents || []).map((a: any) => ({ id: a.id, name: a.name }));
      setAgents(agentList);
    } catch (err) {
      console.error('Error fetching agents:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchNumbers(), fetchAgents()]);
      setLoading(false);
    };
    init();
  }, [fetchNumbers, fetchAgents]);

  // Refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNumbers();
    setRefreshing(false);
  };

  // Assign agent to number
  const handleAssignAgent = async (numberId: string, agentId: number) => {
    try {
      await smartfloAPI.assignAgent(numberId, agentId);
      // Update local state
      const agent = agents.find((a) => a.id === agentId);
      setNumbers((prev) =>
        prev.map((n) =>
          n.id === numberId
            ? { ...n, assigned_agent_id: agentId, assigned_agent_name: agent?.name || '' }
            : n
        )
      );
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to assign agent';
      alert(msg);
    }
  };

  // Unassign agent from number
  const handleUnassignAgent = async (numberId: string) => {
    try {
      await smartfloAPI.unassignAgent(numberId);
      setNumbers((prev) =>
        prev.map((n) =>
          n.id === numberId ? { ...n, assigned_agent_id: null, assigned_agent_name: null } : n
        )
      );
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to unassign agent';
      alert(msg);
    }
  };

  // Update number config
  const handleUpdateConfig = async (numberId: string, data: { label?: string; status?: string }) => {
    try {
      await smartfloAPI.updateNumberConfig(numberId, data);
      setNumbers((prev) =>
        prev.map((n) =>
          n.id === numberId ? { ...n, ...data } as SmartfloNumber : n
        )
      );
    } catch (err: any) {
      const msg = err?.response?.data?.detail || 'Failed to update config';
      alert(msg);
    }
  };

  // Filter numbers
  const filteredNumbers = numbers.filter((n) => {
    const matchesSearch =
      !searchQuery ||
      n.did.includes(searchQuery) ||
      n.alias.includes(searchQuery) ||
      (n.label && n.label.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (n.assigned_agent_name && n.assigned_agent_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || n.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // ========================================================================
  // RENDER
  // ========================================================================

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
            <Phone className="w-7 h-7 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Numbers</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Manage your Smartflo DID numbers and assign AI agents
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            loading={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <a
            href="https://smartflo.tatateleservices.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Smartflo Portal
          </a>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">Fetching numbers from Smartflo...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-medium">Failed to load numbers</p>
                <p className="text-sm mt-1 opacity-80">{error}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="mt-3" onClick={handleRefresh}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Stats */}
          <StatsRow numbers={numbers} />

          {/* Toolbar: Search + Filters + View Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search by number, alias, label, or agent..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
              {['all', 'active', 'inactive', 'maintenance'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    statusFilter === s
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
                title="Grid view"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-gray-700 text-orange-600 dark:text-orange-400 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
                title="Table view"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* No results */}
          {filteredNumbers.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Phone className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  {searchQuery || statusFilter !== 'all'
                    ? 'No numbers match your filters'
                    : 'No phone numbers found in your Smartflo account'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Grid View */}
          {viewMode === 'grid' && filteredNumbers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredNumbers.map((num) => (
                <NumberCard
                  key={num.id}
                  number={num}
                  agents={agents}
                  onAssignAgent={handleAssignAgent}
                  onUnassignAgent={handleUnassignAgent}
                  onUpdateConfig={handleUpdateConfig}
                />
              ))}
            </div>
          )}

          {/* Table View */}
          {viewMode === 'table' && filteredNumbers.length > 0 && (
            <NumbersTable
              numbers={filteredNumbers}
              agents={agents}
              onAssignAgent={handleAssignAgent}
              onUnassignAgent={handleUnassignAgent}
              onUpdateConfig={handleUpdateConfig}
            />
          )}

          {/* Smartflo Info Footer */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Globe className="w-4 h-4" />
                  <span>Connected to TATA Smartflo API</span>
                  <StatusDot status="active" />
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                  <span>Account: OR184608</span>
                  <span>{numbers.length} numbers synced</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
