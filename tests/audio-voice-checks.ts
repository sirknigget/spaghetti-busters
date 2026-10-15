import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export async function verifyBossVoice(page: Page) {
  const voice = await page.evaluate(() => {
    const a = (window as any).__bossAudio;
    a.play("boss");
    const source = [...a.synth.sources].find(
      (s: any) => s.buffer === a.graph.bossVoice,
    ) as AudioBufferSourceNode;
    const data = a.graph.bossVoice.getChannelData(0);
    const result = {
      duration: a.graph.bossVoice.duration,
      audible: data.some((v: number) => Math.abs(v) > 0.1),
      sources: [...a.synth.sources].filter(
        (s: any) => s.buffer === a.graph.bossVoice,
      ).length,
      played: !!source,
    };
    a.pause();

    return { ...result, stopped: a.synth.sources.size === 0 };
  });
  expect(voice).toMatchObject({
    audible: true,
    sources: 1,
    played: true,
    stopped: true,
  });
  expect(voice.duration).toBeGreaterThan(0.7);
  expect(voice.duration).toBeLessThan(1.5);
}
