var fs = require('fs'),
    PNG = require('pngjs').PNG;
var MedianCut = require('../median-cut').MedianCut
var Quantize = require('../quantize').Quantize
var ColorSpace = require('../colorspace');
fs.createReadStream(__dirname+'/in-box.png')
    .pipe(new PNG({
        filterType: 4
    }))
    .on('parsed', function() {
    	var data = [];
    	var c = 0;
    	var map = {};
        for (var y = 0; y < this.height; y++) {
            for (var x = 0; x < this.width; x++) {
            	var idx = (this.width * y + x) << 2;
            	
            	var color = this.data.slice(idx,idx+3);
            	color = [color[0],color[1],color[2]];
            	lab = ColorSpace.rgb2lab(color);
            	//lab[0]*=1.5;
	            	rgb = ColorSpace.lab2rgb(lab);
	            	var gap = (Math.abs(color[0]-rgb[0]) +Math.abs(color[1]-rgb[1])+Math.abs(color[2]-rgb[2]));
	            	if(gap>30){
	            		c++
	            		console.log(color,rgb)
	            	}
            	data.push(color)
            	var key = color.join('/');
            	if(key in map){
            		map[key]++;
            	}else{
            		map[key] =1;
            	}
            }
        }
        console.log(Object.keys(map).length)
    	//var palette = new MedianCut(data.concat());palette.cut(254)
    	var palette = new Quantize([data.concat()])
        //console.log(this.data.slice(0,4),data.concat()[0])
        //console.log(palette.boxes.join(',\n'))

    	//console.log(palette.getBox(data[0]).getAverage(),data[0])
    	var i = data.length;
    	while(i--){
    		var v = palette.getValue(data[i]);
    		//v = ColorSpace.lab2rgb(v);
    		//lab[0]/=1.5;
    		data[i] = v;
    	}
    	var i=0;
    	var j=0;
        for (var y = 0; y < this.height; y++) {
            for (var x = 0; x < this.width; x++) {
                var d = data[j++];

                // invert color
                this.data[i++] = d[0];
                this.data[i++] = d[1];
                this.data[i++] = d[2];

                // and reduce opacity
                this.data[i++] = 255;//this.data[idx+3] >> 1;
            }
        }

        this.pack().pipe(fs.createWriteStream(__dirname+'/out.png'));
        console.log(__dirname+'/out.png')
    });