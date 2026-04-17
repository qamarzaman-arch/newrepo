# Design System Specification: The Kinetic Vault

## 1. Overview & Creative North Star
This design system is engineered for the high-pressure, high-stakes environment of premium hospitality. We are moving away from the "grid of buttons" aesthetic common in legacy POS software and toward a philosophy we call **"The Kinetic Vault."**

**The Kinetic Vault** represents the intersection of absolute reliability (The Vault) and effortless speed (Kinetic). The interface must feel like a high-end editorial spread: authoritative, spacious, and intentional. We break the "template" look by utilizing aggressive tonal layering, purposeful asymmetry in dashboard layouts, and a "Typography First" hierarchy that ensures data is legible even in the chaotic flicker of a dimly lit dining room.

---

## 2. Colors & Tonal Architecture
The palette is rooted in deep, obsidian neutrals to reduce eye strain, punctuated by high-chroma "Emerald," "Amber," and "Teal" signals.

### The "No-Line" Rule
To achieve a bespoke, premium feel, **1px solid borders are strictly prohibited for sectioning.** Boundaries must be defined solely through background color shifts. Use `surface_container_low` against a `surface` background to define a zone. If a visual break is needed, use white space or a subtle transition in tonal depth.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. Hierarchy is defined by the following "stacking" logic:
*   **Base Layer:** `surface` (#131313) - The primary canvas.
*   **Sectioning:** `surface_container_low` - For secondary sidebars or inactive zones.
*   **Interaction Hubs:** `surface_container_high` or `highest` - For active order tickets or analytical widgets.
*   **Nested Depth:** Use `surface_container_lowest` for recessed areas (like search inputs) to create a "carved out" effect.

### The Glass & Gradient Rule
To prevent the dark mode from feeling "flat," use Glassmorphism for floating overlays (e.g., Modals, Quick-Action Menus). Use a semi-transparent `surface_container_highest` with a `backdrop-filter: blur(20px)`. 
*   **Signature Texture:** Main primary actions should not be flat. Apply a subtle linear gradient from `primary` (#6ee591) to `primary_container` (#50c878) at a 135-degree angle to provide a "jeweled" tactile quality.

---

## 3. Typography
We utilize a dual-typeface system to balance editorial sophistication with industrial utility.

| Category | Typeface | Token | Use Case |
| :--- | :--- | :--- | :--- |
| **Display** | Manrope | `display-lg` to `sm` | High-level analytics, large total amounts. |
| **Headline** | Manrope | `headline-lg` to `sm` | Section headers, table numbers. |
| **Title** | Inter | `title-lg` to `sm` | Menu item names, modal titles. |
| **Body** | Inter | `body-lg` to `sm` | Order modifiers, descriptions. |
| **Label** | Inter | `label-md` to `sm` | Status tags (e.g., "Searing," "Hold"). |

**Hierarchy Note:** Use `manrope` for numbers and branding elements to lean into the "High-End" persona. Use `inter` for all functional, readable text to ensure maximum clarity during peak service hours.

---

## 4. Elevation & Depth
Depth in this system is a result of **Tonal Layering**, not structural scaffolding.

*   **The Layering Principle:** A "floating" card should be `surface_container_highest` placed on top of `surface`. The contrast between #353534 and #131313 provides all the separation required.
*   **Ambient Shadows:** For high-importance floating elements (like a "Pay Now" sheet), use an extra-diffused shadow: `box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4)`. The shadow color should never be pure black; it should be a deep tint of the background to maintain "atmosphere."
*   **The "Ghost Border":** If accessibility requires a border, it must be the `outline_variant` token at 15% opacity. This creates a "suggestion" of a boundary without cluttering the visual field.
*   **Touch Targets:** All interactive elements must maintain a minimum 48dp height. Large `xl` (1.5rem) rounded corners are the standard for main touch targets to feel approachable and ergonomic.

---

## 5. Components

### Buttons
*   **Primary:** Gradient of `primary` to `primary_container`. Text is `on_primary_fixed` (Deep Green). 16px corner radius.
*   **Secondary (Hold):** `secondary_container` (#ffbf00). High-contrast "Amber" for immediate recognition of paused states.
*   **Tertiary (Info):** `tertiary_container` (#03c7b8). Used for "View Receipt" or "Order Info."

### Order Cards & Lists
*   **No Dividers:** Forbid the use of line-dividers between items. Instead, use `8px` of vertical white space and a `surface_container_low` background on hover/selection.
*   **Status Chips:** Use `secondary_fixed` for "Hold" and `error_container` for "Void." Chips must be pill-shaped (`full` roundedness) and use `label-md` typography.

### Input Fields
*   **Recessed Style:** Use `surface_container_lowest` for the field background to create a "carved" look. 
*   **Active State:** No thick borders. Transition the background to `surface_container_highest` and change the label color to `primary`.

### Analytical Sparks
*   **The "P" Iconography:** The logo and data visualizations should use the `tertiary` (#45e3d3) to `primary` (#6ee591) gradient. Line graphs should be "glow-enabled" using a subtle drop shadow of the stroke color.

---

## 6. Do’s and Don’ts

### Do
*   **Do** use `surface_bright` sparingly to highlight the most critical piece of information on a screen (e.g., the final "Total Amount").
*   **Do** embrace asymmetry. An analytical dashboard can have a large "Hero" metric on the left and smaller "Sub-metrics" stacked on the right to create a dynamic, modern feel.
*   **Do** prioritize `primary` (#6ee591) for "Success" and "Confirm" paths to build muscle memory.

### Don't
*   **Don't** use pure white (#FFFFFF) for text. Always use `on_surface` or `on_surface_variant` to prevent "halation" effects on high-brightness kitchen displays.
*   **Don't** use 1px dividers. If the UI feels cluttered, increase the spacing scale rather than adding lines.
*   **Don't** use standard "drop shadows." If an element needs to pop, use tonal contrast (shifting from `surface_dim` to `surface_bright`).

---

## 7. Spacing Scale
Consistency in breathing room is what separates "Premium" from "Standard."
*   **Compact:** 0.5rem (For tight data grids)
*   **Default:** 1rem (Standard padding for cards)
*   **Editorial:** 1.5rem to 2rem (Margins for headers and major section breaks)

By adhering to this system, we ensure that every interaction feels intentional, every piece of data feels prestigious, and the user feels in total control of the "Kinetic Vault."