import { CONTROLS_MAP } from "../constants/controls";
import { MESSAGE_VARS } from "../Field/Scripts/Script/handlers";
import { Modifier } from "./textTypes";

export const createModifier = (tag: string) => {
  let result: Modifier = {
    type: 'unknownModifier',
  }

  switch (tag) {
    case 'Red':
    case 'RedBlink':
      result = {
        type: 'color',
        color: 'red',
        isBlinking: tag.includes('Blink')
      }
      break;
    case 'Green':
    case 'GreenBlink':
      result = {
        type: 'color',
        color: 'green',
        isBlinking: tag.includes('Blink')
      }
      break;
    case 'Blue':
    case 'BlueBlink':
      result = {
        type: 'color',
        color: 'blue',
        isBlinking: tag.includes('Blink')
      }
      break;
    case 'Yellow':
    case 'YellowBlink':
      result = {
        type: 'color',
        color: 'yellow',
        isBlinking: tag.includes('Blink')
      }
      break;
    case 'Purple':
    case 'PurpleBlink':
      result = {
        type: 'color',
        color: 'magenta',
        isBlinking: tag.includes('Blink')
      }
      break;
    case 'Grey':
    case 'GreyBlink':
      result = {
        type: 'color',
        color: 'gray',
        isBlinking: tag.includes('Blink')
      }
      break;
    case 'Darkgrey':
    case 'DarkgreyBlink':
      result = {
        type: 'color',
        color: 'shadow',
        isBlinking: tag.includes('Blink')
      }
      break;
    case 'White':
    case 'WhiteBlink':
      result = {
        type: 'color',
        color: 'white',
        isBlinking: tag.includes('Blink')
      }
      break;
      default:
        break;
      }

  if (result.type !== 'unknownModifier') {
    return result;
  }
  
  if (tag.startsWith('Wait')) {
    result = {
      type: 'wait',
      duration: parseInt(tag.substring(4), 10),
    }
  }

  console.log('unknownModifier', tag, result);
  return result;
}


const NAME_TAGS = {
  '{Squall}': 'Squall',
  '{Rinoa}': 'Rinoa',
  '{Zell}': 'Zell',
  '{Quistis}': 'Quistis',
  '{Selphie}': 'Selphie',
  '{Irvine}': 'Irvine',
  '{Seifer}': 'Seifer',
  '{Edea}': 'Edea',
  '{Laguna}': 'Laguna',
  '{Kiros}': 'Kiros',
  '{Ward}': 'Ward',
  '{Angelo}': 'Angelo',
  '{Griever}': 'Griever',
  '{Boko}': 'Boko',
  '{Galbadia}': 'Galbadia',
  '{Esthar}': 'Esthar',
  '{Balamb}': 'Balamb',
  '{Dollet}': 'Dollet',
  '{Timber}': 'Timber',
  '{Trabia}': 'Trabia',
  '{Centra}': 'Centra',
  '{Horizon}': 'Horizon'
}

const CONTROL_INPUTS = {
  "{x0520}": "L2",
  "{x0521}": "R2",
  "{x0522}": "L1",
  "{x0523}": "R1",
  "{x0524}": CONTROLS_MAP.menu,
  "{x0525}": CONTROLS_MAP.cancel,
  "{x0526}": CONTROLS_MAP.confirm,
  "{x0527}": CONTROLS_MAP.card,
  "{x0528}": "SELECT",
  "{x052b}": "STAT",
  "{x052c}": "UP",
  "{x052d}": "RIGHT",
  "{x052e}": "DOWN",
  "{x052f}": "LEFT",
}

const findAndReplaceVarPatterns = (inputString: string, replacementFn: (string: string) => string) => {
  // Create a regex that matches all three patterns
  // Var followed by digit, Var followed by two digits, Varb followed by digit
  const regex = /\{(Var\d|Var\d\d|Varb\d)\}/g;
  
  // Replace all matches using the provided replacement function
  return inputString.replace(regex, (_, capturedGroup) => {
    return replacementFn(capturedGroup);
  });
}

export const formatNameTags = (string: string) => {
  let formattedString = string;
  Object.entries(NAME_TAGS).forEach(([tag, name]) => {
    formattedString = formattedString.replaceAll(tag, name);
  });
  Object.entries(CONTROL_INPUTS).forEach(([tag, name]) => {
    formattedString = formattedString.replaceAll(tag, name);
  });

  // There are VAR0 VAR00 and VARB0. I think it is only ever last digit that is used.
  // VarB0 only exists in test zone
  const result = findAndReplaceVarPatterns(formattedString, (match) => {
    const index = parseInt(match.slice(-1), 10)
    return MESSAGE_VARS[index];
  });

  return result;
}

export const isSavePointMessage = (message: Message) => message.text[0].startsWith(`【Save Point】`)