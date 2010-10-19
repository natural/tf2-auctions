var $$ = function(suffix, next) { return $('#profile-'+suffix, next) }
var id64View = function() { return window.location.pathname.split('/').pop() }


var listingFormats = {
    items: function(v) {
        var s = $.map(v, function(item, idx) {
            return '<span class="defindex-lazy">' + item.defindex + '</span>'
            })
        return s.join("&nbsp;")
    },
    any: function(v) {
        return "" + v
    }
}


var listingsOkay = function(listings) {
    var llen = listings.length
    var ltable = $("#own-listings")
    var proto = $("#own-listings tbody.prototype")
    if (llen > 0) {
	$('#load-own-msg-listings').text('Success! Showing your ' + llen + ' listing' + (llen==1?'':'s') + '.').fadeOut(5000)
	ltable.removeClass("null")
    } else {
	$('#load-own-msg-listings').text("You haven't listed any items yet.")
	// show add listing helper message
    }
    $.each(listings, function(index, listing) {
	var c = proto.clone()
	c.removeClass("null prototype")
	GL = listing
	$.each(keys(listing), function(index, key) {
	    var loc = '.-listing-' + key
            var val = (listingFormats[key] || listingFormats.any)(listing[key])
	    $(loc, c).html(val)
	})
        console.log('listing:', listing)
	ltable.append(c)
    })
    new SchemaTool().setImages()
}


var bidsOkay = function(bids) {
    $('#load-own-msg-bids').text('Success! Your bids: ' + bids.length)
}

var listingsError = function(err) { console.error(err) }
var bidsError = function(err) { console.error(err) }


var foo = function() {
    $.ajax({url: '/api/v1/player-bids/'+profile.steamid, dataType: 'json', cache: true,
	    success: bidsOkay, error: bidsError})
    $.ajax({url: '/api/v1/player-listings/'+profile.steamid, dataType: 'json', cache: true,
	    success: listingsOkay, error: listingsError})
}


var ownProfileOkay = function(profile) {
    showProfile(profile)
    var id64 = id64View()
    if (id64 != profile.id64) {
	new ProfileLoader({suffix:id64})
    } else {
	var msg = 'Profile loaded. Welcome, ' + profile['personaname'] + '!'
	$$('own-load-msg').text(msg).fadeIn()
	$$('own-msg-bids').text('Loading your bids...')
	$$('#load-own-msg-listings').text('Loading your listings...')
    }
}


var ownProfileError = function(request, status, error) {
    if (request.status==401) {
    // not logged in.
    }
}


var schemaReady = function(s) {
    new AuthProfileLoader({success: ownProfileOkay, error:ownProfileError})
}


$(document).ready(function() {
    new SchemaLoader({success: schemaReady})
})
