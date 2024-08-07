import { Line } from "@react-three/drei"
import type { FieldData } from "../Field"

type ExitsProps = {
  exits: FieldData["exits"]
  setCharacterPosition: (position: FieldData["exits"][0]["destinationPoint"]) => void
  setField: (fieldId: string) => void
}

const Exits = ({ exits, setCharacterPosition, setField }: ExitsProps) => {
  const handleClick = (exit: FieldData['exits'][0]) => {
    setField(exit.fieldId);
    setCharacterPosition(exit.destinationPoint);
  }
console.log(exits)
  return exits.filter(exit => exit.fieldId !== 'Unamed').map(exit => (
    <Line
      key={`${exit.fieldId}-${exit.exitLine[0].x}-${exit.exitLine[0].y}-${exit.exitLine[0].z}`}
      points={exit.exitLine.map(point => [point.x, point.y, point.z])}
      color={0xff0000}
      lineWidth={5}
      onClick={() => handleClick(exit)}
    />
  ))
}

export default Exits;