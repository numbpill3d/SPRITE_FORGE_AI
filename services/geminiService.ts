import { GoogleGenAI, Type, Schema } from "@google/genai";
import { PixelStyle, CharacterAnalysis } from "../types";

// Helper to validate API key
const getApiKey = (): string => {
  const key = process.env.API_KEY;
  if (!key) {
    console.error("API_KEY is missing from environment variables.");
    throw new Error("API Key missing. Please check your configuration.");
  }
  return key;
};

// Detailed Artistic Instructions for each preset
const STYLE_GUIDES: Record<PixelStyle, string> = {
  [PixelStyle.Bit8]: "AUTHENTIC NES 8-BIT: Palette is strictly 3 colors + transparency per sprite. NO anti-aliasing. Pixels must be square and large. No gradients. Shading is flat. Aesthetics: Mega Man / Mario 3.",
  [PixelStyle.Bit16]: "SNES 16-BIT GOLDEN ERA: Max 16 colors. Vibrant, saturated. Use dithering for gradients. Colored outlines (selout). Aesthetics: Chrono Trigger / FF6 / Metal Slug.",
  [PixelStyle.GameBoy]: "GAMEBOY ORIGINAL: 4 shades of green (#0f380f, #306230, #8bac0f, #9bbc0f). High contrast. No anti-aliasing. Blocky, readable shapes. Aesthetics: Pokemon Red / Kirby.",
  [PixelStyle.NeoGeo]: "NEO-GEO MASTERPIECE: High pixel density. Deep, metallic shading. High contrast highlights. Muscle definition via pixel clusters. 'Chunky' sprites. Aesthetics: Metal Slug / KOF.",
  [PixelStyle.Cyberpunk]: "RETRO CYBERPUNK: Dark background contrast. Neon Cyan/Magenta highlights. Tech-wear details. Glitch aesthetics. Sharp, jagged geometry. Aesthetics: Katana Zero.",
  [PixelStyle.GrimDark]: "GOTHIC PIXEL SOULSLIKE: Desaturated, earthy palette (Browns/Greys). Heavy black shadows (Chiaroscuro). Gritty textures. Blood/Rust details. Aesthetics: Blasphemous.",
  [PixelStyle.Chibi]: "MODERN CHIBI: 2-Head proportions (SD). Huge eyes. Thick outlines. Soft, pillow shading. Cute, rounded anatomy. Minimal detail on limbs. Aesthetics: MapleStory.",
  [PixelStyle.PlayStation]: "PS1 PRE-RENDERED: 3D-to-2D conversion look. Dithered lighting. No outlines. Gouraud shading look. Low-res rasterization. Aesthetics: Donkey Kong Country / Diablo 1."
};

// Animation Rules per Style
const ANIMATION_GUIDES: Record<PixelStyle, string> = {
  [PixelStyle.Bit8]: `
    [ROW 1] IDLE: Simple 2-frame bounce loop (A-B-A-B). Stiff, grid-snapped vertical movement. Eyes blink.
    [ROW 2] RUN: 3-frame cycle repeated (A-B-C-B). 'Mega Man' slide run. Legs blur into a wheel.
    [ROW 3] JUMP: Static 'Air' pose held. Arms up, legs tucked.
    [ROW 4] ATTACK: Staccato stab/shoot. Frame 1: Ready. Frame 2: Action. Frame 3-4: Hold.
  `,
  [PixelStyle.Bit16]: `
    [ROW 1] IDLE: 4-frame breathing cycle (Inhale-Hold-Exhale-Hold). Sub-pixel hair/cape motion.
    [ROW 2] RUN: 4-frame Sprint. High-knees. Exaggerated forward lean (Sonic style). Smear lines on feet.
    [ROW 3] JUMP: Fluid Squash -> Launch -> Peak Tuck -> Land.
    [ROW 4] ATTACK: Anticipation -> Smear Frame (White Arc) -> Extension -> Recovery.
  `,
  [PixelStyle.GameBoy]: `
    [ROW 1] IDLE: Minimal 1px shift (A-B-A-B). High contrast silhouette.
    [ROW 2] RUN: Fast cycle (A-B-C-D). Legs are motion-blurred into a solid shape.
    [ROW 3] JUMP: Spread-eagle pose to maximize readability.
    [ROW 4] ATTACK: Simple, readable strike. Weapon flashes black/white.
  `,
  [PixelStyle.NeoGeo]: `
    [ROW 1] IDLE: Heavy 'fighter' breathing. Shoulders heave up/down noticeably. Cloth ripples.
    [ROW 2] RUN: 'Military' sprint. Weighty, grounded steps. Dust clouds on footfalls.
    [ROW 3] JUMP: Dynamic foreshortening (Knee towards camera). Action movie pose.
    [ROW 4] ATTACK: Over-the-top slash/explosion. Heavy visual FX (muzzle flash or energy trail).
  `,
  [PixelStyle.Cyberpunk]: `
    [ROW 1] IDLE: Nervous energy. Glitch artifacts flicker on outline. Neon gear pulses.
    [ROW 2] RUN: Low center of gravity. 'Naruto' run (arms drag behind). Cyber-trails.
    [ROW 3] JUMP: Rocket-assist or anti-gravity float. Tech debris particles.
    [ROW 4] ATTACK: Laser-sharp katana slash (Cyan/Magenta arc). Digital distortion on impact.
  `,
  [PixelStyle.GrimDark]: `
    [ROW 1] IDLE: Exhausted/Pained breathing. Weapon drags or feels incredibly heavy. Head low.
    [ROW 2] RUN: Desperate, lumbering charge. Weighty, non-athletic movement.
    [ROW 3] JUMP: Heavy, struggling leap. Arms flail slightly.
    [ROW 4] ATTACK: Brutal, visceral swing. Wide arc. Blood/Debris splatter on extension.
  `,
  [PixelStyle.Chibi]: `
    [ROW 1] IDLE: Bouncy! Head bobs Up/Down/Up/Down. Happy, energetic vibe.
    [ROW 2] RUN: 'Airplane' run (Arms out) or rapid tiny steps. Feet blur.
    [ROW 3] JUMP: Joyful star-jump or ball tuck. Eyes might close.
    [ROW 4] ATTACK: 'BONK!' Giant weapon exaggerated swing. Sparkles/Impact star.
  `,
  [PixelStyle.PlayStation]: `
    [ROW 1] IDLE: 'Breathing' mesh deformation. Slight polygon jitter.
    [ROW 2] RUN: Smooth interpolated movement but rasterized at low-res.
    [ROW 3] JUMP: Stiff 3D model pose transform.
    [ROW 4] ATTACK: Smooth weapon arc with pre-baked lighting highlights.
  `
};

