/**
 * TetATet - client side, presentation layer javascript
 *
 *
 * @author Milan Rukavina rukavinamilan@gmail.com
 *
 *
 */
//UPDATE this var
var wsURL = 'ws://tetatet.eu01.aws.af.cm:1337';

//connect to ws server
function nodeLogin(userInfo){
    console.log(userInfo);
    rtc.connect(wsURL);
    rtc.on('connected', function(){
        rtc.login(userInfo);
    });               
}

function hideLoginPanel(){
    $("#loginPanel").hide();
}

            
rtc.on('connections', function(data){
    renderConnections();
});
            
rtc.on('connection_add', function(data) {
    renderConnections();
});            
            
rtc.on('connection_remove', function(data) {
    $("#connection_" + data.connectionId).remove();
});
            
rtc.on('rstream_added', function(stream, connectionId){
    $("#remoteVideo").attr("src",window.URL.createObjectURL(stream));
});
            
rtc.on('stream_added', function(stream, connectionId){
    $("#localVideo").attr("src",window.URL.createObjectURL(stream));
});            
            
rtc.on('status',function(connectionId,status){
    if(status == 'idle'){
        $("#localVideo").attr("src","");
        $("#remoteVideo").attr("src","");
    }
    renderCallCell(connectionId);
});

rtc.on('socket_error',function(e){
    alert('Error connecting to media server.');
});

rtc.on('stream_error',function(e){
    alert('Error getting local media stram.');
});

rtc.on('pc_error',function(e){
    alert('Error creating peer connection.');
});

function renderCallCell(connectionId){
    var connection = rtc.connections[connectionId];
    var status = connection.status?connection.status:'idle';
    var callCell = $("#callCell_" + connectionId);
    callCell.find(".status,.cmdBtn").data("id", connectionId).hide();
    var state = 'idle';
    //statuses: idle, call_inviting, call_invited, call_accepting,
    //          call_accepted, sdp_offering, sdp_offered, sdp_answering,
    //          sdp_answered, call
    switch(status){
        case "idle":
            state = 'idle';
            break;
        case "call_inviting":
            state = 'calling';
            break;
        case "call_invited":
            state = 'called';
            break;
        case "call_accepting":
            state = 'talk';
            break;
        case "call_accepted":
            state = 'talk';
            break;
        case "sdp_offering":
            state = 'talk';
            break;
        case "sdp_offered":
            state = 'talk';
            break;
        case "sdp_answering":
            state = 'talk';
            break;
        case "sdp_answered":
            state = 'talk';
            break;
        case "call":
            state = 'talk';
            break;                        
    } 
    callCell.find("." + state).show();
    callCell.find(".callStatus").show();
                    
    //button call
    callCell.find(".call.cmdBtn").unbind("click").click(function(){
        rtc.invite($(this).data("id"), {
            audio:true,
            video:true
        });
    });
    //button answer
    callCell.find(".answer.cmdBtn").unbind("click").click(function(){
        console.log("Clicked to answer the connectionId: " + $(this).data("id"));
        rtc.accept($(this).data("id"), {
            audio:true,
            video:true
        });
    });
    //button drop
    callCell.find(".drop.cmdBtn").unbind("click").click(function(){
        console.log("Clicked to drop the connectionId: " + $(this).data("id"));
        rtc.drop($(this).data("id"));
    });    
}
            
function renderConnections(){
    var content = tmpl("connectionsTpl", {
        rows:rtc.connections
    });
    $("#connections").html(content);
    for ( var id in rtc.connections){
        renderCallCell(id);
    }                
}

$(document).ready(function(){
    var errors = {};
    if(!rtc.checkCompatibility(errors)){
        console.log(errors);
        for(var error in errors){
            $("#compatibilityPanel ." + error).show();
        }
        $("#compatibilityPanel").show();
        $("#loginPanel").hide();
    }
});