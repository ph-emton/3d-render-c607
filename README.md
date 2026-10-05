# Apartment C-607 3D Interior Planner & Visualizer

Interactive architectural 3D interior design and space-planning tool for Apartment C-607, powered by Three.js and real-time photorealistic glTF 3D models.

---

## 🌐 Live Web App (GitHub Pages)

Access and interact with the 3D planner on any phone, tablet, or desktop:

👉 **[https://ph-emton.github.io/3d-render-c607/](https://ph-emton.github.io/3d-render-c607/)**

---

## 📁 Repository Structure

The repository is organized so you can focus exclusively on `index.html` for refining and finalizing designs with your interior team:

```text
3d-render-c607/
├── index.html          # ⭐ PRIMARY APPLICATION (Active live planner for GitHub Pages)
├── assets/             # 3D glTF Models (.glb) & self-contained models bundle (.js)
│   └── models/
├── docs/               # AI generation guides & technical plans
│   ├── prompt generation.md          # Ready-to-copy prompts for Gemini / Imagen 3
│   └── OPTION_B_IMPLEMENTATION_PLAN.md # 3D models technical design spec
├── archive/            # Historical prototype versions (v1, v2 procedural, v3)
│   ├── C607 interior planner.html
│   ├── C607 interior planner realistic.html
│   └── C607 interior planner 3d models.html
├── README.md           # This document
└── .gitignore          # Git exclusion rules
```

---

## 🛠️ Key Capabilities for Interior Design Review

1. **Walk (POV) Mode**:
   - First-person walkthrough at human eye height (5'3" default, adjustable from 2.5' to 7.5').
   - Controls: **W / A / S / D** or Arrow keys to walk, **Click & Drag** or mouse pointer lock to look around.
2. **Ultra-Wide Field of View (30° – 125°)**:
   - Dedicated quick chips for **105° Ultra-Wide** and **115° Panoramic** perspectives to see full rooms at once without edge distortion.
3. **Per-Room Wall Painting**:
   - Paint rooms independently (Hall, Your room, Brother's room, Kitchen, Utility, Balcony, Toilets).
   - "Current Room" auto-detection in Walk POV mode automatically selects the room you step into.
   - Asian Paints Royale curated luxury palette plus custom hex color picker.
   - Intelligent dual-face wall mapping on dividing partition walls.
4. **2D Interactive Plan & Dimension Lines**:
   - Snap-to-wall precision alignment, rotation, and live dimension clearance gaps.
5. **Carpentry Scope & Costing Table**:
   - Real-time calculation of front surface area (sft) grouped by room for wardrobes, lofts, modular kitchen base/wall units, and custom furniture.
6. **Share or Restore Layouts**:
   - Copy the layout JSON string to share exact measurements with your interior contractor, or paste to restore previous iterations.

---

## 🚀 GitHub Pages Setup

To verify or configure GitHub Pages deployment:
1. Open [Repository Settings > Pages](https://github.com/ph-emton/3d-render-c607/settings/pages).
2. Set **Source** to `Deploy from a branch`.
3. Choose branch `main` and folder `/ (root)`.
4. Click **Save**.
