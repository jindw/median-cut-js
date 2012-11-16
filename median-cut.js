 /**************************************************************************
  * This file is part of median-cut.js                                     *
  *                                                                        *
  * median-cut.js is free software: you can redistribute it and/or modify  *
  * it under the terms of the GNU General Public License as published by   *
  * the Free Software Foundation, either version 3 of the License, or      *
  * (at your option) any later version.                                    *
  *                                                                        *
  * median-cut.js is distributed in the hope that it will be useful,       *
  * but WITHOUT ANY WARRANTY; without even the implied warranty of         *
  * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the          *
  * GNU General Public License for more details.                           *
  *                                                                        *
  * You should have received a copy of the GNU General Public License      *
  * along with median-cut.js.  If not, see <http://www.gnu.org/licenses/>. *
  **************************************************************************/


//  This is the median-cut algorithm.
//  
//  1. Find the smallest box which contains all the colors in the image.
//  
//  2. Sort the enclosed colors along the longest axis of the box.
//  
//  3. Split the box into 2 regions at median of the sorted list.
//  
//  4. Repeat the above process until the original color space has been divided
//     into N regions where N is the number of colors you want.
//	

var ColorSpace = require('./colorspace');
var groupTag = require('./group').groupTag
var buildGradientWeightMap = require('./gradient-weight').buildGradientWeightMap
/**
 * @param data: rgba list
 */
