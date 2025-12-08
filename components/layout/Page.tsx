import React from 'react';

type PageWidth = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface PageProps {
  /** Controls max-width container size. The default 'xl' is wider than the original 'landscape:w-9/12' for flexibility. */
  maxWidth?: PageWidth;
  /** Additional classes for custom layout (e.g. landscape:w-9/12, or just 'mt-10'). */
  className?: string;
  /** Center content vertically? (Optional, kept from original). */
  center?: boolean;
  children: React.ReactNode;
}

const widthMap: Record<PageWidth, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl', // Changed from original 'lg' to 'xl' for a more spacious default look, feel free to adjust
  full: 'max-w-full',
};

/**
 * A layout component for setting up the main page container.
 * It applies default padding, centering, and width settings.
 */
const Page: React.FC<PageProps> = ({
                                     maxWidth = 'xl',
                                     className = '',
                                     center = false,
                                     children,
                                   }) => {
  // Matches the base classes from your CreateItem page's outer div:
  // mx-auto (center), mt-2 (margin top), px-2 (padding x), w-full, landscape:w-9/12
  const baseClasses = 'flex flex-col mx-auto mt-2 px-2 w-full landscape:w-9/12';

  const align = center ? 'items-center' : '';
  const width = widthMap[maxWidth];

  return (
    <div className={`${baseClasses} ${align} ${width} ${className}`.trim()}>
      {children}
    </div>
  );
};

export default Page;