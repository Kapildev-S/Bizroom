import { useMemo } from 'react';
import { useSettings } from './useData';

export function useSubscription() {
    const { settings, isLoading, error, mutate } = useSettings();

    const subscriptionStatus = useMemo(() => {
        if (isLoading) return { isPremium: false, isExpired: false, expiryDate: null, loading: true };
        if (!settings) return { isPremium: false, isExpired: false, expiryDate: null, loading: false };

        const isPremiumStatus = settings.subscriptionStatus === 'premium';
        const expiryDate = settings.premiumExpiry ? new Date(settings.premiumExpiry) : null;
        
        // If there's an expiry date and it's in the past, they are expired. Default to false if no expiry date is set.
        const isExpired = expiryDate ? new Date() > expiryDate : false;
        
        const isPremium = isPremiumStatus && !isExpired;

        return {
            isPremium,
            isExpired,
            expiryDate,
            loading: false,
            settings
        };
    }, [settings, isLoading]);

    return { ...subscriptionStatus, error, mutateSettings: mutate };
}
