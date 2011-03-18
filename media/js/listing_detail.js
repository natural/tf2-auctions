//
// SKIP:  Delete bidder feedback for lister.
// SKIP:  Delete lister feedback for bidders.
//
// SKIP:  Update bidder feedback for lister.
// SKIP:  Update lister feedback for bidders.
//
//

var init = function() {


oo.config({prefix: '#listing-detail-', auth: {settings: 1, complete: 0}})


var profileBid = function() {
    return ListingController.profileBid(ListingController.model.profile)
}


var profileFeedback = function() {
    return ListingController.profileFeedback(ListingController.model.profile)
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

    show: function(currency) {
	var self = this,
	    next = function() {
		oo('place-bid-pod div.ov').first().fadeIn(function() { oo('place-bid-pod').scrollTopAni() })
	    }
	self.message('').fadeOut()
	if (currency) {
	    oo('auth-bid-pod').slideUp(function() { oo('place-bid-pod').fadeIn(); self.putFields(next) })
	} else {
	    oo('auth-bid-pod').slideUp(function() { oo('place-bid-pod').fadeIn(); oo('own-backpack').slideDown(self.putFields(next)) })
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
	var self = this,
	    listing = self.model.listing,
	    cv = Math.max(listing.bid_currency_top, listing.bid_currency_start) + 1.0
	self.message('').fadeOut()
	oo('currency-bid-amount').val( Math.round(cv*100)/100)
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
		var current = $(self.model.listing.bids).filter(
		    function (idx, bid) { return (bid.owner.id64 == self.model.suffix) })[0],
		    name = 'message_' + value.replace('bid-', '').replace('-msg', '')
		$('#listing-detail-{0}'.fs(value)).text(current[name])
	    }
	})
	callback.apply(self)
    },

    putFields: function(callback) {
	// this sucks; again, a problem with calculating the width
	// before the element is shown.  and again, we just add a slight
	// delay before doing it.

	    var width = $('#bp-chooser-listing-detail-add-bid-item tbody').width() || 500
	    oo('add-bid-fields, bid-currency').width(width)
	    oo('add-bid-fields textarea').width(width).height(width/4).text()
	    oo('add-bid-terms-desc').parent().width(width)
	    oo('bid-bp-intro-pod').addClass('center').animate({width:width})
	    oo('add-bid-item-ch-intro-pod').addClass('center').animate({width:width})
	if (callback) {
	    callback()
	}

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
var FeedbackModel = oo.model.status.extend({
    init: function(view) {
	var self = this
	self.suffix = ListingController.model.profile.id64
	try {
	    self.feedback = $.grep(pageListing().feedback, function(x) {
		return x.source == 'BUG' }
	    )[0]
	} catch (x) {
	    self.feedback = null
	}
	return oo.model.status.init.apply(self, [view])
	    .success(function(d) {
		view.init(self)
	    })
    },

    saveFeedback: function(data, success, error) {
	$.ajax({
	    url: '/api/v1/auth/save-feedback',
	    type: 'POST',
	    data: $.toJSON(data),
	    dataType: 'json',
	    success: success,
	    error: error
	})
    }
})


var FeedbackView = oo.view.extend({
    init: function(model) {
	oo.view.init.apply(this, arguments)
	this.model = model
	var context = this.context
	this.slider = $('.rating-slider', context).slider({
		animate: true,
		max: 100,
		min:-100,
		value: 100,
		change: this.sliderChange,
		slide: this.sliderChange
	    })
	$('.rating-value', context).text('+100').addClass('rate-pos')
	if (this.feedback) {
	    this.putFeedback(this.feedback)
	} else {
	    $('.feedback-comment-seed', context).show()
	}
    },

    sliderChange: function(event, ui) {
	var v = ui.value, e = $('.rating-value', this.context)
	oo.view.setRating(e, v)
    },

    text: function(v) {
	return $('.comment-text', this.context).val()
    },

    rating: function(v) {
	return this.slider.slider('value')
    },

    putFeedback: function(feedback) {
	var $$ = oo.context$(this.context)
	$$('.feedback-comment-seed').slideUp()
	if (feedback) {
	    oo.view.setRating($$('.rating-badge'), feedback.rating)
	    $$('.rating-text').text(feedback.text || feedback.comment)
	}
	$$('.feedback-view-seed').slideDown()
    },

    cancelFeedback: function() {
	this.context.slideUp()
    }
})


var FeedbackController = {
    save: function(e) {
	var bid = this.model.bid,
	    listing = this.model.listing,
	    data = {
		bid: bid.key,
		listing: listing.key,
		rating: this.view.rating(),
		source: this.source,
		text: this.view.text().slice(0, 400)
	    }
	oo.error(data, e.controller)
	e.controller.model.saveFeedback(data)
	e.controller.view.putFeedback(data)
    },

    cancel : function(e) {
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
	if (listing.bid_currency_use) {
	    var b = parseFloat(currency_val)
	    if (!b || b <=0 ) {
		errs.push({id:'#listing-detail-currency-bid-amount', msg:'Enter a bid value.'})
	    }
	    if (b <= Math.max(Math.max(listing.bid_currency_top, listing.bid_currency_start))) {
		errs.push({id:'#listing-detail-currency-bid-amount',
			   msg:'Your bid must be higher than current highest bid.'})
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
	if (listing.bid_currency_use) {
	    oo('min-bid-currency-use h1')
		.html('{1}{0}'.fs(
			  listing.bid_currency_start.formatMoney(),
			  oo.util.listingCurrencySym(listing))
		     )
	    oo('min-bid-currency-top h1')
		.html('{1}{0}'.fs(
			  listing.bid_currency_top.formatMoney(),
			  oo.util.listingCurrencySym(listing))
		     )
	    oo('min-bid-currency-{0} h1'.fs(
		   listing.bid_currency_top > listing.bid_currency_start ? 'top' : 'use')
	      ).addClass('bigger')
	    oo('min-bid-pod div.mbc').removeClass('null')
	    oo('min-bid').hide() // the label for item min bid
	    oo('currency-bid-currency-symbol').html( oo.util.listingCurrencySym(listing) )
	    oo('currency-bid-currency-name').html('({0})'.fs(listing.bid_currency_type[1]))
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
    },

    putListingOwner: function() {
	oo.util.profile.putBadge(this.listing.owner).fadeIn(function() {
	    oo('owner-links').slideDown()
	})
    },

    putListingBids: function() {
	var self = this,
	    listing = self.listing,
	    bids = listing.bids,
	    bidfb = function(b) { return $.grep(listing.feedback, function(f, i) { return (f.bid==b.key) }) }

	self.putBidCount(bids.length)
	if (listing.bid_currency_use) {
	    var comp = function(a, b) { return a.currency_val >= b.currency_val ? 1 : -1 }
	    bids.sort(comp)
	}
	$.each(bids, function(idx, bid) {
	    var clone = oo('bids .prototype').clone().removeClass('null prototype'),
		fbs = bidfb(bid)
	    if (fbs.length) {
		var v = $.extend({context: $('.existing-feedback', clone)}, FeedbackView)
		v.putFeedback(fbs[0])
		$('.existing-feedback .feedback-view-seed', clone).removeClass('null')
		clone.data('lister-feedback', fbs[0])
	    }
	    if (listing.bid_currency_use && idx==bids.length-1) {
		clone.addClass('hibid mb1 p05').removeClass('ov')
	    }
	    if (listing.bid_currency_use) {
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
		$('.bid-status', clone).text('Look at the heading!  This one wins!')
		var hs = $('.status-header', clone).removeClass('null')
		$('h1', hs).text('Winner!')
		clone.removeClass('ov').addClass('msg')
		$('.wrap', clone).addClass('information')
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
	    $('.lister-tools-seed').show() // all bids
	}
	$('.bid-message-private').parent().show()

	// hide leave feedback links for any bids that have feedback
	$('div.bid:not(.prototype)').each(function(idx, ele) {
	    var bdiv = $(ele)
	    if (bdiv.data('lister-feedback')) { $('.lister-feedback-link', bdiv).fadeOut() }
	})
    },

    putAuthTools: function() {
	$('.bid-message-private').parent().show()
	if (this.listing.status == 'active') {
	    oo('auth-bid-pod').show()
	    if (profileBid()) {
		oo('place-start').text('Update It').data('update', true)
		oo('existing-bid-cancel').text('Cancel It').data('cancel', true).parent().show()
		// MARK
		var b = {
			context: oo('auth-bid-feedback-pod'),
			bid: profileBid(),
			feedback: profileFeedback(),
			listing: pageListing()
		    },
		    m = $.extend({}, b, FeedbackModel),
		    v = $.extend({}, b, FeedbackView),
		    cdef = $.extend({}, FeedbackController),
		    cont = this.bidderFeedbackController = oo.controller.extend({
			source: 'bidder',
			model: m,
			view: v,
			'#listing-detail-auth-bid-feedback-pod .cancel-button click' : cdef.cancel,
			'#listing-detail-auth-bid-feedback-pod .save-button click' : cdef.save
		    })
		cont.init()
		oo('auth-bid-feedback-pod').show()
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
		    var m = ItemBidModel.extend(CurrencyBidModel, {profile: p, suffix: p.id64, listing: listing}),
			c = self.controller = $.extend({model: m, view: BidView}, BidControllerDefn, oo.controller)
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
	$.each(oo('bids div.bid'), function(idx, ele) {
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
			v = BidView.extend(),
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
	    $('.main-buttons', context).fadeIn()
	})
    },

    showSelectWinner: function(context) {
	$('.main-buttons', context).fadeOut(function() {
	    $('.select-winner-confirm', context).fadeIn()
	})
    },

    showListerFeedbackForm: function(context) {
	if (!context.data('fbc')) {
	    var bid = context.data('bid'),
		b = {
		    context: context,
		    bid: bid,
		    feedback: null,
		    listing: pageListing()
		},
		m = $.extend({}, b, FeedbackModel),
		v = $.extend({}, b, FeedbackView),
		cdef = $.extend({}, FeedbackController),
		fbc = this.bidderFeedbackController = oo.controller.extend({
		    source: 'lister', model: m, view: v
		 }, cdef)
	    $('.save-button', context).click(function(e) {
		e.controller = fbc
		fbc.save(e)
	    })
	    context.data('fbc', fbc)
	    fbc.init()
	}
	$('.main-buttons', context).fadeOut(function() {
	    $('.feedback-comment-seed', context).fadeIn()
	    $('.lister-feedback-form', context).fadeIn()
	})
    },

    hideListerFeedbackForm: function(context) {
	$('.lister-feedback-form', context).fadeOut(function() {
	    $('.main-buttons', context).fadeIn()
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
	var bd = oo('bids div.bid').map(function(i, e) { return $(e).data('bid') }),
	    pd = $.grep(bd, function(b, i) { return (b.owner.steamid==profile.steamid) })
	return pd ? pd[0] : undefined
    },

    profileFeedback: function(profile) {
	var fb = this.model.listing.feedback || []
	    pf = $.grep(fb, function(f, i) { return (f.source==profile.steamid) })
	return pf ? pf[0] : undefined
    },

    'ready' : function(e) {
	oo('show-terms').click(oo.view.showTermsDialog)
	oo('show-open-market').click(oo.view.showOpenMarketDialog)
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
	if (l.bid_currency_use) {
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
	e.controller.view.showSelectWinner( $(e.target).parents('div.bid') )
    },

    '.select-winner-submit live:click' : function(e) {
	var bid = $(e.target).parents('div.bid').data('bid')
	e.controller.model.selectWinner(bid, function() { window.location.reload() })
    },

    '.select-winner-cancel live:click' : function(e) {
	e.controller.view.hideSelectWinner($(e.target).parents('div.bid'))
    },

    '#listing-detail-currency-bid-amount keyup' : function(e) {
	e.target.value = e.target.value.replace(/[^0-9\.\,]/g,'');
    },

    '.lister-feedback-link live:click' : function(e) {
	e.controller.view.showListerFeedbackForm($(e.target).parents('div.bid'))
    },

    '.lister-tools-seed .cancel-button live:click' : function(e) {
	e.controller.view.hideListerFeedbackForm($(e.target).parents('div.bid'))
    }

})


}
