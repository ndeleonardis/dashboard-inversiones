# DESIGN.md — System Specification & Visual Guidelines

Extracted from visual reference: Mobile Banking & Debit Card Interface.

---

## 1. Visual Identity

- **Mood & Brand Personality:** Playful yet refined, neo-brutalist / soft-pop fintech, tactile, minimalist-editorial, approachable luxury.
- **Style Keywords:** Monochromatic pink tint, high-contrast typography, bulbous organic capsules, soft rounded corners, playful-editorial balance.
- **Color Mode:** Tonal Light Mode (monochromatic pink canvas with deep contrast ink).
- **Core Visual Motif:** Ultra-high contrast deep black/charcoal typography and action elements resting on a warm, blush-pink monochromatic background with rounded organic pill containers and soft cards.

---

## 2. Color Palette & Proportions

### Palette Overview & Proportions
- **65% Canvas & Background:** Blush Pink / Lilac-Rose base
- **20% Surfaces & Containers:** Tonal soft-tint cards and translucent overlays
- **10% Contrast Accents & Typography:** Deep Ink Black (headline, active card, floating pill docks)
- **5% Subtle Accents & Muted Text:** Dusty Mauve / Subdued Plum

### Swatches & Roles

| Token Name | HEX Value | Role & Usage |
| :--- | :--- | :--- |
| `color-bg-base` | `#F9D2E5` (estimated) | Main app viewport/canvas background |
| `color-surface-card` | `#F2B8D8` (estimated) | Transaction cards, secondary debit card surface |
| `color-surface-card-subtle` | `#F5C5DF` (estimated) | Card borders, subtle container background |
| `color-surface-active` | `#0D0C11` | Primary debit card, primary floating navigation dock, action pill buttons |
| `color-text-primary` | `#110D13` | Headlines ("My Debit Card"), large balance numbers, primary amounts |
| `color-text-secondary` | `#7D556E` (estimated) | Eyebrow labels ("Bank Account", "Total Balance"), merchant subtitles |
| `color-text-inverse` | `#FFFFFF` | Text/icons inside black pills, primary card numbers, transfer labels |
| `color-accent-card-secondary` | `#EAAAD0` (estimated) | Secondary card tint gradient/flat color |
| `color-icon-circle-bg` | `#E8A2C7` (estimated) | Circular container background for transaction merchant logos |
| `color-border-dashed` | `rgba(125, 85, 110, 0.4)` (estimated) | Add card dashed container border |
| `color-border-card` | `rgba(255, 255, 255, 0.35)` (estimated) | Subtle top/inner highlight border on cards |
| `color-state-negative` | `#110D13` (monochrome convention) | Negative expenses represented in deep primary ink (`-$35`, `-$15`) rather than harsh red to maintain palette serenity |

---

## 3. Typography

- **Primary Typeface:** High-character Grotesk with tightly tracked lowercase/capitals (e.g., *Neue Montreal*, *PP Neue Haas Grotesk*, *Söhne*, or *General Sans*).
- **Google Fonts Alternative:** `Plus Jakarta Sans` or `Inter` (with tightened letter spacing and medium/bold weights).

### Type Scale

| Style / Level | Font Size | Font Weight | Line Height | Letter Spacing | Target Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display** | `68px` (estimated) | 700 (Bold) | `1.0` (tight) | `-0.04em` | "My Debit<br/>Card" screen hero title |
| **H1 / Balance** | `48px` (estimated) | 700 (Bold) | `1.1` | `-0.03em` | Balance amount (`$25,291.50`) |
| **H2 / Card Stat** | `34px` (estimated) | 700 (Bold) | `1.15` | `-0.02em` | Large transaction numbers (`-$35`) |
| **Eyebrow / Subhead**| `17px` (estimated) | 500 (Medium) | `1.3` | `-0.01em` | "Bank Account", "Total Balance" |
| **Body / Merchant** | `15px` (estimated) | 500 (Medium) | `1.3` | `0em` | "Uber Inc.", "Netflix", "Dribbble" |
| **Card Chip / Details**| `13px` (estimated) | 600 (SemiBold)| `1.2` | `0.02em` | Card digits (`****8345`, `****2342`) |
| **Navigation / Action**| `14px` (estimated) | 600 (SemiBold)| `1.0` | `-0.01em` | Pill dock labels ("Transfer", "Receive") |
| **Caption / Add Card** | `12px` (estimated) | 500 (Medium) | `1.2` | `0em` | "Add Card" |

