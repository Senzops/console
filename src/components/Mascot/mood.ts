import type { MascotMood } from './index';

/** Mirrors `engineStatus` in `src/lib/ai/context.tsx`. */
export type AssistantEngineStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'error'
  | 'unsupported';

/**
 * Maps AI-assistant state to a mascot mood so the Mascot component stays
 * purely presentational. `restingMood` is what the mascot does when nothing
 * is happening — e.g. 'greeting' on the welcome screen, 'idle' elsewhere.
 */
export function moodFromAssistantState(
  state: {
    engineStatus: AssistantEngineStatus;
    isGenerating: boolean;
  },
  restingMood: MascotMood = 'idle',
): MascotMood {
  if (state.engineStatus === 'error' || state.engineStatus === 'unsupported') {
    return 'error';
  }
  if (state.engineStatus === 'loading' || state.isGenerating) {
    return 'thinking';
  }
  return restingMood;
}
