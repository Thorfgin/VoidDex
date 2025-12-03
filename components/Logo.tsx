import React, { useState } from 'react';

interface LogoProps {
    className?: string;
}

const Logo: React.FC<LogoProps> = ({ className = "" }) => {
    const [imgError, setImgError] = useState(false);

    if (imgError) {
        return (
            <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={className}
                aria-label="VoidDex Shield Logo"
            >
                <path
                    d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                    fill="#8B0000"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                />
                <path
                    d="M7 8 L10.5 17 L14 6 L16.5 16 M12 13 H15.5"
                    stroke="white"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        );
    }

    return (
        <img
            src="/logo.png"
            alt="VoidDex Logo"
            className={`object-contain ${className}`}
            onError={() => setImgError(true)}
        />
    );
};

export default Logo;