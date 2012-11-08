
function rgb2xyz(rgb) {
  var r = rgb[0] / 255,
      g = rgb[1] / 255,
      b = rgb[2] / 255;

  // assume sRGB
  r = r > 0.04045 ? Math.pow(((r + 0.055) / 1.055), 2.4) : (r / 12.92);
  g = g > 0.04045 ? Math.pow(((g + 0.055) / 1.055), 2.4) : (g / 12.92);
  b = b > 0.04045 ? Math.pow(((b + 0.055) / 1.055), 2.4) : (b / 12.92);
  
  var x = (r * 0.4124) + (g * 0.3576) + (b * 0.1805);
  var y = (r * 0.2126) + (g * 0.7152) + (b * 0.0722);
  var z = (r * 0.0193) + (g * 0.1192) + (b * 0.9505);

  return [x * 100, y *100, z * 100];
}


function xyz2rgb(xyz) {
  var x = xyz[0] / 100,
      y = xyz[1] / 100,
      z = xyz[2] / 100,
      r, g, b;

  r = (x * 3.2406) + (y * -1.5372) + (z * -0.4986);
  g = (x * -0.9689) + (y * 1.8758) + (z * 0.0415);
  b = (x * 0.0557) + (y * -0.2040) + (z * 1.0570);

  // assume sRGB
  r = r > 0.0031308 ? ((1.055 * Math.pow(r, 1.0 / 2.4)) - 0.055)
    : r = (r * 12.92);

  g = g > 0.0031308 ? ((1.055 * Math.pow(g, 1.0 / 2.4)) - 0.055)
    : g = (g * 12.92);
        
  b = b > 0.0031308 ? ((1.055 * Math.pow(b, 1.0 / 2.4)) - 0.055)
    : b = (b * 12.92);

  r = (r < 0) ? 0 : r;
  g = (g < 0) ? 0 : g;
  b = (b < 0) ? 0 : b;

  return [r * 255, g * 255, b * 255];
}

function xyz2lab(xyz) {
  var   x = xyz[0],
        y = xyz[1],
        z = xyz[2],
        l, a, b;

  x /= 95.047;
  y /= 100;
  z /= 108.883;

  x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + (16 / 116);
  y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + (16 / 116);
  z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + (16 / 116);

  l = (116 * y) - 16;
  a = 500 * (x - y);
  b = 200 * (y - z);
  
  return [l, a, b];
}

//function lab2xyz(lab){
//	var var_Y = ( lab[0] + 16 ) / 116
//	var var_X = lab[1] / 500 + var_Y
//	var var_Z = var_Y - lab[2] / 200
//
//	if ( Math.pow(var_Y,3) > 0.008856 ) var_Y = Math.pow(var_Y,3)
//	else                      var_Y = ( var_Y - 16 / 116 ) / 7.787
//	if ( Math.pow(var_X,3) > 0.008856 ) var_X = Math.pow(var_X,3)
//	else                      var_X = ( var_X - 16 / 116 ) / 7.787
//	if ( Math.pow(var_Z,3) > 0.008856 ) var_Z = Math.pow(var_Z,3)
//	else                      var_Z = ( var_Z - 16 / 116 ) / 7.787
//	var ref_X = 95.047;
//	var ref_Y = 100.000;
//	var ref_Z = 108.883;
//	
//	X = ref_X * var_X     //ref_X =  95.047     Observer= 2°, Illuminant= D65
//	Y = ref_Y * var_Y     //ref_Y = 100.000
//	Z = ref_Z * var_Z     //ref_Z = 108.883
//
//	return [X,Y,Z]
//}
function lab2xyz(lab) {
  var l = lab[0],
      a = lab[1],
      b = lab[2],
      x, y, z, y2;

  if (l <= 8) {
    y = (l * 100) / 903.3;
    y2 = (7.787 * (y / 100)) + (16 / 116);
  } else {
    y = 100 * Math.pow((l + 16) / 116, 3);
    y2 = Math.pow(y / 100, 1/3);
  }

  x = x / 95.047 <= 0.008856 ? x = (95.047 * ((a / 500) + y2 - (16 / 116))) / 7.787 : 95.047 * Math.pow((a / 500) + y2, 3);

  z = z / 108.883 <= 0.008859 ? z = (108.883 * (y2 - (b / 200) - (16 / 116))) / 7.787 : 108.883 * Math.pow(y2 - (b / 200), 3);

  return [x, y, z];
}
var rgb2labCache = [];
var lab2rgbCache = [];
function rgb2lab(rgb){
	var rgb24 = (rgb[0]<<16) + (rgb[1]<<8) + (rgb[2]);
	if(rgb24 in rgb2labCache){
		return rgb2labCache[rgb24];
	}else{
		var xyz = rgb2xyz(rgb);
		var lab = xyz2lab(xyz);
		return rgb2labCache[rgb24] = [lab[0],lab[1],lab[2]]
		//[Math.round(lab[0]),Math.round(lab[1]),Math.round(lab[2])]
	}
}
function lab2rgb(lab){
	var lab24 = lab.join(',');
	if(lab24 in lab2rgbCache){
		return lab2rgbCache[lab24];
	}else{
		var xyz = lab2xyz(lab);
		var rgb = xyz2rgb(xyz);
		return lab2rgbCache[lab24] = [formatRgb(rgb[0]),formatRgb(rgb[1]),formatRgb(rgb[2])]
	}
}
function formatRgb(v){
	var d = Math.round(v);
	if(d>255){
		return 255;
	}else{
		return Math.max(d,0);
	}
}
if(typeof exports == 'object'){
exports.rgb2lab = rgb2lab;
exports.lab2rgb = lab2rgb
}