var fs = require('fs'),
    PNG = require('pngjs').PNG;
var Palette = require('../median-cut').Palette
fs.createReadStream(__dirname+'/in-box.png')
    .pipe(new PNG({
        filterType: 4
    }))
    .on('parsed', function() {
    	var data = this.data;
    	var palette = new Palette(data,this.width);
    	var i = data.length;
    	while(i>=4){
    		var s = data.slice(i-4,i);
    		var rgb = palette.getValue(s);
    		if(i%12000 == 0){
    			//console.log(rgb,[s[0],s[1],s[2]])
    		}
    		
    		data[--i] +=0;
    		data[--i] = rgb[2];
    		data[--i] = rgb[1];
    		data[--i] = rgb[0];
    	}
        this.pack().pipe(fs.createWriteStream(__dirname+'/out.png'));
        console.log(__dirname+'/out.png')
    });