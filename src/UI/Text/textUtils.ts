import { Modifier } from "../textTypes";

const colorTagRegex = /\{(darkgrey|grey|yellow|red|green|blue|purple|white)\}/g;
const waitTagRegex = /\{Wait\d+\}/g;
const generalTagRegex = /\{(\w+)\}/g; // General match for any tag in braces

const processSegment = (segment: string, openColor?: string) => {
  const colorMatch = segment.match(colorTagRegex);
  const waitMatch = segment.match(waitTagRegex);
  const generalMatch = segment.match(generalTagRegex);

  if (waitMatch) {
    // Handle Wait tag by removing it from the segment
    const removedWaitTag = segment.replace(waitTagRegex, '');
    return { text: removedWaitTag, newColor: openColor };
  }

  if (generalMatch) {
    // Handle any other tag by removing the braces and returning the content
    const removedBraces = segment.replace(/\{|\}/g, '');
    return { text: removedBraces, newColor: openColor };
  }

  // If no matches, just return the segment as is
  return { text: segment, newColor: openColor };
};

export const processTagsInString = (input: string) => {
  if (!input) {
    return '';
  }

  const withControls = input.replaceAll('{x0527}', '{Red}[ACTION]{White}')

  const segments = withControls.split(/(\{[^}]+\})/g);

  const result = segments.reduce(
    ({ output, openColor }, segment: string) => {
      const { text, newColor } = processSegment(segment, openColor);

      return {
        output: output + text,
        openColor: newColor
      };
    },
    { output: '', openColor: undefined as string | undefined }
  );

  // Close any open color tag at the end
  return result.openColor ? result.output + '</span>' : result.output;
};

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
    case 'Shadow':
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