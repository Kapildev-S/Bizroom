
'use client';

import React from 'react';
import { PosterOutput } from '@/app/actions/posterActions';
import {
    Tag, ShoppingBag, Heart, Star, Briefcase,
    Calendar, Music, Gift, PartyPopper, Zap,
    Sparkles, Percent, Globe, Phone, MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Icon Mapper
const iconMap: Record<string, React.ElementType> = {
    'tag': Tag,
    'shopping-bag': ShoppingBag,
    'heart': Heart,
    'star': Star,
    'briefcase': Briefcase,
    'calendar': Calendar,
    'music': Music,
    'gift': Gift,
    'party-popper': PartyPopper,
    'zap': Zap,
    'percent': Percent,
    'globe': Globe,
    'phone': Phone,
    'map-pin': MapPin,
};

interface SmartPosterProps {
    data: PosterOutput;
    zoom?: number; // Kept for API compatibility but unused for internal sizing
}

export function SmartPoster({ data }: SmartPosterProps) {
    const { content, style, visuals } = data;

    // Choose Icon
    const IconComponent = iconMap[visuals.iconKeyword] || Sparkles;

    // Font Styles
    const fontClass = {
        'sans': 'font-sans',
        'serif': 'font-serif',
        'display': 'font-extrabold tracking-tight',
        'handwritten': 'font-serif italic',
    }[style.fontPairing] || 'font-sans';

    // Layout Styles based on Theme
    const containerStyle = {
        backgroundColor: style.colorPalette.background,
        color: style.colorPalette.text,
        borderColor: style.colorPalette.secondary,
    };

    return (
        <div
            id="poster-canvas"
            className={cn(
                "relative flex flex-col items-center text-center shadow-2xl overflow-hidden bg-white",
                fontClass
            )}
            style={{
                ...containerStyle,
                width: '1080px',
                height: '1080px',
                // We do NOT apply zoom here. Scaling is handled by the parent container.
            }}
        >
            {/* Background Texture/Gradient */}
            {style.theme === 'modern' && (
                <div
                    className="absolute inset-0 opacity-20 z-0"
                    style={{
                        background: `linear-gradient(135deg, ${style.colorPalette.primary}, ${style.colorPalette.secondary})`
                    }}
                />
            )}
            {style.theme === 'festive' && (
                <div className="absolute inset-0 border-[40px] border-double opacity-40 z-0"
                    style={{ borderColor: style.colorPalette.secondary }}
                />
            )}

            {/* Main Content Flex Container - Distributes space vertically */}
            <div className="relative z-10 flex flex-col items-center justify-between w-full h-full p-16">

                {/* Header Section: Headline */}
                <div className="flex flex-col items-center gap-8 w-full flex-grow-[2] justify-center">
                    <div
                        className="p-8 rounded-full shadow-lg mb-4"
                        style={{ backgroundColor: style.colorPalette.primary, color: style.colorPalette.background }}
                    >
                        <IconComponent size={80} strokeWidth={1.5} />
                    </div>

                    <h1
                        className="text-[6rem] font-black leading-[1.1] drop-shadow-sm max-w-4xl break-words"
                        style={{ color: style.colorPalette.primary }}
                    >
                        {content.headline}
                    </h1>
                </div>

                {/* Middle Section: Subtext & Visuals */}
                <div className="flex flex-col items-center gap-8 my-4 flex-grow-[1] justify-center">
                    <p className="text-5xl font-medium opacity-90 max-w-3xl mx-auto leading-normal">
                        {content.subtext}
                    </p>

                    <div className="flex gap-4 text-7xl animate-bounce-slow mt-4">
                        {visuals.emojis.map((e, index) => <span key={index}>{e}</span>)}
                    </div>
                </div>

                {/* Bottom Section: CTA & Footer */}
                <div className="flex flex-col items-center gap-12 w-full pb-8 flex-grow-[0] justify-end">
                    <div
                        className="px-16 py-6 text-5xl font-bold rounded-full shadow-xl transform transition hover:scale-105 cursor-pointer"
                        style={{ backgroundColor: style.colorPalette.secondary, color: style.colorPalette.primary }}
                    >
                        {content.cta}
                    </div>

                    {content.footer && (
                        <div className="text-3xl opacity-75 font-medium border-t pt-6 w-2/3 border-current">
                            {content.footer}
                        </div>
                    )}
                </div>
            </div>

            {/* Decorative Corner Elements for Luxury */}
            {style.theme === 'luxury' && (
                <>
                    <div className="absolute top-8 left-8 w-32 h-32 border-t-[8px] border-l-[8px]" style={{ borderColor: style.colorPalette.primary }} />
                    <div className="absolute bottom-8 right-8 w-32 h-32 border-b-[8px] border-r-[8px]" style={{ borderColor: style.colorPalette.primary }} />
                </>
            )}
        </div>
    );
}
