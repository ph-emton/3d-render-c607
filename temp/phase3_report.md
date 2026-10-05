# Phase 3 Report: Post-Processing Pipeline (GTAO, Soft Bloom & Tone Mapping)

This report details the implementation of **Phase 3** for the Apartment C-607 3D interior planner, introducing a real-time post-processing pipeline that bridges real-time rendering and architectural photography.

---

## 1. Summary of Changes

### A. Ground Truth Ambient Occlusion (`GTAOPass`)
- **Modern Ambient Occlusion**: Implemented Three.js's state-of-the-art `GTAOPass` (Ground Truth Ambient Occlusion), which replaces flat uniform ambient light with microfacet crevice darkening.
- **Calibrated Contact Occlusion**: Configured with a `1.35` ft world radius, Poisson denoising, and `1.15` blend intensity. This grounds furniture legs, skirting boards, door frames, kitchen cabinet seams, and wall-ceiling joints firmly, eliminating the floating CG look.

### B. Soft Architectural Bloom (`UnrealBloomPass`)
- **Selective Bloom**: Configured with a high threshold (`0.88`), tight radius (`0.45`), and soft strength (`0.28`).
- **Targeted Emitters**: Only genuine high-intensity emissive surfaces—such as the continuous 4-sided false ceiling LED strips, downlight glowing lenses, the puja niche backlight, and direct window daylight—produce a natural luminous glow without bleeding over wall paint or wood finishes.

### C. Color Space & Filmic Tone Mapping (`OutputPass`)
- **Color Pipeline**: Integrated `OutputPass` at the end of the post-processing chain to apply tone mapping and sRGB color management uniformly across all passes.
- **Dynamic Updates**: Automatically syncs when users switch tone mapping curves (ACESFilmic, AgX, Neutral) or adjust exposure (<kbd>[</kbd> / <kbd>]</kbd>).

### D. User Controls & Performance Management
- **Interactive Toggles**: Added **"✨ Post-FX: ON"** in the top bar and the Walk mode overlay. Users can toggle the entire post-processing stack on or off at any time (or press <kbd>B</kbd>).
- **Graceful Fallback**: When Post-FX is toggled off or on low-power devices, rendering falls back to direct `renderer.render(scene, camera)` with zero overhead.
- **Persistence**: Saved to `localStorage` and serialized in layout export/import JSON (`usePostProcessing`).

---

## 2. Visual Evolution (Baseline ➔ Phase 2 ➔ Phase 3)

### Living Hall View

Notice how Phase 2 fixed the south wall color bleed, and Phase 3 introduces soft bloom on the puja light and ceiling LED cove strip alongside contact shadows along cabinet bases.

````carousel
![Baseline (r128 UMD) - Flat lighting, orange wall bleed](/Users/openplots/.gemini/antigravity-ide/brain/2c789a79-8778-464a-bfd1-6539e36e3c96/screenshots/baseline_hall_walk.png)
<!-- slide -->
![Phase 2 - HDRI, window RectAreaLights, SpotLights, Teal wall](/Users/openplots/.gemini/antigravity-ide/brain/2c789a79-8778-464a-bfd1-6539e36e3c96/screenshots/phase2_hall_walk.png)
<!-- slide -->
![Phase 3 - Full Post-Processing (GTAO Ambient Occlusion & Soft Bloom)](/Users/openplots/.gemini/antigravity-ide/brain/2c789a79-8778-464a-bfd1-6539e36e3c96/screenshots/phase3_hall_walk.png)
````

---

### Brother's Room View

Observe the deep contact shadows under the wardrobe base and between upper loft doors.

