var fs = require('fs'),
	  path = require('path'),    
	  filePath = path.join(__dirname, 'test');



fs.readFile(filePath, {encoding: 'utf-8'}, function(err,data){
	if(!err){
    console.log(data);
	}
	else {
	  console.log(err);
	}
});

