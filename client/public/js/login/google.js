// Enter a client ID for a web application from the Google Developer Console.
// The provided clientId will only work if the sample is run directly from
// https://google-api-javascript-client.googlecode.com/hg/samples/authSample.html
// In your Developer Console project, add a JavaScript origin that corresponds to the domain
// where you will be running the script.
var clientId = '909370428431.apps.googleusercontent.com';

// To enter one or more authentication scopes, refer to the documentation for the API.
var scopes = ['https://www.googleapis.com/auth/userinfo.profile','https://www.googleapis.com/auth/userinfo.email'];

function gCheckAuth(isImmediate) {
    if(isImmediate == null){
        isImmediate = true;
    }
    gapi.auth.authorize({
        client_id: clientId, 
        scope: scopes, 
        immediate: isImmediate
    }, function gHandleAuthResult(authResult) {
        if (authResult && !authResult.error) {
            hideLoginPanel();
            gMakeApiCall();
        }
    });
}

$(document).ready(function(){
    $("#gLogin").click(function(){
        gCheckAuth(false);
    });
});

// Load the API and make an API call.  Display the results on the screen.
function gMakeApiCall() {
    var request = gapi.client.request({'path': '/oauth2/v2/userinfo'});    
    request.execute(function(resp) {
        nodeLogin({provider:'google',data: resp});
    });
}