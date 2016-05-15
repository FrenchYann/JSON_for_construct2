// ECMAScript 5 strict mode
"use strict";

// gl-matrix 1.0.1 - https://github.com/toji/gl-matrix/blob/master/LICENSE.md
var MatrixArray=typeof Float32Array!=="undefined"?Float32Array:Array,glMatrixArrayType=MatrixArray,vec3={},mat3={},mat4={},quat4={};vec3.create=function(a){var b=new MatrixArray(3);a&&(b[0]=a[0],b[1]=a[1],b[2]=a[2]);return b};vec3.set=function(a,b){b[0]=a[0];b[1]=a[1];b[2]=a[2];return b};vec3.add=function(a,b,c){if(!c||a===c)return a[0]+=b[0],a[1]+=b[1],a[2]+=b[2],a;c[0]=a[0]+b[0];c[1]=a[1]+b[1];c[2]=a[2]+b[2];return c};
vec3.subtract=function(a,b,c){if(!c||a===c)return a[0]-=b[0],a[1]-=b[1],a[2]-=b[2],a;c[0]=a[0]-b[0];c[1]=a[1]-b[1];c[2]=a[2]-b[2];return c};vec3.negate=function(a,b){b||(b=a);b[0]=-a[0];b[1]=-a[1];b[2]=-a[2];return b};vec3.scale=function(a,b,c){if(!c||a===c)return a[0]*=b,a[1]*=b,a[2]*=b,a;c[0]=a[0]*b;c[1]=a[1]*b;c[2]=a[2]*b;return c};
vec3.normalize=function(a,b){b||(b=a);var c=a[0],d=a[1],e=a[2],g=Math.sqrt(c*c+d*d+e*e);if(g){if(g===1)return b[0]=c,b[1]=d,b[2]=e,b}else return b[0]=0,b[1]=0,b[2]=0,b;g=1/g;b[0]=c*g;b[1]=d*g;b[2]=e*g;return b};vec3.cross=function(a,b,c){c||(c=a);var d=a[0],e=a[1],a=a[2],g=b[0],f=b[1],b=b[2];c[0]=e*b-a*f;c[1]=a*g-d*b;c[2]=d*f-e*g;return c};vec3.length=function(a){var b=a[0],c=a[1],a=a[2];return Math.sqrt(b*b+c*c+a*a)};vec3.dot=function(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]};
vec3.direction=function(a,b,c){c||(c=a);var d=a[0]-b[0],e=a[1]-b[1],a=a[2]-b[2],b=Math.sqrt(d*d+e*e+a*a);if(!b)return c[0]=0,c[1]=0,c[2]=0,c;b=1/b;c[0]=d*b;c[1]=e*b;c[2]=a*b;return c};vec3.lerp=function(a,b,c,d){d||(d=a);d[0]=a[0]+c*(b[0]-a[0]);d[1]=a[1]+c*(b[1]-a[1]);d[2]=a[2]+c*(b[2]-a[2]);return d};vec3.str=function(a){return"["+a[0]+", "+a[1]+", "+a[2]+"]"};
mat3.create=function(a){var b=new MatrixArray(9);a&&(b[0]=a[0],b[1]=a[1],b[2]=a[2],b[3]=a[3],b[4]=a[4],b[5]=a[5],b[6]=a[6],b[7]=a[7],b[8]=a[8]);return b};mat3.set=function(a,b){b[0]=a[0];b[1]=a[1];b[2]=a[2];b[3]=a[3];b[4]=a[4];b[5]=a[5];b[6]=a[6];b[7]=a[7];b[8]=a[8];return b};mat3.identity=function(a){a[0]=1;a[1]=0;a[2]=0;a[3]=0;a[4]=1;a[5]=0;a[6]=0;a[7]=0;a[8]=1;return a};
mat3.transpose=function(a,b){if(!b||a===b){var c=a[1],d=a[2],e=a[5];a[1]=a[3];a[2]=a[6];a[3]=c;a[5]=a[7];a[6]=d;a[7]=e;return a}b[0]=a[0];b[1]=a[3];b[2]=a[6];b[3]=a[1];b[4]=a[4];b[5]=a[7];b[6]=a[2];b[7]=a[5];b[8]=a[8];return b};mat3.toMat4=function(a,b){b||(b=mat4.create());b[15]=1;b[14]=0;b[13]=0;b[12]=0;b[11]=0;b[10]=a[8];b[9]=a[7];b[8]=a[6];b[7]=0;b[6]=a[5];b[5]=a[4];b[4]=a[3];b[3]=0;b[2]=a[2];b[1]=a[1];b[0]=a[0];return b};
mat3.str=function(a){return"["+a[0]+", "+a[1]+", "+a[2]+", "+a[3]+", "+a[4]+", "+a[5]+", "+a[6]+", "+a[7]+", "+a[8]+"]"};mat4.create=function(a){var b=new MatrixArray(16);a&&(b[0]=a[0],b[1]=a[1],b[2]=a[2],b[3]=a[3],b[4]=a[4],b[5]=a[5],b[6]=a[6],b[7]=a[7],b[8]=a[8],b[9]=a[9],b[10]=a[10],b[11]=a[11],b[12]=a[12],b[13]=a[13],b[14]=a[14],b[15]=a[15]);return b};
mat4.set=function(a,b){b[0]=a[0];b[1]=a[1];b[2]=a[2];b[3]=a[3];b[4]=a[4];b[5]=a[5];b[6]=a[6];b[7]=a[7];b[8]=a[8];b[9]=a[9];b[10]=a[10];b[11]=a[11];b[12]=a[12];b[13]=a[13];b[14]=a[14];b[15]=a[15];return b};mat4.identity=function(a){a[0]=1;a[1]=0;a[2]=0;a[3]=0;a[4]=0;a[5]=1;a[6]=0;a[7]=0;a[8]=0;a[9]=0;a[10]=1;a[11]=0;a[12]=0;a[13]=0;a[14]=0;a[15]=1;return a};
mat4.transpose=function(a,b){if(!b||a===b){var c=a[1],d=a[2],e=a[3],g=a[6],f=a[7],h=a[11];a[1]=a[4];a[2]=a[8];a[3]=a[12];a[4]=c;a[6]=a[9];a[7]=a[13];a[8]=d;a[9]=g;a[11]=a[14];a[12]=e;a[13]=f;a[14]=h;return a}b[0]=a[0];b[1]=a[4];b[2]=a[8];b[3]=a[12];b[4]=a[1];b[5]=a[5];b[6]=a[9];b[7]=a[13];b[8]=a[2];b[9]=a[6];b[10]=a[10];b[11]=a[14];b[12]=a[3];b[13]=a[7];b[14]=a[11];b[15]=a[15];return b};
mat4.determinant=function(a){var b=a[0],c=a[1],d=a[2],e=a[3],g=a[4],f=a[5],h=a[6],i=a[7],j=a[8],k=a[9],l=a[10],n=a[11],o=a[12],m=a[13],p=a[14],a=a[15];return o*k*h*e-j*m*h*e-o*f*l*e+g*m*l*e+j*f*p*e-g*k*p*e-o*k*d*i+j*m*d*i+o*c*l*i-b*m*l*i-j*c*p*i+b*k*p*i+o*f*d*n-g*m*d*n-o*c*h*n+b*m*h*n+g*c*p*n-b*f*p*n-j*f*d*a+g*k*d*a+j*c*h*a-b*k*h*a-g*c*l*a+b*f*l*a};
mat4.inverse=function(a,b){b||(b=a);var c=a[0],d=a[1],e=a[2],g=a[3],f=a[4],h=a[5],i=a[6],j=a[7],k=a[8],l=a[9],n=a[10],o=a[11],m=a[12],p=a[13],r=a[14],s=a[15],A=c*h-d*f,B=c*i-e*f,t=c*j-g*f,u=d*i-e*h,v=d*j-g*h,w=e*j-g*i,x=k*p-l*m,y=k*r-n*m,z=k*s-o*m,C=l*r-n*p,D=l*s-o*p,E=n*s-o*r,q=1/(A*E-B*D+t*C+u*z-v*y+w*x);b[0]=(h*E-i*D+j*C)*q;b[1]=(-d*E+e*D-g*C)*q;b[2]=(p*w-r*v+s*u)*q;b[3]=(-l*w+n*v-o*u)*q;b[4]=(-f*E+i*z-j*y)*q;b[5]=(c*E-e*z+g*y)*q;b[6]=(-m*w+r*t-s*B)*q;b[7]=(k*w-n*t+o*B)*q;b[8]=(f*D-h*z+j*x)*q;
b[9]=(-c*D+d*z-g*x)*q;b[10]=(m*v-p*t+s*A)*q;b[11]=(-k*v+l*t-o*A)*q;b[12]=(-f*C+h*y-i*x)*q;b[13]=(c*C-d*y+e*x)*q;b[14]=(-m*u+p*B-r*A)*q;b[15]=(k*u-l*B+n*A)*q;return b};mat4.toRotationMat=function(a,b){b||(b=mat4.create());b[0]=a[0];b[1]=a[1];b[2]=a[2];b[3]=a[3];b[4]=a[4];b[5]=a[5];b[6]=a[6];b[7]=a[7];b[8]=a[8];b[9]=a[9];b[10]=a[10];b[11]=a[11];b[12]=0;b[13]=0;b[14]=0;b[15]=1;return b};
mat4.toMat3=function(a,b){b||(b=mat3.create());b[0]=a[0];b[1]=a[1];b[2]=a[2];b[3]=a[4];b[4]=a[5];b[5]=a[6];b[6]=a[8];b[7]=a[9];b[8]=a[10];return b};mat4.toInverseMat3=function(a,b){var c=a[0],d=a[1],e=a[2],g=a[4],f=a[5],h=a[6],i=a[8],j=a[9],k=a[10],l=k*f-h*j,n=-k*g+h*i,o=j*g-f*i,m=c*l+d*n+e*o;if(!m)return null;m=1/m;b||(b=mat3.create());b[0]=l*m;b[1]=(-k*d+e*j)*m;b[2]=(h*d-e*f)*m;b[3]=n*m;b[4]=(k*c-e*i)*m;b[5]=(-h*c+e*g)*m;b[6]=o*m;b[7]=(-j*c+d*i)*m;b[8]=(f*c-d*g)*m;return b};
mat4.multiply=function(a,b,c){c||(c=a);var d=a[0],e=a[1],g=a[2],f=a[3],h=a[4],i=a[5],j=a[6],k=a[7],l=a[8],n=a[9],o=a[10],m=a[11],p=a[12],r=a[13],s=a[14],a=a[15],A=b[0],B=b[1],t=b[2],u=b[3],v=b[4],w=b[5],x=b[6],y=b[7],z=b[8],C=b[9],D=b[10],E=b[11],q=b[12],F=b[13],G=b[14],b=b[15];c[0]=A*d+B*h+t*l+u*p;c[1]=A*e+B*i+t*n+u*r;c[2]=A*g+B*j+t*o+u*s;c[3]=A*f+B*k+t*m+u*a;c[4]=v*d+w*h+x*l+y*p;c[5]=v*e+w*i+x*n+y*r;c[6]=v*g+w*j+x*o+y*s;c[7]=v*f+w*k+x*m+y*a;c[8]=z*d+C*h+D*l+E*p;c[9]=z*e+C*i+D*n+E*r;c[10]=z*g+C*
j+D*o+E*s;c[11]=z*f+C*k+D*m+E*a;c[12]=q*d+F*h+G*l+b*p;c[13]=q*e+F*i+G*n+b*r;c[14]=q*g+F*j+G*o+b*s;c[15]=q*f+F*k+G*m+b*a;return c};mat4.multiplyVec3=function(a,b,c){c||(c=b);var d=b[0],e=b[1],b=b[2];c[0]=a[0]*d+a[4]*e+a[8]*b+a[12];c[1]=a[1]*d+a[5]*e+a[9]*b+a[13];c[2]=a[2]*d+a[6]*e+a[10]*b+a[14];return c};
mat4.multiplyVec4=function(a,b,c){c||(c=b);var d=b[0],e=b[1],g=b[2],b=b[3];c[0]=a[0]*d+a[4]*e+a[8]*g+a[12]*b;c[1]=a[1]*d+a[5]*e+a[9]*g+a[13]*b;c[2]=a[2]*d+a[6]*e+a[10]*g+a[14]*b;c[3]=a[3]*d+a[7]*e+a[11]*g+a[15]*b;return c};
mat4.translate=function(a,b,c){var d=b[0],e=b[1],b=b[2],g,f,h,i,j,k,l,n,o,m,p,r;if(!c||a===c)return a[12]=a[0]*d+a[4]*e+a[8]*b+a[12],a[13]=a[1]*d+a[5]*e+a[9]*b+a[13],a[14]=a[2]*d+a[6]*e+a[10]*b+a[14],a[15]=a[3]*d+a[7]*e+a[11]*b+a[15],a;g=a[0];f=a[1];h=a[2];i=a[3];j=a[4];k=a[5];l=a[6];n=a[7];o=a[8];m=a[9];p=a[10];r=a[11];c[0]=g;c[1]=f;c[2]=h;c[3]=i;c[4]=j;c[5]=k;c[6]=l;c[7]=n;c[8]=o;c[9]=m;c[10]=p;c[11]=r;c[12]=g*d+j*e+o*b+a[12];c[13]=f*d+k*e+m*b+a[13];c[14]=h*d+l*e+p*b+a[14];c[15]=i*d+n*e+r*b+a[15];
return c};mat4.scale=function(a,b,c){var d=b[0],e=b[1],b=b[2];if(!c||a===c)return a[0]*=d,a[1]*=d,a[2]*=d,a[3]*=d,a[4]*=e,a[5]*=e,a[6]*=e,a[7]*=e,a[8]*=b,a[9]*=b,a[10]*=b,a[11]*=b,a;c[0]=a[0]*d;c[1]=a[1]*d;c[2]=a[2]*d;c[3]=a[3]*d;c[4]=a[4]*e;c[5]=a[5]*e;c[6]=a[6]*e;c[7]=a[7]*e;c[8]=a[8]*b;c[9]=a[9]*b;c[10]=a[10]*b;c[11]=a[11]*b;c[12]=a[12];c[13]=a[13];c[14]=a[14];c[15]=a[15];return c};
mat4.rotate=function(a,b,c,d){var e=c[0],g=c[1],c=c[2],f=Math.sqrt(e*e+g*g+c*c),h,i,j,k,l,n,o,m,p,r,s,A,B,t,u,v,w,x,y,z;if(!f)return null;f!==1&&(f=1/f,e*=f,g*=f,c*=f);h=Math.sin(b);i=Math.cos(b);j=1-i;b=a[0];f=a[1];k=a[2];l=a[3];n=a[4];o=a[5];m=a[6];p=a[7];r=a[8];s=a[9];A=a[10];B=a[11];t=e*e*j+i;u=g*e*j+c*h;v=c*e*j-g*h;w=e*g*j-c*h;x=g*g*j+i;y=c*g*j+e*h;z=e*c*j+g*h;e=g*c*j-e*h;g=c*c*j+i;d?a!==d&&(d[12]=a[12],d[13]=a[13],d[14]=a[14],d[15]=a[15]):d=a;d[0]=b*t+n*u+r*v;d[1]=f*t+o*u+s*v;d[2]=k*t+m*u+A*
v;d[3]=l*t+p*u+B*v;d[4]=b*w+n*x+r*y;d[5]=f*w+o*x+s*y;d[6]=k*w+m*x+A*y;d[7]=l*w+p*x+B*y;d[8]=b*z+n*e+r*g;d[9]=f*z+o*e+s*g;d[10]=k*z+m*e+A*g;d[11]=l*z+p*e+B*g;return d};mat4.rotateX=function(a,b,c){var d=Math.sin(b),b=Math.cos(b),e=a[4],g=a[5],f=a[6],h=a[7],i=a[8],j=a[9],k=a[10],l=a[11];c?a!==c&&(c[0]=a[0],c[1]=a[1],c[2]=a[2],c[3]=a[3],c[12]=a[12],c[13]=a[13],c[14]=a[14],c[15]=a[15]):c=a;c[4]=e*b+i*d;c[5]=g*b+j*d;c[6]=f*b+k*d;c[7]=h*b+l*d;c[8]=e*-d+i*b;c[9]=g*-d+j*b;c[10]=f*-d+k*b;c[11]=h*-d+l*b;return c};
mat4.rotateY=function(a,b,c){var d=Math.sin(b),b=Math.cos(b),e=a[0],g=a[1],f=a[2],h=a[3],i=a[8],j=a[9],k=a[10],l=a[11];c?a!==c&&(c[4]=a[4],c[5]=a[5],c[6]=a[6],c[7]=a[7],c[12]=a[12],c[13]=a[13],c[14]=a[14],c[15]=a[15]):c=a;c[0]=e*b+i*-d;c[1]=g*b+j*-d;c[2]=f*b+k*-d;c[3]=h*b+l*-d;c[8]=e*d+i*b;c[9]=g*d+j*b;c[10]=f*d+k*b;c[11]=h*d+l*b;return c};
mat4.rotateZ=function(a,b,c){var d=Math.sin(b),b=Math.cos(b),e=a[0],g=a[1],f=a[2],h=a[3],i=a[4],j=a[5],k=a[6],l=a[7];c?a!==c&&(c[8]=a[8],c[9]=a[9],c[10]=a[10],c[11]=a[11],c[12]=a[12],c[13]=a[13],c[14]=a[14],c[15]=a[15]):c=a;c[0]=e*b+i*d;c[1]=g*b+j*d;c[2]=f*b+k*d;c[3]=h*b+l*d;c[4]=e*-d+i*b;c[5]=g*-d+j*b;c[6]=f*-d+k*b;c[7]=h*-d+l*b;return c};
mat4.frustum=function(a,b,c,d,e,g,f){f||(f=mat4.create());var h=b-a,i=d-c,j=g-e;f[0]=e*2/h;f[1]=0;f[2]=0;f[3]=0;f[4]=0;f[5]=e*2/i;f[6]=0;f[7]=0;f[8]=(b+a)/h;f[9]=(d+c)/i;f[10]=-(g+e)/j;f[11]=-1;f[12]=0;f[13]=0;f[14]=-(g*e*2)/j;f[15]=0;return f};mat4.perspective=function(a,b,c,d,e){a=c*Math.tan(a*Math.PI/360);b*=a;return mat4.frustum(-b,b,-a,a,c,d,e)};
mat4.ortho=function(a,b,c,d,e,g,f){f||(f=mat4.create());var h=b-a,i=d-c,j=g-e;f[0]=2/h;f[1]=0;f[2]=0;f[3]=0;f[4]=0;f[5]=2/i;f[6]=0;f[7]=0;f[8]=0;f[9]=0;f[10]=-2/j;f[11]=0;f[12]=-(a+b)/h;f[13]=-(d+c)/i;f[14]=-(g+e)/j;f[15]=1;return f};
mat4.lookAt=function(a,b,c,d){d||(d=mat4.create());var e,g,f,h,i,j,k,l,n=a[0],o=a[1],a=a[2];g=c[0];f=c[1];e=c[2];c=b[1];j=b[2];if(n===b[0]&&o===c&&a===j)return mat4.identity(d);c=n-b[0];j=o-b[1];k=a-b[2];l=1/Math.sqrt(c*c+j*j+k*k);c*=l;j*=l;k*=l;b=f*k-e*j;e=e*c-g*k;g=g*j-f*c;(l=Math.sqrt(b*b+e*e+g*g))?(l=1/l,b*=l,e*=l,g*=l):g=e=b=0;f=j*g-k*e;h=k*b-c*g;i=c*e-j*b;(l=Math.sqrt(f*f+h*h+i*i))?(l=1/l,f*=l,h*=l,i*=l):i=h=f=0;d[0]=b;d[1]=f;d[2]=c;d[3]=0;d[4]=e;d[5]=h;d[6]=j;d[7]=0;d[8]=g;d[9]=i;d[10]=k;d[11]=
0;d[12]=-(b*n+e*o+g*a);d[13]=-(f*n+h*o+i*a);d[14]=-(c*n+j*o+k*a);d[15]=1;return d};mat4.fromRotationTranslation=function(a,b,c){c||(c=mat4.create());var d=a[0],e=a[1],g=a[2],f=a[3],h=d+d,i=e+e,j=g+g,a=d*h,k=d*i;d*=j;var l=e*i;e*=j;g*=j;h*=f;i*=f;f*=j;c[0]=1-(l+g);c[1]=k+f;c[2]=d-i;c[3]=0;c[4]=k-f;c[5]=1-(a+g);c[6]=e+h;c[7]=0;c[8]=d+i;c[9]=e-h;c[10]=1-(a+l);c[11]=0;c[12]=b[0];c[13]=b[1];c[14]=b[2];c[15]=1;return c};
mat4.str=function(a){return"["+a[0]+", "+a[1]+", "+a[2]+", "+a[3]+", "+a[4]+", "+a[5]+", "+a[6]+", "+a[7]+", "+a[8]+", "+a[9]+", "+a[10]+", "+a[11]+", "+a[12]+", "+a[13]+", "+a[14]+", "+a[15]+"]"};quat4.create=function(a){var b=new MatrixArray(4);a&&(b[0]=a[0],b[1]=a[1],b[2]=a[2],b[3]=a[3]);return b};quat4.set=function(a,b){b[0]=a[0];b[1]=a[1];b[2]=a[2];b[3]=a[3];return b};
quat4.calculateW=function(a,b){var c=a[0],d=a[1],e=a[2];if(!b||a===b)return a[3]=-Math.sqrt(Math.abs(1-c*c-d*d-e*e)),a;b[0]=c;b[1]=d;b[2]=e;b[3]=-Math.sqrt(Math.abs(1-c*c-d*d-e*e));return b};quat4.inverse=function(a,b){if(!b||a===b)return a[0]*=-1,a[1]*=-1,a[2]*=-1,a;b[0]=-a[0];b[1]=-a[1];b[2]=-a[2];b[3]=a[3];return b};quat4.length=function(a){var b=a[0],c=a[1],d=a[2],a=a[3];return Math.sqrt(b*b+c*c+d*d+a*a)};
quat4.normalize=function(a,b){b||(b=a);var c=a[0],d=a[1],e=a[2],g=a[3],f=Math.sqrt(c*c+d*d+e*e+g*g);if(f===0)return b[0]=0,b[1]=0,b[2]=0,b[3]=0,b;f=1/f;b[0]=c*f;b[1]=d*f;b[2]=e*f;b[3]=g*f;return b};quat4.multiply=function(a,b,c){c||(c=a);var d=a[0],e=a[1],g=a[2],a=a[3],f=b[0],h=b[1],i=b[2],b=b[3];c[0]=d*b+a*f+e*i-g*h;c[1]=e*b+a*h+g*f-d*i;c[2]=g*b+a*i+d*h-e*f;c[3]=a*b-d*f-e*h-g*i;return c};
quat4.multiplyVec3=function(a,b,c){c||(c=b);var d=b[0],e=b[1],g=b[2],b=a[0],f=a[1],h=a[2],a=a[3],i=a*d+f*g-h*e,j=a*e+h*d-b*g,k=a*g+b*e-f*d,d=-b*d-f*e-h*g;c[0]=i*a+d*-b+j*-h-k*-f;c[1]=j*a+d*-f+k*-b-i*-h;c[2]=k*a+d*-h+i*-f-j*-b;return c};quat4.toMat3=function(a,b){b||(b=mat3.create());var c=a[0],d=a[1],e=a[2],g=a[3],f=c+c,h=d+d,i=e+e,j=c*f,k=c*h;c*=i;var l=d*h;d*=i;e*=i;f*=g;h*=g;g*=i;b[0]=1-(l+e);b[1]=k+g;b[2]=c-h;b[3]=k-g;b[4]=1-(j+e);b[5]=d+f;b[6]=c+h;b[7]=d-f;b[8]=1-(j+l);return b};
quat4.toMat4=function(a,b){b||(b=mat4.create());var c=a[0],d=a[1],e=a[2],g=a[3],f=c+c,h=d+d,i=e+e,j=c*f,k=c*h;c*=i;var l=d*h;d*=i;e*=i;f*=g;h*=g;g*=i;b[0]=1-(l+e);b[1]=k+g;b[2]=c-h;b[3]=0;b[4]=k-g;b[5]=1-(j+e);b[6]=d+f;b[7]=0;b[8]=c+h;b[9]=d-f;b[10]=1-(j+l);b[11]=0;b[12]=0;b[13]=0;b[14]=0;b[15]=1;return b};
quat4.slerp=function(a,b,c,d){d||(d=a);var e=a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3],g,f;if(Math.abs(e)>=1)return d!==a&&(d[0]=a[0],d[1]=a[1],d[2]=a[2],d[3]=a[3]),d;g=Math.acos(e);f=Math.sqrt(1-e*e);if(Math.abs(f)<0.001)return d[0]=a[0]*0.5+b[0]*0.5,d[1]=a[1]*0.5+b[1]*0.5,d[2]=a[2]*0.5+b[2]*0.5,d[3]=a[3]*0.5+b[3]*0.5,d;e=Math.sin((1-c)*g)/f;c=Math.sin(c*g)/f;d[0]=a[0]*e+b[0]*c;d[1]=a[1]*e+b[1]*c;d[2]=a[2]*e+b[2]*c;d[3]=a[3]*e+b[3]*c;return d};
quat4.str=function(a){return"["+a[0]+", "+a[1]+", "+a[2]+", "+a[3]+"]"};

