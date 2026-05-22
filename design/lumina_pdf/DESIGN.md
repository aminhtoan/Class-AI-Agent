---
name: Lumina PDF
colors:
  surface: '#f7fafc'
  surface-dim: '#d7dadd'
  surface-bright: '#f7fafc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f4f6'
  surface-container: '#ebeef0'
  surface-container-high: '#e6e8eb'
  surface-container-highest: '#e0e3e5'
  on-surface: '#181c1e'
  on-surface-variant: '#3f484c'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eef1f3'
  outline: '#6f787d'
  outline-variant: '#bec8cd'
  surface-tint: '#006781'
  primary: '#005a71'
  on-primary: '#ffffff'
  primary-container: '#0e7490'
  on-primary-container: '#d3f1ff'
  inverse-primary: '#81d1f0'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#794602'
  on-tertiary: '#ffffff'
  tertiary-container: '#965e1c'
  on-tertiary-container: '#ffe8d6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b9eaff'
  primary-fixed-dim: '#81d1f0'
  on-primary-fixed: '#001f29'
  on-primary-fixed-variant: '#004d62'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#ffdcbd'
  tertiary-fixed-dim: '#ffb86f'
  on-tertiary-fixed: '#2c1600'
  on-tertiary-fixed-variant: '#693c00'
  background: '#f7fafc'
  on-background: '#181c1e'
  surface-variant: '#e0e3e5'
  status-ready: '#10B981'
  status-pending: '#F59E0B'
  status-failed: '#EF4444'
  bg-surface: '#F8FAFC'
  border-subtle: '#E2E8F0'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
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
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 800px
  gutter: 1.5rem
  section-gap: 4rem
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 2rem
---

## Brand & Style

The brand identity centers on **unobtrusive utility and intellectual clarity**. As an anonymous platform, the design must immediately establish trust without requiring a formal relationship. The personality is professional, calm, and highly focused, acting as a quiet bridge between volatile web content and permanent, readable documents.

The chosen design style is **Corporate / Modern** with **Minimalist** sensibilities.
- **Clarity of Purpose:** The interface uses heavy whitespace to direct all attention toward the central task: story ingestion and conversion.
- **Approachable Professionalism:** Soft edges and a balanced color palette reduce the technical intimidation often associated with "web crawling" and "scraping."
- **Focus:** The "Anonymous Mode" is reinforced through a "no-clutter" environment—no sidebars, no profile menus, and minimal navigation. The UI should feel like a high-end tool, not a social platform.

## Colors

The palette is anchored in a **Deep Teal (#0E7490)**, a color that communicates stability, intelligence, and technical reliability. This is paired with a sophisticated range of Slate Grays to maintain a neutral, professional atmosphere.

- **Primary:** Deep Teal for primary actions, progress bars, and active states.
- **Secondary:** Slate Gray for secondary actions and meta-information.
- **Semantic Logic:**
  - **Ready (Green):** Indicates a job is completed or a story is fully indexed.
  - **Pending (Yellow):** Indicates active processes or items in the queue.
  - **Failed (Red):** Used for errors, failed chapter fetches, or expired files.
- **Backgrounds:** Use a "paper-white" approach with subtle off-white and cool gray layers (`#F8FAFC`) to reduce eye strain and provide a clean canvas for story content.

## Typography

The design system uses **Inter** exclusively to ensure maximum legibility and a systematic, modern feel. The hierarchy is designed for "Reading" rather than "Scanning."

- **Headlines:** Utilize tighter letter spacing and semi-bold weights to create a strong visual anchor for cards and sections.
- **Body:** Standardized at 16px for optimal readability across all devices. For chapter content previews, 18px is preferred.
- **Labels:** Small caps or medium-weight uppercase labels are used for status indicators (e.g., "PENDING") and table headers to differentiate metadata from content.

## Layout & Spacing

The layout follows a **Focused Fixed Grid** model. Since the platform is utility-driven, the content is centered in a single column to minimize horizontal eye movement.

- **The Focus Column:** The main container is capped at **800px** for desktop, ensuring the input field and story lists feel monumental and easy to manage.
- **Responsive Behavior:** 
  - **Desktop:** Centered 800px column with wide margins.
  - **Tablet:** 48px side margins.
  - **Mobile:** 16px side margins.
- **Spacing Rhythm:** Use a base-8 scale. Section gaps are generous (64px+) to separate the "Input" area from the "Job Tracking" cards.

## Elevation & Depth

To maintain a "clean and modern" aesthetic, depth is created through **Tonal Layers and Soft Outlines** rather than aggressive shadows.

- **Surface Levels:** 
  - **Level 0 (Background):** Solid `#F8FAFC`.
  - **Level 1 (Cards/Inputs):** Pure White `#FFFFFF` with a 1px border in `#E2E8F0`.
- **Shadows:** Use a single, highly diffused "Ambient Shadow" for the active URL input field and primary cards to make them feel slightly lifted. 
  - *Shadow spec:* `0 4px 20px -2px rgba(15, 23, 42, 0.05)`.
- **Interactive Depth:** On hover, cards should transition to a slightly darker border color rather than increasing shadow depth to maintain the minimalist feel.

## Shapes

The shape language is **Rounded (0.5rem / 8px)**. This radius is applied to input fields, buttons, and cards.

- **Standard Radius:** 8px for most components.
- **Large Radius:** 16px for main content cards and progress bar containers.
- **Interactive Elements:** Buttons maintain the 8px radius to feel sturdy and professional. Avoid pill shapes to distinguish the brand from casual social media apps.

## Components

### Input Fields
The URL input is the most critical component. It should be oversized (56px-64px height), using a 16px or 18px font size. The focus state uses a 2px teal border.

### Primary Action Buttons
Large, high-contrast buttons with teal backgrounds and white text. For "Crawl" or "Generate PDF" actions, include a leading icon (e.g., a download or link icon) for instant recognition.

### Progress Bars
Used for SSE tracking.
- **Track:** Soft gray background (`#F1F5F9`).
- **Indicator:** Teal gradient or solid teal moving smoothly via CSS transitions.
- **Metadata:** Percentage and "X of Y Chapters" should be placed as a `label-sm` above the bar.

### Cards
Cards track individual stories or jobs. They feature:
- A header with the Story Title (`headline-md`).
- A status badge in the top right (semantic colors).
- A footer containing the secondary actions (Delete, Edit, Download).

### Chips/Badges
Small, rounded-full elements for status. They use low-saturation versions of semantic colors for the background (e.g., soft light green) with high-contrast text for the label.

### Lists (Chapters/TOC)
Clean, borderless list items with subtle hover states. Use a monospaced font or `label-sm` for chapter numbers (e.g., "CH 01") to keep them aligned and technical.