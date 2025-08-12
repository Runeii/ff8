import {  Plane, useTexture } from "@react-three/drei"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CanvasTexture, ClampToEdgeWrapping, RepeatWrapping, Scene, Texture } from "three"
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "../../constants/constants"
import { invalidate, useFrame } from "@react-three/fiber"
import { fontLayout, fontWidths} from "./fontLayout.ts"
import { createModifier, formatNameTags } from "../textUtils.ts"
import useGlobalStore from "../../store.ts"
import { FontColor, Modifier, Placement } from "../textTypes.ts"
import { saveGame } from "../../Field/fieldUtils.ts"
import { closeMessage } from "../../Field/Scripts/Script/utils.ts"

type MessageBoxProps = {
  isSavePoint: boolean
  message: Message
  worldScene: Scene
}

const SAFE_BOUNDS = 8;

const SOURCE_TILE_SIZE = 95.8;

const OUTPUT_TILE_SIZE = 24;
const OUTPUT_HEIGHT_MODIFIER = 1;
const OUTPUT_LINE_HEIGHT = OUTPUT_TILE_SIZE * OUTPUT_HEIGHT_MODIFIER * 1.4;
const OPTION_MARGIN = OUTPUT_TILE_SIZE * 1.5;


const LEFT_MARGIN = OUTPUT_TILE_SIZE / 2;
const TOP_MARGIN = OUTPUT_TILE_SIZE / 2;


// We are working in 320x240 screen space here
const calculatePlacement = (message: Message, width: number, height: number) => {
  // Requested X/Y pos
  const baseX = message.placement.x ?? 0;
  const baseY = message.placement.y ?? 0;

  // X/Y pos within safe bounds top/left
  const safeX = Math.max(baseX, SAFE_BOUNDS);
  const safeY = Math.max(baseY, SAFE_BOUNDS);

  const safeMaxX = SCREEN_WIDTH - SAFE_BOUNDS - width;
  const safeMaxY = SCREEN_HEIGHT - SAFE_BOUNDS - height;

  const finalX = Math.min(safeX, safeMaxX);
  const finalY = Math.min(safeY, safeMaxY);

  return {
    x: finalX,
    y: finalY
  }
}


