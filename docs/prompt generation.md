**Do not give the raw HTML file to the AI image model.** 

Image generation models (like Imagen 3, Gemini in the phone app, Midjourney, etc.) cannot execute Three.js JavaScript or render 3D WebGL scenes from code. Passing the HTML code will confuse the generator and cause it to hallucinate random room layouts.

The proven, best-in-class workflow that produces stunning, photorealistic results is the **"Golden Trio"**:

---

### The Winning Formula

| Asset | What to provide to Gemini | Why it works |
| :--- | :--- | :--- |
| **1. 3D Planner Screenshot** | A full-screen screenshot from **Walk (POV)** mode at **105° FOV** | Gives the AI the **exact perspective, camera height, furniture positions, and room scale**. |
| **2. Real Site Photo** *(Optional)* | A photo from your phone standing in the same corner | Grounds the AI in your **actual ceiling beam drops, floor tile tone, and real window lighting**. |
| **3. Engineered Prompt** | A detailed architectural prompt specifying materials, colors, and lighting | Instructs the AI on **textures, luxury materials (fluted panels, brass accents, Asian Paints Royale finish), and 3000K warm lighting**. |

---

### How to Do This Step-by-Step in the Gemini App

1. **Snap the Views in the Planner**:
   - Open [C607 interior planner 3d models.html](http://localhost:8089/C607%20interior%20planner%203d%20models.html).
   - Click **🚶 Walk (POV)**, select **105° Ultra-Wide**, and press **⛶ Fullscreen**.
   - Walk into the room of interest (e.g. Hall, Your room, Brother's room, Kitchen) and point the camera at your desired angle.
   - Take a clean screenshot.
2. **Open the Gemini App on your Phone**:
   - Tap the **+** (attach image) icon and upload:
     - **Image 1**: The 3D Planner screenshot (for exact spatial arrangement).
     - **Image 2** *(if you have one)*: Current photo of the room or reference furniture photo.
3. **Paste the Tailored Prompt**:
   - Instruct the AI to use Image 1 as the exact 3D spatial layout and render it as an *Architectural Digest* photorealistic luxury interior.

---

### Ready-to-Use Prompts for Your Rooms

Here are prompt templates crafted with all your exact colors, dimensions, and finishes:

#### 1. Brother's Room (Terracotta, Rust & Fluted Dark Accents)
```text
Photorealistic luxury interior architectural photography of a modern Indian bedroom. 
Use the attached 3D layout screenshot for the exact perspective, furniture dimensions, and layout placement.

Key elements and finishes:
- Bed: Queen bed positioned along the south wall in a rich warm terracotta coral upholstery (#dd5340), crisp white linen bedding, fluffy pillows, and fluted dark charcoal wood (#22252a) headboard with brushed brass metal accents.
- Wardrobe & Loft: Floor-to-ceiling sliding wardrobe in warm rust (#c13c1a) with vertical fluted dark charcoal panels and slim brass handles. Above it, a continuous overhead loft in burnt amber (#e65f33).
- Study & Corner: Burmese teak study desk with laptop and minimalist chair on the side wall, next to an American walnut nightstand. Second wardrobe in matte obsidian (#17181a).
- Walls & Floor: Asian Paints Royale Warm Cream walls, 4-inch cream vitrified tile skirting, warm beige-cream vitrified floor tiles with subtle soft reflections.
- Lighting: Warm 3000K recessed ceiling spotlights, soft ambient under-loft LED strip light, natural daylight pouring in from the window.
- Style: Architectural Digest quality, 24mm wide-angle interior lens, ultra-sharp details, 8k resolution, cinematic photorealism.
```

#### 2. Your Room (Oak, Crimson & Black Minimalist Study)
```text
Photorealistic high-end interior photography of a sleek contemporary bedroom. 
Reference the attached 3D perspective screenshot for the exact room proportions and object placements.

Key elements and finishes:
- Bed: Honey Oak bed frame with crisp cream hotel-grade duvet and textured cushions.
- Wardrobe & Loft: 5ft sliding wardrobe in deep crimson (#b21f1f) with fluted dark charcoal accents (#22252a) and sleek brass trims. Matching overhead loft above in crimson scarlet (#c22424).
- Study Desk: Minimalist matte pitch-black (#000000) study desk with a contemporary charcoal upholstered ergonomic chair, modern slim monitor, warm desk lamp.
- Atmosphere & Lighting: Royale Warm Cream walls, warm wooden architectural touches, recessed warm ceiling lights, soft window daylight from the balcony side.
- Shot: Eye-level wide-angle interior photography, 105-degree FOV, high dynamic range, hyper-detailed textures.
```

#### 3. Living & Dining Hall (Jhula, Murphy Bed, Rose Gold & Sage)
```text
Photorealistic luxury apartment living and dining hall photograph. 
Follow the exact spatial arrangement and camera angle shown in the attached 3D layout image.

Key elements and finishes:
- Living Zone: Mom's dual Murphy queen bed with muted sage green linen sofa (#7f967a). Floating American walnut TV console on the left with 32-inch black TV mounted on an accent wall.
- Dividing Ceiling Beam & Jhula: Concrete ceiling beam spanning overhead in Royale Cream with brass anchor rings suspending a traditional contemporary wooden Jhula swing in sage finish with brass chains. Soft linen sheer curtains framing the transition.
- Dining Zone: 4-seater wooden dining table against the wall in muted sage finish.
- Storage & Puja: Dusty rose silk finish (#c99a94) puja unit and matching appliance counter with fluted dark charcoal details and brass highlights.
- Lighting: Warm ambient ceiling cove lighting, recessed 3000K spots, bright natural afternoon daylight from the large living balcony windows.
- Photography: Hasselblad architectural interior photography, perfectly vertical lines, ultra-realistic textures.
```

#### 4. Kitchen (Architectural Rose Gold & Black Granite)
```text
Photorealistic modern luxury modular kitchen interior photography. 
Follow the exact counter layout and cabinetry placement from the attached 3D planner screenshot.

Key elements and finishes:
- Cabinetry: Lower base units, upper wall cabinets, and overhead lofts all finished in sophisticated Architectural Rose Gold (#b76e79) with vertical fluted charcoal accents (#22252a) and slim brass profile handles.
- Countertop: Jet black polished granite slab with seamless under-mount sink (#1d221c) and 3-burner black glass built-in gas hob.
- Appliances: Brushed stainless steel chimney mounted above hob, steel double-door refrigerator, wall-mounted matte midnight water purifier.
- Lighting: Warm under-cabinet LED strip task lighting illuminating the granite countertop, warm recessed ceiling spots, pristine clean aesthetic.
- Photography: 8k architectural render, sharp reflections, realistic metal and stone textures.
```

---

### Which room would you like to start testing first?
You can take a screenshot of that room directly from the browser window at `http://localhost:8089/C607%20interior%20planner%203d%20models.html`, upload it with the prompt above into your Gemini phone app, or let me know if you want any specific angle/lighting tweaks!