function Palette() {
	this.boxIndex = 0;
	this.colorCache = [];
    //2/64
    //常见像素细分: 频率优先级中位切分.
    this.minLength = 1.5;//1.5
    //最大间隙切分: 最大间隙, 确保不把相差太大的颜色合在一起,貌似没什么用
    this.maxLength = 48;
    this.lightScale = 2;//1.5;//4;
    //最小灰度切分: 最大灰度, 常见渐变.
	//this.minLightLen = 2;
	//this.maxLightLen = 128;
	
	//用于曲线拟合
	this.maxWeightColor = 4096;//512;//1024;//4096;
	//记录颜色列表
	this.data = [];
	this.imageData = [];
};
function compileFirst(a,b){return a[0]-b[0]}
var boxFindInc = 0;
Palette.prototype ={
	group:function(){
		console.time('group')
		var imageData = this.imageData;
		var len = imageData.length;
	    //compule box hit map
	    var i=len;
	    while(i--){
	    	var item = imageData[i];
	    	var rawData = item.rgbData;
	    	var j = rawData.length;
	    	var indexMap = {};
	    	var boxHit = 0;
	    	while(j--){
	    		var bc = this.getValue(rawData[j]);
	    		bc = (((bc[0]<<16)|(bc[1]<<8)|bc[2])<<8)|(bc[3]||0)
	    		indexMap[bc] =(indexMap[bc]||(boxHit++) && 0) + 1;;
	    	}
	    	item.indexMap = indexMap;
    		item.boxHit = boxHit;
	    }
	    groupTag(imageData.concat())
	    var result = {};
	    var i=len;
	    while(i--){
	    	var item = imageData[i];
	    	var key = item.groupId;
	    	if(result[key]){
	    		result[key].push(item)
	    	}else{
	    		result[key] = [item]
	    	}
	    	
	    }
	    console.timeEnd('group')
	    return result;
	    //console.log(imageData.map(function(d){return [d.groupId]}).join(','))
	},
	toLabx:ColorSpace.rgba2laba,
	//toLabx:function(a){return [a[0],a[1],a[2],a[3]]},
//	function(rgba){
//		//lab[0] *= this.lightScale;
//		return ColorSpace.rgba2laba(rgba);
//	},
	fromLabx:ColorSpace.laba2rgba,
	//fromLabx:function(a){return [a[0],a[1],a[2],a[3]]},
//	function(lab){
//		//lab[0] /= this.lightScale;
//		var rgba = ColorSpace.laba2rgba(lab);
//		return rgba;
//	},
	getBox:function(rgb){
		//console.time('getBoxTime')
		var hit = false;
		try{
			var lab = this.toLabx(rgb);
			var light = lab[0];
			var boxes = this.boxes;
			var i = boxes.length;
			if(i==0){
				return boxes[0]
			}
			while(i--){
				var box = boxes[i];
				//if(box.minLight<=light && box.maxLight>=light){
					if(box.contains(lab)){
						hit =true;
						return box;
					}
					//console.log(Object.keys(box._map))
				//}
				
			}
			console.log('error: get box failed!!',rgb);
		}catch(e){
			console.log('!!!!',e)
		}finally{
//			if(boxFindInc == 0){
//				console.timeEnd('getBoxTime')
//				console.time('getBoxTime2')
//			}else if(boxFindInc == 10){
//				console.timeEnd('getBoxTime2')
//			}
//			boxFindInc++
//			
//			if(!hit){
//			var i = boxes.length;
//			console.log('lab:',lab.join(','),i,hit)
//			while(i--){
//				var b = boxes[i];
//				var data = b.data;
//				var j = data.length;
//				while(j--){
//					var d = data[j];
//					if(d[1] == lab[1] && d[2] == lab[2]){
//						//console.log(d[0],lab[0])
//					}
//				}
//			}
//			console.log('error!!!!')
//			throw new Error();
//			}
		}
		//console.log(rgb,lab)
		//console.log(boxes.length)
	},
	getNeaestBox:function(rgb,count){
		try{
			var lab = this.toLabx(rgb);
			var light = lab[0];
			var boxes = this.boxes;
			var len = boxes.length;
			var maxDistance = Math.pow(this.maxLength,2);
			var minDistance = Math.pow(this.minLength/4,2);
			var distance = maxDistance;
			
			if(len==1){
				return boxes[0]
			}
			var begin = 0;
			var end = len;
			//二分法
			while(true){
				var center2 = (begin + end)>>1;
				if(center2 == begin){
					break;
				}else{
					var center = center2;
					var box = boxes[center];
					var lab2 = box.getAverage();
					var l2 = lab2[0];
					if(l2==light){
						break;
					}else if(l2>light){
						end = center;
					}else if(l2<light){
						begin = center;
					}
				}//,'!!!',lab2
			}
			var distance2 = getDistance2(lab2,lab,distance)
			var neaest = [];
			if(distance2 >=0){
				if(distance2 <= minDistance){
					return box;
				}
				neaest.push([distance2,center]);
				distance = Math.min(distance,distance2*16);
			}
			
			//console.log(distance,count)
			
//			while(center--){
//				var box = boxes[center];
//				var lab2 = box.getAverage();
//				if(lab2[0]<=light){
//					distance = getDistance2(lab2,lab,distance)
//					neaest = center;
//					debug.push([distance,lab2.map(Math.ceil),lab.map(Math.ceil)])
//					break;
//				}
//			}
			var maxLast = (count-1) || 5;
			var currentLast = neaest.length-1;
			var i = center;
			//console.log(l2 -light)
			//dithering
			while(i-->0){
				var box = boxes[i];
				var lab2 = box.getAverage();
				var distance2 = getDistance2(lab2,lab,distance);
				if(distance2>=0){
					if(distance2 <= minDistance){
						return box;
					}
					distance = Math.min(distance,distance2*16);
					neaest[++currentLast] = [distance2,i];
					if(currentLast>=maxLast){
						neaest.sort(compileFirst)
						if(currentLast>maxLast){
							neaest.pop();
							--currentLast
						}
						distance = Math.min(neaest[currentLast][0],distance);
					}
				}else if(distance2===-2){
					break;
				}
			}
			distance = Math.min(distance*16,maxDistance)
			//dithering
			while(++center<len){
				var box = boxes[center];
				var lab2 = box.getAverage();
				var distance2 = getDistance2(lab2,lab,distance);
				if(distance2>=0){
					if(distance2 <= minDistance){
						return box;
					}
					distance = Math.min(distance,distance2*16);
					neaest[++currentLast] = [distance2,center];
					if(currentLast>=maxLast){
						neaest.sort(compileFirst)
						if(currentLast>maxLast){
							neaest.pop();
							--currentLast;
						}
						distance = Math.min(neaest[currentLast][0],distance);
					}
				}else if(distance2===-2){
					break;
				}
			}
			if(currentLast <0){
				console.error('not found!!!!')
				throw new Error();
			}
			//if(distance>100){
				//console.log(debug.pop()[0],getDistance2(this.getBox(rgb).getAverage(),lab,Number.MAX_VALUE))
				//throw new Error('!!!!!')
			//}
			//console.log(neaest)
			neaest.sort(compileFirst)
			
//			if(lab[0] === 45.928149142389636){
//				var p  = neaest[0][1];
//				var lab2 = boxes[p].getAverage();
//				var dis = getDistance2(lab2,lab,Number.MAX_VALUE)
//				console.log(lab,neaest,dis);//boxes[neaest[0][1]],neaest[0][0])
//			}
			//console.log('errpr',,distance0,lab0);
			return new DitheringBox(boxes,neaest,lab)
		//}catch(e){
		//	console.log('!!!!',e)
		}finally{

		}
	},
	getColorCount:function(){
		return this.boxes.length;
	},
	getCacheBox:function(rgba){
		if(rgba[3] == 0){
			return [255,255,255,0]
		}
		var cache = this.colorCache;
		var key = (((rgba[0]<<16) | (rgba[1]<<8) | rgba[2])<<8) | (rgba[3] ||0) ;
		if(key in cache){
			return cache[key];
		}
		return cache[key] =  this.getNeaestBox(rgba);
		
	},
	getDitheringValue:function(rgba,topColor){
		if(rgba[3] == 0){
			return [255,255,255,0]
		}
		var box = this.getCacheBox(rgba);
		var labx = box.getDitheringAverage(topColor);
		//console.log(alab,rgba)
		return this.fromLabx(labx);
		
	},
	getValue:function(rgba){
		if(rgba[3] == 0){
			return [255,255,255,0]
		}
		var labx = this.getCacheBox(rgba).getAverage();
		//console.log(alab,rgba)
		return this.fromLabx(labx).slice(0)
	},
	addImageData:function(data,width,id){
		var len = data.length;
		var height = len/4/width;
		var matrix = [];
		var hitMap = {}
		var rgbData = [];
		var data2 = [];
		var rawData = []
	    for (var y = 0; y < height; y++) {
	    	var row = [];
	        for (var x = 0; x < width; x++) {
	            var idx = (width * y + x) << 2;
	            var rgba = data.slice(idx,idx+4);
	            //
				var alpha = rgba[3];
//				if(alpha <255){
//					rgba[0] = Math.round(rgba[0] * alpha + 255*(1-alpha))
//					rgba[1] = Math.round(rgba[1] * alpha + 255*(1-alpha))
//					rgba[2] = Math.round(rgba[2] * alpha + 255*(1-alpha))
//					rgba[3] = alpha = 255;
//				}
	            if(alpha == 0){
	            	rgba[0] = rgba[1] =rgba[2] = 255;
	            }
	            var lab = this.toLabx(rgba);
				//if(alpha != 0){//全透明不算数
	            var key = lab.join(',');
	            

	            if(key in hitMap){
	            	if(alpha){
	            		hitMap[key]++;
	            	}
	            }else{
	            	rgbData.push(rgba);
	            	if(alpha){
		            	hitMap[key] = 1;
		            	data2.push(lab)
		            	if(!(key in (this._colorMap || (this._colorMap = {})))){
		            		this._colorMap[key]=1;
		            		this.data.push(lab)
		            	}
	            	}
	            }
		        //}
		        rawData.push(rgba);
	            row.push(lab);
	        }
	        matrix.push(row);
	    }
	    //var repeatWeight = 
	    //console.log("color count:",data2.length);
	    var i = this.imageData.length;
	    //console.log(rawData)
	    this.imageData[i] = {id:id || i,width:width,height:height,data:data2,rgbData:rgbData,rawData:rawData,hitMap:hitMap,matrix:matrix}
	},
	buildWeightMap:function(){
		var hitMap = {};
	    var i = this.imageData.length;
	    while(i--){
	    	var id = this.imageData[i];
	    	var ihm = id.hitMap;
	    	for(var n in ihm){
	    		hitMap[n] = Math.max(ihm[n] , (hitMap[n] || 0));
	    	}
	    }
	    var weightMap = buildWeightMap(hitMap,this.maxWeightColor,0.5,0.2);
	    for(var n in hitMap){
	    	//console.log(hitMap[n],weightMap[n])
	    }
	    return weightMap;
	},
	buildWeightMap2:function(){
		var weightMap = {};
		var hitMap = {};
	    var i = this.imageData.length;
	    while(i--){
	    	var id = this.imageData[i];
	    	var iWeightMap = buildGradientWeightMap(id.matrix);
	    	for(var n in iWeightMap){
	    		weightMap[n] = Math.max(iWeightMap[n] , (weightMap[n] || 0));
	    	}
	    	var ihm = id.hitMap;
	    	for(var n in ihm){
	    		hitMap[n] = Math.max(ihm[n] , (hitMap[n] || 0));
	    	}
	    }
	    var c = 0;
	    for(var n in weightMap){
	    	if(isNaN(hitMap[n])){
	    		//console.log(hitMap[n],weightMap[n],n)
	    	}
	    	c++;
	    }
	    //console.log(c,Object.keys(hitMap).length, Object.keys(this._colorMap ).length)
	    return weightMap;
	},
	cut:function(){
	    var boxes = this.boxes = [new Box(this.data,this)];
	    
	    //最大颜色跨度切分,作用在与优化性能?
	    console.time('gap')
	    splitByGap(this.boxes,this.maxLength);
	    console.timeEnd('gap')
	    console.log('gap split count:',boxes.length);//,boxes.join('\n'))
	    
	    console.time('weight')
	    

	    var weightMap = this.buildWeightMap();
	    
	    this.weightMap = weightMap;
	    for(var k in weightMap){
	    	//console.log(hitMap[k],weightMap[k])
	    }
		
		var i=boxes.length;
	    while(i--){
			var box = boxes[i];
			splitBoxByWeight(box,boxes);
		}
	    console.timeEnd('weight')
	    console.log('weight split count:',boxes.length);
	    
	    console.time('sort')
	    boxes.sort(compareByLight);
	    console.timeEnd('sort')
//	    var i=boxes.length;
//	    while(i--){
//			var box = boxes[i];
//			var s = box.bounding;
//			if(!s){
//				initBoxWeight(box);
//				s = box.bounding;
//			}
//			s = s[3];
//			if(s[2]){
//				//console.log(s)
//			}
//			//console.log(box.data)
//		}
		console.log('color count:',boxes.length)
	    //console.log(this.getValue([255,255,255,255]))
	}
}

