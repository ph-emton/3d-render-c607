# Phase 1 Report: Three.js Core Migration & ES Modules

This report summarizes the implementation of **Phase 1** for the Apartment C-607 3D interior planner, upgrading the core 3D engine from legacy Three.js r128 (UMD script tags) to modern Three.js **v0.174.0** using native browser ES module importmaps.

---

## 1. Summary of Changes

### A. ES Module Importmap Architecture
- **Zero Build Step Maintained**: Migrated from global `<script src="three.min.js">` to browser-native `<script type="importmap">`, preserving static hosting on GitHub Pages without requiring Node.js, Webpack, or Vite bundling in production.
- **Importmap Resolution**:
  ```json
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.174.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.174.0/examples/jsm/"
    }
  }
  ```
- **Modern Addons**: Loaded `OrbitControls`, `GLTFLoader`, `DRACOLoader`, `RGBELoader`, `RectAreaLightHelper`, `RectAreaLightUniformsLib`, `EffectComposer`, `RenderPass`, `OutputPass`, `UnrealBloomPass`, and `GTAOPass` as standard JSM ES modules.

### B. Color Space & Lighting Pipeline Modernization
- **Color Space Migration**: Replaced deprecated `sRGBEncoding` with modern `THREE.SRGBColorSpace`.
- **Physically Correct Lights**: Enabled modern physically based lighting decay (`useLegacyLights: false`) and tone mapping pipelines.
- **GLTF Model Compatibility**: Updated model loading callbacks to ensure embedded base64 models in `models_bundle.js` unpack properly in the v0.174.0 runtime with zero errors.

### C. Automated Capture & Verification Tooling
- Implemented `scripts/capture_views.mjs` using headless Chrome via Chrome DevTools Protocol (CDP) to automatically snapshot 5 key views (`overview`, `hall_walk`, `your_room`, `kitchen`, `brothers_room`) and benchmark in-engine frame times.

---

## 2. Verification & Stability
- **Console Errors**: 0 errors across all viewpoints.
- **Models**: 18 of 18 embedded glTF models verified loading and rendering correctly.
- **Branch**: `realism-upgrade` (`06c4c0a`).
