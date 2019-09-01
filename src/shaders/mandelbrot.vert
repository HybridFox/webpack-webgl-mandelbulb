attribute vec3 aVertexPosition;
attribute vec4 aVertexColor;

uniform bool uJustDE;
varying vec3 Position;

void main() 
{
  if(uJustDE){
    gl_Position =  vec4(-1.0 + 0.01 * aVertexPosition.x, -1.0 + 0.01* aVertexPosition.y, -0.1, 1.0);//vec4(aVertexPosition / 500.0-vec3(0.9,0.9,0.0), 1.0);// vec4(.5, .5, 0.0, 1.0);
 
    }
  else{
    gl_Position = vec4(aVertexPosition, 1.0);
   
  }
	Position = vec3((aVertexPosition.x + 1.0) / 2.0, (aVertexPosition.y + 1.0) / 2.0, 0.0);//
}