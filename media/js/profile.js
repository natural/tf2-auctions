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


var playerListingsOkay = function(listings) {
    $$('small-load-listings-msg')
	.text('Listings loaded, showing: ' + listings.length).delay(3000).fadeOut()
    $$('listings-title').text('Listings')
    $$('listings-wrapper').slideDown()
}

var playerListingsError = function(request, status, error) {
}

var playerBidsOkay = function(bids) {
    $$('small-load-bids-msg')
	.text('Bids loaded, showing: ' + bids.length).delay(4000).fadeOut()
    $$('bids-title').text('Bids')
    $$('bids-wrapper').slideDown()
}

var playerBidsError = function(request, status, error) {
}

var playerProfileOkay = function(profile) {
}

var playerProfileError = function(request, status, error) {
}


var ownProfileOkay = function(profile) {
    showProfile(profile)
    var id64 = id64View()
    if (id64 != profile.id64) {
	new ProfileLoader({suffix: id64, success: playerProfileOkay, error: playerProfileError})
    } else {
	var name = profile['personaname']
	var msg = 'Profile loaded.  Welcome, ' + name + '!'
	setTitle(name)
	$$('small-load-msg').text(msg).fadeIn().delay(2000).fadeOut()
	$$('small-load-listings-msg').text('Loading your listings...').fadeIn()
	new ListingsLoader({suffix: id64, success: playerListingsOkay, error: playerListingsError})
	$$('small-load-bids-msg').text('Loading your bids...').fadeIn()
	new BidsLoader({suffix: id64, success: playerBidsOkay, error: playerBidsError})
    }
}


var ownProfileError = function(request, status, error) {
    if (request.status==401) {
	// not logged in
    }
}


var schemaReady = function(s) {
    new AuthProfileLoader({success: ownProfileOkay, error:ownProfileError})
}


$(document).ready(function() {
    $$('small-load-msg').text('Loading...')
    new SchemaLoader({success: schemaReady})
})
