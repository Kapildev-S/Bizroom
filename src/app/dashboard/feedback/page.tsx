
"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { collection, query, getDocs, orderBy, Timestamp } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, QrCode, Sparkles, MessageSquare, Star, TrendingUp, Info, Share2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "@/hooks/use-toast";
import { Copy, AlertCircle } from "lucide-react";
import { runFeedbackAnalysis } from "@/app/actions/aiActions";

type Feedback = {
    id: string;
    rating: number;
    comment: string;
    timestamp: any;
};

export default function FeedbackDashboard() {
    const [feedback, setFeedback] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [insights, setInsights] = useState<string | null>(null);
    const [shopId, setShopId] = useState<string | null>(null);
    const [customUrl, setCustomUrl] = useState<string>("");
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (user) {
                setShopId(user.uid);
                await fetchFeedback(user.uid);
            } else {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    async function fetchFeedback(uid: string) {
        setLoading(true);
        try {
            const feedbackQuery = query(
                collection(db, `users/${uid}/feedback`),
                orderBy("timestamp", "desc")
            );
            const snapshot = await getDocs(feedbackQuery);
            const fetchedFeedback = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Feedback));
            setFeedback(fetchedFeedback);
        } catch (error) {
            console.error("Error fetching feedback:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to load feedback data.",
            });
        } finally {
            setLoading(false);
        }
    }

    const generateAIInsights = async () => {
        if (feedback.length === 0) {
            toast({
                title: "No Feedback Yet",
                description: "You need some customer feedback before AI can analyze it.",
            });
            return;
        }

        setAnalyzing(true);
        try {
            const result = await runFeedbackAnalysis(
                feedback.map(f => ({ rating: f.rating, comment: f.comment }))
            );
            setInsights(result);

            toast({
                title: "Insights Generated",
                description: "AI has analyzed your customer feedback.",
            });
        } catch (error: any) {
            console.error("AI Analysis error:", error);
            toast({
                variant: "destructive",
                title: "Analysis Failed",
                description: error.message || "Could not generate insights at this time.",
            });
        } finally {
            setAnalyzing(false);
        }
    };

    const getFeedbackUrl = () => {
        if (!shopId) return "";
        const base = customUrl.trim() || (typeof window !== "undefined" ? window.location.origin : "");
        const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
        return `${normalizedBase}/f/${shopId}`;
    };

    const feedbackUrl = getFeedbackUrl();

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="ml-3 text-lg font-medium">Crunching feedback data...</p>
            </div>
        );
    }

    const averageRating = feedback.length > 0
        ? feedback.reduce((acc, f) => acc + f.rating, 0) / feedback.length
        : 0;

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-4xl font-bold tracking-tight font-headline text-slate-900 flex items-center gap-3">
                        <MessageSquare className="h-10 w-10 text-primary" />
                        Feedback & Insights
                    </h2>
                    <p className="text-muted-foreground text-lg">Understand what your customers really think about your shop.</p>
                </div>
                <Button
                    onClick={generateAIInsights}
                    disabled={analyzing || feedback.length === 0}
                    className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg rounded-full shadow-lg shadow-primary/20 transition-all hover:scale-105"
                >
                    {analyzing ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            AI is Analyzing...
                        </>
                    ) : (
                        <>
                            <Sparkles className="mr-2 h-5 w-5" />
                            Generate AI Suggestions
                        </>
                    )}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* QR Code Card */}
                <Card className="shadow-xl border-none bg-gradient-to-br from-slate-50 to-white">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <QrCode className="h-5 w-5 text-primary" />
                            Customer QR Code
                        </CardTitle>
                        <CardDescription>Print this and place it in your shop.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center py-6">
                        <div className="p-6 bg-white rounded-3xl shadow-inner mb-6 border-2 border-slate-100">
                            {shopId && (
                                <QRCodeSVG
                                    value={feedbackUrl}
                                    size={200}
                                    level="H"
                                    includeMargin={true}
                                />
                            )}
                        </div>
                        <div className="flex w-full gap-2 mb-6">
                            <Button
                                variant="outline"
                                className="flex-1 rounded-xl"
                                onClick={() => window.open(feedbackUrl, '_blank')}
                                disabled={!feedbackUrl}
                            >
                                Open Preview
                            </Button>
                            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => window.print()}>
                                Print QR
                            </Button>
                            <Button
                                variant="outline"
                                className="flex-1 rounded-xl gap-2"
                                onClick={async () => {
                                    if (navigator.share) {
                                        try {
                                            await navigator.share({
                                                title: 'Give us feedback',
                                                text: 'How was your experience?',
                                                url: feedbackUrl,
                                            });
                                        } catch (err) {
                                            console.error('Error sharing:', err);
                                        }
                                    } else {
                                        navigator.clipboard.writeText(feedbackUrl);
                                        toast({
                                            title: "Link Copied",
                                            description: "Native sharing not supported, link copied to clipboard.",
                                        });
                                    }
                                }}
                            >
                                <Share2 className="h-4 w-4" />
                                Share
                            </Button>
                        </div>
                        <div className="flex flex-col w-full gap-2 mb-4">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">QR Destination URL</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="https://your-site.com"
                                    className="flex-grow text-sm border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-primary outline-none"
                                    value={customUrl}
                                    onChange={(e) => setCustomUrl(e.target.value)}
                                />
                                <Button
                                    size="icon"
                                    variant="outline"
                                    className="rounded-lg shrink-0"
                                    onClick={() => {
                                        if (feedbackUrl) {
                                            navigator.clipboard.writeText(feedbackUrl);
                                            toast({ title: "Link Copied!", description: "Feedback URL copied to clipboard." });
                                        }
                                    }}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                            <p className="text-[10px] text-slate-400">
                                Link: <span className="font-mono text-primary break-all">{feedbackUrl || "Generating..."}</span>
                            </p>
                            <p className="text-[10px] text-slate-400">
                                Leave blank to use current domain ({typeof window !== "undefined" ? window.location.host : ""})
                            </p>
                        </div>

                        <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 text-xs flex gap-3">
                            <AlertCircle className="h-5 w-5 shrink-0 text-blue-500" />
                            <div>
                                <p className="font-bold mb-1 underline">Testing on your phone?</p>
                                <p className="leading-relaxed">
                                    Your phone cannot reach <code className="bg-blue-100 px-1 rounded">localhost</code>. To test, enter your computer's IP (e.g., <code className="bg-blue-100 px-1 rounded">http://192.168.1.5:3002</code>) in the URL box above.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Performance Stats */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="shadow-xl border-none overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Star className="h-24 w-24 fill-yellow-400 text-yellow-400" />
                        </div>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium uppercase tracking-wider text-slate-500">Average Rating</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-5xl font-bold text-slate-900 mb-2">{averageRating.toFixed(1)}</div>
                            <div className="flex items-center gap-1 mb-4">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <Star key={i} className={`h-5 w-5 ${i <= Math.round(averageRating) ? "fill-yellow-400 text-yellow-400" : "text-slate-200"}`} />
                                ))}
                            </div>
                            <p className="text-muted-foreground">Based on {feedback.length} customer reviews.</p>
                        </CardContent>
                    </Card>

                    <Card className="shadow-xl border-none overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <TrendingUp className="h-24 w-24 text-emerald-500" />
                        </div>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium uppercase tracking-wider text-slate-500">Sentiment Score</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-5xl font-bold text-slate-900 mb-2">84%</div>
                            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-4">
                                <div className="bg-emerald-500 h-full w-[84%]" />
                            </div>
                            <p className="text-muted-foreground">Positive sentiment is trending up this month.</p>
                        </CardContent>
                    </Card>

                    {/* AI Insights Card */}
                    <Card className="md:col-span-2 shadow-2xl border-none bg-indigo-900 text-white overflow-hidden relative min-h-[300px]">
                        <div className="absolute -bottom-20 -right-20 opacity-10">
                            <Sparkles className="h-64 w-64" />
                        </div>
                        <CardHeader className="border-b border-indigo-800/50">
                            <CardTitle className="flex items-center gap-2 text-xl italic font-headline underline decoration-primary decoration-4 underline-offset-8">
                                <Sparkles className="h-6 w-6 text-primary" />
                                Smart AI Recommendations
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="py-8">
                            {analyzing ? (
                                <div className="space-y-4">
                                    <div className="h-4 bg-indigo-800/50 rounded-full w-3/4 animate-pulse" />
                                    <div className="h-4 bg-indigo-800/50 rounded-full w-full animate-pulse" />
                                    <div className="h-4 bg-indigo-800/50 rounded-full w-5/6 animate-pulse" />
                                    <div className="h-4 bg-indigo-800/50 rounded-full w-2/3 animate-pulse pt-4" />
                                    <div className="h-4 bg-indigo-800/50 rounded-full w-full animate-pulse" />
                                </div>
                            ) : insights ? (
                                <div className="prose prose-invert max-w-none prose-p:text-slate-200 prose-headings:text-white prose-strong:text-primary">
                                    {insights.split('\n').map((line, i) => {
                                        if (line.startsWith('###')) return <h3 key={i} className="text-xl font-bold mt-4 mb-2">{line.replace('###', '')}</h3>;
                                        if (line.match(/^\d\./)) return <p key={i} className="ml-4 mb-1 pl-2 border-l-2 border-primary/30"><strong>{line}</strong></p>;
                                        return <p key={i} className="mb-2 text-slate-200 leading-relaxed">{line}</p>;
                                    })}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center py-12">
                                    <div className="bg-indigo-800/50 p-4 rounded-full mb-4">
                                        <Info className="h-8 w-8 text-primary" />
                                    </div>
                                    <p className="text-lg text-slate-300 max-w-md mx-auto">
                                        Click the button above to have AI analyze your feedback and suggest improvements.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Recent Feedback Feed */}
            <div className="space-y-4 mt-12">
                <h3 className="text-2xl font-bold font-headline">Recent Feedback</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {feedback.map((f) => (
                        <Card key={f.id} className="shadow-md hover:shadow-lg transition-shadow border-none bg-slate-50/50">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex gap-0.5">
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <Star key={i} className={`h-4 w-4 ${i <= f.rating ? "fill-yellow-400 text-yellow-400" : "text-slate-200"}`} />
                                        ))}
                                    </div>
                                    <span className="text-xs text-slate-400">
                                        {f.timestamp ? new Date(f.timestamp.seconds * 1000).toLocaleDateString() : 'Just now'}
                                    </span>
                                </div>
                                <p className="text-slate-700 italic">"{f.comment || "No comment provided."}"</p>
                            </CardContent>
                        </Card>
                    ))}
                    {feedback.length === 0 && (
                        <div className="col-span-full py-12 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400">
                            <MessageSquare className="h-12 w-12 mb-2 opacity-20" />
                            <p>No feedback received yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
