exports.groupTag = groupTag;
/**
 * [{indexMap:{},boxHit:i}]
 */
function groupTag(list,groupIndex){
	//console.log('newGroup',groupIndex)
    var globalIndexMap = {}
	var len = list.length;
    var i=len;
    while(i--){
    	var item = list[i];
    	var iim = item.indexMap;
    	for(var n in iim){
    		globalIndexMap[n] = (globalIndexMap[n]||0) + iim[n];
    	}
    }
    var i=len;
    while(i--){
    	var item = list[i];
    	var iim = item.indexMap;
    	//add shared hit
    	var sharedHit = 0;
    	var colorCount = 0;
    	for(var n in iim){
    		colorCount ++;
    		if(iim[n]<globalIndexMap[n]){
    			sharedHit ++;
    		}
    	}
    	item.sharedHit = sharedHit
    	item.colorCount = colorCount;
    }
    
    //(255-a.colorCount
    list.sort(function(a,b){return a.sharedHit * (255-a.colorCount)-b.sharedHit* (255-b.colorCount)});
	//list.sort(function(a,b){return a.sharedHit * (255/(255+a.colorCount))-b.sharedHit* (255/(255+a.colorCount))});
	doGroup(list.pop(),list,groupIndex ||0);
}
function doGroup(first,list,groupIndex){
	first.groupId = groupIndex;
	var colorCount = first.boxHit;
	var indexMap = copy(first.indexMap,{})
	var maxColorCount = 256
	while(list.length>0 && colorCount<maxColorCount){
		var i = list.length;
		while(i--){
			var item = list[i];
			var newColor = 0;
			for(var n in item.indexMap){
				if(!(n in indexMap)){
					newColor++ 
				}
			}
			item.newColor = newColor;
		}
		
		list.sort(function(a,b){return a.newColor-b.newColor});
		
		newColor = list[0].newColor;
		colorCount+=newColor;
		//console.log(colorCount)
		if(colorCount < maxColorCount){
			copy(item.indexMap,indexMap)
			list.shift().groupId = groupIndex;
		}
	}
	if(list.length){
		groupTag(list,groupIndex+1)
	}
}
function copy(src,target){
	for(var n in src){
		target[n] = src[n]
	}
	return target;
}