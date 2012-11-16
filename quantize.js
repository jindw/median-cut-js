var QUICK = false;
    
var MAX_RGB = 255;
var MAX_NODES = 266817;
var MAX_TREE_DEPTH = 8;

// these are precomputed in advance
var SQUARES = [];
var SHIFT= [];

{
    for (var i= -MAX_RGB; i <= MAX_RGB; i++) {
        SQUARES[i + MAX_RGB] = i * i;
    }

    for (var i = 0; i < MAX_TREE_DEPTH + 1; ++i) {
        SHIFT[i] = 1 << (15 - i);
    }
}

/**
 * Reduce the image to the given number of colors. The pixels are
 * reduced in place.
 * @return The new color palette.
 */
function quantizeColor(pixels/*[][]*/, max_colors) {
    var cube = new Cube(pixels, max_colors,-1);
    cube.classification();
    cube.reduction();
    cube.assignment();
    return cube.colorMap;
}

function Quantize(rgbPixels){
	var intPixels = [];
	for(var i=0;i<rgbPixels.length;i++){
		var row = rgbPixels[i];
		var nrow = [];
		for(var j=0;j<row.length;j++){
			var c = row[j];
			nrow.push((c[0]<<16) | (c[1]<<8) | c[2]);
			//console.log(nrow.toString(16))
		}
		intPixels.push(nrow);
	}
	this.intPixels = intPixels;
//	console.log(1)
	var cube = this.cube= new Cube(intPixels, 255,-1);
	console.log(2)
    cube.classification();
    console.log(3)
    cube.reduction();
    console.log(4)
    console.log(this.cube.nodes)
    cube.assignment();
}
Quantize.prototype.getValue = function(rgb){
	return this.cube.getValue(rgb)
}
function Cube(pixels,max_colors,depth) {
    this.colorMap = []
    
    // counter for the number of colors in the cube. this gets
    // recalculated often.
    this.colors = 0;//int

    // counter for the number of nodes in the tree
    this.nodes = 0;//int

    this.pixels = pixels;
    this.max_colors = max_colors;

	if (depth < 0) {
		var i = max_colors;
		// tree_depth = log max_colors
		// 4
		for (depth = 1; i != 0; depth++) {
			i = i>>> 2;
		}
		if (depth > 1) {
			--depth;
		}
		depth *= 2;
		if (depth > MAX_TREE_DEPTH) {
			depth = MAX_TREE_DEPTH;
		} else if (depth < 2) {
			depth = 2;
		}
    }
    this.depth = depth;
    this.root = new Node(this);
}
/*
 * Procedure Classification begins by initializing a color
 * description tree of sufficient depth to represent each
 * possible input color in a leaf. However, it is impractical
 * to generate a fully-formed color description tree in the
 * classification phase for realistic values of cmax. If
 * colors components in the input image are quantized to k-bit
 * precision, so that cmax= 2k-1, the tree would need k levels
 * below the root node to allow representing each possible
 * input color in a leaf. This becomes prohibitive because the
 * tree's total number of nodes is 1 + sum(i=1,k,8k).
 *
 * A complete tree would require 19,173,961 nodes for k = 8,
 * cmax = 255. Therefore, to avoid building a fully populated
 * tree, QUANTIZE: (1) Initializes data structures for nodes
 * only as they are needed; (2) Chooses a maximum depth for
 * the tree as a function of the desired number of colors in
 * the output image (currently log2(colorMap size)).
 *
 * For each pixel in the input image, classification scans
 * downward from the root of the color description tree. At
 * each level of the tree it identifies the single node which
 * represents a cube in RGB space containing It updates the
 * following data for each such node:
 *
 *   number_pixels : Number of pixels whose color is contained
 *   in the RGB cube which this node represents;
 *
 *   unique : Number of pixels whose color is not represented
 *   in a node at lower depth in the tree; initially, n2 = 0
 *   for all nodes except leaves of the tree.
 *
 *   total_red/green/blue : Sums of the red, green, and blue
 *   component values for all pixels not classified at a lower
 *   depth. The combination of these sums and n2 will
 *   ultimately characterize the mean color of a set of pixels
 *   represented by this node.
 */
