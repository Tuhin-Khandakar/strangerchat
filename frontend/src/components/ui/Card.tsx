// components/ui/Card.tsx

import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  border?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, hover = false, border = true, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-lg bg-white p-6',
        border && 'border border-gray-200',
        hover && 'hover:shadow-lg hover:border-blue-200 transition-all',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

Card.displayName = 'Card';

export const CardHeader = ({ title, subtitle, action, className }: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) => (
  <div className={cn("flex justify-between items-start mb-4", className)}>
    <div>
      <h2 className="text-xl font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
    {action}
  </div>
);

export const CardBody = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("text-gray-700", className)}>{children}</div>
);

export const CardFooter = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn("border-t border-gray-200 mt-4 pt-4 flex gap-2 justify-end", className)}>
    {children}
  </div>
);
