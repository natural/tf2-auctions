// DONE:  Owner controls.
// 
// DONE:  Add item bid.
// DONE:  Update item bid.
// DONE:  Cancel item bid.
// 
// DONE:  Add currency bid.
// DONE:  Update currency bid.
// DONE:  Cancel currency bid.
// 
// Add feedback.
//
// On add/update currency bid, make default bid equal to 0.01 +
// current max bid (aka min bid)
//
// On view w/ currency bids, sort + hilight max bid


//(function() {


oo.config({prefix: '#listing-detail-', auth: {settings: 1, complete: 0}})


var profileBid = function() {
    return ListingController.profileBid(ListingController.model.profile)
}


var pageListing = function() {
    return ListingController.model.listing
}


var makeBpTool = function(model) {
    return oo.backpack.itemTool({
	items: model.backpack.result.items.item,
	listingUids: oo.util.itemUids(model.listings),
	bidUids: oo.util.itemUids(model.bids),
	slug: 'listing-detail-bid',
	navigator: true,
	toolTips: true,
	select: true,
	outlineHover: true,
	cols: 5,
	title: 'Your Backpack',
	help: 'Drag items from your backpack to the bid area below.  You can also double click an item to move it.',
	rowGroups: oo.backpack.pageGroup.slim(model.backpack.result.num_backpack_slots)
    })
}


var makeChTool = function(afterDropMove) {
    return oo.backpack.chooserTool({
	backpackSlug: 'listing-detail-bid',
	chooserSlug: 'listing-detail-add-bid-item',
	afterDropMove: afterDropMove,
	counter: true,
	title: 'Your Bid',
	help: 'Remove items from your bid by dragging them back to your backpack.  Double click removes, too.'
    })
}


var CurrencyBidModel = oo.model.status.extend({
    init: function(view) {
	var self = this, suffix = self.suffix
	return oo.model.status.init.apply(self, arguments)
	    .success(function(s) {
		oo.data.listing({suffix: oo.util.pathTail()})
		    .success(function(l) {
			self.listing = l
			view.join(self, true)
		    })
	    })
    }
})


var ItemBidModel = oo.model.status.extend({
    init: function(view) {
	var self = this, suffix = self.suffix
	return oo.model.status.init.apply(self, arguments)
	    .success(function(s) {
		oo.data.listing({suffix: oo.util.pathTail()})
		    .success(function(l) {
			var sub = oo.model.backpack.extend({suffix: suffix})
			sub.listing = l
			sub.init().done( function() { view.join(sub) })
		    })
	    })
    },

    submit: function(params) {
	var output = {
	    id: this.listing.id,
	    private_msg: params.private_msg,
	    public_msg: params.public_msg,
	    currency_val: params.currency_val,
	    update: params.update,
	    items: []
	}
	$.each(params.items, function(idx, img) {
	    if ( ! $(img).parents('td').hasClass('cannot-trade') ) {
		output.items.push( $(img).data('node') )
	    }
	})
	return $.ajax({
	    url: '/api/v1/auth/add-bid',
	    type: 'POST',
	    dataType:'json',
	    data: $.toJSON(output),
	    success: params.success,
	    error: params.error
	})
    }
})


