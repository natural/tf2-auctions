// slug '#listing-detail-' defined in listing_detail.pt
var $$ = function(suffix, next) { return $('#listing-detail-{0}'.fs(suffix), next) }
var timeLeftId = null


function updateTimeLeft(expires, selector) {
    expires = new Date(expires)
    return function() {
	var now = new Date(), delta = expires.getTime() - now.getTime()
	if (delta < 0) {
	    selector.text('Expired')
	} else {
	    var days=0, hours=0, mins=0, secs=0, text=''
	    delta = Math.floor(delta/1000)
	    days = Math.floor(delta/86400)
	    delta = delta % 86400
	    hours = Math.floor(delta/3600)
	    delta = delta % 3600
	    mins = Math.floor(delta/60)
	    delta = delta % 60
	    secs = Math.floor(delta)
	    if (days != 0) { text += days +'d ' }
	    if (days != 0 || hours != 0) { text += hours + 'h ' }
	    if (days != 0 || hours != 0 || mins != 0) { text += mins +'m ' }
	    text += secs +'s'
	    selector.text(text)
	}
    }
}


var putListerFeedback = function(feedback, context) {
    $('.lister-feedback-seed', context).slideUp()
    $('.lister-rating', context).text('{0}{1}'.fs( feedback.rating > 0 ? '+' : '', feedback.rating))
    $('.lister-rating-text', context).text(feedback.comment)
    $('.lister-rating-label', context).text('Feedback from Listing Owner:')
    $('.lister-rating-seed', context).slideDown()

}


var putBidderFeedback = function(feedback, context) {
    $('.bidder-feedback-seed', context).slideUp()
    $('.bidder-rating', context).text('{0}{1}'.fs( feedback.rating > 0 ? '+' : '', feedback.rating))
    $('.bidder-rating-text', context).text(feedback.comment)
    $('.bidder-rating-label', context).text('Feedback from Winning Bidder:')
    $('.bidder-rating-seed', context).slideDown()
}



var bidderFeedbackSuccess = function(results) {
    // swap text and hide
    putBidderFeedback(results, results.element)
    console.log(results)
}


var bidderFeedbackError = function(request, status, error) {
    console.error('feedback submit failed', request, status, error)
}

var listerFeedbackSuccess = function(results) {
    // swap text and hide
    putListerFeedback(results, results.element)
    console.log(results)
}


var listerFeedbackError = function(request, status, error) {
    console.error('feedback submit failed', request, status, error)
}


var sendListingWinner = function(bid, success) {
    var winnerError = function(request, status, error) {
	console.error('winner choose failed', request, status, error)
    }
    $.ajax({
	url: '/api/v1/auth/choose-winner',
	type: 'POST',
	data: $.toJSON({id: pathTail(), bid: bid}),
	dataType: 'json',
	success: success,
	error: winnerError
    })
}

