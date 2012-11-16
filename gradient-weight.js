var defaultGradientGap = 8;
var defaultMaxGradient = 512;//1024;//1024;//4096//256;//4096;
var defaultMaxHit = 4096;
exports.buildGradientMatrix = buildGradientMatrix;
exports.buildGradientWeightMap = buildGradientWeightMap;
function buildGradientMatrix(matrix,gradientGap){
	var stepGap = gradientGap || defaultGradientGap;
	var allGap = stepGap * 2;
	var width = matrix[0].length;
	var height = matrix.length;
	var infoMatrix = []
	//info:[[dx,-rx,-gx],[dy,-ry,-gy]]
	try{
	for(var y=0,pRow,piRow;
		y<height;
		y++,pRow = row,infoMatrix.push(piRow = ciRow)){
		var row = matrix[y]
		var ciRow = []
		for(var x=0,pc=null,pic;
			x<width;
			x++,pc=cc,ciRow.push(pic=cic)){
			var cc = row[x];
			if(x>0){
				var picx = pic[0];
				var infoX = getGradientInfo(x,cc, pc, picx ,row[picx[2]], stepGap,allGap)
			}else{
				var infoX = [-1,x,x,x,x];
			}
			if(y >0){
				var picy = piRow[x][1];
				var gyc = infoMatrix[picy[2]]
				var infoY = getGradientInfo(y,cc, pRow[x], picy , gyc ,stepGap,allGap)
			}else{
				var infoY = [-1,y,y,y,y];
			}
			cic = [infoX,infoY];
			
		}
	}
	}catch(e){
		console.log('error:',e,x,y,piRow)
		throw e;
	}
	var width = infoMatrix[0].length;
	var height = infoMatrix.length;
	appendMatrixX(infoMatrix,width,height)
	appendMatrixY(infoMatrix,width,height)
	//console.log('matrix0:',infoMatrix[0])
	return infoMatrix;
}
function buildGradientWeightMap(colorMatrix,gradientGap,maxGradient,maxHit){
	var infoMatrix = buildGradientMatrix(colorMatrix,gradientGap)
	var width = colorMatrix[0].length;
	var height = colorMatrix.length;
	var weightMap = {};
	var hitMap = {};
	try{
	for(var y=0;y<height;y++){
		var debug = [];
		var colorRow = colorMatrix[y]
		var infoRow = infoMatrix[y]
		for(var x=0;x<width;x++){
			var color = colorRow[x];
			var info = infoRow[x];
			var key = color.join(',')
			var weight = getWidth(info[0]) * getWidth(info[1]);
			
			//if(isNaN(weight)){
			//	console.log(info)
			//}
			//weight = Math.pow(weight,0.5)
			debug.push(weight);
			if(key in hitMap){
				weightMap[key] = Math.max(weightMap[key],weight)
				hitMap[key]++;
				
			}else{
				hitMap[key] =1;
				weightMap[key] = weight;
			}
		}
		//console.log('row '+y+' weight:',debug.join(','))
		
	}
	}catch(e){
		console.log('error',e,x,y,colorRow)
		throw e;
	}
//	var pow = 4;
//	var pow2 = 1/pow
//	for(var n in weightMap){
//		var v = weightMap[n];
//		var i = v.length;
//		var a = 0;
//		while(i--){
//			a += Math.pow(v[i],pow)
//		}
//		weightMap[n] = Math.pow(a,pow2)
//	}
	weightMap = buildWeightMap(weightMap,maxGradient||defaultMaxGradient,1,null,0.2);
	var hitMapBak =hitMap;
	hitMap = buildWeightMap(hitMap,maxHit||defaultMaxHit,0.5,0.5);
	//weightRate = 0.8
	for(var n in weightMap){
		var weight = weightMap[n];
		
		var hit = hitMap[n];
		if(hitMapBak[n]>100){
		//console.log(hitMapBak[n],weight,hit)
		}
		weightMap[n] = weight * hit ;//
				//weight * weightRate + hit * (1-weightRate);
	}

	///console.log('weight:',result.sort().slice(result.length-3))
	return weightMap;
}
/**
 * return [d,gap,repeatPos,gradientPos]
 */