var BidView = oo.view.extend({
    join: function(model, curr) {
	var self = this
	self.model = model
	self.putDefaults(curr ? self.putCurrencyForm : self.putBackpack)
	self.show(curr)
    },

    isUpdate: function(v) {
	return oo('place-start').data('update', v)
    },

    hide: function (after) {
	oo('place-bid-pod').slideUp('slow', after)
    },

    show: function(curr) {
	var self = this,
	    next = function() { oo('place-bid-pod').fadeIn(oo('place-bid-pod').scrollTopAni) }
	self.message('').fadeOut()
	if (curr) {
	    oo('auth-bid-pod').slideUp(function() { self.putFields(next) })
	} else {
	    oo('auth-bid-pod').slideUp(function() { oo('own-backpack').slideDown(self.putFields(next)) })
	}
    },

    showErrors: function(errors) {
	$.each(errors, function(index, error) {
	    var ele = $('{0}-error'.fs(error.id))
	    ele.text('Error: {0}'.fs(error.msg)).parent().slideDown()
	    if (index==0) { ele.parent().scrollTopAni() }
	})
    },

    putCurrencyForm: function() {
	var self = this
	self.message('').fadeOut()
	oo('auth-bid-pod').slideUp(function() {
	    oo('bid-currency').slideDown(self.putFields)
	})
	oo('place-bid-pod').fadeIn(oo('existing-bids-pod').scrollTopAni)
    },

    putBackpack: function() {
	var self = this
	self.backpack = makeBpTool(self.model)
	self.chooser = makeChTool(function() { self.showMetMinBid.apply(self, [arguments]) })

	oo.model.auth.init().success(function(p) {
	    self.backpack.init(p.settings)
	    self.chooser.init(p.settings)
	})

	if (self.isUpdate()) {
	    try {
		var bids = self.model.bids,
		    current = $(bids).filter(function (idx, item) {
			return (item.listing.id == self.model.listing.id)
		    })[0],
		    currentIds = $(current.items).map(function (idx, item) {
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
			target.append($('span.equipped, span.quantity, span.jewel', existing))
		    }
		})
	    } catch (e) {
		oo.error(e)
	    }
	}
    },

    putDefaults: function(callback) {
	var self = this, update = self.isUpdate()
	$.each(['bid-private-msg', 'bid-public-msg'], function(idx, value) {
            if (!update) {
		$('#listing-detail-{0}'.fs(value)).text(
		    $('#listing-detail-{0}-default'.fs(value)).text()
		)
	    } else {
		    var current = $(self.model.listing.bids).filter(function (idx, bid) {
			return (bid.owner.id64 == self.model.profile.id64)
		    })[0],
		    name = 'message_' + value.replace('bid-', '').replace('-msg', '')
		$('#listing-detail-{0}'.fs(value)).text(current[name])
	    }
	})
	callback.apply(self)
    },

    putFields: function(cb) {
	var width = $('#bp-chooser-listing-detail-add-bid-item tbody').width() || 500
	oo('add-bid-fields, bid-currency').width(width)
	oo('add-bid-fields textarea').width(width).height(width/4).text()
	oo('add-bid-terms-desc').parent().width(width)
	oo('bid-bp-intro-pod').addClass('center').animate({width:width})
	oo('add-bid-item-ch-intro-pod').addClass('center').animate({width:width}, cb)
    },

    showMetMinBid: function(item) {
	var listing = this.model.listing,
	    items = $('#bp-chooser-listing-detail-add-bid-item img'),
	    metBid = true,
	    minItems = items.length >= listing.min_bid.length,
	    defItems = $.map(items, function(i, v) {
		var node = $(items[v]).data('node')
		return node && node.defindex
	    })
	$.each(listing.min_bid, function(i, v) {
	    if ($.inArray(v, defItems) == -1 ) { metBid = false }
	})
	if (minItems && metBid) {
	    $('#bp-chooser-listing-detail-add-bid-item-warn').parent().slideUp()
	} else {
	    $('#bp-chooser-listing-detail-add-bid-item-warn')
		.text('Warning: Minimum bid not met').parent().slideDown()
	}
	$('#bp-chooser-listing-detail-add-bid-item-error').parent().slideUp()
    },

    showBidSuccess: function() {
	oo('add-bid-working').text('Complete.  Click the link to view your bid.')
	oo('add-bid-success').fadeIn()
    },

    showBidError: function() {
	oo('add-bid-working').text('Something went wrong.  Check the error below.').fadeIn()
	oo('add-bid-error').text(req.statusText).parent().fadeIn()
    }
})


