// slug '#listing-detail-' defined in browse.pt
var $$ = function(suffix, next) { return $('#listing-detail-{0}'.fs(suffix), next) }
var listingId = function() { return window.location.pathname.split('/').pop() }
var timeLeftId = null

function updateTimeLeft(expires, selector) {
    expires = new Date(expires)
    return function() {
	var now = new Date(), delta = expires.getTime() - now.getTime()
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


var sendListingCancel = function() {
    var cancelOkay = function(results) {
	window.clearTimer(timeLeftId)
	$$('status').text('Cancelled')
	$$('timeleft').text('Cancelled')
	$$('owner-controls').slideUp()

    }
    var cancelError = function(request, status, error) {
	console.error('cancel failed', request, status, error)
    }
    $$('cancel-confirm').fadeOut()
    $.ajax({
	url: '/api/v1/auth/cancel-listing',
	type: 'POST',
	data: $.toJSON({id: listingId()}),
	dataType: 'json',
	success: cancelOkay,
	error: cancelError
    })
}

var rescindListingCancel = function() {
    $$('cancel-prompt').fadeIn()
    $$('cancel-confirm').fadeOut()
}

var showCancelConfirm = function(e) {
    $$('cancel-prompt').fadeOut()
    $$('cancel-confirm').fadeIn()
    $$('cancel-submit').click(sendListingCancel)
    $$('cancel-cancel').click(rescindListingCancel)
    return false
}

var moveToChooser = function(e) {
    var source = $(event.target)
    var target = $("#chooser-add-bid-item td div:empty").first()
    var cell = source.parent().parent()
    if ((cell.hasClass('cannot-trade')) || (!target.length)) { return }
    source.data('original-cell', cell)
    target.prepend(source)
    // update counts
}

var moveToBackpack = function(e) {
    var source = $(event.target)
    var target = source.data('original-cell')
    if (target) {
	$('div', target).prepend(source)
	// update counts
    }
}


var backpackReady = function(backpack, listings, bids, profile) {
    $$('msg-backpack').fadeOut()
    $$('own-backpack').fadeIn()
    $$('place-start').fadeOut()
    smallMsg('').fadeOut()

    var itemMoved = function(item) {
	GITEM = item
	console.log('item copied:', item)
    }

    var bc = new BackpackChooser(
	{backpack: backpack,
	 listingUids: listingItemsUids(listings),
	 bidUids: bidItemsUids(bids),
	 backpackSlug: 'bid',
	 chooserSlug: 'add-bid-item',
	 afterDropMove: itemMoved,
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

    var cancelNewBid = function(event) {
	$$('place-bid-wrapper').slideUp('slow')
	$('body').scrollTopAni()
	$$('place-start').fadeIn().unbind().click(function() {
	    $$('place-bid-wrapper').fadeIn()
	    $$('msg-backpack').fadeOut()
	    $$('own-backpack').fadeIn()
	    $$('place-start').fadeOut()
	    smallMsg('').fadeOut()
	    setTimeout(function() { $$('place-bid-wrapper h1').scrollTopAni() }, 500)
	})
	return false
    }

    var postOkay = function(data, status, req) {
	console.log('post okay:', data, status, req)
	$('#add-bid-working').text('Complete.  Click the link to view your bid.')
	//$('#add-bid-success a').attr('href', '/listing/'+data.key)
	$('#add-bid-success').fadeIn()
    }

    var postError = function(req, status, err) {
	console.error('post error:', req, status, err)
	$('#add-bid-working').text('Something went wrong.  Check the error below.').fadeIn()
	$('#add-bid-error').text(req.statusText).fadeIn()
    }

    var showErrors = function(errors) {
	console.error('validation errors:', errors)
	$.each(errors, function(index, error) {
	    var ele = $('{0}-error'.fs(error.id))
	    ele.text('Error: {0}'.fs(error.msg)).parent().fadeIn()
	    if (index==0) { ele.parent().scrollTopAni() }
	})
    }

    var addBid = function(input) {
	var output = {id: listingId(), private_msg: input.private_msg, public_msg: input.public_msg}
	var items = output.items = []
	$.each(input.items, function(idx, img) { items.push( $(img).data('node')) })
        console.log(input, output)
	$.ajax({
	    url: '/api/v1/auth/add-bid',
	    type: 'POST',
	    dataType:'json',
	    data: $.toJSON(output),
	    success: postOkay,
	    error: postError
	})
    }

    var submitNewBid = function(event) {
	var errs = []
	// 1.  bid items
	var items = $('#chooser-add-bid-item img')
	if (items.length < 1 || items.length > 10) {
	    errs.push({id:'#chooser-add-bid-item',
		       msg:'Select 1-10 items from your backpack.'})
	}
	// 2. private msg
	var private_msg = $('#bid-private-msg').val()
	private_msg = (private_msg ==  $('#bid-private-msg-default').text() ? '' : private_msg)
	if (private_msg.length > 400) {
	    errs.push({id:'#bid-private-msg',
		       msg:'Too much text.  Make your message shorter.'})
	}
	// 3. private msg
	var public_msg = $('#bid-public-msg').val()
	public_msg = (public_msg ==  $('#bid-public-msg-default').text() ? '' : public_msg)
	if (public_msg.length > 400) {
	    errs.push({id:'#bid-public-msg',
		       msg:'Too much text.  Make your message shorter.'})
	}
	// 5. agree w/ site terms
	if (! $('#add-bid-terms').attr('checked')) {
	    errs.push({id: '#add-bid-terms',
		       msg:'You must read and agree with site rules, terms, and conditions.'})
	}
	if (errs.length) {
	    showErrors(errs)
	} else {
	    $$('bid-buttons').slideUp('slow')
	    $('#add-bid-working').removeClass('null').text('Working...').fadeIn('fast')
	    addBid({items: items, public_msg: public_msg, private_msg: private_msg})
	}
	return false
    }

    var width = $('#chooser-add-bid-item tbody').width()
    $('#add-bid-fields').width(width)
    $('#add-bid-fields textarea').width(width).height(width/4).text()
    $('#add-bid-terms-desc').parent().width(width)
    $.each(['bid-private-msg', 'bid-public-msg'], function(idx, value) {
	$('#{0}'.fs(value)).text( $('#{0}-default'.fs(value)).text() )
	$('#{0}'.fs(value)).focusin(function() {
	    var area = $(this)
	    if (area.text() == $('#{0}-default'.fs(area.context.id)).text()) { area.text('') }
	})
    })
    $$('bid-cancel').click(cancelNewBid)
    $$('bid-submit').click(submitNewBid)
    $('div.organizer-view td').hover(hoverItem, unhoverItem)
    setTimeout(function() { $$('place-bid-wrapper h1').scrollTopAni() }, 500)
}


var backpackError = function(request, status, error) {
    console.error('backpack fetch failure', request, status, error)
}


var listingsReady = function(listings, bids, profile) {
    smallMsg('Loading your backpack...')
    new BackpackLoader({
	success: function (backpack) { backpackReady(backpack, listings, bids, profile) },
	error: backpackError,
	suffix: profile.id64
    })
}


var listingsError = function(request, status, error)  {
    console.error('listings fetch failure', request, status, error)
}


var profileReady = function(profile, listing) {
    defaultUserAuthOkay(profile)
    var ownerid = listing.owner.steamid
    $$('add-owner-friend').attr('href', 'steam://friends/add/{0}'.fs(ownerid))
    $$('chat-owner').attr('href', 'steam://friends/message/{0}'.fs(ownerid))
    if (profile.steamid == ownerid) {
	$$('owner-links').slideUp()
	if (listing.status == 'active') {
            $$('owner-controls').slideDown()
	    $$('cancel-show-confirm').click(showCancelConfirm)
	}
    } else {
	if (listing.status == 'active') {
            $$('auth-bid-wrapper').fadeIn()
	    if ($.inArray(profile.steamid, $(listing.bids).map(function(i, x) { return x.owner })) > -1)  {
		$$('place-start').text('Place Another Bid')
	    }
	    $$('place-start').click(function() {
		$$('place-bid-wrapper').fadeIn()
		smallMsg('Loading your backpack...').fadeIn()
		var bidsError = function(request, status, error) {
		    console.log('bid load error:', request, status, error)
		}
		var listingsOk = function(listings) {
		    new BidsLoader({
			success: function(bids) { listingsReady(listings, bids, profile) },
			error: bidsError,
			suffix: profile.id64
		    })
		}
		new ListingsLoader({
		    success: listingsOk,
		    error: listingsError,
		    suffix: profile.id64
		})
		return false
	    })
	}
    }
}


var profileError = function(request, status, error) {
    defaultUserAuthError(request, status, error)
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
    var st = new SchemaTool()
    var tt = new TooltipView(st)

    $$('owner-link').text(listing.owner.personaname)
    $$('owner-avatar')
	.attr('src', listing.owner.avatarmedium)

    $$('owner-profile-link')
	.attr('href', '/profile/' + listing.owner.id64)
        .attr('title', 'Profile for ' + listing.owner.personaname)

    $$('owner-listings').attr('href', '/profile/' + listing.owner.id64 + '?show=listings')

    $$('content').fadeIn('slow')
    $$('existing-bids-wrapper').fadeIn('slow')
    $.each(['description', 'status'], function(idx, name) {
	listing[name] ? $$(name).text(listing[name]) : $$(name).parent().parent().slideUp() })
    $.each(['created', 'expires'], function(idx, name) {
	var d = new Date(listing[name] + ' GMT')
	$$(name).text(''+d)
    })
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
    $.each(listing.bids, function(idx, bid) {
	var clone = $$('bids .prototype').clone()
	clone.removeClass('null prototype')
	$$('bids').prepend(clone)
	$.each(bid.items, function(i, item) {
	    $('td.item-display:nth-child({0}) div'.fs(i+1), clone).text( $.toJSON(item) )
	    $('td.item-display:nth-child({0}) div'.fs(i+1), clone).data('node', item)
	})
    })
    st.setImages()
    $$('items td').mouseenter(tt.show).mouseleave(tt.hide)
    $$('min-bid td').mouseenter(tt.show).mouseleave(tt.hide)
    $$('bids td').mouseenter(tt.show).mouseleave(tt.hide)
    $$('title').html('Listing ' + id)
    $$('bidcount').text(listing.bid_count ? ('Bids (' + listing.bid_count + ')') : 'No Bids')
    $$('title-wrapper').fadeIn()
    smallMsg('').fadeOut()
    if (listing.status == 'active') {
	timeLeftId = setInterval(updateTimeLeft(listing.expires, $$('timeleft')), 1000)
    } else {
	$$('place-start').fadeOut()
	$$('timeleft').text(listing.status)
    }
}


var listingError = function(request, status, error) {
    console.error('listing fetch failure', request, status, error)
}


var schemaReady = function(schema) {
    var id = listingId()
    document.title += ' ' + id
    new ListingLoader({
	success: function(ls) { listingReady(id, ls) },
	error: listingError,
	suffix:id
    })
}


var schemaError = function(request, status, error) {
    console.error('schema fetch failure', request, status, error)
}


$(document).ready(function() {
    $('#backpack-bid td div img').live('dblclick', moveToChooser)
    $('#unplaced-backpack-bid td div img').live('dblclick', moveToChooser)
    $('#chooser-add-bid-item td div img').live('dblclick', moveToBackpack)
    $('#add-bid-show-terms').click(showTermsDialog)
    $('#add-bid-success-view').click(function(){ window.location.reload() })
    smallMsg('Loading...')
    new SchemaLoader({success: schemaReady, error: schemaError})
})


