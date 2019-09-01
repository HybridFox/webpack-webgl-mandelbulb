    #ifdef GL_ES
    precision highp float;
    #endif

/** 
 3dmandelbrot was put together by:
 Michael Jewell <michael.jewell@maine.edu>,  
 Jesse Altman <jesse.altman@maine.edu>,
 Shane Christy <shane.christy@maine.edu>,
 Kayla Christina Artinyan <kayla.artinyan@maine.edu> from the universtiy of southern maine for Bruce Macleod's Interactive Graphics course
 
 The origin of our mandelbulb equations:
 * Mandelbulb.pbk
 * Last update: 14 December 2009
 *
 * Changelog:
 *		1.0		- Initial release
 *		1.0.1	- Fixed a missing asymmetry thanks to Chris King (http://www.dhushara.com)
 *				- Refinements in the colouring
 *      1.0.2   - Added radiolaria option for a funky hair-like effect
 * 				- Incorporated the scalar derivative method as described here:
 *			    - http://www.fractalforums.com/mandelbulb-implementation/realtime-renderingoptimisations/
 *		1.0.3	- Created a quick version of the script as using a boolean flag to determine
 *				  which distance estimation method created long compilation times.
 * 		1.0.4 	- Fixed issue with older graphic cards and the specular highlights
 *
 *
 * Copyright (c) 2009 Tom Beddard
 * http://www.subblue.com
 *
 * For more Flash and PixelBender based generative graphics experiments see:
 * http://www.subblue.com/blog
 *
 * Licensed under the MIT License:
 * http://www.opensource.org/licenses/mit-license.php
 *
 *
 * Credits and references
 * ======================
 * For the story behind the 3D Mandelbrot see the following page:
 * http://www.skytopia.com/project/fractal/mandelbulb.html
 *
 * The original forum disussion with many implementation details can be found here:
 * http://www.fractalforums.com/3d-fractal-generation/true-3d-mandlebrot-type-fractal/
 *
 * This implementation references the 4D Quaternion GPU Raytracer by Keenan Crane:
 * http://www.devmaster.net/forums/showthread.php?t=4448
 *
 * and the NVIDIA CUDA/OptiX implementation by cbuchner1:
 * http://forums.nvidia.com/index.php?showtopic=150985
 *
 *  -- noise provided by --
 *The following is noise calculations are provided from
 * Original noise Author: Stefan Gustavson ITN-LiTH (stegu@itn.liu.se) 2004-12-05
 * Simplex indexing functions by Bill Licea-Kane, ATI
 *
 * You may use, modify and redistribute this code free of charge,
 * provided that the author's names and this notice appear intact.
 *
 * The code was hosted at http://www.pcprogramming.com/NoiseCube.html
 */

/*
uniform int width;
uniform int height;
uniform float pixelSize;
uniform int  antialiasing;
uniform bool  phong;
uniform bool  julia;
uniform bool  radiolaria;
uniform float shadows;
uniform float radiolariaFactor;
uniform float ambientOcclusion;
uniform float ambientOcclusionEmphasis;
uniform float bounding;
uniform float bailout;
uniform float power;
uniform vec2  phase;
uniform vec3  julia_c;
uniform vec3  camera;
uniform vec3  cameraFine;
uniform vec3  cameraRotation;
uniform float cameraZoom;
uniform vec3  light;
uniform vec4  backgroundColor;
uniform vec4  diffuseColor;
uniform vec4  ambientColor;
uniform vec4  lightColor;
uniform float colorSpread;
uniform float rimLight;
uniform float specularity;
uniform float specularExponent;
uniform vec3  rotation;
uniform int   maxIterations;
uniform int   stepLimit;
uniform float epsilonScale;
*/
uniform bool uJustDE;
uniform int time;
uniform vec3 camera;
uniform  mat3 viewRotation;
uniform float power;
uniform int maxIterations; //user defined max iterations, does no good over maxIterationsLimit
const int   maxIterationsLimit = 50;
uniform int antialiasing;
uniform bool julia;
uniform bool uNoise;
uniform bool phong;
uniform bool normalLighting;
uniform float colorChange;
uniform float ambientRed;
uniform float ambientGreen;
uniform float ambientBlue;

