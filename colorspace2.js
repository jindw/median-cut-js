function RGB2Lab(rgb){
    var R = rgb[0]/255;
    var G = rgb[1]/255;
    var B = rgb[2]/255;
    // threshold
    var T = 0.008856;

    var X = R * 0.412453 + G * 0.357580 + B * 0.180423;
    var Y = R * 0.212671 + G * 0.715160 + B * 0.072169;
    var Z = R * 0.019334 + G * 0.119193 + B * 0.950227;

    // Normalize for D65 white point
    X = X / 0.950456;
    Y = Y;
    Z = Z / 1.088754;

    var XT = false; YT=false; ZT=false;
    if(X > T) XT = true;
    if(Y > T) YT = true;
    if(Z > T) ZT = true;

    var Y3 = Math.pow(Y,1/3);
    var fX, fY, fZ;
    if(XT){ fX = Math.pow(X, 1/3);} else{ fX = 7.787 * X + 16/116; }
    if(YT){ fY = Y3; } else{ fY = 7.787 * Y + 16/116 ; }
    if(ZT){ fZ = Math.pow(Z,1/3); } else{ fZ = 7.787 * Z + 16/116; }

    var L; if(YT){ L = (116 * Y3) - 16.0; }else { L = 903.3 * Y; }
    var a = 500 * ( fX - fY );
    var b = 200 * ( fY - fZ );

    return [L,a,b];
}
function Lab2RGB(lab){
    //Thresholds
    var T1 = 0.008856;
    var T2 = 0.206893;

    var X,Y,Z;

    //Compute Y
    var XT = false; YT=false; ZT=false;

    var fY = Math.pow(((lab[0] + 16.0) / 116.0),3);
    if(fY > T1){ YT = true; }
    if(YT){ fY = fY; } else{ fY = (lab[0] / 903.3); }
    Y = fY;

    //Alter fY slightly for further calculations
    if(YT){ fY = Math.pow(fY,1/3); } else{ fY = (7.787 * fY + 16.0/116.0); }

    //Compute X
    var fX = ( lab[1] / 500.0 ) + fY;
    if(fX > T2){ XT = true; }
    if(XT){ X = Math.pow(fX,3); } else{X = ((fX - (16/116.0)) / 7.787); }

    //Compute Z
    var fZ = fY - ( lab[2] / 200.0 );
    if(fZ > T2){ ZT = true; }
    if(ZT){ Z = Math.pow(fZ,3); } else{ Z = ((fZ - (16/116.0)) / 7.787); }

    //Normalize for D65 white point
    X = X * 0.950456;
    Z = Z * 1.088754;

    //XYZ to RGB part
    var R =  3.240479 * X + -1.537150 * Y + -0.498535 * Z;
    var G = -0.969256 * X +  1.875991 * Y +  0.041556 * Z;
    var B =  0.055648 * X + -0.204043 * Y +  1.057311 * Z;

    return [R*255,G*255,B*255];
}
if(typeof exports == 'object'){

var rgb2lab = exports.rgb2lab = RGB2Lab;
var lab2rgb = exports.lab2rgb = Lab2RGB

var linerAlpha = 16;
var opacityAlpha = 100;
exports.rgba2laba = function(rgba){
	var a = rgba[3]
	if(a > 254.5){
		var lab = rgb2lab(rgba);
		lab[3] = opacityAlpha;
	}else{
		var a = a / 255;
		rgba = [
			rgba[0] * a + 255 * (1-a),
			rgba[1] * a + 255 * (1-a),
			rgba[2] * a + 255 * (1-a),
		];
		var lab = rgb2lab(rgba);
		lab[3] = a * linerAlpha;
	}
	return lab;
	
		
}
exports.laba2rgba = function(laba){
	var rgba = lab2rgb(laba);
	var a = laba[3];
	if(a == 0){
		return [255,255,255,0]
	}else if(a + 0.0001 > opacityAlpha){
		rgba = rgba.concat();
		rgba[3] = 255;
	}else{
		a /= linerAlpha;
		rgba = [
			Math.round((rgba[0] - 255 * (1-a))/a),
			Math.round((rgba[1] - 255 * (1-a))/a),
			Math.round((rgba[2] - 255 * (1-a))/a),
			Math.round(a * 255)
		];
	}
	return rgba;
}
}



