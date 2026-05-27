---
name: logo-removal-retouching
description: >
  Professional AI prompt generation for removing logos, brand marks, or trademarks from product images
  while preserving every other visual element with photorealistic accuracy. Use this skill whenever the
  user wants to: remove a logo or brand mark from a product photo, debrand packaging or merchandise,
  clean up product images for white-label or mockup use, prepare e-commerce photos without branding,
  or retouch commercial product photography by eliminating any existing mark, badge, label, or graphic.
  Triggers on phrases like "remove the logo", "take off the branding", "erase the brand mark", "clean
  the product image", "white-label retouch", "debrand this photo", or any combination of product
  photography and logo/brand removal intent. Always use this skill before generating any image editing
  prompt when a product photo needs its branding removed.
---

# Logo Removal & Product Retouching Skill

This skill generates precise, layered prompts for AI image tools (Adobe Firefly, Photoshop Generative
Fill, Stable Diffusion inpainting, Midjourney, DALL·E, etc.) to professionally remove logos or brand
marks from product images — with zero visible artifacts and full preservation of all other elements.

---

## Workflow

### Step 1 — Understand the Image Context

Before generating a prompt, ask (or infer from the user's message):

1. **What type of product?** (e.g., bottle, packaging box, clothing, electronics, jewelry)
2. **What surface does the logo sit on?** (e.g., glossy label, matte cardboard, fabric, glass, metal)
3. **What surrounds the logo?** (e.g., gradient, pattern, plain color, text, texture)
4. **Which AI tool will be used?** (affects prompt format — see Tool-Specific Notes below)
5. **Image resolution / commercial use?** (affects quality language to include)

If the user hasn't specified, default to the Advanced Version prompt and recommend Photoshop Generative
Fill or Adobe Firefly for best results.

---

### Step 2 — Select the Right Prompt Tier

#### TIER 1 — Standard Removal
*Use for: simple logos on flat, uniform surfaces (plain white label, solid color packaging)*

```
Remove the existing logo/branding from the product image while preserving every other element
exactly as-is. Maintain the original product shape, texture, lighting, shadows, reflections,
colors, perspective, material details, packaging structure, camera angle, focus, and overall
composition. Do not alter the product design, label layout, typography placement, background,
or surrounding objects. Seamlessly reconstruct the area where the logo was removed so it appears
naturally blank, clean, and professionally manufactured. Ensure the edit is undetectable and
photorealistic, with no artifacts, blurring, distortion, or AI inconsistencies. Keep the original
image quality, sharpness, and commercial e-commerce aesthetic intact.
```

#### TIER 2 — Advanced Precision Removal ⭐ (Recommended Default)
*Use for: complex surfaces — foil labels, embossed packaging, glossy bottles, textured fabric,
jewelry, reflective metal, layered print*

```
Professionally remove only the logo/brand mark from the product image. Preserve all remaining
visual information with pixel-level accuracy, including packaging proportions, gradients, textures,
foil effects, gloss, highlights, shadows, reflections, wrinkles, embossing, print grain, and
environmental lighting. Rebuild the removed logo area naturally using surrounding design continuity
so the product appears originally manufactured without branding. Do not modify any text placement,
bottle shape, jewelry details, label alignment, background composition, depth of field, or product
positioning. Output should look like a high-end commercial retouch created by a professional product
photographer and packaging designer.
```

#### TIER 3 — Full Stack (Positive + Negative + Precision Lock)
*Use for: maximum-fidelity output, hero shots, client deliverables, white-label product catalogs*

Combine TIER 2 with:

**Negative Prompt (add separately in tools that support it):**
```
Do not change product color, shape, texture, lighting, shadows, reflections, camera angle,
background, packaging dimensions, jewelry details, or label structure. Avoid blur, smudging,
warped text, AI artifacts, fake textures, inconsistent lighting, duplicated patterns, or
altered composition.
```

**Precision Lock Add-on (append to main prompt):**
```
Edit only the logo area. Everything else must remain identical to the original image.
```

---

### Step 3 — Assemble the Final Prompt

Use this structure to build the output:

```
[TIER 2 or TIER 3 main prompt]
+ [Surface-specific language if needed — see below]
+ [Precision Lock Add-on]
+ [Negative Prompt — if tool supports it]
```

---

## Surface-Specific Language Additions

Append the relevant phrase to the main prompt based on product type:

| Surface / Product | Add to prompt |
|---|---|
| Glass bottle / jar | "Preserve glass transparency, refractions, caustics, and internal liquid depth." |
| Metallic / foil label | "Maintain all specular highlights, foil shimmer, and hot-stamp detail in the surrounding area." |
| Matte cardboard box | "Reconstruct the area with matching matte paper texture, print grain, and edge die-cut sharpness." |
| Fabric / apparel | "Preserve fabric weave, thread texture, folds, and garment stitching around the removed area." |
| Embossed / debossed | "Match surrounding emboss depth, relief shadow, and tactile surface impression." |
| Jewelry / accessories | "Retain all metal sheen, gemstone reflections, prong details, and surface polish continuity." |
| Electronics / devices | "Preserve molded plastic grain, vent geometry, port placement, and surface finish transitions." |
| Cosmetics tube / pump | "Maintain tube curvature, crimp detail, nozzle geometry, and gradient label wrap continuity." |

---

## Tool-Specific Notes

### Adobe Photoshop Generative Fill
- Use a precise selection mask around ONLY the logo
- Enter TIER 2 prompt in the Generative Fill dialog
- Run 3 variations; select the cleanest
- Negative prompts not natively supported — use prompt phrasing to avoid artifacts instead

### Adobe Firefly (Web / API)
- Use Generative Fill with tight mask
- Supports descriptive prompts well; TIER 2 + Precision Lock works best
- Style Reference: upload a clean section of the product label as style reference

### Stable Diffusion (Inpainting)
- Mask: logo area only, feather 2–4px
- Positive prompt: TIER 2 + surface additions
- Negative prompt: paste the full Negative Prompt from TIER 3
- Denoising strength: 0.55–0.70 (lower = more faithful to original)
- Sampler: DPM++ 2M Karras or Euler A

### DALL·E (ChatGPT / API)
- Use TIER 1 or TIER 2; DALL·E doesn't accept negative prompts
- Upload the product image with the logo area clearly visible
- Append: "Only modify the logo region. Preserve everything else exactly."

### Midjourney (Vary Region)
- Select logo region with Vary (Region) tool
- Paste TIER 1 prompt; Midjourney ignores lengthy prompts, so keep it under 60 words
- Shortened version for MJ:
  ```
  Remove only the brand logo. Reconstruct surface naturally. Preserve all product textures,
  lighting, shadows, packaging, background. Photorealistic commercial retouch. No artifacts.
  ```

---

## Output Format

Always present the prompt to the user in a clearly labeled, copyable code block. Include:

1. The selected tier and why
2. The assembled final prompt (ready to paste)
3. The negative prompt (if applicable)
4. Tool recommendation if the user hasn't chosen one

---

## Quality Check Phrases (for user guidance)

After providing the prompt, optionally remind the user:

> "After the edit, check for: consistent surface texture across the removed area, no repeated
> tile patterns, matching edge sharpness, and lighting continuity with the rest of the product.
> If artifacts appear, reduce denoising strength (SD) or re-run with a tighter mask."

---

## Example Output

**User says:** "Remove the Nike swoosh from this shoe product photo — it's on a textured fabric upper."

**Claude responds:**

> Using **Tier 2 + Fabric surface addition + Precision Lock** for a complex textile surface.

**Main Prompt:**
```
Professionally remove only the logo/brand mark from the product image. Preserve all remaining
visual information with pixel-level accuracy, including packaging proportions, gradients, textures,
foil effects, gloss, highlights, shadows, reflections, wrinkles, embossing, print grain, and
environmental lighting. Rebuild the removed logo area naturally using surrounding design continuity
so the product appears originally manufactured without branding. Do not modify any text placement,
bottle shape, jewelry details, label alignment, background composition, depth of field, or product
positioning. Output should look like a high-end commercial retouch created by a professional product
photographer and packaging designer. Preserve fabric weave, thread texture, folds, and garment
stitching around the removed area. Edit only the logo area. Everything else must remain identical
to the original image.
```

**Negative Prompt:**
```
Do not change product color, shape, texture, lighting, shadows, reflections, camera angle,
background, packaging dimensions, jewelry details, or label structure. Avoid blur, smudging,
warped text, AI artifacts, fake textures, inconsistent lighting, duplicated patterns, or
altered composition.
```

> **Recommended tool:** Photoshop Generative Fill or Stable Diffusion Inpainting with denoising 0.60.