// extends model.schema only because we need a loader.
var BidderFeedbackModel = oo.model.schema.extend({
    saveFeedback: function(data, success, error) {
	$.ajax({
	    url: '/api/v1/auth/add-feedback',
	    type: 'POST',
	    data: $.toJSON(data),
	    dataType: 'json',
	    success: success,
	    error: error
	})
    }
})


var BidderFeedbackView = oo.view.extend({
    init: function(model) {
	oo.view.init.apply(this, arguments)
	this.slider = $('#bidder-feedback-rating-slider').slider({
		animate: true,
		max: 100,
		min:-100,
		value: 100,
		change: this.sliderChange,
		slide: this.sliderChange
	    })
	$('#bidder-feedback-rating-value').text('+100').addClass('rate-pos')
	oo('auth-bid-feedback-pod').show()
    },

    sliderChange: function(event, ui) {
	var v = ui.value, e = $('#bidder-feedback-rating-value')
	oo.view.setRating(e, v)
    },

    hideFeedback: function(feedback, prefix) {
	$(prefix+'-rating').text(this.formatRating(feedback.rating))
	//  '{0}{1}'.fs( feedback.rating > 0 ? '+' : '', feedback.rating))
	$(prefix+'-rating-text').text(feedback.text)
	//$(prefix+'-rating-label').text(title)
	$(prefix+'-feedback-controls').slideUp()
	$(prefix+'-feedback-rating-pod').slideDown()
    },

    cancelFeedback: function() {
    },

    saveSuccess: function() {
    },

    saveError: function() {
    }
})


var BidderFeedbackController = {
    view: BidderFeedbackView,
    model: BidderFeedbackModel,

    reinit: function() {
	oo.info('BidderFeedbackController.reinit()')
    },

    '#bidder-feedback-save click' : function(e) {
	var self = this
	    bid = profileBid(),
	    listing = pageListing(),
	    data = {
		bid: bid.key,
		listing: listing.key,
		rating: this.view.slider.slider('value'),
		source: 'bidder',
		text: $('#bidder-feedback-comment-text').val().slice(0, 400)
	    },
	    success = function () { self.view.saveSuccess.apply(self.view) },
	    error = function () { self.view.saveError.apply(self.view) }
	e.controller.model.saveFeedback(data, success, error)
	e.controller.view.hideFeedback(data, '#bidder')
    },

    '#bidder-feedback-cancel click' : function(e) {
	oo.info('clicked cancel')
	e.controller.view.cancelFeedback()
    }

}