// Analyze the image to detect limbs and objects
export const analyzeCharacter = async (base64Image: string): Promise<CharacterAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "A creative name for the character" },
      description: { type: Type.STRING, description: "Short visual description" },
      features: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "List of detected visible limbs, equipment, and clothing items" 
      },
      colors: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Main 3-4 hex color codes found in the character"
      },
      animationSuggestions: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "3 specific animation advice strings (e.g. 'Cape flows back', 'Heavy armor limits jump')"
      },
      bodyType: {
        type: Type.STRING,
        description: "Proportions: 'Chibi' (2 heads tall), 'Retro' (3-4 heads), or 'Realistic' (6-7 heads)"
      }
    },
    required: ["name", "description", "features", "colors", "animationSuggestions", "bodyType"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/png", data: base64Image } },
          { text: "Analyze this character for a pixel art sprite sheet. Identify limbs, weapons, and clothing physics. Extract the core color palette." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: "You are a Technical Artist. Analyze the image to help an animator create a sprite sheet."
      }
    });

    const text = response.text;
    if (!text) throw new Error("No analysis generated");
    return JSON.parse(text) as CharacterAnalysis;
  } catch (error) {
    console.error("Analysis failed:", error);
    // Fallback data
    return {
      name: "Unknown Hero",
      description: "Analysis failed",
      features: ["Head", "Body"],
      colors: ["#FFFFFF"],
      animationSuggestions: ["Keep movement simple"],
      bodyType: "Retro"
    };
  }
};

// Generate the sprite sheet
export const generateSpriteSheet = async (
  base64Image: string, 
  style: PixelStyle, 
  analysis: CharacterAnalysis
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });

  const styleInstructions = STYLE_GUIDES[style] || STYLE_GUIDES[PixelStyle.Bit16];
  const animationInstructions = ANIMATION_GUIDES[style] || ANIMATION_GUIDES[PixelStyle.Bit16];

  const prompt = `
    Role: Senior Pixel Animator (Konami/Capcom era).
    Task: Create a 4-Column x 4-Row Sprite Sheet.
    
    CHARACTER: ${analysis.name} (${analysis.bodyType})
    VISUAL STYLE: ${styleInstructions}
    
    CRITICAL TECH RULES (NO SLIDING):
    1. **GRID**: Strictly 4 columns x 4 rows.
    2. **ISOLATION**: Ensure clear whitespace between sprites. NO OVERLAP.
    3. **CENTERING**: Character anchored to center. NO walking off-center.
    4. **BACKGROUND**: Solid White (#FFFFFF).
    
    ANIMATION ROWS (4 FRAMES EACH):
    ${animationInstructions}
    
    OUTPUT CONFIG:
    - Grid: 4x4.
    - Format: Pixel Art (Nearest Neighbor scaling).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/png", data: base64Image } },
          { text: prompt }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1" // Perfect square for 4x4 grid
        },
        systemInstruction: "You are a Pixel Art Engine. Output only high-quality, aliased pixel art sprites. No blurry illustrations."
      }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image generated");
  } catch (error) {
    console.error("Sprite generation failed:", error);
    throw error;
  }
};
