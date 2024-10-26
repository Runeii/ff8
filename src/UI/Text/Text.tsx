import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import styles from './Text.module.css';
import useGlobalStore from '../../store';
import { processTagsInString } from './textUtils';
import { Html } from '@react-three/drei';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '../../constants/constants';
import { animated, useSpring } from '@react-spring/web';
import { useFrame } from '@react-three/fiber';

type TextProps = {
  id: number;
  text: string[];
  x: number;
  y: number;
};

const MARGIN = 8;

const Text = ({ id, text, x, y }: TextProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [xPos, setXPos] = useState(0);
  const [yPos, setYPos] = useState(0);

  const [spring] = useSpring({
    '--x': xPos,
    '--y': yPos,
    scale: xPos > 0 && yPos > 0 ? 1 : 0,
    immediate(key) {
      return key !== 'scale';
    },
    config: {
      duration: 100,
    }
  }, [xPos, yPos]);

  useLayoutEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') {
        return;
      }
      setCurrentIndex(prev => prev + 1);
    }

  
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    }
  }, [text, x, y]);

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

  useFrame(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text || xPos > 0 || yPos > 0) {
      return;
    }

    const width = ((textRef.current?.clientWidth ?? 1) / (containerRef.current?.clientWidth ?? 1)) * SCREEN_WIDTH;
    const safeX = Math.min(Math.max(x, MARGIN), SCREEN_WIDTH - MARGIN - width);
    setXPos(safeX / SCREEN_WIDTH * 100);

    const height = ((textRef.current?.clientHeight ?? 1) / (containerRef.current?.clientHeight ?? 1)) * SCREEN_HEIGHT;
    const safeY = Math.min(Math.max(y, MARGIN), SCREEN_HEIGHT - MARGIN - height);
    setYPos(safeY / SCREEN_HEIGHT *  100);
  });

  return (
    <Html transform={false} calculatePosition={() => {
      return [0,0,0]
    }}>
      <div className={styles.container} ref={containerRef}>
        <animated.div className={styles.text} ref={textRef} dangerouslySetInnerHTML={{__html: processTagsInString(text[currentIndex])}} style={spring} />
      </div>
    </Html>
  );
}

export default Text;