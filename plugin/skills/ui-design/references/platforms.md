# Platform Human Interface Guidelines

Use this before building native or OS-adjacent apps, or when deciding how much
platform fidelity a cross-platform UI needs.

## When to follow vs deviate

Follow the platform HIG strongly for:

- Native single-platform apps.
- Apps that compete with system apps (mail, calendar, notes, music, reminders).
- Enterprise and productivity software.
- Anything using system capabilities (Share Sheet, Siri Shortcuts, Dynamic
  Island, Live Activities, Handoff, App Intents, Widgets).

Deviate to a unified cross-platform brand when:

- Brand recognition outweighs OS fidelity (streaming, social, marketplace,
  collaboration tools).
- The product is a content-canvas pro tool (IDE, design tool, DAW).

Non-negotiable even when deviating, never rebuild these:

- Native scrolling physics, text selection, input methods (IME, autocorrect,
  predictive text).
- Right-click and long-press context menus.
- Keyboard shortcuts (⌘C/V/X/Z/A/F/N/W/T/S/,).
- Focus rings and back gestures.
- Platform accessibility APIs.
- Safe areas (status bar, home indicator, notch, Dynamic Island).
- System-preference queries: dark mode, Reduce Motion, Reduce Transparency,
  Increase Contrast, Dynamic Type, Forced Colors.

Web apps have no single platform: target WCAG 2.2 AA, 44×44 CSS px tap targets,
semantic HTML, and responsive breakpoints around 600 / 900 / 1240 px.

## Web product tools: where to take patterns from

Carbon sets visuals, tokens, and grid. When Carbon has no pattern for an
interaction, take it from these pages:

- HIG patterns: feedback, undo and redo, modality, loading, searching,
  entering data, settings, drag and drop, file management.
  https://developer.apple.com/design/human-interface-guidelines/patterns
- HIG components for tool chrome: menus, context menus, toolbars, sidebars,
  alerts, lists and tables. Same URL prefix, for example
  https://developer.apple.com/design/human-interface-guidelines/toolbars
- HIG keyboards and writing:
  https://developer.apple.com/design/human-interface-guidelines/keyboards
  https://developer.apple.com/design/human-interface-guidelines/writing
- Material 3 interaction states and state layers:
  https://m3.material.io/foundations/interaction/states/overview
- Material 3 breakpoints and canonical layouts (list-detail, supporting pane):
  https://m3.material.io/foundations/layout/breakpoints/overview
  https://m3.material.io/foundations/layout/canonical-examples/overview
- WAI-ARIA Authoring Practices for keyboard and ARIA behaviour of each widget:
  https://www.w3.org/WAI/ARIA/apg/

## Apple: Liquid Glass

Use when targeting iOS, iPadOS, macOS, watchOS, tvOS, or visionOS.

The HIG's stated principles (reintroduced June 2026) are Purpose, Agency,
Responsibility, Familiarity, Flexibility, Simplicity, Craft, and Delight. It
says simplicity is not minimalism.
https://developer.apple.com/design/human-interface-guidelines/design-principles

Rules:

- Let content lead; controls float. Shrink tab bars on scroll; do not pin chrome
  when content is the point.
- Honour lensing and concentricity. Inner corner radius = outer radius −
  padding.
- Adaptive optics: tint materials from surrounding content; auto-adapt to
  light/dark.
- Motion is a cue: context menus expand from tap point, alerts emerge where the
  user acted.
- Reduce Transparency, Increase Contrast, and Reduce Motion must apply
  automatically. Do not override.

Typography:

- SF Pro, with dynamic optical sizes: the system font adjusts its design to
  the point size, so do not pick Text or Display cuts by hand. SF Pro Rounded
  for friendliness.
- SF Compact on watchOS.
- SF Mono for code.
- New York for serif reading.
- Use semantic styles (`largeTitle`, `title1–3`, `headline`, `body`, `callout`,
  `subheadline`, `footnote`, `caption1–2`). Never hard-code point sizes.
- Support Dynamic Type from xSmall to AX5.

Colour:

- Use semantic colours (`label`, `secondaryLabel`, `systemBackground`,
  `secondarySystemBackground`, `separator`, `link`). They adapt across traits
  automatically.

Metrics:

- Control size, default / minimum: 44×44 / 28×28 pt iOS and iPadOS,
  28×28 / 20×20 pt macOS, 60×60 / 28×28 pt visionOS with 4 pt spacing.