function getDistance2(lab,lab2,max){
	var i = lab.length;
	var d = lab[0]-lab2[0];
	var a = d*d;
	if(a>max){
		return -2;
	}
	while(--i){
		d = lab[i] - lab2[i];
		a += d*d;
		if(a>max){
			return -1;
		}
	}
	return a;
}
/**
 * 函数拟合 
 * @param hitMap 
 * @param min 可忽略最小颜色数
 * @param max 最大颜色数,更大就不计数了.
 * @param pow 曲线指数 1 为直线, 2为2次曲线变形(末端变化敏感),0.5为开方曲线变形(中间变化敏感)
 * @param powx x轴变形指数 1:不变形,2:右拉曲线,0.5:左拉曲线(左端更敏感)
 */
function buildWeightMap(hitMap,max,pow,powx){
	var weightMap = {};
	//var pow = 1/2;//1/2,1/3,1/4,1/5,1/6...
	for(var n in hitMap){
		var v = Math.min(hitMap[n]/max,1); 
		//console.log(v,powx)
		v = Math.pow(v,powx);
		//console.log(hitMap[n],v)
		var nv = v<0.5;
		v = Math.pow(Math.abs(v*2-1),pow);
		//[0,2]
		v = nv ? 1-v : 1+v;
		//[0,1]
		weightMap[n] = v / 2 
		//hitMap[n];//
	}
	return weightMap;
}
//maxLen 如何量化到颜色中去?
function splitByGap(boxes,gap){
	var sample = boxes[0].data[0];
	var dim = sample.length;
	//console.log(dim,gap)
	while(dim--){
		var i=boxes.length;
		while(i--){
			var box = boxes[i];
			splitByAxisGap(box,dim,gap,boxes);
		}
	}
}

