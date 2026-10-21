import type { Page } from "@playwright/test";

// Headless Chromium can report AudioContext.state "running" while currentTime
// stays frozen, so the metronome never sees a beat come due. Replace
// AudioContext with a stub whose clock follows performance.now().
export async function installFakeAudio(page: Page): Promise<void> {
  await page.addInitScript(() => {
    class FakeAudioContext {
      state = "running";
      destination = {};
      private readonly createdAt = performance.now();

      get currentTime(): number {
        return (performance.now() - this.createdAt) / 1000;
      }

      resume(): Promise<void> {
        return Promise.resolve();
      }

      close(): Promise<void> {
        return Promise.resolve();
      }

      createOscillator() {
        return {
          frequency: { value: 0 },
          connect() {},
          disconnect() {},
          start() {},
          stop() {},
        };
      }

      createGain() {
        return {
          gain: {
            setValueAtTime() {},
            linearRampToValueAtTime() {},
            exponentialRampToValueAtTime() {},
          },
          connect() {},
          disconnect() {},
        };
      }
    }

    const w = window as unknown as Record<string, unknown>;
    w.AudioContext = FakeAudioContext;
    if ("webkitAudioContext" in w) w.webkitAudioContext = FakeAudioContext;
  });
}
