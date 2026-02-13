'use client';

import React, { useState } from 'react';
import {
  Download,
  TrendingUp,
  TrendingDown,
  Phone,
  Target,
  Flame,
  Clock,
  DollarSign,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const mockCallTrend = [
  { date: 'Jan 1', total: 180, answered: 156, hot: 28, warm: 65, cold: 63 },
  { date: 'Jan 8', total: 220, answered: 192, hot: 35, warm: 78, cold: 79 },
  { date: 'Jan 15', total: 195, answered: 170, hot: 30, warm: 72, cold: 68 },
  { date: 'Jan 22', total: 260, answered: 227, hot: 42, warm: 89, cold: 96 },
  { date: 'Jan 29', total: 247, answered: 216, hot: 32, warm: 89, cold: 95 },
];

const mockClassification = [
  { name: 'Hot', value: 287, color: '#ef4444' },
  { name: 'Warm', value: 412, color: '#f97316' },
  { name: 'Cold', value: 218, color: '#3b82f6' },
];

const mockObjections = [
  { objection: 'Price too high', count: 187, percentage: 41 },
  { objection: 'Location concerns', count: 123, percentage: 27 },
  { objection: 'Need more time', count: 98, percentage: 21 },
  { objection: 'Already purchased', count: 52, percentage: 11 },
];

const mockHeatmap = [
  { hour: '9AM', Mon: 75, Tue: 78, Wed: 72, Thu: 74, Fri: 71, Sat: 65, Sun: 62 },
  { hour: '12PM', Mon: 82, Tue: 85, Wed: 80, Thu: 83, Fri: 79, Sat: 75, Sun: 68 },
  { hour: '3PM', Mon: 88, Tue: 90, Wed: 87, Thu: 89, Fri: 85, Sat: 78, Sun: 72 },
  { hour: '6PM', Mon: 92, Tue: 94, Wed: 91, Thu: 93, Fri: 90, Sat: 82, Sun: 76 },
  { hour: '9PM', Mon: 68, Tue: 70, Wed: 65, Thu: 67, Fri: 64, Sat: 58, Sun: 55 },
];

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('30');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics & Reports</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Track performance and insights
          </p>
        </div>
        <div className="flex gap-2">
          <Select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            options={[
              { value: '7', label: 'Last 7 days' },
              { value: '30', label: 'Last 30 days' },
              { value: '90', label: 'Last 90 days' },
            ]}
            className="w-40"
          />
          <Button variant="outline">
            <Download className="w-4 h-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          label="Total Calls"
          value="3,247"
          change={12}
          icon={<Phone className="w-5 h-5" />}
          color="blue"
        />
        <MetricCard
          label="Answer Rate"
          value="87.3%"
          change={2.1}
          icon={<Target className="w-5 h-5" />}
          color="green"
        />
        <MetricCard
          label="Qualification Rate"
          value="68.4%"
          change={-3.2}
          icon={<TrendingUp className="w-5 h-5" />}
          color="orange"
        />
        <MetricCard
          label="Hot Leads"
          value="287"
          change={18}
          icon={<Flame className="w-5 h-5" />}
          color="red"
        />
        <MetricCard
          label="Avg Duration"
          value="4m 32s"
          change={-15}
          isTime
          icon={<Clock className="w-5 h-5" />}
          color="amber"
        />
        <MetricCard
          label="Cost per Hot Lead"
          value="₹142"
          change={-8}
          icon={<DollarSign className="w-5 h-5" />}
          color="emerald"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Call Volume Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Call Volume Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockCallTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stackId="1"
                    stroke="#3b82f6"
                    fill="#93c5fd"
                    name="Total Calls"
                  />
                  <Area
                    type="monotone"
                    dataKey="hot"
                    stackId="2"
                    stroke="#ef4444"
                    fill="#fca5a5"
                    name="Hot"
                  />
                  <Area
                    type="monotone"
                    dataKey="warm"
                    stackId="2"
                    stroke="#f97316"
                    fill="#fdba74"
                    name="Warm"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Classification Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Classification Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={mockClassification}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {mockClassification.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {mockClassification.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.value} ({((item.value / 917) * 100).toFixed(0)}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Objections */}
        <Card>
          <CardHeader>
            <CardTitle>Top Objections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockObjections.map((item, index) => (
                <div key={item.objection}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {index + 1}. {item.objection}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.count} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className={cn(
                        'h-3 rounded-full',
                        index === 0
                          ? 'bg-red-500'
                          : index === 1
                          ? 'bg-orange-500'
                          : index === 2
                          ? 'bg-yellow-500'
                          : 'bg-blue-500'
                      )}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Best Calling Times */}
        <Card>
          <CardHeader>
            <CardTitle>Best Calling Times (Conversion Rate %)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="text-left py-2 text-gray-500"></th>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                      <th key={day} className="text-center py-2 text-gray-500 font-medium">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mockHeatmap.map((row) => (
                    <tr key={row.hour}>
                      <td className="py-2 text-gray-500 font-medium">{row.hour}</td>
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                        const value = row[day as keyof typeof row] as number;
                        return (
                          <td key={day} className="text-center py-2">
                            <div
                              className={cn(
                                'w-10 h-10 mx-auto rounded flex items-center justify-center text-xs font-medium',
                                value >= 90
                                  ? 'bg-green-500 text-white'
                                  : value >= 80
                                  ? 'bg-green-400 text-white'
                                  : value >= 70
                                  ? 'bg-green-300 text-gray-800'
                                  : value >= 60
                                  ? 'bg-yellow-300 text-gray-800'
                                  : 'bg-yellow-200 text-gray-800'
                              )}
                            >
                              {value}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  change,
  icon,
  color,
  isTime = false,
}: {
  label: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  color: string;
  isTime?: boolean;
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  };

  const isPositive = isTime ? change < 0 : change > 0;
  const isNegative = isTime ? change > 0 : change < 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', colors[color])}>
            {icon}
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            <div className="flex items-center gap-1">
              <p className="text-xs text-gray-500">{label}</p>
              <span
                className={cn(
                  'text-xs font-medium',
                  isPositive && 'text-green-600',
                  isNegative && 'text-red-600',
                  !isPositive && !isNegative && 'text-gray-500'
                )}
              >
                {isPositive ? (
                  <TrendingUp className="w-3 h-3 inline" />
                ) : isNegative ? (
                  <TrendingDown className="w-3 h-3 inline" />
                ) : null}
                {Math.abs(change)}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
