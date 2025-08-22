import { OrthographicCamera } from "@react-three/drei";
import useGlobalStore from "../store";
import MessageBox from "./MessageBox/MessageBox";
import { SCREEN_HEIGHT, SCREEN_WIDTH } from "../constants/constants";
import { useEffect, useMemo, useState } from "react";
import { isSavePointMessage } from "./textUtils";
import { useThree } from "@react-three/fiber";
import { offlineController } from "../OfflineController";
import OfflineProgress from "./OfflineProgress/OfflineProgress";

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

  const messagesArray = useMemo(() => Object.values(messagesByChannel).reverse(), [messagesByChannel]);

  const closeableMessages = useMemo(() => messagesArray.filter(message => message[0].isCloseable), [messagesArray]);

  const worldScene = useThree(state => state.scene);

  const [isCachingOffline, setIsCachingOffline] = useState(false);
  useEffect(() => {
    const unsubscribe = offlineController.subscribe((state) => {
      setIsCachingOffline(state.isEnablingOffline);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  if (messagesArray.length === 0) {
    return null;
  }

  return (
    <>
      <OrthographicCamera
        makeDefault
        left={-(SCREEN_WIDTH / 2)}
        right={SCREEN_WIDTH / 2}
        top={SCREEN_HEIGHT / 2}
        bottom={-(SCREEN_HEIGHT / 2)}
        position={[SCREEN_WIDTH / 2, -SCREEN_HEIGHT / 2, 0]}
      />
      {messagesArray.map((messages) => (
        <MessageBox
          isCloseableFocus={messages[0].id === closeableMessages.at(-1)?.[0].id}
          key={`message--${messages[0].id}`}
          isSavePoint={isSavePointMessage(messages[0])}
          message={messages[0]}
          worldScene={worldScene}
        />
      ))}
      {isCachingOffline && <OfflineProgress />}
    </>
  );
}

export default Ui;