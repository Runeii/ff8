import { Uniform, Vector3 } from 'three'
import { Effect } from 'postprocessing'

const fragmentShader = `
uniform vec3 uColor;
uniform float uBlendMode; // 0.0 = ps1_subtractive, 1.0 = ps1_additive, 2.0 = ps1_50_50, 3.0 = ps1_25_additive
uniform float uIntensity;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec3 color = inputColor.rgb;
    vec3 overlayColor = uColor * uIntensity;
    
    // PlayStation 1 semitransparency modes
    if (uBlendMode < 0.5) {
        // Mode 2: PS1 Subtractive - 1.0 × Back - 1.0 × Forward
        color = color - overlayColor;
    } else if (uBlendMode < 1.5) {
        // Mode 1: PS1 Additive - 1.0 × Back + 1.0 × Forward  
        color = color + overlayColor;
    } else if (uBlendMode < 2.5) {
        // Mode 0: PS1 50/50 Blend - 0.5 × Back + 0.5 × Forward
        color = mix(color, overlayColor, 0.5);
    } else {
        // Mode 3: PS1 25% Additive - 1.0 × Back + 0.25 × Forward
        color = color + (overlayColor * 0.25);
    }
    
    // Clamp values to prevent over/underflow
    color = clamp(color, 0.0, 1.0);
    outputColor = vec4(color, inputColor.a);
}
`

type BlendMode = 'ps1_additive' | 'ps1_subtractive' | 'ps1_50_50' | 'ps1_25_additive'
type ColorArray = [number, number, number]

interface ColorBlendEffectOptions {
    color?: ColorArray
    blendMode?: BlendMode
    intensity?: number
}

// Effect implementation
export class ColorBlendEffectImpl extends Effect {
    private _uColor: ColorArray = [0.0, 0.0, 0.0]
    private _uBlendMode: number = 1.0 // Default to ps1_additive
    private _uIntensity: number = 0

    constructor({
        color = [0.0, 0.0, 0.0],
        blendMode = 'ps1_additive',
        intensity = 0
    }: ColorBlendEffectOptions = {}) {
        // Calculate blend mode value before calling super
        const blendModeValue = ColorBlendEffectImpl.getBlendModeValue(blendMode);
        
        super('ColorBlendEffect', fragmentShader, {
            uniforms: new Map<string, Uniform<unknown>>([
                ['uColor', new Uniform(new Vector3(...color))],
                ['uBlendMode', new Uniform(blendModeValue)],
                ['uIntensity', new Uniform(intensity)]
            ]),
        })
        this._uColor = color
        this._uBlendMode = blendModeValue
        this._uIntensity = intensity
    }

    private static getBlendModeValue(blendMode: BlendMode): number {
        switch (blendMode) {
            case 'ps1_subtractive': return 0.0  // Mode 2
            case 'ps1_additive': return 1.0     // Mode 1  
            case 'ps1_50_50': return 2.0        // Mode 0
            case 'ps1_25_additive': return 3.0  // Mode 3
            default: return 1.0
        }
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
            this._uBlendMode = ColorBlendEffectImpl.getBlendModeValue(blendMode)
        }
        if (intensity !== undefined) {
            this._uIntensity = intensity
        }
    }
}