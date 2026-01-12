# Responsive Design & Device Testing Matrix

STRNGR is designed with a "Mobile-First" approach, ensuring a seamless experience across all device classes.

## Breakpoints

The application uses the following responsive breakpoints (defined in `src/client/styles/main.css` and `admin.css`):

| Breakpoint          | Target Device                         | Key Adjustments                                                                 |
| :------------------ | :------------------------------------ | :------------------------------------------------------------------------------ |
| **< 320px**         | Ultra-small (e.g., iPhone SE 1st Gen) | Reduced font sizes, minimal padding, stacked hero elements.                     |
| **320px - 480px**   | Standard Mobile                       | Single column layout, full-width chat input, optimized touch targets (44x44px). |
| **480px - 768px**   | Tablets / Large Phones                | Increased margins, grid-based feature sections, wider chat bubbles.             |
| **768px - 1024px**  | Laptops / Tablets (Landscape)         | Multi-column feature grid, sticky headers, sidebar navigation in Admin Panel.   |
| **1024px - 1440px** | Standard Desktop                      | Max-width containers for readability, hover effects enabled.                    |
| **> 1440px**        | Large Monitors                        | Fluid typography Scaling (`clamp()`), enhanced whitespace.                      |

## Specialized Media Queries

- **Mobile Landscape**: `@media (orientation: landscape) and (max-height: 500px)`
  - Optimized for short viewports to keep the chat input visible while typing.
- **High Contrast**: `@media (prefers-contrast: more)`
  - Increased border visibility and text contrast for accessibility.
- **Dark Mode**: `@media (prefers-color-scheme: dark)`
  - Automatic theme switching based on OS preferences.

## Device Testing Matrix

The following devices and browsers are targeted for verification before every release:

| Device Category           | Examples                       | Target Browsers                  | Verified |
| :------------------------ | :----------------------------- | :------------------------------- | :------- |
| **Mobile (Small)**        | iPhone SE, Jelly 2             | Safari, Chrome, Firefox          | [ ]      |
| **Mobile (Large)**        | iPhone 15 Pro Max, Pixel 8 Pro | Safari, Chrome, Samsung Internet | [ ]      |
| **Tablet**                | iPad Air, Galaxy Tab S9        | Safari, Chrome                   | [ ]      |
| **Desktop (Windows/Mac)** | Laptops, iMac                  | Chrome, Firefox, Edge, Safari    | [ ]      |
| **PWA / Standalone**      | Android App, iOS A2HS          | System Webview                   | [ ]      |

## Testing Tools

- **Chrome DevTools**: Device emulation for quick layout checks.
- **Playwright**: Automated E2E tests across Chromium, Firefox, and WebKit (Safari).
- **Lighthouse**: Performance and Accessibility audits (Targeting 90+ score).

## Performance Notes for Mobile

- **Touch Delay**: `touch-action: manipulation` used to eliminate the 300ms tap delay.
- **Viewport**: `viewport-fit=cover` used to handle "notches" on modern smartphones.
- **Lazy Loading**: Admin panel and secondary features are lazily loaded to minimize initial mobile data usage.
