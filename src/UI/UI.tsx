import { Hud, OrthographicCamera } from "@react-three/drei";
import useGlobalStore from "../store";
import MessageBox from "./MessageBox/MessageBox";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "../constants/constants";
import { Fragment } from "react/jsx-runtime";

const Ui = () => {
  const currentMessages = useGlobalStore(state => state.currentMessages);

  const messagesByChannel = currentMessages.reduce((acc, message) => {
    const channel = message.placement.channel ?? 0
    if (!acc[channel]) {
      acc[channel] = [];
    }
    acc[channel].push(message);
    return acc;
  }, {} as Record<number, Message[]>);

  const messagesArray = Object.values(messagesByChannel);

  return (
    <Hud>
      <OrthographicCamera
        makeDefault
        left={-(SCREEN_WIDTH / 2)}
        right={SCREEN_WIDTH / 2}
        top={SCREEN_HEIGHT / 2}
        bottom={-(SCREEN_HEIGHT / 2)}
        position={[SCREEN_WIDTH / 2, -SCREEN_HEIGHT / 2, 0]}
      />
      {messagesArray.map((messages) => (
        <Fragment key={messages[0].id}>
          {messages.map(message => <MessageBox key="message--${message.id}" message={message} />)}
        </Fragment>
      ))}
    </Hud>
  );
}

export default Ui;