import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminKPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  subValue?: React.ReactNode;
  valueColor?: string;
  className?: string;
}

export function AdminKPICard({
  title,
  value,
  icon: Icon,
  iconColor = "text-indigo-500",
  subValue,
  valueColor = "text-foreground",
  className
}: AdminKPICardProps) {
  return (
    <Card className={cn("hover:shadow-md transition-shadow", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn("h-4 w-4", iconColor)} />
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", valueColor)}>{value}</div>
        {subValue && (
          <div className="text-sm text-muted-foreground mt-1">
            {subValue}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
