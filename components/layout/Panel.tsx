import React from 'react';
import clsx from 'clsx';

export interface PanelProps extends React.HTMLAttributes<HTMLElement> {
  /** The main title to display in the header bar. */
  title: string;
  /** Optional content for the right side of the header (e.g., draft status). */
  headerRightContent?: React.ReactNode;
  /** Optional content for the left side of the header (e.g., draft status). */
  headerLeftContent?: React.ReactNode;
  /** The main content of the panel. */
  children: React.ReactNode;
  /** Additional classes for the outer container. */
  className?: string;
  /** Additional classes for the inner content wrapper (p-4). */
  contentClassName?: string;
}

/**
 * A layout component for presenting content in a distinct, card-like panel
 * with a standardized header bar.
 */
const Panel: React.FC<PanelProps> = ({
                                       title,
                                       headerRightContent,
                                       headerLeftContent,
                                       children,
                                       className,
                                       contentClassName,
                                       ...rest
                                     }) => {
  // Base styling from CreateItem's panel div:
  const panelClasses = clsx(
    "bg-white dark:bg-gray-800",
    "rounded-lg shadow-panel border border-gray-300 dark:border-gray-600",
    "overflow-hidden",
    className
  );

  // Header styling from CreateItem:
  const headerClasses = clsx(
    "bg-gray-100 dark:bg-gray-700",
    "px-4 py-2 border-b border-gray-300 dark:border-gray-600",
    "flex justify-between items-center gap-2"
  );

  // Title styling from CreateItem:
  const titleClasses = clsx(
    "text-lg font-display font-bold text-gray-800 dark:text-gray-100",
    "truncate"
  );

  return (
    <section
      {...rest}
      className={panelClasses}
    >
      {/* Panel Header */}
      <div className={headerClasses}>

        <div className="flex items-center gap-2">
          {headerLeftContent && (
            <div className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
              {headerLeftContent}
            </div>
          )}
        </div>

        <h2 className={clsx(titleClasses, "flex-1 text-center")}>
          {title}
        </h2>

        <div className="flex items-center gap-2">
          {headerRightContent && (
            <div className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
              {headerRightContent}
            </div>
          )}
        </div>
      </div>

      {/* Panel Content Area */}
      <div className={clsx("p-4", contentClassName)}>
        {children}
      </div>
    </section>
  );
};

export default Panel;
