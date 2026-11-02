import React from "react";
import { Composition } from "remotion";
import { CanaryShort, CANARY_FRAMES } from "./videos/canary/Canary";
import { SnowShort, SNOW_FRAMES } from "./videos/canary/Snow";

export const Root: React.FC = () => (
  <>
    <Composition id="CanaryShort" component={CanaryShort} durationInFrames={CANARY_FRAMES} fps={30} width={1080} height={1920} />
    <Composition id="SnowShort" component={SnowShort} durationInFrames={SNOW_FRAMES} fps={15} width={1080} height={1920} />
  </>
);