---

## 4. Spacing & Layout

- **Base Grid Unit:** `4px` / `8px` system.
- **Screen Margins (Horizontal Padding):** `20px` to `24px` gutter.
- **Vertical Spacing Rhythm:**
  - Header to Eyebrow: `24px`
  - Eyebrow to Main Title: `6px`
  - Title to Card Selector: `32px`
  - Card Selector to Balance Section: `28px`
  - Balance to Transaction Row: `32px`
  - Card Gap (Horizontal scroll): `12px`
- **Container Max-Width:** `390px` to `428px` (Mobile viewport).
- **Bottom Navigation Safe Inset:** `24px` floating above system home indicator bar.

---

## 5. Shape, Elevation & Depth

### Border Radii
- **Base Rounding (Pills & Circular Badges):** `9999px` (Full pill for navigation dock, avatar counters, plus action icon).
- **Card Large (Transaction Cards):** `28px` to `32px` (`rounded-[2rem]` with continuous squircle smoothing).
- **Card Small (Debit Card Previews):** `16px` to `18px`.
- **Icon Container Badges:** `9999px` (fully round `44px × 44px` or `48px × 48px`).

### Elevation & Shadows
- **Cards & Surfaces:** Flat monochromatic layers (`box-shadow: none` or subtle ambient drop `0 8px 24px rgba(125, 85, 110, 0.08)`).
- **Bottom Navigation Dock:** Floating bubble effect with high elevation `0 12px 32px rgba(13, 12, 17, 0.25)`.
- **Card Glass/Gleam:** Very subtle inner top highlight border: `1px solid rgba(255, 255, 255, 0.25)`.

### Border Styles
- **Dashed Container ("Add Card"):** `1.5px dashed rgba(125, 85, 110, 0.45)`.
- **Card Separators:** Borderless, contrast achieved via surface tone stepping.

---

## 6. Iconography & Imagery

- **Icon Style:** Ultra-clean, simplified glyphs. Solid filled circles housing minimal vector glyphs (e.g., arrow up-diagonal for Transfer, download arrow for Receive, 2×2 grid launcher icon).
- **Icon Weight:** `2px` stroke weight or bold geometric silhouettes.
- **Imagery:**
  - Avatars: Small overlapping circular portrait thumbnails (`36px × 36px`) with thin transparent boundary ring.
  - Brand Badges: Monochromatic black glyph on soft circular tinted background (e.g., Uber horizontal bar/circle, Netflix serif bold "N").

---

## 7. Component Specifications

### 1. Floating Bottom Dock (Navigation / Quick Action Bar)
- **Structure:** Connected multi-lobed organic pill dock.
  - Outer black capsule with 3 unified interconnected chambers.
  - Left button: Upload arrow in round tinted pill + "Transfer" text.
  - Center launcher button: Floating circle with 2×2 grid dots icon (`48px × 48px`).
  - Right button: Download arrow in round tinted pill + "Receive" text.
- **Background:** `#0D0C11` (Deep black).
- **Inner Button Tints:** `#F9D2E5` on action icons.

### 2. Card Carousel / Selector (Top Row)
- **Active Card (Selected):**
  - Dimensions: `110px × 72px` (ratio ~1.5:1).
  - Background: Solid `#0D0C11`.
  - Content: White VISA logo + contactless wave glyph top; masked card number bottom (`****8345`).
- **Inactive / Secondary Card:**
  - Dimensions: `110px × 72px`.
  - Background: Soft pink-violet `#EAAAD0`.
  - Content: Mastercard overlapping circles glyph; dark card digits (`****2342`).
- **Add Card Action:**
  - Dimensions: `84px × 72px`.
  - Background: Transparent with `1.5px dashed` mauve outline.
  - Content: Center plus `+` icon + "Add Card" caption.

