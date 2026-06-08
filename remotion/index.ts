/**
 * Remotion Entry Point
 * ====================
 * This file is the entry point for the Remotion CLI and Studio.
 *
 * Commands:
 *   npx remotion studio src/remotion/index.ts
 *   npx remotion render src/remotion/index.ts LaunchVideo out/senzor-launch.mp4
 *   npx remotion render src/remotion/index.ts BrandIntro out/brand-intro.mp4
 *   npx remotion still src/remotion/index.ts Thumbnail out/thumbnail.png
 */

import { registerRoot } from "remotion";
import { Root } from "./Root";

registerRoot(Root);
