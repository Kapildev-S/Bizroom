
import React from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  children?: React.ReactNode; // For the illustration or icon
  actions?: React.ReactNode; // For multiple action buttons
  actionText?: string;
  actionLink?: string;
  onActionClick?: () => void;
}

export function EmptyState({
  title,
  description,
  children,
  actions,
  actionText,
  actionLink,
  onActionClick,
}: EmptyStateProps) {
  const SingleActionButton = () => {
    if (!actionText) return null;
    
    const content = (
        <>
            <PlusCircle className="mr-2 h-4 w-4" />
            {actionText}
        </>
    );

    if (actionLink) {
      return (
        <Button asChild className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
          <Link href={actionLink}>{content}</Link>
        </Button>
      );
    }
    if (onActionClick) {
      return (
        <Button onClick={onActionClick} className="mt-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
          {content}
        </Button>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col items-center justify-center text-center p-10 border-2 border-dashed border-border rounded-lg bg-card mt-6">
      {children && <div className="mb-4">{children}</div>}
      <h3 className="text-xl font-semibold text-foreground mb-2 font-headline">{title}</h3>
      <p className="text-muted-foreground max-w-sm">{description}</p>
      {actions ? (
         <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
          {actions}
        </div>
      ) : (
        <SingleActionButton />
      )}
    </div>
  );
}
