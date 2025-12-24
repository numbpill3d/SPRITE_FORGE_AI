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

const STYLE_GUIDES: Record<PixelStyle, string> = {
  [PixelStyle.Bit8]: "AUTHENTIC NES 8-BIT: Use a strict 3-color palette + transparency (total 4 indices). No sub-pixel gradients. Use blocky shadows and high-contrast highlights. Outline must be solid black or darkest palette color. Aesthetic: Capcom/Nintendo 1987-1990.",
  [PixelStyle.Bit16]: "SNES 16-BIT GOLDEN ERA: Max 16 colors. Use selective outlining (selout) where the outline color changes based on light source. Apply checkerboard dithering for soft transitions. Rich, saturated colors. Aesthetic: SquareSoft/Konami 1992-1995.",
  [PixelStyle.GameBoy]: "GAMEBOY ORIGINAL: Strictly 4 shades of olive green (#0f380f, #306230, #8bac0f, #9bbc0f). No other colors. Focus on high-readability silhouettes and thick outlines to compensate for small screen contrast.",
  [PixelStyle.NeoGeo]: "NEO-GEO ARCADE FIGHTER: Large, chunky pixels with deep, dramatic metallic shading. High contrast 'rim' lighting. Complex sub-palette clusters for muscle definition and fabric folds. Aesthetic: SNK Metal Slug/KOF.",
  [PixelStyle.Cyberpunk]: "RETRO CYBERPUNK: High-contrast night palette. Use neon cyan, magenta, and acidic yellow for highlights. Background shadows should be deep navy or charcoal. Add 1px 'glitch' scanline offsets on moving parts.",
  [PixelStyle.GrimDark]: "GOTHIC PIXEL SOULSLIKE: Muted, desaturated palette of grays, browns, and dried blood red. Use heavy chiaroscuro (strong contrast between light and dark). Gritty textures with scattered pixels to represent dirt/rust.",
  [PixelStyle.Chibi]: "MODERN KAWAII CHIBI: 2-head tall proportions. Large, expressive 'glass' eyes with multi-tone highlights. Soft 'pillow shading' for a round, toy-like look. Thick, rounded outlines.",
  [PixelStyle.PlayStation]: "PS1 PRE-RENDERED STYLE: Simulate 1996 CGI. Use heavy dithering to mimic low-bit depth gradients. No outlines. Highlight edges to define shape against backgrounds. Aesthetic: Donkey Kong Country/Resident Evil 1.",
  [PixelStyle.Vaporwave]: "VAPORWAVE RETRO-FUTURE: Palette of hot pink, neon teal, and electric purple. Use horizontal scanline dithering. Backgrounds should feel like a digital sunset. Soft, glowing 'bloom' effect on highlights.",
  [PixelStyle.ASCII]: "TERMINAL ASCII ART: The character is a grid of text characters (@, #, +, :, .). Use density of characters to represent value. Green-on-black phosphor screen aesthetic. No smooth lines, only character-based edges.",
  [PixelStyle.DitheredMonochrome]: "1-BIT MACINTOSH STYLE: Strictly pure black and pure white. Use complex halftone patterns (Bayer/Floyd-Steinberg) to create the illusion of gray. Extremely sharp, crisp silhouettes.",
  [PixelStyle.Anime]: "MODERN ANIME PIXEL: Clean, thin line-art. 2-3 step cel-shading (Flat, Mid, Shadow). Expressive facial features. Focus on hair physics and 'clothing folds' that follow movement. Aesthetic: Arc System Works pixel era."
};

