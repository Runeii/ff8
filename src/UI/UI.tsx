import { OrthographicCamera } from "@react-three/drei";
import { SCREEN_WIDTH, SCREEN_HEIGHT } from "../constants/constants";
import useGlobalStore from "../store";
import Text from "./Text/Text";

const Ui = () => {
  const currentMessages = useGlobalStore(state => state.currentMessages);

  return (
    <>
      <OrthographicCamera
        name="uiCamera"
        position={[0, 0, 0]}
        zoom={1}
        left={-SCREEN_WIDTH / 2}
        right={SCREEN_WIDTH / 2}
        top={SCREEN_HEIGHT / 2}
        bottom={-SCREEN_HEIGHT / 2}
        near={0}
        far={4096}
      />
      {currentMessages.map(message => (
        <Text
          key={message.id}
          id={message.id}
          text={message.text}
          x={message.x}
          y={message.y}
          askOptions={message.askOptions}
        />
      ))}
    </>
  );
}

export default Ui;