var BidControllerDefn = {
    profile: null,

    cancelNewBid: function() {
	this.view.hide(function() {
	    $('body').scrollTopAni()
	    oo('auth-bid-pod').slideDown()
	})
    },

    reinit: function() {
	this.view.show.apply(this.view, [])
	oo.init('BidControllerDefn.reinit()')
    },

    removeDefaultText : function(target, defsel) {
	var area = $(target)
	if (area.text() == $(defsel).text()) { area.text('') }
    },

    submitBid: function() {
	var self = this,
	    errs = [],
	    items = $('#bp-chooser-listing-detail-add-bid-item img'),
	    currency_val = oo("currency-bid-amount").val(),
	    private_msg = oo('bid-private-msg').val(),
	    public_msg = oo('bid-public-msg').val(),
	    listing = self.model.listing

	// 1.  bid items or amount
	if (listing.min_bid_currency_use) {
	    var b = parseFloat(currency_val)
	    if (!b || b <=0 ) {
		errs.push({id:'#listing-detail-currency-bid-amount', msg:'Enter a bid value.'})
	    }
	} else {
	    if (items.length < 1 || items.length > 10) {
		errs.push({id:'#bp-chooser-listing-detail-add-bid-item',
			   msg:'Select 1-10 items from your backpack.'})
	    }
	}

	// 2. private msg
	private_msg = (private_msg ==  oo('bid-private-msg-default').text() ? '' : private_msg)
	if (private_msg.length > 400) {
	    oo('bid-private-msg').keyup(function (a) {
		if ( $(this).val().length <= 400) {
		    oo('bid-private-msg-error:visible').slideUp()
		}
	    })
	    errs.push({id:'#listing-detail-bid-private-msg',
		       msg:'Too much text.  Make your message shorter.'})
	}
	// 3. private msg
	public_msg = (public_msg ==  oo('bid-public-msg-default').text() ? '' : public_msg)
	if (public_msg.length > 400) {
	    oo('bid-public-msg').keyup(function (a) {
		if ( $(this).val().length <= 400) {
		    oo('bid-public-msg-error:visible').slideUp()
		}
	    })
	    errs.push({id:'#listing-detail-bid-public-msg',
		       msg:'Too much text.  Make your message shorter.'})
	}
	// 5. agree w/ site terms
	if (! oo('add-bid-terms').attr('checked')) {
	    oo('add-bid-terms').click(function (e) {
		if (e.target.checked) {
		    oo('add-bid-terms-error').slideUp()
		} else {
		    oo('add-bid-terms-error').slideDown()
		}
	    })
	    errs.push({id: '#listing-detail-add-bid-terms',
		       msg:'You must read and agree with site rules, terms, and conditions.'})
	}
	if (errs.length) {
	    self.view.showErrors(errs)
	} else {
	    oo('bid-buttons').slideUp('slow')
	    oo('add-bid-working').removeClass('null').text('Working...').fadeIn('fast')
	    self.model.submit({
		items: items,
                currency_val: currency_val,
		public_msg: public_msg,
		private_msg: private_msg,
		update: self.view.isUpdate(),
		success: self.view.showBidSuccess,
		error: self.view.showBidError
	    })
	}
    },

    '#listing-detail-bid-private-msg focusin' : function(e) {
	e.controller.removeDefaultText(e.target, '#listing-detail-bid-private-msg-default')
    },

    '#listing-detail-bid-public-msg focusin' : function(e) {
	e.controller.removeDefaultText(e.target, '#listing-detail-bid-public-msg-default')
    },

    '#bp-listing-detail-bid td div img live:dblclick' : function(e) {
	e.controller.view.chooser.moveToChooser(e)
    },

    '#bp-chooser-listing-detail-add-bid-item td div img live:dblclick': function(e) {
	e.controller.view.chooser.moveToOriginal(e)
    },

    '#listing-detail-bid-submit click': function(e) {
	oo.info('submit click', e)
	e.controller.submitBid.apply(e.controller, [])
    },

    '#listing-detail-bid-cancel click': function(e) {
	e.controller.cancelNewBid.apply(e.controller, [])
    },

    '#listing-detail-add-bid-success-view click': function() {
	window.location.reload()
    }
}


