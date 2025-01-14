// TextBox.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TextureLoader, Clock, NearestFilter, Texture } from 'three';
import { TextBoxProps } from './types';
import { FontColor, TEXT_START_X, TEXT_START_Y, LINE_HEIGHT } from './constants';
import Character from './Character/Character';
import WindowFrame from './WindowFrame/WindowFrame';
import { processText } from './textUtils';

const TextBox: React.FC<TextBoxProps> = ({
  text,
  position,
  width = 320,
  height = 224,
  askOptions,
  fontColor = FontColor.White,
  onPageComplete
}) => {
  const [fontTexture, setFontTexture] = useState<Texture | null>(null);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const clockRef = useRef(new Clock());

  // Load textures
  useEffect(() => {
    const loader = new TextureLoader();
    
    loader.load('/font/font-0.png', (texture) => {
      texture.magFilter = NearestFilter;
      texture.minFilter = NearestFilter;
      setFontTexture(texture);
    });
  }, []);

  // Handle cursor blinking
  useEffect(() => {
    const animate = () => {
      if (askOptions) {
        const time = clockRef.current.getElapsedTime();
        setCursorVisible(Math.floor(time * 2) % 2 === 0);
      }
      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [askOptions]);

  const processedPages = useMemo(() => processText(text), [text]);
  
  const currentPageContent = useMemo(() => {
    if (!fontTexture || !processedPages[currentPage]) return [];
    
    const elements: JSX.Element[] = [];
    let x = TEXT_START_X;
    let y = height - TEXT_START_Y;
    let lineCount = 0;

    processedPages[currentPage].forEach((char, index) => {
      if (char === '\n') {
        x = TEXT_START_X;
        y -= LINE_HEIGHT;
        lineCount++;
        return;
      }

      const code = char.charCodeAt(0);
      if (code >= 32 && code < 227) {
        elements.push(
          <Character
            key={`char-${index}`}
            charCode={code - 32}
            position={[x, y, 0]}
            color={fontColor}
            fontTexture={fontTexture}
          />
        );
      }
    });

    return elements;
  }, [currentPage, fontTexture, processedPages, fontColor, height]);

  return (
    <group position={position}>
      <WindowFrame 
        width={width}
        height={height}
        position={[0, 0, 0]}
      />
      
      {currentPageContent}
      
      {askOptions && cursorVisible && (
        <mesh 
          position={[10, height - (27 + 16 * askOptions.first), 0.1]}
        >
          <planeGeometry args={[8, 12]} />
          <meshBasicMaterial color={0xffffff} transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
};

export default TextBox;