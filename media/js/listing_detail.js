var $$ = function(suffix, next) { return $('#listing-detail-{0}'.fs(suffix), next) }


var bidData = function() {
    return $$('bids div.ov').map(function(idx, ele) { return $(ele).data('bid') })
}


var putFeedback = function(feedback, context, prefix, title) {
    $(prefix+'-feedback-seed', context).slideUp()
    $(prefix+'-rating', context).text('{0}{1}'.fs( feedback.rating > 0 ? '+' : '', feedback.rating))
    $(prefix+'-rating-text', context).text(feedback.comment)
    $(prefix+'-rating-label', context).text(title)
    $(prefix+'-rating-seed', context).slideDown()
}


var putFeedbackLister = function(feedback, context) {
    putFeedback(feedback, context, '.lister', 'Feedback from Listing Owner:')
}


var putFeedbackBidder = function(feedback, context) {
    putFeedback(feedback, context, '.bidder', 'Feedback from Winning Bidder:')
}


var sendListingWinner = function(bid, success) {
    $.ajax({
	url: '/api/v1/auth/choose-winner',
	type: 'POST',
	data: $.toJSON({id: pathTail(), bid: bid}),
	dataType: 'json',
	success: success
    })
}


var backpackReady = function(backpack, listing, listings, bids, profile, update) {
    $$('msg-backpack').fadeOut()
    $$('own-backpack').fadeIn()
    $$('place-start').fadeOut()
    $$('existing-bid-cancel').fadeOut()
    siteMessage('').fadeOut()

    var itemMoved = function(item) {
	var items = $('#bp-chooser-listing-detail-add-bid-item img')
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
	    $('#bp-chooser-listing-detail-add-bid-item-warn')
		.parent().slideUp()
	} else {
	    $('#bp-chooser-listing-detail-add-bid-item-warn')
		.text('Warning: Minimum bid not met')
		.parent().slideDown()
	}
	$('#bp-chooser-listing-detail-add-bid-item-error').parent().slideUp()
    }

    var bpTool = new BackpackItemsTool({
	items: backpack,
	listingUids: listingItemsUids(listings),
	bidUids: bidItemsUids(bids),
	slug: 'listing-detail-bid',
	navigator: true,
	toolTips: true,
	select: true,
	outlineHover: true,
	cols: 5,
	help: 'Drag items from your backpack to the bid area below.  You can also double click an item to move it.'
    })

    var chTool = new BackpackChooserTool({
	backpackSlug: 'listing-detail-bid',
	chooserSlug: 'listing-detail-add-bid-item',
	afterDropMove: itemMoved,
	help: 'Remove items from your bid by dragging them back to your backpack.  Double click removes, too.'
    })

    new AuthProfileLoader({
	suffix: '?settings=1',
	success: function(profile) {
	    bpTool.init(profile.settings)
	    chTool.init(profile.settings)
	}
    })

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
	var items = $('#bp-chooser-listing-detail-add-bid-item img')
	if (items.length < 1 || items.length > 10) {
	    errs.push({id:'#bp-chooser-listing-detail-add-bid-item',
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
		if (e.target.checked) {
		    $$('add-bid-terms-error').slideUp()
		} else {
		    $$('add-bid-terms-error').slideDown()
		}
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
	    	    var target = $('#bp-chooser-listing-detail-add-bid-item td div:empty').first()
		    target.prepend(img).parent().addClass('active-bid cannot-trade')
		}
	    })
	} catch (e) {
	    console.error(e)
	}
    }

    var width = $('#bp-chooser-listing-detail-add-bid-item tbody').width()
    $$('add-bid-fields').width(width)
    $$('add-bid-fields textarea').width(width).height(width/4).text()
    $$('add-bid-terms-desc').parent().width(width)
    $.each(['bid-private-msg', 'bid-public-msg'], function(idx, value) {
	$('#listing-detail-{0}'.fs(value)).text( $('#listing-detail-{0}-default'.fs(value)).text() )
	$('#listing-detail-{0}'.fs(value)).focusin(function() {
	    var area = $(this)
	    if (area.text() == $('#listing-detail-{0}-default'.fs(area.context.id)).text()) { area.text('') }
	})
    })
    $$('bid-cancel').click(cancelNewBid)
    $$('bid-submit').click(submitNewBid)
    // these next three need wrappers for itemMoved (or pass in itemMoved to the chooser?)
    $('#bp-listing-detail-bid td div img').live('dblclick',  chTool.moveToChooser)
    $('#bp-unplaced-listing-detail-bid td div img').live('dblclick', chTool.moveToChooser)
    $('#bp-chooser-listing-detail-add-bid-item td div img').live('dblclick', chTool.moveToOriginal)
}


