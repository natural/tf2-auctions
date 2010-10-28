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


var setHeadings = function(prefix) {
    $$('backpack-title').text('{0}Backpack'.fs( prefix ? prefix+' ' : ''))
    $$('bids-title').text('{0}Recent Bids'.fs( prefix ? prefix+' ' : ''))
    $$('listings-title').text('{0}Recent Listings'.fs( prefix ? prefix+' ' : ''))
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
    $$('listings-wrapper').slideDown()
    if (!listings.length < 10) {
	$$('listings-none').text('Nothing recent.').slideDown()
    }
}

var listingsError = function(request, status, error) {
}

var bidsReady = function(bids) {
    smallMsg('Bids loaded.').fadeOut(1000)
    $$('bids-wrapper').slideDown()
    if (!bids.length < 10) {
	$$('bids-none').text('Nothing recent.').slideDown()
    }
}


var bidsError = function(request, status, error) {
}

// applies to non-auth, auth, and owner-auth
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


var showBackpack = function(backpack) {
    var schema = new SchemaTool()
    var tipTool = new TooltipView(schema)
    var bpNav = new BackpackNavigator('profile')
    var bpTool = new BackpackItemsTool(backpack,[], [], 'profile')
    var hoverItem = function(e) {
        tipTool.show(e)
        try {
            var data = $('img', this).data('node')
        	if (!data.flag_cannot_trade) {
	            $(this).addClass('outline')
                }
        } catch (e) {}
    }
    var unhoverItem = function(e) {
        tipTool.hide(e)
        $(this).removeClass('outline')
    }
    bpNav.init()
    bpTool.init()
    schema.setImages()
    $('#profile-backpack td').hover(hoverItem, unhoverItem)
    $$('backpack').fadeIn()
    $('#profile-backpack').width($('#backpack-profile table.backpack tbody').first().width()).addClass('centered')
}


var backpackReady = function(backpack) {
    smallMsg('Backpack loaded.')
    $$('backpack-wrapper').slideDown()
    $$('backpack-show').click(function () {
	$$('backpack-show').fadeOut('fast', function() {
	    showBackpack(backpack)
	})
    })
}

var backpackError = function(request, status, error) {
    smallMsg('Backpack loaded.')
}


// auth profile -> maybe load other player profile, load (bids+backpack+listings)
var authProfileOkay = function(profile) {
    var id64 = id64View()
    if (id64 != profile.id64) {
	// authorized user viewing another profile; load separately:
	setHeadings()
	new ProfileLoader({suffix: id64, success: playerProfileOkay, error: playerProfileError})
    } else {
	// authorized user viewing their own profile
	setHeadings('My')
	$$('is-you').text('This is you!').slideDown()
	playerProfileOkay(profile)
    }
    showProfile(profile)
    smallMsg('Loading backpack...')
    new BackpackLoader({suffix: id64, success: backpackReady, error:backpackError})
    new BidsLoader({suffix: id64, success: bidsReady, error: bidsError})
    new ListingsLoader({suffix: id64, success: listingsReady, error: listingsError})
}


// auth profile failure -> load player (backpack+bids+listings+profile)
var authProfileError = function(request, status, error) {
    var id64 = id64View()
    if (request.status==401) {
	setHeadings()
	smallMsg('Loading profile...')
	new BackpackLoader({suffix: id64, success: backpackReady, error:backpackError})
	new BidsLoader({suffix: id64, success: bidsReady, error: bidsError})
	new ListingsLoader({suffix: id64, success: listingsReady, error: listingsError})
	new ProfileLoader({suffix: id64, success: playerProfileOkay, error: playerProfileError})
    }
}


// schema loaded -> maybe load auth profile
var schemaReady = function(s) {
    new AuthProfileLoader({success: authProfileOkay, error:authProfileError})
}

// document loaded -> load schema
$(document).ready(function() {
    smallMsg('Loading...')
    new SchemaLoader({success: schemaReady})
})
