export const KEYS: Record<number, string> = {
  192: 'Space'
}

export const dummiedCommand = () => { }

export const unusedCommand = () => { }

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const waitForKeyPress = (key: number) => {
  return new Promise<void>((resolve) => {
    const handleKeyPress = (event: KeyboardEvent) => {
      event.stopImmediatePropagation();
      if (event.code === KEYS[key]) {
        window.removeEventListener('keydown', handleKeyPress);
        resolve();
      }
    }

    window.addEventListener('keydown', handleKeyPress);
  });
}
