var $$ = function(suffix, next) { return $('#profile-'+suffix, next) }
var id64Internal = null
var id64View = function() { return id64Internal || pathTail() }


var setHeadings = function(prefix) {
    $$('backpack-title').text('{0}Backpack'.fs(prefix ? prefix+' ' : ''))
    $$('bids-title').text('{0}Recent Bids'.fs(prefix ? prefix+' ' : ''))
    $$('listings-title').text('{0}Recent Listings'.fs(prefix ? prefix+' ' : ''))
}


//
// backpack
//
var backpackShow = function() {
    siteMessage('Loading backpack...')
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
    siteMessage('Backpack loaded.').fadeOut()
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
    // stupid tweaks:
    $$('backpack-pod').width($$('backpack-pod').width()+32)
    $('#backpack-tools-profile').width(
	$$('backpack-pod tbody:visible').first().width()-12
    )
}


//
// bids
//
var bidsShow = function() {
    siteMessage('Loading bids...')
    new BidsLoader({suffix: id64View()+'?ext=1', success: bidsReady, error: bidsError})
}

var bidsHide = function() {
   $$('bids-show').fadeIn(function() {
       $$('bids-inner').fadeOut(function() {
	   $$('bids-hide').fadeOut()
       })
    })
}

var bidsReady = function(bids) {
    siteMessage('Bids loaded.').fadeOut()
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
    $('div.bid-marker td.item-view div:empty').parent().remove()
    new SchemaTool().setImages()
}


var putBid = function(bid, clone) {
    clone.removeClass('null prototype')
    var next = 0
    $.each(bid.items, function(index, item) {
	$($('.item-view div', clone)[next]).append($.toJSON(item))
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
    siteMessage('Loading listings...')
    new ListingsLoader({
	suffix: id64View()+'?ext=1', success: listingsReady, error: listingsError
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
    siteMessage('Listings loaded.').fadeOut()
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
	    putListing(listing, proto.clone().addClass('listing-seed'))
	})
	new SchemaTool().setImages()
	$('div.listing-seed td.item-view div:empty').parent().remove()
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
	$($('.item-view div', clone)[next]).append($.toJSON(item))
	next += 1
    })
    $('.profile-listing-view-link a', clone).attr('href', '/listing/'+listing.id)
    $('.bid-count-seed', clone).text(listing.bid_count || '0') // bid_count because bids aren't fetched.
    $$('listings').append(clone)
}


//
// applies to non-auth, auth, and owner-auth
//
var playerProfileOkay = function(profile) {
    setTitle(profile.personaname)
    siteMessage().fadeOut()

    $$('title').text(profile.personaname)
    $$('avatar').attr('src', profile.avatarmedium).addClass(profile.online_state)
    $$('status').html(profile.message_state).addClass(profile.online_state).slideDown()

    $$('badge').slideDown()
    $('.init-seed').fadeIn()

    var ownerid = profile.steamid
    id64Internal = profile.steamid
    $$('add-owner-friend').attr('href', 'steam://friends/add/{0}'.fs(ownerid))
    $$('chat-owner').attr('href', 'steam://friends/message/{0}'.fs(ownerid))

}

var playerProfileError = function(request, status, error) {
    siteMessage().fadeAway()
}


var otherProfileOkay = function(profile) {
    $$('leave-msg-title').text('Leave a message for {0}:'.fs(profile.personaname))
    $$('leave-msg-pod').slideDown()
    playerProfileOkay(profile)
}


// auth profile -> maybe load other player profile, load (bids+backpack+listings)
var authProfileOkay = function(profile) {
    defaultUserAuthOkay(profile)
    var id64 = id64View()
    if (id64 != profile.id64 && id64 != profile.custom_name ) {
	// authorized user viewing another profile; load separately:
	setHeadings()
	new ProfileLoader({suffix: id64, success: otherProfileOkay, error: playerProfileError})
    } else {
	// authorized user viewing their own profile
	setHeadings('My')
	$$('is-you').text('This is you!').slideDown()
	$$('view-msg-title').text('Messages for you:')
	$$('view-msg-pod').slideDown()
	playerProfileOkay(profile)
    }
    showProfile(profile)
}

// auth profile failure -> load player (backpack+bids+listings+profile)
var authProfileError = function(request, status, error) {
    defaultUserAuthError(request, status, error)
    if (request.status==401) {
	setHeadings()
	siteMessage('Loading profile...')
	// internal not set, fallback to path tail, works because profile loader works
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

    $('div.organizer-view td.item-view, #backpack-ac td').live('mouseover', hoverItem)
    $('div.organizer-view td.item-view, #backpack-ac td').live('mouseout', unhoverItem)
    $('.listing-view').live('mouseover', function() { $(this).addClass('listing-hover') })
    $('.listing-view').live('mouseout', function() { $(this).removeClass('listing-hover') })
}


// document loaded -> load schema
$(document).ready(function() {
    siteMessage('Loading...')
    new SchemaLoader({success: function(schema) {
	schemaReady(schema)
	$$('backpack-hide').click(backpackHide)
	$$('backpack-show').click(backpackShow)
	$$('bids-hide').click(bidsHide)
	$$('bids-show').click(bidsShow)
	$$('listings-hide').click(listingsHide)
	$$('listings-show').click(listingsShow)

	// stupid fracking browsers don't do this right.  arg.
	if (window.location.search.indexOf('show=listings')>-1) { listingsShow() }
	if (window.location.search.indexOf('show=backpack')>-1) { backpackShow() }
    }})
})
