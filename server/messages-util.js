
    'use strict'
    var md5= require('blueimp-md5');
    var messages= [];

    var messagesLength=function (){
        return messages.length;
    }

    var addMessage= function(message){
        console.log("***************the entire msg object is:",message);
        var d = new Date();
        message.id= d.getTime();
        messages.push(message);
        return message.id;
    }
    var getMessages= function(counter){
        if(messages.length > counter) {
            return messages.slice(counter);
        }
        else{
            return [];
        }
    }
    var deleteMessage=function(id){
        var result=-1;
        messages=messages.filter(function(msg){
            if(msg.id===id){
                result=id; 
                return false;
            }
            return true;});
        return result;
    }

    var gravatar= function(email){
        var base="http://www.gravatar.com/avatar/";
        var hash=md5(email.trim().toLowerCase());
        return base+hash;
    }

    var addGravatar=function(msg){
        var gravatar_profile=!msg.email ? '' : gravatar(msg.email);
        msg.gravatar=gravatar_profile;
        return msg;
    }

module.exports={getMessages, deleteMessage, addMessage, messagesLength, addGravatar };