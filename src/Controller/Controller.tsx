import styles from './Controller.module.css';
import { MouseEvent, TouchEvent, useEffect, useRef } from "react";
import JoystickController from "joystick-controller";
import { PSX_CONTROLS_MAP } from '../constants/controls';
import useGlobalStore from '../store';

const Controller = () => {
  const joystickRef = useRef<HTMLDivElement>(null);
  const handleDown = (event: MouseEvent | TouchEvent) => {
    const keyEvent = new KeyboardEvent('keydown', {
      code: PSX_CONTROLS_MAP[(event.target as HTMLButtonElement).dataset.key as keyof typeof PSX_CONTROLS_MAP] ?? '',
    });
    window.dispatchEvent(keyEvent);
  }
  const handleUp = (event: MouseEvent | TouchEvent) => {
    const keyEvent = new KeyboardEvent('keyup', {
      code: PSX_CONTROLS_MAP[(event.target as HTMLButtonElement).dataset.key as keyof typeof PSX_CONTROLS_MAP] ?? '',
    });

    window.dispatchEvent(keyEvent);
  }

  useEffect(() => {
    let prevState = { left: false, right: false, up: false, down: false };

    const joystick = new JoystickController({
      dynamicPosition: true,
      dynamicPositionTarget: joystickRef.current,
      level: 1
    }, (data) => {
      const isLeft = data.x < -20;
      const isRight = data.x > 20;
      const isUp = data.y > 20;
      const isDown = data.y < -20;

      const isTapRequired = useGlobalStore.getState().currentMessages.some(message => message.askOptions)
      if (isTapRequired) {
        // Only fire keydown if it was previously not pressed
        if (isLeft && !prevState.left) {
          window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
        } 
        if (!isLeft && prevState.left) {
          window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowLeft' }));
        }

        if (isRight && !prevState.right) {
          window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
        } 
        if (!isRight && prevState.right) {
          window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight' }));
        }

        if (isUp && !prevState.up) {
          window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }));
        } 
        if (!isUp && prevState.up) {
          window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowUp' }));
        }

        if (isDown && !prevState.down) {
          window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown' }));
        } 
        if (!isDown && prevState.down) {
          window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowDown' }));
        }
      } else {
        // Normal behavior: fire keydown / keyup continuously
        window.dispatchEvent(new KeyboardEvent(isLeft ? 'keydown' : 'keyup', { code: 'ArrowLeft' }));
        window.dispatchEvent(new KeyboardEvent(isRight ? 'keydown' : 'keyup', { code: 'ArrowRight' }));
        window.dispatchEvent(new KeyboardEvent(isUp ? 'keydown' : 'keyup', { code: 'ArrowUp' }));
        window.dispatchEvent(new KeyboardEvent(isDown ? 'keydown' : 'keyup', { code: 'ArrowDown' }));
      }

      // Update previous state
      prevState = { left: isLeft, right: isRight, up: isUp, down: isDown };
    });

    return () => joystick.destroy();
  }, []);


  return (
    <nav className={styles.controls}>
      <div ref={joystickRef} className={styles.joystick}></div>
      <div className={styles.buttons}>
        <div className={styles.container}>
          {
            ['triangle', 'square', 'circle', 'cross'].map((shape) => (
              <button key={shape} className={styles[shape]} data-key={shape} onPointerDown={handleDown} onPointerUp={handleUp} onTouchEnd={handleUp}></button>
            ))
          }
        </div>
      </div>
    </nav>
  )
}

export default Controller;