const ANIMATION_GUIDES: Record<PixelStyle, string> = {
  [PixelStyle.Bit8]: `
    ROW 1 (IDLE): 4 frames. Subtle 1px vertical breathing. Frame 3 features a 1-frame eye blink.
    ROW 2 (RUN): 4 frames. Staccato, snappy movement. Frame 2/4 are 'passing' poses with legs crossed.
    ROW 3 (JUMP): 4 frames. Squash on launch, stretched air pose, tuck at peak, squash on land.
    ROW 4 (ATTACK): 4 frames. Anticipation (1f), Impact (1f), Follow-through (2f). Snappy timing.
  `,
  [PixelStyle.Bit16]: `
    ROW 1 (IDLE): 4 frames. Fluid breathing. Shoulders rise/fall 2px. Secondary motion on hair/capes.
    ROW 2 (RUN): 4 frames. Dynamic gait with 'weight'. Shoulders rotate slightly. Feet have clear contact.
    ROW 3 (JUMP): 4 frames. Arc-based movement. Wind-up before launch. Flailing limbs at peak.
    ROW 4 (ATTACK): 4 frames. Smear frames (motion blur) on the weapon arc. Strong key poses.
  `,
  [PixelStyle.GameBoy]: `
    ROW 1 (IDLE): 4 frames. 1px head bob. Rhythmic shading shift on the body to simulate breathing.
    ROW 2 (RUN): 4 frames. Fast-paced cycle. Legs blur into a wheel-like shape for high-speed feel.
    ROW 3 (JUMP): 4 frames. Classic 'Mario' pose. Arms up, one leg bent. Stiff but readable.
    ROW 4 (ATTACK): 4 frames. Sword/Fist flashes white then dark for maximum impact on monochrome.
  `,
  [PixelStyle.NeoGeo]: `
    ROW 1 (IDLE): 4 frames. Heavy 'fighter' stance. Shoulders heave. Muscle flex on breath-in.
    ROW 2 (RUN): 4 frames. Weighty sprint. Dust puffs at feet. Shoulders lurch forward.
    ROW 3 (JUMP): 4 frames. Athletic leap with rotation. Dynamic foreshortening of the limbs.
    ROW 4 (ATTACK): 4 frames. Explosive power. Frame 2 is a massive 'impact' frame with white-out effects.
  `,
  [PixelStyle.Cyberpunk]: `
    ROW 1 (IDLE): 4 frames. Neon gear pulses. 1px jitter on the outline to simulate digital instability.
    ROW 2 (RUN): 4 frames. Low-profile sprint. Trailing digital artifacts. Arms drag behind.
    ROW 3 (JUMP): 4 frames. Rocket-assist or tech-dash. Blue/Cyan particles at feet.
    ROW 4 (ATTACK): 4 frames. Katana/Laser slash with cyan motion trails and digital glitches.
  `,
  [PixelStyle.GrimDark]: `
    ROW 1 (IDLE): 4 frames. Exhausted, heavy breathing. Body slumps on frame 3. Weapon tip drags.
    ROW 2 (RUN): 4 frames. Lumbering, desperate charge. Weighty footfalls. Shoulders low.
    ROW 3 (JUMP): 4 frames. Struggling leap. Arms reach for the ledge. Heavy landing.
    ROW 4 (ATTACK): 4 frames. Visceral, slow swing. Frame 3 is the impact with grit particles.
  `,
  [PixelStyle.Chibi]: `
    ROW 1 (IDLE): 4 frames. Hyper-bouncy. Head bobs 3px. Happy, rhythmic swaying.
    ROW 2 (RUN): 4 frames. 'Airplane' run. Arms out, feet tiny and fast. Happy facial expression.
    ROW 3 (JUMP): 4 frames. Ball-like tuck. Star-shaped pose at peak. Cute landing.
    ROW 4 (ATTACK): 4 frames. 'BONK!' effect. Weapon size doubles on frame 2 for cartoon impact.
  `,
  [PixelStyle.PlayStation]: `
    ROW 1 (IDLE): 4 frames. Subtle mesh jitter. Interpolated-look breathing cycle.
    ROW 2 (RUN): 4 frames. Pre-rendered 3D walk cycle look. Smooth but rasterized.
    ROW 3 (JUMP): 4 frames. 3D transform look. Fixed poses that feel like a rotated model.
    ROW 4 (ATTACK): 4 frames. Frame 2 has 'motion-blur' dithered trails. Gouraud-shaded weapon.
  `,
  [PixelStyle.Vaporwave]: `
    ROW 1 (IDLE): 4 frames. Slow vertical floating (2-4px sine wave). Ethereal hair movement.
    ROW 2 (RUN): 4 frames. Sliding motion with pink trail artifacts. Gliding posture.
    ROW 3 (JUMP): 4 frames. Slow-motion ascent. Character might turn semi-transparent.
    ROW 4 (ATTACK): 4 frames. VHS tracking error effect on impact. Magenta energy discharge.
  `,
  [PixelStyle.ASCII]: `
    ROW 1 (IDLE): 4 frames. Rhythmic character density shifting (@ -> # -> % -> #).
    ROW 2 (RUN): 4 frames. Rapid character changes on the legs to simulate movement.
    ROW 3 (JUMP): 4 frames. Character block shifts up. Vertical trail of '.' symbols.
    ROW 4 (ATTACK): 4 frames. Impact area fills with '!' and '*' characters.
  `,
  [PixelStyle.DitheredMonochrome]: `
    ROW 1 (IDLE): 4 frames. Shadow dithering patterns 'scrawl' upwards. 1px head shift.
    ROW 2 (RUN): 4 frames. High-contrast silhouette changes. Sharp, jerky limb movement.
    ROW 3 (JUMP): 4 frames. White silhouette against dark background switch on jump.
    ROW 4 (ATTACK): 4 frames. Black/White inversion on the impact frame for strobe effect.
  `,
  [PixelStyle.Anime]: `
    ROW 1 (IDLE): 4 frames. Blinking eyes (frame 3). Subtle 2-frame hair sway. Chest expansion.
    ROW 2 (RUN): 4 frames. Lean-forward sprint. Arms tucked. High knee lift. Believable gait.
    ROW 3 (JUMP): 4 frames. Dramatic vertical arc. Clothing flows upwards during descent.
    ROW 4 (ATTACK): 4 frames. Frame 2 is a high-contrast 'impact' keyframe with speed lines.
  `
};

