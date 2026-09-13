---
name: Pathwisse Certificates System
colors:
  surface: '#131316'
  surface-dim: '#131316'
  surface-bright: '#39393c'
  surface-container-lowest: '#0e0e11'
  surface-container-low: '#1c1b1e'
  surface-container: '#201f22'
  surface-container-high: '#2a2a2d'
  surface-container-highest: '#353438'
  on-surface: '#e5e1e5'
  on-surface-variant: '#ccc3d8'
  inverse-surface: '#e5e1e5'
  inverse-on-surface: '#313033'
  outline: '#958da1'
  outline-variant: '#4a4455'
  surface-tint: '#d2bbff'
  primary: '#d2bbff'
  on-primary: '#3f008e'
  primary-container: '#7c3aed'
  on-primary-container: '#ede0ff'
  inverse-primary: '#732ee4'
  secondary: '#ddb7ff'
  on-secondary: '#490080'
  secondary-container: '#6f00be'
  on-secondary-container: '#d6a9ff'
  tertiary: '#ddb8ff'
  on-tertiary: '#490081'
  tertiary-container: '#844abe'
  on-tertiary-container: '#f2e0ff'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#eaddff'
  primary-fixed-dim: '#d2bbff'
  on-primary-fixed: '#25005a'
  on-primary-fixed-variant: '#5a00c6'
  secondary-fixed: '#f0dbff'
  secondary-fixed-dim: '#ddb7ff'
  on-secondary-fixed: '#2c0051'
  on-secondary-fixed-variant: '#6900b3'
  tertiary-fixed: '#f0dbff'
  tertiary-fixed-dim: '#ddb8ff'
  on-tertiary-fixed: '#2c0051'
  on-tertiary-fixed-variant: '#62259b'
  background: '#131316'
  on-background: '#e5e1e5'
  surface-variant: '#353438'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  title-md:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  certificate-name:
    fontFamily: Geist
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1200px
  gutter: 24px
  margin-mobile: 16px
  section-gap: 64px
  element-gap: 16px
---

## Brand & Style

The design system is centered on a **Premium Dark** aesthetic, blending **Minimalism** with **Glassmorphism** to evoke a sense of high-value achievement and professional growth. The target audience consists of professionals and learners who view certificates as a milestone in their career trajectory.

The UI should feel atmospheric and "deep," achieved through a layering strategy of near-black surfaces, subtle noise textures, and localized purple light leaks. It prioritizes clarity and high-fidelity execution over excessive decoration, ensuring the certificate — the ultimate proof of value — remains the focal point.

**Key Visual Pillars:**
- **Atmospheric Depth:** Use of subtle radial gradients (blooms) in the background to prevent a flat "dead" dark mode.
- **Dimensional Glass:** Surfaces utilize semi-transparency and blurred backdrops to create a sense of physical layering.
- **Refined Precision:** Thin, low-opacity borders and crisp typography communicate trustworthiness and technical excellence.

## Colors

The palette is anchored in a deep, "obsidian" neutral scale to provide maximum contrast for the vibrant purple brand accents.

- **Primary Canvas:** The background is a true dark `#050507`.
- **Surfaces:** Use `#0B0B10` for main containers and `#101017` for elevated elements like inputs or secondary cards.
- **Brand Purple Scale:** Transitions from a deep, authoritative `#7C3AED` (Primary) to a luminous `#C084FC` (Highlight).
- **Functional Accents:** Use the highlight purple sparingly for edge lighting, active states, and focus rings to guide the eye through the "darkness."

## Typography

This design system uses a dual-font strategy to balance technical precision with extreme legibility.

**Geist** is utilized for headlines, titles, and labels. Its mono-influenced spacing and geometric construction reinforce the professional and modern tone. **Inter** is reserved for body copy and metadata to ensure effortless reading over long sessions.

For the **Certificate** itself, typography should switch to a high-contrast ink-on-paper feel (Dark on Light). Use `Geist` for the recipient's name at a significant scale to celebrate the achievement.

## Layout & Spacing

The layout follows a **Fixed Grid** model for desktop to maintain a premium, editorial feel that doesn't feel overly "stretched."

- **Desktop (1200px+):** 12-column grid. Session cards are displayed in a horizontal layout, maximizing the use of screen width for metadata like date, duration, and instructor.
- **Tablet:** 8-column grid. Margins increase to 32px to provide breathing room.
- **Mobile:** 4-column grid. Session cards reflow to a vertical orientation to prioritize the session title and the primary "View Certificate" action.

**Spacing Rhythm:** A 4px/8px base unit is used. Section headers should have a 64px vertical margin to allow the "atmospheric purple glow" to breathe between content blocks.

## Elevation & Depth

Depth is conveyed through a "Glass-Stack" methodology rather than traditional shadows.

1.  **Background (Level 0):** Hex `#050507` with a 2% grain/noise texture overlay to prevent banding.
2.  **Base Layer (Level 1):** Hex `#0B0B10`. Used for the main content area or background sections.
3.  **Floating Cards (Level 2):** Semi-transparent glass.
    - Background: `rgba(16, 16, 23, 0.6)`
    - Backdrop-blur: `12px`
    - Border: `1px solid rgba(255, 255, 255, 0.08)`
4.  **Interactive States (Level 3):** When hovered, cards should apply a subtle `inner-glow` using the Primary Purple at 10% opacity and an outer bloom.

**Glows:** Apply a large, soft radial gradient (600px wide, 5% opacity Primary Purple) behind the main content area to create an "ethereal" center-focused lighting effect.

## Shapes

The shape language is sophisticated and modern, favoring generous corner radii that feel comfortable and premium.

- **Main Cards:** Use a fixed `20px` radius. This large radius complements the glassmorphism effect, making the blurred edges feel softer.
- **Buttons & Inputs:** Use a `12px` radius for a more compact, functional appearance.
- **Badges/Chips:** Use a full "Pill" shape (100px) to distinguish them from interactive buttons.

## Components

### 1. Primary Buttons
- **Style:** Linear gradient from `#7C3AED` to `#A855F7` (45-degree angle).
- **Text:** Semi-bold Geist, white.
- **Hover:** Increase saturation and add a 15px purple shadow glow (`rgba(124, 58, 237, 0.4)`).

### 2. Session Cards
- **Desktop:** Horizontal flex container. Left side holds a thumbnail or session icon; center holds title and metadata; right side holds the "Download" or "View" action.
- **Mobile:** Vertical stack. The action button becomes full-width at the bottom of the card.
- **Border:** Always `1px solid rgba(255, 255, 255, 0.08)`.

### 3. Navigation Bar
- **Style:** Minimalist top-docked bar.
- **Background:** `rgba(5, 5, 7, 0.8)` with `20px` backdrop-blur.
- **Bottom Border:** `1px solid rgba(255, 255, 255, 0.08)`.
- **Content:** Logo on the left, "My Certificates" and "Profile" links on the right.

### 4. The Certificate Viewer
- **Surface:** Off-white or pure white background (`#FFFFFF`).
- **Layout:** Landscape (3:2 aspect ratio).
- **Styling:** Professional, clean, and high-contrast. This is the only place where the dark theme is broken, to ensure the certificate feels "printable" and official. Use a very subtle "watermark" logo in the background.

### 5. Input Fields
- **Background:** `#101017`.
- **Border:** `1px solid rgba(255, 255, 255, 0.08)`.
- **Focus State:** Border color changes to `#7C3AED` with a soft inner glow.
