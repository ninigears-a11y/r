import React from "react";
import { Composition } from "remotion";
import { CanaryShort, CANARY_FRAMES } from "./videos/canary/Canary";

export const Root: React.FC = () => (
  <>
    <Composition id="CanaryShort" component={CanaryShort} durationInFrames={CANARY_FRAMES} fps={30} width={1080} height={1920} />
  </>
);