function splitByAxisGap(box,axis,gap,result){
	var data = box.data.sort(function(d1,d2){
		return d1[axis]-d2[axis]
	});
	box._sortAxis = axis;
	//console.log(data)
	var i = data.length;
	var v1 = data[--i][axis];
	while(i-->0){
		var v2 = data[i][axis];
		//console.log(v2-v1)
		if(v1-v2>gap){
			var newData = data.splice(i+1);
			result.push(new Box(newData,box.palette))
			v1 = v2;
		}
	}
}

function splitBoxByWeight(box,result){
	initBoxWeight(box);
	var maxWeight = box.palette.maxLength;
	//console.log(box._weight, maxWeight)
	while(box._weight> maxWeight){
		var newBox = splitByMaxAxis(box);
		result.push(newBox);
		splitBoxByWeight(newBox,result);
		initBoxWeight(box);
	}
}
function splitByMaxAxis(box){
	var axis = box._maxAxis
	// Return a comparison function based on a given index (for median-cut,
	// sort on the longest axis) ie: sort ONLY on a single axis.  
	// get_comparison_func( 1 ) would return a sorting function that sorts
	// the data according to each item's Green value.
	var data = box.data.sort(function(d1,d2){
		return d1[axis]-d2[axis]
	})
	
	box._sortAxis = axis;
	//var splitPos = getMaxGapPos(data,axis);
	var splitPos = getMeanPos(data,axis);
	
	
	if(splitPos>0){
		var newData = data.splice(splitPos);
		initBoxWeight(box)
		this._average = null;
		var newBox = new Box(newData,box.palette);
		newBox._sortAxis = axis;
		return newBox;
	}else{
		//console.log(box.data.length,box.data)
		throw new Error('can not split 0 width axis');
	}
}
function getMeanPos(data,axis) {
	var len = data.length;
	if(len>=2){
		var minDiff = Number.MAX_VALUE;
		var mean = 0;
		var i = len;
		while(i--){mean +=data[i][axis];}
		mean /=len;
	    for(i=1;i<len;i++) {
	    	var v = data[i][axis];
	        var diff = Math.abs(v - mean );
	        if( diff < minDiff ) {
	        	minDiff = diff;
	            var pos = i;
	        }
	    }
	}
	//console.log('mean:',mean,[diff,minDiff],len,pos)
    return pos;
}

