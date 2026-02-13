'use client';

import React, { useState } from 'react';
import {
  Plus,
  Search,
  MoreVertical,
  Play,
  Pause,
  BarChart3,
  Settings,
  Download,
  ChevronRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { formatDate, cn } from '@/lib/utils';

const mockCampaigns = [
  {
    id: 1,
    name: 'Q1 2026 - Mumbai Residential Plots',
    status: 'active',
    total_leads: 1247,
    completed_leads: 811,
    created_at: '2026-01-15',
    filters: { cities: ['Mumbai', 'Pune'], stages: ['New', 'Contacted'] },
    calling_hours: '10 AM - 8 PM',
    max_attempts: 3,
    stats: {
      calls_today: 247,
      answered_today: 216,
      hot_leads: 32,
      warm_leads: 89,
      cold_leads: 95,
      avg_duration: '4m 23s',
    },
  },
  {
    id: 2,
    name: 'Industrial Land - Pune & Nashik',
    status: 'paused',
    total_leads: 543,
    completed_leads: 228,
    created_at: '2026-01-10',
    filters: { cities: ['Pune', 'Nashik'], stages: ['New'] },
    calling_hours: '10 AM - 6 PM',
    max_attempts: 3,
    stats: {
      calls_today: 0,
      answered_today: 0,
      hot_leads: 18,
      warm_leads: 45,
      cold_leads: 165,
      avg_duration: '3m 45s',
    },
  },
  {
    id: 3,
    name: 'Commercial Properties - Thane',
    status: 'draft',
    total_leads: 320,
    completed_leads: 0,
    created_at: '2026-01-20',
    filters: { cities: ['Thane'], stages: ['New', 'Contacted', 'Qualified'] },
    calling_hours: '9 AM - 9 PM',
    max_attempts: 2,
    stats: null,
  },
];

export default function CampaignsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const filteredCampaigns = mockCampaigns.filter((campaign) => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Campaigns</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your calling campaigns
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Create New Campaign
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All Statuses' },
            { value: 'active', label: 'Active' },
            { value: 'paused', label: 'Paused' },
            { value: 'draft', label: 'Draft' },
            { value: 'completed', label: 'Completed' },
          ]}
          className="w-full sm:w-48"
        />
      </div>

      {/* Campaigns Grid */}
      <div className="grid gap-6">
        {filteredCampaigns.map((campaign) => (
          <CampaignCard key={campaign.id} campaign={campaign} />
        ))}
      </div>

      {/* Create Campaign Modal */}
      <CreateCampaignModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}

function CampaignCard({ campaign }: { campaign: typeof mockCampaigns[0] }) {
  const progress = Math.round((campaign.completed_leads / campaign.total_leads) * 100);

  const statusColors: Record<string, string> = {
    active: 'badge-active',
    paused: 'badge-paused',
    draft: 'bg-gray-100 text-gray-800',
    completed: 'bg-blue-100 text-blue-800',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          {/* Campaign Info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {campaign.name}
              </h3>
              <Badge className={statusColors[campaign.status]}>
                {campaign.status === 'active' && (
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse" />
                )}
                {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
              </Badge>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Created: {formatDate(campaign.created_at)} | Target: {campaign.total_leads.toLocaleString()} leads
            </p>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Progress</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {progress}% ({campaign.completed_leads.toLocaleString()}/{campaign.total_leads.toLocaleString()})
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-primary-500 h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 text-sm text-gray-500">
              <span>Filters:</span>
              {campaign.filters.cities.map((city) => (
                <Badge key={city} variant="default" size="sm">
                  {city}
                </Badge>
              ))}
              <span className="mx-1">|</span>
              <span>Stage:</span>
              {campaign.filters.stages.map((stage) => (
                <Badge key={stage} variant="default" size="sm">
                  {stage}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Calling: {campaign.calling_hours} | Max attempts: {campaign.max_attempts}
            </p>
          </div>

          {/* Stats */}
          {campaign.stats && (
            <div className="lg:text-right space-y-2">
              <p className="text-sm text-gray-500">Stats Today:</p>
              <div className="grid grid-cols-3 gap-4 text-center lg:text-right">
                <div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {campaign.stats.calls_today}
                  </p>
                  <p className="text-xs text-gray-500">Calls</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {campaign.stats.answered_today}
                  </p>
                  <p className="text-xs text-gray-500">Answered</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-red-600">
                    {campaign.stats.hot_leads}
                  </p>
                  <p className="text-xs text-gray-500">Hot</p>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Avg Duration: {campaign.stats.avg_duration}
              </p>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm">
          <BarChart3 className="w-4 h-4" />
          View Analytics
        </Button>
        {campaign.status === 'active' ? (
          <Button variant="secondary" size="sm">
            <Pause className="w-4 h-4" />
            Pause
          </Button>
        ) : campaign.status === 'paused' ? (
          <Button variant="primary" size="sm">
            <Play className="w-4 h-4" />
            Resume
          </Button>
        ) : (
          <Button variant="primary" size="sm">
            <Play className="w-4 h-4" />
            Start
          </Button>
        )}
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4" />
          Edit
        </Button>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </CardFooter>
    </Card>
  );
}

function CreateCampaignModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    leadStages: [] as string[],
    cities: [] as string[],
    platforms: [] as string[],
    dailyLimit: 500,
    callingStart: '10:00',
    callingEnd: '20:00',
    maxAttempts: 3,
    retryInterval: 4,
    priority: 'medium',
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Campaign" size="lg">
      <div className="space-y-6">
        {/* Campaign Name */}
        <Input
          label="Campaign Name *"
          placeholder="Q1 2026 - Mumbai Residential Plots"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />

        {/* Lead Filters */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Lead Filters
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">
                Lead Stage
              </label>
              <div className="space-y-2">
                {['New', 'Contacted', 'Qualified'].map((stage) => (
                  <label key={stage} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{stage}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 mb-2 block">
                Platform
              </label>
              <div className="space-y-2">
                {['Facebook Ads', 'Website', 'Google Ads'].map((platform) => (
                  <label key={platform} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{platform}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Estimated Leads */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <strong>Estimated Leads:</strong> 1,247 leads match your criteria
          </p>
          <Button variant="ghost" size="sm" className="mt-2">
            Preview Lead List <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Campaign Settings */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Campaign Settings
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Daily Call Limit"
              type="number"
              value={formData.dailyLimit}
              onChange={(e) =>
                setFormData({ ...formData, dailyLimit: parseInt(e.target.value) })
              }
            />
            <Select
              label="Priority"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              options={[
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' },
              ]}
            />
            <Input
              label="Calling Hours Start"
              type="time"
              value={formData.callingStart}
              onChange={(e) => setFormData({ ...formData, callingStart: e.target.value })}
            />
            <Input
              label="Calling Hours End"
              type="time"
              value={formData.callingEnd}
              onChange={(e) => setFormData({ ...formData, callingEnd: e.target.value })}
            />
            <Input
              label="Max Attempts"
              type="number"
              value={formData.maxAttempts}
              onChange={(e) =>
                setFormData({ ...formData, maxAttempts: parseInt(e.target.value) })
              }
            />
            <Input
              label="Retry Interval (hours)"
              type="number"
              value={formData.retryInterval}
              onChange={(e) =>
                setFormData({ ...formData, retryInterval: parseInt(e.target.value) })
              }
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button>Create & Start Campaign</Button>
        </div>
      </div>
    </Modal>
  );
}
