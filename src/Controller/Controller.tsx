import { MouseEvent, TouchEvent, useEffect, useRef } from "react";
import JoystickController from "joystick-controller";

const Controller = () => {
  const joystickRef = useRef<HTMLDivElement>(null);
  const handleDown = (event: MouseEvent | TouchEvent) => {
    const keyEvent = new KeyboardEvent('keydown', {
      code: (event.target as HTMLButtonElement).dataset.key,
    });

    window.dispatchEvent(keyEvent);
  }
  const handleUp = (event: MouseEvent | TouchEvent) => {
    const keyEvent = new KeyboardEvent('keyup', {
      code: (event.target as HTMLButtonElement).dataset.key,
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
    <nav className="controls">
      <div ref={joystickRef} className="joystick"></div>
      <div className="buttons">
        <button className="space" data-key="Space" onPointerDown={handleDown} onPointerUp={handleUp} onTouchEnd={handleUp}></button>
      </div>
    </nav>
  )
}

export default Controller;