function getGradientInfo(p,cc, pc, pic ,gc, gradientGap,allGap){
	if(pc == null){return [-1,p,p,p,p];}
	var s = 0;
	var d = 0;
	var i = cc.length;
	while(i--){
		var ro = cc[i] - pc[i];
		var go = gc == null? -1 : cc[i] - gc[i];
		//s += Math.pow(o,2);
		if(ro > gradientGap || go > allGap){
			//console.log(s)
			return [-1,p,p,p,p];
		}
		d = d<<2 | (ro===0?0:ro>0?1:2);
	}
	if(d==0){//同色
		var repeat = pic[1];
		var gradient = pic[2];
	}else{//渐变色
		var repeat = p;
		//console.log(pic[p])
		if(pic[0] == -1 || pic[0] == d){
			var gradient = pic[2]
		}else {
			var gradient = p;
		}
	}
	return [d,repeat,gradient,p,p]
}



function buildWeightMap(xMap,max,pow,powx,powy){
	var yMap = {};
	//var pow = 1/2;//1/2,1/3,1/4,1/5,1/6...
	for(var n in xMap){
		var v = Math.min(xMap[n]/max,1); 
		//console.log(v,powx)
		v = powx?Math.pow(v,powx):v;
		//console.log(hitMap[n],v)
		var nv = v<0.5;
		v = Math.pow(Math.abs(v*2-1),pow);
		//[0,1]
		v = (nv ? 1-v : 1+v)/2;
		yMap[n] = powy?Math.pow(v,powy):v; 
		//hitMap[n];//
	}
	return yMap;
}
/**
 * @param infox [dx,-rx,-gx,rx,gx]
 */
function getWidth(infox){
	//console.log((infox[4] - infox[2]) - (infox[3] - infox[1])/2)
	//console.log(infox)
	var w = (infox[4] - infox[2]) - (infox[3] - infox[1])/2;
	//console.log(w)
	return w>=2?w:0;
}
function appendMatrixX(matrix,width,height){
	var y = height;
	while(y--){
		var row = matrix[y]
		var x=width;
		var gp = width;//append +gx
		while(x--){
			var cell = row[x];//[[dx,-rx,-gx],[dy,-ry,-gy]]
							  //->[[dx,-rx,-gx,rx,gx],[dy,-ry,-gy,ry,gy]]
			//append rx,gx
			var info= cell[0];
			var d = info[0];
			if(d >=0){
				//console.log('gradient!!!')
				//repeat
				var gp2 = info[2];
				if(gp2 < gp){//gradient 步长一定 大于等于 repeat 步长
					gp = gp2;
					for(var i = gp;i<x;i++){
						var pcell = row[i][0];
						pcell[4] = x;
					}
				}
				if(d==0){
					//repeat
					var rp = info[1];
					for(var i = rp;i<x;i++){
						var pcell = row[i][0];
						pcell[3] = x;
					}
					x = rp;
				}
			}
		}
	}
}
function appendMatrixY(matrix,width,height){
	var x=width;
	while(x--){
		var y = height;
		var gp = width;//append +gx
		while(y--){
			var row = matrix[y]
			var cell = row[x];//[[dx,-rx,-gx],[dy,-ry,-gy]]
							  //->[[dx,-rx,-gx,rx,gx],[dy,-ry,-gy,ry,gy]]
			//append rx,gx
			var info= cell[1];
			var d = info[0]
			if(d>=0){
				//gradient 步长一定 大于等于 repeat 步长
				var gp2 = info[2];
				if(gp2 < gp){
					gp = gp2;
					for(var i = gp;i<y;i++){
						//var pcell = row[i][0];
						var pcell = matrix[i][x][1];
						pcell[4] = y;
					}
				}
				if(d === 0){//repeat
					var rp = info[1];
					for(var i = rp;i<y;i++){
						//var pcell = row[i][0];
						var pcell = matrix[i][x][1];
						pcell[3] = y;
					}
					y = rp;
				}
			}
		}
	}
}
