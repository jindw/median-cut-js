var buildGradientMatrix = require('../gradient-weight').buildGradientMatrix

var matrix = [
	[[1,1],[1,2],[1,3]],
	[[1,1],[1,2],[1,3]],
	[[1,1],[1,2],[1,3]],
]
var infoMatrix = buildGradientMatrix(matrix,2).map(JSON.stringify).join('\n');
var expect = [
	[[[-1,0,0,0,2],[-1,0,0,2,2]],
	[[4,1,0,1,2],[-1,0,0,2,2]],
	[[4,2,0,2,2],[-1,0,0,2,2]] ],
	
	[[[-1,0,0,0,2],[0,0,0,2,2]],
	[[4,1,0,1,2],[0,0,0,2,2]],
	[[4,2,0,2,2],[0,0,0,2,2]] ],
	
	[[[-1,0,0,0,2],[0,0,0,2,2]],
	[[4,1,0,1,2],[0,0,0,2,2]],
	[[4,2,0,2,2],[0,0,0,2,2]] ]
].map(JSON.stringify).join('\n')
console.assert(infoMatrix ==  expect,'expect:\n'+expect +'\nbut:\n'+infoMatrix)