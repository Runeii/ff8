import { Modifier } from "../textTypes";

// Missing: wait, "general"
export const createModifier = (tag: string) => {
  const result: Modifier = {
    type: 'general',
  }

  switch (tag) {
    case 'Red':
      result.type = 'color';
      result.color = 'red';
      break;
    case 'Green':
      result.type = 'color';
      result.color = 'green';
      break;
    case 'Blue':
      result.type = 'color';
      result.color = 'blue';
      break;
    case 'Yellow':
      result.type = 'color';
      result.color = 'yellow';
      break;
    case 'Magenta':
      result.type = 'color';
      result.color = 'magenta';
      break;
    case 'Gray':
      result.type = 'color';
      result.color = 'gray';
      break;
    case 'DarkGrey':
      result.type = 'color';
      result.color = 'shadow';
      break;
    case 'White':
      result.type = 'color';
      result.color = 'white';
      break;
    default:
      break;
  }

  return result;
}