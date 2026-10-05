# Shopora watch try-on model

Shopora's own AI model for making "Try On Yourself" results look really worn. It is an SDXL
**LoRA** (a small add-on trained on your images) used with **SDXL inpainting**.

## How it fits together

```
customer photo ──► 3D AR try-on (browser)          ──► composite + mask of the watch area
                   hand tracking, wrist measurement,
                   vendor's .glb placed on the wrist
                                                    ──► /api/try-on/enhance (Next.js)
                                                    ──► model server (serve_tryon.ipynb)
                                                        SDXL inpainting + your LoRA repaints
                                                        only the masked area at low strength
                                                    ◄── photoreal result
```

The 3D render decides **where** the watch goes and **what it looks like**, so dial text, logos
and shape come from the vendor's model. The AI pass only adds what a render lacks: the strap
pressing into skin, contact shadows, matching light and camera grain.

## Licence

- `stabilityai/stable-diffusion-xl-base-1.0` and `diffusers/stable-diffusion-xl-1.0-inpainting-0.1`
  are under **CreativeML OpenRAIL++-M**, which allows commercial use subject to its use restrictions.
- Train only on images you have the rights to use: your own photos, photos you commissioned, or
  vendor photos they licensed to you. Don't scrape the web.
- Customers' photos sent to the model server must not be stored or reused for training without
  their consent. The provided server keeps nothing.

## Step 1 — Collect a dataset

**Realism mode** (one model for the whole store, start here):
- 150–500 photos of real people wearing watches on their wrist.
- Mix of skin tones, wrist sizes, angles (back of hand, side), lighting (daylight, indoor, flash).
- Watch clearly visible and in focus; at least 768 px on the short side; no watermarks or text.
- Optional `captions.csv` with columns `file_name,text` describing each photo, e.g.
  `img_012.jpg,a realistic photo of a woman's left wrist wearing a gold watch with a black dial, daylight`.
  Without it, every image uses a generic caption.

**Product mode** (one model per hero product, optional):
- 15–30 photos of **one** watch: worn on different wrists and angles, plus a few product shots.
- Results are triggered by the word `shpwtch` (change `TRIGGER` in both notebooks).

Upload to Google Drive:

```
MyDrive/shopora-tryon/datasets/<dataset-name>/   images + optional captions.csv
```

## Step 2 — Train (Colab)

1. Open `train_watch_lora.ipynb` in Google Colab (File → Upload notebook).
2. Runtime → Change runtime type → **GPU**.
3. Set `MODE` and `DATASET_NAME` in the Configure cell, then run all cells.

The LoRA is saved to `MyDrive/shopora-tryon/loras/<dataset-name>/pytorch_lora_weights.safetensors`,
with checkpoints every 250 steps. Rough timings: a T4 (free) trains at 768 px in about 1.5–3 hours
for 2000 steps; an A100 (Colab Pro) at 1024 px is several times faster. Free Colab can disconnect;
re-run with `--resume_from_checkpoint=latest` added to the command.

## Step 3 — Test and serve (Colab)

1. In Shopora, open `/prototype/photo-try-on-debug?model=<glb url>&rotation=auto`, choose a wrist
   photo, then **Download composite** and **Download mask**.
2. Open `serve_tryon.ipynb`, set `LORA_DIR`, and run up to "Try it on a photo" to compare strengths
   (0.3 / 0.45 / 0.6). Lower keeps the 3D render's exact design; higher adds more realism.
3. Run the last cell. It prints:

   ```
   TRYON_ENHANCE_URL = https://<random>.trycloudflare.com
   TRYON_ENHANCE_KEY = <secret>
   ```

4. Put both in Shopora's `.env.local` and restart `npm run dev`. The try-on result now shows
   **Make it photoreal (AI)**. With the variables unset the button stays hidden.

The Colab URL changes on every run and the session stops after a while, so this is for testing.

## Step 4 — Production

Run `serve_tryon.ipynb`'s code (cells 2–5, without the tunnel) on a GPU host with a fixed URL:
RunPod / Modal / Replicate serverless GPUs, or a cloud VM with a ≥16 GB NVIDIA GPU. One request
takes a few seconds on an A10/L4-class GPU. Keep `TRYON_ENHANCE_KEY` secret; only Shopora's server
calls the model, never the browser.

## Judging quality

Compare "AI photoreal" and "3D render" on 20–30 photos the model never saw:
- Is the watch still clearly the vendor's product (dial, colour, shape)?
- Does the strap sit on the skin, with shadows matching the photo's light?
- Any artefacts: warped fingers, smeared dial, a second watch?

If the design drifts, lower the strength or `LORA_SCALE`. If it still looks pasted on, raise the
strength slightly or train longer on more varied realism photos.
