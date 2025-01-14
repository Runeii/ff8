import { Box, Html, Text as TextTroika, Hud, OrthographicCamera } from "@react-three/drei";
import useGlobalStore from "../store";
import Text from "./TextBox/TextBox";
import { DoubleSide } from "three";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "../constants/constants";
import TextBox from "./TextBox/TextBox";

const Ui = () => {
  const currentMessages = useGlobalStore(state => state.currentMessages);
  const WIDTH = SCREEN_WIDTH;
  const HEIGHT = SCREEN_HEIGHT;

return  (
  <Hud renderPriority={1}>
    <OrthographicCamera makeDefault position={[0, 0, 10]}
      left={0}
      right={WIDTH}
      top={HEIGHT}
      bottom={0}
      near={0.1}
      far={100}
    />
    {currentMessages.map(message => (
      <TextBox
        key={message.id}
        text={message.text.join('\n')}
        askOptions={{
          first: 0,
          last: 1,
          default: 0,
        }}
      />
    ))}
  </Hud>
  );
}

export default Ui;