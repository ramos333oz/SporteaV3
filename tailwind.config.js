/** @type {import('tailwindcss').Config} */
export default {
  // Future-proof configuration for v4 compatibility
  darkMode: ["class"],
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
  prefix: "",

  // ✅ v4-compatible configuration structure
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // ✅ Font families - Mural-inspired with Inter primary
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        serif: ['Libre Baskerville', 'Georgia', 'Times New Roman', 'serif'],
        mono: ['IBM Plex Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      // ✅ shadcn/ui color system - v4 compatible CSS custom properties
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Mural-inspired brand colors
        brand: {
          primary: "#FF4757",
          "primary-dark": "#E63946",
          "primary-light": "#FF6B7A",
        },
        // Mural secondary colors
        "mural-blue": "#4A90E2",
        "mural-green": "#2ECC71",
        "mural-purple": "#9B59B6",
        "mural-orange": "#F39C12",
        "mural-pink": "#E91E63",
        "mural-teal": "#1ABC9C",
        // Template colors
        "template-green": "#34C759",
        "template-light-green": "#A8E6CF",
        "template-blue": "#007AFF",
        "template-purple": "#AF52DE",
        "template-pink": "#FF2D92",
        "template-orange": "#FF9500",
        "template-red": "#FF3B30",
      },
      // Mural-inspired spacing scale (8px grid)
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '48px',
        '3xl': '64px',
        '4xl': '96px',
      },
      // Mural-inspired border radius
      borderRadius: {
        'none': '0px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
        'full': '9999px',
        // shadcn/ui compatibility
        'shadcn-lg': "var(--radius)",
        'shadcn-md': "calc(var(--radius) - 2px)",
        'shadcn-sm': "calc(var(--radius) - 4px)",
      },
      // Mural-inspired shadows
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'card': '0 2px 8px rgba(0, 0, 0, 0.12)',
        'modal': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'hover': '0 4px 16px rgba(0, 0, 0, 0.15)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [import("tailwindcss-animate")],
}
