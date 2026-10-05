# Phase 5 Report: Architectural Detail, Doors, Hinges & Bathroom Fixtures

This report documents the architectural fixtures, door mechanisms, switchboards, and physical door swing/hinge calibrations implemented for Apartment C-607.

---

## 1. Door Swings & Hinge Placement Architecture

Every interior and balcony door in the apartment was audited against the architectural floor plan and physical user requirements, correctly positioning pivots, jambs, and swing trajectories:

| Door | Wall Coordinates | Hinge Position | Swing Direction | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Kids Bedroom Balcony** | `y = 6.33, x: 0.8–3.6` | `x = 3.5` (End) | Outwards (`-Z`) | Swings out into the balcony with hinge on the opposite side |
| **Hall Bathroom (Common)** | `x = 15.0, y: 19.6–22.2` | `y = 19.7` (Start) | Inwards (`+X`) | Swings into the bathroom keeping the hall corridor clear |
| **Master / Brother's Room** | `y = 27.4, x: 11.8–14.8` | `x = 11.9` (Start) | Inwards (`+Z`) | Swings into the bedroom with hinge on the entrance wall |
| **Master Bathroom / Toilet** | `y = 27.4, x: 17.9–20.4` | `x = 20.3` (End) | Inwards (`-Z`) | Swings into the bathroom with hinge on the opposite side |
| **Kitchen to Utility** | `x = 20.0, y: 12.6–15.6` | `y = 15.5` (End) | Inwards (`+X`) | Swings into the utility balcony with hinge on opposite side |
| **Main Entrance Door** | `y = 33.7, x: 1.0–4.0` | `x = 1.1` (Start) | Inwards (`-Z`) | Heavy 8ft teak main entrance door opening into the foyer |

### Physical Jamb & Leaf Construction
- **Perimeter Frame (Jamb)**: 3-sided hardwood jamb (`0.18m` depth) with bottom threshold sill (`0.03m` height) matching wood floor transition strips.
- **Door Leaf**: Solid 35mm engineered wood core with satin polyurethane teak veneer finish, chamfered edge reveal, and 3mm perimeter air gap.
- **Architectural Hardware**: Dual-sided brushed brass lever handles with rose escutcheon plates mounted at ergonomic 3.22ft height.
- **Interactive States**: Supports apartment-wide `closed` (0°), `partial` (25° / 0.44 rad), and `open` (85° / 1.48 rad) interactive door states.

---

## 2. Dynamic Door Geometry Merging Protection

### The Challenge
To achieve high framerates (60 FPS on Retina displays), static geometry in the apartment is merged into single draw-call batches per material (`mergeGroupMeshesByMaterial`). When dynamic door groups were previously processed:
- Door leaves were detached from their rotational pivot groups and baked into static world coordinates.
- Doors became frozen and could not respond to state changes or interactive clicks.

### The Solution
- Tagged all interactive door pivot groups with `userData = { noMerge: true, isDoor: true }`.
- Updated `mergeGroupMeshesByMaterial()` with ancestor traversal checks:
  ```js
  let skip = false;
  let p = child;
  while(p){
    if(p.userData && p.userData.noMerge){ skip = true; break; }
    p = p.parent;
  }
  if(skip) return;
  ```
- Guaranteed that all dynamic doors retain independent scene graph hierarchy and pivot matrices while the surrounding structural walls remain batched.

---

## 3. Modular Electrical Switchboards (Legrand Arteor Style)

Installed calibrated modular switch plates at standardized architectural heights:

- **Switch Plates**: Satin white polycarbonate plates (`0.36m × 0.28m × 0.02m`) with beveled outer borders and dark shadow gap bezels.
- **Modular Gangs**: Multi-gang rocker switches with brass/silver status dot indicators and internal socket apertures.
- **Standardized Mounting Heights**:
  - **Light Switches**: Mounted adjacent to door frames at `1.20m` (3.9ft) above finished floor.
  - **Power Points / Appliance Sockets**: Kitchen countertop & utility points mounted at `1.05m` (3.4ft) and `0.30m` skirting height.

---

## 4. Bathroom Ceramics & Sanitaryware

- **Wall-Hung EWC (Toilets)**: Vitreous china wall-hung commodes with soft-close seat covers, concealed cistern flush plates with dual-flush chrome buttons.
- **Health Faucets & Bib Taps**: Polished chrome quarter-turn brass fittings.
- **Shower Enclosures**: Tempered clear glass partition panels with brushed steel U-channels and chrome rain shower heads.
