var $$ = function(suffix, next) { return $('#profile-'+suffix, next) }
var id64Internal = null
var id64View = function() { return id64Internal || pathTail() }


var setHeadings = function(prefix) {
    $$('backpack-title').text('{0}Backpack'.fs(prefix ? prefix+' ' : ''))
    $$('bids-title').text('{0}Recent Bids'.fs(prefix ? prefix+' ' : ''))
    $$('listings-title').text('{0}Recent Listings'.fs(prefix ? prefix+' ' : ''))
}


//
// messages
//
var messagesReady = function(msgs) {
    if (!putMessages.initOnce) {
	putMessages(msgs)
	putMessages.initOnce = true
    }
}


var putMessages = function(msgs) {
    var msgCount = msgs.messages.length
    var showEmpty = function () {
	$$('msg-none').text('No messages.  Too bad.').fadeIn()
	$$('view-msg-count').text('')
    }
    var showCount = function (c) { $$('view-msg-count').text('({0})'.fs(c) ) }
    var showCounter = function(c) {
	if (c) {
	    showCount(msgCount)
	} else {
	    showEmpty()
	}
    }
    showCounter(msgCount)
    if (!msgCount) { return }

    $.each(msgs.messages, function(idx, msg) {
	var clone = $$('view-msg-pod div.prototype').clone()
	$('.profile-msg-text-seed', clone).text(msg.message)
	new StatusLoader({
	    suffix: msg.source,
	    success: function(status) {
		var link = '<a href="/profile/{0}">{1}</a>'
		if (status.avatar_icon) {
		    var img = '<img src="{0}" class="msg-avatar" />'.fs(status.avatar_icon)
		    $('.profile-msg-sender-name', clone)
			.append(link.fs(msg.source, img))
		    $('.profile-msg-sender-name img', clone)
			.addClass('profile-status ' + status.online_state)
		}
		$('.profile-msg-sender-name', clone)
		    .append('{0} wrote:'.fs( link.fs(msg.source, status.name)) )
	    }
	})
	$('.profile-msg-created-seed', clone).text('Left: {0}'.fs(msg.created))
	clone.removeClass('null prototype')
	$('.profile-msg-remove', clone).click(function (e) {
	    var removeMessageOkay = function(results) {
		msgCount -= 1
		showCounter(msgCount)
	    }
	    clone.slideUp(function() {
		$.ajax({
		    url: '/api/v1/auth/remove-message',
		    type: 'POST',
		    dataType:'json',
		    data: $.toJSON({key: msg.key}),
		    success: removeMessageOkay,
		})
	    })
	    console.log('remove msg:', msg.key)
	})
	$$('view-msg-pod').append(clone)
	console.log('showing msg:', msg)
    })
    $$('view-msg-pod').slideDown()
}


//
// backpack
//
var backpackShow = function() {
    siteMessage('Loading backpack...')
    $$('backpack-loading').text('Loading...').fadeIn()
    new BackpackLoader({suffix: id64View(), success: backpackReady})
}


var backpackReady = function(backpack) {
    siteMessage('Backpack loaded.').fadeOut()

    if (!putBackpack.initOnce) {
	putBackpack.initOnce = true
    new ListingsLoader({
	suffix: id64View(),
	success: function(listings) {
	    new BidsLoader({
		suffix: id64View(),
		success: function(bids) {
		    $$('backpack-loading').fadeOut( function () {
			$$('backpack-loading').detach() // lol wut
			putBackpack(backpack, listings, bids)
		    })
		}
	    })
	}
    })
    }
}


var putBackpack = function(backpack, listings, bids) {
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
    $$('bids-loading').text('Loading...').fadeIn(function() {
	new BidsLoader({suffix: id64View()+'?ext=1', success: bidsReady, error: bidsError})
    })
}

var bidsReady = function(bids) {
    siteMessage('Bids loaded.').fadeOut()

	$$('bids-inner').fadeIn(function() {
	    if (!bids.length) {
		$$('bids-none').text('Nothing recent.').slideDown()
	    } else {
		if (!bidsReady.initOnce) {
		    bidsReady.initOnce = true
		    putBids(bids)
		}
	    }
	})
    window.setTimeout(function() { $$('bids-loading').fadeAway() }, 500)
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
    $$('listings-loading').text('Loading...').fadeIn(function() {
	new ListingsLoader({suffix: id64View()+'?ext=1', success: listingsReady, error: listingsError})
    })
}


var listingsReady = function(listings) {
    siteMessage('Listings loaded.').fadeOut()
    $$('listings-inner').fadeIn(function() {
	if (!listings.length) {
	    $$('listings-none').text('Nothing recent.').slideDown()
	} else {
	    putListings(listings)
	}
    })
    window.setTimeout(function() { $$('listings-loading').fadeAway() }, 500)
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
    if (profile.avatarmedium) {
	$$('avatar').attr('src', profile.avatarmedium)
    }
    new StatusLoader({
	suffix: profile.id64, success: function(status) {
	    $$('avatar').addClass(status.online_state)
	    $$('status').html(status.message_state).addClass(status.online_state).slideDown()
	}
    })
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

var submitMessage = function() {
    var txt = $$('leave-msg-txt').val().slice(0,400)
    if (!txt) {
	$$('leave-msg-form').slideUp(function() {
	    $$('leave-msg-title').text('Empty message?  Really?  Nothing sent!')
	})
	return
    }
    var output = {message: txt, target: id64View()}
    var submitMessageOkay = function(results) {
	$$('leave-msg-form').slideUp(function() {
	    $$('leave-msg-title').text('Message sent!')
	})
    }
    var submitMessageError = function(request, status, error) {
	if (request.status==500) {
	    try {
		var err = $.parseJSON( request.responseText )
		if (err.exception == 'Mailbox full') {
		    $$('leave-msg-form').slideUp(function() {
			$$('leave-msg-title').text('Your message was not sent!  Target mailbox is full.')
		    })
		}
	    } catch (e) {}
	}
    }
    $.ajax({
	url: '/api/v1/auth/leave-message',
	type: 'POST',
	dataType:'json',
	data: $.toJSON(output),
	success: submitMessageOkay,
	error: submitMessageError
    })
}


var otherProfileOkay = function(profile) {
    $$('leave-msg-title').text('Leave a message for {0}:'.fs(profile.personaname))
    $$('leave-msg-txt').width('50%').height(150)
    $$('leave-msg-pod').slideDown()
    $$('leave-msg-submit').click(submitMessage)
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
	$$('view-msg-title').text('My Messages')
	new MessagesLoader({
	    success: function(messages) {
		console.log('your messages:', messages)
		messagesReady(messages)
		$$('view-msg-pod').slideDown()
	    }
	})
	$$('settings-tab').fadeIn()
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
    // change order around to load given profile first!
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

var messagesShow = function() {
    console.log('showing msgs....')
}


var settingsShow = function() {
}


var tabCallbacks = {0: messagesShow, 1: listingsShow, 2: bidsShow, 3: backpackShow, 4: settingsShow}

// document loaded -> load schema
$(document).ready(function() {
    siteMessage('Loading...')
    $('#tabs').tabs({
	show: function(event, ui) {if (ui.index in tabCallbacks) { tabCallbacks[ui.index]() }}
    })
    $$('settings-tab').hide() // shown elsewhere
    new SchemaLoader({success: schemaReady})
})
