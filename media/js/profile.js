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

var showListing = function(listing, clone) {
    clone.removeClass('null prototype')
    if (listing.description) {
	$('.listing-description', clone).text(listing.description)
    } else {
	$('.listing-description-label', clone).empty()
	$('.listing-description', clone).empty()
    }
    $('.listing-owner', clone).text(listing.owner.personaname)
    $('.listing-avatar', clone).attr('src', listing.owner.avatar)
    var next = 0
    $.each(listing.items, function(index, item) {
	$( $('.item-display div', clone)[next]).append( $.toJSON(item) )
	next += 1
    })
    $$('listings-listings').append(clone)
}


var listingsOkay = function(listings) {
    var llen = listings.length
    if (llen > 0) {
	var proto = $$('listings-inner div.prototype')
	$.each(listings, function(idx, listing) {
	    showListing(listing, proto.clone().addClass('listing-wrapper'))
	})
    } else {
	$('#load-own-msg-listings').text("You haven't listed any items yet.")
    }
    new SchemaTool().setImages()
    $('div.listing-wrapper td.item-display div:empty').parent().remove()
}

//
// backpack
//
var backpackShow = function() {
    smallMsg('Loading backpack...')
    new BackpackLoader({
	suffix: id64View(), success: backpackReady, error: backpackError
    })
}

var backpackHide = function() {
    // nb:  this is a nice fadein/fadeout order
    $$('backpack-hide').fadeOut(function() {
	$$('backpack-inner').fadeOut(function() {
	    $$('backpack-show').fadeIn()
	})
    })
}

var backpackReady = function(backpack) {
    smallMsg('Backpack loaded.')
    $$('backpack-show').fadeOut(function() { backpackReady__(backpack) })
}


var backpackError = function(request, status, error) { }


var backpackReady__ = function(backpack) {
    if (!backpack.profileInit) {
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
	$$('backpack td').hover(hoverItem, unhoverItem)
	backpack.profileInit = true
    }
    $$('backpack-hide').fadeIn()
    $$('backpack-inner').fadeIn()
//    $$('backpack-inner').width( $$('backpack-inner table.backpack tbody').first().width() )
}




//
// bids
//
var bidsReady = function(bids) {
    smallMsg('Bids loaded.').fadeOut(1000)
    //$$('bids-wrapper').slideDown()
    if (!bids.length < 10) {
	$$('bids-none').text('Nothing recent.').slideDown()
    }
}


var bidsError = function(request, status, error) {
}

var bidsShow = function() {
    smallMsg('Loading bids...')
    //new BidsLoader({suffix: id64View(), success: bidsReady, error: bidsError})
}

var bidsHide = function() {
   $$('bids-show').fadeIn(function() {
       $$('bids-inner').fadeOut(function() {
	   $$('bids-hide').fadeOut()
       })
    })
}


//
// listings
//
var listingsShow = function() {
    smallMsg('Loading listings...')
    new ListingsLoader({
	suffix: id64View(), success: listingsReady, error: listingsError
    })
}

var listingsHide = function() {
   $$('listings-show').fadeIn(function() {
       $$('listings-inner').fadeOut(function() {
	   $$('listings-hide').fadeOut()
       })
    })
}

var listingsReady = function(listings) {
    smallMsg('Listings loaded.')
    $$('listings-show').fadeOut(function() {
	$$('listings-inner').fadeIn(function() {
	    $$('listings-hide').fadeIn()
	})
    })
    if (!listings.length) {
	$$('listings-none').text('Nothing recent.').slideDown()
    } else {
	listingsOkay(listings)
    }
}


var listingsError = function(request, status, error) {}




//
// applies to non-auth, auth, and owner-auth
//
var playerProfileOkay = function(profile) {
    setTitle(profile.personaname)
    $$('title').text(profile.personaname)
    $$('avatar').attr('src', profile.avatarfull)
    $$('badge').slideDown()
    smallMsg().fadeAway()
    $('.init-container').fadeIn()
}

var playerProfileError = function(request, status, error) {
    smallMsg().fadeAway()
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
    //new BidsLoader({suffix: id64, success: bidsReady, error: bidsError})
}


// auth profile failure -> load player (backpack+bids+listings+profile)
var authProfileError = function(request, status, error) {
    var id64 = id64View()
    if (request.status==401) {
	setHeadings()
	smallMsg('Loading profile...')
	//new BidsLoader({suffix: id64, success: bidsReady, error: bidsError})
	new ProfileLoader({suffix: id64, success: playerProfileOkay, error: playerProfileError})
    }
}


// schema loaded -> maybe load auth profile
var schemaReady = function(s) {
    new AuthProfileLoader({success: authProfileOkay, error:authProfileError})
}

// document loaded -> load schema
$(document).ready(function() {
    $$('backpack-hide').click(backpackHide)
    $$('backpack-show').click(backpackShow)
    $$('bids-hide').click(bidsHide)
    $$('bids-show').click(bidsShow)
    $$('listings-hide').click(listingsHide)
    $$('listings-show').click(listingsShow)

    smallMsg('Loading...')
    new SchemaLoader({success: schemaReady})

    if (window.location.search.indexOf("show=listings")>-1) {
	$$('listings-show').click()
    }

    if (window.location.search.indexOf("show=backpack")>-1) {
	$$('backpack-show').click()
    }


})
