'use client';

import React, { useState } from 'react';
import {
  Phone,
  Volume2,
  Bell,
  Users,
  Save,
  FileText,
  Play,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Select } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('calling');

  const tabs = [
    { id: 'calling', label: 'Calling', icon: Phone },
    { id: 'voice', label: 'Voice & Conversation', icon: Volume2 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'team', label: 'Team & Assignment', icon: Users },
    { id: 'scripts', label: 'Sales Scripts', icon: FileText },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Configure your ARIA voice agent
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 shrink-0">
          <Card>
            <CardContent className="p-2">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                      activeTab === tab.id
                        ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                    )}
                  >
                    <tab.icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'calling' && <CallingSettings />}
          {activeTab === 'voice' && <VoiceSettings />}
          {activeTab === 'notifications' && <NotificationSettings />}
          {activeTab === 'team' && <TeamSettings />}
          {activeTab === 'scripts' && <ScriptSettings />}
        </div>
      </div>
    </div>
  );
}

function CallingSettings() {
  const [settings, setSettings] = useState({
    callingStart: '09:00',
    callingEnd: '21:00',
    concurrentLimit: 50,
    retryAttempts: 3,
    retryInterval: 4,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calling Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Global Calling Window Start"
            type="time"
            value={settings.callingStart}
            onChange={(e) => setSettings({ ...settings, callingStart: e.target.value })}
          />
          <Input
            label="Global Calling Window End"
            type="time"
            value={settings.callingEnd}
            onChange={(e) => setSettings({ ...settings, callingEnd: e.target.value })}
          />
        </div>
        <Input
          label="Concurrent Call Limit"
          type="number"
          value={settings.concurrentLimit}
          onChange={(e) => setSettings({ ...settings, concurrentLimit: parseInt(e.target.value) })}
        />
        <Input
          label="Default Retry Attempts"
          type="number"
          value={settings.retryAttempts}
          onChange={(e) => setSettings({ ...settings, retryAttempts: parseInt(e.target.value) })}
        />
        <Input
          label="Retry Interval (hours)"
          type="number"
          value={settings.retryInterval}
          onChange={(e) => setSettings({ ...settings, retryInterval: parseInt(e.target.value) })}
        />
      </CardContent>
      <CardFooter>
        <Button>
          <Save className="w-4 h-4" />
          Save Changes
        </Button>
      </CardFooter>
    </Card>
  );
}

function VoiceSettings() {
  const [settings, setSettings] = useState({
    voiceType: 'female_indian_neutral',
    speakingRate: 1.0,
    maxDuration: 8,
    silenceThreshold: 3,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Voice & Conversation Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Select
          label="Voice"
          value={settings.voiceType}
          onChange={(e) => setSettings({ ...settings, voiceType: e.target.value })}
          options={[
            { value: 'female_indian_neutral', label: 'Female - Indian Neutral' },
            { value: 'male_indian_neutral', label: 'Male - Indian Neutral' },
            { value: 'female_indian_hindi', label: 'Female - Hindi Accent' },
            { value: 'male_indian_hindi', label: 'Male - Hindi Accent' },
          ]}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Speaking Rate: {settings.speakingRate}x
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={settings.speakingRate}
            onChange={(e) => setSettings({ ...settings, speakingRate: parseFloat(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0.5x</span>
            <span>1x</span>
            <span>1.5x</span>
            <span>2x</span>
          </div>
        </div>
        <Input
          label="Max Call Duration (minutes)"
          type="number"
          value={settings.maxDuration}
          onChange={(e) => setSettings({ ...settings, maxDuration: parseInt(e.target.value) })}
        />
        <Input
          label="Silence Threshold (seconds)"
          type="number"
          value={settings.silenceThreshold}
          onChange={(e) => setSettings({ ...settings, silenceThreshold: parseInt(e.target.value) })}
        />
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button>
          <Save className="w-4 h-4" />
          Save Changes
        </Button>
        <Button variant="outline">
          <Play className="w-4 h-4" />
          Test Voice
        </Button>
      </CardFooter>
    </Card>
  );
}

function NotificationSettings() {
  const [settings, setSettings] = useState({
    hotLeadNotifications: true,
    dailySummary: true,
    complianceAlerts: true,
    downtimeAlerts: false,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {[
          { key: 'hotLeadNotifications', label: 'Hot lead notifications (Email + SMS)' },
          { key: 'dailySummary', label: 'Daily performance summary (Email)' },
          { key: 'complianceAlerts', label: 'Compliance alerts (Email + SMS)' },
          { key: 'downtimeAlerts', label: 'System downtime notifications' },
        ].map((item) => (
          <label key={item.key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg cursor-pointer">
            <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
            <input
              type="checkbox"
              checked={settings[item.key as keyof typeof settings]}
              onChange={(e) => setSettings({ ...settings, [item.key]: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </label>
        ))}
      </CardContent>
      <CardFooter>
        <Button>
          <Save className="w-4 h-4" />
          Save Preferences
        </Button>
      </CardFooter>
    </Card>
  );
}

function TeamSettings() {
  const [settings, setSettings] = useState({
    assignmentMode: 'round_robin',
    autoAssignment: true,
    workingStart: '10:00',
    workingEnd: '19:00',
  });

  const mockTeam = [
    { id: 1, name: 'Amit Patel', leads: 42, status: 'Active' },
    { id: 2, name: 'Ravi Singh', leads: 38, status: 'Active' },
    { id: 3, name: 'Priya Mehta', leads: 35, status: 'On Leave' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team & Assignment Rules</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Hot Lead Assignment
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="assignmentMode"
                  value="round_robin"
                  checked={settings.assignmentMode === 'round_robin'}
                  onChange={(e) => setSettings({ ...settings, assignmentMode: e.target.value })}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-gray-700 dark:text-gray-300">Round Robin</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="assignmentMode"
                  value="workload_based"
                  checked={settings.assignmentMode === 'workload_based'}
                  onChange={(e) => setSettings({ ...settings, assignmentMode: e.target.value })}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-gray-700 dark:text-gray-300">Workload-Based</span>
              </label>
            </div>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.autoAssignment}
              onChange={(e) => setSettings({ ...settings, autoAssignment: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-primary-600"
            />
            <span className="text-gray-700 dark:text-gray-300">Enable Auto-Assignment</span>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Working Hours Start"
              type="time"
              value={settings.workingStart}
              onChange={(e) => setSettings({ ...settings, workingStart: e.target.value })}
            />
            <Input
              label="Working Hours End"
              type="time"
              value={settings.workingEnd}
              onChange={(e) => setSettings({ ...settings, workingEnd: e.target.value })}
            />
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Sales Team ({mockTeam.length} members)
          </h4>
          <div className="space-y-2">
            {mockTeam.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 dark:text-primary-400 font-medium text-sm">
                      {member.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
                    <p className="text-sm text-gray-500">{member.leads} leads assigned</p>
                  </div>
                </div>
                <Badge variant={member.status === 'Active' ? 'success' : 'warning'}>
                  {member.status}
                </Badge>
              </div>
            ))}
          </div>
          <Button variant="outline" className="mt-3">
            Manage Team
          </Button>
        </div>
      </CardContent>
      <CardFooter>
        <Button>
          <Save className="w-4 h-4" />
          Save Changes
        </Button>
      </CardFooter>
    </Card>
  );
}

function ScriptSettings() {
  const mockScripts = [
    { id: 1, name: 'Default Residential v2.1', lastModified: '2026-01-20', active: true },
    { id: 2, name: 'Commercial Properties v1.5', lastModified: '2026-01-15', active: false },
    { id: 3, name: 'Industrial Land v1.0', lastModified: '2026-01-10', active: false },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Sales Script Management</CardTitle>
        <Button variant="outline">Create New</Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {mockScripts.map((script) => (
            <div
              key={script.id}
              className={cn(
                'flex items-center justify-between p-4 rounded-lg border',
                script.active
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                  : 'border-gray-200 dark:border-gray-700'
              )}
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 dark:text-white">{script.name}</p>
                  {script.active && (
                    <Badge variant="success">Active</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500">Last modified: {script.lastModified}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Edit</Button>
                <Button variant="outline" size="sm">Preview</Button>
                {!script.active && (
                  <Button variant="primary" size="sm">Activate</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline">
          <FileText className="w-4 h-4" />
          Version History
        </Button>
      </CardFooter>
    </Card>
  );
}
