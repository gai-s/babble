
'use strict';

window.Babble={
  counter : 0,
  serverUrl:'http://localhost:9000',
  empty: function(response){return;},

  sendServerRequest: function(url_method, url, val, func){
      var xht=new XMLHttpRequest();
      xht.onreadystatechange=function(){
        if(this.readyState==4 && this.status==200){
          func(JSON.parse(xht.responseText));
        }
      }
      if(url_method=='get'){
        xht.open("GET",window.Babble.serverUrl+ url + val, true);
        xht.send();
      }
      if(url_method=='post'){
        xht.open('POST', window.Babble.serverUrl+ url, true);
        xht.setRequestHeader('Content-Type', 'text/plain');
        xht.send(JSON.stringify(val));
      }
      if(url_method=='delete'){
        xht.open("DELETE", window.Babble.serverUrl+ url + val, true);
        xht.send();
      }
  },

  poll: function() {
    window.Babble.getMessages(window.Babble.counter, function(response) {
      if(response.delete_message){
        var id=response.delete_message;
        var listy=document.getElementsByClassName('MessagesList')[0];
        listy.removeChild(document.getElementById(id));
      }
      else{
        window.Babble.counter = response.count;
        window.Babble.appendMessages(response.append);
      }
      window.Babble.poll();
    });
  },

  getMessages: function(counter, callback){
    window.Babble.sendServerRequest('get','/messages', '?counter=' + counter, callback);
  },

  appendMessages: function(messages_list){
    messages_list.map(window.Babble.modify_msg_node);
  },

  modify_msg_node: function(msg_element){
    var message_node = document.querySelector('.MessagesList-msg');
    var cln=message_node.cloneNode(true);
    cln.setAttribute("id", msg_element.id);
    var tab_number=window.Babble.counter*2-1;
    cln.setAttribute("tabindex", tab_number.toString());
    if(msg_element.gravatar==''){
      cln.getElementsByClassName('MessagesList-msgavatar')[0].src=".\\images\\anonymous.png";
      cln.getElementsByClassName('MessagesList-msgname')[0].innerHTML="Anonymous";
    }
    else{
      cln.getElementsByClassName('MessagesList-msgavatar')[0].src=msg_element.gravatar;
      cln.getElementsByClassName('MessagesList-msgname')[0].innerHTML=msg_element.name;
    }
    var d=new Date(msg_element.timestamp);
    var minutes = d.getMinutes();
    var hours = d.getHours();
    cln.getElementsByClassName('MessagesList-msgtime')[0].innerHTML=hours+":"+minutes;
    cln.getElementsByClassName('MessagesList-msgtext')[0].innerHTML=msg_element.message;
    cln.classList.remove('hidden');
    cln.getElementsByClassName('MessagesList-deleteicon')[0].onclick=window.Babble.deleteMessageHandler;
    var cur_name=JSON.parse(localStorage.getItem('babble')).userInfo.name;
    var cur_email=JSON.parse(localStorage.getItem('babble')).userInfo.email;
    if(cur_email && msg_element.email===cur_email && msg_element.name===cur_name){
      cln.getElementsByClassName('MessagesList-blockquote')[0].classList.add('myMessage');
      cln.getElementsByClassName('MessagesList-deleteicon')[0].classList.remove('hidden');
      cln.getElementsByClassName('MessagesList-deleteicon')[0].classList.add('visually-hidden');
      tab_number+1;
      cln.getElementsByClassName('MessagesList-deleteicon')[0].setAttribute("tabindex", tab_number.toString());
      cln.getElementsByClassName('myMessage')[0].onmouseover=window.Babble.putDeleteButton;
      cln.getElementsByClassName('myMessage')[0].onmouseout=window.Babble.takeDeleteButtonOff;
    }
    var message_list=document.querySelector('.MessagesList');
    message_list.appendChild(cln);
  },

  stats: function(){
    window.Babble.sendServerRequest('get', '/stats',"", function(response) {
      document.getElementsByClassName('header_massagesnum')[0].innerHTML=response.messages_num;
      document.getElementsByClassName('header_usersnum')[0].innerHTML=response.users_num;
      //var elem = document.getElementById("chatlist");
      //elem.value = elem.value + response.append;
      window.Babble.stats();
    });
  },

  getStats: function(callback){
    window.Babble.sendServerRequest('get','/stats', "", callback);
  },

  logout: function(event){
    console.log("exiting page...");
    var email=JSON.parse(localStorage.getItem('babble')).userInfo.email;
    var name=JSON.parse(localStorage.getItem('babble')).userInfo.name;
    if (email==="" && name==""){
      email="anonymous";
    }
    window.Babble.sendServerRequest('post','/logout', email, window.Babble.empty);
  },

  login: function(){
    console.log("entering page...");
    var email=JSON.parse(localStorage.getItem('babble')).userInfo.email;
    var name=JSON.parse(localStorage.getItem('babble')).userInfo.name;
    if (email==="" && name==""){
      email="anonymous";
    }
    window.Babble.sendServerRequest('post','/login', email, window.Babble.empty);
  },
/*event handling the submit message button, for sending message to server*/
  postMessageHandler: function(event){
      event.preventDefault();
      var elemy=document.querySelector('.MessageSubmitForm-text');
      var userdetails=JSON.parse(localStorage.getItem('babble'));
      var d = new Date();
      var n = d.getTime();
      var usermessage={name: userdetails.userInfo.name,
        email: userdetails.userInfo.email, 
        message: elemy.value, 
        timestamp: n};
      /*need to clean current message from local storage*/
      elemy.value="";
      console.log("hi there sending the message: " + elemy);
      window.Babble.postMessage(usermessage, window.Babble.empty)
    },
    postMessage(message, callback){
      window.Babble.sendServerRequest('post','/messages',message, callback );
      //should I pool here and get stats? it will be happen anyway automatically
    },
  register: function(userdetails){
      localStorage.setItem('babble', JSON.stringify({
        currentMessage:'',
        userInfo: userdetails
      }));
  },

  submitRegistrationAnnonymousHandler: function(event){
    event.preventDefault();
    var registerformcontainer=document.querySelector('.registerForm-overlay');
    //a call to server to update another user has registered
    registerformcontainer.classList.add('hidden');
    registerformcontainer.setAttribute('aria-hidden', 'true');
    window.Babble.login();
  },
/*event handler after registration has been submit*/
  submitRegistrationHandler:  function(event){
      event.preventDefault();
      var registerform=document.querySelector('.registerForm');
      window.Babble.register({
        name: registerform.getElementsByTagName("INPUT")[0].value,
        email: registerform.getElementsByTagName("INPUT")[1].value
      });
      var registerformcontainer=document.querySelector('.registerForm-overlay');
      //a call to server to update another user has registered
      registerformcontainer.classList.add('hidden');
      registerformcontainer.setAttribute('aria-hidden', 'true');
      window.Babble.login();

  },
/*persistence - dealing with saving the message that hase been enterd before uset exit the browser, when he'll return he'll continue inserting it*/
  saveCurrentMessageHandler: function(event){
      var user_details=JSON.parse(localStorage.getItem('babble'));
      var elemy=document.querySelector('.MessageSubmitForm-text').value;
      user_details.currentMessage=elemy;
      localStorage.setItem('babble',JSON.stringify(user_details))
  },

  deleteMessageHandler: function(e){
    var id=this.parentNode.parentNode.getAttribute("id");
    window.Babble.deleteMessage(id, window.Babble.empty);
  },

  deleteMessage: function(id, callback){
    window.Babble.sendServerRequest('delete', '/messages', '/'+ id, callback)
    //should I pool here and get stats? it will be happen anyway automatically
  },
  putDeleteButton: function(e){
    this.getElementsByClassName('MessagesList-deleteicon')[0].classList.remove('visually-hidden');
  },
  
  takeDeleteButtonOff: function(e){
    this.getElementsByClassName('MessagesList-deleteicon')[0].classList.add('visually-hidden');
  },

  autoTextareaExpand: function(event){
      if (event.target.tagName.toLowerCase() !== 'textarea') return;
      var textarea=document.getElementsByClassName('MessageSubmitForm-text')[0];
      var textare_properties=window.getComputedStyle(textarea);
      //var current_height=textare_properties(getPropertyValue('height'));
      var scroll_height=textarea.scrollHeight;
      textarea.style.height= scroll_height + 'px';
  }
  };

