/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./*.{js,ts,jsx,tsx}",           // Matches App.tsx, index.tsx in root
        "./pages/**/*.{js,ts,jsx,tsx}",  // Matches everything in pages folder
        "./components/**/*.{js,ts,jsx,tsx}", // Matches everything in components folder
        "./services/**/*.{js,ts,jsx,tsx}", // Matches services
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                // Map standard names to CSS variables for dynamic switching
                serif: ['var(--font-body)', 'serif'],
                display: ['var(--font-display)', 'serif'],
                sans: ['Inter', 'sans-serif'], // Keep generic sans available
            },
            borderRadius: {
                // Dynamic radius
                md: 'var(--radius-btn)',
                lg: 'calc(var(--radius-btn) + 2px)',
                xl: 'calc(var(--radius-btn) + 4px)',
            },
            colors: {
                brand: {
                    primary: 'rgb(var(--color-primary) / <alpha-value>)',
                    red: '#8B0000',
                    light: '#f8f9fa',
                    border: '#dee2e6',
                },
                // Semantic Entity Colors
                entity: {
                    item: 'rgb(var(--color-item) / <alpha-value>)',
                    condition: 'rgb(var(--color-condition) / <alpha-value>)',
                    power: 'rgb(var(--color-power) / <alpha-value>)',
                    note: 'rgb(var(--color-note) / <alpha-value>)',
                    draft: 'rgb(var(--color-draft) / <alpha-value>)',
                },
                gray: {
                    750: '#2d3748',
                    850: '#1a202c',
                    950: '#171923',
                }
            },
            boxShadow: {
                'panel': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                'inset': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
            }
        }
    },
    plugins: [],
}