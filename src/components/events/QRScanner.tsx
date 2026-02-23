
"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { verifyAndCheckInTicket, verifyAndCheckInAttendee, type BookingData } from '@/app/actions/bookingActions';
import { Loader2, CheckCircle, XCircle, Camera, Users, Check } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';

export function QRScanner() {
    const { user } = useAuth();
    const [scanResult, setScanResult] = useState<{
        success: boolean;
        message: string;
        userName?: string;
        eventTitle?: string;
        requiresAction?: boolean;
        booking?: BookingData;
    } | null>(null);
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
            let bookingId = decodedText;
            if (decodedText.includes('/')) {
                bookingId = decodedText.split('/').pop() || decodedText;
            }

            const result = await verifyAndCheckInTicket(bookingId, user.uid);

            if (result.requiresAction) {
                setScanResult({
                    success: true,
                    message: "Ticket Verified",
                    requiresAction: true,
                    booking: result.booking as BookingData
                });
                playSound('success');
            } else {
                setScanResult(result as any);
                playSound(result.success ? 'success' : 'error');
            }
        } catch (error) {
            setScanResult({ success: false, message: "Network connection error." });
            playSound('error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAttendeeCheckIn = async (index: number) => {
        if (!scanResult?.booking || !user) return;
        setIsProcessing(true);
        try {
            const res = await verifyAndCheckInAttendee(scanResult.booking.bookingId, index, user.uid);
            if (res.success) {
                // Update local state to reflect check-in
                setScanResult(prev => {
                    if (!prev || !prev.booking) return prev;
                    const updatedCheckIns = [...(prev.booking.attendeeCheckIns || []), { attendeeIndex: index, checkedInAt: new Date() }];
                    return {
                        ...prev,
                        booking: {
                            ...prev.booking,
                            attendeeCheckIns: updatedCheckIns,
                            checkedInCount: updatedCheckIns.length
                        }
                    };
                });
                playSound('success');
            } else {
                alert(res.message);
                playSound('error');
            }
        } catch (error) {
            console.error(error);
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
                            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md flex flex-col items-center justify-center z-[60]">
                                <div className="bg-white p-6 rounded-3xl shadow-2xl flex flex-col items-center">
                                    <Loader2 className="w-12 h-12 animate-spin text-violet-600 mb-3" />
                                    <p className="font-black text-slate-900 uppercase tracking-widest text-xs text-center">Processing Admission...</p>
                                </div>
                            </div>
                        )}

                        {scanResult && (
                            <div className={`absolute inset-0 flex flex-col items-center justify-start z-20 p-6 overflow-y-auto animate-in fade-in zoom-in duration-300 backdrop-blur-xl ${scanResult.success ? 'bg-emerald-500/95 text-white' : 'bg-rose-500/95 text-white'}`}>
                                <h3 className="text-3xl font-black mb-2 tracking-tighter">
                                    {scanResult.success ? (scanResult.requiresAction ? "GROUP VERIFIED" : "APPROVED") : "REJECTED"}
                                </h3>
                                <p className="text-sm font-bold opacity-90 mb-6">{scanResult.message}</p>

                                {scanResult.requiresAction && scanResult.booking ? (
                                    <div className="w-full space-y-4">
                                        <div className="bg-white/10 rounded-2xl p-4 border border-white/20 text-left">
                                            <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-70">Event</p>
                                            <p className="font-black leading-tight border-b border-white/10 pb-2 mb-2 line-clamp-1">{scanResult.booking.eventTitle}</p>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="opacity-70 text-[10px] uppercase font-bold">Group Check-in</span>
                                                <span className="font-black uppercase tracking-widest">{scanResult.booking.attendees?.length || 1} Tickets</span>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-left opacity-70 px-1">Select Attendee</p>
                                            {(scanResult.booking.attendees || [{ name: scanResult.booking.userName, mobile: scanResult.booking.userMobile }]).map((attendee, idx) => {
                                                const isCheckedIn = scanResult.booking?.attendeeCheckIns?.some(ci => ci.attendeeIndex === idx);
                                                return (
                                                    <div
                                                        key={idx}
                                                        className={`flex items-center justify-between p-4 rounded-[1.2rem] transition-all border ${isCheckedIn
                                                                ? 'bg-emerald-600/50 border-white/40 cursor-not-allowed opacity-60'
                                                                : 'bg-white text-slate-900 border-transparent hover:scale-[1.02] cursor-pointer'
                                                            }`}
                                                        onClick={() => !isCheckedIn && handleAttendeeCheckIn(idx)}
                                                    >
                                                        <div className="flex flex-col text-left">
                                                            <span className="font-black text-sm">{attendee.name}</span>
                                                            <span className={`text-[10px] font-bold ${isCheckedIn ? 'text-white/60' : 'text-slate-400'}`}>
                                                                {attendee.mobile}
                                                            </span>
                                                        </div>
                                                        {isCheckedIn ? (
                                                            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tighter text-white">
                                                                <Check size={14} strokeWidth={4} /> ADMITTED
                                                            </div>
                                                        ) : (
                                                            <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 font-bold rounded-lg h-8 text-[10px] uppercase">
                                                                Admit
                                                            </Button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white/20 p-8 rounded-full mb-6 backdrop-blur-md border border-white/30">
                                        {scanResult.success ? <CheckCircle className="w-16 h-16" /> : <XCircle className="w-16 h-16" />}
                                    </div>
                                )}

                                <Button
                                    onClick={resetScanner}
                                    className="mt-8 bg-white text-slate-900 hover:bg-slate-100 rounded-xl px-10 py-5 h-auto text-lg font-black shadow-2xl active:scale-95 transition-all mt-auto"
                                >
                                    Scan Next
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
