import { cx } from 'class-variance-authority';
import type { ComponentProps } from 'react';

export type InstructionsStepsProps = ComponentProps<'div'>;

export function InstructionsSteps({ className, ...props }: InstructionsStepsProps) {
  return <div className={cx('flex flex-col gap-2', className)} {...props} />;
}

export type InstructionsStepProps = ComponentProps<'div'> & {
  index: number;
};

export function InstructionsStep({ className, children, index, ...props }: InstructionsStepProps) {
  return (
    <div className={cx('flex flex-row gap-4 group', className)} {...props}>
      <div className="flex flex-col flex-0 gap-2">
        <div className="flex items-center justify-center w-8 h-8 flex-shrink-0 rounded-full border-2 bg-blue-50 border-blue-300 text-gray-700 font-bold">
          {index}
        </div>
        <div
          className="group-last:hidden w-0.5 rounded-full h-full bg-blue-300 self-center"
          role="separator"
        />
      </div>
      <div className="flex flex-col flex-1 py-1">{children}</div>
    </div>
  );
}