//set: bounding,_longestAxis,_maxLength
function initBoxWeight(box){
	var palette = box.palette;
	var weightMap = palette.weightMap;
	var data = box.data;
	var bounding = box.bounding = [];
	var dim = box.dim = data[0].length;
	var i = data.length;
	var di = dim;
    var tmp = data[--i];
    var maxWeights = [];
//    var maxWeight = 0;
    while(di--){
    	bounding[di] = [tmp[di],tmp[di]]
    }
    while(i-->0) {
    	di = dim;
    	var d = data[i];
    	var w = weightMap[d.join(',')];
    	maxWeights.push(w);
//    	if(w>=maxWeight){
//    		maxWeights.push(maxWeight = w);
//    	}
    	while(di--){
    		tmp = bounding[di];
    		var v = d[di];
        	if(v  < tmp[0] ){
        		tmp[0] = v;
       		}else if(v  > tmp[1] ){
        		tmp[1] = v;
        	}
    	}
    }
    var i = maxWeights.length;
	maxWeights.sort();
	var ra = 0;
	var r = 1;
	var w = 0;
	while(i--){
		var r2 = Math.min(r,1);
		w+=maxWeights[i] * r2;
		ra += r2;
		r/=2;
	}
	w = w/ra;
    
    
    var di = dim;
    var tmp = bounding[0];
    var axisLength = Math.pow(tmp[2] = (tmp[1]-tmp[0])* palette.lightScale,2);
    var axis = 0;
    var len2 = axisLength * axisLength;
    while(--di){
    	var tmp = bounding[di];
    	var len = tmp[2] = tmp[1]-tmp[0]
    	len2 += len*len;
    	if(len>axisLength){
    		axisLength = len;
    		axis = di
    	}
    }
//    if(axis == 3){
//    	console.log('!!!!')
//    }
    box._maxAxis = axis;
    axisLength = box._maxLength = Math.pow(len2,0.5);
    //console.log( sw,maxWeights, weightMap)
    //[min/max]
    
    //maxLength & minRate > max ->split
    //minLength & maxRate > min ->split
    // -->
    //weight>max ->split
    //weight = ??
    // axisLength > max - (max-min) * rate ==>
    // axisLength + (max-min)*rate > max
    box._weight = (axisLength + (palette.maxLength  - palette.minLength) * w);
    
}

