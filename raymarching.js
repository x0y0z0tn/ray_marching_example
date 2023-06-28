// to live reload I use live-server
// https://github.com/tapio/live-server

const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
  console.log("Unable to initialize WebGL.");
}

const vertexShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(
  vertexShader,
  `#version 300 es
in vec2 position;
void main() {
gl_Position = vec4(position, 0.0, 1.0);
}
`
);
gl.compileShader(vertexShader);
if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
  console.error(
    "error compiling vertex shader",
    gl.getShaderInfoLog(vertexShader)
  );
}

const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(
  fragmentShader,
  `#version 300 es
    precision highp float;

    uniform vec2 resolution;
    out vec4 outColor;

    float sphereSDF(vec3 p, float r) {
        return length(p) - r;
    }

    float sphericalSymmetry(vec3 p) {
      float r = length(p);
      float ph = atan(p.y, p.x);
      float th = acos(p.z / r);

      float pattern = r/12.0 * sin(12.0 * ph) * cos(12.0 * th);

      return length(vec2(r-20.0, pattern)) - 0.25;
    }

    float radialSymmetrySDF(vec3 p) {
      float n = 5.0;
      float cs[20];

      float cr = 10.0;

      float r1 = length(p.xz);
      cs[0] = r1 - cr;

      float th1 = r1/n*sin(n*atan(p.x, p.z));

      float r2 = length(vec2(p.y, th1))*0.5;
      cs[1] = r2 - 0.25;

      float th2 = r2/n*sin(n*atan(p.y, th1));
      float a2=cs[0]-r2*0.25;
      float r3 = length(vec2(a2, th2))*0.5;
      cs[2] = r3 - 0.25;

      float th3 = r3/n*sin(n*atan(a2, th2));
      float a3 = length(vec2(p.y-r3, cs[0]-r3)) - 20.0;
      float r4 = length(vec2(a3, th3))*0.5;
      cs[3] = r4 - 0.25;

      float result = 1e6;
      for (int i = 4; i < 12; i++) {
        th3 = r4/n*sin(n*atan(a3, th3));
        a3 = length(vec2(cs[i-4]-r4, cs[i-3]-r4)) - 0.75;
        r4 = length(vec2(a3, th3))*0.75;
        cs[i] = r4 - 0.25;
        result = min(result, cs[i]);
      }

      for (int i = 2 ; i < 4; i++) {
        result = min(result, cs[i]);
      }

      return result;
    }

    float sceneSDF(in vec3 p) {
      return sphericalSymmetry(p);
    }

    vec3 calculateNormal(in vec3 p) {
      const vec3 small_step = vec3(0.001, 0.0, 0.0);

      float gradient_x = sceneSDF(p + small_step.xyy) - sceneSDF(p - small_step.xyy);
      float gradient_y = sceneSDF(p + small_step.yxy) - sceneSDF(p - small_step.yxy);
      float gradient_z = sceneSDF(p + small_step.yyx) - sceneSDF(p - small_step.yyx);

      return normalize(vec3(gradient_x, gradient_y, gradient_z));
    }

    vec3 rayMarch(in vec3 ro, in vec3 rd) {
      float total_distance_traveled = 0.0;
      const int number_of_steps = 256;
      const float minimum_distance = 0.001;
      const float maximum_distance = 500.0;

      for (int i = 0; i < number_of_steps; i++) {
        vec3 current_position = ro + total_distance_traveled * rd;

        float distance_to_closest = sceneSDF(current_position);

        if (distance_to_closest < minimum_distance) {
          vec3 normal = calculateNormal(current_position);
          vec3 light_position = vec3(0.0, 0.0, 70.0);
          vec3 direction_to_light = normalize(current_position - light_position);

          float diffuse_intensity = max(0.0, dot(normal, direction_to_light));

          return vec3(1.0) * diffuse_intensity;
        }

        if (total_distance_traveled > maximum_distance) {
          break;
        }

        total_distance_traveled += distance_to_closest;
      }

      return vec3(0.25);
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy - 0.5 * resolution) / min(resolution.y, resolution.x);

      vec3 camera_position = vec3(1.0,5.0, -100.0);
      vec3 ro = camera_position;
      vec3 rd = normalize(vec3(uv, 1.0));

      vec3 color = rayMarch(ro, rd);

      outColor = vec4(color, 1.0);
    }
`
);
gl.compileShader(fragmentShader);
if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
  console.error(
    "error compiling fragment shader",
    gl.getShaderInfoLog(fragmentShader)
  );
}

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
  console.error("error linking program", gl.getProgramInfoLog(program));
}

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

  //requestAnimationFrame(render);
}

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.uniform2f(resolutionUniformLocation, canvas.width, canvas.height);
}
window.addEventListener("resize", resize);
resize();
render();
