'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Filter,
  Phone,
  MessageSquare,
  Calendar,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Eye,
  Flame,
  Play,
  Download,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import {
  formatDate,
  formatRelativeTime,
  formatPhoneNumber,
  formatCurrency,
  cn,
} from '@/lib/utils';
import { leadsAPI } from '@/lib/api';

interface Lead {
  id: number;
  name: string;
  email: string | null;
  phone: string;
  city: string | null;
  state: string | null;
  platformId: number | null;
  plotId: number | null;
  leadStageId: number | null;
  leadStatusId: number | null;
  assignedTo: number | null;
  tracker: number;
  interestStatus: string | null;
  other: {
    budget_min?: number;
    budget_max?: number;
    preferred_location?: string;
    property_type?: string;
    timeline?: string;
    intent_score?: number;
    objections?: string[];
  };
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

interface LeadsResponse {
  leads: Lead[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLeads, setTotalLeads] = useState(0);
  const [pageSize] = useState(25);

  // Filters
  const [stageFilter, setStageFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [interestFilter, setInterestFilter] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch leads from API
  const fetchLeads = useCallback(async () => {
    try {
      setError(null);
      const params: Record<string, any> = {
        page: currentPage,
        page_size: pageSize,
      };

      if (searchQuery) params.search = searchQuery;
      if (stageFilter) params.lead_stage_id = parseInt(stageFilter);
      if (cityFilter) params.city = cityFilter;
      if (platformFilter) params.platform_id = parseInt(platformFilter);
      if (interestFilter) params.interest_status = interestFilter;

      const response = await leadsAPI.list(params);
      const data: LeadsResponse = response.data;

      setLeads(data.leads);
      setTotalPages(data.total_pages);
      setTotalLeads(data.total);
    } catch (err: any) {
      console.error('Error fetching leads:', err);
      setError(err.response?.data?.detail || 'Failed to fetch leads');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [currentPage, pageSize, searchQuery, stageFilter, cityFilter, platformFilter, interestFilter]);

  // Initial fetch and when filters change
  useEffect(() => {
    setLoading(true);
    fetchLeads();
  }, [fetchLeads]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        fetchLeads();
      } else {
        setCurrentPage(1);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchLeads();
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(leads.map((l) => l.id));
    } else {
      setSelectedLeads([]);
    }
  };

  const handleSelectLead = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedLeads([...selectedLeads, id]);
    } else {
      setSelectedLeads(selectedLeads.filter((i) => i !== id));
    }
  };

  const handleInitiateCall = async (leadId: number) => {
    try {
      await leadsAPI.initiateCall(leadId);
      alert('Call initiated successfully');
      fetchLeads();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to initiate call');
    }
  };

  const getClassificationBadge = (lead: Lead) => {
    const classification = lead.classification || (lead.other?.intent_score ?
      (lead.other.intent_score >= 7 ? 'hot' : lead.other.intent_score >= 4 ? 'warm' : 'cold') : null);

    if (!classification) return null;

    return (
      <Badge variant={classification as 'hot' | 'warm' | 'cold'}>
        {classification.toUpperCase()}
      </Badge>
    );
  };

  // Get unique cities from leads for filter
  const cities = [...new Set(leads.map(l => l.city).filter(Boolean))];

