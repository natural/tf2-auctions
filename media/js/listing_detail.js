// slug '#listing-detail-' defined in browse.pt
var $$ = function(suffix, next) { return $('#{0}-{1}'.format(idSlug, suffix), next) }


function updateTimeLeft(expires, selector) {
    expires = new Date(expires)
    return function() {
	var now = new Date()
	var delta = expires.getTime() - now.getTime()
	if (delta < 0) {
	    selector.text('Expired')
	} else {
	    var days=0, hours=0, mins=0, secs=0, out=''
	    delta = Math.floor(delta/1000)
	    days = Math.floor(delta/86400)
	    delta = delta % 86400
	    hours = Math.floor(delta/3600)
	    delta = delta % 3600
	    mins = Math.floor(delta/60)
	    delta = delta % 60
	    secs = Math.floor(delta)
	    if(days != 0) { out += days +'d ' }
	    if(days != 0 || hours != 0) { out += hours + 'h '}
	    if(days != 0 || hours != 0 || mins != 0){out += mins +'m '}
	    out += secs +'s'
	    selector.text(out)
	}
    }
}

var backpackReady = function(backpack, listing, profile) {
    $$('msg-backpack').fadeAway()
    $$('own-backpack').fadeIn()
    $$('place-start').fadeOut()

    var uids = []
    var bc = new BackpackChooser({backpack:backpack, uids:uids,
				  backpackSlug:'bid',
				  chooserSlug:'add-bid-item',
				  help: 'Drag items from your backpack to the bid area below.'})
    bc.init()
    var st = new SchemaTool()
    var tt = new TooltipView(st)
    var hoverItem = function(e) {
        tt.show(e)
        try {
            var data = $('img', this).data('node')
        	if (!data.flag_cannot_trade) {
	            $(this).addClass('outline')
                }
        } catch (e) {}
    }
    var unhoverItem = function(e) {
        tt.hide(e)
        $(this).removeClass('outline')
    }
    $('div.organizer-view td').hover(hoverItem, unhoverItem)
    setTimeout(function() { $$('place-bid-wrapper').scrollTopAni() }, 500)
}

var submitCancel = function() {
    console.log('submit cancel')
    var listingId = window.location.pathname.split('/').pop()
    var cancelOkay = function(results) {
	console.log('cancel success', results)
	$$('status').text('Cancelled')
	$$('owner-controls').slideUp()
    }
    var cancelError = function(request, status, error) {
	console.error('cancel failed', request, status, error)
    }
    $$('cancel-confirm').fadeAway()
    $.ajax({
	url: '/api/v1/auth/cancel-listing',
	type: 'POST',
	data: $.toJSON({id:listingId}),
	dataType: 'json',
	success: cancelOkay,
	error: cancelError
    })
}

var cancelCancel = function() {
    $$('cancel-prompt').fadeBack()
    $$('cancel-confirm').fadeOut()
}

var showConfirmCancel = function(e) {
    $$('cancel-prompt').fadeAway()
    $$('cancel-confirm').fadeIn()
    $$('cancel-submit').click(submitCancel)
    $$('cancel-cancel').click(cancelCancel)
    return false
}

// steam://friends/message/76561197970837723
// steam://friends/add/76561198000876040

var profileReady = function(profile, listing) {
    var ownerid = listing.owner.steamid
    $$('add-owner-friend').attr('href', 'steam://friends/add/{0}'.format(ownerid))
    $$('chat-owner').attr('href', 'steam://friends/message/{0}'.format(ownerid))

    if (profile.steamid == ownerid) {
	$$('owner-links').slideUp()
	if (listing.status == 'active') {
            $$('owner-controls').slideDown()
	    $$('cancel-show-confirm').click(showConfirmCancel)
	}
    } else {
        $$('auth-bid-wrapper').fadeIn()
	$$('place-start').click(function() {
	    $$('place-bid-wrapper').fadeIn()
	    $$('msg-backpack').text('Loading your backpack...')
	    new BackpackLoader({success: function (backpack) {
		backpackReady(backpack, listing, profile)
            }, suffix: profile.id64})
	    return false
	})
    }
}


var profileError = function(request, status, error) {
    if (request.status==401) {
	// normal and expected if the user isn't currently logged in.
        $$('login-wrapper').fadeIn()
    }
}




var listingReady = function(id, listing) {
    var pl = new AuthProfileLoader({
         success: function (p) { profileReady(p, listing)},
         error: profileError })
    var cells = 0
    var timer = setInterval(updateTimeLeft(listing.expires, $$('timeleft')), 1000)
    var st = new SchemaTool()
    var tt = new TooltipView(st)

    $$('owner-link').text(listing.owner.personaname)
    $$('owner-avatar').attr('src', listing.owner.avatarmedium)
    $$('content').fadeIn('slow')
    $$('existing-bids-wrapper').fadeIn('slow')
    $.each(['description', 'status'], function(idx, name) {
	listing[name] ? $$(name).text(listing[name]) : $$(name).parent().parent().slideUp() })
    $.each(['created', 'expires'], function(idx, name) {
	$$(name).text('' + new Date(listing[name] + ' GMT')) })
    if (listing.min_bid.length) {
        $.each(listing.min_bid, function(idx, defindex) {
	    if (!(cells % 5)) {
		$$('min-bid table').append('<tr></tr>')
	    }
	    cells += 1
	    $$('min-bid table tr:last').append(makeCell($.toJSON({defindex:defindex, quality:6})))
        })
    } else {
        $$('min-bid').html('No minimum.')
    }
    cells = 0
    $.each(listing.items, function(idx, item) {
	if (!(cells % 5)) { $$('items table').append('<tr></tr>') }
        cells += 1
        $$('items table tr:last').append(makeCell($.toJSON(item)))
        $$('items table tr td:last div').data('node', item)
    })
    st.setImages()
    $$('items td').mouseenter(tt.show).mouseleave(tt.hide)
    $$('min-bid td').mouseenter(tt.show).mouseleave(tt.hide)
    $$('title').html('Listing ' + id)
    $$('bidcount').text(listing.bid_count ? ('Bids (' + listing.bid_count + ')') : 'No Bids')
    $$('title-wrapper').fadeIn()
    smallMsg('').fadeAway()
}


var schemaReady = function(schema) {
    var id = window.location.pathname.split('/').pop()
    document.title += ' ' + id
    new ListingLoader({success:function(ls) { listingReady(id, ls) }, suffix:id})
}


$(document).ready(function() {
    smallMsg('Loading...')
    new SchemaLoader({success: schemaReady})
})
