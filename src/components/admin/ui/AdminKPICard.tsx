import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminKPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  subValue?: React.ReactNode;
  valueColor?: string;
  className?: string;
}

export function AdminKPICard({
  title,
  value,
  icon: Icon,
  iconColor = "text-indigo-500",
  iconBg = "bg-indigo-50",
  subValue,
  valueColor = "text-foreground",
  className
}: AdminKPICardProps) {
  return (
    <Card className={cn(
      "relative overflow-hidden hover:shadow-lg transition-all duration-300 border border-border/60 bg-card group hover:-translate-y-0.5",
      className
    )}>
      {/* Subtle gradient background on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-muted/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <CardContent className="p-4 relative">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground leading-snug pr-2">{title}</p>
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", iconBg)}>
            <Icon className={cn("h-4 w-4", iconColor)} />
          </div>
        </div>
        <div className={cn("text-2xl font-bold tracking-tight", valueColor)}>{value}</div>
        {subValue && (
          <div className="text-xs text-muted-foreground mt-1.5">{subValue}</div>
        )}
      </CardContent>
    </Card>
  );
}
