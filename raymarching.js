const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl");

const vertexShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(
  vertexShader,
  `
attribute vec2 position;
void main() {
gl_Position = vec4(position, 0.0, 1.0);
}
`
);
gl.compileShader(vertexShader);

const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(
  fragmentShader,
  `
    precision highp float;

    uniform vec2 resolution;

    float sphereSDF(vec3 p, vec3 c, float r) {
        return length(p - c) - r;
    }

    void main() {
        vec2 uv = (gl_FragCoord.xy - 0.5 * resolution) / min(resolution.y, resolution.x);

        vec3 cameraPos = vec3(0.0, 0.0, -5.0);
        vec3 rayDir = normalize(vec3(uv, 1.0));
        vec3 rayPos = cameraPos;
        const int maxSteps = 64;
        float stepSize = 0.1;
        for (int i = 0; i < maxSteps; i++) {
            float dist = sphereSDF(rayPos, vec3(0.0), 1.0);
            if (dist < 0.01) {
                float c = 1.0 - min(length(rayPos - cameraPos) / 8.0, 1.0);
                gl_FragColor = vec4(c, c, c, 1.0);
                return;
            }
            rayPos += dist * rayDir;
        }

        gl_FragColor = vec4(0.0);
    }
`
);
gl.compileShader(fragmentShader);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
gl.useProgram(program);

const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(
  gl.ARRAY_BUFFER,
  new Float32Array([-1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0]),
  gl.STATIC_DRAW
);

const positionLocation = gl.getAttribLocation(program, "position");
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

const resolutionUniformLocation = gl.getUniformLocation(program, "resolution");
gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);

function render() {
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  requestAnimationFrame(render);
}

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
}
window.addEventListener("resize", resize);
resize();
render();
