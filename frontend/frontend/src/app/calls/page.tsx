'use client';

import React, { useState } from 'react';
import {
  Search,
  Play,
  Pause,
  Download,
  FileText,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Phone,
  Clock,
  Star,
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
import { formatDateTime, formatDuration, cn } from '@/lib/utils';

const mockCalls = [
  {
    id: 1,
    lead_name: 'Rajesh Kumar',
    lead_phone: '+91-98765-43210',
    campaign_name: 'Q1 2026 - Mumbai Residential',
    duration: 263,
    classification: 'hot',
    sentiment_score: 0.85,
    call_outcome: 'Qualified',
    call_summary: 'Budget: 20-30L confirmed. Location: Prefers Panvel. Timeline: 3 months. Next: Site visit scheduled',
    started_at: '2026-01-25T15:45:00',
    transcript: [
      { time: '00:05', speaker: 'ARIA', text: 'Hello Rajesh, this is calling from Green Valley Realty. I\'m an AI assistant. May I take 2 minutes to discuss Plot #127 in our Panvel project?' },
      { time: '00:18', speaker: 'Customer', text: 'Yes, go ahead. I saw the ad on Facebook.' },
      { time: '00:23', speaker: 'ARIA', text: 'Great! To help you better, may I know your budget range?' },
      { time: '00:28', speaker: 'Customer', text: 'My budget is around 25 lakhs, maybe up to 30 lakhs.', highlight: true },
      { time: '00:35', speaker: 'ARIA', text: 'Perfect! That fits well with our Plot #127 priced at 24.5 lakhs. Are you looking in any specific area?' },
      { time: '00:42', speaker: 'Customer', text: 'Preferably Panvel or nearby. Close to the highway.', highlight: true },
    ],
  },
  {
    id: 2,
    lead_name: 'Priya Sharma',
    lead_phone: '+91-91234-56789',
    campaign_name: 'Industrial Land',
    duration: 407,
    classification: 'warm',
    sentiment_score: 0.65,
    call_outcome: 'Callback Requested',
    call_summary: 'Location too far from office. Requested callback in 2 weeks after discussing with family.',
    started_at: '2026-01-25T14:15:00',
    transcript: [],
  },
  {
    id: 3,
    lead_name: 'Amit Verma',
    lead_phone: '+91-88888-77777',
    campaign_name: 'Q1 2026 - Mumbai Residential',
    duration: 125,
    classification: 'cold',
    sentiment_score: 0.35,
    call_outcome: 'Not Interested',
    call_summary: 'Already purchased property elsewhere. Marked as not interested.',
    started_at: '2026-01-25T11:30:00',
    transcript: [],
  },
];

export default function CallsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCall, setSelectedCall] = useState<typeof mockCalls[0] | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Call History</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Review call recordings and transcripts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4" />
            Export to CSV
          </Button>
          <Button variant="outline">
            Generate Report
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search lead name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                options={[
                  { value: '', label: 'Date Range: Last 7 days' },
                  { value: 'today', label: 'Today' },
                  { value: '7d', label: 'Last 7 days' },
                  { value: '30d', label: 'Last 30 days' },
                  { value: '90d', label: 'Last 90 days' },
                ]}
                className="w-48"
              />
              <Select
                options={[
                  { value: '', label: 'All Campaigns' },
                  { value: '1', label: 'Q1 2026 - Mumbai' },
                  { value: '2', label: 'Industrial Land' },
                ]}
                className="w-44"
              />
              <Select
                options={[
                  { value: '', label: 'Classification' },
                  { value: 'hot', label: 'Hot' },
                  { value: 'warm', label: 'Warm' },
                  { value: 'cold', label: 'Cold' },
                ]}
                className="w-36"
              />
              <Select
                options={[
                  { value: '', label: 'Outcome' },
                  { value: 'qualified', label: 'Qualified' },
                  { value: 'callback', label: 'Callback Requested' },
                  { value: 'not_interested', label: 'Not Interested' },
                ]}
                className="w-40"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calls Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date/Time</TableHead>
              <TableHead>Lead</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Classification</TableHead>
              <TableHead>Sentiment</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockCalls.map((call) => (
              <TableRow key={call.id} onClick={() => setSelectedCall(call)}>
                <TableCell>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatDateTime(call.started_at)}
                  </p>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {call.lead_name}
                  </p>
                  <p className="text-sm text-gray-500">{call.lead_phone}</p>
                </TableCell>
                <TableCell>
                  <span className="text-gray-900 dark:text-white">{call.campaign_name}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900 dark:text-white">
                      {formatDuration(call.duration)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      call.classification === 'hot'
                        ? 'hot'
                        : call.classification === 'warm'
                        ? 'warm'
                        : 'cold'
                    }
                  >
                    {call.classification.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <SentimentIndicator score={call.sentiment_score} />
                    <span className="text-sm text-gray-500">
                      {(call.sentiment_score * 100).toFixed(0)}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-gray-900 dark:text-white">{call.call_outcome}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm">
                      <Play className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <FileText className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <BarChart3 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        <div className="px-6 py-4 border-t dark:border-gray-700 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing 1-{mockCalls.length} of 3,247 calls
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="primary" size="sm">1</Button>
            <Button variant="outline" size="sm">2</Button>
            <Button variant="outline" size="sm">3</Button>
            <span className="text-gray-500">...</span>
            <Button variant="outline" size="sm">130</Button>
            <Button variant="outline" size="sm">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Call Detail Modal */}
      <CallDetailModal call={selectedCall} onClose={() => setSelectedCall(null)} />
    </div>
  );
}

