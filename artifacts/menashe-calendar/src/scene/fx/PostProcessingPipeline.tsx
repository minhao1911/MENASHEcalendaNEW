/**
 * scene/fx/PostProcessingPipeline.tsx
 *
 * Phase 1 — Post-processing effects pipeline.
 *
 * Active effects:
 *  1. SMAA         — temporal-stable anti-aliasing
 *  2. Bloom        — HDR glow on bright emissive surfaces (candles, lanterns)
 *
 * SSAO is defined and ready to slot in (Phase 2) but disabled by default —
 * it requires a normal pass and significant GPU budget.
 *
 * ToneMapping is handled by the WebGLRenderer in SceneFoundation (ACES filmic)
 * so we do not double-apply it here.
 */
import { BlendFunction } from "postprocessing";
import { EffectComposer, SMAA, Bloom } from "@react-three/postprocessing";

interface PostProcessingPipelineProps {
  /** Enable SMAA anti-aliasing. Default true. */
  enableSMAA?: boolean;
  /** Enable bloom. Default true. */
  enableBloom?: boolean;
  /**
   * SSAO — reserved for Phase 2. Accepted here for API stability but
   * currently ignored because enabling it requires disableNormalPass=false
   * and a dedicated performance budget.
   */
  enableSSAO?: boolean;
  /** Bloom glow intensity. Default 1.4 */
  bloomIntensity?: number;
  /** Bloom luminance threshold (0–1). Default 0.28 */
  bloomThreshold?: number;
}

export function PostProcessingPipeline({
  enableSMAA      = true,
  enableBloom     = true,
  bloomIntensity  = 1.4,
  bloomThreshold  = 0.28,
}: PostProcessingPipelineProps) {
  return (
    <EffectComposer
      multisampling={0}     /* SMAA handles AA — no MSAA fill needed */
    >
      {/* Anti-aliasing */}
      <SMAA />

      {/* HDR bloom — intensity 0 = effectively off, so no branching needed */}
      <Bloom
        intensity={enableBloom ? bloomIntensity : 0}
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={0.82}
        mipmapBlur
        blendFunction={BlendFunction.ADD}
        levels={7}
      />
    </EffectComposer>
  );
}
