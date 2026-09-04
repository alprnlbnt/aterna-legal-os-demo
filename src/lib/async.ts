export const fakeDelay = (milliseconds = 650) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

export async function fakeProgress(
  onStep: (step: string) => void,
  steps = ['Alındı', 'Güvenlik kontrolü', 'Metin çıkarılıyor', 'İnceleme bekliyor'],
  delay = 420,
): Promise<void> {
  for (const step of steps) {
    onStep(step);
    await fakeDelay(delay);
  }
}
