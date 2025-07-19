import { Uniform, Vector3 } from 'three'
import { Effect } from 'postprocessing'

const fragmentShader = `
uniform vec3 uColor;
uniform float uBlendMode; // 0.0 = subtractive, 1.0 = additive
uniform float uIntensity;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 color = inputColor.rgb;
  
  // Apply blending based on blend mode
  if (uBlendMode < 0.5) {
    // Subtractive blending
    color = color - (uColor * uIntensity);
  } else {
    // Additive blending
    color = color + (uColor * uIntensity);
  }
  
  // Clamp values to prevent over/underflow
  color = clamp(color, 0.0, 1.0);
  
  outputColor = vec4(color, inputColor.a);
}
`

type BlendMode = 'additive' | 'subtractive'
type ColorArray = [number, number, number]

interface ColorBlendEffectOptions {
  color?: ColorArray
  blendMode?: BlendMode
  intensity?: number
}

// Effect implementation
export class ColorBlendEffectImpl extends Effect {
  private _uColor: ColorArray = [0.0, 0.0, 0.0]
  private _uBlendMode: number = 1.0 // 0.0 = subtractive, 1.0 = additive
  private _uIntensity: number = 0

  constructor({
    color = [0.0, 0.0, 0.0],
    blendMode = 'additive',
    intensity = 0
  }: ColorBlendEffectOptions = {}) {
    super('ColorBlendEffect', fragmentShader, {
      uniforms: new Map<string, Uniform<unknown>>([
        ['uColor', new Uniform(new Vector3(...color))],
        ['uBlendMode', new Uniform(blendMode === 'additive' ? 1.0 : 0.0)],
        ['uIntensity', new Uniform(intensity)]
      ]),
    })
    
    this._uColor = color
    this._uBlendMode = blendMode === 'additive' ? 1.0 : 0.0
    this._uIntensity = intensity
  }

  update(): void {
    const colorUniform = this.uniforms.get('uColor') as Uniform<Vector3>
    const blendModeUniform = this.uniforms.get('uBlendMode') as Uniform<number>
    const intensityUniform = this.uniforms.get('uIntensity') as Uniform<number>
    
    colorUniform.value.set(this._uColor[0], this._uColor[1], this._uColor[2])
    blendModeUniform.value = this._uBlendMode
    intensityUniform.value = this._uIntensity
  }

  updateValues({
    color,
    blendMode,
    intensity
  }: ColorBlendEffectOptions): void {
    if (color) {
      this._uColor = color
    }
    if (blendMode) {
      this._uBlendMode = blendMode === 'additive' ? 1.0 : 0.0
    }
    if (intensity !== undefined) {
      this._uIntensity = intensity
    }
  }
}
