import styles from './Controller.module.css';
import { MouseEvent, TouchEvent, useEffect, useRef } from "react";
import JoystickController from "joystick-controller";
import { PSX_CONTROLS_MAP } from '../constants/controls';

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
    const joystick = new JoystickController({
      dynamicPosition: true,
      dynamicPositionTarget: joystickRef.current,
      level: 1
    }, (data) => {
      const isLeft = data.x < 20;
      const isRight = data.x > -20;

      const isUp = data.y > -20;
      const isDown = data.y < 20;

      const keyEvent = new KeyboardEvent(isLeft ? 'keydown' : 'keyup', {
        code: 'ArrowLeft',
      });

      window.dispatchEvent(keyEvent);
      
      const keyEvent2 = new KeyboardEvent(isRight ? 'keydown' : 'keyup', {
        code: 'ArrowRight',
      });

      window.dispatchEvent(keyEvent2);

      const keyEvent3 = new KeyboardEvent(isUp ? 'keydown' : 'keyup', {
        code: 'ArrowUp',
      });

      window.dispatchEvent(keyEvent3);

      const keyEvent4 = new KeyboardEvent(isDown ? 'keydown' : 'keyup', {
        code: 'ArrowDown',
      });

      window.dispatchEvent(keyEvent4);
    });

    return () => {
      joystick.destroy();
    }
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