const MessageBox = ({ isSavePoint, message, worldScene }: MessageBoxProps) => {
  const { id, text, askOptions, isCloseable } = isSavePoint ? {
    ...message,
    text: [`【Save Point】\nSave the game?\nYes\nNo`],
    askOptions: {
      first: 2,
      default: 2
    }
  } : message;

  const textCanvas = useMemo(() => document.createElement('canvas'), []);

  const background = useTexture('message_background.png');
  background.wrapS = RepeatWrapping; // Clamp horizontally (100% width)
  background.wrapT = RepeatWrapping;      //
  background.repeat.set(0.7, 40);
  background.needsUpdate = true;

  const white = useTexture('HDFont/merged_output/merged_white.png');
  const red = useTexture('HDFont/merged_output/merged_red.png');
  const blue = useTexture('HDFont/merged_output/merged_blue.png');
  const green = useTexture('HDFont/merged_output/merged_green.png');
  const yellow = useTexture('HDFont/merged_output/merged_yellow.png');
  const magenta = useTexture('HDFont/merged_output/merged_magenta.png');
  const gray = useTexture('HDFont/merged_output/merged_gray.png');
  const shadow = useTexture('HDFont/merged_output/merged_shadow.png');

  const fontTextures: Record<FontColor, Texture> = useMemo(() => ({ white, red, blue, green, yellow, magenta, gray, shadow }), [white, red, blue, green, yellow, magenta, gray, shadow])  ;

  const cursor = useTexture('cursor.png');

  const [currentPage, setCurrentPage] = useState(0);
  const [currentIndex, setCurrentIndex] = useState((askOptions?.default ?? 0) - (askOptions?.first ?? 0));
  const [hasDisplayedAllText, setHasDisplayedAllText] = useState(false);
  useEffect(() => {
    if (currentPage < text.length) {
      return;
    }

    closeMessage(id, currentIndex);
  }, [currentIndex, currentPage, id, text.length]);

  const [formattedText, options] = useMemo(() => {
    if (currentPage >= text.length) {
      return [null, null];
    }

    const sanitisedText = formatNameTags(text[currentPage]);

    if (!askOptions) {
      return [sanitisedText, null];
    }
    const splitLines = sanitisedText.split('\n');
    // askOptions.first is first line, askOptions.last is last line, extract array of lines without mutating original array
    const options = splitLines.slice(askOptions.first, askOptions.last ? askOptions.last + 1 : splitLines.length);
    const originalText = splitLines.slice(0, askOptions.first).join('\n');
  
    if (originalText.length === 0) {
      return [null, options];
    }
    return [originalText, options];
  }, [text, currentPage, askOptions]);

  useEffect(() => {
    const handleKeyDown = (e: Event) => {
      const event = e as unknown as KeyboardEvent; 

      if (!hasDisplayedAllText) {
        return;
      }

      if (!options && event.code === 'Space' && isCloseable) {
        setCurrentPage(prev => prev + 1);
        return;
      }

      if (!options) {
        return;
      }

      if (event.code === 'Space') {
        if (isSavePoint && currentIndex === 0) {
          saveGame(worldScene);
        }
        if (options[currentIndex].includes('{Grey}')) {
          useGlobalStore.getState().systemSfxController.play(16, 0, 255, 128);
          return;
        }

        if (askOptions && currentIndex !== askOptions.cancel && !isSavePoint) {
          useGlobalStore.getState().systemSfxController.play(1, 0, 255, 128);
        }
        
        if (askOptions && currentIndex === askOptions.cancel || isSavePoint && currentIndex === 1) {
          useGlobalStore.getState().systemSfxController.play(9, 0, 255, 128);
        }
        setCurrentPage(prev => prev + 1);
      }

      if (event.key === 'ArrowUp') {
        useGlobalStore.getState().systemSfxController.play(1, 0, 255, 128);
        invalidate();
        setCurrentIndex((prevIndex) => Math.max(prevIndex - 1, 0));
      }

      if (event.key === 'ArrowDown') {
        useGlobalStore.getState().systemSfxController.play(1, 0, 255, 128);
        invalidate();
        setCurrentIndex((prevIndex) => Math.min(prevIndex + 1, options.length - 1));
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    }
  }, [currentIndex, id, isCloseable, isSavePoint, options, worldScene, text, askOptions, hasDisplayedAllText]);

  const { placements, width: widthWithoutScaling, height: heightWithoutScaling, selectedY } = useMemo(() => {
    let x = LEFT_MARGIN;
    let y = TOP_MARGIN;
    let highestX = 0;


    const placements: (Placement | Modifier)[] = [];
    formattedText?.split('\n').forEach((line) => {
      let hasOpenModifier = false;
      let modifier = '';
      line.split('').forEach((char) => {
        if (char === '{') {
          hasOpenModifier = true;
          return;
        }

        if (char === '}') {
          hasOpenModifier = false;
          placements.push(createModifier(modifier));
          modifier = '';
          return;
        }

        if (hasOpenModifier) {
          modifier += char;
          return;
        }

        const rowIndex = fontLayout.findIndex((layoutRow) => layoutRow.includes(char));
        if (rowIndex < 0) {
          console.error(`Character not found in font layout: ${char}`);
          return;
        }

        const columnIndex = fontLayout[rowIndex].indexOf(char);

        const isUppercase = char === char.toUpperCase();
        let baseWidth = isUppercase ? 0.8 : 0.6;
        if (Number.isInteger(parseInt(char))) {
          baseWidth = 0.7;
        }

        const character_width = OUTPUT_TILE_SIZE * (fontWidths[char as keyof typeof fontWidths] ?? baseWidth);

        placements.push({
          rowIndex,
          columnIndex,
          x,
          y,
        });

        x += character_width;
        highestX = Math.max(highestX, x);
      })
      y += OUTPUT_LINE_HEIGHT;
      x = LEFT_MARGIN;
    });

    x = LEFT_MARGIN + OPTION_MARGIN;

    let selectedY = 0;
    options?.forEach((line, index) => {
      if (index === currentIndex) {
        selectedY = y;
      }
      let hasOpenModifier = false;
      let modifier = '';
      line.split('').forEach((char) => {
        if (char === '{') {
          hasOpenModifier = true;
          return;
        }

        if (char === '}') {
          hasOpenModifier = false;
          placements.push(createModifier(modifier));
          modifier = '';
          return;
        }

        if (hasOpenModifier) {
          modifier += char;
          return;
        }

        const rowIndex = fontLayout.findIndex((layoutRow) => layoutRow.includes(char));
        const columnIndex = fontLayout[rowIndex].indexOf(char);

        const isUppercase = char === char.toUpperCase();
        let baseWidth = isUppercase ? 0.8 : 0.6;
        if (Number.isInteger(parseInt(char))) {
          baseWidth = 0.7;
        }

        const character_width = OUTPUT_TILE_SIZE * (fontWidths[char as keyof typeof fontWidths] ?? baseWidth);

        placements.push({
          rowIndex,
          columnIndex,
          x,
          y,
        });

        x += character_width;
        highestX = Math.max(highestX, x);
      })
      y += OUTPUT_LINE_HEIGHT;
      x = LEFT_MARGIN + OPTION_MARGIN;
    });

    const width = message.placement.width ? message.placement.width * 2 : highestX + LEFT_MARGIN / 2;
    const height = message.placement.height ? message.placement.height * 2 : y + TOP_MARGIN / 2;

    invalidate();
    return {
      placements,
      width,
      height,
      selectedY
    }
  }, [currentIndex, formattedText, message.placement.height, message.placement.width, options]);

  const texture = useMemo(() => {
    const canvasTexture = new CanvasTexture(textCanvas);
    canvasTexture.wrapS = ClampToEdgeWrapping;
    canvasTexture.wrapT = ClampToEdgeWrapping;
    canvasTexture.needsUpdate = true;
    return canvasTexture;
  }, [textCanvas]);

  const messageStyle = useGlobalStore(state => state.messageStyles[message.placement.channel ?? 0]) ?? {
    mode: 0,
    color: 4096 // 4096 3072 3000 2000 1500 2048 ???
  }; 

  const scaleRef = useRef(0);
  const textProgressRef = useRef(0);
  const hasDisplayedAllTextRef = useRef(false);
  const OPEN_SPEED = 3;
  const TEXT_SPEED = 200;
  const BLINK_DELAY = 240;

  useEffect(() => {
    return () => {
      scaleRef.current = 0;
      textProgressRef.current = 0;
      hasDisplayedAllTextRef.current = false;
      texture.needsUpdate = true;
      invalidate();
    };
  }, [formattedText, currentPage, texture]);

  const drawMessageBox = useCallback((ctx: CanvasRenderingContext2D, xPos: number, yPos: number, width: number, height: number, scale: number, delta: number) => {
    textCanvas.width = SCREEN_WIDTH * 2;
    textCanvas.height = SCREEN_HEIGHT * 2;

    ctx.imageSmoothingEnabled = false;

    // Draw background
    const gradient = ctx.createLinearGradient(0, 0, width, 0);

    const alpha = messageStyle.mode === 0 ? 1 : 0.5;
    gradient.addColorStop(0, `rgb(66,66,58,${alpha})`);
    gradient.addColorStop(1, `rgb(99,99,99,${alpha})`);
    
    if (messageStyle.mode !== 2) {
      ctx.fillStyle = gradient;
      ctx.fillRect(xPos, yPos, width, height);
    }

    // Draw borders
    ctx.strokeStyle = '#848484';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xPos, yPos);
    ctx.lineTo(xPos + width, yPos);
    ctx.moveTo(xPos, yPos);
    ctx.lineTo(xPos, yPos + height);
    ctx.stroke()

    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xPos + width, yPos);
    ctx.lineTo(xPos + width, yPos + height);
    ctx.moveTo(xPos, yPos + height);
    ctx.lineTo(xPos + width, yPos + height);
    ctx.stroke()

    if (scale >= 1) {
      return 1;
    }

    scale += delta * OPEN_SPEED

    if (scale >= 1) {
      scale = 1;
    }
    return scale
  }, [messageStyle.mode, textCanvas]);

  const drawAnimatedText = useCallback((ctx: CanvasRenderingContext2D, xPos: number, yPos: number, delta: number) => {
    let currentColor: FontColor = 'white';
    let isBlinkingOff = false;

    placements.forEach((placement, index) => {
      if (index > textProgressRef.current && !hasDisplayedAllTextRef.current) {
        return;
      }
      if ('type' in placement && placement.type === 'color' && placement.color) {
        currentColor = placement.color;
        const positionInCycle = textProgressRef.current % BLINK_DELAY;
        isBlinkingOff = !!(placement.isBlinking && positionInCycle > BLINK_DELAY / 2);
        if (placement.isBlinking) {
          invalidate();
        }
        return;
      }
      const { rowIndex, columnIndex, x, y } = placement as Placement;
      const font = fontTextures[currentColor].image;
      ctx.globalAlpha = isBlinkingOff ? 0 : 1;
      ctx.filter = `brightness(${messageStyle.color / 4096})`;
      ctx.drawImage(
        font,
        columnIndex * SOURCE_TILE_SIZE, rowIndex * SOURCE_TILE_SIZE, SOURCE_TILE_SIZE, SOURCE_TILE_SIZE,
        xPos + x, yPos + y, OUTPUT_TILE_SIZE, OUTPUT_TILE_SIZE
      )
      if (index === placements.length - 1) {
        hasDisplayedAllTextRef.current = true;
        setHasDisplayedAllText(true);
      }
    });

    textProgressRef.current += delta * TEXT_SPEED
    return hasDisplayedAllTextRef.current
  }, [fontTextures, messageStyle.color, placements])

  const drawCursor = useCallback((ctx: CanvasRenderingContext2D, xPos: number, yPos: number) => {
    const cursorImageRatio = 15 / 24;
    const imageHeight = OUTPUT_TILE_SIZE * cursorImageRatio
    ctx.drawImage(cursor.image, xPos + LEFT_MARGIN, yPos + selectedY + ((OUTPUT_TILE_SIZE - imageHeight) / 2), OUTPUT_TILE_SIZE, imageHeight);
  }, [cursor.image, selectedY])

  useFrame(({ invalidate }, delta) => {
    const ctx = textCanvas.getContext('2d');
    if (!ctx) {
      return;
    }
    
    const currentScale = scaleRef.current;

    const placement = calculatePlacement(message, widthWithoutScaling / 2, heightWithoutScaling / 2);
    const xPosWithoutScaling = placement.x * 2;
    const yPosWithoutScaling = Math.max(0, placement.y * 2);

    const width = widthWithoutScaling * currentScale;
    const height = heightWithoutScaling * currentScale;

    const xPos = xPosWithoutScaling + widthWithoutScaling / 2 - width / 2;
    const yPos = yPosWithoutScaling + heightWithoutScaling / 2 - height / 2;

    const nextScale = drawMessageBox(ctx, xPos, yPos, width, height, currentScale, delta);

    if (nextScale < 1) {
      scaleRef.current = nextScale;
      texture.needsUpdate = true;
      invalidate();
      return;
    }
  
    const hasDisplayedAllText = drawAnimatedText(ctx, xPos, yPos, delta);
    texture.needsUpdate = true;

    if (!hasDisplayedAllText) {
      invalidate();
      return;
    }

    if (!options) {
      return;
    }

    drawCursor(ctx, xPos, yPos);
  })

  return (
    <>
    <Plane
      args={[SCREEN_WIDTH, SCREEN_HEIGHT, 1]}
      position={[SCREEN_WIDTH / 2, -SCREEN_HEIGHT / 2, -1]}
    >
      <meshBasicMaterial map={texture} transparent />
    </Plane>
    </>
  );
}

export default MessageBox;