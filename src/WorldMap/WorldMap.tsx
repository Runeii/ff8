import { useEffect, useState } from "react";
import { openMessage } from "../Field/Scripts/Script/utils";
import { OPCODE_HANDLERS } from "../Field/Scripts/Script/handlers";
import MAP_NAMES from "../constants/maps";
import useGlobalStore from "../store";

const text = 'Select destination:\nBalamb\nTrabia Garden\nEsthar\nDeling City\nTimber\nDollet Town\nDeep Sea Research Centre\nLab\nTear\'s Point\nWinhill\nFisherman\'s Horizon\nShumi Village';
const WorldMap = () => {
  const [selectedFieldId, setSelectedFieldId] = useState<typeof MAP_NAMES[number]>();
  useEffect(() => {
    // @ts-expect-error - FadeIn doesn't require a stack
    OPCODE_HANDLERS.FADEIN?.();
    openMessage('worldMap', [text], 0, 0, {
      first: 1,
      default: 1,
      cancel: undefined
    }).then((selectedOption) => {
      switch (selectedOption) {
        case 0:
          setSelectedFieldId("bcgate_1");
          break;
        case 1:
          setSelectedFieldId("tgcourt2")
          break;
        case 2:
          setSelectedFieldId("ecpview1");
          break;
        case 3:
          setSelectedFieldId("glform1");
          break;
        case 4:
          setSelectedFieldId("titown3")
          break;
        case 5:
          setSelectedFieldId("dogate_2")
          break;
        case 6:
          setSelectedFieldId("sdisle1")
          break;
        case 7:
          setSelectedFieldId("edview1b");
          break;
        case 8:
          setSelectedFieldId("eeview1");
          break;
        case 9:
          setSelectedFieldId("gflain1a")
          break;
        case 10:
          setSelectedFieldId("fhwisef2")
          break;
        case 11:
          setSelectedFieldId("tmdome1")
          break;
        default:
          setSelectedFieldId("bghall_1");
          break;
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedFieldId) {
      return;
    }

    useGlobalStore.setState({
      fieldId: selectedFieldId,
    })
  }, [selectedFieldId]);
  return null;
}

export default WorldMap;