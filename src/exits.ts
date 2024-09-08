const exits = import.meta.glob('../public/output/*.json')

export const generateExits = () => {
  const map = {}
  for (const path in exits) {
    exits[path]().then((mod) => {
      const exits = mod.exits.filter((exit) => exit.fieldId !== 'Unamed')
      exits.forEach((exit) => {
        if (!map[exit.fieldId]) {
          map[exit.fieldId] = []
        }
        map[exit.fieldId].push({
          x: exit.destinationPoint.x / 4096,
          y: exit.destinationPoint.y / 4096,
          z: exit.destinationPoint.z / 4096
        });
      })
    })
  }
  console.log(map)
}