- Status bar: ~54 pt on Dynamic Island devices.
- Home indicator: 34 pt reserved.
- Nav bar: 44 pt (96 pt large-title).
- Tab bar: 49 pt; shrinks with scroll.

Reference: https://developer.apple.com/design/human-interface-guidelines

## Google: Material 3 Expressive

Use when targeting Android or Wear OS.

Rules:

- Use physics-based springy motion for gestural response, not linear duration
  tokens.
- Use the full shape system; use shape morphing for state transitions on
  prominent controls.
- Use emphasised typography variants to differentiate hierarchy.
- Prefer short bottom bars and floating toolbars over heavy chrome.
- Always pair colour roles (`primary`/`onPrimary`, `surface`/`onSurface`):
  never pick colours that bypass the contrast guarantee.

Dynamic colour:

- Use the HCT colour space. Extract from wallpaper or a source colour.
- Generate five tonal palettes (primary, secondary, tertiary, neutral, neutral
  variant), 13 tones each.

Type scale:

- Display: 57 / 45 / 36.
- Headline: 32 / 28 / 24.
- Title, Body, Label: each large / medium / small.

Corner radius scale (dp):

`None 0, XS 4, Sm 8, Md 12, Lg 16, LgIncreased 20, XL 28, XLIncreased 32, XXL 48, Full`.

Motion:

- Springs are the primary motion system, in two schemes: standard and
  expressive. https://m3.material.io/styles/motion/overview/how-it-works
- Easing and duration tokens remain for non-spring transitions: `standard`
  curve `(0.2, 0, 0, 1)`, `emphasized` for prominent transitions, durations
  Short1 50 ms → ExtraLong4 1000 ms.

Adaptive layout (called "Breakpoints" on the M3 site):

| Window class | Width (dp) | Navigation                        |
| ------------ | ---------- | --------------------------------- |
| Compact      | <600       | NavigationBar                     |
| Medium       | 600–839    | NavigationRail                    |
| Expanded     | 840–1199   | NavigationRail / permanent drawer |
| Large        | 1200–1599  | Permanent NavigationDrawer        |
| ExtraLarge   | ≥1600      | Permanent NavigationDrawer        |

Tap target: 48×48 dp.

Web implementation: Material Web (`@material/web`) carries a maintenance notice
but still ships releases, mostly M3 Expressive components under `labs/`. Use it
when a project already has it. Do not add it as a default dependency.
https://github.com/material-components/material-web

Reference: https://m3.material.io/

## Microsoft: Fluent

Use when targeting Windows, or when a Microsoft-adjacent web/native app wants
platform fidelity (Fluent UI React, Fluent UI Web Components, native Apple /
Android libraries).

Rules:

- Use two token layers: **global** tokens for raw values, **alias** tokens for
  semantic meaning (`colorBrandBackground1`, `colorNeutralForeground1`). Never
  reach past aliases to globals in app code.
- Use Segoe UI Variable on Windows (optical sizing on) and Segoe UI on the
  web. Native system fonts elsewhere.
- Respect Windows material rules: they are not interchangeable:

| Material | Use                                                    |
| -------- | ------------------------------------------------------ |
| Solid    | Default surfaces.                                      |
| Mica     | Opaque, wallpaper-tinted. Primary long-lived surfaces. |
| Acrylic  | Frosted. Transient surfaces only: menus, flyouts.     |
| Smoke    | Modal dim.                                             |

Metrics:

- Stroke widths: Thin / Thick / Thicker / Thickest (1 / 2 / 3 / 4 px).
- Corner radius: None / Small / Medium / Large / XLarge / Circular (0 / 2 / 4 /
  6 / 8 / 9999).
- Spacing scale: 2, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40.
- Tap target: 40×40 epx.

Reference: https://fluent2.microsoft.design/

## Government design systems

For government and public-service apps, use the jurisdiction's official design
system before inventing a generic app shell. These encode accessibility, content
style, trust patterns, form conventions, and service-design defaults users
already recognise.

- United States: U.S. Web Design System (USWDS):
  https://designsystem.digital.gov/
- United Kingdom: GOV.UK Design System: https://design-system.service.gov.uk/
- Canada: Canada.ca Design System: https://design.canada.ca/
- Australia: GOLD Design System: https://gold.designsystemau.org/
- New Zealand: Govt.nz Design System: https://design-system.digital.govt.nz/

For other jurisdictions, search for the official design system or service manual
first. If none exists, use the closest public-sector pattern and note the gap.
