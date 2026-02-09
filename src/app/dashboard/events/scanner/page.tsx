
"use client";

import React from 'react';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { QRScanner } from '@/components/events/QRScanner';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, History } from 'lucide-react';

export default function EventScannerPage() {
    return (
        <AuthenticatedLayout pageTitle="Ticket Verification">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <Button variant="ghost" asChild>
                        <Link href="/dashboard/events">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Events
                        </Link>
                    </Button>

                    <Button variant="outline" asChild>
                        <Link href="/dashboard/bookings">
                            <History className="w-4 h-4 mr-2" />
                            Recent Bookings
                        </Link>
                    </Button>
                </div>

                <div className="text-center space-y-2 mb-8">
                    <h1 className="text-3xl font-bold tracking-tight">Entry Management</h1>
                    <p className="text-muted-foreground max-w-lg mx-auto">
                        Admins can scan the attendee's ticket QR code to verify entry and mark them as checked-in.
                    </p>
                </div>

                <div className="flex justify-center">
                    <QRScanner />
                </div>

                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm text-blue-800 max-w-md mx-auto">
                    <h4 className="font-bold flex items-center gap-2 mb-1">
                        How it works:
                    </h4>
                    <ul className="list-disc list-inside space-y-1 opacity-90">
                        <li>Each ticket has a unique QR code.</li>
                        <li>Scanning it will instantly verify its validity in our system.</li>
                        <li>Once scanned, the ticket is marked as "Checked In" and cannot be reused.</li>
                    </ul>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