uniform sampler2D permTexture; //for simplex noise
uniform bool uMarble;
uniform float uLacunarity;
uniform float uGain;
uniform float uOctaves;
  
float ftime = float(time); 	


const int width = 500;
const int height = 500;
const float pixelSize = 1.0;
//const int  antialiasing = 0;
//const bool  phong = false;
// bool  julia = false;
 bool  radiolaria = false;
const float shadows = 0.6496;
const float radiolariaFactor = 0.0;
const float ambientOcclusion = 0.5;
const float ambientOcclusionEmphasis = 0.5;
const float bounding = 1.718;
const float bailout = 4.0;
//float power = 8.0 + cos(ftime / 10000.0) * 4.0;
 vec2  phase = vec2(0.0, 0.0);
 vec3  julia_c = vec3(0.95, 0.0, 0.0);
  // vec3  camera = vec3(1.0, 0.5, 2.0);
 vec3  cameraFine = vec3(0.0, 0.0, 0.0);
  //vec3  cameraRotation = vec3(-10.0, -10.0, 20.0);
 float cameraZoom = 0.0;
 vec3  light = vec3(100, -54.41, 27.94);
 vec4  backgroundColor = vec4(0.0, 0.0, 0.0, 1.0);
 vec4  diffuseColor = vec4(1.0, 0.7, 1.0, 1.0);
 vec4  ambientColor = vec4(ambientRed*cos(colorChange*ftime/500.0), ambientGreen*cos(colorChange*ftime/600.0), ambientBlue*cos(colorChange*ftime/1000.0), 1.0);
 vec4  lightColor = vec4(1.0, 1.0, 1.0, 1.0);
 float colorSpread = 0.3146;
 float rimLight = 1.0;
 float specularity = 0.5;
 float specularExponent = 25.0;

vec3 rotation = vec3(0.0, 0.0 , 0.0); 
const int   stepLimit = 125;
const float epsilonScale = 1.0; 



#define PI 3.141592653
#define MIN_EPSILON 3e-7



varying vec3 Position;

vec2 size = vec2(float(width), float(height));
float aspectRatio = size.x / size.y;


// Object rotation
float c4 = cos(radians(-rotation.x));
float s4 = sin(radians(-rotation.x));
mat3 objRotationY = mat3( c4, 0, s4,
					    0, 1, 0,
					  -s4, 0, c4);

float c5 = cos(radians(-rotation.y));
float s5 = sin(radians(-rotation.y));
mat3 objRotationZ = mat3( c5, -s5, 0,
					   s5, c5, 0,
					    0, 0, 1);

float c6 = cos(radians(-rotation.z));
float s6 = sin(radians(-rotation.z));
mat3 objRotationX = mat3( 1, 0, 0,
								   0, c6, -s6,
								   0, s6, c6);

mat3 objRotation = objRotationX * objRotationY * objRotationZ;


//eye = float3(0, 0, camera.w) * viewRotation;
//lightSource = light * viewRotation * 100.0;
vec3 eye = (camera + cameraFine) * objRotation;
//if (eye == float3(0, 0, 0)) eye = float3(0, 0.0001, 0);


// Super sampling
float sampleStep = 1.0 / float(antialiasing);
float sampleContribution = 1.0 / pow(float(antialiasing), 2.0);
float pixel_scale = 1.0 / max(size.x, size.y);


/*
 * To create offsets of one texel and one half texel in the
 * texture lookup, we need to know the texture image size.
 */
#define ONE 0.00390625
#define ONEHALF 0.001953125
// The numbers above are 1/256 and 0.5/256, change accordingly
// if you change the code to use another perm/grad texture size.