function SentimentIndicator({ score }: { score: number }) {
  const getEmoji = () => {
    if (score >= 0.7) return '😊';
    if (score >= 0.4) return '😐';
    return '😞';
  };

  return <span className="text-lg">{getEmoji()}</span>;
}

function CallDetailModal({
  call,
  onClose,
}: {
  call: typeof mockCalls[0] | null;
  onClose: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);

  if (!call) return null;

  return (
    <Modal
      isOpen={!!call}
      onClose={onClose}
      title={`Call Recording: ${call.lead_name} - ${formatDateTime(call.started_at)}`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Audio Player */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <div className="flex items-center gap-4">
            <Button
              variant={isPlaying ? 'secondary' : 'primary'}
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </Button>
            <div className="flex-1">
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                <div className="h-2 bg-primary-500 rounded-full w-1/3" />
              </div>
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>1:27</span>
                <span>{formatDuration(call.duration)}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">0.5x</Button>
              <Button variant="secondary" size="sm">1x</Button>
              <Button variant="outline" size="sm">1.5x</Button>
              <Button variant="outline" size="sm">2x</Button>
            </div>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4" />
              Download MP3
            </Button>
          </div>
        </div>

        {/* Transcript */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Synchronized Transcript:
          </h4>
          <div className="max-h-80 overflow-y-auto border dark:border-gray-700 rounded-lg">
            {call.transcript.length > 0 ? (
              <div className="divide-y dark:divide-gray-700">
                {call.transcript.map((entry, index) => (
                  <div
                    key={index}
                    className={cn(
                      'p-4',
                      entry.highlight && 'bg-yellow-50 dark:bg-yellow-900/10'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xs text-gray-400 w-12">[{entry.time}]</span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white text-sm">
                          {entry.speaker}:
                        </p>
                        <p className="text-gray-700 dark:text-gray-300">
                          "{entry.text}"
                        </p>
                        {entry.highlight && (
                          <Badge variant="warning" size="sm" className="mt-2">
                            <Star className="w-3 h-3 mr-1" />
                            KEY MOMENT
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                Transcript not available for this call
              </div>
            )}
          </div>
        </div>

        {/* AI Analysis */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              AI Analysis
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Classification</span>
                <Badge
                  variant={
                    call.classification === 'hot'
                      ? 'hot'
                      : call.classification === 'warm'
                      ? 'warm'
                      : 'cold'
                  }
                >
                  {call.classification.toUpperCase()} ({(call.sentiment_score * 10).toFixed(0)}/10)
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Sentiment</span>
                <span className="text-gray-900 dark:text-white">
                  Positive ({(call.sentiment_score * 100).toFixed(0)}%)
                </span>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Summary
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {call.call_summary}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
