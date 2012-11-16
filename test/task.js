exports.Context = Context;

function Context(){
	this.taskMap = {};
	this.startTask = [];
	this.data = {};
}
Context.prototype.add = function(){
	var end = arguments.length;
	var p = end;
	while(p--){
		if(typeof arguments[p] == 'string'){
			//has dependence
			var task = [Array.prototype.slice.call(arguments,0,++p),
				Array.prototype.slice.call(arguments,p,end)];
			for(var i=0;i<p;i++){
				var v = arguments[i];
				if(v in this.taskMap){
					this.taskMap[v].push(task);
				}else{
					this.taskMap[v] = [task];
				}
			}
			return this;
		}
	}
	Array.prototype.push.apply(this.startTask,arguments);
	return this;
}
Context.prototype.set = function(n,v){
	this.data[n] = v;
	var taskMap = this.taskMap;
	var tasks = taskMap[n];
	var end = tasks && tasks.length;
	for(var i=0;i<end;i++){
		var task = tasks[i];
		var ns = task[0];
		var p = ns.indexOf(n);
		if(p>=0){
			ns.splice(p,1);
			if(!ns.length){
				delete taskMap[n];
				var ts = task[1];
				var j = ts.length;
//				console.log('@',ns,ts)
				while(j--){
					ts[j].call(this)
				}
			}
		}
		
		
	}
}
Context.prototype.get = function(n){
	return this.data[n]
}
Context.prototype.start = function(){
	var task = this.startTask;
	var end = task.length;
	for(var i=0;i<end;i++){
		task[i].call(this)
	}
}