var registerbutton = document.querySelector('.registerForm-savebutton');
registerbutton.onclick = window.Babble.submitRegistrationHandler;

var registerannonymous = document.querySelector('.registerForm-anonymousbutton');
registerannonymous.onclick = window.Babble.submitRegistrationAnnonymousHandler;

var msgform = document.querySelector('.MessageSubmitForm');
msgform.onsubmit = window.Babble.postMessageHandler;

var msg_form_text = document.querySelector('.MessageSubmitForm-text');
msg_form_text.addEventListener("keyup", function(event) {
  // "Enter" key on the keyboard
  if (event.keyCode === 13) {
    event.preventDefault();
    document.querySelector('.MessageSubmitForm-button').click();
  }
});

//before unload we save what been wrote at textarea
window.addEventListener("beforeunload", window.Babble.logout);
window.addEventListener("beforeunload", window.Babble.saveCurrentMessageHandler); 

//dealing with enlarging of textarea in Message Submit Form
var msgformtextarea = document.querySelector('.MessageSubmitForm-text');
msgform.onkeyup = window.Babble.autoTextareaExpand;

window.Babble.stats();
window.Babble.poll();

/*initializing babble variable in local stprage with empty values*/
if(!localStorage.getItem('babble')){
  localStorage.setItem('babble', JSON.stringify({
    currentMessage:'',
    userInfo: {name: '', email: ''}
  }));
}
/*User persistance - in case the user already made a login*/
else if(JSON.parse(localStorage.getItem('babble')).userInfo.name!=''){
      console.log("already registered! you wakko");
      var regform_overlay = document.querySelector('.registerForm-overlay');
      regform_overlay.classList.add('hidden');
      //document.querySelector('.refisterForm-overlay').add('hidden');
      var currentmsg=JSON.parse(localStorage.getItem('babble')).currentMessage;
      var msg_input=document.querySelector('.MessageSubmitForm-text');
      msg_input.value=currentmsg;
      window.Babble.login();
}
/*every load of page, we take the current message from local store and put it in display, 
if the user didn't wrote anything there will be there empty string*/
//hiding the message template
//message_node.setAttribute('aria-hidden', 'true');