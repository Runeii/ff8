import useGlobalStore from "../store";
import Text from "./Text/Text";

const Ui = () => {
  const currentMessages = useGlobalStore(state => state.currentMessages);

  return currentMessages.map(message => (
    <Text
      key={message.id}
      id={message.id}
      text={message.text}
      placement={message.placement}
      askOptions={message.askOptions}
    />
  ));
}

export default Ui;