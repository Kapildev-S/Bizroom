
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function FeedbackPage() {
    const params = useParams();
    const shopId = params.id as string;
    const { toast } = useToast();

    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [shopName, setShopName] = useState("the shop");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchShopInfo() {
            if (!shopId) return;
            try {
                // Try to get shop name from businessProfile settings
                const settingsDoc = await getDoc(doc(db, `users/${shopId}/settings`, 'appSettings'));
                if (settingsDoc.exists()) {
                    const data = settingsDoc.data();
                    if (data.businessProfile?.businessName) {
                        setShopName(data.businessProfile.businessName);
                    }
                }
            } catch (error) {
                console.error("Error fetching shop info:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchShopInfo();
    }, [shopId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) {
            toast({
                variant: "destructive",
                title: "Rating Required",
                description: "Please select a rating before submitting.",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, `users/${shopId}/feedback`), {
                rating,
                comment,
                timestamp: serverTimestamp(),
            });
            setIsSubmitted(true);
            toast({
                title: "Feedback Submitted",
                description: "Thank you for your valuable feedback!",
            });
        } catch (error) {
            console.error("Error submitting feedback:", error);
            toast({
                variant: "destructive",
                title: "Submission Failed",
                description: "Something went wrong. Please try again later.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (isSubmitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
                <Card className="max-w-md w-full text-center py-12 px-6 shadow-xl">
                    <div className="flex justify-center mb-6">
                        <CheckCircle2 className="h-16 w-16 text-green-500" />
                    </div>
                    <CardTitle className="text-2xl mb-2 font-headline">Thank You!</CardTitle>
                    <CardDescription className="text-lg">
                        Your feedback helps {shopName} improve their service.
                    </CardDescription>
                    <Button
                        className="mt-8"
                        variant="outline"
                        onClick={() => {
                            setIsSubmitted(false);
                            setRating(0);
                            setComment("");
                        }}
                    >
                        Submit Another
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
            <Card className="max-w-md w-full shadow-2xl border-t-4 border-t-primary">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-headline font-bold text-slate-900">Shared Your Experience</CardTitle>
                    <CardDescription className="text-slate-500 text-lg">
                        How was your visit to <span className="font-semibold text-primary">{shopName}</span>?
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="flex flex-col items-center gap-4">
                            <p className="font-medium text-slate-700">Rate your experience</p>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        className="transition-transform hover:scale-125 focus:outline-none"
                                        onMouseEnter={() => setHover(star)}
                                        onMouseLeave={() => setHover(0)}
                                        onClick={() => setRating(star)}
                                    >
                                        <Star
                                            className={`h-10 w-10 ${(hover || rating) >= star
                                                    ? "fill-yellow-400 text-yellow-400"
                                                    : "text-slate-300 fill-transparent"
                                                } transition-colors`}
                                        />
                                    </button>
                                ))}
                            </div>
                            {rating > 0 && (
                                <p className="text-sm font-semibold text-primary animate-in fade-in zoom-in duration-300">
                                    {rating === 1 && "Poor"}
                                    {rating === 2 && "Fair"}
                                    {rating === 3 && "Good"}
                                    {rating === 4 && "Very Good"}
                                    {rating === 5 && "Excellent!"}
                                </p>
                            )}
                        </div>

                        <div className="space-y-3">
                            <p className="font-medium text-slate-700">Tell us more (optional)</p>
                            <Textarea
                                placeholder="What did you like? What could be better?"
                                className="min-h-[120px] resize-none focus:ring-2 focus:ring-primary rounded-xl"
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full py-6 text-lg font-bold rounded-xl shadow-lg transition-all hover:translate-y-[-2px] active:translate-y-[0]"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                "Submit Feedback"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
