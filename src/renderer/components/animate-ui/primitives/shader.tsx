'use client';

import {
  useEffect,
  useRef,
  type CSSProperties,
  type ForwardedRef,
  forwardRef,
} from 'react';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface ShaderCanvasHandle {
  gl: WebGLRenderingContext | null;
  canvas: HTMLCanvasElement | null;
}

export interface ShaderCanvasProps {
  fragmentShader: string;
  vertexShader?: string;
  style?: CSSProperties;
  className?: string;
  onContext?: (gl: WebGLRenderingContext) => void;
}

/* ------------------------------------------------------------------ */
/* Default vertex shader — full-screen clip-space quad                  */
/* ------------------------------------------------------------------ */

const DEFAULT_VERTEX_SHADER = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

/* ------------------------------------------------------------------ */
/* ShaderCanvas                                                        */
/* ------------------------------------------------------------------ */

/**
 * Raw WebGL 1 primitive — renders a user-supplied fragment shader onto a
 * full-screen transparent canvas.
 *
 * Free uniforms injected automatically (resolved from CSS custom properties
 * where noted):
 *   - u_resolution : vec2  — canvas pixel dimensions
 *   - u_time       : float — seconds since mount
 *   - u_dpr        : float — device pixel ratio
 *   - u_pointer    : vec2  — pointer position in CSS pixels
 *   - u_trail[8]   : vec4  — last 8 pointer samples (position + pressure)
 *   - u_color0..3  : vec4  — resolved from --brand, --foreground, etc.
 */
export const ShaderCanvas = forwardRef<ShaderCanvasHandle, ShaderCanvasProps>(
  function ShaderCanvas({ fragmentShader, vertexShader = DEFAULT_VERTEX_SHADER, style, className, onContext }, ref: ForwardedRef<ShaderCanvasHandle>) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const glRef = useRef<WebGLRenderingContext | null>(null);
    const programRef = useRef<WebGLProgram | null>(null);
    const startTimeRef = useRef<number>(Date.now());
    const pointerRef = useRef<{ x: number; y: number; pressure: number; t: number }>({ x: 0, y: 0, pressure: 0, t: 0 });
    const trailRef = useRef<Float32Array>(new Float32Array(32)); // 8 × vec4

    // Imperative handle
    useEffect(() => {
      if (typeof ref !== 'function' && ref) {
        ref.current = {
          get gl() { return glRef.current; },
          get canvas() { return canvasRef.current; },
        };
      }
    }, [ref]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false });
      if (!gl) return;
      glRef.current = gl;

      // Compile shaders
      const vs = compileShader(gl, gl.VERTEX_SHADER, vertexShader);
      const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShader);
      if (!vs || !fs) return;

      const program = gl.createProgram();
      if (!program) return;
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('ShaderCanvas: program link failed', gl.getProgramInfoLog(program));
        return;
      }
      programRef.current = program;
      gl.useProgram(program);

      // Fullscreen quad (two triangles)
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW,
      );
      const aPosition = gl.getAttribLocation(program, 'a_position');
      if (aPosition >= 0) {
        gl.enableVertexAttribArray(aPosition);
        gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
      }

      // -- Resolve CSS variable colors --
      const resolveColor = (name: string): [number, number, number, number] => {
        const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
        return parseCssColor(raw) || [0, 0, 0, 1];
      };

      const uColor0 = gl.getUniformLocation(program, 'u_color0');
      const uColor1 = gl.getUniformLocation(program, 'u_color1');
      const uColor2 = gl.getUniformLocation(program, 'u_color2');
      const uColor3 = gl.getUniformLocation(program, 'u_color3');
      if (uColor0) gl.uniform4fv(uColor0, new Float32Array(resolveColor('--brand')));
      if (uColor1) gl.uniform4fv(uColor1, new Float32Array(resolveColor('--foreground')));
      if (uColor2) gl.uniform4fv(uColor2, new Float32Array(resolveColor('--accent')));
      if (uColor3) gl.uniform4fv(uColor3, new Float32Array(resolveColor('--card')));

      const uResolution = gl.getUniformLocation(program, 'u_resolution');
      const uDpr = gl.getUniformLocation(program, 'u_dpr');
      const uTime = gl.getUniformLocation(program, 'u_time');
      const uPointer = gl.getUniformLocation(program, 'u_pointer');

      // Trail uniform locations (u_trail[0..7])
      const uTrail: (WebGLUniformLocation | null)[] = [];
      for (let i = 0; i < 8; i++) {
        uTrail.push(gl.getUniformLocation(program, `u_trail[${i}]`));
      }

      const dpr = window.devicePixelRatio || 1;

      const resize = () => {
        const rect = canvas.getBoundingClientRect();
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        gl.viewport(0, 0, canvas.width, canvas.height);
        if (uResolution) gl.uniform2f(uResolution, canvas.width, canvas.height);
        if (uDpr) gl.uniform1f(uDpr, dpr);
      };
      resize();
      window.addEventListener('resize', resize);

      const onMove = (e: PointerEvent) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        // Shift trail buffer left, append new sample at end
        const trail = trailRef.current;
        for (let i = 0; i < 28; i++) trail[i] = trail[i + 4];
        trail[28] = x;
        trail[29] = y;
        trail[30] = e.pressure || 0.5;
        trail[31] = e.timeStamp;
        pointerRef.current = { x, y, pressure: e.pressure || 0.5, t: e.timeStamp };
      };
      canvas.addEventListener('pointermove', onMove, { passive: true });

      let raf = 0;
      const render = () => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        if (uTime) gl.uniform1f(uTime, elapsed);
        if (uPointer) gl.uniform2f(uPointer, pointerRef.current.x, pointerRef.current.y);
        for (let i = 0; i < 8; i++) {
          if (uTrail[i]) gl.uniform4fv(uTrail[i], trailRef.current.subarray(i * 4, i * 4 + 4));
        }
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        raf = requestAnimationFrame(render);
      };
      raf = requestAnimationFrame(render);

      onContext?.(gl);

      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
        canvas.removeEventListener('pointermove', onMove);
      };
    }, [fragmentShader, vertexShader, onContext]);

    return (
      <canvas
        ref={canvasRef}
        className={className}
        style={{ display: 'block', width: '100%', height: '100%', ...style }}
      />
    );
  },
);

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('ShaderCanvas: compile error', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function parseCssColor(raw: string): [number, number, number, number] | null {
  if (!raw) return null;
  // hex #rrggbb or #rgb
  const hex = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1];
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const n = parseInt(full, 16);
    return [(n >> 16 & 0xff) / 255, (n >> 8 & 0xff) / 255, (n & 0xff) / 255, 1];
  }
  // rgb(r, g, b) or rgba(r, g, b, a)
  const rgb = raw.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\)$/i);
  if (rgb) {
    return [
      parseInt(rgb[1]) / 255,
      parseInt(rgb[2]) / 255,
      parseInt(rgb[3]) / 255,
      rgb[4] !== undefined ? parseFloat(rgb[4]) : 1,
    ];
  }
  return null;
}
