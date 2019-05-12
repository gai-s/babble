'use strict';

var http=require('http');
var urlUtil=require('url');
var messages=require('./messages-util');

var clients= [];
var stats_clients= [];
var users=[];

var NO_CONTENT= 204;
var BAD_REQUEST= [400, "Error 400: Bad request!"];
var NOT_FOUND= [404, "Error 400: Page not found"];
var METHOD_NOT_ALLOWED= [405, "Error 405: Method not allowed"];
var MAX_POOLING_WAITING=50000;

function onRequest(request, response){
    console.log("a user made a request" + request.url);
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    response.setHeader('Content-Type', 'text/plain');

    var url_parts = urlUtil.parse(request.url, true);

    if(request.method==='GET'){
        if(url_parts.pathname.substr(0, 9) === '/messages'){
            if(url_parts.query.counter=="")
                return senderrResponse(response, BAD_REQUEST);
            var counter=Number(url_parts.query.counter);
            if(isNaN(counter)){
                return senderrResponse(response, BAD_REQUEST);
            }            
            if(messages.messagesLength()>counter) {
                var appentmesseges=messages.getMessages(counter);
                response.end(JSON.stringify({
                    count: messages.messagesLength(),
                    append: appentmesseges,
                    delete_message: 0
                }));
            } 
            else {
                endPendingStatRequests(messages.messagesLength(), users.length);
                clients.push({timestamp: Date.now(), client_response: response}); //response is delayd until new messages arrive
            }
        }
        else if(url_parts.pathname === '/stats'){
                stats_clients.push({timestamp: Date.now(), client_response: response});
        }
        else{
            senderrResponse(response, NOT_FOUND);
        }  
        
    }
    else if(request.method ==='POST'){
        if(url_parts.pathname === '/messages') {
            var requestBody="";
            request.on('data', function(chunk){
                requestBody += chunk;
            });
            request.on('end', function() {
                if(requestBody==""){
                    senderrResponse(response, BAD_REQUEST);
                }
                var msg=JSON.parse(requestBody);
                msg=messages.addGravatar(msg);
                var id=messages.addMessage(msg);
                
                var clients_num=users.length;
                var len=messages.messagesLength();
                
                endPendingStatRequests(len, clients_num);
                /*releasing pending messages requests*/
                var msgs=messages.getMessages(len-1);
                while(clients.length > 0) { //clients waiting for a new message arrival
                    var client = clients.pop().client_response;
                    client.end(JSON.stringify({
                        count: len,
                        append: msgs,
                        delete_message: 0
                    }));
                }
                response.end(JSON.stringify(id));
            });
        }
        else if(url_parts.pathname.substr(0, 6) === '/login') {
            var email="";
            request.on('data', function(chunk){
                email+= chunk;
            });
            request.on('end', function() {
                email=JSON.parse(email);
                if(users.indexOf(email)==-1){
                    users.push(email);
                }
                endPendingStatRequests(messages.messagesLength(), users.length);

                response.write(JSON.stringify("thank you, you are now login"));
                response.end();
            });
        }
        else if(url_parts.pathname.substr(0, 7) === '/logout') {
            var email="";
            request.on('data', function(chunk){
                email+=chunk;
            });
            request.on('end', function(){
                email=JSON.parse(email);
                if(users.find(user => user==email)){
                    users.splice(users.indexOf(email),1);
                    /*updating all online users that a user has log out*/
                    endPendingStatRequests(messages.messagesLength(), users.length);
                }
                response.write(JSON.stringify("thank you, you are now logout"));
                response.end();
            });
        }
        else if(url_parts.pathname === '/stats'){
            senderrResponse(response, METHOD_NOT_ALLOWED);
        }
        else{
            senderrResponse(response, NOT_FOUND);
        }  
    }
    else if(request.method ==='DELETE'){
        if(url_parts.pathname.substr(0, 10) === '/messages/'){
            var id=Number(url_parts.pathname.substr(10,));
            if( isNaN(id) ){
                senderrResponse(response, BAD_REQUEST);
            }
            var len=messages.messagesLength()-1;

            if(messages.deleteMessage(id)!=-1){
                while(clients.length > 0) {
                    var client = clients.pop().client_response;
                    client.end(JSON.stringify({
                        count: len,
                        append: [],
                        delete_message: id
                    }));

                endPendingStatRequests(len, users.length);
                }
            }
            else{
                senderrResponse(response, BAD_REQUEST);
            }  
        }
        else{
            senderrResponse(response, NOT_FOUND);
        }  
    }
    else if(request.method ==='OPTIONS'){
        response.writeHead(NO_CONTENT, {"Content-type": "text/plain"});
        response.end();
    }
    else{
        senderrResponse(response, NOT_FOUND);
    }  
}

function senderrResponse(response, errcode){
    response.writeHead(errcode[0],{"Content-type": "text/plain"});
    response.write(errcode[1]);
    response.end();
}

function endPendingStatRequests(len, clients_num){
    while(stats_clients.length > 0){
        var stats_client=(stats_clients.pop()).client_response;
        stats_client.end(JSON.stringify({
            users_num: clients_num,
            messages_num: len
        }));
    }
}

function closeExpiredPollingRequests(request_array){
    var expired_time=Date.now()-MAX_POOLING_WAITING;
    for(var i=0; i<request_array.length; i++){
        if(request_array[i].timestamp<=expired_time){
            request_array[i].client_response.end(JSON.stringify(""));
            request_array.splice(i,1);

        }
    }
}

setInterval(function(){
    closeExpiredPollingRequests(stats_clients); 
    closeExpiredPollingRequests(clients); 
}, MAX_POOLING_WAITING);

http.createServer(onRequest).listen(9000);
console.log("server is now running...hehe");