void simplex( const in vec3 P, out vec3 offset1, out vec3 offset2 )
{
  vec3 offset0;
 
  vec2 isX = step( P.yz, P.xx );         // P.x >= P.y ? 1.0 : 0.0;  P.x >= P.z ? 1.0 : 0.0;
  offset0.x  = dot( isX, vec2( 1.0 ) );  // Accumulate all P.x >= other channels in offset.x
  offset0.yz = 1.0 - isX;                // Accumulate all P.x <  other channels in offset.yz

  float isY = step( P.z, P.y );          // P.y >= P.z ? 1.0 : 0.0;
  offset0.y += isY;                      // Accumulate P.y >= P.z in offset.y
  offset0.z += 1.0 - isY;                // Accumulate P.y <  P.z in offset.z
 
  // offset0 now contains the unique values 0,1,2 in each channel
  // 2 for the channel greater than other channels
  // 1 for the channel that is less than one but greater than another
  // 0 for the channel less than other channels
  // Equality ties are broken in favor of first x, then y
  // (z always loses ties)

  offset2 = clamp(   offset0, 0.0, 1.0 );
  // offset2 contains 1 in each channel that was 1 or 2
  offset1 = clamp( --offset0, 0.0, 1.0 );
  // offset1 contains 1 in the single channel that was 1
}


/*
 * 3D simplex noise. Comparable in speed to classic noise, better looking.
 */
float snoise(const in vec3 P) {

// The skewing and unskewing factors are much simpler for the 3D case
#define F3 0.333333333333
#define G3 0.166666666667

  // Skew the (x,y,z) space to determine which cell of 6 simplices we're in
 	float s = (P.x + P.y + P.z) * F3; // Factor for 3D skewing
  vec3 Pi = floor(P + s);
  float t = (Pi.x + Pi.y + Pi.z) * G3;
  vec3 P0 = Pi - t; // Unskew the cell origin back to (x,y,z) space
  Pi = Pi * ONE + ONEHALF; // Integer part, scaled and offset for texture lookup

  vec3 Pf0 = P - P0;  // The x,y distances from the cell origin

  // For the 3D case, the simplex shape is a slightly irregular tetrahedron.
  // To find out which of the six possible tetrahedra we're in, we need to
  // determine the magnitude ordering of x, y and z components of Pf0.
  vec3 o1;
  vec3 o2;
  simplex(Pf0, o1, o2);

  // Noise contribution from simplex origin
  float perm0 = texture2D(permTexture, Pi.xy).a;
  vec3  grad0 = texture2D(permTexture, vec2(perm0, Pi.z)).rgb * 4.0 - 1.0;
  float t0 = 0.6 - dot(Pf0, Pf0);
  float n0;
  if (t0 < 0.0) n0 = 0.0;
  else {
    t0 *= t0;
    n0 = t0 * t0 * dot(grad0, Pf0);
  }

  // Noise contribution from second corner
  vec3 Pf1 = Pf0 - o1 + G3;
  float perm1 = texture2D(permTexture, Pi.xy + o1.xy*ONE).a;
  vec3  grad1 = texture2D(permTexture, vec2(perm1, Pi.z + o1.z*ONE)).rgb * 4.0 - 1.0;
  float t1 = 0.6 - dot(Pf1, Pf1);
  float n1;
  if (t1 < 0.0) n1 = 0.0;
  else {
    t1 *= t1;
    n1 = t1 * t1 * dot(grad1, Pf1);
  }
  
  // Noise contribution from third corner
  vec3 Pf2 = Pf0 - o2 + 2.0 * G3;
  float perm2 = texture2D(permTexture, Pi.xy + o2.xy*ONE).a;
  vec3  grad2 = texture2D(permTexture, vec2(perm2, Pi.z + o2.z*ONE)).rgb * 4.0 - 1.0;
  float t2 = 0.6 - dot(Pf2, Pf2);
  float n2;
  if (t2 < 0.0) n2 = 0.0;
  else {
    t2 *= t2;
    n2 = t2 * t2 * dot(grad2, Pf2);
  }
  
  // Noise contribution from last corner
  vec3 Pf3 = Pf0 - vec3(1.0-3.0*G3);
  float perm3 = texture2D(permTexture, Pi.xy + vec2(ONE, ONE)).a;
  vec3  grad3 = texture2D(permTexture, vec2(perm3, Pi.z + ONE)).rgb * 4.0 - 1.0;
  float t3 = 0.6 - dot(Pf3, Pf3);
  float n3;
  if(t3 < 0.0) n3 = 0.0;
  else {
    t3 *= t3;
    n3 = t3 * t3 * dot(grad3, Pf3);
  }

  // Sum up and scale the result to cover the range [-1,1]
  return 32.0 * (n0 + n1 + n2 + n3);
}
// Ridged multifractal
// See "Texturing & Modeling, A Procedural Approach", Chapter 12
float ridge(float h, float offset)
{
    h = abs(h);
    h = offset - h;
    h = h * h;
    return h;
}

