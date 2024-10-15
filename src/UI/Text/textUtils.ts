const colorTagRegex = /\{(\w+)\}/g;
const waitTagRegex = /\{Wait\d+\}/g;

const processSegment = (segment: string, openColor?: string) => {
  const matches = segment.match(colorTagRegex);

  if (!matches || matches.length === 0) {
    return { text: segment, newColor: openColor };
  }

  const tag = matches[0];

  if (tag.includes('Wait')) {
    const removedWaitTag = segment.replace(waitTagRegex, '');
    return { text: removedWaitTag, newColor: openColor };
  }

  const closeColor = openColor ? '</span>' : '';
  const openNewColor = `<span class="${tag.replace('{', '').replace('}', '').toLowerCase()}">`;
  return { text: closeColor + openNewColor, newColor: tag }; // Open new color
};

export const processTagsInString = (input: string) => {
  if (!input) {
    return '';
  }
  const segments = input.split(/(\{[^}]+\})/g);
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