function compareByLight(box1,box2){
	var a1 = box1.getAverage();
	var a2 = box2.getAverage();
	return a1[0] - a2[0];
	//return getLight(box1) - getLight(box2)
}
//function getLight(box){
//	var l = box.minLight;
//	if(l === undefined){
//		var data  = box.data;
//		var i = data.length;
//		var min = data[--i][0];
//		var max = min;
//		while(i-->0){
//			var v = data[i][0];
//			if(v>max){
//				max = v;
//			}else if(v<min){
//				min = v;
//			}
//		}
//		box.maxLight = max;
//		return box.minLight = min;
//	}
//	return l;
//}
function Box(data,palette) {
	this.data = data;
	this.palette = palette;
	this.index = palette.boxIndex++
}
function DitheringBox(boxes,neaest,lab){
	var first = neaest[0];
	var distance0 = first[0];
	var minDistance = distance0;
	var lab0 = this._average = boxes[first[1]].getAverage();
	var ditheringLab = null;
	var ditheringScale = 0;
	
	var len=neaest.length;
	for(var i=1;i<len;i++){
		var n = neaest[i];
		var lab2 = boxes[n[1]].getAverage();
		var distance2 = n[0];
		var scale = Math.round(Math.pow(distance2,0.5)/Math.pow(distance0,0.5));
		if(scale!=1 && scale!=2
		// && scale!=3 && scale!=4
		){
			continue;
		}
		var di = lab2.length;
		var average = []
		while(di--){
			average[di] = (lab0[di]*scale + lab2[di])/(1+scale)
		}
		
		var distance = getDistance2(lab,average,minDistance);
		if(distance >=0 && distance<minDistance && distance < distance0*2){
			minDistance = distance
			ditheringLab = lab2;
			ditheringScale = scale;
		}
	}
	//console.log(ditheringScale,lab,lab0,ditheringLab)
	this.lab = lab0;
	this.ditheringLab = ditheringLab;
	this.ditheringScale = ditheringScale;
	this.index = 0;
	if(ditheringLab){
	var diff = getDistance2(lab,ditheringLab,minDistance)
	if(diff>=0 && diff>24 ){
		console.log(diff)
		console.log(lab,lab0,ditheringLab,average)
	}
	}
	//this.repeat = 0;
	
}
DitheringBox.prototype = {
	getDitheringAverage:function(diff){
		//1,0:0,1,1
		var dlab = this.ditheringLab;
		if(dlab && (this.index++>=this.ditheringScale)){
			var r = Math.random();
			//this.index = r >0.9?this.index-1:r<0.1?1:0;
			this.index = 0;
			var result = dlab;
		}else{
			var result = this.lab
		}
		//console.log(dlab == result)
//		if(result == result){
//			scale++;
//		}
//return this.lab;
		return result;
	},
	getAverage:function(){
		return this._average;
	}
}
Box.prototype = {
	getAverage:function(){
		return this._average || (this._average = toAverage(this.data,this.palette.weightMap))
	},
	getDitheringAverage:function(){
		return this.getAverage();
	},
	contains:function(value){
		if(!this._map){
			var i = this.data.length;
			var map = {};
			while(i--){
				map[this.data[i]] = true;
			}
			this._map = map;
		}
		return String(value) in this._map;
	},
	toString:function(){
		return this.data.length;
		this.contains('');
		return this._average+':'+this._maxLength+JSON.stringify(Object.keys(this._map))
	}
}
function toAverage(data,weightMap){
    var i = data.length;
    var a = 0;
    var result = [0,0,0,0];//copy
    var dim = result.length;
    while(i--) {
    	var item = data[i];
    	var j = dim;
    	var weight = weightMap[item.join(',')];
    	weight = weight * weight || 0.000000001
    	//console.log(weight)
    	a += weight;
    	while(j--){
    		result[j] = result[j] + item[j] * weight;
    	}
    	
    }
    while(dim--){
    	result[dim] = result[dim]/a;
    }
    //console.log(data[0].length,result.length,result)
    return result;
}

if(typeof exports =='object'){
	exports.Palette = Palette
}
