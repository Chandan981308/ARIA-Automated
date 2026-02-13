'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Phone,
  CheckCircle,
  Flame,
  TrendingUp,
  Clock,
  Target,
  RefreshCw,
  Play,
  ChevronRight,
  Calendar,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDuration, formatCurrency, cn } from '@/lib/utils';
import { analyticsAPI, leadsAPI, callsAPI, liveCallsWS } from '@/lib/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface DashboardMetrics {
  live_calls: number;
  completed_today: number;
  hot_leads_today: number;
  answer_rate: number;
  avg_duration: number;
  qualification_rate: number;
}

interface LiveCall {
  call_id: string;
  lead_name: string;
  lead_phone: string;
  plot_name: string;
  state: string;
  duration: number;
  last_transcript: string;
  started_at: string;
}

interface HotLead {
  id: number;
  name: string;
  phone: string;
  city: string;
  interest_status: string;
  created_at: string;
}

interface TrendData {
  date: string;
  calls: number;
  hot: number;
}

export default function DashboardPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [dateRange, setDateRange] = useState('today');

  // State for dashboard data
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    live_calls: 0,
    completed_today: 0,
    hot_leads_today: 0,
    answer_rate: 0,
    avg_duration: 0,
    qualification_rate: 0,
  });
  const [liveCalls, setLiveCalls] = useState<LiveCall[]>([]);
  const [hotLeads, setHotLeads] = useState<HotLead[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);

      // Fetch all data in parallel
      const [dashboardRes, trendRes, hotLeadsRes, liveCallsRes] = await Promise.allSettled([
        analyticsAPI.dashboard(),
        analyticsAPI.callTrend(7),
        leadsAPI.hotLeadsQueue(5),
        callsAPI.live(),
      ]);

      // Process dashboard metrics
      if (dashboardRes.status === 'fulfilled') {
        const data = dashboardRes.value.data;
        setMetrics({
          live_calls: data.live_calls || 0,
          completed_today: data.completed_today || 0,
          hot_leads_today: data.hot_leads_today || 0,
          answer_rate: data.answer_rate || 0,
          avg_duration: data.avg_duration || 0,
          qualification_rate: data.qualification_rate || 0,
        });
      }

      // Process trend data
      if (trendRes.status === 'fulfilled') {
        setTrendData(trendRes.value.data || []);
      }

      // Process hot leads
      if (hotLeadsRes.status === 'fulfilled') {
        setHotLeads(hotLeadsRes.value.data || []);
      }

      // Process live calls
      if (liveCallsRes.status === 'fulfilled') {
        setLiveCalls(liveCallsRes.value.data || []);
      }

    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Connect to WebSocket for real-time updates
  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        await liveCallsWS.connect();
        setWsConnected(true);

        // Listen for live call updates
        liveCallsWS.on('all', (data) => {
          if (data.type === 'smartflo_event') {
            // Update live calls based on event
            fetchDashboardData();
          }
        });
      } catch (err) {
        console.error('WebSocket connection failed:', err);
        setWsConnected(false);
      }
    };

    connectWebSocket();

    return () => {
      liveCallsWS.disconnect();
    };
  }, [fetchDashboardData]);

  // Initial data fetch
  useEffect(() => {
    fetchDashboardData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboardData();
    setIsRefreshing(false);
  };

  // Show loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Monitor your AI voice agent performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* WebSocket Status */}
          <div className={cn(
            'flex items-center gap-1 px-2 py-1 rounded text-xs',
            wsConnected
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          )}>
            {wsConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {wsConnected ? 'Live' : 'Offline'}
          </div>

          <select
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="today">Today</option>
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
          </select>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          icon={<Phone className="w-5 h-5" />}
          label="Live Calls"
          value={metrics.live_calls}
          color="blue"
          pulse={metrics.live_calls > 0}
        />
        <MetricCard
          icon={<CheckCircle className="w-5 h-5" />}
          label="Completed Today"
          value={metrics.completed_today}
          color="green"
        />
        <MetricCard
          icon={<Flame className="w-5 h-5" />}
          label="Hot Leads"
          value={metrics.hot_leads_today}
          color="red"
        />
        <MetricCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Answer Rate"
          value={`${metrics.answer_rate.toFixed(1)}%`}
          color="indigo"
        />
        <MetricCard
          icon={<Clock className="w-5 h-5" />}
          label="Avg Duration"
          value={formatDuration(metrics.avg_duration)}
          color="amber"
        />
        <MetricCard
          icon={<Target className="w-5 h-5" />}
          label="Qualification Rate"
          value={`${metrics.qualification_rate.toFixed(1)}%`}
          color="emerald"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Live Calls */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  liveCalls.length > 0 ? 'bg-red-500 animate-pulse' : 'bg-gray-400'
                )} />
                <CardTitle>Live Calls ({liveCalls.length} active)</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={() => window.location.href = '/calls'}>
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {liveCalls.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Phone className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No active calls at the moment</p>
                </div>
              ) : (
                liveCalls.map((call) => (
                  <div
                    key={call.call_id}
                    className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {call.lead_name}
                          </span>
                          <Badge variant="default" size="sm">
                            {call.state}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {call.lead_phone} | {call.plot_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatDuration(call.duration)}
                        </span>
                      </div>
                    </div>
                    {call.last_transcript && (
                      <div className="mt-3 p-2 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-300 italic">
                          &quot;{call.last_transcript}&quot;
                        </p>
                      </div>
                    )}
                    <div className="mt-3 flex gap-2">
                      <Button variant="outline" size="sm">
                        <Play className="w-3 h-3 mr-1" />
                        View Full Call
                      </Button>
                      <Button variant="secondary" size="sm">
                        Transfer to Human
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Hot Leads Queue */}
        <div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-red-500" />
                <CardTitle>Hot Leads Queue</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={() => window.location.href = '/leads'}>
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {hotLeads.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Flame className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No hot leads in queue</p>
                </div>
              ) : (
                hotLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {lead.name}
                        </span>
                        <p className="text-sm text-gray-500 mt-1">
                          {lead.city || 'Unknown'} | {lead.interest_status || 'Interested'}
                        </p>
                      </div>
                      <Badge variant="hot">
                        Hot
                      </Badge>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button variant="primary" size="sm">
                        <Phone className="w-3 h-3 mr-1" />
                        Call Now
                      </Button>
                      <Button variant="outline" size="sm">
                        <Calendar className="w-3 h-3 mr-1" />
                        Schedule
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Trend (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {trendData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                No trend data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="calls"
                    stroke="#ea580c"
                    strokeWidth={2}
                    name="Total Calls"
                    dot={{ fill: '#ea580c', strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="hot"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Hot Leads"
                    dot={{ fill: '#ef4444', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  color,
  pulse = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  pulse?: boolean;
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    indigo: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  };

  return (
    <Card hover>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', colors[color], pulse && 'animate-pulse')}>
            {icon}
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