var ListingDetailModel = Model.extend({
    loader: ListingLoader,
    loaderSuffix: pathTail(),

    init: function(view, config) {
	var self = this
	this.requests.push(function() {
            new SchemaLoader({
                success: function(s) { self.tool = new SchemaTool(s) }
            })
        })
	Model.init.apply(this, [view, config])
    },

    ready: function(listing) {
	this.listing = listing
	Model.ready.apply(this, [listing])
    }

})


var ListingDetailView = SchemaView.extend({
    profile: null,
    timeLeftId: null,

    authSuccess: function(profile) {
	this.profile = profile
    },

    join: function(listing) {
	this.listing = listing
	$$('title').html('Listing ' + pathTail())
	document.title += ' ' + pathTail()
	this.putListing(listing)
	this.putListingOwner(listing.owner)
	this.putListingBids(listing.bids)
	if (this.profile) {
	    this.putProfile(this.profile, listing)
	} else {
	    $$('login-pod').fadeIn()
	}
	this.putImages(this.profile)
	$$('title-pod').fadeIn()
	$$('content').fadeIn()
	$$('existing-bids-pod').fadeIn()
	this.message('').fadeOut()
    },

    isWinner: function(profile) {
        return $.grep(bidData(), function(bid, idx) {
	    return (bid.owner.steamid==profile.steamid) && (bid.status=='awarded') }
        )[0]
    },

    putBidCount: function(count) {
	$$('bidcount').text(count ? ('Bids (' + count + ')') : 'No Bids')
    },

    putProfile: function(profile, listing) {
	if (profile.steamid == listing.owner.steamid) {
	    this.putProfileOwner(profile, listing)
	} else if ( this.isWinner(profile) ) {
	    this.putProfileWinner(profile, listing)
	} else {
	    this.putProfileOther(profile, listing)
	}
    },

    putProfileOwner: function (profile, listing) {
	$$('owner-links').fadeOut()
	$$('owner-controls').slideDown()
	if (listing.status == 'active') {
	    $$('owner-controls-cancel').slideDown()
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
	        var bid = self.parents('div.ov').data('bid')
	        if (bid) {
		    var cb = function(response) {
		        $('.listing-detail-profile-bid-view-select-winner-link').fadeOut()
			$('div.winner', self.parents('div.ov')).fadeIn()
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
	    $.each($$('bids div.ov'), function(idx, element) {
	        element = $(element)
	        var bid = element.data('bid')
	        if (bid && bid.status == 'awarded' && bid.feedback) {
		    putFeedbackLister(bid.feedback, element)
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
			    success: function (r) {
			        putFeedbackLister(r, element)
			    }
		        })
		    })
		    $('a.cancel-button', element).click(function () {
		        $('.lister-feedback-seed').slideUp()
		    })
	        }
	    })
        }
    },

    putProfileOther: function(profile, listing) {
        if (listing.status == 'active') {
            $$('auth-bid-pod').fadeIn()
	    if ($.inArray(profile.steamid, $(listing.bids).map(function(i, x) { return x.owner.steamid })) > -1)  {
	        $$('place-start').text('Update Your Bid').data('update', true)
		$$('existing-bid-cancel')
		    .text('Cancel Your Bid')
		    .data('cancel', true)
		    .parent().fadeIn()
	    } else {
		$$('place-start').data('update', false)
	    }
        }
    },

    putProfileWinner: function(profile, listing) {
	$('.winner:contains("Winner!")').text('You Won!')
	var bid = this.isWinner(profile)
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
		    success: function (r) {
		        putFeedbackBidder(r, element)
		    }
	        })
	    })
	    $('a.cancel-button', element).click(function () {
	        $('.bidder-feedback-seed').slideUp()
	    })
        }
    },

    putListing: function(listing) {
	this.putBidCount(listing.bid_count)
	this.putItems($$('items table'), listing.items, 5)
        $.each(['description', 'status'], function(idx, name) {
	    if (listing[name]) {
                $$(name).text(listing[name])
	    } else {
		$$(name).parent().parent().remove()
	    }
        })
	$.each(['created', 'expires'], function(idx, name) {
	    $$(name).text(new Date(listing[name] + ' GMT').format())
        })
	if (listing.min_bid_dollar_use) {
	    $$('min-bid-dollar-use').show()
	    $$('min-bid-dollar-use .mono').text('${0}'.fs(listing.min_bid_dollar_amount))
	} else {
	    if (listing.min_bid.length) {
		this.putItems($$('min-bid table'),
			      $.map(listing.min_bid, function(e) { return {defindex:e} }), 5)
	    } else {
	        $$('min-bid').html('No minimum.')
	    }
        }
	if (listing.status == 'active') {
	    this.timeLeftId = setInterval(updateTimeLeft(listing.expires, $$('timeleft')), 1000)
	}
	if (listing.status != 'active') {
	    $$('place-start').fadeOut()
	    $$('timeleft').text(listing.status)
	    $$('login-pod').fadeOut()
	    $$('min-bid-pod').fadeOut()
	}
	if (listing.status == 'awarded' && listing.feedback) {
	    putFeedbackBidder(listing.feedback, $$('left'))
	}
    },

    putListingBids: function(bids) {
	var self = this
	$.each(bids, function(idx, bid) {
	    var clone = $$('bids .prototype').clone()
	    clone.removeClass('null prototype')
	    $$('bids').prepend(clone)
            self.putItems( $('table.chooser', clone), bid.items)
	    $('.bid-status', clone).text(bid.status)
	    $('.bid-created', clone).text('' + new Date(bid.created))
	    if (bid.owner && bid.owner.avatar) {
	        $('.bid-avatar', clone).attr('src', bid.owner.avatar)
	    }
            new StatusLoader({
	        suffix: bid.owner.id64,
                success: function(status) {
		    $('.bid-avatar', clone).addClass('profile-status ' + status.online_state)
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
	        $('.bid-message-private', clone)
		    .text(bid.message_private).parent().fadeIn()
	    } else {
		$('.bid-message-private', clone).parent().remove()
	    }
	})
    },

    putListingOwner: function(owner) {
	if (!(this.profile) || (owner.steamid != this.profile.steamid)) {
	    $$('add-owner-friend')
		.attr('href', 'steam://friends/add/{0}'.fs(owner.steamid))
	    $$('chat-owner')
		.attr('href', 'steam://friends/message/{0}'.fs(owner.steamid))
	    $$('owner-links').slideDown()
        }
	$$('owner-link').text(owner.personaname)
	if (owner.avatar) {
	    $$('owner-avatar').attr('src', owner.avatarmedium)
	}
	new StatusLoader({
	    suffix: owner.id64,
	    success: function(status) {
	        $$('owner-avatar').addClass('profile-status ' + status.online_state)
	        $$('owner-status').html(status.message_state).addClass(status.online_state)
	    }
        })
        $$('owner-listings').attr('href', '/profile/' + owner.id64 + '#tabs-1')
	$$('owner-profile-link')
            .attr('href', profileUtil.defaultUrl(owner))
            .attr('title', 'Profile for ' + owner.personaname)
        var possum = owner.rating[0],
            poscnt = owner.rating[1],
            negsum = owner.rating[2],
            negcnt = owner.rating[3],
            pos = Math.round(poscnt > 0 ? possum / poscnt : 0),
            neg = Math.round(negcnt > 0 ? negsum / negcnt : 0)
        $$('owner-pos-label').text('{0}% Positive'.fs( pos ))
        $$('owner-pos-bar').width('{0}%'.fs(pos ? pos : 1)).html('&nbsp;')
        $('div.padding', $$('owner-pos-bar').parent()).width('{0}%'.fs(100-pos) )
        $$('owner-neg-label').text('{0}% Negative'.fs( neg ))
        $$('owner-neg-bar').width('{0}%'.fs(neg ? neg : 1)).html('&nbsp;')
        $('div.padding', $$('owner-neg-bar').parent()).width('{0}%'.fs(100-neg) )
    },

    hideCancelBid: function() {
	$$('existing-bid-confirm').fadeOut(function() {
	    $$('existing-bid-cancel').fadeIn()
        })
    },

    showCancelBid: function() {
        $$('existing-bid-cancel').fadeOut(function() {
            $$('existing-bid-confirm').fadeIn()
        })
    },

    hideCancelListing: function() {
	$$('cancel-confirm').fadeOut(function() {
	    $$('cancel-prompt').fadeIn()
        })
    },

    showCancelListing: function() {
	$$('cancel-prompt').fadeOut(function() {
	    $$('cancel-confirm').fadeIn()
        })
    },

    showPlaceBid: function() {
	var listing = this.listing, profile = this.profile
        $$('place-bid-pod').fadeIn()
        if (listing.min_bid_dollar_use) {
	    $$('place-start').fadeOut()
	    $$('bid-dollar').slideDown()
	    $$('dollar-bid-submit').click(function() { return false } )
	    $$('dollar-bid-cancel').click(function() {
	        $$('place-bid-pod').fadeOut()
	        $$('place-start').fadeIn()
	        $('body').scrollTopAni()
	        return false
	    })
	    $$('dollar-bid-amount').keyup(function () {
	        this.value = this.value.replace(/[^0-9\.]/g,'')
	    })
	    this.scrollToBidPod()
        } else {
	    var self = this
	    this.message('Loading your backpack...').fadeIn()
            var listingsReady = function(listing, listings, bids, profile) {
		siteMessage('Loading your backpack...')
		new BackpackLoader({
                    suffix: profile.id64,
	            success: function (backpack) {
	                backpackReady(backpack, listing, listings, bids, profile, $$('place-start').data('update'))
			self.scrollToBidPod()
		    }
                })
            }
	    var listingsOk = function(listings) {
		new BidsLoader({
		    suffix: profile.id64,
		    success: function(bids) { listingsReady(listing, listings, bids, profile) }
	        })
	    }
	    new ListingsLoader({suffix: profile.id64, success: listingsOk})
	    return false
        }
    },

    scrollToBidPod: function() {
	setTimeout(function() { $$('place-bid-pod h1').scrollTopAni() }, 500)
    }
})


