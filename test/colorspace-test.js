var colorspace1 = require('../colorspace');
var colorspace2 = require('../colorspace2');
function testTime(cs){
	var lab2rgb = cs.lab2rgb;
	var rgb2lab = cs.rgb2lab;
	console.time('step')
	for(var i=0;i<=255;i++){
		console.time('step:'+i)
		for(var j=0;j<=255;j++){
			for(var k=0;k<=255;k++){
				var v = lab2rgb(rgb2lab([i,j,k]))
				//var diff = Math.pow(Math.pow((v[0]-i),2)+Math.pow((v[1]-j),2)+Math.pow((v[2]-k),2),0.5);
				var diff = Math.max(Math.abs(v[0]-i),Math.abs(v[1]-j),Math.abs(v[2]-k))
				if(diff>25){
					console.log([i,j,k],v)
				}
			}
		}
		console.timeEnd('step:'+i)
	}
	console.timeEnd('step')
}
function testCompare(cs1,cs2){
	var lab2rgb1 = cs1.lab2rgb;
	var rgb2lab1 = cs1.rgb2lab;
	var lab2rgb2 = cs2.lab2rgb;
	var rgb2lab2 = cs2.rgb2lab;
	console.time('step')
	for(var i=0;i<=255;i++){
		console.time('step:'+i)
		for(var j=0;j<=255;j++){
			for(var k=0;k<=255;k++){
				var lab1 = rgb2lab1([i,j,k]);
				var lab2 = rgb2lab2([i,j,k]);
				
				var d1 = getDiff(lab1,lab2);
				//var diff = Math.pow(Math.pow((v[0]-i),2)+Math.pow((v[1]-j),2)+Math.pow((v[2]-k),2),0.5);
				if(d1>5){
					console.log(d1,[i,j,k],lab1,lab2)
				}
			}
		}
		console.timeEnd('step:'+i)
	}
	console.timeEnd('step')
}
function getDiff(v1,v2){
	return Math.max(Math.abs(v1[0]-v2[0]),Math.abs(v1[1]-v2[1]),Math.abs(v1[2]-v2[2]))
}
testCompare(colorspace1,colorspace2)