export const analyzeCharacter = async (base64Image: string): Promise<CharacterAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      description: { type: Type.STRING },
      features: { type: Type.ARRAY, items: { type: Type.STRING } },
      colors: { type: Type.ARRAY, items: { type: Type.STRING } },
      animationSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
      bodyType: { type: Type.STRING }
    },
    required: ["name", "description", "features", "colors", "animationSuggestions", "bodyType"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/png", data: base64Image } },
          { text: "Analyze this character for a pixel art sprite sheet. Detect equipment, clothing, and anatomy." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      }
    });

    const text = response.text;
    if (!text) throw new Error("No analysis generated");
    return JSON.parse(text) as CharacterAnalysis;
  } catch (error) {
    console.error("Analysis failed:", error);
    return {
      name: "Hero_Entity",
      description: "Fallback analysis.",
      features: ["Core_Module", "Limb_Systems"],
      colors: ["#FF00FF", "#00FFFF"],
      animationSuggestions: ["Maintain silhouette integrity"],
      bodyType: "Standard"
    };
  }
};

export const generateSpriteSheet = async (
  base64Image: string, 
  style: PixelStyle, 
  analysis: CharacterAnalysis
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });

  const styleInstructions = STYLE_GUIDES[style] || STYLE_GUIDES[PixelStyle.Bit16];
  const animationInstructions = ANIMATION_GUIDES[style] || ANIMATION_GUIDES[PixelStyle.Bit16];

  const prompt = `
    TASK: GENERATE A PERFECTLY ALIGNED 1024x1024 PIXEL ART SPRITE SHEET.
    
    GRID SYSTEM (STRICT):
    - SHEET SIZE: 1024x1024 pixels.
    - LAYOUT: 4 columns x 4 rows.
    - CELL SIZE: EXACTLY 256x256 pixels.
    - SPRITE CENTERING: Each individual sprite frame MUST BE CENTERED PERFECTLY inside its 256x256 cell. 
    - No sprite pixels should touch the cell borders (leave a 20px padding).
    - FOOT BASELINE: All standing/walking frames must share the same horizontal Y-coordinate for feet.
    
    STYLE PROTOCOL:
    - MODE: ${style}
    - ARTISTIC RULES: ${styleInstructions}
    
    ANIMATION DATA:
    - ROW 1 (Y=0 to 255): IDLE (Nuanced breathing, blinks, micro-motion).
    - ROW 2 (Y=256 to 511): RUN (Believable weight, foot contact, gait cycle).
    - ROW 3 (Y=512 to 767): JUMP (Arc-based physics, squash and stretch).
    - ROW 4 (Y=768 to 1023): ATTACK (Strong keyframes, anticipation, impact).
    
    ANIMATION RULES: ${animationInstructions}
    
    MANDATORY: 
    - Animations must follow traditional 2D sprite principles. 
    - NO TWEENING. Hand-animated pixel positions only. 
    - Transparent or solid WHITE background.
    - Output ONLY the 1024x1024 image.
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
          aspectRatio: "1:1"
        }
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
    
    throw new Error("Empty response from Image Engine");
  } catch (error) {
    console.error("Sprite generation failed:", error);
    throw error;
  }
};