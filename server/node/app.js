/**
 * TetATet - NODE.js server side call signaling part
 * 
 * NOTE - no real login is implemented - should read auth info on the server side
 * TODO - protect request from valid origins - sarch for TODO in source
 *
 * @author Milan Rukavina rukavinamilan@gmail.com
 *
 *
 */
var WebSocketServer = require('websocket').server;
var http = require('http');
var connections = {};
var connectionDescs = {};

var server = http.createServer(function(request, response) {
    // process HTTP request. Since we're writing just WebSockets server
    // we don't have to implement anything.
    });
server.listen(1337, function() {
    console.log((new Date()) + " Server is listening on port 1337");
});

// create the server
wsServer = new WebSocketServer({
    httpServer: server
});

/**
 * Error callback
 */
function sendCallback(err) {
    if (err) console.error("send() error: " + err);
}

/**
 * Broadcast message for all but sender
 */
function broadcast(utf8Data,senderId) {
    // broadcast message to all connected clients
    for(var id in connections){
        if (id != senderId) {
            connections[id].send(utf8Data, sendCallback);
        }        
    }
}

/**
 * Generate random connection ID
 */
function generateConnectionId(){
    var S4 = function (){
        return Math.floor(
            Math.random() * 0x10000 /* 65536 */
            ).toString(16);
    };

    return (S4() + S4());
}

/**
 * Make common user info structure from google or facebook login info
 */
function adaptUserInfo(provider,data){
    var userInfo = {
        'id':null,
        'email':'',
        'name':'',
        'first_name':'',
        'last_name':'',
        'gender':null,
        'image':null
    }
    switch (provider) {
        case 'facebook':
            userInfo.id = data.id;
            userInfo.email = data.email;
            userInfo.name = data.name;
            userInfo.first_name = data.first_name;
            userInfo.last_name = data.last_name;
            userInfo.gender = data.gender;
            userInfo.image = 'https://graph.facebook.com/' + data.id + '/picture';
            break;
        case 'google':
            userInfo.id = data.id;
            userInfo.email = data.email;
            userInfo.name = data.name;
            userInfo.first_name = data.given_name;
            userInfo.last_name = data.family_name;
            userInfo.gender = data.gender;
            userInfo.image = data.picture;        
            break;
        default:
            return false;
    }
    
    return userInfo;
}

// This callback function is called every time someone
// tries to connect to the WebSocket server
wsServer.on('request', function(request) {
    console.log((new Date()) + ' Connection from origin ' + request.origin + '.');
    //TODO: protected origin here
    var connection = request.accept(null, request.origin);
    console.log(' Connection ' + connection.remoteAddress);
    //console.log(connection);    
    
    //current connection id
    var connectionId = null;
    
    // This is the most important callback for us, we'll handle
    // all messages from users here.
    connection.on('message', function(message) {
        console.log("Received Message: ");
        console.log(message);
        if (message.type !== 'utf8') {
            return;
        }
        var msg = JSON.parse(message.utf8Data);
        //login
        if(connectionId == null){          
            if(msg.type != 'login'){
                return;
            }
            connectionId = generateConnectionId();
            connections[connectionId] = connection;
            connectionDescs[connectionId] = {
                data: {
                    "userData": adaptUserInfo(msg.data.provider, msg.data.data)
                }
            };
            console.log("New user logged in",msg.data);
            //send id
            connection.sendUTF(JSON.stringify( {
                type: 'connectionId', 
                data: {
                    "connectionId": connectionId, 
                    "data": connectionDescs[connectionId]
                }
            } ));
            //prepare and send all connections
            var peerConnections = {};
            for(var id in connectionDescs){
                if (id != connectionId) {
                    peerConnections[id] = connectionDescs[id];
                }        
            }            
            connection.sendUTF(JSON.stringify( {
                type: 'connections', 
                data: peerConnections
            } ));
            //inform about new connection
            broadcast(JSON.stringify({
                type:'connection_add',
                data: {
                    "connectionId": connectionId, 
                    "data": connectionDescs[connectionId]
                }
            }),connectionId);
            return;
        }
        //messages: login, call_invite, call_accept, sdp_offer, sdp_answer, ice_candidate
        switch(msg.type){
            case "call_invite":
            case "call_accept":
            case "call_drop":
            case "sdp_offer":
            case "sdp_answer":
            case "ice_candidate":
                var peerConnectionId = msg.data.connectionId;
                var peerConnection = connections[peerConnectionId];
                if(!peerConnection){
                    console.log("Peer not found id: " + peerConnectionId);
                    return;
                }
                msg.data.connectionId = connectionId;
                peerConnection.sendUTF(JSON.stringify(msg));
                break;
        }
    });   
    
    //client closes
    connection.on('close', function() {
        // close user connection
        console.log((new Date()) + " Peer disconnected., connectionId",connectionId);
        if(connectionId === null){
            console.log("connectionId not found for ");
            return false;
        }
        delete connections[connectionId];
        delete connectionDescs[connectionId];
        //inform about closed connection
        broadcast(JSON.stringify({
            type:'connection_remove',
            data: {
                "connectionId": connectionId
            }
        }),connectionId);
    });
        
});