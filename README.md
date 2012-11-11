# TetATet - WebRTC video chat

## Overview
TetATet is a sample web application which demonstrates possibilities of new HTML5 [WebRTC](http://www.webrtc.org/) technology.
WebRTC provides peer to peer browser communication and along with HTML5 media support - possible video/audio calls in browser window without additional 3rd party plugins.
Server side technologies, like Websocket node.js server, are still needed, in order to provide call initiation and ending - "signaling" part.
What is unique for this project, is that it has support for explicit and optional call invitation (ringing) and answering.

```
Note that facebook and google login features are just for demonstration purposes - real auth will have to be implemented on the server side.
```


## Demo

http://rukavina.github.com/tetatet

## Requirements
At the time of writing, not many browsers support WebRTC. I recommend Google Chrome >=22. Depending on version you might have to enable some flags.
Goto chrome://flags/ and enable
```
Enable PeerConnection
```

In order to test the server side, you need to have node.js installed with websocket module.

## Installation and setup

### Server side
You must have installed [node.js](http://nodejs.org/) on your server with [websocket module](https://github.com/Worlize/WebSocket-Node)

```bash
cd server/node/
node app.js
```

Open *app.js* file and optionally alter listening port

```javascript
server.listen(8080, function() {
    console.log((new Date()) + " Server is listening on port 8080");
});
```

You might want to restrict access from certain domain origins:

```javascript
var connection = request.accept(null, request.origin);
```

### Client side
In the file *client/public/js/front.js* update websocket url and port:
```javascript
var wsURL = 'ws://tetatet-rukavina.dotcloud.com';
```

In order to use facebook login functionality you will have to create facebook application https://developers.facebook.com/apps/ with your domain defined.
Then in *client/public/js/login/facebook.js* update **appId**
```javascript
    FB.init({
        appId      : '521555617857525', // App ID - update this!
        //channelUrl : '//webrtc.local/websocket/channel.html', // Channel File
        status     : true, // check login status
        cookie     : true, // enable cookies to allow the server to access the session
        xfbml      : true  // parse XFBML
    });
```

For google login, similar thing should be done in https://code.google.com/apis/console
Then in *client/public/js/login/google.js* update **clientId**
```javascript
var clientId = '909370428431.apps.googleusercontent.com';
```

Note that login features can work ONLY at specified domains.

## Credits

This projects was inspired or uses the following projects:

* [jquery](http://jquery.com/)
* [JavaScript Micro-Templating](JavaScript Micro-Templating)
* [twitter bootstrap](http://twitter.github.com/bootstrap/)
* [WebRTC.io](https://github.com/webRTC)
* https://apprtc.appspot.com

## Licence

The MIT License (MIT)

Copyright (c) 2012 Milan Rukavina

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
