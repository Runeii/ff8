import { ReactNode, useRef } from "react";
import useGlobalStore from "../../../../../store";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import { ScriptStateStore } from "../../state";

type FollowerProps = {
  children: ReactNode;
  partyMemberId?: number;
  useScriptStateStore: ScriptStateStore
}

const DISTANCE = 20;

const Follower = ({ children, partyMemberId, useScriptStateStore}: FollowerProps) => {
  const offset = useGlobalStore(state => state.party.findIndex(id => id === partyMemberId));
  const isLastPartyMember = useGlobalStore(state => state.party.length - 1 === offset);

  const state = useScriptStateStore();

  const groupRef = useRef<Group>(null);
  useFrame(() => {
      if (!partyMemberId) {
      return;
    }

    const history = useGlobalStore.getState().congaWaypointHistory[offset * DISTANCE];
    if (groupRef.current) {
      groupRef.current.visible = !!history;
    }
    
    if (!history) {
      return;
    }
  
    const { position, angle } = history;

    if (!groupRef.current!.userData.hasPlaced) {
      state.position.set([position.x, position.y, position.z]);
      state.angle.set(angle);
      groupRef.current!.userData.hasPlaced = true;
    } else { 
      state.position.start([position.x, position.y, position.z]);
      state.angle.start(angle);
    }
  
    useScriptStateStore.setState({
      idleAnimationId: useGlobalStore.getState().playerAnimationIndex
    });

    if (isLastPartyMember) {
      useGlobalStore.setState(state => ({
        ...state,
        congaWaypointHistory: state.congaWaypointHistory.slice(0, DISTANCE * 2)
      }))
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

export default Follower;