### 3. Balance Header
- **Eyebrow:** "Total Balance" in muted text (`#7D556E`).
- **Amount Display:** High-contrast `$25,291.50` with integer and decimal formatted together in headline weight.

### 4. Transaction Cards (Horizontal Flow)
- **Dimensions:** Width `180px` to `200px`, Height `220px` to `240px`.
- **Background:** Soft rose `#F2B8D8`.
- **Layout:** Vertical stack (Top: circular merchant badge; Bottom: Merchant name in regular weight, amount in oversized bold type).

---

## 8. Do's and Don'ts

### Do's
- **DO** embrace the monochromatic blush pink as the entire environment, varying layers purely by lightness and tint saturation.
- **DO** use oversized, tightly tracked display typography for focal headings and amounts.
- **DO** make key interactive anchors (the active card and the bottom dock) deep ink black to ground the design.
- **DO** use large corner radiuses (`28px`–`32px` on cards, full pill on actions).
- **DO** keep financial negative numbers in ink black to retain the calm, fashionable aesthetic.

### Don'ts
- **DON'T** introduce cold blues, harsh bright reds, or generic gray container backgrounds.
- **DON'T** use sharp 90-degree corners or standard `4px`–`8px` subtle radii.
- **DON'T** clutter the cards with dense table-like borders, dividers, or drop-shadow clutter.
- **DON'T** use standard system tabs for bottom navigation — maintain the connected floating bubble capsule dock.

---

## 9. Design Tokens

### CSS Variables (`:root`)
```css
:root {
  /* Colors */
  --color-bg-base: #F9D2E5;
  --color-surface-card: #F2B8D8;
  --color-surface-card-subtle: #F5C5DF;
  --color-surface-active: #0D0C11;
  --color-surface-pill: #E8A2C7;
  --color-text-primary: #110D13;
  --color-text-secondary: #7D556E;
  --color-text-inverse: #FFFFFF;
  --color-border-dashed: rgba(125, 85, 110, 0.45);
  --color-border-highlight: rgba(255, 255, 255, 0.35);

  /* Typography */
  --font-family-display: "Plus Jakarta Sans", "Neue Montreal", sans-serif;
  --font-family-body: "Plus Jakarta Sans", -apple-system, sans-serif;

  --font-size-display: 68px;
  --font-size-balance: 48px;
  --font-size-stat: 34px;
  --font-size-subhead: 17px;
  --font-size-body: 15px;
  --font-size-caption: 13px;
  --font-size-micro: 12px;

  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  --letter-spacing-tightest: -0.04em;
  --letter-spacing-tight: -0.02em;
  --letter-spacing-normal: 0em;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;

  /* Shapes & Radii */
  --radius-sm: 12px;
  --radius-md: 18px;
  --radius-lg: 28px;
  --radius-xl: 34px;
  --radius-full: 9999px;

  /* Elevation */
  --shadow-dock: 0px 14px 34px rgba(13, 12, 17, 0.28);
}
```

### JSON Format
```json
{
  "name": "Blush Neo-Fintech",
  "version": "1.0.0",
  "color": {
    "background": {
      "base": "#F9D2E5"
    },
    "surface": {
      "card": "#F2B8D8",
      "cardSubtle": "#F5C5DF",
      "active": "#0D0C11",
      "pillContainer": "#E8A2C7"
    },
    "text": {
      "primary": "#110D13",
      "secondary": "#7D556E",
      "inverse": "#FFFFFF"
    },
    "border": {
      "dashed": "rgba(125, 85, 110, 0.45)",
      "highlight": "rgba(255, 255, 255, 0.35)"
    }
  },
  "typography": {
    "fontFamily": {
      "display": "Plus Jakarta Sans, Neue Montreal, sans-serif",
      "body": "Plus Jakarta Sans, sans-serif"
    },
    "fontSize": {
      "display": "68px",
      "balance": "48px",
      "stat": "34px",
      "subhead": "17px",
      "body": "15px",
      "caption": "13px",
      "micro": "12px"
    },
    "fontWeight": {
      "regular": 400,
      "medium": 500,
      "semibold": 600,
      "bold": 700
    },
    "letterSpacing": {
      "tightest": "-0.04em",
      "tight": "-0.02em",
      "normal": "0em"
    }
  },
  "spacing": {
    "xs": "4px",
    "sm": "8px",
    "md": "16px",
    "lg": "24px",
    "xl": "32px"
  },
  "borderRadius": {
    "card": "28px",
    "cardPreview": "18px",
    "pill": "9999px"
  },
  "elevation": {
    "dock": "0 14px 34px rgba(13, 12, 17, 0.28)"
  }
}
```

