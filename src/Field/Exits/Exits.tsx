import { Line } from "@react-three/drei"
import type { FieldData } from "../Field"
import { useFrame } from "@react-three/fiber"
import { Mesh, Raycaster, Vector3 } from "three"
import { CHARACTER_HEIGHT } from "../../Character/Character"

type ExitsProps = {
  exits: FieldData["exits"]
  setCharacterPosition: (position: FieldData["exits"][0]["destinationPoint"]) => void
  setField: (fieldId: string) => void
}

const raycaster = new Raycaster();
let direction = new Vector3();

const Exits = ({ exits, setCharacterPosition, setField }: ExitsProps) => {
  const handleTransition = (exit: FieldData['exits'][0]) => {
    setField(exit.fieldId);
    setCharacterPosition(exit.destinationPoint);
  }

  useFrame(({ scene }) => {
    const mesh = scene.getObjectByName('character') as Mesh | undefined;
  
    if (!mesh) {
      return;
    }

    exits.forEach((exit) => {
      const {exitLine: [start, end]} = exit;
      const lineStart = new Vector3(start.x, start.y, start.z + CHARACTER_HEIGHT / 2);
      const lineEnd = new Vector3(end.x, end.y, end.z + CHARACTER_HEIGHT / 2);
    
      direction.set(0, 0, 0);
      direction = direction.subVectors(lineEnd, lineStart).normalize();
      const length = lineStart.distanceTo(lineEnd);
    
      raycaster.set(lineStart, direction);
      raycaster.far = length;
      raycaster.near = 0;
    
      const intersects = raycaster.intersectObject(mesh, true);
    
      if (intersects.length > 0) {        
        handleTransition(exit)
      }
    })
  });

  return exits.filter(exit => exit.fieldId !== 'Unamed').map(exit => (
    <Line
      key={`${exit.fieldId}-${exit.exitLine[0].x}-${exit.exitLine[0].y}-${exit.exitLine[0].z}`}
      points={exit.exitLine.map(point => [point.x, point.y, point.z + CHARACTER_HEIGHT * 1.5])}
      color="blue"
      lineWidth={5}
      onClick={() => handleTransition(exit)}
    />
  ))
}

export default Exits;