Cube.prototype.classification = function() {
    var pixels = this.pixels;
    var root = this.root;

    var width = pixels.length;
    var height = pixels[0].length;

//	console.log(width,height)
    // convert to indexed color
    for (var x = width; x-- > 0; ) {
        for (var y = height; y-- > 0; ) {
            var pixel = pixels[x][y];
            var red   = (pixel >> 16) & 0xFF;
            var green = (pixel >>  8) & 0xFF;
            var blue  = (pixel >>  0) & 0xFF;
            

            // a hard limit on the number of nodes in the tree
            if (this.nodes > MAX_NODES) {
                //System.out.println("pruning");
                root.pruneLevel();
                --this.depth;
            }

            // walk the tree to depth, increasing the
            // number_pixels count for each node
            var node = root;
            for (var level = 1; level <= this.depth; ++level) {
                var id = (((red   > node.mid_red   ? 1 : 0) << 0) |
                          ((green > node.mid_green ? 1 : 0) << 1) |
                          ((blue  > node.mid_blue  ? 1 : 0) << 2));
                //console.log([red,green,blue],[node.mid_red,node.mid_green,node.mid_blue])
                if (node.child[id] == null) {
                    new Node(node, id, level);
                }
                node = node.child[id];
                node.number_pixels += SHIFT[level];
            }

            ++node.unique;
            node.total_red   += red;
            node.total_green += green;
            node.total_blue  += blue;
//            console.log(red,green,blue)
        }
    }
}

/*
 * reduction repeatedly prunes the tree until the number of
 * nodes with unique > 0 is less than or equal to the maximum
 * number of colors allowed in the output image.
 *
 * When a node to be pruned has offspring, the pruning
 * procedure invokes itself recursively in order to prune the
 * tree from the leaves upward.  The statistics of the node
 * being pruned are always added to the corresponding data in
 * that node's parent.  This retains the pruned node's color
 * characteristics for later averaging.
 */
Cube.prototype.reduction = function() {
    var threshold = 1;
    while (this.colors > this.max_colors) {
        this.colors = 0;
        threshold = this.root.reduce(threshold, Number.MAX_VALUE);
    }
}

/**
  * The result of a closest color search.
  */
function Result() {
//     var distance;
//     var color_number;
}

/*
 * Procedure assignment generates the output image from the
 * pruned tree. The output image consists of two parts: (1) A
 * color map, which is an array of color descriptions (RGB
 * triples) for each color present in the output image; (2) A
 * pixel array, which represents each pixel as an index into
 * the color map array.
 *
 * First, the assignment phase makes one pass over the pruned
 * color description tree to establish the image's color map.
 * For each node with n2 > 0, it divides Sr, Sg, and Sb by n2.
 * This produces the mean color of all pixels that classify no
 * lower than this node. Each of these colors becomes an entry
 * in the color map.
 *
 * Finally, the assignment phase reclassifies each pixel in
 * the pruned tree to identify the deepest node containing the
 * pixel's color. The pixel's value in the pixel array becomes
 * the index of this node's mean color in the color map.
 */
