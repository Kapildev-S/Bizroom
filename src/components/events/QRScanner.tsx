
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
    const [scanResult, setScanResult] = useState<{ success: boolean; message: string; userName?: string; eventTitle?: string; eventDate?: string; venue?: string } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [scannerActive, setScannerActive] = useState(false);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        if (scannerActive && !scannerRef.current) {
            const scanner = new Html5QrcodeScanner(
                "reader",
                {
                    fps: 20,
                    qrbox: { width: 280, height: 280 },
                    aspectRatio: 1.0,
                    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
                    showTorchButtonIfSupported: true,
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

    const playSound = (type: 'success' | 'error') => {
        try {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = context.createOscillator();
            const gain = context.createGain();

            oscillator.connect(gain);
            gain.connect(context.destination);

            if (type === 'success') {
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(880, context.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(440, context.currentTime + 0.1);
                gain.gain.setValueAtTime(0.1, context.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2);
                oscillator.start();
                oscillator.stop(context.currentTime + 0.2);
            } else {
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(220, context.currentTime);
                oscillator.frequency.linearRampToValueAtTime(110, context.currentTime + 0.2);
                gain.gain.setValueAtTime(0.1, context.currentTime);
                gain.gain.linearRampToValueAtTime(0.01, context.currentTime + 0.3);
                oscillator.start();
                oscillator.stop(context.currentTime + 0.3);
            }
        } catch (e) {
            // Audio might be blocked or not supported
        }
    };

    const onScanSuccess = async (decodedText: string) => {
        if (isProcessing || !user) return;

        setIsProcessing(true);
        if (scannerRef.current) {
            scannerRef.current.pause();
        }

        try {
            // Basic cleaning of scanned text if it's a URL
            let bookingId = decodedText;
            if (decodedText.includes('/')) {
                bookingId = decodedText.split('/').pop() || decodedText;
            }

            const result = await verifyAndCheckInTicket(bookingId, user.uid);
            setScanResult(result as any);
            playSound(result.success ? 'success' : 'error');
        } catch (error) {
            setScanResult({ success: false, message: "Network connection error." });
            playSound('error');
        } finally {
            setIsProcessing(false);
        }
    };

    const onScanFailure = (error: any) => {
        // Silently handle scan failures
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
        <Card className="w-full max-w-lg mx-auto overflow-hidden border-none shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2rem] bg-white">
            <CardHeader className="text-center pb-2 pt-8">
                <div className="mx-auto w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mb-4 text-violet-600 shadow-inner">
                    <Camera className="w-8 h-8" />
                </div>
                <CardTitle className="text-3xl font-black tracking-tight text-slate-900">
                    Live Entry Validator
                </CardTitle>
                <CardDescription className="text-slate-500 font-medium px-4">
                    Instantly verify and check-in attendees by scanning their unique ticket QR code.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-8">
                {!scannerActive ? (
                    <div className="flex flex-col items-center justify-center py-16 bg-slate-50 rounded-[1.5rem] border-2 border-dashed border-slate-200 group hover:border-violet-300 transition-colors">
                        <Camera className="w-16 h-16 text-slate-300 mb-6 group-hover:scale-110 transition-transform" />
                        <Button
                            onClick={toggleScanner}
                            size="lg"
                            className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-8 py-6 h-auto text-lg font-bold shadow-lg shadow-violet-200"
                        >
                            Enable Scanner Camera
                        </Button>
                        <p className="mt-4 text-slate-400 text-sm font-medium">Requires camera permission</p>
                    </div>
                ) : (
                    <div className="relative rounded-[1.5rem] overflow-hidden shadow-2xl border-4 border-slate-900">
                        <div id="reader" className="w-full"></div>

                        {isProcessing && (
                            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md flex flex-col items-center justify-center z-10">
                                <div className="bg-white p-6 rounded-3xl shadow-2xl flex flex-col items-center">
                                    <Loader2 className="w-12 h-12 animate-spin text-violet-600 mb-3" />
                                    <p className="font-black text-slate-900 uppercase tracking-widest text-xs">Authenticating...</p>
                                </div>
                            </div>
                        )}

                        {scanResult && (
                            <div className={`absolute inset-0 flex flex-col items-center justify-center z-20 p-8 text-center animate-in fade-in zoom-in duration-300 backdrop-blur-xl ${scanResult.success ? 'bg-emerald-500/95 text-white' : 'bg-rose-500/95 text-white'
                                }`}>
                                <div className="bg-white/20 p-6 rounded-full mb-6 backdrop-blur-md border border-white/30">
                                    {scanResult.success ? (
                                        <CheckCircle className="w-20 h-20" />
                                    ) : (
                                        <XCircle className="w-20 h-20" />
                                    )}
                                </div>

                                <h3 className="text-5xl font-black mb-4 tracking-tighter">
                                    {scanResult.success ? "APPROVED" : "REJECTED"}
                                </h3>

                                <div className="space-y-4 max-w-sm">
                                    <p className="text-xl font-bold leading-tight opacity-90">{scanResult.message}</p>

                                    {(scanResult.userName || scanResult.eventTitle) && (
                                        <div className="bg-black/10 rounded-2xl p-6 space-y-3 backdrop-blur-sm text-left border border-white/10">
                                            {scanResult.userName && (
                                                <div>
                                                    <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">Attendee Name</p>
                                                    <p className="text-xl font-black">{scanResult.userName}</p>
                                                </div>
                                            )}
                                            {scanResult.eventTitle && (
                                                <div>
                                                    <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">Event Assignment</p>
                                                    <p className="text-lg font-bold leading-tight line-clamp-2">{scanResult.eventTitle}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <Button
                                    onClick={resetScanner}
                                    className="mt-10 bg-white text-slate-900 hover:bg-slate-100 rounded-2xl px-12 py-8 h-auto text-xl font-black shadow-2xl active:scale-95 transition-all"
                                >
                                    Scan Next Attendee
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                <div className="mt-8 flex flex-col items-center gap-4">
                    {scannerActive && (
                        <Button
                            variant="ghost"
                            onClick={toggleScanner}
                            className="text-slate-500 hover:text-rose-500 hover:bg-rose-50 transition-all font-bold"
                        >
                            Deactivate Camera
                        </Button>
                    )}

                    {!scanResult && scannerActive && (
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            Scanner Active
                        </div>
                    )}
                </div>
            </CardContent>

            <div className="bg-slate-50 p-6 flex items-center justify-center gap-8 border-t border-slate-100">
                <div className="flex flex-col items-center text-center">
                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Validated</span>
                    <span className="text-slate-900 font-black text-lg">Instant</span>
                </div>
                <div className="w-px h-8 bg-slate-200"></div>
                <div className="flex flex-col items-center text-center">
                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Security</span>
                    <span className="text-slate-900 font-black text-lg">End-to-End</span>
                </div>
                <div className="w-px h-8 bg-slate-200"></div>
                <div className="flex flex-col items-center text-center">
                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Format</span>
                    <span className="text-slate-900 font-black text-lg">QR v4.0</span>
                </div>
            </div>
        </Card>
    );
}

