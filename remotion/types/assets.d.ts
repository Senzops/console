/**
 * Asset type declarations for Remotion webpack bundling.
 * Allows direct import of audio/media files as URL strings.
 */

declare module "*.mp3" {
  const src: string;
  export default src;
}

declare module "*.wav" {
  const src: string;
  export default src;
}

declare module "*.ogg" {
  const src: string;
  export default src;
}