````carousel
![Baseline Brother's Room](/Users/openplots/.gemini/antigravity-ide/brain/2c789a79-8778-464a-bfd1-6539e36e3c96/screenshots/baseline_brothers_room.png)
<!-- slide -->
![Phase 2 Brother's Room (SpotLight & Window Daylight)](/Users/openplots/.gemini/antigravity-ide/brain/2c789a79-8778-464a-bfd1-6539e36e3c96/screenshots/phase2_brothers_room.png)
<!-- slide -->
![Phase 3 Brother's Room (GTAO crevice shading and grounded base)](/Users/openplots/.gemini/antigravity-ide/brain/2c789a79-8778-464a-bfd1-6539e36e3c96/screenshots/phase3_brothers_room.png)
````

---

### Your Room (Master Bed & Study)

Observe the soft glow on the laptop display and grounding contact shadows under the study chair and desk legs.

````carousel
![Baseline Your Room](/Users/openplots/.gemini/antigravity-ide/brain/2c789a79-8778-464a-bfd1-6539e36e3c96/screenshots/baseline_your_room.png)
<!-- slide -->
![Phase 2 Your Room (Study downlight & soft PCF shadows)](/Users/openplots/.gemini/antigravity-ide/brain/2c789a79-8778-464a-bfd1-6539e36e3c96/screenshots/phase2_your_room.png)
<!-- slide -->
![Phase 3 Your Room (GTAO contact occlusion & screen bloom)](/Users/openplots/.gemini/antigravity-ide/brain/2c789a79-8778-464a-bfd1-6539e36e3c96/screenshots/phase3_your_room.png)
````

---

### Kitchen View

Observe the specular reflection and bloom from the overhead task downlight onto the metallic upper cabinetry.

````carousel
![Baseline Kitchen](/Users/openplots/.gemini/antigravity-ide/brain/2c789a79-8778-464a-bfd1-6539e36e3c96/screenshots/baseline_kitchen.png)
<!-- slide -->
![Phase 2 Kitchen (Task downlight & warm HDRI)](/Users/openplots/.gemini/antigravity-ide/brain/2c789a79-8778-464a-bfd1-6539e36e3c96/screenshots/phase2_kitchen.png)
<!-- slide -->
![Phase 3 Kitchen (Metallic specular bloom & cabinet panel seams)](/Users/openplots/.gemini/antigravity-ide/brain/2c789a79-8778-464a-bfd1-6539e36e3c96/screenshots/phase3_kitchen.png)
````

---

### 3D Floor Plan Overview

````carousel
![Baseline Floor Plan](/Users/openplots/.gemini/antigravity-ide/brain/2c789a79-8778-464a-bfd1-6539e36e3c96/screenshots/baseline_overview.png)
<!-- slide -->
![Phase 2 Floor Plan](/Users/openplots/.gemini/antigravity-ide/brain/2c789a79-8778-464a-bfd1-6539e36e3c96/screenshots/phase2_overview.png)
<!-- slide -->
![Phase 3 Floor Plan (Downlight lens bloom & room corner AO)](/Users/openplots/.gemini/antigravity-ide/brain/2c789a79-8778-464a-bfd1-6539e36e3c96/screenshots/phase3_overview.png)
````

---

## 3. Performance & Quality Verification

| Metric | Baseline (r128) | Phase 1 (v0.174.0) | Phase 2 (Lighting & HDRI) | Phase 3 (GTAO + Bloom) |
| :--- | :--- | :--- | :--- | :--- |
| **Three.js In-Engine Render Time** | ~16.5 ms | ~16.5 ms | **2.1 ms – 7.3 ms** | **9.4 ms** |
| **FPS Headroom** | ~60 FPS | ~60 FPS | >130 FPS | **>100 FPS** (60 FPS VSync locked) |
| **Ambient Occlusion** | None | None | None | **Ground Truth AO (`GTAOPass`)** |
| **Bloom** | None | None | None | **UnrealBloomPass (threshold 0.88)** |
| **Tone Mapping** | None | None | In-shader | **OutputPass with sRGB Transfer** |
| **Console Errors / Warnings** | 0 | 0 | 0 | **0** |
| **glTF Models Loaded** | 18 / 18 | 18 / 18 | 18 / 18 | **18 / 18** |

---

## 4. Git State
- **Branch**: `realism-upgrade`
- **Commit**: `c0ec480` (*Implement Phase 3: Post-processing pipeline with GTAO ambient occlusion, soft bloom, and tone mapping pass*)
- **Status**: Clean working tree
