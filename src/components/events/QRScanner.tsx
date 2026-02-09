
"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { verifyAndCheckInTicket } from '@/app/actions/bookingActions';
import { Loader2, CheckCircle, XCircle, Camera } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';

export function QRScanner() {
    const { user } = useAuth();
    const [scanResult, setScanResult] = useState<{ success: boolean; message: string; userName?: string; eventTitle?: string } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [scannerActive, setScannerActive] = useState(false);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        if (scannerActive && !scannerRef.current) {
            const scanner = new Html5QrcodeScanner(
                "reader",
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
                },
                /* verbose= */ false
            );

            scanner.render(onScanSuccess, onScanFailure);
            scannerRef.current = scanner;
        }

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(error => console.error("Failed to clear scanner:", error));
                scannerRef.current = null;
            }
        };
    }, [scannerActive]);

    const onScanSuccess = async (decodedText: string) => {
        if (isProcessing || !user) return;

        setIsProcessing(true);
        // Pause the scanner visually or stop it
        if (scannerRef.current) {
            scannerRef.current.pause();
        }

        try {
            // Assume the decoded text is the bookingId
            const result = await verifyAndCheckInTicket(decodedText, user.uid);
            setScanResult(result);

            // Audio feedback if possible (optional)
        } catch (error) {
            setScanResult({ success: false, message: "Error connecting to server." });
        } finally {
            setIsProcessing(false);
        }
    };

    const onScanFailure = (error: any) => {
        // console.warn(`Code scan error = ${error}`);
    };

    const resetScanner = () => {
        setScanResult(null);
        if (scannerRef.current) {
            scannerRef.current.resume();
        }
    };

    const toggleScanner = () => {
        setScannerActive(!scannerActive);
        setScanResult(null);
    };

    return (
        <Card className="w-full max-w-md mx-auto overflow-hidden">
            <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                    <Camera className="w-6 h-6 text-primary" />
                    Ticket Approval Scanner
                </CardTitle>
                <CardDescription>
                    Point the camera at the attendee's ticket QR code
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {!scannerActive ? (
                    <div className="flex flex-col items-center justify-center py-12 bg-muted rounded-lg border-2 border-dashed">
                        <Camera className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                        <Button onClick={toggleScanner} size="lg">
                            Start Camera Scanner
                        </Button>
                    </div>
                ) : (
                    <div className="relative">
                        <div id="reader" className="w-full rounded-lg overflow-hidden border"></div>

                        {isProcessing && (
                            <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center z-10 rounded-lg">
                                <Loader2 className="w-10 h-10 animate-spin text-primary mb-2" />
                                <p className="font-medium">Verifying Ticket...</p>
                            </div>
                        )}

                        {scanResult && (
                            <div className={`absolute inset-0 flex flex-col items-center justify-center z-20 rounded-lg p-6 text-center animate-in fade-in zoom-in duration-300 ${scanResult.success ? 'bg-green-50/95 text-green-700' : 'bg-red-50/95 text-red-700'
                                }`}>
                                {scanResult.success ? (
                                    <CheckCircle className="w-20 h-20 mb-4" />
                                ) : (
                                    <XCircle className="w-20 h-20 mb-4" />
                                )}

                                <h3 className="text-2xl font-bold mb-2">
                                    {scanResult.success ? "Approved!" : "Rejected"}
                                </h3>

                                <p className="text-lg font-medium mb-1">{scanResult.message}</p>

                                {scanResult.userName && (
                                    <p className="mt-2 opacity-90">
                                        <span className="font-bold">Attendee:</span> {scanResult.userName}
                                    </p>
                                )}

                                {scanResult.eventTitle && (
                                    <p className="opacity-90">
                                        <span className="font-bold">Event:</span> {scanResult.eventTitle}
                                    </p>
                                )}

                                <Button
                                    onClick={resetScanner}
                                    className="mt-8 bg-current text-background hover:opacity-90"
                                    size="lg"
                                >
                                    Scan Next Ticket
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex justify-center gap-4">
                    {scannerActive && (
                        <Button variant="outline" onClick={toggleScanner}>
                            Stop Scanner
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
