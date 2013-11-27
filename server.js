var fs = require('fs'),
    url = require('url'),
    http = require('http'), 
    logger = console;


var SERVER_PORT = 3210, 
    SERVER_TIMEOUT = 60*1000;

function onRequest(req,res){
    var path, data, type;

    logger.info("request", req.headers);

    path = url.parse(req.url).pathname.replace(/^[\.\/]/,'');

    path = path ? path : 'index.html';

    if(path[path.length-1] ==='/') path+= 'index.html';
    
    logger.info("request url %s ->", req.url, path);
    
    req.on('error',function(err){
        console.log("req error", err);
    });

    if((type = path.match(/\.(.*)$/))) {
        switch(type[1]){
            case 'html':
                type = "text/html";
                break;
            case 'js':
                type = "text/javascript";
                break;
            case 'png':
                type = "image/png";
                break;
            case 'jpeg':
            case 'jpg':
                type ="image/jpg"
                break;
            case 'css':
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

        try {
            data = fs.readFileSync(path);
        } catch(err){
            res.writeHead(404, err);
            res.end();
            console.log("Failed to read", path);
            return;
        }
        console.log("serving %s data from", type, path);
        res.writeHead(200,{"content-type": type});
        res.end(data);   
    }
}

function onServer() {
    logger.info("Server start", this.address());
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

    socket.setTimeout(SERVER_TIMEOUT);
}

http.createServer(onRequest)
    .listen(SERVER_PORT, onServer)
    .on('connection',onConnection);
