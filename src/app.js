import "./styles/index.scss";

import * as dat from 'dat.gui';
import Stats from 'stats.js';

import { perm, grad3 } from "./helpers/noise";
import { vec3, mat3, mat4, glMatrixArrayType, quat4 } from "./helpers/glMatrix";
import wegGlUtils from './helpers/webgl';

import vertexShader from "./shaders/mandelbrot.vert";
import fragmentShader from "./shaders/mandelbrot.frag";

const stats = new Stats();
document.body.appendChild(stats.dom);

var cameraPosition = [0.01, 0.0, 3.0];
var cameraRotation = mat4.create();
mat4.identity(cameraRotation);

var gl;

const options = {
  stop: false,
  cameraDirectionX: 0,
  cameraDirectionY: 0,
  cameraDirectionZ: 0,
  cameraPosX: 0,
  cameraPosY: 0,
  cameraPosZ: 0,
  phong: true,
  phongNoise: false,
  noise: false,
  lacunarity: 2.0,
  gain: 0.5,
  octaves: 0,
  marble: true,
  normal: false,
  maxIterations: 10,
  iterationValue: 10,
  iteratePowers: true,
  power: 8,
  julie: false,
  colorChange: 0,
  ambientRed: 0.5,
  ambientGreen: 0.5,
  ambientBlue: 0.5,
  antialiasing: 0
};

const gui = new dat.GUI();
gui.add(options, 'stop');
gui.add(options, 'phong');
gui.add(options, 'phongNoise');
gui.add(options, 'noise');
gui.add(options, 'lacunarity');
gui.add(options, 'gain');
gui.add(options, 'octaves', -1, 1, 0.01);
gui.add(options, 'marble');
gui.add(options, 'normal');
gui.add(options, 'maxIterations');
gui.add(options, 'iteratePowers');
gui.add(options, 'power');
gui.add(options, 'julie');
gui.add(options, 'antialiasing', 0, 3, 1);
const colorFolder = gui.addFolder('color');
colorFolder.add(options, 'colorChange', 0, 1);
colorFolder.add(options, 'ambientRed', 0, 1);
colorFolder.add(options, 'ambientGreen', 0, 1);
colorFolder.add(options, 'ambientBlue', 0, 1);
const cameraPositionFolder = gui.addFolder('cameraPosition');
cameraPositionFolder.add(cameraPosition, 0, -3, 3, 0.01);
cameraPositionFolder.add(cameraPosition, 1, -3, 3, 0.01);
cameraPositionFolder.add(cameraPosition, 2, -3, 3, 0.01);
const cameraRotationFolder = gui.addFolder('cameraRotation');
cameraRotationFolder.add(cameraRotation, 0, -3, 3, 0.01);
cameraRotationFolder.add(cameraRotation, 1, -3, 3, 0.01);
cameraRotationFolder.add(cameraRotation, 2, -3, 3, 0.01);

function initGL(canvas) {
  try {
    gl = canvas.getContext("experimental-webgl");
    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;
  } catch (e) {}
  if (!gl) {
    alert("Could not initialise WebGL, sorry :-(");
  }
}

function buildShader(gl, rawShader, variant) {
  var shader;
  if (variant == "fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (variant == "vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }

  gl.shaderSource(shader, rawShader);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }

  return shader;
}

var shaderProgram;

function initShaders() {
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, buildShader(gl, vertexShader, 'vertex'));
  gl.attachShader(shaderProgram, buildShader(gl, fragmentShader, 'fragment'));
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Could not initialise shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(
    shaderProgram,
    "aVertexPosition"
  );
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexColorAttribute = gl.getAttribLocation(
    shaderProgram,
    "aVertexColor"
  );
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);

  shaderProgram.time = gl.getUniformLocation(shaderProgram, "time");

  shaderProgram.camera = gl.getUniformLocation(shaderProgram, "camera");
  shaderProgram.viewRotation = gl.getUniformLocation(
    shaderProgram,
    "viewRotation"
  );

  shaderProgram.colorChange = gl.getUniformLocation(
    shaderProgram,
    "colorChange"
  );
  shaderProgram.ambientRed = gl.getUniformLocation(shaderProgram, "ambientRed");
  shaderProgram.ambientGreen = gl.getUniformLocation(
    shaderProgram,
    "ambientGreen"
  );
  shaderProgram.ambientBlue = gl.getUniformLocation(
    shaderProgram,
    "ambientBlue"
  );

  shaderProgram.normalLighting = gl.getUniformLocation(
    shaderProgram,
    "normalLighting"
  );
  shaderProgram.power = gl.getUniformLocation(shaderProgram, "power");
  shaderProgram.maxIterations = gl.getUniformLocation(
    shaderProgram,
    "maxIterations"
  );
  shaderProgram.antialiasing = gl.getUniformLocation(
    shaderProgram,
    "antialiasing"
  );
  shaderProgram.julia = gl.getUniformLocation(shaderProgram, "julia");
  shaderProgram.permSampler = gl.getUniformLocation(
    shaderProgram,
    "permTexture"
  );
  shaderProgram.phong = gl.getUniformLocation(shaderProgram, "phong");
  shaderProgram.noise = gl.getUniformLocation(shaderProgram, "uNoise");
  shaderProgram.marble = gl.getUniformLocation(shaderProgram, "uMarble");
  shaderProgram.lacunarity = gl.getUniformLocation(
    shaderProgram,
    "uLacunarity"
  );
  shaderProgram.gain = gl.getUniformLocation(shaderProgram, "uGain");
  shaderProgram.octaves = gl.getUniformLocation(shaderProgram, "uOctaves");
  shaderProgram.justDE = gl.getUniformLocation(shaderProgram, "uJustDE");
}

