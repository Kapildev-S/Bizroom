"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Activity } from 'lucide-react';
import { Input } from '@/components/ui/input';

const mockLogs = Array.from({ length: 20 }).map((_, i) => ({
  id: `LOG-${1000 + i}`,
  action: ['Updated Settings', 'Suspended Business', 'Granted Premium', 'Dispatched Notification'][Math.floor(Math.random() * 4)],
  admin: 'Super Admin',
  target: `Business ${Math.floor(Math.random() * 100)}`,
  timestamp: new Date(Date.now() - Math.random() * 100000000).toLocaleString(),
  status: Math.random() > 0.1 ? 'Success' : 'Failed'
}));

export default function AuditLogsPage() {
  const [search, setSearch] = useState('');

  const filteredLogs = mockLogs.filter(log => 
    log.action.toLowerCase().includes(search.toLowerCase()) || 
    log.target.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground mt-1">
          Complete activity timeline of all admin actions.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-500" />
            Activity Timeline
          </CardTitle>
          <div className="flex items-center gap-2 w-full max-w-sm">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search logs..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Log ID</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Admin User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium text-xs text-muted-foreground">{log.id}</TableCell>
                    <TableCell className="text-sm">{log.timestamp}</TableCell>
                    <TableCell>{log.admin}</TableCell>
                    <TableCell className="font-medium">{log.action}</TableCell>
                    <TableCell>{log.target}</TableCell>
                    <TableCell>
                      <Badge variant={log.status === 'Success' ? 'default' : 'destructive'} className={log.status === 'Success' ? 'bg-emerald-500' : ''}>
                        {log.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
