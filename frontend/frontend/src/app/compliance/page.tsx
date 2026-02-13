'use client';

import React, { useState } from 'react';
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  Clock,
  FileText,
  Download,
  Eye,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Input';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { formatDateTime, cn } from '@/lib/utils';

const mockComplianceStatus = {
  trai_compliant: true,
  dpdp_compliant: true,
  dlt_status: 'Active',
  dlt_expiry: '2026-03-15',
  calling_violations_30d: 0,
  opt_outs_30d: 23,
  pending_erasures: 5,
  erasure_due_date: '2026-01-28',
  encryption_status: 'AES-256 Active',
  consent_records: 1247,
  recordings_in_policy: 847,
  last_audit: '2026-01-20',
};

const mockComplianceLogs = [
  {
    id: 1,
    event_type: 'opt_out_requested',
    lead_name: 'Amit Verma',
    details: { reason: 'Not interested anymore' },
    created_at: '2026-01-25T16:23:00',
    status: 'Processed immediately',
  },
  {
    id: 2,
    event_type: 'consent_captured',
    lead_name: 'Priya Sharma',
    details: { source: 'Facebook lead form' },
    created_at: '2026-01-25T14:15:00',
    status: 'Valid consent confirmed',
  },
  {
    id: 3,
    event_type: 'data_erasure_completed',
    lead_name: 'Recordings Cleanup',
    details: { count: 47, reason: 'Older than 1 year' },
    created_at: '2026-01-24T23:00:00',
    status: 'Completed successfully',
  },
];

const mockPendingErasures = [
  {
    id: 1,
    lead_name: 'Rahul Sharma',
    requested_at: '2026-01-15',
    due_date: '2026-02-14',
    reason: 'User requested data deletion',
  },
  {
    id: 2,
    lead_name: 'Meera Patel',
    requested_at: '2026-01-18',
    due_date: '2026-02-17',
    reason: 'DPDP compliance request',
  },
];

export default function CompliancePage() {
  const status = mockComplianceStatus;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Compliance Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            TRAI & DPDP Act 2023 compliance monitoring
          </p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4" />
          Export Audit Log
        </Button>
      </div>

      {/* Overall Status */}
      <Card className={cn(
        'border-2',
        status.trai_compliant && status.dpdp_compliant
          ? 'border-green-500 bg-green-50 dark:bg-green-900/10'
          : 'border-red-500 bg-red-50 dark:bg-red-900/10'
      )}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            {status.trai_compliant && status.dpdp_compliant ? (
              <CheckCircle className="w-12 h-12 text-green-500" />
            ) : (
              <AlertTriangle className="w-12 h-12 text-red-500" />
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Compliance Status: {status.trai_compliant && status.dpdp_compliant ? 'ALL CLEAR' : 'ACTION REQUIRED'}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Last checked: 5 minutes ago
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Cards */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* TRAI Compliance */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                TRAI Compliance
              </CardTitle>
              <Badge variant="success">Active</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">DLT Registration</span>
              <span className="font-medium text-green-600">{status.dlt_status}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">DLT Valid Until</span>
              <span className="font-medium text-gray-900 dark:text-white">{status.dlt_expiry}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Calling Window Violations (30d)</span>
              <span className="font-medium text-green-600">{status.calling_violations_30d}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Opt-Out Requests (30d)</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {status.opt_outs_30d} (Processed within 24h)
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400">Template Approval</span>
              <span className="font-medium text-green-600">Valid until Mar 2026</span>
            </div>
          </CardContent>
        </Card>

        {/* DPDP Act 2023 Compliance */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                DPDP Act 2023 Compliance
              </CardTitle>
              <Badge variant="success">Compliant</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Data Encryption</span>
              <span className="font-medium text-green-600">{status.encryption_status}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Consent Records</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {status.consent_records.toLocaleString()} leads with valid consent
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Data Retention</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {status.recordings_in_policy} recordings within 1-year policy
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b dark:border-gray-700">
              <span className="text-gray-600 dark:text-gray-400">Erasure Requests</span>
              <span className={cn(
                'font-medium',
                status.pending_erasures > 0 ? 'text-orange-600' : 'text-green-600'
              )}>
                {status.pending_erasures} pending (Due: {status.erasure_due_date})
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600 dark:text-gray-400">Vendor DPA</span>
              <span className="font-medium text-green-600">All 5 vendors signed</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Required */}
      {status.pending_erasures > 0 && (
        <Card className="border-orange-500 border-2 bg-orange-50 dark:bg-orange-900/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
              <AlertTriangle className="w-5 h-5" />
              Action Required: {status.pending_erasures} Erasure Requests Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Due Date: {status.erasure_due_date} - Process these requests to maintain DPDP compliance.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead Name</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockPendingErasures.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.lead_name}</TableCell>
                    <TableCell>{req.requested_at}</TableCell>
                    <TableCell>{req.due_date}</TableCell>
                    <TableCell>{req.reason}</TableCell>
                    <TableCell>
                      <Button variant="primary" size="sm">
                        <Trash2 className="w-4 h-4 mr-1" />
                        Process
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter>
            <Button variant="outline">View Details</Button>
            <Button variant="primary" className="ml-2">Process All</Button>
          </CardFooter>
        </Card>
      )}

      {/* Recent Compliance Events */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Compliance Events</CardTitle>
          <Select
            options={[
              { value: 'all', label: 'All Events' },
              { value: 'opt_out', label: 'Opt-Out Requests' },
              { value: 'consent', label: 'Consent Captured' },
              { value: 'erasure', label: 'Data Erasure' },
            ]}
            className="w-40"
          />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockComplianceLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
              >
                <div className={cn(
                  'p-2 rounded-full',
                  log.event_type === 'opt_out_requested'
                    ? 'bg-yellow-100 text-yellow-600'
                    : log.event_type === 'consent_captured'
                    ? 'bg-green-100 text-green-600'
                    : 'bg-blue-100 text-blue-600'
                )}>
                  {log.event_type === 'opt_out_requested' ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : log.event_type === 'consent_captured' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Trash2 className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {log.event_type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </h4>
                    <span className="text-sm text-gray-500">
                      {formatDateTime(log.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {log.lead_name} | {Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                  </p>
                  <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    {log.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline">
            <Download className="w-4 h-4" />
            Download Compliance Report
          </Button>
          <Button variant="outline">
            <Clock className="w-4 h-4" />
            Schedule Audit
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