(function()
{
	var MAX_VERTICES = 8000;						// equates to 2500 objects being drawn
	var MAX_INDICES = (MAX_VERTICES / 2) * 3;		// 6 indices for every 4 vertices
	var MAX_POINTS = 8000;
	
	var MULTI_BUFFERS = 4;							// cycle 4 buffers to try and avoid blocking
	
	var BATCH_NULL = 0;
	var BATCH_QUAD = 1;
	var BATCH_SETTEXTURE = 2;
	var BATCH_SETOPACITY = 3;
	var BATCH_SETBLEND = 4;
	var BATCH_UPDATEMODELVIEW = 5;
	var BATCH_RENDERTOTEXTURE = 6;
	var BATCH_CLEAR = 7;
	var BATCH_POINTS = 8;
	var BATCH_SETPROGRAM = 9;
	var BATCH_SETPROGRAMPARAMETERS = 10;
	var BATCH_SETTEXTURE1 = 11;
	var BATCH_SETCOLOR = 12;
	var BATCH_SETDEPTHTEST = 13;
	var BATCH_SETEARLYZMODE = 14;
	
	// for testing lost contexts
	/*
	var lose_ext = null;
	
	window.lose_context = function ()
	{
		if (!lose_ext)
		{
			console.log("WEBGL_lose_context not supported");
			return;
		}
		
		lose_ext.loseContext();
	};
	
	window.restore_context = function ()
	{
		if (!lose_ext)
		{
			console.log("WEBGL_lose_context not supported");
			return;
		}
		
		lose_ext.restoreContext();
	};
	*/
	
	var tempMat4 = mat4.create();
	
	function GLWrap_(gl, isMobile, enableFrontToBack)
	{
		// Work around crappiness in IE's WebGL implementation
		this.isIE = /msie/i.test(navigator.userAgent) || /trident/i.test(navigator.userAgent);
		
		this.width = 0;		// not yet known, wait for call to setSize()
		this.height = 0;
		
		this.enableFrontToBack = !!enableFrontToBack;
		this.isEarlyZPass = false;
		this.isBatchInEarlyZPass = false;
		this.currentZ = 0;
		this.zNear = 1;
		this.zFar = 1000;
		this.zIncrement = ((this.zFar - this.zNear) / 32768);
		
		// For calculating incrementing Z positions
		this.zA = this.zFar / (this.zFar - this.zNear);
		this.zB = this.zFar * this.zNear / (this.zNear - this.zFar);
		this.kzA = 65536 * this.zA;
		this.kzB = 65536 * this.zB;

		this.cam = vec3.create([0, 0, 100]);			// camera position
		this.look = vec3.create([0, 0, 0]);				// lookat position
		this.up = vec3.create([0, 1, 0]);				// up vector
		this.worldScale = vec3.create([1, 1, 1]);		// world scaling factor
		
		this.enable_mipmaps = true;
		
		this.matP = mat4.create();						// perspective matrix
		this.matMV = mat4.create();						// model view matrix
		this.lastMV = mat4.create();
		this.currentMV = mat4.create();
		
		this.gl = gl;
		
		this.initState();
		
		// for testing lost contexts
		//lose_ext = this.gl.getExtension("WEBGL_lose_context");
	};
	
	GLWrap_.prototype.initState = function ()
	{
		var gl = this.gl;
		var i, len;
		
		// For filtering redundant setXXX() calls
		this.lastOpacity = 1;
		this.lastTexture0 = null;			// last bound to TEXTURE0
		this.lastTexture1 = null;			// last bound to TEXTURE1
		
		this.currentOpacity = 1;
		
		// One-time creation initialisation
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		gl.disable(gl.CULL_FACE);
		gl.disable(gl.STENCIL_TEST);
		gl.disable(gl.DITHER);
		
		if (this.enableFrontToBack)
		{
			gl.enable(gl.DEPTH_TEST);
			gl.depthFunc(gl.LEQUAL);
		}
		else
		{
			gl.disable(gl.DEPTH_TEST);
		}
		
		this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
		
		this.lastSrcBlend = gl.ONE;
		this.lastDestBlend = gl.ONE_MINUS_SRC_ALPHA;
		
		// Typed arrays for buffer data
		this.vertexData = new Float32Array(MAX_VERTICES * (this.enableFrontToBack ? 3 : 2));
		this.texcoordData = new Float32Array(MAX_VERTICES * 2);
		this.pointData = new Float32Array(MAX_POINTS * 4);
		
		// Create buffers
		this.pointBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.pointBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, this.pointData.byteLength, gl.DYNAMIC_DRAW);
		
		this.vertexBuffers = new Array(MULTI_BUFFERS);
		this.texcoordBuffers = new Array(MULTI_BUFFERS);
		
		for (i = 0; i < MULTI_BUFFERS; i++)
		{
			this.vertexBuffers[i] = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffers[i]);
			gl.bufferData(gl.ARRAY_BUFFER, this.vertexData.byteLength, gl.DYNAMIC_DRAW);
			
			this.texcoordBuffers[i] = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffers[i]);
			gl.bufferData(gl.ARRAY_BUFFER, this.texcoordData.byteLength, gl.DYNAMIC_DRAW);
		}
		
		this.curBuffer = 0;
		
		this.indexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
		
		// Pre-generate the index data since it never changes
		var indexData = new Uint16Array(MAX_INDICES);
		
		i = 0, len = MAX_INDICES;
		var fv = 0;
		
		while (i < len)
		{
			indexData[i++] = fv;		// top left
			indexData[i++] = fv + 1;	// top right
			indexData[i++] = fv + 2;	// bottom right (first tri)
			indexData[i++] = fv;		// top left
			indexData[i++] = fv + 2;	// bottom right
			indexData[i++] = fv + 3;	// bottom left
			fv += 4;
		}
		
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW);
		
		// pointer in to vertex buffer
		this.vertexPtr = 0;
		this.texPtr = 0;
		
		// pointer in to point buffer
		this.pointPtr = 0;
		
		var fsSource, vsSource;
		
		// Array of all shader programs
		this.shaderPrograms = [];
		
		/////////////////////////////////////////////////////
		// CREATE DEFAULT SHADER PROGRAM
		
		// Create shaders
		fsSource = [
			"varying mediump vec2 vTex;",
			"uniform lowp float opacity;",
			"uniform lowp sampler2D samplerFront;",

			"void main(void) {",
			"	gl_FragColor = texture2D(samplerFront, vTex);",
			"	gl_FragColor *= opacity;",
			"}"
		].join("\n");
		
		if (this.enableFrontToBack)
		{
			// note aPos is a vec3, Z values are used
			vsSource = [
				"attribute highp vec3 aPos;",
				"attribute mediump vec2 aTex;",
				"varying mediump vec2 vTex;",
				"uniform highp mat4 matP;",
				"uniform highp mat4 matMV;",

				"void main(void) {",
				"	gl_Position = matP * matMV * vec4(aPos.x, aPos.y, aPos.z, 1.0);",
				"	vTex = aTex;",
				"}"
			].join("\n");
		}
		else
		{
			// note aPos is a vec2, no Z values are used
			vsSource = [
				"attribute highp vec2 aPos;",
				"attribute mediump vec2 aTex;",
				"varying mediump vec2 vTex;",
				"uniform highp mat4 matP;",
				"uniform highp mat4 matMV;",

				"void main(void) {",
				"	gl_Position = matP * matMV * vec4(aPos.x, aPos.y, 0.0, 1.0);",
				"	vTex = aTex;",
				"}"
			].join("\n");
		}
		
		var shaderProg = this.createShaderProgram({src: fsSource}, vsSource, "<default>");
		assert2(shaderProg, "Failed to create default WebGL shader");
		this.shaderPrograms.push(shaderProg);		// Default shader is always shader 0
		
		// Create points shader program
		fsSource = [
			"uniform mediump sampler2D samplerFront;",
			"varying lowp float opacity;",

			"void main(void) {",
			"	gl_FragColor = texture2D(samplerFront, gl_PointCoord);",
			"	gl_FragColor *= opacity;",
			"}"
		].join("\n");
		
		var pointVsSource = [
			"attribute vec4 aPos;",
			"varying float opacity;",
			"uniform mat4 matP;",
			"uniform mat4 matMV;",

			"void main(void) {",
			"	gl_Position = matP * matMV * vec4(aPos.x, aPos.y, 0.0, 1.0);",
			"	gl_PointSize = aPos.z;",
			"	opacity = aPos.w;",
			"}"
		].join("\n");
		
		shaderProg = this.createShaderProgram({src: fsSource}, pointVsSource, "<point>");
		assert2(shaderProg, "Failed to create points WebGL shader");
		this.shaderPrograms.push(shaderProg);		// Point shader is always shader 1
		
		fsSource = [
			"varying mediump vec2 vTex;",
			"uniform lowp sampler2D samplerFront;",

			"void main(void) {",
			"	if (texture2D(samplerFront, vTex).a < 1.0)",
			"		discard;",						// discarding non-opaque fragments
			"}"
		].join("\n");

		var shaderProg = this.createShaderProgram({src: fsSource}, vsSource, "<earlyz>");
		assert2(shaderProg, "Failed to create early-Z WebGL shader");
		this.shaderPrograms.push(shaderProg);		// Early-Z shader is always shader 2
		
		fsSource = [
			"uniform lowp vec4 colorFill;",

			"void main(void) {",
			"	gl_FragColor = colorFill;",
			"}"
		].join("\n");

		var shaderProg = this.createShaderProgram({src: fsSource}, vsSource, "<fill>");
		assert2(shaderProg, "Failed to create fill WebGL shader");
		this.shaderPrograms.push(shaderProg);		// Fill-color shader is always shader 3
		
		// Create all other shaders bundled with the project
		for (var shader_name in cr.shaders)
		{
			if (cr.shaders.hasOwnProperty(shader_name))
				this.shaderPrograms.push(this.createShaderProgram(cr.shaders[shader_name], vsSource, shader_name));
		}
		
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, null);
		
		// The job batch
		this.batch = [];
		this.batchPtr = 0;
		this.hasQuadBatchTop = false;
		this.hasPointBatchTop = false;
		this.lastProgram = -1;				// start -1 so first switchProgram can do work
		this.currentProgram = -1;			// current program during batch execution
		this.currentShader = null;
		
		this.fbo = gl.createFramebuffer();
		this.renderToTex = null;
		
		this.depthBuffer = null;
		this.attachedDepthBuffer = false;	// wait until first size call to attach, otherwise it has no storage
		
		if (this.enableFrontToBack)
		{
			this.depthBuffer = gl.createRenderbuffer();
		}

		this.tmpVec3 = vec3.create([0, 0, 0]);
		
		log("Max texture size: " + this.maxTextureSize);
		var pointsizes = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE);
		this.minPointSize = pointsizes[0];
		this.maxPointSize = pointsizes[1];
		
		// Chrome and Firefox's WebGL implementations (ANGLE) seem to have bugs with very large point sizes
		// on some systems. Cap the max point size at 2048 to work around, forcing the Particles object to
		// fall back to quads for very large particles.
		if (this.maxPointSize > 2048)
			this.maxPointSize = 2048;
		
		log("Point size range: " + this.minPointSize + " to " + this.maxPointSize);
		
		/**BEGIN-PREVIEWONLY**/
		if (window.console && window.console.log)
			window.console.log("WebGL extensions: ", gl.getSupportedExtensions());
		/**END-PREVIEWONLY**/
	
		this.switchProgram(0);
		
		cr.seal(this);
	};
	
	function GLShaderProgram(gl, shaderProgram, name)
	{
		this.gl = gl;
		this.shaderProgram = shaderProgram;
		this.name = name;
		
		// Get shader variable locations
		this.locAPos = gl.getAttribLocation(shaderProgram, "aPos");
		this.locATex = gl.getAttribLocation(shaderProgram, "aTex");
		
		this.locMatP = gl.getUniformLocation(shaderProgram, "matP");
		this.locMatMV = gl.getUniformLocation(shaderProgram, "matMV");
		this.locOpacity = gl.getUniformLocation(shaderProgram, "opacity");
		this.locColorFill = gl.getUniformLocation(shaderProgram, "colorFill");
		this.locSamplerFront = gl.getUniformLocation(shaderProgram, "samplerFront");
		
		// Optional parameters
		this.locSamplerBack = gl.getUniformLocation(shaderProgram, "samplerBack");
		this.locDestStart = gl.getUniformLocation(shaderProgram, "destStart");
		this.locDestEnd = gl.getUniformLocation(shaderProgram, "destEnd");
		this.locSeconds = gl.getUniformLocation(shaderProgram, "seconds");
		this.locPixelWidth = gl.getUniformLocation(shaderProgram, "pixelWidth");
		this.locPixelHeight = gl.getUniformLocation(shaderProgram, "pixelHeight");
		this.locLayerScale = gl.getUniformLocation(shaderProgram, "layerScale");
		this.locLayerAngle = gl.getUniformLocation(shaderProgram, "layerAngle");
		this.locViewOrigin = gl.getUniformLocation(shaderProgram, "viewOrigin");
		this.locScrollPos = gl.getUniformLocation(shaderProgram, "scrollPos");
		
		this.hasAnyOptionalUniforms = !!(this.locPixelWidth || this.locPixelHeight || this.locSeconds || this.locSamplerBack || this.locDestStart || this.locDestEnd || this.locLayerScale || this.locLayerAngle || this.locViewOrigin || this.locScrollPos);
		
		// Store the last set shader parameters in JS, and only assign them when they change,
		// since these GL calls are expensive.
		this.lpPixelWidth = -999;		// set to something unlikely so never counts as cached on first set
		this.lpPixelHeight = -999;
		this.lpOpacity = 1;
		this.lpDestStartX = 0.0;
		this.lpDestStartY = 0.0;
		this.lpDestEndX = 1.0;
		this.lpDestEndY = 1.0;
		this.lpLayerScale = 1.0;
		this.lpLayerAngle = 0.0;
		this.lpViewOriginX = 0.0;
		this.lpViewOriginY = 0.0;
		this.lpScrollPosX = 0.0;
		this.lpScrollPosY = 0.0;
		this.lpSeconds = 0.0;
		this.lastCustomParams = [];
		this.lpMatMV = mat4.create();
		
		// Assign defaults
		if (this.locOpacity)
			gl.uniform1f(this.locOpacity, 1);
		
		if (this.locColorFill)
			gl.uniform4f(this.locColorFill, 1.0, 1.0, 1.0, 1.0);

		if (this.locSamplerFront)
			gl.uniform1i(this.locSamplerFront, 0);
			
		if (this.locSamplerBack)
			gl.uniform1i(this.locSamplerBack, 1);
			
		if (this.locDestStart)
			gl.uniform2f(this.locDestStart, 0.0, 0.0);
			
		if (this.locDestEnd)
			gl.uniform2f(this.locDestEnd, 1.0, 1.0);
			
		if (this.locLayerScale)
			gl.uniform1f(this.locLayerScale, 1.0);
		
		if (this.locLayerAngle)
			gl.uniform1f(this.locLayerAngle, 0.0);
		
		if (this.locViewOrigin)
			gl.uniform2f(this.locViewOrigin, 0.0, 0.0);
		
		if (this.locScrollPos)
			gl.uniform2f(this.locScrollPos, 0.0, 0.0);
		
		if (this.locSeconds)
			gl.uniform1f(this.locSeconds, 0.0);
		
		this.hasCurrentMatMV = false;		// matMV needs updating
	};
	
	function areMat4sEqual(a, b)
	{
		return a[0]===b[0]&&a[1]===b[1]&&a[2]===b[2]&&a[3]===b[3]&&
			   a[4]===b[4]&&a[5]===b[5]&&a[6]===b[6]&&a[7]===b[7]&&
			   a[8]===b[8]&&a[9]===b[9]&&a[10]===b[10]&&a[11]===b[11]&&
			   a[12]===b[12]&&a[13]===b[13]&&a[14]===b[14]&&a[15]===b[15];
	};
	
	GLShaderProgram.prototype.updateMatMV = function (mv)
	{
		if (areMat4sEqual(this.lpMatMV, mv))
			return;		// no change, save the expensive GL call
		
		mat4.set(mv, this.lpMatMV);
		this.gl.uniformMatrix4fv(this.locMatMV, false, mv);
	};
	
	GLWrap_.prototype.createShaderProgram = function(shaderEntry, vsSource, name)
	{
		var gl = this.gl;
		
		// Create fragment shader
		var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fragmentShader, shaderEntry.src);
		gl.compileShader(fragmentShader);
		
		if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS))
		{
			// Failed to compile fragment shader
			assert2(false, "Error compiling fragment shader: " + gl.getShaderInfoLog(fragmentShader));
			gl.deleteShader(fragmentShader);
			return null;
		}
		
		// Create vertex shader
		// TODO: share vertex shaders where possible?
		var vertexShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vertexShader, vsSource);
		gl.compileShader(vertexShader);
		
		if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS))
		{
			// Failed to compile vertex shader
			assert2(false, "Error compiling vertex shader: " + gl.getShaderInfoLog(vertexShader));
			gl.deleteShader(fragmentShader);
			gl.deleteShader(vertexShader);
			return null;
		}
		
		// Assemble shaders in to shader program
		var shaderProgram = gl.createProgram();
		gl.attachShader(shaderProgram, fragmentShader);
		gl.attachShader(shaderProgram, vertexShader);
		gl.linkProgram(shaderProgram);
		
		if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS))
		{
			assert2(false, "Error linking shader program: " + gl.getProgramInfoLog(shaderProgram));
			gl.deleteShader(fragmentShader);
			gl.deleteShader(vertexShader);
			gl.deleteProgram(shaderProgram);
			return null;
		}
		
		gl.useProgram(shaderProgram);
		// not supported in IE and more or less a redundant call anyway
		//gl.validateProgram(shaderProgram);
		
		/**BEGIN-PREVIEWONLY**/
		// Only display program logs if they are not empty
		var infoLog = gl.getProgramInfoLog(shaderProgram);
		
		if (infoLog)
		{
			log("Shader '" + name + "' log: " + infoLog);
		}
		/**END-PREVIEWONLY**/
		
		// Shaders no longer necessary; linked in to the program already
		gl.deleteShader(fragmentShader);
		gl.deleteShader(vertexShader);
		
		var ret = new GLShaderProgram(gl, shaderProgram, name);
		
		ret.extendBoxHorizontal = shaderEntry.extendBoxHorizontal || 0;
		ret.extendBoxVertical = shaderEntry.extendBoxVertical || 0;
		ret.crossSampling = !!shaderEntry.crossSampling;
		ret.preservesOpaqueness = !!shaderEntry.preservesOpaqueness;
		ret.animated = !!shaderEntry.animated;
		ret.parameters = shaderEntry.parameters || [];
		
		// Look up all parameter uniform locations
		var i, len;
		for (i = 0, len = ret.parameters.length; i < len; i++)
		{
			ret.parameters[i][1] = gl.getUniformLocation(shaderProgram, ret.parameters[i][0]);
			ret.lastCustomParams.push(0);
			gl.uniform1f(ret.parameters[i][1], 0);
		}
		
		cr.seal(ret);
		return ret;
	};
	
	GLWrap_.prototype.getShaderIndex = function(name_)
	{
		var i, len;
		for (i = 0, len = this.shaderPrograms.length; i < len; i++)
		{
			if (this.shaderPrograms[i].name === name_)
				return i;
		}
		
		return -1;
	};
	
	GLWrap_.prototype.project = function (x, y, out)
	{
		var mv = this.matMV;
		var proj = this.matP;
		
		// Based on http://www.opengl.org/wiki/GluProject_and_gluUnProject_code
		var fTempo = [0, 0, 0, 0, 0, 0, 0, 0];
		
		fTempo[0] = mv[0]*x+mv[4]*y+mv[12];
		fTempo[1] = mv[1]*x+mv[5]*y+mv[13];
		fTempo[2] = mv[2]*x+mv[6]*y+mv[14];
		fTempo[3] = mv[3]*x+mv[7]*y+mv[15];

		fTempo[4] = proj[0]*fTempo[0]+proj[4]*fTempo[1]+proj[8]*fTempo[2]+proj[12]*fTempo[3];
		fTempo[5] = proj[1]*fTempo[0]+proj[5]*fTempo[1]+proj[9]*fTempo[2]+proj[13]*fTempo[3];
		fTempo[6] = proj[2]*fTempo[0]+proj[6]*fTempo[1]+proj[10]*fTempo[2]+proj[14]*fTempo[3];
		fTempo[7] = -fTempo[2];
		
		// The result normalizes between -1 and 1
		if(fTempo[7]===0.0)	//The w value
			return;
		 
		fTempo[7]=1.0/fTempo[7];

		fTempo[4]*=fTempo[7];
		fTempo[5]*=fTempo[7];
		fTempo[6]*=fTempo[7];

		out[0]=(fTempo[4]*0.5+0.5)*this.width;
		out[1]=(fTempo[5]*0.5+0.5)*this.height;
	};
	
	GLWrap_.prototype.setSize = function(w, h, force)
	{
		if (this.width === w && this.height === h && !force)
			return;
			
		this.endBatch();
		
		var gl = this.gl;
		
		this.width = w;
		this.height = h;
		gl.viewport(0, 0, w, h);
		
		mat4.lookAt(this.cam, this.look, this.up, this.matMV);
		
		if (this.enableFrontToBack)
		{
			mat4.ortho(-w/2, w/2, h/2, -h/2, this.zNear, this.zFar, this.matP);
			this.worldScale[0] = 1;
			this.worldScale[1] = 1;
		}
		else
		{
			mat4.perspective(45, w / h, this.zNear, this.zFar, this.matP);
			var tl = [0, 0];
			var br = [0, 0];
			this.project(0, 0, tl);
			this.project(1, 1, br);
			this.worldScale[0] = 1 / (br[0] - tl[0]);
			this.worldScale[1] = -1 / (br[1] - tl[1]);
		}
		
		// Write updated matP to all shaders and mark all needing a MV update
		var i, len, s;
		for (i = 0, len = this.shaderPrograms.length; i < len; i++)
		{
			s = this.shaderPrograms[i];
			s.hasCurrentMatMV = false;
			
			if (s.locMatP)
			{
				gl.useProgram(s.shaderProgram);
				gl.uniformMatrix4fv(s.locMatP, false, this.matP);
			}
		}
		
		// Switch back to last set program
		gl.useProgram(this.shaderPrograms[this.lastProgram].shaderProgram);
		
		// Forget current texture to ensure next setTexture call isn't dropped.  Sometimes switching in to
		// fullscreen mode loses the current texture and we need to make sure GLWrap's state matches that.
		gl.bindTexture(gl.TEXTURE_2D, null);
		
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.activeTexture(gl.TEXTURE0);
		
		this.lastTexture0 = null;
		this.lastTexture1 = null;
		
		// Resize depth buffer if any
		if (this.depthBuffer)
		{
			gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
			
			gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthBuffer);
			gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.width, this.height);
			
			if (!this.attachedDepthBuffer)
			{
				// Permanently attach the depth buffer to the framebuffer object. To disable use of the depth buffer
				// we disable depth tests instead of detaching it, to minimise framebuffer state changes. Note we must
				// do this in the first setSize call, since we cannot set a depth attachment with no storage.
				gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depthBuffer);
				this.attachedDepthBuffer = true;
			}
			
			gl.bindRenderbuffer(gl.RENDERBUFFER, null);
			
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			this.renderToTex = null;
		}
	};
	
	GLWrap_.prototype.resetModelView = function ()
	{
		mat4.lookAt(this.cam, this.look, this.up, this.matMV);
		mat4.scale(this.matMV, this.worldScale);
	};
	
	GLWrap_.prototype.translate = function (x, y)
	{
		if (x === 0 && y === 0)
			return;
			
		this.tmpVec3[0] = x;// * this.worldScale[0];
		this.tmpVec3[1] = y;// * this.worldScale[1];
		this.tmpVec3[2] = 0;
		mat4.translate(this.matMV, this.tmpVec3);
	};
	
	GLWrap_.prototype.scale = function (x, y)
	{
		if (x === 1 && y === 1)
			return;
		
		this.tmpVec3[0] = x;
		this.tmpVec3[1] = y;
		this.tmpVec3[2] = 1;
		mat4.scale(this.matMV, this.tmpVec3);
	};
	
	GLWrap_.prototype.rotateZ = function (a)
	{
		if (a === 0)
			return;
		
		mat4.rotateZ(this.matMV, a);
	};
	
	GLWrap_.prototype.updateModelView = function()
	{
		// Matches existing transform: discard call
		if (areMat4sEqual(this.lastMV, this.matMV))
			return;
		
		var b = this.pushBatch();
		b.type = BATCH_UPDATEMODELVIEW;
		
		if (b.mat4param)
			mat4.set(this.matMV, b.mat4param);
		else
			b.mat4param = mat4.create(this.matMV);
		
		mat4.set(this.matMV, this.lastMV);
		this.hasQuadBatchTop = false;
		this.hasPointBatchTop = false;
	};
	
	///////////////////////////////
	/*
	var debugBatch = false;
	
	jQuery(document).mousedown(
		function(info) {
			if (info.which === 2)
				debugBatch = true;
		}
	);
	*/
	///////////////////////////////
	
	// Choose a Z value that corresponds to a depth buffer value of 'i'. Note that Z buffer value calculations
	// are non-linear. Also note that this calculation is susceptible to floating point rounding errors, and conversion
	// back to a Z buffer value can result in close-but-inexact sequences like 3.00000001, 3.99999999. We don't know what
	// the driver will do with this: it could round them and we get the values we want, or it could simply truncate and then
	// two separate Z indices end up sharing the same Z buffer value of 3, which will allow overdraw at that index.
	// To avoid this, a cautious approach is used where the Z index is doubled (the i * 2 in the calculation), therefore
	// forcing the two indices to separate Z buffer values regardless of what rounding mechanism is used. This reduces
	// the full 65536 possible values to "only" 32768 which should still be plenty, given that indices are only assigned for
	// objects actually in the viewport.
	// Also note that with extreme sprite counts the index must be clamped to prevent objects disappearing as they go past
	// the far plane. However this is not the end of the world, since if a lot of objects at the back share the same Z buffer
	// value, they will simply all overdraw each other in the back-to-front pass (with the LEQUAL test) and still appear
	// correctly, despite wasting fillrate, but there's not much that can be done once Z buffer resolution is exhausted.
	//this.currentZ = this.cam[2] - (this.kzB / (i * 2 - this.kzA));			// still overdraws on some devices
	//this.currentZ = this.cam[2] - (this.zB / ((i / 32768) - this.zA));		// still overdraws on some devices
	GLWrap_.prototype.setEarlyZIndex = function (i)
	{
		if (!this.enableFrontToBack)
			return;
		
		if (i > 32760)
			i = 32760;
		
		this.currentZ = this.cam[2] - this.zNear - i * this.zIncrement;
	};
	
	function GLBatchJob(type_, glwrap_)
	{
		this.type = type_;
		this.glwrap = glwrap_;
		this.gl = glwrap_.gl;
		this.opacityParam = 0;		// for setOpacity()
		this.startIndex = 0;		// for quad()
		this.indexCount = 0;		// "
		this.texParam = null;		// for setTexture()
		this.mat4param = null;		// for updateModelView()
		this.shaderParams = [];		// for user parameters
		
		cr.seal(this);
	};
	
	GLBatchJob.prototype.doSetEarlyZPass = function ()
	{
		var gl = this.gl;
		var glwrap = this.glwrap;
		
		if (this.startIndex !== 0)		// enable
		{
			//if (debugBatch)
			//	console.log("[WebGL batch] === Early Z pass (front-to-back) === ");
			
			gl.depthMask(true);			// enable depth writes
			gl.colorMask(false, false, false, false);	// disable color writes
			gl.disable(gl.BLEND);		// no color writes so disable blend
			
			// Unbind color attachment: color writes are disabled so no point having one
			gl.bindFramebuffer(gl.FRAMEBUFFER, glwrap.fbo);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, null, 0);
			gl.clear(gl.DEPTH_BUFFER_BIT);		// auto-clear depth buffer
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			
			glwrap.isBatchInEarlyZPass = true;
		}
		else
		{
			//if (debugBatch)
			//	console.log("[WebGL batch] === Color pass (back-to-front) === ");
			
			gl.depthMask(false);		// disable depth writes, only test existing depth values
			gl.colorMask(true, true, true, true);		// enable color writes
			gl.enable(gl.BLEND);		// turn blending back on
			
			glwrap.isBatchInEarlyZPass = false;
		}
	};
	
	GLBatchJob.prototype.doSetTexture = function ()
	{
		//if (debugBatch)
		//	log("[WebGL batch] " + (this.texParam ? "Setting a texture" : "Setting no texture"));
		
		this.gl.bindTexture(this.gl.TEXTURE_2D, this.texParam);
	};
	
	GLBatchJob.prototype.doSetTexture1 = function ()
	{
		//if (debugBatch)
		//	log("[WebGL batch] " + (this.texParam ? "Setting texture1" : "Setting no texture1"));
		
		var gl = this.gl;
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this.texParam);
		gl.activeTexture(gl.TEXTURE0);
	};
	
	GLBatchJob.prototype.doSetOpacity = function ()
	{
		//if (debugBatch)
		//	log("[WebGL batch] Setting opacity to " + this.opacityParam);
		
		var o = this.opacityParam;
		var glwrap = this.glwrap;
		glwrap.currentOpacity = o;
		var curProg = glwrap.currentShader;
		
		if (curProg.locOpacity && curProg.lpOpacity !== o)
		{
			curProg.lpOpacity = o;
			this.gl.uniform1f(curProg.locOpacity, o);
		}
	};
	
	GLBatchJob.prototype.doQuad = function ()
	{
		//if (debugBatch)
		//	log("[WebGL batch] Drawing " + (this.indexCount / 6) + " quads");
			
		this.gl.drawElements(this.gl.TRIANGLES, this.indexCount, this.gl.UNSIGNED_SHORT, this.startIndex);
	};
	
	GLBatchJob.prototype.doSetBlend = function ()
	{
		//if (debugBatch)
		//	log("[WebGL batch] Changing blend mode (" + this.startIndex + ", " + this.indexCount + ")");
			
		// recycled params to save memory
		this.gl.blendFunc(this.startIndex, this.indexCount);
	};
	
	GLBatchJob.prototype.doUpdateModelView = function ()
	{
		//if (debugBatch)
		//	log("[WebGL batch] Updating model view");
		
		// Mark all shaders needing a model view update, and write the model view to the current shader now
		var i, len, s, shaderPrograms = this.glwrap.shaderPrograms, currentProgram = this.glwrap.currentProgram;
		
		for (i = 0, len = shaderPrograms.length; i < len; i++)
		{
			s = shaderPrograms[i];
			
			// This is the current program: send the updated model view now
			if (i === currentProgram && s.locMatMV)
			{
				s.updateMatMV(this.mat4param);
				s.hasCurrentMatMV = true;
			}
			// Otherwise mark as needing an update next time we switch to it
			else
				s.hasCurrentMatMV = false;
		}
		
		// Write the current model view
		mat4.set(this.mat4param, this.glwrap.currentMV);
	};
	
	GLBatchJob.prototype.doRenderToTexture = function ()
	{		
		var gl = this.gl;
		var glwrap = this.glwrap;
		
		if (this.texParam)
		{
			//if (debugBatch)
			//	log("[WebGL batch] Rendering to texture");
			
			// Verify the texture to render to is unbound from TEXTURE1 so the renderer
			// does not think we might be rendering to the same texture.
			if (glwrap.lastTexture1 === this.texParam)
			{
				//if (debugBatch)
				//	log("[WebGL batch] Unbinding texture1 since it is being set as rendertarget");
				
				gl.activeTexture(gl.TEXTURE1);
				gl.bindTexture(gl.TEXTURE_2D, null);
				glwrap.lastTexture1 = null;
				gl.activeTexture(gl.TEXTURE0);
			}
			
			gl.bindFramebuffer(gl.FRAMEBUFFER, glwrap.fbo);
			
			// Don't modify color attachments in early Z pass mode: color writes are disabled and the color attachment is unbound
			if (!glwrap.isBatchInEarlyZPass)
			{
				gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texParam, 0);
			}
			
			// very CPU intensive check, turn off for now
			//assert2(gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE, "Rendering to texture: framebuffer not complete");
		}
		else
		{
			//if (debugBatch)
			//	log("[WebGL batch] Rendering to backbuffer");
			
			if (!glwrap.enableFrontToBack)
			{
				gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, null, 0);
			}
			
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		}
	};
	
	GLBatchJob.prototype.doClear = function ()
	{
		var gl = this.gl;
		var mode = this.startIndex;
		
		if (mode === 0)			// clear whole surface
		{
			//if (debugBatch)
			//	log("[WebGL batch] Clearing whole surface");
		
			gl.clearColor(this.mat4param[0], this.mat4param[1], this.mat4param[2], this.mat4param[3]);
			gl.clear(gl.COLOR_BUFFER_BIT);
		}
		else if (mode === 1)	// clear rectangle
		{
			//if (debugBatch)
			//	log("[WebGL batch] Clearing " + this.mat4param[2] + " x " + this.mat4param[3] + " rectangle");
			
			gl.enable(gl.SCISSOR_TEST);
			gl.scissor(this.mat4param[0], this.mat4param[1], this.mat4param[2], this.mat4param[3]);
			gl.clearColor(0, 0, 0, 0);
			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.disable(gl.SCISSOR_TEST);
		}
		else					// clear depth
		{
			//if (debugBatch)
			//	log("[WebGL batch] Clearing depth buffer");
		
			gl.clear(gl.DEPTH_BUFFER_BIT);
		}
	};
	
	GLBatchJob.prototype.doSetDepthTestEnabled = function ()
	{
		//if (debugBatch)
		//	log("[WebGL batch] Setting depth test enabled: " + !!this.startIndex);
	
		var gl = this.gl;
		var enable = this.startIndex;
		
		if (enable !== 0)
		{
			gl.enable(gl.DEPTH_TEST);
		}
		else
		{
			gl.disable(gl.DEPTH_TEST);
		}
	};
	
	GLBatchJob.prototype.doPoints = function ()
	{
		var gl = this.gl;
		var glwrap = this.glwrap;
		
		//if (debugBatch)
		//	log("[WebGL batch] Drawing " + this.indexCount + " points");
		
		// In front-to-back mode, disable the depth test. The point shader does not send any Z position at all,
		// so to make sure they render the depth test must be disabled for the points.
		if (glwrap.enableFrontToBack)
			gl.disable(gl.DEPTH_TEST);
		
		var s = glwrap.shaderPrograms[1];
		gl.useProgram(s.shaderProgram);
		
		if (!s.hasCurrentMatMV && s.locMatMV)
		{
			s.updateMatMV(glwrap.currentMV);
			s.hasCurrentMatMV = true;
		}
		
		gl.enableVertexAttribArray(s.locAPos);
		gl.bindBuffer(gl.ARRAY_BUFFER, glwrap.pointBuffer);
		gl.vertexAttribPointer(s.locAPos, 4, gl.FLOAT, false, 0, 0);
			
		gl.drawArrays(gl.POINTS, this.startIndex / 4, this.indexCount);
		
		s = glwrap.currentShader;
		gl.useProgram(s.shaderProgram);
		
		// Update vertex attribute array bindings
		if (s.locAPos >= 0)
		{
			gl.enableVertexAttribArray(s.locAPos);
			gl.bindBuffer(gl.ARRAY_BUFFER, glwrap.vertexBuffers[glwrap.curBuffer]);
			gl.vertexAttribPointer(s.locAPos, glwrap.enableFrontToBack ? 3 : 2, gl.FLOAT, false, 0, 0);
		}
		
		if (s.locATex >= 0)
		{
			gl.enableVertexAttribArray(s.locATex);
			gl.bindBuffer(gl.ARRAY_BUFFER, glwrap.texcoordBuffers[glwrap.curBuffer]);
			gl.vertexAttribPointer(s.locATex, 2, gl.FLOAT, false, 0, 0);
		}
		
		// Re-enable depth test in front-to-back mode.
		if (glwrap.enableFrontToBack)
			gl.enable(gl.DEPTH_TEST);
	};
	
	GLBatchJob.prototype.doSetProgram = function ()
	{
		//if (debugBatch)
		//	log("[WebGL batch] Setting program " + this.startIndex);
		
		var gl = this.gl;
		var glwrap = this.glwrap;
		
		var s = glwrap.shaderPrograms[this.startIndex];		// recycled param to save memory
		glwrap.currentProgram = this.startIndex;			// current batch program
		glwrap.currentShader = s;
		
		gl.useProgram(s.shaderProgram);						// switch to
		
		// Update model view if stale
		if (!s.hasCurrentMatMV && s.locMatMV)
		{
			s.updateMatMV(glwrap.currentMV);
			s.hasCurrentMatMV = true;
		}
		
		// Write current opacity
		if (s.locOpacity && s.lpOpacity !== glwrap.currentOpacity)
		{
			s.lpOpacity = glwrap.currentOpacity;
			gl.uniform1f(s.locOpacity, glwrap.currentOpacity);
		}
		
		// Update vertex attribute array bindings
		if (s.locAPos >= 0)
		{
			gl.enableVertexAttribArray(s.locAPos);
			gl.bindBuffer(gl.ARRAY_BUFFER, glwrap.vertexBuffers[glwrap.curBuffer]);
			gl.vertexAttribPointer(s.locAPos, glwrap.enableFrontToBack ? 3 : 2, gl.FLOAT, false, 0, 0);
		}
		
		if (s.locATex >= 0)
		{
			gl.enableVertexAttribArray(s.locATex);
			gl.bindBuffer(gl.ARRAY_BUFFER, glwrap.texcoordBuffers[glwrap.curBuffer]);
			gl.vertexAttribPointer(s.locATex, 2, gl.FLOAT, false, 0, 0);
		}
	}
	
	GLBatchJob.prototype.doSetColor = function ()
	{
		//if (debugBatch)
		//	log("[WebGL batch] Updating color uniform");
	
		var s = this.glwrap.currentShader;
		var mat4param = this.mat4param;
		
		this.gl.uniform4f(s.locColorFill, mat4param[0], mat4param[1], mat4param[2], mat4param[3]);
	};
	
	GLBatchJob.prototype.doSetProgramParameters = function ()
	{
		//if (debugBatch)
		//	log("[WebGL batch] Setting program parameters");
		
		var i, len, s = this.glwrap.currentShader;
		var gl = this.gl;
		var mat4param = this.mat4param;
		
		if (s.locSamplerBack && this.glwrap.lastTexture1 !== this.texParam)
		{
			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D, this.texParam);
			this.glwrap.lastTexture1 = this.texParam;
			gl.activeTexture(gl.TEXTURE0);
		}
		
		var v = mat4param[0];
		var v2;
		
		if (s.locPixelWidth && v !== s.lpPixelWidth)
		{
			s.lpPixelWidth = v;
			gl.uniform1f(s.locPixelWidth, v);
		}
		
		v = mat4param[1];
		
		if (s.locPixelHeight && v !== s.lpPixelHeight)
		{
			s.lpPixelHeight = v;
			gl.uniform1f(s.locPixelHeight, v);
		}
		
		v = mat4param[2];
		v2 = mat4param[3];
		
		if (s.locDestStart && (v !== s.lpDestStartX || v2 !== s.lpDestStartY))
		{
			s.lpDestStartX = v;
			s.lpDestStartY = v2;
			gl.uniform2f(s.locDestStart, v, v2);
		}
		
		v = mat4param[4];
		v2 = mat4param[5];
		
		if (s.locDestEnd && (v !== s.lpDestEndX || v2 !== s.lpDestEndY))
		{
			s.lpDestEndX = v;
			s.lpDestEndY = v2;
			gl.uniform2f(s.locDestEnd, v, v2);
		}
		
		v = mat4param[6];
		
		if (s.locLayerScale && v !== s.lpLayerScale)
		{
			s.lpLayerScale = v;
			gl.uniform1f(s.locLayerScale, v);
		}
		
		v = mat4param[7];
		
		if (s.locLayerAngle && v !== s.lpLayerAngle)
		{
			s.lpLayerAngle = v;
			gl.uniform1f(s.locLayerAngle, v);
		}
		
		v = mat4param[8];
		v2 = mat4param[9];
			
		if (s.locViewOrigin && (v !== s.lpViewOriginX || v2 !== s.lpViewOriginY))
		{
			s.lpViewOriginX = v;
			s.lpViewOriginY = v2;
			gl.uniform2f(s.locViewOrigin, v, v2);
		}
		
		v = mat4param[10];
		v2 = mat4param[11];
			
		if (s.locScrollPos && (v !== s.lpScrollPosX || v2 !== s.lpScrollPosY))
		{
			s.lpScrollPosX = v;
			s.lpScrollPosY = v2;
			gl.uniform2f(s.locScrollPos, v, v2);
		}
		
		v = mat4param[12];
		if (s.locSeconds && v !== s.lpSeconds)
		{
			s.lpSeconds = v;
			gl.uniform1f(s.locSeconds, v);
		}
			
		if (s.parameters.length)
		{
			for (i = 0, len = s.parameters.length; i < len; i++)
			{
				v = this.shaderParams[i];
				
				if (v !== s.lastCustomParams[i])
				{
					s.lastCustomParams[i] = v;
					gl.uniform1f(s.parameters[i][1], v);
				}
			}
		}
	};
	
	GLWrap_.prototype.pushBatch = function ()
	{
		// Create new if reached end of array
		if (this.batchPtr === this.batch.length)
			this.batch.push(new GLBatchJob(BATCH_NULL, this));
		
		// Otherwise recycle the batch
		return this.batch[this.batchPtr++];
	};
	
	GLWrap_.prototype.endBatch = function ()
	{
		if (this.batchPtr === 0)
			return;
		if (this.gl.isContextLost())
			return;
		
		// Write the buffers to VRAM.
		var gl = this.gl;
		
		if (this.pointPtr > 0)
		{
			gl.bindBuffer(gl.ARRAY_BUFFER, this.pointBuffer);
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.pointData.subarray(0, this.pointPtr));
			
			if (s && s.locAPos >= 0 && s.name === "<point>")
				gl.vertexAttribPointer(s.locAPos, 4, gl.FLOAT, false, 0, 0);
		}
		
		//if (debugBatch)
		//	log("[WebGL batch] Running batch (" + this.batchPtr + " batch items, " + this.vertexPtr + " vertices)");
		
		if (this.vertexPtr > 0)
		{
			// Send buffer data and make sure current program is using the new buffer
			var s = this.currentShader;
			
			gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffers[this.curBuffer]);
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertexData.subarray(0, this.vertexPtr));
			
			if (s && s.locAPos >= 0 && s.name !== "<point>")
				gl.vertexAttribPointer(s.locAPos, this.enableFrontToBack ? 3 : 2, gl.FLOAT, false, 0, 0);
			
			gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffers[this.curBuffer]);
			gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.texcoordData.subarray(0, this.texPtr));
			
			if (s && s.locATex >= 0 && s.name !== "<point>")
				gl.vertexAttribPointer(s.locATex, 2, gl.FLOAT, false, 0, 0);
		}
		
		// Execute the batch. Note V8 won't optimise this with references to the vars (e.g. BATCH_QUAD) so they have
		// been replaced with literals.
		var i, len, b;
		for (i = 0, len = this.batchPtr; i < len; i++)
		{
			b = this.batch[i];
			
			switch (b.type) {
			case 1:
				b.doQuad();
				break;
			case 2:
				b.doSetTexture();
				break;
			case 3:
				b.doSetOpacity();
				break;
			case 4:
				b.doSetBlend();
				break;
			case 5:
				b.doUpdateModelView();
				break;
			case 6:
				b.doRenderToTexture();
				break;
			case 7:
				b.doClear();
				break;
			case 8:
				b.doPoints();
				break;
			case 9:
				b.doSetProgram();
				break;
			case 10:
				b.doSetProgramParameters();
				break;
			case 11:
				b.doSetTexture1();
				break;
			case 12:
				b.doSetColor();
				break;
			case 13:
				b.doSetDepthTestEnabled();
				break;
			case 14:
				b.doSetEarlyZPass();
				break;
			}
		}
		
		// reset cursors and recycle buffers
		this.batchPtr = 0;
		this.vertexPtr = 0;
		this.texPtr = 0;
		this.pointPtr = 0;
		this.hasQuadBatchTop = false;
		this.hasPointBatchTop = false;
		this.isBatchInEarlyZPass = false;
		
		this.curBuffer++;
		
		if (this.curBuffer >= MULTI_BUFFERS)
			this.curBuffer = 0;
	};
	
	GLWrap_.prototype.setOpacity = function (op)
	{
		if (op === this.lastOpacity)
			return;
		
		if (this.isEarlyZPass)
			return;		// ignore
		
		var b = this.pushBatch();
		b.type = BATCH_SETOPACITY;
		b.opacityParam = op;
		
		this.lastOpacity = op;
		this.hasQuadBatchTop = false;
		this.hasPointBatchTop = false;
	};
	
	GLWrap_.prototype.setTexture = function (tex)
	{
		if (tex === this.lastTexture0)
			return;
		
		assert2(!tex || tex !== this.renderToTex, "Warning: setting texture to current render texture");
		
		var b = this.pushBatch();
		b.type = BATCH_SETTEXTURE;
		b.texParam = tex;
		
		this.lastTexture0 = tex;
		this.hasQuadBatchTop = false;
		this.hasPointBatchTop = false;
	};
	
	GLWrap_.prototype.setBlend = function (s, d)
	{
		if (s === this.lastSrcBlend && d === this.lastDestBlend)
			return;
		
		if (this.isEarlyZPass)
			return;		// ignore
		
		var b = this.pushBatch();
		b.type = BATCH_SETBLEND;
		b.startIndex = s;		// recycle params to save memory
		b.indexCount = d;
		
		this.lastSrcBlend = s;
		this.lastDestBlend = d;
		this.hasQuadBatchTop = false;
		this.hasPointBatchTop = false;
	};
	
	GLWrap_.prototype.isPremultipliedAlphaBlend = function ()
	{
		return (this.lastSrcBlend === this.gl.ONE && this.lastDestBlend === this.gl.ONE_MINUS_SRC_ALPHA);
	};
	
	GLWrap_.prototype.setAlphaBlend = function ()
	{
		this.setBlend(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
	};
	
	GLWrap_.prototype.setNoPremultiplyAlphaBlend = function ()
	{
		this.setBlend(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
	};
	
	var LAST_VERTEX = MAX_VERTICES * 2 - 8;
	
	GLWrap_.prototype.quad = function(tlx, tly, trx, try_, brx, bry, blx, bly)
	{
		// End the batch if the vertex buffer is full
		if (this.vertexPtr >= LAST_VERTEX)
			this.endBatch();
		
		var v = this.vertexPtr;			// vertex cursor
		var t = this.texPtr;
		var vd = this.vertexData;		// vertex data array
		var td = this.texcoordData;		// texture coord data array
		var currentZ = this.currentZ;
		
		// Try to extend a previous quad batch job
		if (this.hasQuadBatchTop)
		{
			this.batch[this.batchPtr - 1].indexCount += 6;
		}
		else
		{
			// No quad batch already in progress: start a new one
			var b = this.pushBatch();
			b.type = BATCH_QUAD;
			
			// Math note: the start index is in bytes in to the index array. There are 6 indices per quad,
			// and each index is 2 bytes, so there are 12 bytes per quad. In front-to-back mode v happens
			// to increment by 12 per quad, because 3 components x 4 vertices = 12. In back-to-front mode
			// there are only 2 components x 4 vertices = 8 per quad, which is bumped up to 12 by (v/2)*3.
			b.startIndex = this.enableFrontToBack ? v : (v / 2) * 3;
			b.indexCount = 6;
			this.hasQuadBatchTop = true;
			this.hasPointBatchTop = false;
		}
		
		if (this.enableFrontToBack)
		{
			// 3-component vertex buffer (x, y, z)
			vd[v++] = tlx;
			vd[v++] = tly;
			vd[v++] = currentZ;
			vd[v++] = trx;
			vd[v++] = try_;
			vd[v++] = currentZ;
			vd[v++] = brx;
			vd[v++] = bry;
			vd[v++] = currentZ;
			vd[v++] = blx;
			vd[v++] = bly;
			vd[v++] = currentZ;
		}
		else
		{
			// 2-component vertex buffer (x, y)
			vd[v++] = tlx;
			vd[v++] = tly;
			vd[v++] = trx;
			vd[v++] = try_;
			vd[v++] = brx;
			vd[v++] = bry;
			vd[v++] = blx;
			vd[v++] = bly;
		}
		
		td[t++] = 0;
		td[t++] = 0;
		td[t++] = 1;
		td[t++] = 0;
		td[t++] = 1;
		td[t++] = 1;
		td[t++] = 0;
		td[t++] = 1;
		
		// Update cursor
		this.vertexPtr = v;
		this.texPtr = t;
	};
	
	GLWrap_.prototype.quadTex = function(tlx, tly, trx, try_, brx, bry, blx, bly, rcTex)
	{
		// End the batch if the vertex buffer is full
		if (this.vertexPtr >= LAST_VERTEX)
			this.endBatch();
		
		var v = this.vertexPtr;			// vertex cursor
		var t = this.texPtr;
		var vd = this.vertexData;		// vertex data array
		var td = this.texcoordData;		// texture coord data array
		var currentZ = this.currentZ;
		
		// Try to extend a previous quad batch job
		if (this.hasQuadBatchTop)
		{
			this.batch[this.batchPtr - 1].indexCount += 6;
		}
		else
		{
			// No quad batch already in progress: start a new one
			var b = this.pushBatch();
			b.type = BATCH_QUAD;
			b.startIndex = this.enableFrontToBack ? v : (v / 2) * 3;
			b.indexCount = 6;
			this.hasQuadBatchTop = true;
			this.hasPointBatchTop = false;
		}
		
		var rc_left = rcTex.left;
		var rc_top = rcTex.top;
		var rc_right = rcTex.right;
		var rc_bottom = rcTex.bottom;
		
		if (this.enableFrontToBack)
		{
			// 3-component vertex buffer (x, y, z)
			vd[v++] = tlx;
			vd[v++] = tly;
			vd[v++] = currentZ;
			vd[v++] = trx;
			vd[v++] = try_;
			vd[v++] = currentZ;
			vd[v++] = brx;
			vd[v++] = bry;
			vd[v++] = currentZ;
			vd[v++] = blx;
			vd[v++] = bly;
			vd[v++] = currentZ;
		}
		else
		{
			vd[v++] = tlx;
			vd[v++] = tly;
			vd[v++] = trx;
			vd[v++] = try_;
			vd[v++] = brx;
			vd[v++] = bry;
			vd[v++] = blx;
			vd[v++] = bly;
		}
		
		td[t++] = rc_left;
		td[t++] = rc_top;
		td[t++] = rc_right;
		td[t++] = rc_top;
		td[t++] = rc_right;
		td[t++] = rc_bottom;
		td[t++] = rc_left;
		td[t++] = rc_bottom;
		
		// Update cursor
		this.vertexPtr = v;
		this.texPtr = t;
	};
	
	GLWrap_.prototype.quadTexUV = function(tlx, tly, trx, try_, brx, bry, blx, bly, tlu, tlv, tru, trv, bru, brv, blu, blv)
	{
		// End the batch if the vertex buffer is full
		if (this.vertexPtr >= LAST_VERTEX)
			this.endBatch();
		
		var v = this.vertexPtr;			// vertex cursor
		var t = this.texPtr;
		var vd = this.vertexData;		// vertex data array
		var td = this.texcoordData;		// texture coord data array
		var currentZ = this.currentZ;
		
		// Try to extend a previous quad batch job
		if (this.hasQuadBatchTop)
		{
			this.batch[this.batchPtr - 1].indexCount += 6;
		}
		else
		{
			// No quad batch already in progress: start a new one
			var b = this.pushBatch();
			b.type = BATCH_QUAD;
			b.startIndex = this.enableFrontToBack ? v : (v / 2) * 3;
			b.indexCount = 6;
			this.hasQuadBatchTop = true;
			this.hasPointBatchTop = false;
		}
		
		if (this.enableFrontToBack)
		{
			// 3-component vertex buffer (x, y, z)
			vd[v++] = tlx;
			vd[v++] = tly;
			vd[v++] = currentZ;
			vd[v++] = trx;
			vd[v++] = try_;
			vd[v++] = currentZ;
			vd[v++] = brx;
			vd[v++] = bry;
			vd[v++] = currentZ;
			vd[v++] = blx;
			vd[v++] = bly;
			vd[v++] = currentZ;
		}
		else
		{
			vd[v++] = tlx;
			vd[v++] = tly;
			vd[v++] = trx;
			vd[v++] = try_;
			vd[v++] = brx;
			vd[v++] = bry;
			vd[v++] = blx;
			vd[v++] = bly;
		}
		
		td[t++] = tlu;
		td[t++] = tlv;
		td[t++] = tru;
		td[t++] = trv;
		td[t++] = bru;
		td[t++] = brv;
		td[t++] = blu;
		td[t++] = blv;
		
		// Update cursor
		this.vertexPtr = v;
		this.texPtr = t;
	};
	
	GLWrap_.prototype.convexPoly = function(pts)
	{
		var pts_count = pts.length / 2;
		assert2(pts_count >= 3, "Must pass polygon with at least 3 points to convexPoly");
		
		var tris = pts_count - 2;	// 3 points = 1 tri, 4 points = 2 tris, 5 points = 3 tris etc.
		var last_tri = tris - 1;
		
		// The batching system is already very efficiently geared towards issuing quads, since
		// 2D games consist mainly of rectangular sprites. Issuing a poly "properly" with a vertex
		// per poly point and indices to break it up in to triangles introduces some complications
		// with having to track index counts and vertex counts separately. To avoid this, we simply
		// issue a quad per two adjacent triangles in the poly. The quad pipeline is already highly
		// optimised so this should still be fast and batch well. If there is a single triangle to
		// draw, a degenerate quad is issued (with the bl and br points the same).
		var p0x = pts[0];
		var p0y = pts[1];
		
		var i, i2, p1x, p1y, p2x, p2y, p3x, p3y;
		
		for (i = 0; i < tris; i += 2)		// draw 2 triangles at a time
		{
			// Render as a triangle fan from point 0.
			// Tri N renders with a triangle of points 0, N + 1, N + 2
			i2 = i * 2;
			p1x = pts[i2 + 2];
			p1y = pts[i2 + 3];
			p2x = pts[i2 + 4];
			p2y = pts[i2 + 5];
			
			// Last triangle when odd number of triangles
			if (i === last_tri)
			{
				// issue degenerate quad
				this.quad(p0x, p0y, p1x, p1y, p2x, p2y, p2x, p2y);
			}
			// Otherwise draw 2 triangles via a quad
			else
			{
				p3x = pts[i2 + 6];
				p3y = pts[i2 + 7];
				this.quad(p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y);
			}
		}
	};
	
	var LAST_POINT = MAX_POINTS - 4;
	
	GLWrap_.prototype.point = function(x_, y_, size_, opacity_)
	{
		// End the batch if the point buffer is full
		if (this.pointPtr >= LAST_POINT)
			this.endBatch();
		
		var p = this.pointPtr;			// point cursor
		var pd = this.pointData;		// point data array
		
		// Try to extend a previous point batch job
		if (this.hasPointBatchTop)
		{
			this.batch[this.batchPtr - 1].indexCount++;
		}
		else
		{
			// No quad batch already in progress: start a new one
			var b = this.pushBatch();
			b.type = BATCH_POINTS;
			b.startIndex = p;
			b.indexCount = 1;
			this.hasPointBatchTop = true;
			this.hasQuadBatchTop = false;
		}
		
		pd[p++] = x_;
		pd[p++] = y_;
		pd[p++] = size_;
		pd[p++] = opacity_;
		
		// Update cursor
		this.pointPtr = p;
	};
	
	GLWrap_.prototype.switchProgram = function (progIndex)
	{
		if (this.lastProgram === progIndex)
			return;			// no change
		
		var shaderProg = this.shaderPrograms[progIndex];
		
		// Shader is null if failed to compile
		if (!shaderProg)
		{
			if (this.lastProgram === 0)
				return;								// already on default shader
			
			// switch to default shader instead
			progIndex = 0;
			shaderProg = this.shaderPrograms[0];
		}
		
		// Push batch job to switch program
		var b = this.pushBatch();
		b.type = BATCH_SETPROGRAM;
		b.startIndex = progIndex;
		
		this.lastProgram = progIndex;
		this.hasQuadBatchTop = false;
		this.hasPointBatchTop = false;
	};
	
	GLWrap_.prototype.programUsesDest = function (progIndex)
	{
		var s = this.shaderPrograms[progIndex];
		return !!(s.locDestStart || s.locDestEnd);
	};
	
	GLWrap_.prototype.programUsesCrossSampling = function (progIndex)
	{
		var s = this.shaderPrograms[progIndex];
		
		// NOTE: to avoid possible undefined behavior, any sampler also using background blending
		// is also regarded as cross-sampling. This is to prevent simultaneous input-output by
		// having texture1 bound to the current render target.
		return !!(s.locDestStart || s.locDestEnd || s.crossSampling);
	};
	
	GLWrap_.prototype.programPreservesOpaqueness = function (progIndex)
	{
		return this.shaderPrograms[progIndex].preservesOpaqueness;
	};
	
	GLWrap_.prototype.programExtendsBox = function (progIndex)
	{
		var s = this.shaderPrograms[progIndex];
		return s.extendBoxHorizontal !== 0 || s.extendBoxVertical !== 0;
	};
	
	GLWrap_.prototype.getProgramBoxExtendHorizontal = function (progIndex)
	{
		return this.shaderPrograms[progIndex].extendBoxHorizontal;
	};
	
	GLWrap_.prototype.getProgramBoxExtendVertical = function (progIndex)
	{
		return this.shaderPrograms[progIndex].extendBoxVertical;
	};
	
	GLWrap_.prototype.getProgramParameterType = function (progIndex, paramIndex)
	{
		return this.shaderPrograms[progIndex].parameters[paramIndex][2];
	};
	
	GLWrap_.prototype.programIsAnimated = function (progIndex)
	{
		return this.shaderPrograms[progIndex].animated;
	};
	
	GLWrap_.prototype.setProgramParameters = function (backTex, pixelWidth, pixelHeight, destStartX, destStartY, destEndX, destEndY, layerScale, layerAngle, viewOriginLeft, viewOriginTop, scrollPosX, scrollPosY, seconds, params)
	{
		var i, len;
		var s = this.shaderPrograms[this.lastProgram];
		var b, mat4param, shaderParams;
		
		if (s.hasAnyOptionalUniforms || params.length)
		{
			// Push batch job to set parameters
			b = this.pushBatch();
			b.type = BATCH_SETPROGRAMPARAMETERS;
			
			if (b.mat4param)
				mat4.set(this.matMV, b.mat4param);
			else
				b.mat4param = mat4.create();
			
			mat4param = b.mat4param;
			mat4param[0] = pixelWidth;
			mat4param[1] = pixelHeight;
			mat4param[2] = destStartX;
			mat4param[3] = destStartY;
			mat4param[4] = destEndX;
			mat4param[5] = destEndY;
			mat4param[6] = layerScale;
			mat4param[7] = layerAngle;
			mat4param[8] = viewOriginLeft;
			mat4param[9] = viewOriginTop;
			mat4param[10] = scrollPosX;
			mat4param[11] = scrollPosY;
			mat4param[12] = seconds;
			
			if (s.locSamplerBack)
			{
				assert2(!backTex || backTex !== this.renderToTex, "Warning: setting texture1 to current render texture");
				b.texParam = backTex;
			}
			else
				b.texParam = null;
			
			// Copy in shader parameters if any
			if (params.length)
			{
				shaderParams = b.shaderParams;
				shaderParams.length = params.length;
				
				for (i = 0, len = params.length; i < len; i++)
					shaderParams[i] = params[i];
			}
			
			this.hasQuadBatchTop = false;
			this.hasPointBatchTop = false;
		}
	};
	
	GLWrap_.prototype.clear = function (r, g, b_, a)
	{
		var b = this.pushBatch();
		b.type = BATCH_CLEAR;
		b.startIndex = 0;					// clear all mode
		
		if (!b.mat4param)
			b.mat4param = mat4.create();
		
		b.mat4param[0] = r;
		b.mat4param[1] = g;
		b.mat4param[2] = b_;
		b.mat4param[3] = a;
		
		this.hasQuadBatchTop = false;
		this.hasPointBatchTop = false;
	};
	
	GLWrap_.prototype.clearRect = function (x, y, w, h)
	{
		if (w < 0 || h < 0)
			return;							// invalid clear area
		
		var b = this.pushBatch();
		b.type = BATCH_CLEAR;
		b.startIndex = 1;					// clear rect mode
		
		if (!b.mat4param)
			b.mat4param = mat4.create();
		
		b.mat4param[0] = x;
		b.mat4param[1] = y;
		b.mat4param[2] = w;
		b.mat4param[3] = h;
		
		this.hasQuadBatchTop = false;
		this.hasPointBatchTop = false;
	};
	
	GLWrap_.prototype.clearDepth = function ()
	{
		var b = this.pushBatch();
		b.type = BATCH_CLEAR;
		b.startIndex = 2;					// clear depth mode
		
		this.hasQuadBatchTop = false;
		this.hasPointBatchTop = false;
	};
	
	GLWrap_.prototype.setEarlyZPass = function (e)
	{
		if (!this.enableFrontToBack)
			return;		// no depth buffer in use
		
		e = !!e;
		
		if (this.isEarlyZPass === e)
			return;		// no change
		
		var b = this.pushBatch();
		b.type = BATCH_SETEARLYZMODE;
		b.startIndex = (e ? 1 : 0);
		
		this.hasQuadBatchTop = false;
		this.hasPointBatchTop = false;
		
		this.isEarlyZPass = e;
		this.renderToTex = null;
		
		if (this.isEarlyZPass)
		{
			this.switchProgram(2);		// early Z program
		}
		else
		{
			this.switchProgram(0);		// normal rendering
		}
	};
	
	GLWrap_.prototype.setDepthTestEnabled = function (e)
	{
		if (!this.enableFrontToBack)
			return;		// no depth buffer in use
		
		var b = this.pushBatch();
		b.type = BATCH_SETDEPTHTEST;
		b.startIndex = (e ? 1 : 0);
		
		this.hasQuadBatchTop = false;
		this.hasPointBatchTop = false;
	};
	
	GLWrap_.prototype.fullscreenQuad = function ()
	{
		// save existing model view
		mat4.set(this.lastMV, tempMat4);
		
		// switch to default transform
		this.resetModelView();
		this.updateModelView();
		var halfw = this.width / 2;
		var halfh = this.height / 2;
		this.quad(-halfw, halfh, halfw, halfh, halfw, -halfh, -halfw, -halfh);
		
		// restore previous model view
		mat4.set(tempMat4, this.matMV);
		this.updateModelView();
	};
	
	GLWrap_.prototype.setColorFillMode = function (r_, g_, b_, a_)
	{
		// switch to fill program
		this.switchProgram(3);
		
		// set fill color
		var b = this.pushBatch();
		b.type = BATCH_SETCOLOR;
		
		if (!b.mat4param)
			b.mat4param = mat4.create();
		
		b.mat4param[0] = r_;
		b.mat4param[1] = g_;
		b.mat4param[2] = b_;
		b.mat4param[3] = a_;
		
		this.hasQuadBatchTop = false;
		this.hasPointBatchTop = false;
	};
	
	GLWrap_.prototype.setTextureFillMode = function ()
	{
		assert2(!this.isEarlyZPass, "not allowed to set texture fill mode in early Z pass");
		
		// restore default program
		this.switchProgram(0);
	};
	
	GLWrap_.prototype.restoreEarlyZMode = function ()
	{
		assert2(this.isEarlyZPass, "must be in early Z pass");
		
		// restore early Z program
		this.switchProgram(2);
	};
	
	GLWrap_.prototype.present = function ()
	{
		this.endBatch();
		this.gl.flush();
		
		/*
		if (debugBatch)
		{
			log("[WebGL batch] Presented");
			debugBatch = false;
		}
		*/
	};
	
	function nextHighestPowerOfTwo(x) {
		--x;
		for (var i = 1; i < 32; i <<= 1) {
			x = x | x >> i;
		}
		return x + 1;
	}
	
	var all_textures = [];
	var textures_by_src = {};
	
	GLWrap_.prototype.contextLost = function ()
	{
		// on context lost we need to ditch the texture cache since they'll all have been destroyed now
		cr.clearArray(all_textures);
		textures_by_src = {};
	};
	
	var BF_RGBA8 = 0;
	var BF_RGB8 = 1;
	var BF_RGBA4 = 2;
	var BF_RGB5_A1 = 3;
	var BF_RGB565 = 4;
	
	GLWrap_.prototype.loadTexture = function (img, tiling, linearsampling, pixelformat, tiletype, nomip)
	{
		// Try to find a texture already created from this image. If one exists, return the same texture
		// and increment its reference count.
		tiling = !!tiling;
		linearsampling = !!linearsampling;
		var tex_key = img.src + "," + tiling + "," + linearsampling + (tiling ? ("," + tiletype) : "");
		var webGL_texture = null;
		
		// Canvases can be passed to loadTexture, which have the src property missing, and in that case we want to skip this check.
		if (typeof img.src !== "undefined" && textures_by_src.hasOwnProperty(tex_key))
		{
			webGL_texture = textures_by_src[tex_key];
			webGL_texture.c2refcount++;
			return webGL_texture;
		}
		
		this.endBatch();
		
		assert2(img.width <= this.maxTextureSize && img.height <= this.maxTextureSize, "An image was used above the maximum texture size and cannot be displayed. Ensure all images are 2048x2048 or smaller");
		
		var gl = this.gl;
		var isPOT = (cr.isPOT(img.width) && cr.isPOT(img.height));
		
		webGL_texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, webGL_texture);
		gl.pixelStorei(gl["UNPACK_PREMULTIPLY_ALPHA_WEBGL"], true);
		
		var internalformat = gl.RGBA;
		var format = gl.RGBA;
		var type = gl.UNSIGNED_BYTE;
		
		// Change type if a pixel format is provided to hint GL to use less memory
		// Note: IE's WebGL doesn't seem to support this so just use RGBA in that case
		if (pixelformat && !this.isIE)
		{
			switch (pixelformat) {
			case BF_RGB8:
				internalformat = gl.RGB;
				format = gl.RGB;
				break;
			case BF_RGBA4:
				type = gl.UNSIGNED_SHORT_4_4_4_4;
				break;
			case BF_RGB5_A1:
				type = gl.UNSIGNED_SHORT_5_5_5_1;
				break;
			case BF_RGB565:
				internalformat = gl.RGB;
				format = gl.RGB;
				type = gl.UNSIGNED_SHORT_5_6_5;
				break;
			}
		}
		
		// Tiled non-power-of-two textures are not supported - have to stretch the image to fit a POT
		if (!isPOT && tiling)
		{
			var canvas = document.createElement("canvas");
			canvas.width = cr.nextHighestPowerOfTwo(img.width);
			canvas.height = cr.nextHighestPowerOfTwo(img.height);
			var ctx = canvas.getContext("2d");
			// Respect sampling mode when stretching
			ctx["webkitImageSmoothingEnabled"] = linearsampling;
			ctx["mozImageSmoothingEnabled"] = linearsampling;
			ctx["msImageSmoothingEnabled"] = linearsampling;
			ctx["imageSmoothingEnabled"] = linearsampling;
			ctx.drawImage(img,
						  0, 0, img.width, img.height,
						  0, 0, canvas.width, canvas.height);
			gl.texImage2D(gl.TEXTURE_2D, 0, internalformat, format, type, canvas);
		}
		else
			gl.texImage2D(gl.TEXTURE_2D, 0, internalformat, format, type, img);
		
		if (tiling)
		{
			if (tiletype === "repeat-x")
			{
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			}
			else if (tiletype === "repeat-y")
			{
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
			}
			else
			{
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
			}
		}
		else
		{
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		}
		
		if (linearsampling)
		{
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			
			if (isPOT && this.enable_mipmaps && !nomip)
			{
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
				gl.generateMipmap(gl.TEXTURE_2D);
			}
			else
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		}
		else
		{
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		}

		gl.bindTexture(gl.TEXTURE_2D, null);
		this.lastTexture0 = null;
		
		webGL_texture.c2width = img.width;
		webGL_texture.c2height = img.height;
		webGL_texture.c2refcount = 1;
		webGL_texture.c2texkey = tex_key;
		
		all_textures.push(webGL_texture);
		textures_by_src[tex_key] = webGL_texture;
		
		return webGL_texture;
	};
	
	GLWrap_.prototype.createEmptyTexture = function (w, h, linearsampling, _16bit, tiling)
	{
		this.endBatch();
		
		var gl = this.gl;
		
		// IE's WebGL doesn't support 16-bit textures
		if (this.isIE)
			_16bit = false;
		
		var webGL_texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, webGL_texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, _16bit ? gl.UNSIGNED_SHORT_4_4_4_4 : gl.UNSIGNED_BYTE, null);
		
		if (tiling)
		{
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
		}
		else
		{
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		}
		
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, linearsampling ? gl.LINEAR : gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, linearsampling ? gl.LINEAR : gl.NEAREST);
		
		gl.bindTexture(gl.TEXTURE_2D, null);
		this.lastTexture0 = null;
		
		webGL_texture.c2width = w;
		webGL_texture.c2height = h;
		
		all_textures.push(webGL_texture);
		
		return webGL_texture;
	};
	
	GLWrap_.prototype.videoToTexture = function (video_, texture_, _16bit)
	{
		this.endBatch();
		
		var gl = this.gl;
		
		// IE's WebGL doesn't support 16-bit textures
		if (this.isIE)
			_16bit = false;

		gl.bindTexture(gl.TEXTURE_2D, texture_);
		gl.pixelStorei(gl["UNPACK_PREMULTIPLY_ALPHA_WEBGL"], true);
		
		// Cross-domain videos sometimes throw a security error here
		try {
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, _16bit ? gl.UNSIGNED_SHORT_4_4_4_4 : gl.UNSIGNED_BYTE, video_);
		}
		catch (e)
		{
			if (console && console.error)
				console.error("Error updating WebGL texture: ", e);
		}

		gl.bindTexture(gl.TEXTURE_2D, null);
		this.lastTexture0 = null;
	};
	
	GLWrap_.prototype.deleteTexture = function (tex)
	{
		if (!tex)
			return;
			
		if (typeof tex.c2refcount !== "undefined" && tex.c2refcount > 1)
		{
			tex.c2refcount--;
			return;
		}
		
		this.endBatch();
		
		if (tex === this.lastTexture0)
		{
			this.gl.bindTexture(this.gl.TEXTURE_2D, null);
			this.lastTexture0 = null;
		}
		
		if (tex === this.lastTexture1)
		{
			this.gl.activeTexture(this.gl.TEXTURE1);
			this.gl.bindTexture(this.gl.TEXTURE_2D, null);
			this.gl.activeTexture(this.gl.TEXTURE0);
			this.lastTexture1 = null;
		}
		
		cr.arrayFindRemove(all_textures, tex);
		
		if (typeof tex.c2texkey !== "undefined")
			delete textures_by_src[tex.c2texkey];

		this.gl.deleteTexture(tex);
	};
	
	GLWrap_.prototype.estimateVRAM = function ()
	{
		// Assume usage of frontbuffer and backbuffer
		var total = this.width * this.height * 4 * 2;
		
		var i, len, t;
		for (i = 0, len = all_textures.length; i < len; i++)
		{
			t = all_textures[i];
			total += (t.c2width * t.c2height * 4);
		}
		
		return total;
	};
	
	GLWrap_.prototype.textureCount = function ()
	{
		return all_textures.length;
	};
	
	GLWrap_.prototype.setRenderingToTexture = function (tex)
	{
		if (tex === this.renderToTex)
			return;
			
		assert2(!tex || tex !== this.lastTexture0, "Warning: set rendering to current texture 0");
		
		// Ignore this assert: if we do set the render-to-texture to the same thing as texture1, then
		// doRenderToTexture will unbind it to ensure correct rendering.
		//assert2(!tex || tex !== this.lastTexture1, "Warning: set rendering to current texture 1");

		var b = this.pushBatch();
		b.type = BATCH_RENDERTOTEXTURE;
		b.texParam = tex;
		
		this.renderToTex = tex;
		this.hasQuadBatchTop = false;
		this.hasPointBatchTop = false;
	};
	
	cr.GLWrap = GLWrap_;

}());