import React from 'react';

/**
 * ScrollbarHideStyles Component
 *
 * Encapsulates cross-browser CSS rules to completely hide the scrollbar
 * for elements using the 'custom-scrollbar' class, while maintaining scrolling functionality.
 * This component should be placed once on a page or root layout.
 */
const ScrollbarHideStyles: React.FC = () => (
  <style>
    {/* Hides the scrollbar completely while still allowing content scrolling */}
    {`.custom-scrollbar::-webkit-scrollbar {
      display: none;
      width: 0;
      height: 0;
    }`}

    {`.custom-scrollbar {
        -ms-overflow-style: none; /* IE and Edge */
        scrollbar-width: none; /* Firefox */
    }`}
  </style>
);

export default ScrollbarHideStyles;