function degToRad(degrees) {
  return (degrees * Math.PI) / 180;
}

var permTexture;
function initPermTexture() {
  var width = 256;
  var components = 4;
  var pixels = new Uint8Array(width * width * components);
  for (var i = 0; i < width; i++) {
    for (var j = 0; j < width; j++) {
      var offset = (i * width + j) * components;
      var value = perm[(j + perm[i]) & 0xff];
      pixels[offset] = grad3[(value & 0x0f) * 3 + 0] * 64 + 64;
      pixels[offset + 1] = grad3[(value & 0x0f) * 3 + 1] * 64 + 64;
      pixels[offset + 2] = grad3[(value & 0x0f) * 3 + 2] * 64 + 64;
      pixels[offset + 3] = value;
    }
  }
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  permTexture = gl.createTexture();

  gl.bindTexture(gl.TEXTURE_2D, permTexture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    width,
    width,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    pixels
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
}
//end of items need for noise

var squareVertexPositionBuffer;

function initBuffers() {
  squareVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
  let vertices = [1.0, 1.0, 0.0, -1.0, 1.0, 0.0, 1.0, -1.0, 0.0, -1.0, -1.0, 0.0];
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  squareVertexPositionBuffer.itemSize = 3;
  squareVertexPositionBuffer.numItems = 4;
}
function length(vect) {
  var total = 0.0;
  for (var i = 0; i < vect.length; i++) total += vect[i] * vect[i];
  return Math.sqrt(total);
}
//mat4.translate(cameraRotation, [1.0, 0.05, 2.0]);
//mat4.rotate(cameraRotation, 0.0, [0.0, 0.0, 0.0])

var time = 0.0;

var aaValue = 1;

var power;
function setUniforms() {
  gl.uniform1i(shaderProgram.time, time);
  //camera
  gl.uniform3fv(shaderProgram.camera, cameraPosition);
  gl.uniformMatrix3fv(
    shaderProgram.viewRotation,
    false,
    mat4.toMat3(cameraRotation)
  );

  //phong shading
  gl.uniform1f(
    shaderProgram.phong,
    options.phong || options.phongNoise
  );
  //noise uniforms
  gl.uniform1f(
    shaderProgram.noise,
    options.noise || options.phongNoise
  );
  gl.uniform1f(shaderProgram.marble, options.marble);
  gl.uniform1f(
    shaderProgram.lacunarity,
    options.lacunarity
  );
  gl.uniform1f(shaderProgram.gain, options.gain);
  gl.uniform1f(shaderProgram.octaves, options.octaves);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, permTexture);
  gl.uniform1i(shaderProgram.permSampler, 0);

  //normal lighting
  gl.uniform1f(
    shaderProgram.normalLighting,
    options.normal
  );

  gl.uniform1i(
    shaderProgram.maxIterations,
    options.maxIterations
  );

  //changing of powers
  if (options.iteratePowers == true) {
    power = 8.0 + Math.cos(time / 10000.0) * 4.0;
    var trimPower = trimNum(power.toString());
    options.power = trimPower;
  } else {
    power = options.power;
  }

  gl.uniform1f(shaderProgram.power, power);

  gl.uniform1i(shaderProgram.antialiasing, options.antialiasing);

  gl.uniform1f(shaderProgram.julia, options.julie);

  let colorChange = options.colorChange;
  gl.uniform1f(shaderProgram.colorChange, colorChange);

  gl.uniform1f(shaderProgram.ambientRed, options.ambientRed);
  gl.uniform1f(shaderProgram.ambientGreen, options.ambientGreen);
  gl.uniform1f(shaderProgram.ambientBlue, options.ambientBlue);
}

function drawScene() {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  //load our square to draw on
  gl.bindBuffer(gl.ARRAY_BUFFER, squareVertexPositionBuffer);
  gl.vertexAttribPointer(
    shaderProgram.vertexPositionAttribute,
    squareVertexPositionBuffer.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  //set uniforms in shader
  setUniforms();

  //draw the mandelbulb
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems);

  //set the bottom left pixel to encode distance
  gl.uniform1f(shaderProgram.justDE, true);
  //gl.drawArrays(gl.POINTS , 0, 1);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, squareVertexPositionBuffer.numItems);
  var deArr = new Uint8Array(4);
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, deArr);

  gl.uniform1f(shaderProgram.justDE, false);
}

function animate() {
  time = new Date().getTime();
}

const tick = () => {
  stats.begin();

  if (options.stop == true) {
    requestAnimFrame(tick);
    return;
  }

  animate();
  requestAnimFrame(tick);

  drawScene();
  stats.end();
};

function webGLStart() {
  var canvas = document.getElementById("mandelBulb");
  canvas.height = window.innerHeight;
  canvas.width = window.innerWidth;
  initGL(canvas);
  initShaders();
  initBuffers();

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  initPermTexture();

  tick();
}


function trimNum(num) {
  return num.substr(0, 7);
}

webGLStart();
