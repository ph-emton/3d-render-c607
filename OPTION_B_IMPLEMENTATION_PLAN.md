# Implementation Plan: Option B — Photorealistic 3D glTF/GLB Asset Loading

> **Project**: C607 Interior Planner (Primark Econest 2BHK)  
> **Target File**: `C607 interior planner realistic.html`  
> **Goal**: Upgrade procedural geometric primitives into dedicated, high-fidelity 3D models (`.glb` / `.gltf`) while preserving exact dimensional scaling (`w_in`, `d_in`, `h_in`), dynamic material & color customization, smooth 60 FPS performance, and offline fallbacks.

---

## 1. Executive Summary & Architecture

In Option A, the planner achieved realistic lighting, procedural PBR textures (Calacatta marble tiles, wood grain, fabric weaves), contact shadow decals, and shadow map caching. 

**Option B** transitions furniture meshes from programmatic box primitives into handcrafted 3D models (such as curved organic sofas, detailed tufted beds, carved teak jhula swings, ergonomic study chairs, and modern kitchen cabinetry).

```
┌────────────────────────────────────────────────────────┐
│                   Item Definition                      │
│     { kind: 'bed', w: 5, d: 6.67, h: 1.5, fin: 'sage' } │
└──────────────────────────┬─────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
   Has Dedicated 3D Model?       No Model / Offline
             │                           │
    [Fetch .glb from Cache]      [Render Option A]
             │                     (Procedural PBR)
    [Normalize Pivot & Scale]            │
             │                           │
    [Apply Dynamic Finish/Tint]          │
             │                           │
             └─────────────┬─────────────┘
                           ▼
               [Add to 3D Scene Group]
               [Single Shadow Cache Refresh]
               [Smooth 60 FPS Walk POV]
```

---

## 2. 3D Model Asset Strategy

### Model Format: Binary glTF (`.glb`) with Draco Compression
- **Why GLB**: A single binary container encapsulates geometry, UV coordinates, normals, PBR materials, and textures in one compact file.
- **Draco Compression**: Compresses mesh geometry by 70–85%, keeping individual furniture models between **80 KB and 450 KB**.

### Recommended Free & CC0 Asset Sources
1. **Poly Pizza** (`https://poly.pizza`): Low-to-medium poly CC0/CC-BY furniture optimized for real-time WebGL.
2. **Kenney Furniture Kit** (`https://kenney.nl/assets/furniture-kit`): Modular, ultra-clean CC0 furniture.
3. **Sketchfab (CC-BY Furniture Collection)**: Organic upholstered sofas, detailed beds, and potted botanicals.
4. **Quaternius Interior Pack** (`https://quaternius.com`): High quality CC0 interior models.

### Proposed Asset Directory Structure
If bundling models locally:
```
Interior/
├── C607 interior planner realistic.html
├── OPTION_B_IMPLEMENTATION_PLAN.md
└── assets/
    └── models/
        ├── bed_king.glb
        ├── bed_queen.glb
        ├── sofa_3seat.glb
        ├── jhula_swing.glb
        ├── dining_table.glb
        ├── chair_dining.glb
        ├── study_desk.glb
        ├── wardrobe_modular.glb
        ├── kitchen_base.glb
        ├── plant_monstera.glb
        └── draco/
            ├── draco_decoder.js
            └── draco_decoder.wasm
```
*Note: The loader can also fetch models directly from high-speed GitHub raw / unpkg / jsDelivr CDNs when internet access is available.*

---

## 3. Loader Infrastructure Setup

Add the standard Three.js GLTF and Draco loaders to the `<head>` of the HTML file:

```html
<!-- Three.js GLTF & DRACO Loaders (r128) -->
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/DRACOLoader.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>
```

### Initializing the Loader in JavaScript
```javascript
let gltfLoader = null;
let modelCache = new Map();

function initModelLoader() {
  if (!THREE.GLTFLoader) return;
  gltfLoader = new THREE.GLTFLoader();
  
  if (THREE.DRACOLoader) {
    const draco = new THREE.DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.4.3/');
    gltfLoader.setDRACOLoader(draco);
  }
}
```

---

## 4. The Bounding Box Fitting & Normalization Algorithm

Downloaded 3D models have unpredictable center points, arbitrary rotations, and varying original scales (meters vs. feet vs. inches). To ensure that every 3D model fits **precisely** into the room layout dimensions (`it.w`, `it.d`, `it.h`), use the following normalization pipeline:

