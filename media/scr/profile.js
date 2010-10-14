

var listingFormats = {
    items: function(v) {
        var s = $.map(v, function(item, idx) { return '<span class="defindex-lazy">' + item.defindex + '</span>' })
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
	$.each(Object.keys(listing), function(index, key) {
	    var loc = '.-listing-' + key
            var val = (listingFormats[key] || listingFormats.any)(listing[key])
	    $(loc, c).html(val)
	})
        console.log('listing:', listing)
	ltable.append(c)
    })
    SchemaTool.setImages()
    console.log('created new schema loader', this)
}


var bidsOkay = function(bids) {
    $('#load-own-msg-bids').text('Success! Your bids: ' + bids.length)
}


var profileReady = function(profile) {
    var listingsError = function(err) { console.error(err) }
    var bidsError = function(err) { console.error(err) }

    $('#avatar:empty').html(makeImg({src: profile.avatar}))
    $('#load-profile-msg').text('Profile loaded. Welcome, ' + profile['personaname'] + '!')
    $.ajax({url: '/api/v1/bids/'+profile.steamid, dataType: 'json', cache: true,
	    success: bidsOkay, error: bidsError})
    $.ajax({url: '/api/v1/listings/'+profile.steamid, dataType: 'json', cache: true,
	    success: listingsOkay, error: listingsError})
}


var schemaReady = function(s) {
    SchemaTool.init(s)
    new ProfileLoader({success: profileReady, id64: __id64__})
}


$(document).ready(function() {
    $('#load-own-msg-bids').text('Loading your bids...')
    $('#load-own-msg-listings').text('Loading your listings...')
    new SchemaLoader({success: schemaReady})
})