var ListingView = oo.view.schema.extend({
    join: function(model) {
	var self = this,
	    listing = self.listing = model.listing,
	    profile = self.profile = model.profile
	self.putListing()
	self.putListingOwner()
	if (!profile) {
	    self.putAnonTools()
	}
	if (profile && (profile.id64 == listing.owner.id64)) {
	    self.putOwnerTools()
	}
	if (profile && (profile.id64 != listing.owner.id64)) {
	    self.putAuthTools()
	}
	model.tool.putImages(profile ? profile.settings : null)
	oo('content').fadeIn()
    },

    putListing: function() {
	var self = this, listing = self.listing
	oo('status').text(listing.status)
	oo('title').text('Listing {0}'.fs(listing.id)).parent().fadeIn()
	self.putItems(oo('items table').first(), listing.items, 5)
	if (listing.description) {
	    oo('description').text(listing.description).parent().removeClass('null')
	}
	if (listing.min_bid_currency_use) {
	    oo('min-bid-currency-use h1')
		.html('{1}{0}'.fs(
			  listing.min_bid_currency_amount.formatMoney(),
			  oo.util.listingCurrencySym(listing))
		     )
		.parent().parent().removeClass('null')
	    oo('currency-bid-currency-symbol').html( oo.util.listingCurrencySym(listing) )
	    oo('currency-bid-currency-name').html('({0})'.fs(listing.min_bid_currency_type[1]))
	} else if (listing.min_bid.length > 0) {
	    self.putItems(oo('min-bid table').first(), listing.min_bid, 5)
	} else {
	    oo('min-bid').empty().text('No Minimum').removeClass('null')
	}
	if (listing.status == 'active') {
	    self.timeLeftId = setInterval(
		self.updateTimeLeft(
		    listing.expires,
		    function (v) { oo('timeleft').text(v) },
		    function () {
			oo('timeleft').text('Expired')
			oo('status').text('Expired')
			oo('auth-bid-pod').slideUp()
		    }), 100)
	} else {
	    oo('timeleft').parent().hide()
	    $('label', oo('expires').parent()).text('Expired:')
	}
	$.each(['created', 'expires'], function(idx, name) {
	    oo(name).text(oo.util.dformat(listing[name]))
	})
	self.putListingBids()
	self.putListingFeedback()
    },

    putListingOwner: function() {
	oo.util.profile.putBadge(this.listing.owner).fadeIn(function() {
	    oo('owner-links').slideDown()
	})
    },

    putListingBids: function() {
	var self = this,
	    listing = self.listing,
	    bids = listing.bids
	self.putBidCount(bids.length)
	$.each(bids, function(idx, bid) {
	    var clone = oo('bids .prototype').clone().removeClass('null prototype')
            if (listing.min_bid_currency_use) {
		var v = '{1}{0}'.fs(bid.currency_val.formatMoney(), oo.util.listingCurrencySym(listing))
		$('.bid-currency-val-amount', clone).html(v)
		$('.bid-currency-seed', clone).removeClass('null')
	    } else {
		self.putItems( $('table.chooser', clone), bid.items)
	    }
	    $('.bid-status', clone).text(bid.status)
	    $('.bid-created', clone).text(oo.util.dformat(bid.created))
	    oo.data.profile({suffix: bid.owner.id64})
		.success(function(p) { oo.util.profile.putAvatar(p, $('.bid-owner-seed', clone)) })
	    if (bid.status == 'awarded') {
		$('.winner', clone).text('Winner!').parent().show()
		$('.bid-status', clone).text('Winner!')
		clone.addClass('winner')
	    }
	    clone.data('bid', bid)
	    if (bid.message_public) {
		$('.bid-message', clone).text(bid.message_public)
	    } else {
		$('.bid-message, .bid-message-label', clone).remove()
	    }
	    if (bid.message_private) {
		$('.bid-message-private', clone).text(bid.message_private)
	    } else {
		$('.bid-message-private', clone).parent().remove()
	    }
	    oo('bids').prepend(clone)
	})
	oo('existing-bid-pod').show()
    },

    putListingFeedback: function() {
	var self = this,
	    listing = self.listing,
	    feedback = listing.feedback
	if (feedback.length) {
	    oo.info('put feedback')
	    $.each(feedback, function(idx, fb) {
		BidderFeedbackView.hideFeedback({
		    bid: fb.bid,
		    listing: fb.listing,
		    rating: fb.rating,
		    text: fb.comment,
		    source:'bidder'
		}, '#bidder')
	    })
	} else {
	    oo.info('no feedback')
	}
    },

    putBidCount: function(count) {
	oo('bidcount').text(count ? ('Bids (' + count + ')') : 'No Bids')
    },

    putOwnerTools: function() {
	var status = this.listing.status
	oo('is-you').text('This is you!').slideDown()
	oo('owner-links').hide()
	if (status == 'active') {
	    oo('owner-controls').removeClass('null')
	}
	if (status == 'active' || status == 'ended') {
	    $('.select-winner-seed').show()
	}
	$('.bid-message-private').parent().show()
    },

    putAuthTools: function() {
	$('.bid-message-private').parent().show()
	if (this.listing.status == 'active') {
	    oo('auth-bid-pod').show()
	    // bleh
	    if ($.inArray(this.profile.steamid, $(this.listing.bids).map(function(i, x) { return x.owner.steamid })) > -1) {
		oo('place-start').text('Update It').data('update', true)
		oo('existing-bid-cancel').text('Cancel It').data('cancel', true).parent().show()

		if (!this.bidFeedbackController) {
		    var bfcondef = $.extend({}, BidderFeedbackController)
		    this.bidFeedbackController = oo.controller.extend(bfcondef)
		    this.bidFeedbackController.init()
		} else {
//		    this.bidFeedbackController.reinit()
		}


		// fetch feedback, if found, put it
		// otherwise show feedback form

	    }
	}
    },

    putAnonTools: function() {
	if (this.listing.status == 'active') {
	    oo('login-link').attr('href', oo.util.profile.loginUrl())
	    oo('login-pod').removeClass('null')
	}
    },

    hideCancelListing: function() {
	oo('cancel-confirm').fadeOut(function() {
	    oo('cancel-prompt').fadeIn()
	})
    },

    showCancelListing: function() {
	oo('cancel-prompt').fadeOut(function() {
	    oo('cancel-confirm').fadeIn()
	})
    },

    beforeListingCancel: function() {
	oo('cancel-confirm').fadeOut()
    },

    afterListingCancel: function() {
	window.clearTimeout(this.timeLeftId)
	oo('status').text('cancelled')
	oo('timeleft').text('cancelled')
	oo('owner-controls').slideUp()
    },

    showPlaceCurrencyBid: function(existing) {
	oo.info('showPlaceCurrencyBid', existing)
	var self = this
	if (!self.controller) {
	    self.message('Loading...')
	    var listing = self.listing, profile = self.profile
	    oo.model.auth.init()
		.success(function (p) {
		    var m = ItemBidModel.extend(CurrencyBidModel, {profile: p, suffix: p.id64, listing: listing})
		    var c = self.controller = $.extend(
			{model: m, view: BidView}, BidControllerDefn, oo.controller
		    )
		    c.init()
		})
	 } else {
	     self.controller.reinit()
	 }

    },

    afterCancelBid: function(bid) {
	oo('place-start').data('update', false).text('Refresh for New Bid').unbind().click(function() {
	    window.location.reload()
	})
	oo('auth-bid-pod').slideDown()
	oo('auth-bid-feedback-pod').slideUp()
	oo('auth-bid-cancelled').text('Your bid was cancelled.').fadeIn()
	this.putBidCount(this.listing.bid_count-1)
	$.each(oo('bids div.ov'), function(idx, ele) {
	    ele = $(ele)
	    if (ele.data('bid') && ele.data('bid').key == bid.key) {
		ele.slideUp()
	    }
	})
    },

    beforeCancelBid: function() {
	oo('existing-bid-confirm').fadeOut()
    },

    hideCancelBid: function() {
	oo('existing-bid-confirm').fadeOut(function() {
	    oo('existing-bid-cancel').fadeIn()
	})
    },

    showCancelBid: function() {
	oo('existing-bid-cancel').fadeOut(function() {
	    oo('existing-bid-confirm').fadeIn()
	})
    },

    showPlaceItemBid: function(existing) {
	var self = this
	if (!self.controller) {
	    self.message('Loading your backpack...')
	    var listing = self.listing, profile = self.profile
	    oo.model.auth.init()
		.success(function (p) {
                    var m = ItemBidModel.extend({profile: p, suffix:p.id64, listing:listing}),
			v = BidView.extend()
			c = oo.controller.extend({model:m, view:v}, BidControllerDefn)
		    self.controller = c
		    c.init()
		})
	 } else {
	     self.controller.reinit()
	 }
    },

    hideSelectWinner: function(context) {
	$('.select-winner-confirm', context).fadeOut(function() {
	    $('.select-winner-link', context).fadeIn()
	})
    },

    showSelectWinner: function(context) {
	$('.select-winner-link', context).fadeOut(function() {
	    $('.select-winner-confirm', context).fadeIn()
	})
    }

})


