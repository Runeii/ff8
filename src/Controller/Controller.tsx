import { MouseEvent } from "react";

const Controller = () => {
  const handleDown = (event: MouseEvent) => {
    const keyEvent = new KeyboardEvent('keydown', {
      code: (event.target as HTMLButtonElement).dataset.key,
    });

    window.dispatchEvent(keyEvent);
  }
  const handleUp = (event: MouseEvent) => {
    const keyEvent = new KeyboardEvent('keyup', {
      code: (event.target as HTMLButtonElement).dataset.key,
    });

    window.dispatchEvent(keyEvent);
  }
  return (
    <nav className="d-pad">
      <div className="set vertical">
        <button className="up" data-key="ArrowUp" onPointerDown={handleDown} onPointerUp={handleUp}></button>
        <button className="down" data-key="ArrowDown" onPointerDown={handleDown} onPointerUp={handleUp}></button>
      </div>
      <div className="set horizontal">
      <button className="left" data-key="ArrowLeft" onPointerDown={handleDown} onPointerUp={handleUp}></button>  
      <button className="right" data-key="ArrowRight" onPointerDown={handleDown} onPointerUp={handleUp}></button>
      </div>
    </nav>
  )
}

export default Controller;