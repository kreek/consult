---
name: accessibility
description: Use for accessible UI, WCAG, ARIA, keyboard, focus, contrast, inclusive states.
---

# Accessibility

## Iron Law

`WCAG 2.2 AA IS THE FLOOR; NATIVE SEMANTICS COME FIRST.`

## When to Use

- Building, changing, or reviewing user-facing UI, forms, navigation,
  modals, custom controls, interactive states, animation, color,
  typography, or content structure.
- Testing keyboard flow, focus order, screen-reader behavior,
  contrast, reduced motion, forced colors, or accessible names.

## When NOT to Use

- Backend-only changes with no user-facing output.
- Visual hierarchy or brand direction without implementation; use
  `ui-design` first, then return here for accessibility constraints.
- Performance-only UI work; use `performance`, then verify
  accessibility if rendering behavior changed.

## Core Ideas

1. Prefer native HTML controls and semantics before ARIA.
2. Every interactive element needs name, role, value, state, and
   keyboard behavior.
3. Focus must be visible: at least a 2px outline at 3:1 contrast
   against both adjacent surfaces, with a transparent fallback for
   Forced Colors. Focus order must be logical. Focus must be restored
   after modal or overlay close. Do not trap focus by hand inside a
   `<dialog>`.
4. Color cannot be the only signal; contrast must satisfy WCAG 2.2
   AA.
5. Motion, transparency, dark mode, high contrast, and forced colors
   follow user preferences.
6. Forms need explicit labels, grouped controls, errors tied to
   fields, and no placeholder-only instructions.
7. Automated checks catch only part of the problem; manual keyboard
   and screen-reader checks are required for meaningful UI changes.

## Workflow

1. Identify the affected user journey, controls, and content
   structure. Use semantic HTML first; add ARIA only when native
   elements cannot express the interaction.
2. Define keyboard behavior and focus management before styling
   custom controls. Check labels, accessible names, headings,
   landmarks, form errors, status messages, and live regions.
3. Verify contrast, reflow, target size, reduced motion, forced
   colors, text spacing, dragging alternatives, redundant entry, and
   authentication flows. Authentication must not depend on cognitive
   tests.
4. Run automated checks, then perform manual keyboard testing. Add
   screen-reader testing for custom controls, dialogs, menus, tabs,
   forms, and live updates. Record remaining accessibility risks as
   explicit blockers or deferred work.

## Verification

- [ ] WCAG 2.2 AA-relevant criteria are satisfied or gaps are named.
- [ ] Native controls/semantics are used where possible; ARIA is
      minimal and correct.
- [ ] Keyboard/focus: every interactive control reachable in logical
      order; focus visible, not obscured, restored after modal/overlay
      close.
- [ ] Visual perception: text contrast, non-text contrast, target
      size, and reflow checked.
- [ ] User preferences: reduced motion, forced colors, contrast, and
      dark mode all work.
- [ ] Forms have labels, grouped controls where needed, and
      field-linked errors.
- [ ] Dragging has a single-pointer alternative; multi-step flows avoid
      redundant entry; authentication does not require cognitive tests.
- [ ] Automated tooling was run, manual keyboard checks were performed,
      and screen-reader behavior was checked on custom controls,
      dialogs, menus, tabs, forms, and live/status updates.

## Tripwires

Use these when the shortcut thought appears:

- Use native controls: `<button type="button">` for actions, `<a href>` for
  navigation, not clickable divs/spans or `role="button"` substitutes.
- Use native `<dialog>` + `.showModal()` where supported; do not hand-roll a
  focus trap inside native dialog.
- Keep visible button text in the accessible name; avoid conflicting
  `aria-label` values unless the control is icon-only.
- Use `<nav>` with links for site navigation; reserve `role="menu"` for
  application command menus.
- Replace `outline: none` with a measured 2px focus outline and Forced Colors
  fallback.
- Let native ARIA states announce controls; reserve `aria-live` for separate
  status text.
- Fix tab order by DOM order; positive `tabindex` has no safe use.

## Handoffs

- `ui-design`: visual hierarchy, layout, design systems, component composition.
- `proof`: browser automation around accessibility-critical flows.
- `documentation`: accessibility statements, design-system guidance,
  remediation notes.

## References

- `references/accessibility.md`: WCAG 2.2, ARIA, keyboard,
  screen-reader, and inclusive-design details.
