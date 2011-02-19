// bug:  terms dialog doesn't pop
// bug:  double check cancel bid; trap reference error in listing.encode( bids encode)

oo.config('#listing-detail-')

var NewBidModel = Model.extend({
    loaderNg: oo.data.backpack,

    init: function(view, config) {
	var self = this, suffix = config.profile.id64
	self.listing = config.listing
	self.profile = config.profile
        self.loaderSuffix = suffix
	self.requests.push(
	    function() {
		oo.data.listings({
                    suffix: suffix,
                    success: function(listings) { self.listings = listings }
		})
            },
	    function() {
		oo.data.bids({
		    suffix: suffix,
                    success: function(bids) { self.bids = bids }
		})
            }
	)
        Model.init.apply(self, [view, config])
    },

    ready: function(backpack) {
	this.backpack = backpack
    },

    submit: function(params) {
	var output = {
            id: this.listing.id,
            private_msg: params.private_msg,
            public_msg: params.public_msg,
            update: params.update,
	    items: []
        }
	$.each(params.items, function(idx, img) {
	    if ( ! $(img).parents('td').hasClass('cannot-trade') ) {
		output.items.push( $(img).data('node') )
	    }
	})
	$.ajax({
	    url: '/api/v1/auth/add-bid',
	    type: 'POST',
	    dataType:'json',
	    data: $.toJSON(output),
	    success: params.success,
	    error: params.error
	})
    }
})


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


