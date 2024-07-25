import type { ComponentProps } from 'react';
import { cx } from 'class-variance-authority';
import { Check, type LucideIcon, TriangleAlert } from 'lucide-react';

export type AlertStatus = 'success' | 'error' | 'warning';
export type AlertProps = ComponentProps<'div'> & {
  status: AlertStatus;
};

export function Alert({ className, status, children, ...props }: AlertProps) {
  const alertStatusIcons: Record<AlertStatus, LucideIcon> = {
    success: Check,
    error: TriangleAlert,
    warning: TriangleAlert,
  };

  const AlertStatusIcon = alertStatusIcons[status];

  return (
    <div
      className={cx(
        'flex items-center gap-3 px-5 py-4 rounded-lg',
        {
          'text-green-900 bg-green-100': status === 'success',
          'text-red-900 bg-red-100': status === 'error',
          'text-orange-900 bg-orange-100': status === 'warning',
        },
        className
      )}
      {...props}>
      <AlertStatusIcon className="w-6 h-6" />
      {children}
    </div>
  );
}