Cube.prototype.assignment = function() {
    this.colorMap = new Array(this.colors);
    this.colors = 0;
    this.root.buildPalette();
  
    var pixels = this.pixels;

    var width = pixels.length;
    var height = pixels[0].length;

    // convert to indexed color
    for (var x = width; x-- > 0; ) {
        for (var y = height; y-- > 0; ) {
            var pixel = pixels[x][y];
            var red   = (pixel >> 16) & 0xFF;
            var green = (pixel >>  8) & 0xFF;
            var blue  = (pixel >>  0) & 0xFF;

            // walk the tree to find the cube containing that color
            pixels[x][y] = this.getIndex([red,green,blue])
        }
    }
    //console.dir(this.colorMap[0].toString(16))
}
Cube.prototype.getValue = function(rgb){
	var index = this.getIndex(rgb);
	var rgb = this.colorMap[index];
	if(typeof rgb != 'number'){
		console.log(index,rgb);
		throw new Error()
	}
	return [(rgb>>16)&0xFF,(rgb>>8)&0xFF,rgb&0xFF]
}
Cube.prototype.getIndex = function(rgb){
	var node = this.getNode(rgb);
	if (QUICK) {
        // if QUICK is set, just use that
        // node. Strictly speaking, this isn't
        // necessarily best match.
        return node.color_number;
    } else {
        // Find the closest color.
        var result = {distance:Number.MAX_VALUE}
        node.parent.closestColor(rgb[0], rgb[1], rgb[2], result);
        //console.dir(result)
        return result.color_number;
    }
}
Cube.prototype.getNode = function(rgb) {
    var red   = rgb[0];
    var green = rgb[1];
    var blue  = rgb[2];

    // walk the tree to find the cube containing that color
    var node = this.root;
    for ( ; ; ) {
        var id = (((red   > node.mid_red   ? 1 : 0) << 0) |
                  ((green > node.mid_green ? 1 : 0) << 1) |
                  ((blue  > node.mid_blue  ? 1 : 0) << 2)  );
        if (node.child[id] == null) {
            break;
        }
        node = node.child[id];
    }

    return node;
}

/**
 * A single Node in the tree.
 */
function Node(parent, id, level) {
	if(parent instanceof Cube){
		this.cube = parent;//is Cube
        this.parent = this;
        this.child = [];//new Node[8];
        //our index within our parent
        this.id = 0;
        //our level within the tree
        this.level = 0;

        this.number_pixels = Number.MAX_VALUE;
    
        this.mid_red   = (MAX_RGB + 1) >> 1;
        this.mid_green = (MAX_RGB + 1) >> 1;
        this.mid_blue  = (MAX_RGB + 1) >> 1;
	}else{
		var cube = this.cube = parent.cube;
        this.parent = parent;
        this.child = [];//new Node[8];
        this.id = id;
        this.level = level;
         // the pixel count for this node and all children
        this.number_pixels = 0;

        // add to the cube
        ++cube.nodes;
        if (level == cube.depth) {
            ++cube.colors;
        }

        // add to the parent
        ++parent.nchild;
        parent.child[id] = this;

        // figure out our midpoint
        var bi = (1 << (MAX_TREE_DEPTH - level)) >> 1;
        this.mid_red   = parent.mid_red   + ((id & 1) > 0 ? bi : -bi);
        this.mid_green = parent.mid_green + ((id & 2) > 0 ? bi : -bi);
        this.mid_blue  = parent.mid_blue  + ((id & 4) > 0 ? bi : -bi);
	}
	this.nchild = 0;
	// the pixel count for this node
	this.unique = 0;
    // the sum of all pixels contained in this node
    this. total_red = 0;
    this. total_green = 0;
    this. total_blue = 0;
    // used to build the colorMap
    this. color_number = 0;
}



/**
 * Remove this child node, and make sure our parent
 * absorbs our pixel statistics.
 */
Node.prototype.pruneChild = function() {
	var parent = this.parent;
    --parent.nchild;
    parent.unique += this.unique;
    parent.total_red     += this.total_red;
    parent.total_green   += this.total_green;
    parent.total_blue    += this.total_blue;
    parent.child[this.id] = null;
    --this.cube.nodes;
    //memery clear
    this.cube = null;
    this.parent = null;
}

/**
 * Prune the lowest layer of the tree.
 */
Node.prototype.pruneLevel = function() {
    if (this.nchild != 0) {
        for (var id = 0; id < 8; id++) {
            if (this.child[id] != null) {
                this.child[id].pruneLevel();
            }
        }
    }
    if (this.level == this.cube.depth) {
        this.pruneChild();
    }
}

/**
 * Remove any nodes that have fewer than threshold
 * pixels. Also, as long as we're walking the tree:
 *
 *  - figure out the color with the fewest pixels
 *  - recalculate the total number of colors in the tree
 */
