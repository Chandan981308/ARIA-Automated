'use client';

import { Workflow } from 'lucide-react';

export default function WorkflowsPage() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Workflow className="w-8 h-8 text-orange-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Workflows</h1>
          <p className="text-gray-500 dark:text-gray-400">Design and manage automation workflows</p>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-8 text-center">
        <Workflow className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Workflows</h2>
        <p className="text-gray-500 dark:text-gray-400">Build automated workflows for call handling, lead routing, and follow-ups.</p>
      </div>
    </div>
  );
}
