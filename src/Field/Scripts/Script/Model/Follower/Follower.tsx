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

const DISTANCE = 6;

const Follower = ({ children, partyMemberId, useScriptStateStore}: FollowerProps) => {
  const congaWaypointHistory = useGlobalStore(state => state.congaWaypointHistory);
  const offset = useGlobalStore(state => state.party.findIndex(id => id === partyMemberId));
  const isLastPartyMember = useGlobalStore(state => state.party.length - 1 === offset);

  const state = useScriptStateStore();

  const groupRef = useRef<Group>(null);
  useFrame(() => {
      if (!partyMemberId) {
      return;
    }
    const history = congaWaypointHistory[offset * DISTANCE];
    if (!history) {
      return;
    }
  
    const {position, angle} = history;

    state.position.set([position.x, position.y, position.z]);
    state.angle.set(angle);
    useScriptStateStore.setState({
      idleAnimationId: useGlobalStore.getState().playerAnimationIndex
    });

    if (isLastPartyMember) {
      useGlobalStore.setState({
        congaWaypointHistory: congaWaypointHistory.slice(0, offset * DISTANCE)
      })
    }
  });

  return <group ref={groupRef}>{children}</group>;
}

export default Follower;