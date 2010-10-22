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


var listingsReady = function(listings) {
    smallMsg('Listings loaded.')
    $$('listings-title').text('Listings')
    $$('listings-wrapper').slideDown()
}

var listingsError = function(request, status, error) {
}

var bidsReady = function(bids) {
    smallMsg('Bids loaded.').fadeOut(1000)
    $$('bids-title').text('Bids')
    $$('bids-wrapper').slideDown()
}

var bidsError = function(request, status, error) {
}


var playerProfileOkay = function(profile) {
    setTitle(profile.personaname)
    $$('title').text(profile.personaname)
    $$('avatar').attr('src', profile.avatarfull)
    $$('badge').slideDown()
    smallMsg().fadeAway()
}


var playerProfileError = function(request, status, error) {
    smallMsg().fadeAway()
}


var ownProfileOkay = function(profile) {
    var id64 = id64View()
    showProfile(profile)
    if (id64 != profile.id64) {
	// signed in, but viewing someone else's profile, so we load
	// that also:
	smallMsg('Loading profile...')
	new ProfileLoader({suffix: id64, success: playerProfileOkay, error: playerProfileError})
    } else {
	// this is them:
	playerProfileOkay(profile)
	$$('is-you').text('This is you!').slideDown()
    }
    new ListingsLoader({suffix: id64, success: listingsReady, error: listingsError})
    new BidsLoader({suffix: id64, success: bidsReady, error: bidsError})
    smallMsg('Loading bids...')
}


var ownProfileError = function(request, status, error) {
    var id64 = id64View()
    if (request.status==401) {
	// not logged in
	smallMsg('Loading profile...')
	new ProfileLoader({suffix: id64, success: playerProfileOkay, error: playerProfileError})
	new ListingsLoader({suffix: id64, success: listingsReady, error: listingsError})
	new BidsLoader({suffix: id64, success: bidsReady, error: bidsError})
    }
}


var schemaReady = function(s) {
    smallMsg('Loading profile...')
    new AuthProfileLoader({success: ownProfileOkay, error:ownProfileError})
}


$(document).ready(function() {
    smallMsg('Loading...')
    new SchemaLoader({success: schemaReady})
})
