var $$ = make$$('#profile-')
var id64Internal = null
var pathTail = function() { return window.location.pathname.split('/').pop() }
var id64View = function() { return id64Internal || pathTail() }
var setTitle = function(name) { document.title = document.title + ' - ' + name }


var MessagesLoader = makeLoader({
    prefix: '/api/v1/auth/list-messages',
    name: 'MessagesLoader'
})


var ProfileLoader = makeLoader({
    prefix: '/api/v1/public/profile/',
    name: 'ProfileLoader'
})

var makeStatusLoader = function(id) {
    return makeLoader({
        prefix: 'http://tf2apiproxy.appspot.com/api/v1/status/',
	dataType: 'jsonp',
	name: 'StatusLoader' + id
    })
}


//
// set various page headings
//
var setHeadings = function(prefix) {
    $$('backpack-title').text('{0}Backpack'.fs(prefix ? prefix+' ' : ''))
    $$('bids-title').text('{0}Recent Bids'.fs(prefix ? prefix+' ' : ''))
    $$('listings-title').text('{0}Recent Listings'.fs(prefix ? prefix+' ' : ''))
}


//
// called when messages have been fetched.
//
var messagesReady = function(msgs) {
    if (!putMessages.initOnce) {
	putMessages(msgs)
	putMessages.initOnce = true
    }
}


