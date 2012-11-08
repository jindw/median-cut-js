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
/**
 * @param data: rgba list
 */
function Palette(data,width) {
	var i=0;
	var len = data.length;
	var height = len/4/width;
	var rows = [];
	var hitMap = {}
	var data2 = [];
    for (var y = 0; y < height; y++) {
    	var row = [];
        for (var x = 0; x < width; x++) {
            var idx = (width * y + x) << 2;
            var rgba = data.slice(idx,idx+4);
            var lab = ColorSpace.rgb2lab(rgba);
            var key = lab.join(',');
            if(key in hitMap){
            	hitMap[key]++;
            }else{
            	hitMap[key] = 1;
            	data2.push(lab)
            }
            row.push(lab);
        }
        rows.push(row);
    }
    console.log("color count:",data2.length)
    var boxes = this.boxes = [new Box(data2,this)];
    //2/64
    //常见像素细分: 频率优先级中位切分.
    this.minLength = 2
    //最大间隙切分: 最大间隙, 确保不把相差太大的颜色合在一起,貌似没什么用
    this.maxLength = 16
    //最小灰度切分: 最大灰度, 常见渐变.
//    this.minLightLen = 2;
//    this.maxLightLen = 128;
    //最大颜色跨度切分,作用在与优化性能?
    splitByGap(this.boxes,this.maxLength);
    console.log('gap split count:',boxes.length);//,boxes.join('\n'))
    var weightMap = this.weightMap =  buildWeightMap(hitMap,3,128,0.5,0,5)
	var i=boxes.length;
    while(i--){
		var box = boxes[i];
		splitBoxByWeight(box,boxes);
	}
    console.log('weight split count:',boxes.length)
};
/**
 * 函数拟合 
 * @param hitMap 
 * @param min 可忽略最小颜色数
 * @param max 最大颜色数,更大就不计数了.
 * @param pow 指数
 */
function buildWeightMap(hitMap,min,max,pow1,pow2){
	var weightMap = {};
	//var pow = 1/2;//1/2,1/3,1/4,1/5,1/6...
	for(var n in hitMap){
		var v = Math.min(hitMap[n]/max,1); 
		v = Math.pow(v,pow1);
		var nv = v<0.5;
		v = Math.pow(Math.abs(v*2-1),pow2);
		//[0,2]
		v = nv ? 1-v : 1+v;
		v+=1;
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
	//var splitPos = getMaxGapPos(data,axis);
	var splitPos = getMeanPos(data,axis);
	
	
	if(splitPos>0){
		var newData = data.splice(splitPos);
		initBoxWeight(box)
		this._average = null;
		return new Box(newData,box.palette);
	}else{
		console.log(box.data.length,box.data)
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
    var maxWeight = 0;
    while(di--){
    	bounding[di] = [tmp[di],tmp[di]]
    }
    while(i-->0) {
    	di = dim;
    	var d = data[i];
    	var w = weightMap[d.join(',')];
    	if(w>=maxWeight){
    		maxWeights.push(maxWeight = w);
    	}
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
    var w = maxWeights[--i] ;
    w += (maxWeights[--i]/2 ||0);
    w += (maxWeights[--i]/4 ||0);
    w/=1.75;
    
    
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

//function splitByAxisWeight(data,axis,weightMap,result){
//	var i = data.length;
//	var t = 0;
//	var max = weightMap.max;
//	while(i-->0){
//		var lab = data[i];
//		t += weightMap[lab.join(',')]
//		if(t >= max){
//			var v = lab[axis];
//			while(i--){
//				if(data[i][axis]!=v){
//					var newData = data.splice(i+1);
//					result.push(new Box(newData,box.palette));
//					break;
//				}
//			}
//			
//		}
//	}
//}
Palette.prototype ={
	getBox:function(rgb){
		var lab = ColorSpace.rgb2lab(rgb);
		var boxes = this.boxes;
		var i = boxes.length;
		while(i--){
			var box = boxes[i];
			if(box.contains(lab)){
				return box;
			}
		}
		//console.log(rgb,lab)
		//console.log(boxes.length)
	},
	getValue:function(rgb){
		var alab = this.getBox(rgb).getAverage();
		return ColorSpace.lab2rgb(alab)
	}
}

function Box(data,palette) {
	this.data = data;
	this.palette = palette;
	//set: bounding,_longestAxis,_maxLength
	//initBox(this)
	//console.log(this._maxLength,this+'')
	//this._average = null;
}


Box.prototype = {
	getAverage:function(){
		return this._average || (this._average = toAverage(this.data,this.palette.weightMap))
	},
//	getMaxLength : function() {
//        return this._maxLength;
//    },
//	split: function (){
//		var axis = this._maxAxis
//		// Return a comparison function based on a given index (for median-cut,
//		// sort on the longest axis) ie: sort ONLY on a single axis.  
//		// get_comparison_func( 1 ) would return a sorting function that sorts
//		// the data according to each item's Green value.
//		var data = this.data.sort(function(d1,d2){
//			return d1[axis]-d2[axis]
//		})
//		//var splitPos = getMaxGapPos(data,axis);
//		var splitPos = getMeanPos(data,axis);
//		
//		
//		if(splitPos>0){
//			var newData = data.splice(splitPos);
//			initBoxWeight(this)
//			this._average = null;
//			return new Box(newData,this);
//		}
//	},
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
//function calculateBounding(data,di){
//    // keeps running tally of the min and max values on each dimension
//    // initialize the min value to the highest number possible, and the
//    // max value to the lowest number possible
//
//    var i = data.length;
//    var b = data[--i];
//    b = [b[di],b[di]]
//    while(i-->0) {
//    	var v = data[i][di];
//        if(v  < b[0] ){
//        	b[0] = v;
//        }else if(v  > b[1] ){
//        	b[1] = v;
//        }
//    }
//    b[2] = b[1]-b[0]
//    return b;
//}
//
//function getMaxGapPos(data,axis) {
//	var len = data.length;
//	if(len>2){
//		var v1 = data[0][axis];
//		var v2 = data[1][axis];
//		//console.log(v1,axis)
//		var maxGap = Math.abs(v2-v1);
//		var pos = maxGap && 1;
//	    for(var i = 2;i<len;i++) {
//	    	v1 = v2;
//	    	v2 = data[i][axis]
//	        var gap = Math.abs(v2 - v1 );
//	        if( gap > maxGap ) {
//	            var pos = i;
//	        }
//	    }
//	}
//	//console.log('gap:',len,pos)
//    return pos;
//}



//    
//
//    mean_pos = function() {
//
//        // Returns the position of the median value of the data in
//        // this box.  The position number is rounded down, to deal
//        // with cases when the data has an odd number of elements.
//
//        var mean_i,
//            mean = 0,
//            smallest_diff = Number.MAX_VALUE,
//            axis = get_longest_axis().axis,
//            i;
//
//        // sum all the data along the longest axis...
//        for( i = data.length - 1; i >= 0; --i ) { mean += data[i][axis]; }
//        mean /= data.length;
//
//        // find the data point that is closest to the mean
//        for( i = data.length - 1; i >= 0; --i ) {
//            diff = Math.abs( data[i][axis] - mean );
//            if( diff < smallest_diff ) {
//                smallest_diff = diff;
//                mean_i = i;
//            }
//        }
//
//        // return the index of the data point closest to the mean
//
//        return mean_i;
//
//    }


if(typeof exports =='object'){
	exports.Palette = Palette
}
