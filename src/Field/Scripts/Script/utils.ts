import { SpringRef } from "@react-spring/web";
import useGlobalStore from "../../../store";

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

export function asyncSetSpring<T extends object>(setSpring: SpringRef<T>, state: object) {
  return new Promise((resolve) => {
    setSpring({
      ...state,
      onRest: resolve,
    });
  });
}

export const remoteExecute = (scriptLabel: number, partyMemberId?: number) => new Promise<void>((resolve) => {
  const key = Math.random().toString(36).substring(7);
  document.addEventListener('scriptFinished', ({ detail }) => {
    if (detail.key !== key) {
      return;
    }

    resolve();
  });

  document.dispatchEvent(new CustomEvent('executeScript', {
    detail: {
      key,
      scriptLabel,
      partyMemberId,
    }
  }));
})

export const openMessage = (id: string, text: string[], x: number, y: number, askOptions?: AskOptions) => new Promise<number>((resolve) => {
  const { currentMessages } = useGlobalStore.getState();

  document.addEventListener('messageClosed', ({ detail }) => {
    if (detail.id !== id) {
      return;
    }

    resolve(detail.selectedOption);
  });

  useGlobalStore.setState({
    currentMessages: [
      ...currentMessages,
      {
        id,
        text,
        x,
        y,
        askOptions,
      }
    ]
  });
})