//
// called to display a sequence of messages.
//
var putMessages = function(msgs) {
    var msgCount = msgs.messages.length
    var putCount = function(c) {
	if (c) {
	    $$('view-msg-count').text('({0})'.fs(c) )
	} else {
	    $$('msg-none').text('No messages.  Too bad.').fadeIn()
	    $$('view-msg-count').text('')
	}
    }
    putCount(msgCount)
    if (!msgCount) { return }

    $.each(msgs.messages, function(idx, msg) {
	var clone = $$('view-msg-pod div.prototype').clone()
	$('.profile-msg-text-seed', clone).text(msg.message)
	var loader = makeStatusLoader(msg.source)
	new loader({
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
		putCount(msgCount)
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
	})
	$$('view-msg-pod').append(clone)
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
    var bpTool = new BackpackItemsTool({
	items: backpack.result.items.item,
	listingUids: listingItemsUids(listings),
	bidUids: bidItemsUids(bids),
	navigator: true,
	slug: 'profile',
	toolTips: true,
	outlineHover: true,
        rowGroups: BackpackPages.full(backpack.result.num_backpack_slots)
    })
    new AuthProfileLoader({
	suffix: '?settings=1&complete=1',
	success: function(profile) {
	    bpTool.init(profile.settings)
	},
	error: function(request, status, error) {
	    bpTool.init()
	}
    })
    $$('backpack-inner').fadeIn()
    putBackpack.initOnce = true
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
    new AuthProfileLoader({
	suffix: '?settings=1&complete=1',
	success: function(profile) { new SchemaTool().putImages(profile.settings) },
	error: function(request, status, error) { new SchemaTool().putImages() }
    })
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
        new AuthProfileLoader({
    	    suffix: '?settings=1&complete=1',
	    success: function(profile) { new SchemaTool().putImages(profile.settings) },
	    error: function(request, status, error) { new SchemaTool().putImages() }
	})
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
    var next = 0, prefix = '.profile'
    $.each(listing.items, function(index, item) {
	$($('.item-view div', clone)[next]).append($.toJSON(item))
	next += 1
    })
    $('.listing-view-link a', clone).attr('href', '/listing/'+listing.id)
    $('.bid-count-seed', clone).text(listing.bid_count || '0') // bid_count because bids aren't fetched.
    // TODO:  add min bid
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


//
// called when an authorized user is viewing a player profile other
// than their own.
//
var otherProfileOkay = function(profile) {
    $$('leave-msg-title')
	.text('Leave a message for {0}:'.fs(profile.personaname))
    $$('leave-msg-txt').width('90%').height(150)
    $$('leave-msg-submit').parent().width('90%')
    $$('leave-msg-pod').slideDown()
    $$('leave-msg-submit').click(submitMessage)
    playerProfileOkay(profile)
}


//
// the auth profile was loaded succesfully, so we continue to load the
// player profile if the user isn't viewing their own page.
//
var authProfileOkay = function(profile) {
    var id64 = id64View()
    if (id64 != profile.id64 && id64 != profile.custom_name ) {
	// authorized user viewing another profile. load separately:
	setHeadings()
	new ProfileLoader({
	    suffix: id64,
	    success: otherProfileOkay,
	    error: playerProfileError
	})
    } else {
	// authorized user viewing their own profile:
	setHeadings('My')
	$$('is-you').text('This is you!').slideDown()
	$$('view-msg-title').text('My Messages')
	new MessagesLoader({
	    success: function(messages) {
		messagesReady(messages)
		$$('view-msg-pod').slideDown()
	    }
	})
	$$('settings-tab').fadeIn()
	if (profile.subscription && profile.subscription.status == 'Verified') {
	    var nlt = new NotifyListingTool()
	    var removeFromChooser = function(e) {
		$('img', this).fadeOut().remove()
		$(this).removeClass('selected selected-delete')
	    }

	    var copyToChooser = function(e) {
		var source = $(event.target)
		var target = $("#bp-chooser-notify-listing td div:empty").first()
		if (!target.length) { return }
		var clone = source.clone()
		clone.data('node', source.data('node'))
		target.prepend(clone)
	    }
	    var resetChooser = function() {
		$.each( $('#bp-chooser-notify-listing td'), function(idx, cell) {
		    $('img', cell).fadeOut().remove()
		    $(cell).removeClass('selected selected-delete')
		})
	    }
            if (profile.settings['notify-listing-defs']) {
		$.each(profile.settings['notify-listing-defs'], function(idx, defindex) {
		    var target = $("#bp-chooser-notify-listing td div:empty").first()
		    target.text( $.toJSON( {defindex:defindex}) ).addClass('defindex-lazy')
		})
		nlt.schemaTool.putImages(profile.settings)
	    }

	    $('#bp-nl td div img').live('dblclick', copyToChooser)
	    $('#bp-chooser-notify-listing td').live('dblclick', removeFromChooser)
	    $$('notify-listing-reset').click(resetChooser)

	    $$('premium-settings-pod').fadeIn()
	} else {
	    $$('premium-signup-pod').fadeIn()
	}
	playerProfileOkay(profile)
    }
}


var NotifyListingTool = function() {
    var self = this
    var schemaTool = self.schemaTool = new SchemaTool(),
        items = schemaTool.tradableBackpack()
    var bpTool = new BackpackItemsTool({
	items: items,
	slug: 'nl',
	navigator: true,
	toolTips: true,
	select: true,
	outlineHover: true,
	filters: true,
	rowGroups: BackpackPages.slim(Math.round(items.length*0.01) / 0.01),
    })
    var chTool = this.chooser = new BackpackChooserTool({
	backpackSlug: 'nl',
	chooserSlug: 'notify-listing',
	selectDeleteHover: true,
	copy: true,
    })
    bpTool.init()
    chTool.init()
}


//
// when the auth profile loader failes, this continues to load the
// given player profile.
//
var authProfileError = function(request, status, error) {
    if (request.status == 401) {
	setHeadings()
	siteMessage('Loading profile...')
	// internal not set, fallback to path tail, works because
	// profile loader works:
	new ProfileLoader({
	    suffix: id64View(),
	    success: playerProfileOkay,
	    error: playerProfileError
	})
    }
}


//
// when the schema is loaded, try to load the auth profile and then
// initialize various tools for item display.
//
var schemaReady = function(schema) {
    new AuthProfileLoader({
	suffix: '?settings=1&complete=1',
	success: authProfileOkay,
	error: authProfileError
    })
}


// do nothing when the messages tab is shown
var messagesShow = function() {}

var validateNotifyBids = function() {
    if ( $('#profile-notify-bids').attr('checked') && !$('#profile-email').val().trim() ) {
	$('#profile-email-error').text("Error: we can't send you notifications without an email address.")
	    .parent().slideDown()
    } else {
	$('#profile-email-error').text('').parent().slideUp()
    }
}

//
// when the settings tab is shown, reconfigure that page with the
// current values for the auth profile.
//
var settingsShow = function() {
    var settingsReady = function(profile) {
	var settings = profile.settings
	$.each(keys(settings), function(index, key) {
	    var value = settings[key]
	    var pkey = 'profile-{0}'.fs(key)
	    if (typeof(value) == 'boolean') {
		$('#'+pkey).attr('checked', value)
	    }
	    if (typeof(value) == 'string') {
		$('#'+pkey).val(value)
	    }
	})
        $('#profile-notify-bids').click(validateNotifyBids)
	$('#profile-email').keyup(validateNotifyBids)
        validateNotifyBids()
    }
    new AuthProfileLoader({
	success: settingsReady,
	suffix: '?settings=1&complete=1'
    })

    $$('settings-save').click(function() {
	var output = {}, trim = function(i) { return i.replace('profile-', '') }
	$.each($('div.field input[type="checkbox"]'), function(index, checkbox) {
	    output[trim(checkbox.id)] = $(checkbox).attr('checked')
	})
        $.each($('div.field input[type="text"]'), function(index, input) {
	    output[trim(input.id)] = $(input).val()
	})
        try {
            output['notify-listing-defs'] = $.map(
		$('#bp-chooser-notify-listing td img'),
		function(image) { return $(image).data('node').defindex }
	    )
	} catch (e) {
	    output['notify-listing-defs'] = []
	}
	var settingsSaveOkay = function(results) {
	    // todo:  re-init profile somehow
	    $$('settings-save-message div.information')
		.text('Saved!').fadeIn().delay(3000).fadeOut()
	}
	var settingsSaveError = function(request, error, status) {
	    try {
		var msg = $.parseJSON(request.responseText).description
	    } catch (e) {
		var msg = 'unknown error.  this is bad.'
	    }
	    $$('settings-save-message div.error')
	        .text('Error: {0}'.fs(msg)).fadeIn().delay(5000).fadeOut()
	}
	$$('settings-save-message div.error').fadeOut()
	$$('settings-save-message div.information').fadeOut()
	$.ajax({
	    url: '/api/v1/auth/save-settings',
	    type: 'POST',
	    dataType: 'json',
	    data: $.toJSON(output),
	    success: settingsSaveOkay,
	    error: settingsSaveError
	})
    })
}


//
// when the document is loaded, setup the tabs and load the item
// schema.
//
$(document).ready(function() {
    var initHash = window.location.hash

    var tabCallbacks = {
	0: messagesShow,
	1: listingsShow,
	2: bidsShow,
	3: backpackShow,
	4: settingsShow
    }

    $('#tabs').tabs({
	fx: {height: 'toggle', opacity: 'toggle', duration: 'slow'},
	show: function(event, ui) {
	    if (ui.index in tabCallbacks) {
		// munge the hash (to prevent the browser from jumping
		// to the div automatically) and then set it:
		window.location.hash = ui.tab.hash.replace('tabs-', '')
		tabCallbacks[ui.index]()
	    }
	}
    })

    $$('settings-tab').hide()
    siteMessage('Loading...')
    new SchemaLoader({success: schemaReady})

    if (initHash) {
	initHash = parseInt(initHash.replace('#', ''))
	if (initHash in tabCallbacks) {
	    $('#tabs').tabs('select', initHash)
	}

    }

})