float ridgedmf(vec3 p, float lacunarity, float gain, float offset, float octaves)
{
	float sum = 0.0;
	float freq = 5.0, amp = 0.7;
	float prev = 1.0;
	for(float i=0.0 ; i < 20.0; i++) {
        if(i > octaves){break;}
	        float noise = snoise(p*freq);
		float n = ridge(noise, offset);
		sum += n*amp*prev;
		prev = n;
		freq *= lacunarity;
		amp *= gain;
	}
	return sum;
}
  
float marble(vec3 p, float lacunarity, float gain, float offset, float octaves)
  {
    float sum = 0.0;
    float freq = 5.0, amp = 0.7;
    float prev = 1.0;
    for(float i=0.0 ; i < 1000.0; i++) {
      if(i > octaves){break;}
      float noise = abs(snoise(p*freq));
      sum += noise * amp;
      freq *= lacunarity;
      amp *= gain;
    }
    return sin (p.x*10.0 + sum) * 0.33 + sin(p.y*10.0 + sum) * 0.33 +sin(p.z*10.0 + sum) * 0.33 ;
  }
float ridgedmfDefault(vec3 p, float octaves)
{
       return ridgedmf(p, 2.0, .5, 1.0, octaves);
}


//**************** end of NOISE methods**************

// The fractal calculation
//
// Calculate the closest distance to the fractal boundary and use this
// distance as the size of the step to take in the ray marching.
//
// Fractal formula:
//	  z' = z^p + c
//
// For each iteration we also calculate the derivative so we can estimate
// the distance to the nearest point in the fractal set, which then sets the
// maxiumum step we can move the ray forward before having to repeat the calculation.
//
//	 dz' = p * z^(p-1)
//
// The distance estimation is then calculated with:
//
//   0.5 * |z| * log(|z|) / |dz|
//
int colorVariable;
float DE(vec3 z0, inout float min_dist)
{
	vec3 c = julia ? julia_c : z0; // Julia set has fixed c, Mandelbrot c changes with location
	vec3 z = z0;
	float pd = power - 1.0;			 // power for derivative

	// Convert z to polar coordinates
	float r	 = length(z);
	float th = atan(z.y, z.x);
	float ph = asin(z.z / r);

	// Record z orbit distance for ambient occulsion shading
	if (r < min_dist) min_dist = r;

	vec3 dz;
	float ph_dz = 0.0;
	float th_dz = 0.0;
	float r_dz	= 1.0;
	float powR, powRsin;

	// Iterate to compute the distance estimator.
	for (int n = 0; n < maxIterationsLimit; n++) {
		colorVariable = n;
		if(n >= maxIterations)
		  break;
		// Calculate derivative of
		powR = power * pow(r, pd);
		powRsin = powR * r_dz * sin(ph_dz + pd*ph);
		dz.x = powRsin * cos(th_dz + pd*th) + 1.0;
		dz.y = powRsin * sin(th_dz + pd*th);
		dz.z = powR * r_dz * cos(ph_dz + pd*ph);

		// polar coordinates of derivative dz
		r_dz  = length(dz);
		th_dz = atan(dz.y, dz.x);
		ph_dz = acos(dz.z / r_dz);

		// z iteration
		powR = pow(r, power);
		powRsin = sin(power*ph);
		z.x = powR * powRsin * cos(power*th);
		z.y = powR * powRsin * sin(power*th);
		z.z = powR * cos(power*ph);
		z += c;

		// The triplex power formula applies the azimuthal angle rotation about the y-axis.
		// Constrain this to get some funky effects
		if (radiolaria && z.y > radiolariaFactor) z.y = radiolariaFactor;

		r  = length(z);
		if (r < min_dist) min_dist = r;
		if (r > bailout) break;

		th = atan(z.y, z.x) + phase.x;
		ph = acos(z.z / r) + phase.y;

	}

	// Return the distance estimation value which determines the next raytracing
	// step size, or if whether we are within the threshold of the surface.
	return 0.5 * r * log(r)/r_dz;
}