var NewBidView = View.extend({
    join: function(model) {
	var self = this
	self.putBackpack()
	self.putDefaults()
        self.show()
    },

    isUpdate: function(v) {
	return oo('place-start').data('update', v)
    },

    hide: function (after) {
	oo('place-bid-pod').slideUp('slow', after)
    },

    show: function() {
	var self = this
	self.message('').fadeOut()
	oo('auth-bid-pod').slideUp(function() {
            oo('own-backpack').slideDown(self.putFields)
        })
	oo('place-bid-pod').fadeIn(function() {
            // the controller should do this, but it's easier to do it here:
       	    $('#listing-detail-existing-bids-pod').scrollTopAni()
        })
    },

    showErrors: function(errors) {
	$.each(errors, function(index, error) {
	    var ele = $('{0}-error'.fs(error.id))
	    ele.text('Error: {0}'.fs(error.msg)).parent().slideDown()
	    if (index==0) { ele.parent().scrollTopAni() }
	})
    },

    putBackpack: function() {
	var self = this
        self.backpack = makeBpTool(self.model)
        self.chooser = makeChTool(function() { self.showMetMinBid.apply(self, [arguments]) })
        self.backpack.init(self.model.profile.settings)
        self.chooser.init(self.model.profile.settings)
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
	        console.error(e)
	    }
	}
    },

    putDefaults: function() {
	$.each(['bid-private-msg', 'bid-public-msg'], function(idx, value) {
            $('#listing-detail-{0}'.fs(value)).text(
                $('#listing-detail-{0}-default'.fs(value)).text()
            )
        })
    },

    putFields: function() {
        var width = $('#bp-chooser-listing-detail-add-bid-item tbody').width()
	oo('add-bid-fields').width(width)
	oo('add-bid-fields textarea').width(width).height(width/4).text()
	oo('add-bid-terms-desc').parent().width(width)
	oo('bid-bp-intro-pod').addClass('center').animate({width:width})
	oo('add-bid-item-ch-intro-pod').addClass('center').animate({width:width})
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


var BidderFeedbackModel = Model.extend({
    init: function(view, config) {
	var self = this
	Model.init.apply(this, arguments)
    },

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


var BidderFeedbackView = View.extend({
    init: function(model) {
	View.init.apply(this, arguments)
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
	View.setRating(e, v)
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
	console.log('BidderFeedbackController.reinit()')
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
	console.log('clicked cancel')
	e.controller.view.cancelFeedback()
    }

}

// just the definition; instantiated later
var NewBidController = {
    view: NewBidView,
    model: NewBidModel,
    profile: null,

    reinit: function() {
	this.view.show.apply(this.view, [])
    },

    removeDefaultText : function(target, defsel) {
        var area = $(target)
        if (area.text() == $(defsel).text()) { area.text('') }
    },

    cancelNewBid: function() {
	this.view.hide(function() {
            $('body').scrollTopAni()
            oo('auth-bid-pod').slideDown()
        })
    },

    submitBid: function() {
	var self = this,
	    errs = [],
	    items = $('#bp-chooser-listing-detail-add-bid-item img'),
	    private_msg = oo('bid-private-msg').val(),
            public_msg = oo('bid-public-msg').val()
	// 1.  bid items
	if (items.length < 1 || items.length > 10) {
	    errs.push({id:'#bp-chooser-listing-detail-add-bid-item',
		       msg:'Select 1-10 items from your backpack.'})
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
	e.controller.submitBid.apply(e.controller, [])
    },

    '#listing-detail-bid-cancel click': function(e) {
	e.controller.cancelNewBid.apply(e.controller, [])
    },

    '#listing-detail-add-bid-success-view click': function() {
	window.location.reload()
    }
}


var DetailView = SchemaView.extend({
    join: function(model) {
	var self = this,
	    listing = self.listing = model.listing,
	    profile = self.profile = self.model.profile
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
        oo('content').fadeIn(function() { self.putListingOwnerStatus() })
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
            oo('min-bid-currency-use span.mono')
		.text(listing.min_bid_currency_amount)
	        .parent().removeClass('null')
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
		    }), 1000)
        } else {
	    oo('timeleft').parent().hide()
	    $('label', oo('expires').parent()).text('Expired:')
	}
	$.each(['created', 'expires'], function(idx, name) {
	    oo(name).text(new Date(listing[name] + ' GMT').format())
        })
	self.putListingBids()
    },

    putListingOwner: function() {
	var self = this, listing = self.listing, owner = listing.owner
	oo('owner-link').attr('href')
	oo('owner-profile-link').attr('href', oo.util.profile.defaultUrl(owner))
	if (owner.avatar) { oo('owner-avatar').attr('src', owner.avatarmedium) }
	oo('view-steam-profile').attr('href', owner.profileurl)
	oo('add-owner-friend').attr('href', 'steam://friends/add/{0}'.fs(owner.steamid))
	oo('chat-owner').attr('href', 'steam://friends/message/{0}'.fs(owner.steamid))
	oo('owner-listings').attr('href', '/profile/' + owner.id64 + '#1')
	oo('owner-links').show()
        var possum = owner.rating[0],
            poscnt = owner.rating[1],
            negsum = owner.rating[2],
            negcnt = owner.rating[3],
            pos = Math.round(poscnt > 0 ? possum / poscnt : 0),
            neg = Math.round(negcnt > 0 ? negsum / negcnt : 0)
        oo('owner-pos-label').text('{0}% Positive'.fs( pos ))
        oo('owner-pos-bar').width('{0}%'.fs(pos ? pos : 1)).html('&nbsp;')
        $('div.padding', oo('owner-pos-bar').parent()).width('{0}%'.fs(100-pos) )
        oo('owner-neg-label').text('{0}% Negative'.fs( neg ))
        oo('owner-neg-bar').width('{0}%'.fs(neg ? neg : 1)).html('&nbsp;')
        $('div.padding', oo('owner-neg-bar').parent()).width('{0}%'.fs(100-neg) )
    },

    putListingBids: function() {
	var self = this,
	    listing = self.listing,
	    bids = listing.bids
        self.putBidCount(bids.length)
	$.each(bids, function(idx, bid) {
	    var clone = oo('bids .prototype').clone().removeClass('null prototype')
            self.putItems( $('table.chooser', clone), bid.items)
	    $('.bid-status', clone).text(bid.status)
	    $('.bid-created', clone).text('' + new Date(bid.created))
	    if (bid.owner && bid.owner.avatar) {
	        $('.bid-avatar', clone).attr('src', bid.owner.avatar)
	    }
            oo.data.status({
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

    putListingOwnerStatus: function() {
	oo.data.status({
            suffix: this.listing.owner.id64,
	    success: function(status) {
		var m = status.message_state
	        oo('owner-avatar').addClass('profile-status ' + status.online_state)
		if (/In-Game<br \/>Team Fortress 2 - /.test(m)) {
		    oo('join-game').attr('href', (/ - <a href="(.*)">Join<\/a>/)(m)[1]).parent().slideDown()
		    m = m.replace(/ - .*/, '')
		}
		oo('owner-status').html(m).addClass(status.online_state)
	    }
	})
    },

    putBidCount: function(count) {
	oo('bidcount').text(count ? ('Bids (' + count + ')') : 'No Bids')
    },

    putOwnerTools: function() {
	var status = this.listing.status
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
		    this.bidFeedbackController = Controller.extend(bfcondef)
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
	//
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
	if (!this.bidController) {
	    this.message('Loading your backpack...')
	    var listing = this.listing, profile = this.profile,
                condef = $.extend({config: {listing: listing, profile:profile}}, NewBidController)
            this.bidController = Controller.extend(condef)
            this.bidController.init()
         } else {
	     this.bidController.reinit()
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


var DetailModel = SchemaModel.extend({
    init: function(view, config) {
	var self = this
	self.requests.push(function() {
            oo.data.listing({
                suffix: oo.util.pathTail(),
                success: function(listing) { self.listing = listing }
            })
        })
        SchemaModel.init.apply(self, arguments)
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


var profileBid = function() {
    return DetailController.profileBid(DetailController.model.profile)
}


var pageListing = function() {
    return DetailController.model.listing
}


var DetailController = Controller.extend({
    config: {auth: {settings: true}},
    model: DetailModel,
    view: DetailView,

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
    }
})
