import { KeyboardEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import styles from './Text.module.css';
import useGlobalStore from '../../store';
import { processTagsInString } from './textUtils';
import { Html } from '@react-three/drei';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '../../constants/constants';
import { animated, useSpring } from '@react-spring/web';
import { useFrame } from '@react-three/fiber';

const MARGIN = 8;

const Text = ({ id, text, x, y, askOptions }: Message) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const [currentPage, setCurrentPage] = useState(0);
  const [currentIndex, setCurrentIndex] = useState((askOptions?.default ?? 0) - (askOptions?.first ?? 0));
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

  const [formattedText, options] = useMemo(() => {
    const formattedText = processTagsInString(text[currentPage]);
    if (!askOptions) {
      return [formattedText, null];
    }
    const splitLines = formattedText.split('<br />');
    // askOptions.first is first line, askOptions.last is last line, extract array of lines without mutating original array
    const options = splitLines.slice(askOptions.first, askOptions.last ? askOptions.last + 1 : splitLines.length);
    const originalText = splitLines.slice(0, askOptions.first).join('<br />');
    return [originalText, options];
  }, [text, currentPage, askOptions]);

  useLayoutEffect(() => {
    const handleKeyDown = (e: Event) => {
      const event = e as unknown as KeyboardEvent; 
    
      if (event.code === 'Space') {
        setCurrentPage(prev => prev + 1);
      }
      if (!options) {
        return;
      }
      if (event.key === 'ArrowUp') {
        setCurrentIndex((prevIndex) => Math.max(prevIndex - 1, 0));
      }
      if (event.key === 'ArrowDown') {
        setCurrentIndex((prevIndex) => Math.min(prevIndex + 1, options.length - 1));
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    }
  }, [options, text, x, y]);

  useEffect(() => {
    if (currentPage < text.length) {
      return;
    }

    useGlobalStore.setState(state => {
      const currentMessages = state.currentMessages.filter(message => message.id !== id);
      return {
        ...state,
        currentMessages
      };
    });

    document.dispatchEvent(new CustomEvent('messageClosed', {
      detail: {
        id,
        selectedOption: currentIndex,
      }
    }));
  }, [currentIndex, currentPage, id, text.length]);

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
        <animated.div className={styles.text} ref={textRef} style={spring}>
          <span dangerouslySetInnerHTML={{__html: formattedText}}></span>
          {options && (
            <div className={styles.options}>
              {options.map((option, index) => (
                <div key={index} className={`${styles.option} ${currentIndex === index && styles.isActive}`}>{option}</div>
              ))}
            </div>
          )}
        </animated.div>
      </div>
    </Html>
  );
}

export default Text;