// Intersect bounding sphere
//
// If we intersect then set the tmin and tmax values to set the start and
// end distances the ray should traverse.
bool intersectBoundingSphere(vec3 origin,
							 vec3 direction,
							 out float tmin,
							 out float tmax)
{
	bool hit = false;
       
       //vec3 pN = vec3(0, 0, 1.0);
       //float  t  = -(dot(origin, pN) + slice) / dot(direction, pN);
       //origin = origin + t * direction;
       
	float b = dot(origin, direction);
	float c = dot(origin, origin) - bounding;
	float disc = b*b - c;			// discriminant
	tmin = tmax = 0.0;

	if (disc > 0.0) {
		// Real root of disc, so intersection
		float sdisc = sqrt(disc);
		float t0 = -b - sdisc;			// closest intersection distance
		float t1 = -b + sdisc;			// furthest intersection distance

		if (t0 >= 0.0) {
			// Ray intersects front of sphere
			float min_dist;
			vec3 z = origin + t0 * direction;
			tmin = DE(z, min_dist);
			tmax = t0 + t1;
		} else if (t0 < 0.0) {
			// Ray starts inside sphere
			float min_dist;
			vec3 z = origin;
			tmin = DE(z, min_dist);
			tmax = t1;
		}
		hit = true;
	}

	return hit;
}


// Calculate the gradient in each dimension from the intersection point
vec3 estimate_normal(vec3 z, float e)
{
	float min_dst;	// Not actually used in this particular case
	vec3 z1 = z + vec3(e, 0, 0);
	vec3 z2 = z - vec3(e, 0, 0);
	vec3 z3 = z + vec3(0, e, 0);
	vec3 z4 = z - vec3(0, e, 0);
	vec3 z5 = z + vec3(0, 0, e);
	vec3 z6 = z - vec3(0, 0, e);

	float dx = DE(z1, min_dst) - DE(z2, min_dst);
	float dy = DE(z3, min_dst) - DE(z4, min_dst);
	float dz = DE(z5, min_dst) - DE(z6, min_dst);

	return normalize(vec3(dx, dy, dz) / (2.0*e));
}


// Computes the direct illumination for point pt with normal N due to
// a point light at light and a viewer at eye.
vec3 Phong(vec3 pt, vec3 N, out float specular)
{
	vec3 diffuse	= vec3(0);			// Diffuse contribution
	vec3 color	= vec3(0);
	specular = 0.0;
	
	vec3 L = normalize(light * objRotation - pt); // find the vector to the light
	float  NdotL = dot(N, L);			// find the cosine of the angle between light and normal

	if (NdotL > 0.0) {
		// Diffuse shading
		diffuse = diffuseColor.rgb + abs(N) * colorSpread;
		diffuse *= lightColor.rgb * NdotL;

		// Phong highlight
		vec3 E = normalize(eye - pt);		// find the vector to the eye
		vec3 R = L - 2.0 * NdotL * N;		// find the reflected vector
		float  RdE = dot(R,E);

		if (RdE <= 0.0) {
			specular = specularity * pow(abs(RdE), specularExponent);
		}
	} else {
		diffuse = diffuseColor.rgb * abs(NdotL) * rimLight;
	}

	return (ambientColor.rgb * ambientColor.a) + diffuse;
}


// Define the ray direction from the pixel coordinates
vec3 rayDirection(vec2 p)
{
	vec3 direction = vec3( 2.0 * aspectRatio * p.x / float(size.x) - aspectRatio,
							  -2.0 * p.y / float(size.y) + 1.0,
							  -2.0 * exp(cameraZoom));
	return normalize(direction * viewRotation * objRotation);
}


