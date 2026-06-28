/**
 * scene/fx/PostProcessingPipeline.tsx — Phase 5 (quality-aware)
 *
 * Active effects:
 *  1. SMAA         — temporal-stable anti-aliasing
 *  2. Bloom        — HDR glow on candles / lanterns
 *  3. Vignette     — cinematic edge darkening
 *
 * On battery-saver quality the entire EffectComposer is skipped to save
 * a full render pass worth of GPU work.
 */
import { BlendFunction } from "postprocessing";
import { EffectComposer, SMAA, Bloom, Vignette } from "@react-three/postprocessing";
import { useQuality } from "../QualityContext";

interface PostProcessingPipelineProps {
  enableSMAA?:      boolean;
  enableBloom?:     boolean;
  enableSSAO?:      boolean;
  bloomIntensity?:  number;
  bloomThreshold?:  number;
}

export function PostProcessingPipeline({
  enableSMAA     = true,
  enableBloom    = true,
  bloomIntensity,
  bloomThreshold,
}: PostProcessingPipelineProps) {
  const q = useQuality();

  if (!q.postProcessing) return null;

  const intensity  = bloomIntensity  ?? q.bloomIntensity;
  const threshold  = bloomThreshold  ?? q.bloomThreshold;

  return (
    <EffectComposer multisampling={0}>
      {enableSMAA ? <SMAA /> : null}

      <Bloom
        intensity={enableBloom && q.bloomEnabled ? intensity : 0}
        luminanceThreshold={threshold}
        luminanceSmoothing={0.92}
        mipmapBlur
        blendFunction={BlendFunction.ADD}
        levels={q.tier === "high" ? 8 : 5}
      />

      <Vignette
        offset={0.32}
        darkness={0.44}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}
