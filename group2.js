exports.groupTag = groupTag;
var inc = 0;
/**
 * [{indexMap:{},boxHit:i}]
 */
function groupTag(list,groupIndex){
	inc = 0;
	var groups = list.map(function(item){return {list:[item],map:copy(item.indexMap,{}),cache:{},id:inc++}});
	var pp;
	while(pp = getClosest(groups)){
		try{
		var item = groups[pp[0]];
		var item2 = groups.splice(pp[1],1)[0];
		item.list = item.list.concat(item2.list);
		item.cache = {};
		item.id = inc++;
		copy(item2.map,item.map)
		}catch(e){
			console.log(pp,groups.length,item==null,item2);
			throw e;
		}
	}
	var i = groups.length;
	while(i--){
		var group = groups[i];
		var list = group.list;
		var j = list.length;
		while(j--){
			list[j].groupId = (groupIndex || 0) + i;
		}
		
	}
}
function getClosest(groups){
	var len = groups.length;
	var i = len;
	var rate = 0;
	var closest = null;
	while(i--){
		var j = i;
		var group1 = groups[i];
		var map1 = group1.map;
		var cache = group1.cache;
		inner: while(j-->0){
			var group2 = groups[j];
			var map2 = group2.map;
//			var rate2 = cache[group2.id];
//			if(rate2 !=null){
//				if(rate2>rate || rate == null){
//					rate = rate2;
//					closest = [j,i];
//					continue;
//				}
//			}
			var all = {};
			var c1 = 0;
			var c2 = 0;
			var cs = 0;//share count
			for(var n in map1){
				c1++;
				all[n]=1;
			}
			var ca = c1;
			for(var n in map2){
				c2++;
				if(all[n]){
					cs++;
				}else{
					ca++;
					all[n]=1;
					if(ca>=255){
						cache[group2.id] = -1;
						continue inner;
					}
				}
			}
			var rate2 = Math.max(c1,c2)/ca;
			if(rate2 > 0.9){
				return [j,i]
			}
			rate2 = rate2 * Math.pow(255/(255+ca),1);
			if(rate2>rate || rate == null){
				rate = rate2;
				cache[group2.id] = rate;
				closest = [j,i]
				//return closest;
			}
			
		}
	}
	return closest;
}
function copy(src,target){
	for(var n in src){
		target[n] = src[n]
	}
	return target;
}