// Calculate the output colour for each input pixel
vec4 renderPixel(vec2 pixel)
{
	float tmin, tmax;
	vec3 ray_direction = rayDirection(pixel);
	vec4 pixel_color = backgroundColor;

	if (intersectBoundingSphere(eye, ray_direction, tmin, tmax)) {
		vec3 ray = eye + tmin * ray_direction;

		float dist, ao;
		float min_dist = 4.0;
		float ray_length = tmin;
		float eps = MIN_EPSILON;

		// number of raymarching steps scales inversely with factor
		const int max_steps = int(float(stepLimit) / epsilonScale);
		int i;
		float f;

		for (int i = 0; i < max_steps; ++i) {
			dist = DE(ray, min_dist);

			// March ray forward
			f = epsilonScale * dist;
			ray += f * ray_direction;
			ray_length += f * dist;

			// Are we within the intersection threshold or completely missed the fractal
			if (dist < eps || ray_length > tmax) {
				break;
			}

			// Set the intersection threshold as a function of the ray length away from the camera
			//eps = max(max(MIN_EPSILON, eps_start), pixel_scale * pow(ray_length, epsilonScale));
			eps = max(MIN_EPSILON, pixel_scale * ray_length);
		}


		// Found intersection?
		if (dist < eps) {
      vec3 normal = estimate_normal(ray, eps/2.0);
			ao	= 1.0 - clamp(1.0 - min_dist * min_dist, 0.0, 1.0) * ambientOcclusion;

			if (phong) {
				
				float specular = 0.0;
				pixel_color.rgb = Phong(ray, normal, specular);

				if (shadows > 0.0) {
					// The shadow ray will start at the intersection point and go
					// towards the point light. We initially move the ray origin
					// a little bit along this direction so that we don't mistakenly
					// find an intersection with the same point again.
					vec3 light_direction = normalize((light - ray) * objRotation);
					ray += normal * eps * 2.0;

					float min_dist2;
					dist = 4.0;

					for (int j = 0; j < max_steps; ++j) {
						dist = DE(ray, min_dist2);

						// March ray forward
						f = epsilonScale * dist;
						ray += f * light_direction;

						// Are we within the intersection threshold or completely missed the fractal
						if (dist < eps || dot(ray, ray) > bounding * bounding) break;
          }

          // Again, if our estimate of the distance to the set is small, we say
          // that there was a hit and so the source point must be in shadow.
          if (dist < eps) {
            pixel_color.rgb *= 1.0 - shadows;
          } else {
            // Only add specular component when there is no shadow
            pixel_color.rgb += specular;
          }
				}
        else {
					pixel_color.rgb += specular;
				}
      }
      else {
				// Just use the base colour
				pixel_color.rgb = diffuseColor.rgb;
			}
      if(uNoise){
        float noise ;
        if(uMarble)
          noise = marble(ray, uLacunarity, uGain, 1.0, uOctaves);
        else
          noise = ridgedmf(ray, uLacunarity, uGain, 1.0, uOctaves); 
        pixel_color.rgb *= vec3(noise, noise, noise);
      }
			if(normalLighting){   //using no lighting
				pixel_color.rgb = normal;
			}
			ao *= 1.0 - (float(i) / float(max_steps)) * ambientOcclusionEmphasis * 2.0;
			pixel_color.rgb *= ao;
			pixel_color.a = 1.0;
		}
	}

	return pixel_color;
}


// The main loop
void main()
{
	vec4 c = vec4(0, 0, 0, 1.0);
	vec2 p = vec2(Position) * size;
	if(uJustDE){
    float min_dist = 4.0; //unused
    float dist = DE(camera, min_dist);
    float gVal = dist*255.0;
    float bVal = gVal*255.0;
    
    dist = clamp(dist, 0.0, 1.0);
    gVal = clamp(gVal, 0.0, 1.0);
    bVal = clamp(bVal, 0.0, 1.0);
    c = vec4(dist, gVal, bVal, 1.0);
  }
  
  else{
    if (antialiasing > 1) {
      // Average detailSuperSample^2 points per pixel
      float i = 0.0;
      float j;
      for (int iindex = 0; iindex<4; iindex++){
        if(i>=1.0){break;}
        j=0.0;
        for (int jindex = 0; jindex<4; jindex++){
          if(j>=1.0){break;}
          c += sampleContribution * renderPixel(p + vec2(i, j));
          j += sampleStep;
        }
        i += sampleStep;
      }
    } else {
      c = renderPixel(p);
    }
	}
	if (c.a <= 0.0) discard;
	
	// Return the final color which is still the background color if we didn't hit anything.
	gl_FragColor = c;
}
