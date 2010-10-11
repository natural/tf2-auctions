loadProfile = function(id64) {
    console.log('load profile', id64)
    $.ajax({url: 'http://tf2apiproxy.appspot.com/api/v1/profile/'+id64,
	    dataType: 'jsonp',
	    jsonpCallback:'tf2bayProfileLoader',
	    cache: true,
	    success: onProfileLoaded,
	    //error: onProfileError
	   })
}

loadBackpack = function(id64) {
    console.log('load backpack', id64)
    $.ajax({url: 'http://tf2apiproxy.appspot.com/api/v1/items/'+id64,
	    dataType: 'jsonp',
	    jsonpCallback:'tf2bayBackpackLoader',
	    cache: true,
	    success: onBackpackLoaded,
	    //error: onBackpackError
	   })
}

onProfileLoaded = function(profile) {
    $("#load-profile-msg").text("Profile loaded. Welcome, " + profile['personaname'] + '!')
}


onBackpackLoaded = function(backpack) {
    var count = backpack.length
    if (count>0) {
	var msg = "You've got " + count + " item" + (count==1?'':'s') + " to auction."
    } else {
	var msg = "You don't have anything to trade.  How can this be?  Go play!"
    }
    $("#load-backpack-msg").text(msg)
}


onSchemaLoad = function(schema) {
    console.log(schema)
}


onSchemaError = function(err) {
    console.error(err)
}


$(document).ready(function() {
    $.ajax({url: 'http://tf2apiproxy.appspot.com/api/v1/schema',
	    dataType: 'jsonp',
	    jsonpCallback:'tf2baySchemaLoader',
	    cache: true,
	    success: onSchemaLoad,
	    error: onSchemaError
	   })
    console.log('document ready')


})
