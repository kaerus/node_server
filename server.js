var fs = require('fs'),
    url = require('url'),
    zlib = require('zlib'),
    http = require('http'), 
    logger = console;

var CONFIG = {
    port: 3210,
    timeout: 60*1000,
    path: ''
}

process.argv.forEach(function(arg){
    var option, value, i;

    if(arg.indexOf('--') === 0){
        if((i = arg.indexOf('=')) < 0 ) 
            throw new Error("Invalid option without value", arg);

        option = arg.substr(2,i-2);
        value = arg.substr(i+1,arg.length);
        
        switch(option){
            case 'port':
                CONFIG.port = parseInt(value,10);
                break;
            case 'timeout':
                CONFIG.timeout = parseInt(value,10);
                break;
            case 'path':
                CONFIG.path = value;
                break;
        }
    }
})

logger.info("Configuration: %j", CONFIG);

function onRequest(req,res){
    var path, data, type, encoding, compress = true;

    logger.info("Request %s %s from %s:%s, Headers", 
        req.method, 
        req.url, 
        req.connection.remoteAddress,
        req.connection.remotePort, 
        req.headers);

    path = url.parse(req.url).pathname.replace(/^[\.\/]/,'');

    path = CONFIG.path + (path ? path : 'index.html');

    if(path[path.length-1] ==='/') path+= 'index.html';
    
    req.on('error',function(err){
        console.log("req error", err);
    });

    if((type = path.match(/(\.[\w]+)$/))) {
        type = type[0].toLowerCase();
        switch(type){
            case '.html':
            case '.htm':
                type = "text/html";
                break;
            case '.js':
                type = "text/javascript";
                break;
            case '.png':
                type = "image/png";
                break;
            case '.jpeg':
            case '.jpg':
                type ="image/jpg";
                compress = false;
                break;
            case '.svg':
                type = "image/svg+xml";
                break;
            case '.css':
                type = "text/css";
                break;         
            default:
                type = "text/plain";
                break;      
        }
    } 
    
    if(!type){
        res.writeHead(404,"Unkown file type");
        console.log("unknown type for path", path);
    } else {
        
        if (!(encoding = req.headers['accept-encoding'])){
            encoding = '';
        }

        try {
            data = fs.createReadStream(path);
        } catch(err){
            res.writeHead(404, err);
            res.end();
            console.log("Failed to read", path);
            return;
        }

        if(compress && encoding.match(/\bdeflate\b/)) {
            encoding = 'deflate';
            res.writeHead(200, {'content-encoding':type,'content-encoding': encoding});
            data.pipe(zlib.createDeflate()).pipe(res);
        } else if(compress && encoding.match(/\bgzip\b/)) {
            encoding = 'gzip';
            res.writeHead(200, {'content-encoding':type, 'content-encoding': encoding });
            data.pipe(zlib.createGzip()).pipe(res);
        } else {
            encoding = '';
            res.writeHead(200, {"content-type": type});
            data.pipe(res);
        }

        logger.info("Response", path, type, encoding);
    }
}

function onServer() {
    logger.info("Server listen", this.address());
}


function onConnection(socket){
    var client = socket.address();

    logger.info("client connected", client);

    socket.on('timeout', function(){
        logger.info("client timeout", client);
    });

    socket.on('error', function(err){
        logger.error("client error", client, err);
    });

    socket.on('close', function(){
        logger.info("client close", client);
    });

    socket.setTimeout(CONFIG.timeout);
}

http.createServer(onRequest)
    .listen(CONFIG.port, onServer)
    .on('connection',onConnection);