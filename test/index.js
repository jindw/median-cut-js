var fs = require('fs'),
    PNG = require('pngjs').PNG;
var Palette = require('../median-cut').Palette
var Packer = require('../packer').Packer;
var ColorSpace = require('../colorspace');
var async = require('async')
async.concat([__dirname+'/tiny',__dirname+'/icon' ,__dirname+'/icon1',__dirname+'/icon2'/*,__dirname+'/icon8' ,*/
//,__dirname+'/icon3' ,__dirname+'/icon4'//,__dirname+'/icon5' ,__dirname+'/icon6' ,__dirname+'/icon7'
],function(path,callback){
	fs.readdir(path,function(err,files){
		files = files.map(function(f){return path+'/'+f});
		files = files.filter(function(f){return /\.png$/.test(f)})
		//console.log(files)
		callback(null,files);
	})
},function(err,files){
	async.map(files,function(file,callback){
		try{
			//console.log(file)
    	fs.createReadStream(file)
    	.pipe(new PNG({
     		filterType: 4
    	}))
    	.on('parsed', function() {
    		this.file = file;
    		callback(null,this)
    	});
		}catch(e){
			console.log(e,file)
		}
	},
	function(err,pngs){
		var palette = new Palette();
		var i = pngs.length;
		while(i--){
			var png = pngs[i];
    		palette.addImageData(png.data,png.width,png.file)
		}
    	palette.cut();
    	//if(palette.boxes.length>255){
    	var result = palette.group(255);
    	//console.dir(result)
    	//}
    	//var all = []
    	for(var n in result){
    		var dataList = result[n];
    		//all.push.apply(all,dataList);
    		console.time('write:'+n);
			writePngs(palette,dataList,__dirname+'/out/'+dataList[0].groupId+'.png');
			writePngs(palette,dataList,__dirname+'/out/'+dataList[0].groupId+'_s.png',true);
    		console.timeEnd('write:'+n);
    	}
    	//writePngs(palette,all,__dirname+'/out/source.png',true);
	})
});
function writePngs(palette,pngs,path,source){
	var gap = 10;
	var i = pngs.length;
	var blocks = [];
	var packer = new Packer();
	while(i--){
		var png = pngs[i]
		var width = png.width+gap;
		var height = png.height+gap;
		blocks.push({w:width,h:height,png:png,space:width*height})
	}
	blocks.sort(function(a,b){return b.space-a.space})
	console.log(blocks[0].w,blocks[0].h)
	packer.fit(blocks);
	var root = packer.root;
	var out = new PNG({width:root.w,height:root.h});
	var data = out.data;
	var i = data.length;
	while(i>0){
		data[--i] = 0;
		data[--i] = 255;
		data[--i] = 255;
		data[--i] = 255;
	}
	var i = blocks.length;
	//console.log(path)
	while(i--){
		var block = blocks[i];
		var png = block.png;
		var rawData = png.rawData;
		var pngWidth = png.width;
		var offsetRight = (out.width - pngWidth) * 4;
		if(!block.fit){
			console.log(i,block.fit)
			continue;
		}
		var x = block.fit.x;
		var y = block.fit.y;
		//console.log(x,y,rawData)
		var p = (x + y * out.width)*4;
		
		//console.log(p%(outWidth*4))
		for(var j = 0;j<rawData.length;j++){
			//console.log('png:',rawData[j])
			var rgba = source?rawData[j]:palette.getDitheringValue(rawData[j])//
			if(i==0 && j == 27){
				var r = rawData[j];
				var t = rgba;
				
				
				/*
[ 45.928149142389636, 71.65700950601139, 60.127706781821765, 100 ] [ 45.22431717
7275154,
  0.002776469982423979,
  -0.0054933964708459015,
  100 ]
				 */
				//console.log(ColorSpace.rgba2laba(r),ColorSpace.rgba2laba(t))
			}
//			if(j == pngWidth * 4 + 2){
//				console.log('weight:',rgba,rawData[j],
//				palette.getBox(rawData[j]).getAverage(),
//				palette.getValue(rawData[j]))
//			}
			if(j && (j % pngWidth == 0)){
				p+=offsetRight;
				//console.log(p%(outWidth*4))
			}
			data[p++] = rgba[0];
    		data[p++] = rgba[1];
    		data[p++] = rgba[2];
    		data[p++] = rgba[3] >=0 ? rgba[3]: 255;
		}
		//png.bitblt(out, 0, 0, png.width, png.height, 0, tops[i])
	}
	out.pack().pipe(fs.createWriteStream(path));
}
//function writePngs2(palette,pngs,path){
//	var width = 0;
//	var height = 0;
//	var tops = [];
//	var gap = 10;
//	var i = pngs.length;
//	while(i--){
//		var png = pngs[i]
//		width = Math.max(width,png.width);
//		tops.push(height);
//		height += png.height;
//		if(i){
//			height += gap;
//		}
//		//console.log(png.width,png.height)
//	}
//	//console.log(tops[tops.length-1],height)
//	var out = new PNG({width:width,height:height});
//	var i = pngs.length;
//	var data = out.data;
//	while(i--){
//		var png = pngs[i];
//		var rawData = png.rawData;
//		var pngWidth = png.width;
//		var offsetRight = (width - pngWidth) * 4;
//		var x = 0;
//		var y = tops[i];
//		var p = y * width*4;
//		for(var j = 0;j<rawData.length;j++){
//			var rgba = palette.getValue(rawData[j])
//			data[p++] = rgba[0];
//    		data[p++] = rgba[1];
//    		data[p++] = rgba[2];
//    		data[p++] = rgba[3] >=0 ? rgba[3]: 255;
//			if(j && j % pngWidth == 0){
//				p+=offsetRight;
//			}
//		}
//		//png.bitblt(out, 0, 0, png.width, png.height, 0, tops[i])
//	}
//	out.pack().pipe(fs.createWriteStream(path));
//}
//fs.createReadStream(__dirname+'/in-icons.png')
//    .pipe(new PNG({
//        filterType: 4
//    }))
//    .on('parsed', function() {
//    	var data = this.data;
//    	var palette = new Palette();
//    	palette.addImageData(data,this.width)
//    	palette.cut();
//    	var i = data.length;
//    	while(i>=4){
//    		var s = data.slice(i-4,i);
//    		var rgb = palette.getValue(s);
//    		if(i%12000 == 0){
//    			//console.log(rgb,[s[0],s[1],s[2]])
//    		}
//    		
//    		data[--i] +=0;
//    		data[--i] = rgb[2];
//    		data[--i] = rgb[1];
//    		data[--i] = rgb[0];
//    	}
//        this.pack().pipe(fs.createWriteStream(__dirname+'/out.png'));
//        console.log(__dirname+'/out.png')
//    });