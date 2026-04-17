# Design System Document: The Culinary Atelier

## 1. Overview & Creative North Star
**Creative North Star: "The Digital Maître d'"**

This design system rejects the cluttered, industrial aesthetic of legacy POS systems in favor of a "High-End Editorial" experience. It treats the interface not as a database, but as a digital concierge—sophisticated, invisible until needed, and impeccably organized. 

By utilizing **intentional asymmetry** and **tonal depth**, we move away from the "grid of buttons" look. The layout should feel like a premium menu from a Michelin-starred establishment: generous whitespace, razor-sharp typography, and a "layered" architecture that mimics physical sheets of fine stationery stacked on a charcoal stone countertop.

---

## 2. Colors & Surface Philosophy
The palette is rooted in a deep, professional charcoal and "Soft White" foundation, punctuated by "Emerald" accents to guide the eye toward primary actions.

### The "No-Line" Rule
**Traditional 1px borders are strictly prohibited.** To create a high-end feel, sectioning must be achieved through background shifts. For example, the "Order Summary" panel should not be separated by a line, but by transitioning from `surface` to `surface-container-low`.

### Surface Hierarchy & Nesting
Depth is built through tonal stacking. This mimics a physical workspace where items of higher importance are "lifted" toward the user.
- **Base Layer:** `surface` (#f8faf7) - The desk.
- **Secondary Areas:** `surface-container` (#edeeec) - The tray.
- **Interactive Elements:** `surface-container-lowest` (#ffffff) - The paper menu/cards.
- **Active Navigation:** `primary` (#00513f) - The signature ink.

### The "Glass & Gradient" Rule
Floating modals or quick-action overlays must use **Glassmorphism**. Apply `surface_container_lowest` at 80% opacity with a `20px` backdrop-blur. To give buttons "soul," use a subtle linear gradient from `primary` (#00513f) to `primary_container` (#006b54) at a 135-degree angle.

---

## 3. Typography: The Editorial Edge
We use a dual-font strategy to balance character with utility.

*   **Display & Headlines (Manrope):** Chosen for its geometric precision and modern "tech-meets-luxury" feel. Use `display-lg` for large total amounts and `headline-md` for category headers.
*   **Interface & Utility (Inter):** The workhorse. Inter provides maximum legibility for high-speed kitchen and floor environments. Use `body-lg` for menu item names and `label-md` for modifiers/modifiers.

**Intentional Contrast:** Always pair a `headline-sm` (Manrope) with a `label-sm` (Inter) in all-caps to create an authoritative, editorial hierarchy.

---

## 4. Elevation & Depth
In this design system, shadows are light, and structure is felt rather than seen.

*   **The Layering Principle:** Place a `surface-container-lowest` card on top of a `surface-container-high` background to create a "soft lift" without shadows.
*   **Ambient Shadows:** For floating action buttons or touch-triggers, use: `box-shadow: 0 12px 32px rgba(25, 28, 27, 0.06);`. The shadow must be tinted with the `on_surface` color to feel natural.
*   **The "Ghost Border" Fallback:** If a boundary is strictly required for accessibility (e.g., in high-glare environments), use `outline-variant` at **15% opacity**.

---

## 5. Components

### Buttons (The Interaction Points)
*   **Primary (Emerald):** Softened corners (`lg` - 0.5rem). Use the `primary` to `primary_container` gradient. Labels in `title-sm` (white).
*   **Secondary (Tonal):** `secondary_container` background with `on_secondary_container` text. No border.
*   **Tertiary (Text-only):** `on_surface` text. Use for low-priority actions like "Add Note."

### Cards & Lists (The Menu & Cart)
*   **Forbid Divider Lines:** Separate menu items using `8px` of vertical whitespace or by alternating background tones (`surface` to `surface-container-low`).
*   **Touch Targets:** All interactive items must have a minimum height of `56px` to accommodate high-speed touch input.

### Checkboxes & Radios
*   Use `primary` (#00513f) for checked states.
*   The unchecked state should be a `surface-dim` fill rather than an empty outline to feel more "filled-in" and premium.

### Signature POS Components: "The Modifier Sheet"
*   **The Slide-Over:** Modifiers should emerge from the right as a semi-transparent glass sheet, blurring the main order behind it. This maintains context while focusing the server’s attention.

---

## 6. Do’s and Don’ts

### Do:
*   **Use Generous Padding:** Give the "Total" price room to breathe. High-end design is defined by the space you *don't* fill.
*   **Use Tonal Shifts:** Define the sidebar from the main stage by shifting from `surface` to `surface-container-high`.
*   **Embrace the Emerald:** Use the `primary` color sparingly for "Confirmation" and "Pay" to ensure it retains its psychological impact.

### Don’t:
*   **No "Pure Black" Shadows:** Never use `#000000` for shadows. Use a diminished `on_surface` tint.
*   **No Cramped Grids:** Avoid trying to fit 20 menu items on one screen. Use fluid, oversized scrolling areas.
*   **No High-Contrast Borders:** Never use a solid 1px line to separate the "Header" from the "Body." Use a subtle elevation change or a `surface-variant` background transition instead.