// tailwind.config.cjs
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js,jsx,ts,tsx}",
    "./index.html"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "surface": "var(--color-surface)",
        "primary": "var(--color-primary)",
        "primary-fixed": "var(--color-primary-fixed)",
        "primary-fixed-dim": "var(--color-primary-fixed-dim)",
        "on-primary": "var(--color-on-primary)",
        "on-primary-fixed-variant": "var(--color-on-primary-fixed-variant)",
        "secondary": "var(--color-secondary)",
        "secondary-fixed": "var(--color-secondary-fixed)",
        "on-secondary": "var(--color-on-secondary)",
        "tertiary": "var(--color-tertiary)",
        "on-tertiary": "var(--color-on-tertiary)",
        "surface-variant": "var(--color-surface-variant)",
        "surface-container-low": "var(--color-surface-container-low)",
        "surface-container": "var(--color-surface-container)",
        "surface-container-highest": "var(--color-surface-container-highest)",
        "on-surface": "var(--color-on-surface)",
        "on-surface-variant": "var(--color-on-surface-variant)",
        "outline": "var(--color-outline)",
        "primary-gradient": "var(--color-primary-gradient)"
      },
      borderRadius: {
        DEFAULT: "var(--radius-sm)",
        lg: "var(--radius-md)",
        xl: "var(--radius-lg)",
        full: "var(--radius-full)"
      },
      spacing: {
        "container-max": "var(--spacing-container-max)",
        "element-gap": "var(--spacing-element-gap)",
        "section-gap": "var(--spacing-section-gap)",
        gutter: "var(--spacing-gutter)",
        "margin-mobile": "var(--spacing-margin-mobile)"
      },
      fontFamily: {
        "body-md": ["Inter"],
        "body-lg": ["Inter"],
        "title-md": ["Geist"],
        "headline-lg": ["Geist"],
        "headline-lg-mobile": ["Geist"],
        "display-lg": ["Geist"],
        "label-sm": ["Geist"],
        "certificate-name": ["Geist"]
      },
      fontSize: {
        "display-lg": ["48px", { lineHeight: "56px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-lg-mobile": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "title-md": ["20px", { lineHeight: "28px", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "label-sm": ["12px", { lineHeight: "16px", letterSpacing: "0.05em", fontWeight: "500" }],
        "certificate-name": ["36px", { lineHeight: "1.2", fontWeight: "700" }]
      }
    }
  },
  plugins: []
};