  // Show loading skeleton
  if (loading && leads.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
        </div>
        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leads</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your lead database ({totalLeads} total)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
          <Button>
            <Plus className="w-4 h-4" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by name, phone, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                value={stageFilter}
                onChange={(e) => {
                  setStageFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: '', label: 'All Stages' },
                  { value: '1', label: 'New' },
                  { value: '2', label: 'Contacted' },
                  { value: '3', label: 'Qualified' },
                  { value: '4', label: 'Hot Lead' },
                  { value: '5', label: 'Meeting Scheduled' },
                ]}
                className="w-36"
              />
              <Select
                value={cityFilter}
                onChange={(e) => {
                  setCityFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: '', label: 'All Cities' },
                  { value: 'Mumbai', label: 'Mumbai' },
                  { value: 'Pune', label: 'Pune' },
                  { value: 'Thane', label: 'Thane' },
                  { value: 'Navi Mumbai', label: 'Navi Mumbai' },
                  { value: 'Bangalore', label: 'Bangalore' },
                  { value: 'Delhi', label: 'Delhi' },
                  { value: 'Chennai', label: 'Chennai' },
                  { value: 'Hyderabad', label: 'Hyderabad' },
                  { value: 'Ahmedabad', label: 'Ahmedabad' },
                ]}
                className="w-36"
              />
              <Select
                value={platformFilter}
                onChange={(e) => {
                  setPlatformFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: '', label: 'All Platforms' },
                  { value: '1', label: 'Facebook Ads' },
                  { value: '2', label: 'Google Ads' },
                  { value: '3', label: 'Website' },
                  { value: '4', label: 'Referral' },
                ]}
                className="w-40"
              />
              <Select
                value={interestFilter}
                onChange={(e) => {
                  setInterestFilter(e.target.value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: '', label: 'Interest Status' },
                  { value: 'interested', label: 'Interested' },
                  { value: 'not interested', label: 'Not Interested' },
                ]}
                className="w-40"
              />
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedLeads.length > 0 && (
            <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg flex items-center justify-between">
              <span className="text-sm text-primary-700 dark:text-primary-300">
                {selectedLeads.length} leads selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Assign
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4" />
                  Export
                </Button>
                <Button variant="outline" size="sm">
                  Add to Campaign
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  className="rounded border-gray-300"
                  checked={selectedLeads.length === leads.length && leads.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </TableHead>
              <TableHead>Lead</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Classification</TableHead>
              <TableHead>Calls</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Loading leads...
                    </div>
                  ) : (
                    'No leads found'
                  )}
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={selectedLeads.includes(lead.id)}
                      onChange={(e) => handleSelectLead(lead.id, e.target.checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {(lead.classification === 'hot' || (lead.other?.intent_score && lead.other.intent_score >= 7)) && (
                        <Flame className="w-4 h-4 text-red-500" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {lead.name || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-500">{lead.phone}</p>
                        {lead.other?.budget_min && lead.other?.budget_max && (
                          <p className="text-xs text-gray-400">
                            {formatCurrency(lead.other.budget_min)} - {formatCurrency(lead.other.budget_max)}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-gray-900 dark:text-white">{lead.city || '-'}</p>
                    <p className="text-sm text-gray-500">{lead.state || ''}</p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        lead.stage_name === 'Hot Lead'
                          ? 'hot'
                          : lead.stage_name === 'Qualified' || lead.stage_name === 'Meeting Scheduled'
                          ? 'warm'
                          : 'default'
                      }
                    >
                      {lead.stage_name || 'New'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getClassificationBadge(lead) ? (
                      <div className="flex items-center gap-2">
                        {getClassificationBadge(lead)}
                        {lead.other?.intent_score && (
                          <span className="text-sm text-gray-500">
                            {lead.other.intent_score}/10
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-gray-900 dark:text-white">{lead.tracker}</p>
                      {lead.last_call_date && (
                        <p className="text-xs text-gray-500">
                          {formatRelativeTime(lead.last_call_date)}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {lead.assigned_user_name ? (
                      <span className="text-gray-900 dark:text-white">
                        {lead.assigned_user_name}
                      </span>
                    ) : (
                      <span className="text-gray-400">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLead(lead)}
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleInitiateCall(lead.id)}
                        title="Call Lead"
                      >
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title="Send Message">
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="px-6 py-4 border-t dark:border-gray-700 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {leads.length > 0 ? ((currentPage - 1) * pageSize) + 1 : 0}-
            {Math.min(currentPage * pageSize, totalLeads)} of {totalLeads} leads
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}

            {totalPages > 5 && currentPage < totalPages - 2 && (
              <>
                <span className="text-gray-500">...</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                >
                  {totalPages}
                </Button>
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages || totalPages === 0}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Lead Detail Modal */}
      <LeadDetailModal
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onCallInitiated={() => fetchLeads()}
      />
    </div>
  );
}

function LeadDetailModal({
  lead,
  onClose,
  onCallInitiated,
}: {
  lead: Lead | null;
  onClose: () => void;
  onCallInitiated: () => void;
}) {
  if (!lead) return null;

  const handleInitiateCall = async () => {
    try {
      await leadsAPI.initiateCall(lead.id);
      alert('Call initiated successfully');
      onCallInitiated();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to initiate call');
    }
  };

  return (
    <Modal
      isOpen={!!lead}
      onClose={onClose}
      title={`Lead Profile: ${lead.name || 'Unknown'}`}
      size="xl"
    >
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div>
          <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
            Basic Info
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Name</span>
              <span className="font-medium text-gray-900 dark:text-white">{lead.name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Phone</span>
              <span className="font-medium text-gray-900 dark:text-white">{lead.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Email</span>
              <span className="font-medium text-gray-900 dark:text-white">{lead.email || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">City</span>
              <span className="font-medium text-gray-900 dark:text-white">{lead.city || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Platform</span>
              <span className="font-medium text-gray-900 dark:text-white">{lead.platform_name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Added</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatDate(lead.createdAt)}
              </span>
            </div>
          </div>

          {/* Property Interest */}
          {(lead.plot_name || lead.other?.property_type) && (
            <>
              <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mt-6 mb-3">
                Property Interest
              </h4>
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                {lead.plot_name && (
                  <p className="font-medium text-gray-900 dark:text-white">{lead.plot_name}</p>
                )}
                {lead.other?.property_type && (
                  <p className="text-sm text-gray-500">Type: {lead.other.property_type}</p>
                )}
                {lead.other?.preferred_location && (
                  <p className="text-sm text-gray-500">Preferred: {lead.other.preferred_location}</p>
                )}
                {lead.other?.budget_min && lead.other?.budget_max && (
                  <p className="text-sm text-gray-500 mt-1">
                    Budget: {formatCurrency(lead.other.budget_min)} - {formatCurrency(lead.other.budget_max)}
                  </p>
                )}
                {lead.other?.timeline && (
                  <p className="text-sm text-gray-500">Timeline: {lead.other.timeline}</p>
                )}
              </div>
            </>
          )}

          {/* AI Insights */}
          {lead.other?.intent_score && (
            <>
              <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mt-6 mb-3">
                AI Insights
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Intent Score</span>
                  <Badge
                    variant={lead.other.intent_score >= 7 ? 'hot' : lead.other.intent_score >= 4 ? 'warm' : 'cold'}
                  >
                    {lead.other.intent_score}/10
                  </Badge>
                </div>
                {lead.classification && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Classification</span>
                    <Badge variant={lead.classification as any}>
                      {lead.classification.toUpperCase()}
                    </Badge>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Contact History */}
        <div>
          <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
            Contact History
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Total Calls</span>
              <span className="font-medium text-gray-900 dark:text-white">{lead.tracker}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Call Count (API)</span>
              <span className="font-medium text-gray-900 dark:text-white">{lead.call_count}</span>
            </div>
            {lead.last_call_date && (
              <div className="flex justify-between">
                <span className="text-gray-500">Last Call</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatRelativeTime(lead.last_call_date)}
                </span>
              </div>
            )}
            {lead.assigned_user_name && (
              <div className="flex justify-between">
                <span className="text-gray-500">Assigned To</span>
                <span className="font-medium text-gray-900 dark:text-white">{lead.assigned_user_name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className="font-medium text-gray-900 dark:text-white">{lead.status_name || 'Active'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Interest</span>
              <Badge variant={lead.interestStatus === 'interested' ? 'success' : lead.interestStatus === 'not interested' ? 'danger' : 'default'}>
                {lead.interestStatus || 'Unknown'}
              </Badge>
            </div>
          </div>

          {/* Call Timeline */}
          {lead.tracker > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
                Recent Activity
              </h4>
              <div className="border dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <Phone className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {lead.last_call_date ? formatDate(lead.last_call_date) : 'Call made'}
                    </p>
                    <p className="text-sm text-gray-500">Stage: {lead.stage_name || 'New'}</p>
                    {lead.other?.budget_min && lead.other?.budget_max && (
                      <p className="text-sm text-gray-500">
                        Budget: {formatCurrency(lead.other.budget_min)} - {formatCurrency(lead.other.budget_max)} confirmed
                      </p>
                    )}
                    <div className="mt-2 flex gap-2">
                      <Button variant="outline" size="sm">
                        <Play className="w-3 h-3 mr-1" />
                        Play
                      </Button>
                      <Button variant="outline" size="sm">
                        Transcript
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-6 pt-6 border-t dark:border-gray-700">
        <Button variant="primary" onClick={handleInitiateCall}>
          <Phone className="w-4 h-4" />
          Call Now
        </Button>
        <Button variant="outline">
          <Calendar className="w-4 h-4" />
          Schedule Meeting
        </Button>
        <Button variant="outline">
          <MessageSquare className="w-4 h-4" />
          Send WhatsApp
        </Button>
      </div>
    </Modal>
  );
}
