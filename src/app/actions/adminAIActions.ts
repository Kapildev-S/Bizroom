"use server";

import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: 'bill-7362b',
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
        }),
    });
}

const db = admin.firestore();
const ADMIN_ID = '3l2SpTceF9Qany7x5IRHdHBPU9J3';
const COLLECTION = 'ai_usage_logs';

export type AIUsageLog = {
    id: string;
    userId: string;
    feature: string;
    status: 'success' | 'error';
    estimatedTokens: number;
    promptLength: number;
    durationMs: number;
    createdAt: string;
};

export type AIUsageStats = {
    totalRequests: number;
    totalTokens: number;
    successCount: number;
    errorCount: number;
    successRate: number;
    avgDurationMs: number;
    // By feature
    featureBreakdown: { feature: string; count: number; tokens: number; errors: number }[];
    // By user
    userBreakdown: { userId: string; count: number; tokens: number; lastActive: string }[];
    // Daily trend (last 14 days)
    dailyTrend: { date: string; requests: number; tokens: number }[];
    // Hourly heatmap for today
    hourlyToday: { hour: string; count: number }[];
    // Recent logs
    recentLogs: AIUsageLog[];
};

export async function fetchRealAIStats(adminId: string): Promise<AIUsageStats> {
    if (adminId !== ADMIN_ID) throw new Error("Unauthorized");

    const snap = await db.collection(COLLECTION)
        .orderBy('timestamp', 'desc')
        .limit(2000)
        .get();

    const logs: AIUsageLog[] = snap.docs.map(doc => {
        const d = doc.data();
        return {
            id: doc.id,
            userId: d.userId || 'unknown',
            feature: d.feature || 'General Chat',
            status: d.status || 'success',
            estimatedTokens: d.estimatedTokens || 0,
            promptLength: d.promptLength || 0,
            durationMs: d.durationMs || 0,
            createdAt: d.createdAt || '',
        };
    });

    const totalRequests = logs.length;
    const totalTokens = logs.reduce((s, l) => s + l.estimatedTokens, 0);
    const successCount = logs.filter(l => l.status === 'success').length;
    const errorCount = logs.filter(l => l.status === 'error').length;
    const successRate = totalRequests > 0 ? Math.round((successCount / totalRequests) * 100) : 100;
    const avgDurationMs = totalRequests > 0 ? Math.round(logs.reduce((s, l) => s + l.durationMs, 0) / totalRequests) : 0;

    // Feature breakdown
    const featureMap: Record<string, { count: number; tokens: number; errors: number }> = {};
    logs.forEach(l => {
        if (!featureMap[l.feature]) featureMap[l.feature] = { count: 0, tokens: 0, errors: 0 };
        featureMap[l.feature].count++;
        featureMap[l.feature].tokens += l.estimatedTokens;
        if (l.status === 'error') featureMap[l.feature].errors++;
    });
    const featureBreakdown = Object.entries(featureMap)
        .map(([feature, v]) => ({ feature, ...v }))
        .sort((a, b) => b.count - a.count);

    // User breakdown
    const userMap: Record<string, { count: number; tokens: number; lastActive: string }> = {};
    logs.forEach(l => {
        if (!userMap[l.userId]) userMap[l.userId] = { count: 0, tokens: 0, lastActive: l.createdAt };
        userMap[l.userId].count++;
        userMap[l.userId].tokens += l.estimatedTokens;
        if (l.createdAt > userMap[l.userId].lastActive) {
            userMap[l.userId].lastActive = l.createdAt;
        }
    });
    const userBreakdown = Object.entries(userMap)
        .map(([userId, v]) => ({ userId, ...v }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 50);

    // Daily trend — last 14 days
    const dailyMap: Record<string, { requests: number; tokens: number }> = {};
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        dailyMap[key] = { requests: 0, tokens: 0 };
    }
    logs.forEach(l => {
        const key = l.createdAt?.split('T')[0];
        if (key && dailyMap[key] !== undefined) {
            dailyMap[key].requests++;
            dailyMap[key].tokens += l.estimatedTokens;
        }
    });
    const dailyTrend = Object.entries(dailyMap).map(([date, v]) => ({
        date: new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        ...v,
    }));

    // Hourly for today
    const todayStr = today.toISOString().split('T')[0];
    const hourlyMap: Record<number, number> = {};
    for (let h = 0; h < 24; h++) hourlyMap[h] = 0;
    logs.forEach(l => {
        if (l.createdAt?.startsWith(todayStr)) {
            const h = new Date(l.createdAt).getHours();
            hourlyMap[h] = (hourlyMap[h] || 0) + 1;
        }
    });
    const hourlyToday = Object.entries(hourlyMap).map(([h, count]) => ({
        hour: `${h.toString().padStart(2, '0')}:00`,
        count,
    }));

    return {
        totalRequests,
        totalTokens,
        successCount,
        errorCount,
        successRate,
        avgDurationMs,
        featureBreakdown,
        userBreakdown,
        dailyTrend,
        hourlyToday,
        recentLogs: logs.slice(0, 100),
    };
}

// Fetch user display name from Firestore users collection
export async function fetchUserDisplayNames(adminId: string, userIds: string[]): Promise<Record<string, string>> {
    if (adminId !== ADMIN_ID) throw new Error("Unauthorized");
    if (!userIds.length) return {};

    const names: Record<string, string> = {};
    // Batch fetch in chunks of 10
    const chunks = [];
    for (let i = 0; i < userIds.length; i += 10) {
        chunks.push(userIds.slice(i, i + 10));
    }
    for (const chunk of chunks) {
        await Promise.all(chunk.map(async uid => {
            try {
                const snap = await db.collection('users').doc(uid).get();
                const data = snap.data();
                names[uid] = data?.businessName || data?.name || data?.email || uid.slice(0, 8) + '…';
            } catch {
                names[uid] = uid.slice(0, 8) + '…';
            }
        }));
    }
    return names;
}
