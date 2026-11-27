import { CHARACTER_META } from './CharacterMeta.js';
import { FaceTextureManager } from './FaceTextureManager.js';
import { createChibiBase } from './ChibiBaseBuilder.js';
import { createAcousticGuitarProp, createCoffeeMugProp } from './HandheldProps.js';
import { AgentRig } from './AgentRig.js';
import { applyRachelStyle } from './outfits/rachel.js';
import { applyMonicaStyle } from './outfits/monica.js';
import { applyChandlerStyle } from './outfits/chandler.js';
import { applyRossStyle } from './outfits/ross.js';
import { applyJoeyStyle } from './outfits/joey.js';
import { applyPhoebeStyle } from './outfits/phoebe.js';

const STYLE_BUILDERS = {
  rachel: applyRachelStyle,
  monica: applyMonicaStyle,
  chandler: applyChandlerStyle,
  ross: applyRossStyle,
  joey: applyJoeyStyle,
  phoebe: applyPhoebeStyle,
};

/**
 * Factory assembling a complete articulated Vinyl Chibi character by character_id.
 */
export function createCharacter(characterId) {
  const meta = CHARACTER_META[characterId];
  if (!meta) {
    throw new Error(`Unknown character_id: ${characterId}`);
  }

  const faceManager = new FaceTextureManager(characterId, meta.faceStyle);
  const parts = createChibiBase(meta, faceManager.texture);

  const styleBuilder = STYLE_BUILDERS[characterId];
  if (styleBuilder) {
    styleBuilder(parts, meta);
  }

  // Attach reusable handheld props for sip_coffee and play_guitar gestures
  const coffeeProp = createCoffeeMugProp();
  parts.rightArm.handAnchor.add(coffeeProp);

  const guitarProp = createAcousticGuitarProp();
  parts.torsoGroup.add(guitarProp);

  // Tag every child mesh with characterId for instant raycast click detection
  parts.rootGroup.traverse((obj) => {
    if (obj.isMesh) {
      obj.userData.characterId = characterId;
    }
  });

  return new AgentRig({
    meta,
    parts,
    faceManager,
    coffeeProp,
    guitarProp,
  });
}
