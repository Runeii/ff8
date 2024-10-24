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

  if (colorMatch) {
    // Handle Color tag
    const tag = colorMatch[0];
    const closeColor = openColor ? '</span>' : '';
    const openNewColor = `<span class="${tag.replace('{', '').replace('}', '').toLowerCase()}">`;
    return { text: closeColor + openNewColor, newColor: tag }; // Open new color
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
  const textWithLineBreaks = input.replace(/\n/g, '<br />');

  const segments = textWithLineBreaks.split(/(\{[^}]+\})/g);

  const result = segments.reduce(
    ({ output, openColor }, segment) => {
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