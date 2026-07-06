"use client";

import React from 'react';
import { BusinessTable } from './components/BusinessTable';

export default function BusinessManagementPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Business Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage, verify, and support registered businesses across the platform.
          </p>
        </div>
      </div>

      <BusinessTable />
    </div>
  );
}