var sendListingCancel = function() {
    var cancelOkay = function(results) {
	window.clearTimeout(timeLeftId)
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
	data: $.toJSON({id: pathTail()}),
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


var backpackReady = function(backpack, listing, listings, bids, profile, update) {
    $$('msg-backpack').fadeOut()
    $$('own-backpack').fadeIn()
    $$('place-start').fadeOut()
    $$('existing-bid-cancel').fadeOut()
    siteMessage('').fadeOut()

    var itemMoved = function(item) {
	var items = $('#listing-detail-add-bid-item-chooser img')
	var minItems = items.length >= listing.min_bid.length
	var defItems = $.map(items, function(i, v) {
	    var node = $(items[v]).data('node')
	    return node && node.defindex
	})
	var metBid = true
	$.each(listing.min_bid, function(i, v) {
	    if ($.inArray(v, defItems) == -1 ) { metBid = false }
	})
	if (minItems && metBid) {
	    $$('add-bid-min-bid-warn').slideUp()
	} else {
	    $$('add-bid-min-bid-warn').text('Warning: Minimum bid not met').slideDown()
	}
    }

    var bc = new BackpackChooser(
	{backpack: backpack,
	 listingUids: listingItemsUids(listings),
	 bidUids: bidItemsUids(bids),
	 backpackSlug: 'listing-detail-bid',
	 chooserSlug: 'listing-detail-add-bid-item',
	 afterDropMove: itemMoved,
	 help: 'Drag items from your backpack to the bid area below.'})

    new AuthProfileLoader({
	suffix: '?settings=1',
	success: function(profile) {
	    bc.init(profile.settings)
	},
	error: function(request, status, error) {
	    bc.init()
	}
    })

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

    var moveToChooser = function(event) {
	var source = $(event.target)
	var target = $("#listing-detail-add-bid-item-chooser td div:empty").first()
	var cell = source.parent().parent()
	if ((cell.hasClass('cannot-trade')) || (!target.length)) { return }
	source.data('original-cell', cell)
	target.prepend(source)
	target.append($('span.equipped, span.quantity, span.jewel', cell))
	itemMoved(source)
	bc.updateCount()
	$$('add-bid-item-chooser-error').parent().slideUp()
    }

    var moveToBackpack = function(event) {
	var source = $(event.target)
	var target = $('div', source.data('original-cell'))
	if (target.length==1) {
    	    var others = $('span.equipped, span.quantity, span.jewel', source.parent())
	    target.append(source)
	    target.append(others)
	    itemMoved(source)
	    bc.updateCount()
	}
    }

    var cancelNewBid = function(event) {
	$$('place-bid-pod').slideUp('slow')
	$('body').scrollTopAni()
	$$('place-start').fadeIn().unbind().click(function() {
	    $$('place-bid-pod').fadeIn()
	    $$('msg-backpack').fadeOut()
	    $$('own-backpack').fadeIn()
	    $$('place-start').fadeOut()
	    siteMessage('').fadeOut()
	    setTimeout(function() { $$('place-bid-pod h1').scrollTopAni() }, 500)
	})
	return false
    }

    var postOkay = function(data, status, req) {
	$$('add-bid-working').text('Complete.  Click the link to view your bid.')
	$$('add-bid-success').fadeIn()
    }

    var postError = function(req, status, err) {
	$$('add-bid-working').text('Something went wrong.  Check the error below.').fadeIn()
	$$('add-bid-error').text(req.statusText).parent().fadeIn()
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
	var output = {
	    id: pathTail(),
	    private_msg: input.private_msg,
	    public_msg: input.public_msg,
	    update:update
        }
	var items = output.items = []
	$.each(input.items, function(idx, img) {
	    if ( ! $(img).parents('td').hasClass('cannot-trade') ) {
		items.push( $(img).data('node') )
	    }
	})
        // TODO: check the length on the items array to make sure
        // we're posting at least 1 item or 1 new item.
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
	var items = $('#listing-detail-add-bid-item-chooser img')
	if (items.length < 1 || items.length > 10) {
	    errs.push({id:'#listing-detail-add-bid-item-chooser',
		       msg:'Select 1-10 items from your backpack.'})
	}
	// 2. private msg
	var private_msg = $$('bid-private-msg').val()
	private_msg = (private_msg ==  $$('bid-private-msg-default').text() ? '' : private_msg)
	if (private_msg.length > 400) {
	    $$("bid-private-msg").keyup(function (a) {
		if ( $(this).val().length <= 400) {
		    $$('bid-private-msg-error:visible').slideUp()
		}
	    })
	    errs.push({id:'#listing-detail-bid-private-msg',
		       msg:'Too much text.  Make your message shorter.'})
	}
	// 3. private msg
	var public_msg = $$('bid-public-msg').val()
	public_msg = (public_msg ==  $$('bid-public-msg-default').text() ? '' : public_msg)
	if (public_msg.length > 400) {
	    $$("bid-public-msg").keyup(function (a) {
		if ( $(this).val().length <= 400) {
		    $$('bid-public-msg-error:visible').slideUp()
		}
	    })
	    errs.push({id:'#listing-detail-bid-public-msg',
		       msg:'Too much text.  Make your message shorter.'})
	}
	// 5. agree w/ site terms
	if (! $$('add-bid-terms').attr('checked')) {
	    $$('add-bid-terms').click(function (e) {
		$$('add-bid-terms-error').slideToggle()
	    })
	    errs.push({id: '#listing-detail-add-bid-terms',
		       msg:'You must read and agree with site rules, terms, and conditions.'})
	}
	if (errs.length) {
	    showErrors(errs)
	} else {
	    $$('bid-buttons').slideUp('slow')
	    $$('add-bid-working').removeClass('null').text('Working...').fadeIn('fast')
	    addBid({items: items, public_msg: public_msg, private_msg: private_msg})
	}
	return false
    }

    if (update) {
	try {
	    var current = $(bids).filter(function (idx, item) {
		return item.listing.id == pathTail()
	    })[0]

	    var currentIds = $(current.items).map(function (idx, item) {
		return item.uniqueid
	    })

	    $.each($('td.active-bid'), function(idx, existing) {
		var data = $('img', existing).data('node')
		if ( $.inArray(''+data.id, currentIds) > -1 ) {
		    var img = $('img', existing)
		    img.detach()
		    $(existing).removeClass('active-bid cannot-trade')
	    	    var target = $('#listing-detail-add-bid-item-chooser td div:empty').first()
		    target.prepend(img).parent().addClass('active-bid cannot-trade')
		}
	    })
	} catch (e) {
	    console.error(e)
	}
    }

    var width = $('#listing-detail-add-bid-item-chooser tbody').width()
    $$('add-bid-fields').width(width)
    $$('add-bid-fields textarea').width(width).height(width/4).text()
    $$('add-bid-terms-desc').parent().width(width)
    $$('add-bid-min-bid-warn').parent().width(width)
    $.each(['bid-private-msg', 'bid-public-msg'], function(idx, value) {
	$('#listing-detail-{0}'.fs(value)).text( $('#listing-detail-{0}-default'.fs(value)).text() )
	$('#listing-detail-{0}'.fs(value)).focusin(function() {
	    var area = $(this)
	    if (area.text() == $('#listing-detail-{0}-default'.fs(area.context.id)).text()) { area.text('') }
	})
    })
    $$('bid-cancel').click(cancelNewBid)
    $$('bid-submit').click(submitNewBid)
    $('div.organizer-view td').hover(hoverItem, unhoverItem)
    $('#backpack-listing-detail-bid td div img').live('dblclick',  moveToChooser)
    $('#unplaced-backpack-listing-detail-bid td div img').live('dblclick', moveToChooser)
    $('#listing-detail-add-bid-item-chooser td div img').live('dblclick', moveToBackpack)
    setTimeout(function() { $$('place-bid-pod h1').scrollTopAni() }, 500)
}


var backpackError = function(request, status, error) {
    console.error('backpack fetch failure', request, status, error)
}


var listingsReady = function(listing, listings, bids, profile) {
    siteMessage('Loading your backpack...')
    new BackpackLoader({
	success: function (backpack) {
	    backpackReady(backpack, listing, listings, bids, profile, $$('place-start').data('update'))
	},
	error: backpackError,
	suffix: profile.id64
    })
}


var listingsError = function(request, status, error)  {
    console.error('listings fetch failure', request, status, error)
}

var bidData = function() {
    return $$('bids div.organizer-view').map(
	function(idx, ele) { return $(ele).data('bid') }
    )
}

var profileIsWinner = function(profile) {
    return $.grep(bidData(), function(bid, idx) {
	return (bid.owner.steamid==profile.steamid) && (bid.status=='awarded') }
    )[0]
}

var profileBid = function(profile) {
    return $.grep(bidData(), function(bid, idx) {
	return (bid.owner.steamid==profile.steamid) }
    )[0]
}


var profileReady = function(profile, listing) {
    new ProfileTool(profile).defaultUserAuthOkay(profile)
    var ownerid = listing.owner.steamid
    $$('add-owner-friend').attr('href', 'steam://friends/add/{0}'.fs(ownerid))
    $$('chat-owner').attr('href', 'steam://friends/message/{0}'.fs(ownerid))

    /* auth profile owner is also listing owner */
    if (profile.steamid == ownerid) {
	$$('owner-links').fadeAway()
        $$('owner-controls').slideDown()

	if (listing.status == 'active') {
	    $$('owner-controls-cancel').slideDown()
	    $$('cancel-show-confirm').click(showCancelConfirm)
	}
	if (listing.status == 'ended') {
	    $$('owner-controls-choose-winner').slideDown()
	    $('.listing-detail-profile-bid-view-select-winner-link').fadeIn()
	    $('.listing-detail-profile-bid-view-select-winner-link > a').click(function (e) {
		$('.listing-detail-profile-choose-confirm').fadeOut()
		$('span', $(this).parent()).fadeIn()
	    })
	    $('.listing-detail-profile-choose-winner-cancel').click(function (e) {
		$(this).parents('.listing-detail-profile-choose-confirm').fadeOut()
	    })

	    // WRONG: this (a) doesn't hide all of the other "Select
	    // Winner" divs and also shows "Leave Feedback" in too
	    // many places

	    $('.listing-detail-profile-choose-winner-submit').click(function (e) {
		var self = $(this)
		self.parents('.listing-detail-profile-choose-confirm').fadeOut()
		var bid = self.parents('div.organizer-view').data('bid')
		if (bid) {
		    var cb = function(response) {
			$('.listing-detail-profile-bid-view-select-winner-link').fadeOut()
			$('div.winner', self.parents('div.organizer-view')).fadeIn()
			var ele = self.parents('table')
			$('.bid-status', ele).text('')
			$('.winner', ele).text('Winner!').parent().show()
			$('.listing-detail-profile-bid-view-refresh', ele).fadeIn()
			$('.listing-detail-profile-bid-view-refresh a.leave-feedback', ele)
			    .click(function () { window.location.reload() })
		    }
		    sendListingWinner(bid, cb)
		}
	    })

	}
	if (listing.status == 'awarded') {
	    $.each($$('bids div.organizer-view'), function(idx, element) {
		element = $(element)
		var bid = element.data('bid')
		if (bid && bid.status == 'awarded' && bid.feedback) {
		    putListerFeedback(bid.feedback, element)
		} else if (bid && bid.status == 'awarded' && !bid.feedback) {
		    var sliderChange = function(event, ui) {
			var v = ui.value
			$(".lister-rating", element).text('Rating: ' + v)
		    }
		    var slider = $(".lister-rating-slider", element).slider({
			animate: true,
			max: 100,
			min:-100,
			value: 100,
			change: sliderChange,
			slide: sliderChange
		    })
		    $('.lister-rating').text('Rating: 100')
		    $('.lister-feedback-help').text('Enter your feedback for this bid and the player who posted it.')
		    $('.lister-feedback-seed', element).slideDown()
		    $('a.save-button', element).click(function () {
			var data = {
			    bid: bid.key,
			    listing: listing.key,
			    rating: slider.slider('value'),
			    source: 'lister',
			    text: $('.lister-feedback-text').val().slice(0,400)
			}
			$.ajax({
			    url: '/api/v1/auth/add-feedback',
			    type: 'POST',
			    data: $.toJSON(data),
			    dataType: 'json',
			    success: function (r) { r.element = element; listerFeedbackSuccess(r) },
			    error: listerFeedbackError
			})
		    })
		    $('a.cancel-button', element).click(function () {
			$('.lister-feedback-seed').slideUp()
		    })

		}
	    })
	}
    } else if ( profileIsWinner(profile) ) {
	$('.winner:contains("Winner!")').text('You Won!')
	var bid = profileIsWinner(profile)
	if (listing.status == 'awarded' && !listing.feedback) {
	    var element = $$('left')
	    $('.bidder-feedback-seed').slideDown()
	    var sliderChange = function(event, ui) {
		var v = ui.value
		$(".bidder-rating", element).text('Rating: ' + v)
	    }
	    var slider = $(".bidder-rating-slider", element).slider({
		animate: true,
		max: 100,
		min:-100,
		value: 100,
		change: sliderChange,
		slide: sliderChange
	    })
	    $('.bidder-rating').text('Rating: 100')
	    $('.bidder-feedback-help').text('Enter your feedback for this listing and the player who posted it.')
	    $('.bidder-feedback-seed', element).slideDown()
	    $('a.save-button', element).click(function () {
		var data = {
		    bid: bid.key,
		    listing: listing.key,
		    rating: slider.slider('value'),
		    source: 'bidder',
		    text: $('.bidder-feedback-text').val().slice(0,400)
		}
		$.ajax({
		    url: '/api/v1/auth/add-feedback',
		    type: 'POST',
		    data: $.toJSON(data),
		    dataType: 'json',
		    success: function (r) { r.element = element; bidderFeedbackSuccess(r) },
		    error: bidderFeedbackError
		})
	    })
	    $('a.cancel-button', element).click(function () {
		$('.bidder-feedback-seed').slideUp()
	    })
	}


    /* auth profile owner is not the listing owner or winning bid owner */
    } else {
	if (listing.status == 'active') {
            $$('auth-bid-pod').fadeIn()
	    if ($.inArray(profile.steamid, $(listing.bids).map(function(i, x) { return x.owner.steamid })) > -1)  {
		$$('place-start').text('Update Your Bid').data('update', true)
		$$('existing-bid-cancel').text('Cancel Your Bid').data('cancel', true).parent().fadeIn()
	    } else {
		$$('place-start').data('update', false)
	    }
	    $$('place-start').click(function() {
		$$('place-bid-pod').fadeIn()
		siteMessage('Loading your backpack...').fadeIn()
		var bidsError = function(request, status, error) {
		    console.log('bid load error:', request, status, error)
		}
		var listingsOk = function(listings) {
		    new BidsLoader({
			success: function(bids) { listingsReady(listing, listings, bids, profile) },
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
	    $$('existing-bid-cancel').click(function() {
		$$('existing-bid-cancel').fadeAway()
		$$('existing-bid-confirm').fadeIn()
		$$('existing-bid-cancel-yes').click(function() {
		    var bid = profileBid(profile)
		    $$('existing-bid-confirm').fadeOut()
		    $.ajax({
			url: '/api/v1/auth/cancel-bid',
			type: 'POST',
			data: $.toJSON({key:bid.key}),
			dataType: 'json',
			success: function (results) {
			    $$('auth-bid-pod').fadeOut()
			    $$('auth-bid-cancelled').text('Your bid was cancelled.').fadeIn()
			    $$('bidcount').text((listing.bid_count-1) ? ('Bids (' + (listing.bid_count-1) + ')') : 'No Bids')
			    $.each($$('bids div.organizer-view'), function(idx, ele) {
				ele = $(ele)
				if (ele.data('bid') && ele.data('bid').key == bid.key) {
				    ele.slideUp()
				}
			    })
			}
		    })
		})
		$$('existing-bid-cancel-no').click(function() {
		    $$('existing-bid-confirm').fadeOut()
		    $$('existing-bid-cancel').fadeBack()
		})
	    })
	}
    }
}


var profileError = function(request, status, error) {
    new ProfileTool().defaultUserAuthError(request, status, error)
    if (request.status==401) {
	// normal and expected if the user isn't currently logged in.
	// TODO:  this should wait for the listing...
        $$('login-pod').fadeIn()
    }
}


var listingReady = function(listing) {
    var st = new SchemaTool()
    var tt = new TooltipView(st)
    var owner = listing.owner

    $$('owner-link').text(owner.personaname)
    if (owner.avatar) {
	$$('owner-avatar')
	    .attr('src', owner.avatarmedium)
    }
    new StatusLoader({
	suffix: listing.owner.id64, success: function(status) {
	    $$('owner-avatar').addClass('profile-status ' + status.online_state)
	    $$('owner-status').html(status.message_state).addClass(status.online_state)
	}
    })
    $$('owner-listings')
	.attr('href', '/profile/' + owner.id64 + '#tabs-1')
    $$('owner-profile-link')
	.attr('href', new ProfileTool(owner).defaultUrl())
        .attr('title', 'Profile for ' + owner.personaname)

    var possum = listing.owner.rating[0]
    var poscnt = listing.owner.rating[1]
    var negsum = listing.owner.rating[2]
    var negcnt = listing.owner.rating[3]

    var pos = Math.round(poscnt > 0 ? possum / poscnt : 0)
    var neg = Math.round(negcnt > 0 ? negsum / negcnt : 0)

    $$('owner-pos-label').text('{0}% Positive'.fs( pos ))
    $$('owner-pos-bar').width('{0}%'.fs(pos ? pos : 1)).html('&nbsp;')
    $('div.padding', $$('owner-pos-bar').parent()).width('{0}%'.fs(100-pos) )

    $$('owner-neg-label').text('{0}% Negative'.fs( neg ))
    $$('owner-neg-bar').width('{0}%'.fs(neg ? neg : 1)).html('&nbsp;')
    $('div.padding', $$('owner-neg-bar').parent()).width('{0}%'.fs(100-neg) )

    $$('content').fadeIn()
    $$('existing-bids-pod').fadeIn()
    $.each(['description', 'status'], function(idx, name) {
	if (listing[name]) {
            $$(name).text(listing[name])
	} else {
	    $$(name).parent().parent().slideUp()
	}
    })
    $.each(['created', 'expires'], function(idx, name) {
	$$(name).text('' + new Date(listing[name] + ' GMT'))
    })
    var cells = 0
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
//	console.log(item, $.toJSON(item), $$('items table tr td:last div').data('node'))

    })
    $.each(listing.bids, function(idx, bid) {
	var clone = $$('bids .prototype').clone()
	clone.removeClass('null prototype')
	$$('bids').prepend(clone)
	$.each(bid.items, function(i, item) {
	    $('td.item-view:nth-child({0}) div'.fs(i+1), clone).text( $.toJSON(item) )
	    $('td.item-view:nth-child({0}) div'.fs(i+1), clone).data('node', item)
	})
	$('.bid-status', clone).text(bid.status)
	$('.bid-created', clone).text('' + new Date(bid.created))
	if (bid.owner && bid.owner.avatar) {
	    $('.bid-avatar', clone)
		.attr('src', bid.owner.avatar)
	}
	new StatusLoader({
	    suffix: bid.owner.id64, success: function(status) {
		$('.bid-avatar', clone)
		    .addClass('profile-status ' + status.online_state)
	    }
	})
	$('.bid-avatar', clone).parent().attr('href', '/profile/'+bid.owner.id64)
	$('.bid-owner', clone).text(bid.owner.personaname)
	$('.bid-owner', clone).parent().attr('href', '/profile/'+bid.owner.id64)

	if (bid.status == 'awarded') {
	    $('.winner', clone).text('Winner!').parent().show()
	    $('.bid-status', clone).text('')
	}
	clone.data('bid', bid)
	if (bid.message_public) {
	    $('.bid-message', clone).text(bid.message_public)
	} else {
	    $('.bid-message, .bid-message-label', clone).remove()
	}
	if (bid.message_private) {
	    $('.bid-message-private', clone).text(bid.message_private).parent().fadeIn()
	} else {
	    $('.bid-message-private', clone).parent().remove()
	}
    })

    new AuthProfileLoader({
	suffix: '?settings=1',
	success: function(profile) {
	    st.putImages(profile.settings)
	},
	error: function(request, status, error) {
	    st.putImages()
	}
    })

    $('td.item-view div:empty').parent().remove()

    var hover = makeHovers(tt)
    $$('items td').mouseenter(hover.enter).mouseleave(hover.leave)
    $$('min-bid td').mouseenter(hover.enter).mouseleave(hover.leave)
    $$('bids table.chooser td').mouseenter(hover.enter).mouseleave(hover.leave)

    $$('title').html('Listing ' + pathTail())
    $$('bidcount').text(listing.bid_count ? ('Bids (' + listing.bid_count + ')') : 'No Bids')
    $$('title-pod').fadeIn()
    siteMessage('').fadeOut()

    if (listing.status == 'active') {
	timeLeftId = setInterval(updateTimeLeft(listing.expires, $$('timeleft')), 1000)
    }
    if (listing.status != 'active') {
	$$('place-start').fadeOut()
	$$('timeleft').text(listing.status)
	$$('login-pod').fadeOut()
	$$('min-bid-pod').fadeOut()
    }
    if (listing.status == 'awarded' && listing.feedback) {
	putBidderFeedback(listing.feedback, $$('left'))
    }
}


var listingError = function(request, status, error) {
    console.error('listing fetch failure', request, status, error)
}


var orderedLoad = function(listing) {
    var pl = new AuthProfileLoader({
	suffix: '?settings=1',
        success: function (profile) {
	    listingReady(listing)
	    profileReady(profile, listing)
	},
        error: function (r, s, e) { profileError(r, s, e); listingReady(listing) }
    })
}


var schemaReady = function(schema) {
    var id = pathTail()
    document.title += ' ' + id
    new ListingLoader({
	success: orderedLoad,
	error: listingError,
	suffix:id
    })
}


var schemaError = function(request, status, error) {
    console.error('schema fetch failure', request, status, error)
}


$(document).ready(function() {
    $$('add-bid-show-terms').click(showTermsDialog)
    $$('add-bid-success-view').click(function(){ window.location.reload() })
    siteMessage('Loading...')
    new SchemaLoader({success: schemaReady, error: schemaError})
})