---

## 10. Ajustes para LemonHouse

> Agregado el 2026-10-25. La guía de arriba se extrajo de una referencia de banca móvil. Estos ajustes la adaptan a una app de finanzas en Argentina y mandan sobre la guía cuando se contradicen.

### Montos y monedas

En Argentina "$" son pesos, así que el formato de la referencia (`$25,291.50`) confunde. Los montos van en formato es-AR, `$ 25.291,50` para pesos y `US$ 25.291,50` para dólares, con la moneda siempre visible. Nunca se muestra un total que mezcle las dos monedas. Los montos usan cifras tabulares (`font-variant-numeric: tabular-nums`) para que se alineen en listas.

### Rendimiento en verde y rojo

Ganancia en verde y pérdida en rojo, como en cualquier app de finanzas, con el signo + o − siempre al lado. Esto reemplaza la regla de la guía que pide los negativos en negro y prohíbe el rojo. Esa regla sigue valiendo solo para los gastos.

| Token | HEX | Contraste sobre fondo base | Contraste sobre tarjeta |
| :--- | :--- | :--- | :--- |
| `--color-gain` | `#0F5C30` | 5,93 a 1 | 4,87 a 1 |
| `--color-loss` | `#9A1B12` | 6,06 a 1 | 4,97 a 1 |

Son tonos oscuros a propósito. El mínimo de accesibilidad para texto chico (WCAG AA) es 4,5 a 1, y un verde y un rojo más vivos (`#146B3A`, `#B42318`) dan 3,95 a 1 sobre la tarjeta rosa.

### Contraste del texto secundario

`#7D556E` da 4,53 a 1 sobre el fondo base, justo por encima del mínimo, y 3,72 a 1 sobre las tarjetas, que no lo alcanza. Se reemplaza por `#664359`, que da 6,12 a 1 sobre el fondo, 5,03 a 1 sobre la tarjeta y 5,55 a 1 sobre la superficie sutil.

```css
:root {
  --color-text-secondary: #664359;
  --color-gain: #0F5C30;
  --color-loss: #9A1B12;
}
```

### Componentes

- **Carrusel de tarjetas** pasa a ser el selector de cuentas o de personas. La tarjeta activa en negro es la cuenta o persona elegida.
- **Barra flotante** pasa a tener las acciones rápidas, cargar gasto, cargar ingreso y cargar operación.
- **Tarjetas de transacciones** muestran los últimos gastos e ingresos.
- **"Total Balance"** pasa a ser un total por moneda, nunca un único total.

### Pantallas grandes

> Agregado el 2026-10-26. La guía de arriba es solo para celular, y LemonHouse también se usa desde la notebook.

- **Hasta 767 px** vale el diseño de celular de esta guía.
- **Desde 768 px** el contenido se centra con un ancho máximo de 1.120 px y márgenes de 32 px.
- **El resumen** pone sus dos bloques lado a lado, el del mes y el de inversiones.
- **Las listas** pasan a una grilla de tarjetas de al menos 280 px de ancho.
- **Los formularios** siguen en una sola columna de hasta 560 px. Un formulario más ancho no se llena más rápido.
- **La barra flotante** sigue abajo y al centro, igual que en el celular.
- **El carrusel** de personas o cuentas muestra todas las tarjetas sin desplazarse cuando entran en el ancho.

### App instalable

- **Nombre** LemonHouse.
- **Color de fondo** `#F9D2E5`, el fondo base. **Color del tema** `#0D0C11`, el de la barra flotante.
- **Ícono** un limón en negro sobre el fondo rosa, con el margen que piden los íconos adaptables de Android para que no se recorte.

### Idioma

La guía queda en inglés. Toda la interfaz va en español.
