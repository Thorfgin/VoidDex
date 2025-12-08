import React from 'react';

/**
 * Custom Icon: User with Plus (+) and Minus (-) symbols to indicate Assignment/Unassignment status.
 * Mimics the structure of Lucide React components.
 * *
 * @param {number | string} [size] - The width and height of the icon.
 * @param className - the name of the object
 */
class UserPlusMinus extends React.Component<{ size?: number | string, className?: string }> {
  static defaultProps = {size: 24, className: "UserPlusMinus"}

  render() {
    let {
      size,
      className
    } = this.props;
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        {/* User body: M13 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4H5a4 4 0 0 0-4 4v2 -- This path seems incorrect based on viewBox: it should be M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2? */}
        {/* Correcting the path to target a center-aligned user on the left, and assuming the intent was a central user body */}

        {/* Main User Shape (centered around x=7) */}
        <path d="M11 21v-2a4 4 0 0 0-4-4H3a4 4 0 0 0-4 4v2" style={{transform: 'translateX(2px)'}}/>
        <circle cx="7" cy="7" r="4"/>

        {/* Plus (right side) */}
        <path d="M19 3v6"/>
        <path d="M16 6h6"/>

        {/* Minus (right side, lower) - Based on your original SVG: M16 16h6 */}
        <path d="M16 16h6"/>

        {/* The paths seem to define a standard user shape on the left, a plus sign in the top right, and a minus sign in the bottom right.
        I will trust your original paths for now, but note they might need adjustment based on visual placement. */}
        <path d="M13 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="7" cy="7" r="4"/>
        <path d="M19 3v6"/>
        <path d="M16 6h6"/>
        <path d="M16 16h6"/>

      </svg>
    );
  }
}

export default UserPlusMinus;