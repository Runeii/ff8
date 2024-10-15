import { CSSProperties, useEffect, useState } from 'react';
import styles from './Text.module.css';
import useGlobalStore from '../../store';
import { processTagsInString } from './textUtils';
import { Html } from '@react-three/drei';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '../../constants/constants';

type TextProps = {
  id: number;
  text: string[];
  x: number;
  y: number;
};


const Text = ({ id, text, x, y }: TextProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setCurrentIndex(prev => prev + 1);
      }
    }
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    }
  }, []);

  useEffect(() => {
    if (currentIndex < text.length) {
      return;
    }

    useGlobalStore.setState(state => {
      const currentMessages = state.currentMessages.filter(message => message.id !== id);
      return {
        ...state,
        currentMessages
      };
    });
  }, [currentIndex, id, text.length]);

  return (
    <Html fullscreen transform={false} calculatePosition={() => {
      return [SCREEN_WIDTH * 1.325,SCREEN_HEIGHT * 1.325,0]
    }}>
      <div className={styles.text} style={{'--x': x, '--y': y} as CSSProperties} dangerouslySetInnerHTML={{__html: processTagsInString(text[currentIndex])}} />
    </Html>
  );
}

export default Text;