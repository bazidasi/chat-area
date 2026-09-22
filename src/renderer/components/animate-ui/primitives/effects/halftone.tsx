'use client';

import { cn } from '@/lib/utils';
import { ShaderCanvas, type ShaderCanvasHandle } from '../shader';

/* ------------------------------------------------------------------ */
/* Halftone fragment shader                                            */
/* ------------------------------------------------------------------ */

const FRAGMENT_SHADER = `
precision mediump float;

uniform vec2  u_resolution;
uniform float u_time;
uniform float u_dpr;
uniform vec2  u_pointer;
uniform vec4  u_trail[8];
uniform vec4  u_color0;
uniform vec4  u_color1;
uniform vec4  u_color2;
uniform vec4  u_color3;

/* ---- Simple 2D FBM (value noise) -------------------------------- */
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  /* Rotate pixel coords ~30° */
  float angle = 0.5236; /* ~30° in radians */
  vec2 rotated = vec2(
    gl_FragCoord.x * cos(angle) - gl_FragCoord.y * sin(angle),
    gl_FragCoord.x * sin(angle) + gl_FragCoord.y * cos(angle)
  );

  /* Cell size in device pixels */
  float cell = 12.0 * u_dpr;

  /* Cell center coordinate */
  vec2 cellCenter = (floor(rotated / cell) + 0.5) * cell;

  /* FBM sampled at cell center drives dot size */
  float f = fbm(cellCenter * 0.004 + u_time * 0.03);
  float dotRadius = cell * 0.35 * (0.4 + 0.6 * f);

  /* Distance from fragment to cell center (both in rotated space) */
  float dist = length(rotated - cellCenter);

  /* Smoothstep circle edge by 1px */
  float alpha = 1.0 - smoothstep(dotRadius - 1.0, dotRadius, dist);

  /* Radial mask — fade toward viewport edges */
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 centered = uv - 0.5;
  float mask = 1.0 - smoothstep(0.25, 0.75, length(centered));

  /* Foreground color from u_color0 (resolved --brand), blended
     with u_color1 (--foreground) for subtle depth */
  vec3 fg = mix(u_color0.rgb, u_color1.rgb, 0.15);

  /* Visible but subtle — text goes on top */
  float finalAlpha = alpha * mask * 0.55;

  gl_FragColor = vec4(fg, finalAlpha);
}
`;

/* ------------------------------------------------------------------ */
/* Halftone component                                                  */
/* ------------------------------------------------------------------ */

export interface HalftoneProps {
  /** Override className on the wrapper div. */
  className?: string;
  /** Shader canvas handle for advanced usage. */
  onContext?: (handle: ShaderCanvasHandle) => void;
}

/**
 * Halftone — dot-grid background effect driven by a WebGL shader.
 *
 * Usage:
 *   <Halftone className="absolute inset-0 -z-10" />
 *
 * Colors resolve from CSS variables (--brand, --foreground, etc.)
 * so the theme drives the dot color automatically.
 */
export function Halftone({ className, onContext }: HalftoneProps) {
  return (
    <div className={cn('pointer-events-none absolute inset-0 z-0', className)}>
      <ShaderCanvas
        fragmentShader={FRAGMENT_SHADER}
        onContext={(gl: WebGLRenderingContext) => {
          /* Ensure premultiplied-alpha-friendly output */
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          const canvas = gl.canvas as HTMLCanvasElement;
          onContext?.({ gl, canvas });
        }}
      />
    </div>
  );
}