Node.prototype.reduce = function(threshold, next_threshold) {
	var child = this.child;
    if (this.nchild != 0) {
        for (var id = 0; id < 8; id++) {
            if (child[id] != null) {
                next_threshold = child[id].reduce(threshold, next_threshold);
            }
        }
    }
    if (this.number_pixels <= threshold) {
        this.pruneChild();
    } else {
        if (this.unique != 0) {
            this.cube.colors++;
        }
        if (this.number_pixels < next_threshold) {
            next_threshold = this.number_pixels;
        }
    }
    return next_threshold;
}

/*
 * colorMap traverses the color cube tree and notes each
 * colorMap entry. A colorMap entry is any node in the
 * color cube tree where the number of unique colors is
 * not zero.
 */
Node.prototype.buildPalette = function() {
	var child = this.child;
	var cube = this.cube;
    if (this.nchild != 0) {
        for (var id = 0; id < 8; id++) {
            if (child[id] != null) {
            	//console.log(this.level,id)
                child[id].buildPalette();
            }
        }
    }
    if (this.unique != 0) {
        var r = Math.round(this.total_red    / this.unique);
        var g = Math.round(this.total_green  / this.unique);
        var b = Math.round(this.total_blue   / this.unique);
        cube.colorMap[cube.colors] = (//((    0xFF) << 24) |
                                      ((r & 0xFF) << 16) |
                                      ((g & 0xFF) <<  8) |
                                      ((b & 0xFF) <<  0));
        //console.log([this.total_red,this.total_green,this.total_blue,this.unique,[r,g,b]])
        this.color_number = cube.colors++;
    }
	//console.log(this.nchild,this.unique,cube.colors)
	//console.log(JSON.stringify(cube.colorMap))
}

/* ClosestColor traverses the color cube tree at a
 * particular node and determines which colorMap entry
 * best represents the input color.
 */
Node.prototype.closestColor = function(red, green, blue, result) {
	var child = this.child;
	var cube = this.cube;
    if (this.nchild != 0) {
        for (var id = 0; id < 8; id++) {
            if (child[id] != null) {
                child[id].closestColor(red, green, blue, result);
            }
        }
    }
    //console.log(this+'')

    if (this.unique != 0) {
        var color = cube.colorMap[this.color_number];
        var len = distance(color, red, green, blue);
        if (len < result.distance) {
            result.distance = len;
            result.color_number = this.color_number;
        }
    }
}

Node.prototype.toString = function() {
    var buf = [];
    if (this.parent == this) {
        buf.push("root");
    } else {
        buf.push("node");
    }
    buf.push(' ',this.level," [",this.mid_red,',',this.mid_green,',',this.mid_blue,']');
    return buf.join('');
}
/**
 * Figure out the distance between this node and som color.
 */
function distance(color, r, g, b) {
//        return (SQUARES[Math.abs(((color >> 16) & 0xFF) - r )] +
//                SQUARES[Math.abs(((color >>  8) & 0xFF) - g) ] +
//                SQUARES[Math.abs(((color >>  0) & 0xFF) - b) ]);
    
    return (SQUARES[((color >> 16) & 0xFF) - r + MAX_RGB] +
            SQUARES[((color >>  8) & 0xFF) - g + MAX_RGB] +
            SQUARES[((color >>  0) & 0xFF) - b + MAX_RGB]);

}
/**
 * Figure out the distance between this node and som color.
 */
function distance(color1, color2) {
    return (SQUARES[((color1 >> 16) & 0xFF) - ((color2 >> 16) & 0xFF) + MAX_RGB] +
            SQUARES[((color1 >>  8) & 0xFF) - ((color2 >> 8) & 0xFF) + MAX_RGB] +
            SQUARES[((color1 >>  0) & 0xFF) - ((color2 >> 0) & 0xFF) + MAX_RGB]);
}
if(typeof exports == 'object'){
	exports.Quantize = Quantize;
}