```javascript
function fitModelToDimensions(modelScene, targetW, targetD, targetH) {
  // 1. Compute exact geometric bounding box
  const box = new THREE.Box3().setFromObject(modelScene);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  // 2. Re-center geometry so bottom-center is at (0, 0, 0)
  modelScene.position.x = -center.x;
  modelScene.position.y = -box.min.y; // Ground contact at Y = 0
  modelScene.position.z = -center.z;

  const wrapper = new THREE.Group();
  wrapper.add(modelScene);

  // 3. Compute scale factors
  const scaleX = targetW / (size.x || 1);
  const scaleY = targetH / (size.y || 1);
  const scaleZ = targetD / (size.z || 1);

  // Apply scales
  wrapper.scale.set(scaleX, scaleY, scaleZ);

  return wrapper;
}
```

---

## 5. Dynamic Material & Finish Tinting Pipeline

When the user selects a finish from the inspector (e.g. *Honey Oak*, *American Walnut*, *Midnight Navy Velvet*, *Muted Sage Linen*, *Warm Terracotta*), the model's materials must dynamically update without losing texture mapping:

```javascript
function applyFinishToModel(modelGroup, finishKey, itemKind) {
  const finInfo = FIN[finishKey] || FIN.oak;
  const isWood = finInfo.type === 'wood' || finInfo.wood;
  const isFabric = finInfo.type === 'fabric' || finInfo.fabric;
  const isMetal = finInfo.type === 'metal' || finInfo.metal;

  modelGroup.traverse(child => {
    if (!child.isMesh) return;

    child.castShadow = true;
    child.receiveShadow = true;

    const matName = (child.material.name || '').toLowerCase();
    const meshName = (child.name || '').toLowerCase();

    // Check if this part of the model is upholstery vs. frame
    const isCushion = matName.includes('fabric') || matName.includes('cushion') || 
                      matName.includes('cloth') || meshName.includes('pillow') || 
                      meshName.includes('duvet');

    const isWoodPart = matName.includes('wood') || matName.includes('frame') || 
                       meshName.includes('leg') || meshName.includes('base');

    if (isCushion && isFabric) {
      child.material = mF(finishKey, 1.0, 'fabric');
    } else if (isWoodPart && isWood) {
      child.material = mF(finishKey, 1.0, 'wood');
    } else if (child.material) {
      // Gentle color tinting preserving original roughness/metalness
      child.material = child.material.clone();
      child.material.color.set(finInfo.hex);
    }
  });
}
```

---

## 6. Hybrid Fallback & Progressive Loading

To avoid blank voids or lag when switching layouts:
1. `buildItem(it)` immediately creates the existing **Option A procedural mesh** (renders in <1 frame).
2. If `MODEL_CATALOG[it.kind]` exists, trigger asynchronous model loading in background.
3. Once loaded, replace the procedural mesh with the calibrated 3D model.
4. Flag `renderer.shadowMap.needsUpdate = true` once to bake soft contact shadows.

```javascript
const MODEL_CATALOG = {
  bed: 'assets/models/bed_queen.glb',
  sofa: 'assets/models/sofa_3seat.glb',
  jhula: 'assets/models/jhula_swing.glb',
  chair: 'assets/models/chair_dining.glb',
  dining: 'assets/models/dining_table.glb',
  study: 'assets/models/study_desk.glb',
  plant: 'assets/models/plant_monstera.glb'
};
```

---

## 7. Performance Budget & Memory Management

| Metric | Target | Rationale |
|---|---|---|
| Model Polygon Count | < 8,000 triangles / model | High visual detail with minimal vertex shading cost |
| Full Scene Polycount | < 120,000 triangles total | Sustains 60 FPS even on integrated GPUs |
| Shadow Map Mode | `autoUpdate = false` | Precomputed shadow atlas; zero frame drops in Walk POV |
| Texture Maps | Max 512×512 per model | Low VRAM overhead (<80 MB total texture memory) |

---

## 8. Fresh Chat Prompt (Ready to Copy-Paste)

Copy and paste the prompt below into a new chat to begin Option B execution immediately:

```markdown
I am building a 3D interior design tool in HTML/Three.js.
Please review:
- /Users/openplots/Documents/Sagar/Interior/C607 interior planner realistic.html
- /Users/openplots/Documents/Sagar/Interior/OPTION_B_IMPLEMENTATION_PLAN.md

We have already completed Option A (procedural PBR, lighting, wall paint palette, shadow caching, Walk POV navigation).
Now, I want to execute Option B:
1. Integrate Three.js GLTFLoader and DRACOLoader.
2. Implement the hybrid fallback loader so procedural items render instantly while 3D models load progressively.
3. Implement the automatic bounding box normalizer to fit any GLB model to the layout dimensions (w_in, d_in, h_in, elevation, and rotation).
4. Implement dynamic material tinting to apply selected FIN finishes onto loaded 3D models.
5. Provide a curated catalog of lightweight, free CC0/CC-BY GLB assets for beds, sofas, jhula, dining chairs, and study desks.

Keep the file 100% functional, self-contained, and smooth at 60 FPS in Walk POV.
```