var ListingModel = oo.model.schema.extend({
    init: function(view) {
	var self = this
	return oo.model.schema.init(self, arguments)
	    .success(function(schema) {
		oo.model.auth.init()
		    .success(function(profile) {
			self.profile = profile
			oo.data.listing({suffix: oo.util.pathTail()})
			    .success(function(listing) {
				self.listing = listing
				view.join(self)
			    })
		    })
		    .error(function() {
			self.profile = null
			oo.data.listing({suffix: oo.util.pathTail()})
			    .success(function(listing) {
				self.listing = listing
				view.join(self)
			    })
		    })
	    })
    },

    cancelBid: function(bid, success, error) {
	$.ajax({
	    url: '/api/v1/auth/cancel-bid',
	    type: 'POST',
	    data: $.toJSON({key:bid.key}),
	    dataType: 'json',
	    success: success,
	    error: error
	})
    },

    cancelListing: function(success, error) {
	$.ajax({
	    url: '/api/v1/auth/cancel-listing',
	    type: 'POST',
	    data: $.toJSON({id: this.listing.id}),
	    dataType: 'json',
	    success: success,
	    error: error
	})
    },

    existingBid: function() {
	return null
    },

    selectWinner: function(bid, success, error) {
	$.ajax({
	    url: '/api/v1/auth/choose-winner',
	    type: 'POST',
	    data: $.toJSON({id: this.listing.id, bid: bid}),
	    dataType: 'json',
	    success: success,
	    error: error
	})
    }
})


