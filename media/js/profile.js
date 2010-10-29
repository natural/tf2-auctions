var $$ = function(suffix, next) { return $('#profile-'+suffix, next) }
var id64View = function() { return window.location.pathname.split('/').pop() }


var setHeadings = function(prefix) {
    $$('backpack-title').text('{0}Backpack'.fs(prefix ? prefix+' ' : ''))
    $$('bids-title').text('{0}Recent Bids'.fs(prefix ? prefix+' ' : ''))
    $$('listings-title').text('{0}Recent Listings'.fs(prefix ? prefix+' ' : ''))
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
    smallMsg('Backpack loaded.').fadeOut()
    $$('backpack-show').fadeOut(function() {
	new ListingsLoader({
	    suffix: id64View(),
	    success: function(listings) {
		new BidsLoader({
		    suffix: id64View(),
		    success: function(bids) {
			putBackpack(backpack, listings, bids)
		    }})
	    }})
    })
}


var backpackError = function(request, status, error) { }


var putBackpack = function(backpack, listings, bids) {
    if (!putBackpack.initOnce) {
	var schema = new SchemaTool()
	var tipTool = new TooltipView(schema)
	var bpNav = new BackpackNavigator('profile')
	var bpTool = new BackpackItemsTool(backpack, listingItemsUids(listings), bidItemsUids(bids), 'profile')
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
	$$('backpack-inner td').hover(hoverItem, unhoverItem)
	putBackpack.initOnce = true
    }
    $$('backpack-hide').fadeIn()
    $$('backpack-inner').fadeIn()
}


//
// bids
//
var bidsShow = function() {
    smallMsg('Loading bids...')
    new BidsLoader({suffix: id64View(), success: bidsReady, error: bidsError})
}

var bidsHide = function() {
   $$('bids-show').fadeIn(function() {
       $$('bids-inner').fadeOut(function() {
	   $$('bids-hide').fadeOut()
       })
    })
}

var bidsReady = function(bids) {
    smallMsg('Bids loaded.').fadeOut()
    $$('bids-show').fadeOut(function() {
	$$('bids-inner').fadeIn(function() {
	    if (!bids.length) {
		$$('bids-none').text('Nothing recent.').slideDown()
		$$('bids-hide').fadeOut()
	    } else {
		if (!bidsReady.initOnce) {
		    bidsReady.initOnce = true
		    putBids(bids)
		}
		$$('bids-hide').fadeIn()
	    }
	})
    })
}


var bidsError = function(request, status, error) {
}

var putBids = function(bids) {
    var proto = $$('bids div.prototype')
    $.each(bids, function(idx, bid) {
	putBid(bid, proto.clone().addClass('bid-marker'))
    })
    $('div.bid-marker td.item-display div:empty').parent().remove()
    new SchemaTool().setImages()
}


var putBid = function(bid, clone) {
    clone.removeClass('null prototype')
    var next = 0
    $.each(bid.items, function(index, item) {
	$($('.item-display div', clone)[next]).append($.toJSON(item))
	next += 1
    })
    $('.profile-bid-view-link a', clone).attr('href', '/listing/'+ bid.listing.id)
    if (bid.message_public) {
	$('.bid-message', clone).text(bid.message_public)
    } else {
	$('.bid-message, .bid-message-label', clone).remove()
    }
    $('.bid-status', clone).text(bid.status)
    $('.bid-created', clone).text('' + new Date(bid.created))
    $$('bids').append(clone)
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
    smallMsg('Listings loaded.').fadeOut()
    $$('listings-show').fadeOut(function() {
	$$('listings-inner').fadeIn(function() {
	    if (!listings.length) {
		$$('listings-none').text('Nothing recent.').slideDown()
	    } else {
		$$('listings-hide').fadeIn()
		putListings(listings)
	    }
	})
    })
}


var listingsError = function(request, status, error) {}


var putListings = function(listings) {
    if (!putListings.initOnce) {
	var proto = $$('listings-inner div.prototype')
	$.each(listings, function(idx, listing) {
	    putListing(listing, proto.clone().addClass('listing-wrapper'))
	})
	new SchemaTool().setImages()
	$('div.listing-wrapper td.item-display div:empty').parent().remove()
	putListings.initOnce = true
    }
}


var putListing = function(listing, clone) {
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
	$($('.item-display div', clone)[next]).append($.toJSON(item))
	next += 1
    })
    $('.profile-listing-view-link a', clone).attr('href', '/listing/'+listing.id)
    $$('listings').append(clone)
}


//
// applies to non-auth, auth, and owner-auth
//
var playerProfileOkay = function(profile) {
    setTitle(profile.personaname)
    smallMsg().fadeOut()
    $$('title').text(profile.personaname)
    $$('avatar').attr('src', profile.avatarfull)
    $$('badge').slideDown()
    $('.init-container').fadeIn()
}

var playerProfileError = function(request, status, error) {
    smallMsg().fadeAway()
}

// auth profile -> maybe load other player profile, load (bids+backpack+listings)
var authProfileOkay = function(profile) {
    defaultUserAuthOkay(profile)
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
}

// auth profile failure -> load player (backpack+bids+listings+profile)
var authProfileError = function(request, status, error) {
    defaultUserAuthError(request, status, error)
    if (request.status==401) {
	setHeadings()
	smallMsg('Loading profile...')
	new ProfileLoader({suffix: id64View(), success: playerProfileOkay, error: playerProfileError})
    }
}


// schema loaded -> (maybe) load auth profile
var schemaReady = function(schema) {
    new AuthProfileLoader({success: authProfileOkay, error:authProfileError})

    var st = new SchemaTool(schema)
    var tt = new TooltipView(st)
    var hoverItem = function(e) { tt.show(e); $(this).addClass('outline')  }
    var unhoverItem = function(e) {  tt.hide(e);  $(this).removeClass('outline') }

    $('div.organizer-view td.item-display, #backpack-ac td').live('mouseover', hoverItem)
    $('div.organizer-view td.item-display, #backpack-ac td').live('mouseout', unhoverItem)
    $('.listing-table').live('mouseover', function() { $(this).addClass('listing-hover') })
    $('.listing-table').live('mouseout', function() { $(this).removeClass('listing-hover') })
}


// document loaded -> load schema
$(document).ready(function() {
    smallMsg('Loading...')
    new SchemaLoader({success: schemaReady})

    $$('backpack-hide').click(backpackHide)
    $$('backpack-show').click(backpackShow)
    $$('bids-hide').click(bidsHide)
    $$('bids-show').click(bidsShow)
    $$('listings-hide').click(listingsHide)
    $$('listings-show').click(listingsShow)

    if (window.location.search.indexOf('show=listings')>-1) { listingsShow() }
    if (window.location.search.indexOf('show=backpack')>-1) { backpackShow() }
})
