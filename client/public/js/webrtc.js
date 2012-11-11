/**
 * TetATet - client side, RTC logic encapsulation - generic logic
 * 
 * based on https://github.com/webRTC/webrtc.io-client
 *
 * @author Milan Rukavina rukavinamilan@gmail.com
 *
 *
 */
// Fallbacks for vendor-specific variables until the spec is finalized.
window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection;
window.PeerConnection = window.webkitPeerConnection00;
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
window.URL = window.URL || window.webkitURL;

(function() {

    var rtc;
    if ('undefined' === typeof module) {
        rtc = this.rtc = {};
    } else {
        rtc = module.exports = {};
    }

 
    // Holds a connection to the server.
    rtc._socket = null;

    // Holds callbacks for certain events.
    rtc._events = {};
  
    //attach event handlers
    rtc.on = function(eventName, callback) {
        rtc._events[eventName] = rtc._events[eventName] || [];
        rtc._events[eventName].push(callback);
    };
  
    //fire event handler
    rtc.fire = function(eventName, _) {
        console.log("fired [" + eventName + "]");
        var events = rtc._events[eventName];
        var args = Array.prototype.slice.call(arguments, 1);

        if (!events) {
            return;
        }
        //fire all handlers for this event
        for (var i = 0, len = events.length; i < len; i++) {
            events[i].apply(null, args);
        }
    };

    // Holds the STUN server to use for PeerConnections.
    rtc.SERVER = {
        "iceServers": [{
            "url": "stun:stun.l.google.com:19302"
        }]
    };
    
    rtc.mediaConstraints = {'has_audio':true, 'has_video':true};

    // Array of known peer socket ids
    /**

{
    id:{
        status: statuses,
        pc: PeerConnection,
        stream: localStream,
        data: customData,
        offerSdp: calledOffer
    }
}
    
    statuses:   statuses: idle, call_inviting, call_invited, call_accepting,
                call_accepted, sdp_offering, sdp_offered, sdp_answering,
                sdp_answered, call
    
    messages:   login, call_invite, call_accept, call_dropm 
                sdp_offer, sdp_answer, ice_candidate
     */
    rtc.connections = {};
    
    rtc.id = null;
    
    rtc.isRTCPeerConnection = true;
    
    rtc.compatible = true;
    
    rtc.checkCompatibility = function checkCompatibility(errors){
        rtc.compatible = true;
        if(!window.WebSocket){
            errors.websocket = true;
            rtc.compatible = false;
        }
        if(!window.RTCPeerConnection && !window.PeerConnection){
            errors.peerconnection = true;
            rtc.compatible = false;
        }
        if(!navigator.getUserMedia){
            errors.usermedia = true;
            rtc.compatible = false;
        }        
        return rtc.compatible;
    }

    /**
     * Connects to the websocket server.
     */
    rtc.connect = function(server) {
        rtc._socket = new WebSocket(server);
        //after socket is opened
        rtc._socket.onopen = function() {
            rtc.fire('connected');            
        };
        //ws on mesessage event 
        rtc._socket.onmessage = function(msg) {
            var json = JSON.parse(msg.data);
            console.log("RECEIVED MESSAGE " + json.type);
            console.log(json);
            //fire proper event callback
            rtc.fire(json.type, json.data);
        };
        //ws error
        rtc._socket.onerror = function(err) {
            console.log('onerror');
            console.log(err);
            rtc.fire('socket_error', err);
        };
        //close our socket
        rtc._socket.onclose = function(data) {
            //fire external event
            rtc.fire('socket_closed', {});
        };
    };
    
    //emitted from server - obtain ws connections
    rtc.on('connections', function(data) {
        rtc.connections = data;
    });
    //received local id
    rtc.on('connectionId', function(data) {
        rtc.id = data.id;
        rtc.fire('logged',data.data);
    });
    
    rtc.on('connection_add', function(data) {
        rtc.connections[data.connectionId]  = data.data;
    });

    rtc.on('connection_remove', function(data) {
        delete rtc.connections[data.connectionId];
    });
    
    rtc.on('call_invite', function(data) {
        rtc.setStatus(data.connectionId, 'call_invited');
    });
    
    rtc.on('call_accept', function(data) {
        if(rtc.refuseIdleState(data.connectionId)){
            return false;                    
        }        
        rtc.setStatus(data.connectionId, 'call_accepted');
        //send sdp offer
        rtc.sdpOffer(data.connectionId);
    });
    
    rtc.on('call_drop', function(data) {
        rtc.stop(data.connectionId);
    });    

    rtc.on('sdp_offer', function(data) {
        if(rtc.refuseIdleState(data.connectionId)){
            return false;                    
        }        
        rtc.connections[data.connectionId].offerSdp = data.sdp;
        rtc.setStatus(data.connectionId, 'sdp_offered');
        rtc.sdpAnswer(data.connectionId);
    });

    rtc.on('sdp_answer', function(data) {
        if(rtc.refuseIdleState(data.connectionId)){
            return false;                    
        }        
        var pc = rtc.connections[data.connectionId].pc;
        if(rtc.isRTCPeerConnection){
            pc.setRemoteDescription(new RTCSessionDescription(data.sdp));            
        }
        else{
            console.log("pc specified remote description");
            pc.setRemoteDescription(pc.SDP_ANSWER, new SessionDescription(data.sdp));
        }
        
        rtc.setStatus(data.connectionId, 'sdp_answered');
    }); 
    
    //received ice candidate
    rtc.on('ice_candidate', function(data) {
        if(rtc.refuseIdleState(data.connectionId)){
            return false;                    
        }        
        var pc = rtc.connections[data.connectionId].pc;
        if(rtc.isRTCPeerConnection){
            pc.addIceCandidate(new RTCIceCandidate({sdpMLineIndex:data.label, candidate:data.candidate}));            
        }
        else{
            console.log("processing ice candidate");
            pc.processIceMessage(new IceCandidate(data.label, data.candidate));            
        }
    });   
    
    rtc.setStatus = function setStatus(connectionId,status){
        console.log("status [" + status + "]");
        rtc.connections[connectionId].status = status;
        rtc.fire('status',connectionId,status);
    }
    
    rtc.refuseIdleState = function(connectionId){
        return rtc.connections[connectionId].status == 'idle';
    }    
    
    rtc.send = function sendMessage(message){
        console.log("SENDING MSG " + message.type);
        console.log(message);
        rtc._socket.send(JSON.stringify(message));
    }
    
    rtc.login = function loginMessage(userData){
        rtc.send({
            type:"login",
            data:userData
        });
    }
    
    rtc.invite = function callInvite(connectionId, opt){
        //create local media stream
        console.log('creating local media stream');
        rtc.setStatus(connectionId,'call_inviting');
        rtc.createStream(connectionId, opt, function callInviteStream(stream){           
            console.log('inviting call for id: ' + connectionId);
            rtc.send({
                "type": "call_invite",
                "data": {
                    "connectionId": connectionId
                }
            });            
        });       
    }
    
    rtc.accept = function callAccept(connectionId, opt){
        //create local media stream
        console.log('creating local media stream');
        rtc.createStream(connectionId, opt, function callAcceptStream(stream){
            console.log('accepting call from id: ' + connectionId);
            rtc.send({
                "type": "call_accept",
                "data": {
                    "connectionId": connectionId
                }
            });
            rtc.setStatus(connectionId,'call_accepting');            
        });        
    }
    
    rtc.drop = function callDrop(connectionId){
        //drop call
        console.log('droping call');
        rtc.send({
            "type": "call_drop",
            "data": {
                "connectionId": connectionId
            }
        });
        rtc.stop(connectionId);
    }

    rtc.stop = function pcStop(connectionId){
        if(rtc.connections[connectionId].pc){
            rtc.connections[connectionId].pc.close();
            rtc.connections[connectionId].pc = null;            
        }
        if(rtc.connections[connectionId].stream){
            rtc.connections[connectionId].stream.stop();
        }
        rtc.setStatus(connectionId,'idle');
    }
    
    rtc.sdpOffer = function sdpOffer(connectionId) {        
        var pc = rtc.createPeerConnection(connectionId);
        if(rtc.isRTCPeerConnection){
            pc.createOffer( function(sessionDescription) {
                pc.setLocalDescription(sessionDescription);
                rtc.send({
                    "type": "sdp_offer",
                    "data": {
                        "connectionId": connectionId,
                        "sdp": sessionDescription
                    }
                });
            }, null, rtc.mediaConstraints);
        }
        else{
            var offer = pc.createOffer(rtc.mediaConstraints);
            pc.setLocalDescription(pc.SDP_OFFER, offer);
            rtc.send({
                "type": "sdp_offer",
                "data": {
                    "connectionId": connectionId,
                    "sdp": offer.toSdp()
                }
            });
            pc.startIce();                     
        }
        rtc.setStatus(connectionId,'sdp_offering');
    };

    rtc.sdpAnswer = function sdpAnswer(connectionId) {
        console.log("Answering call connectionId: " + connectionId);
        var pc = rtc.createPeerConnection(connectionId);
        if(rtc.isRTCPeerConnection){
            pc.setRemoteDescription(new RTCSessionDescription(rtc.connections[connectionId].offerSdp));
            // TODO: Abstract away video: true, audio: true for answers
            pc.createAnswer( function(sessionDescription) {
                pc.setLocalDescription(sessionDescription);
                rtc.send({
                    "type": "sdp_answer",
                    "data":{
                        "connectionId": connectionId,
                        "sdp": sessionDescription
                    }
                });
            }, null, rtc.mediaConstraints);                
        }
        else{
            console.log("Setting remote description");
            console.log(rtc.connections[connectionId].offerSdp);
            pc.setRemoteDescription(pc.SDP_OFFER, new SessionDescription(rtc.connections[connectionId].offerSdp));
            console.log("Creating answer");
            var answer = pc.createAnswer(rtc.connections[connectionId].offerSdp, rtc.mediaConstraints);
            pc.setLocalDescription(pc.SDP_ANSWER, answer);
            rtc.send({
                "type": "sdp_answer",
                "data":{
                    "connectionId": connectionId,
                    "sdp": answer.toSdp()
                }
            });                        
            pc.startIce();                 
        }
        rtc.setStatus(connectionId,'sdp_answering');
    };


    rtc.createStream = function createStream(connectionId, opt, onSuccess, onFail) {
        var options;
        onSuccess = onSuccess || function(stream) {};
        onFail = onFail || function() {
            alert("Could not connect stream.")
        };

        if(opt.audio && opt.video){
            options = {
                video: true,
                audio: true
            };
        }else if(opt.video){
            options = {
                video: true,
                audio: false
            };
        }else if(opt.audio){
            options = {
                video: false,
                audio: true
            };
        }else {
            options = {
                video: false,
                audio: false
            };
        }
        
        try{
            navigator.getUserMedia(options, function(stream) {
                //call dropped in the meantime
                if(rtc.refuseIdleState(connectionId)){
                    stream.stop();
                    return false;                    
                }
                rtc.connections[connectionId].stream = stream;
                onSuccess(stream);
                rtc.fire('stream_added',stream, connectionId);
            }, function(e) {
                onFail(e);
                rtc.fire('stream_error', e);
            });
        }
        catch(e){
            rtc.fire('stream_error', e);
        }
    }
        
    /**
     * Create new local peer connection for stream id
     */
    rtc.createPeerConnection = function createPeerConnection(connectionId) {
        console.log('createPeerConnection for id: ' + connectionId);
        try{
            rtc.connections[connectionId].pc = new window.RTCPeerConnection(rtc.SERVER);
            rtc.connections[connectionId].pc.onicecandidate = function(event) {
                if (event.candidate) {
                    rtc.send({
                        "type": "ice_candidate",
                        "data": {
                            "candidate": event.candidate.candidate,
                            "connectionId": connectionId,
                            "label": event.candidate.sdpMLineIndex
                        }
                    });
                }
            };
        } catch (e) {
            try {
                var stunServer = "";
                if (rtc.SERVER.iceServers.length !== 0) {
                    stunServer = rtc.SERVER.iceServers[0].url.replace('stun:', 'STUN ');
                }
                rtc.connections[connectionId].pc = new window.PeerConnection(stunServer, function onIceCandidate00(candidate, moreToFollow) {
                    if (candidate) {
                        rtc.send({
                            type: 'ice_candidate',
                            "data": {
                                "candidate": candidate.toSdp(),
                                "connectionId": connectionId,
                                "label": candidate.label
                            }
                        });
                    }
                });
                rtc.isRTCPeerConnection = false;
                console.log("rtc.isRTCPeerConnection = false");
            } catch (e) {
                console.log("Failed to create PeerConnection, exception: " + e.message);
                rtc.fire('pc_error', e);
                alert("Cannot create PeerConnection object; Is the 'PeerConnection' flag enabled in about:flags?");
                return null;
            }
        }        
        var pc = rtc.connections[connectionId].pc;        
        
        pc.onconnecting = function () {
            console.log("Session connecting.");
        }
  
        pc.onopen = function() {
            console.log("Session opened.");
            // TODO: Finalize this API
            rtc.fire('pc_opened',connectionId);
        };
        
        pc.onaddstream = function(event) {
            console.log("Remote stream added.");
            // TODO: Finalize this API
            rtc.fire('rstream_added', event.stream, connectionId);
            rtc.setStatus(connectionId,'call');
        };
        
        pc.onremovestream = function(){
            console.log("Remote stream removed.");
        }
        
        pc.addStream(rtc.connections[connectionId].stream);
        
        return pc;
    }
    
}).call(this);