var ListingDetailController = Controller.extend({
    view: ListingDetailView,
    model: ListingDetailModel,
    config: {auth: {settings: true}},

    profileBid: function(profile) {
        return $.grep(bidData(), function(bid, idx) {
	    return (bid.owner.steamid==profile.steamid) }
        )[0]
    },

    'ready': function() {
	this.view.message('Loading...')
    },

    '#listing-detail-add-bid-show-terms click' : function(event) {
        event.controller.view.showTermsDialog()
    },

    '#listing-detail-add-bid-success-view click' : function() {
        window.location.reload()
    },

    '#listing-detail-place-start click' : function(event) {
	event.controller.view.showPlaceBid()
    },

    '#listing-detail-existing-bid-cancel click' : function(event) {
	event.controller.view.showCancelBid()
    },

    '#listing-detail-existing-bid-cancel-no click' : function(event) {
	event.controller.view.hideCancelBid()
    },

    '#listing-detail-existing-bid-cancel-yes click' : function(event) {
	// TODO:  move the ui bits to the view and (maybe) the ajax to the model
	var controller = event.controller,
	    profile = controller.model.profile,
	    listing = controller.model.listing,
	    bid = controller.profileBid(profile)
	$$('existing-bid-confirm').fadeOut()
	$.ajax({
            url: '/api/v1/auth/cancel-bid',
	    type: 'POST',
	    data: $.toJSON({key:bid.key}),
	    dataType: 'json',
	    success: function (results) {
	        $$('auth-bid-pod').fadeOut()
		$$('auth-bid-cancelled').text('Your bid was cancelled.').fadeIn()
		controller.view.putBidCount(listing.bid_count-1)
		$.each($$('bids div.ov'), function(idx, ele) {
		    ele = $(ele)
		    if (ele.data('bid') && ele.data('bid').key == bid.key) {
		        ele.slideUp()
		    }
		})
	    }
	})
    },


    '#listing-detail-cancel-show-confirm click' : function(event) {
	event.controller.view.showCancelListing()
    },

    '#listing-detail-cancel-submit click': function(event) {
	// TODO:  move the ui bits to the view and (maybe) the ajax to the model
	var cancelOkay = function(results) {
	    window.clearTimeout(event.controller.view.timeLeftId)
	    $$('status').text('cancelled')
	    $$('timeleft').text('cancelled')
	    $$('owner-controls').slideUp()
	}
	$$('cancel-confirm').fadeOut()
	$.ajax({
	    url: '/api/v1/auth/cancel-listing',
	    type: 'POST',
	    data: $.toJSON({id: pathTail()}),
	    dataType: 'json',
	    success: cancelOkay
        })
    },

    '#listing-detail-cancel-cancel click': function(event) {
	event.controller.view.hideCancelListing()
    }
})
