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
/**
 * @param data: rgba list
 */
function Palette() {
	this.boxIndex = 0;
	this.colorCache = [];
    //2/64
    //常见像素细分: 频率优先级中位切分.
    this.minLength = 1.5
    //最大间隙切分: 最大间隙, 确保不把相差太大的颜色合在一起,貌似没什么用
    this.maxLength = 64
    this.lightScale = 4;
    //最小灰度切分: 最大灰度, 常见渐变.
	//this.minLightLen = 2;
	//this.maxLightLen = 128;
	
	//用于曲线拟合
	this.maxWeightColor = 400;//512;//1024;//4096;
	//记录总颜色命中数
	this.hitMap = {};
	//记录颜色列表
	this.data = [];
	this.imageData = [];
};
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
	toLabx:function(rgba){
		var lab = ColorSpace.rgb2lab(rgba).concat();
		lab[0] *= this.lightScale;
		return lab;
	},
	fromLabx:function(lab){
		lab = lab.concat();
		lab[0] /= this.lightScale;
		var rgba = ColorSpace.lab2rgb(lab);
		return rgba;
	},
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
				if(box.minLight<=light && box.maxLight>=light){
					if(box.contains(lab)){
						hit =true;
						return box;
					}
					//console.log(Object.keys(box._map))
				}
				
			}
//			console.log(rgb);
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
	getColorCount:function(){
		return this.boxes.length;
	},
	getValue:function(rgba){
		if(rgba[3] ==0){
			return [255,255,255,0]
		}
		var cache = this.colorCache;
		var key = (rgba[0]<<16) | (rgba[1]<<8) | rgba[2] ;
		if(!(key in cache)){
			var alab = this.getBox(rgba).getAverage();
			cache[key] = this.fromLabx(alab)
		}
		return cache[key]
	},
	addImageData:function(data,width,id){
		var i=0;
		var len = data.length;
		var height = len/4/width;
		var rows = [];
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
				//100.38686084751282,-6.456988656574236,-28.244400458791997
				if(rgba[3] != 0){//全透明不算数
					if(rgba[3] != 255){
						var a = rgba[3] / 255;
						rgba = [
							rgba[0] * a + 255 * (1-a),
							rgba[1] * a + 255 * (1-a),
							rgba[2] * a + 255 * (1-a),
							255
						]
					}
		            var lab = this.toLabx(rgba);
		            var key = lab.join(',');
		            if(key in hitMap){
		            	hitMap[key]++;
		            	this.hitMap[key]++;
		            }else{
		            	hitMap[key] = 1;
		            	data2.push(lab)
		            	rgbData.push(rgba)
		            	if(key in this.hitMap){
		            		this.hitMap[key]++;
		            	}else{
		            		hitMap[key] = 1;
		            		this.data.push(lab)
		            	}
		            }
		        }
		        rawData.push(rgba)
	            row.push(lab);
	        }
	        rows.push(row);
	    }
	    //console.log("color count:",data2.length);
	    var i = this.imageData.length;
	    this.imageData[i] = {id:id || i,width:width,height:height,data:data2,rgbData:rgbData,rawData:rawData,hitMap:hitMap}
	},
	cut:function(){
	    var boxes = this.boxes = [new Box(this.data,this)];
	    var hitMap = {};
	    var i = this.imageData.length;
	    while(i--){
	    	var id = this.imageData[i];
	    	var ihm = id.hitMap;
	    	for(var n in ihm){
	    		hitMap[n] = ihm[n] + (hitMap[n] || 0)
	    	}
	    }
	    //最大颜色跨度切分,作用在与优化性能?
	    console.time('gap')
	    splitByGap(this.boxes,this.maxLength);
	    console.timeEnd('gap')
	    console.log('gap split count:',boxes.length);//,boxes.join('\n'))
	    
	    console.time('weight')
	    var weightMap = this.weightMap =  buildWeightMap(hitMap,this.maxWeightColor,0.5,0.5)
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
	    this.boxes.sort(compareByLight);
	    console.timeEnd('sort')
	}
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
//    var w = maxWeights[--i] ;
//    w += (maxWeights[--i]/2 ||0);
//    w += (maxWeights[--i]/4 ||0);
//    w/=1.75;
	maxWeights.sort();
	var ra = 0;
	var r = 1;
	var w = 0;
	while(i--){
		w+=maxWeights[i] * r;
		ra +=r;
		r/=2;
	}
	w = w/ra;
    
    
    var di = dim;
    var axisLength = -1;
    var axis = -1;
    while(di--){
    	var tmp = bounding[di];
    	var len = tmp[2] = tmp[1]-tmp[0]
    	if(len>axisLength){
    		axisLength = len;
    		axis = di
    	}
    }
    box._maxAxis = axis;
    box._maxLength = axisLength;
    //console.log( sw,maxWeights, weightMap)
    //[min/max]
    
    //maxLength & minRate > max ->split
    //minLength & maxRate > min ->split
    // -->
    //weight>max ->split
    //weight = ??
    // axisLength > max - (max-min) * rate ==>
    // axisLength + (max-min)*rate > max
    box._weight = (axisLength + (palette.maxLength  - palette.minLength) * w)*1;
    
}

function compareByLight(box1,box2){
	return getLignt(box1) - getLignt(box2)
}
function getLignt(box){
	var l = box.minLight;
	if(l === undefined){
		var data  = box.data;
		var i = data.length;
		var min = data[--i][0];
		var max = min;
		while(i-->0){
			var v = data[i][0];
			if(v>max){
				max = v;
			}else if(v<min){
				min = v;
			}
		}
		box.maxLight = max;
		return box.minLight = min;
	}
	return l;
}
function Box(data,palette) {
	this.data = data;
	this.palette = palette;
	this.index = palette.boxIndex++
}


Box.prototype = {
	getAverage:function(){
		return this._average || (this._average = toAverage(this.data,this.palette.weightMap))
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
    var result = [0,0,0];//copy
    var dim = result.length;
    while(i--) {
    	var item = data[i];
    	var j = dim;
    	var weight = weightMap[item.join(',')] || 0.001
    	//console.log(weight)
    	a += weight;
    	while(j--){
    		result[j] = result[j] + item[j] * weight;
    	}
    	
    }
    while(dim--){
    	result[dim] = result[dim]/a;
    }
    //console.log(data.length,result)
    return result;
}

if(typeof exports =='object'){
	exports.Palette = Palette
}