var ListingController = oo.controller.extend({
    model: ListingModel,
    view: ListingView,

    profileBid: function(profile) {
	var bd = oo('bids div.ov').map(function(i, e) { return $(e).data('bid') }),
	    pd = $.grep(bd, function(b, i) { return (b.owner.steamid==profile.steamid) })
	return pd ? pd[0] : undefined
    },

    '#listing-detail-cancel-show-confirm click' : function(e) {
	e.controller.view.showCancelListing()
    },

    '#listing-detail-cancel-submit click': function(e) {
	var c = e.controller, v = c.view, m = c.model
	v.beforeListingCancel()
	m.cancelListing(function() { v.afterListingCancel.apply(v) })
    },

    '#listing-detail-cancel-cancel click': function(e) {
	e.controller.view.hideCancelListing()
    },

    '#listing-detail-place-start click' : function(e) {
	var c = e.controller, m = c.model, l = m.listing, v = c.view
	if (l.min_bid_currency_use) {
	    v.showPlaceCurrencyBid.apply(v, [m.existingBid()])
	} else {
	    v.showPlaceItemBid.apply(v, [m.existingBid()])
	}
    },

    '#listing-detail-existing-bid-cancel click': function(e) {
	e.controller.view.showCancelBid()
    },

    '#listing-detail-existing-bid-cancel-no click' : function(e) {
	return e.controller.view.hideCancelBid()
    },

    '#listing-detail-existing-bid-cancel-yes click' : function(e) {
	var c = e.controller, b = c.profileBid(c.model.profile)
	c.view.beforeCancelBid()
	c.model.cancelBid(b, function() { c.view.afterCancelBid(b) })
    },

    '.select-winner-link live:click' : function(e) {
	e.controller.view.showSelectWinner( $(e.target).parents('div.ov') )
    },

    '.select-winner-submit live:click' : function(e) {
	var bid = $(e.target).parents('div.ov').data('bid')
	e.controller.model.selectWinner(bid, function() { window.location.reload() })
    },

    '.select-winner-cancel live:click' : function(e) {
	e.controller.view.hideSelectWinner($(e.target).parents('div.ov'))
    },

    '#listing-detail-currency-bid-amount keyup' : function(e) {
	e.target.value = e.target.value.replace(/[^0-9\.\,]/g,'');	
    }

})


//})()
