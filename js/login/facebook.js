/**
 * TetATet - client side, facebook login
 * NOTE - update with your fb appId
 *
 * @author Milan Rukavina rukavinamilan@gmail.com
 *
 *
 */

//login to FB
function fbLogin() {
    FB.login(function(response) {
        if (response.authResponse) {
            fbConnect();
            hideLoginPanel();
        }
        else {
        }
    },{scope: 'email'});
}

//connect to ws server
function fbConnect(){
    FB.api('/me', function(me) {
        nodeLogin({provider:'facebook',data: me});
    });                
} 

// Additional JS functions here
window.fbAsyncInit = function() {
    FB.init({
        appId      : '521555617857525', // App ID - update this!
        //channelUrl : '//webrtc.local/websocket/channel.html', // Channel File
        status     : true, // check login status
        cookie     : true, // enable cookies to allow the server to access the session
        xfbml      : true  // parse XFBML
    });
    
    if(!rtc.compatible){
        return false;
    }
    FB.getLoginStatus(function(response) {
        if (response.status === 'connected') {
            hideLoginPanel();
            // connected
            fbConnect();
        }
    });
};
// Load the SDK Asynchronously
(function(d){
    var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
    if (d.getElementById(id)) {
        return;
    }
    js = d.createElement('script');
    js.id = id;
    js.async = true;
    js.src = "//connect.facebook.net/en_US/all.js";
    ref.parentNode.insertBefore(js, ref);
}(document));

$(document).ready(function(){
    $("#fbLogin").click(function(){
        fbLogin();
    });
});



