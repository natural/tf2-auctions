//(function() {


oo.config('#profile-')


var path = oo.util.pathTail(),
    noop = function() {},
    owner = function(m) {
	return (m.results && m.profile && m.results.id64 == m.profile.id64)
    }


var DetailsModel = oo.model.extend({
    init: function(view, config) {
	var self = this,
	    args = arguments,
            tail = path,
            preloader = oo.data.loader({prefix: '/api/v1/public/profile/'}),
	    msgloader = oo.data.loader({prefix: '/api/v1/auth/list-messages'}),
            fbkloader = oo.data.loader({prefix: '/api/v1/public/profile-feedback/'}),
	    msgapply = function(m) {
		self.messages = m
		view.joinMessages.apply(view, [self])
	    },
	   fbkapply = function(f) {
	       self.feedback = f
	       view.joinFeedback.apply(view, [self])
	   },
	   authapply = function(a) {
		self.profile = a
		view.joinProfile.apply(view, [self])
		if (owner(self)) {
		    self.requests.push(function() {msgloader({success: msgapply })})
		}
		self.requests.push(function() {
		    fbkloader({suffix: self.results.id64, success: fbkapply})
		})
	   }
	preloader({
	    suffix: tail,
	    success: function(p) {
		self.results = p
		oo.data.auth({
		    suffix: '?settings=1&complete=1',
		    success: authapply, error: authapply
		})
		oo.model.init.apply(self, args)
	    }
	})
    }
})


var DetailsView = oo.view.extend({
    joinFeedback: function(model) { 
	console.log('feedback', model.feedback)
	this.joinFeedback = noop
    },

    joinMessages: function(model) {
	console.log('messages', model.messages)
	this.joinMessages = noop
    },

    joinProfile: function(model) {
	var profile = model.results,
	    ownerid = profile.steamid,
            setStatus = function(status) {
	        var m = status.message_state
		oo('avatar').addClass(status.online_state)
		if (/In-Game<br \/>Team Fortress 2 - /.test(m)) {
		    oo('join-game').attr('href', (/ - <a href="(.*)">Join<\/a>/)(m)[1]).parent().slideDown()
		    m = m.replace(/ - .*/, '')
		}
		oo('status').html(m).addClass(status.online_state).slideDown()
	    }
	this.docTitle(profile.personaname)
	oo('title').text(profile.personaname)
	if (profile.avatarmedium) {
	    oo('avatar').attr('src', profile.avatarmedium)
	}
	oo.data.status({suffix: profile.id64, success: setStatus})
	oo('badge').slideDown()
	$('.init-seed').fadeIn()
	oo('owner-view-steam-profile').attr('href', profile.profileurl)
	oo('add-owner-friend').attr('href', 'steam://friends/add/{0}'.fs(ownerid))
	oo('chat-owner').attr('href', 'steam://friends/message/{0}'.fs(ownerid))
	this.joinProfile = noop
    }
})


var ListingsModel = oo.model.schema.extend({
    init: function(view, config) {
	var self = this,
	    args = arguments,
            tail = path,
            preloader = new oo.data.loader({prefix: '/api/v1/public/profile/'})
	preloader({
	    suffix: tail,
	    success: function(p) {
		var id64 = p.id64
		self.requests.push(
		    function() {
			oo.data.listings({
			    suffix: id64,
		            success: function(listings) {
				self.listings = listings
				if (BackpackModel.listings) {
				    self.view.join.apply(self.view, [self])
				}
			    }
			})
		    }
		)
		oo.model.schema.init.apply(self, args)
	    }
	})
    }
})


var ListingsView = oo.view.schema.extend({
    join: function(model) {
	var self = this
	oo('listings-inner').slideDown(
	    function() {
		if (model.listings && model.listings.length) {
		    self.putMany(model.listings, model.profile)
		} else {
		    oo('bids-pod h2.empty').fadeIn()
		}
	    }
	)
	self.join = noop
    },

    putMany: function(listings, profile) {
	var self = this,
            proto = oo('listings-inner div.prototype')
	$.each(listings, function(idx, listing) {
	    self.putOne(listing, proto.clone().addClass('listing-seed'))
	})
	oo.schema.tool().putImages(profile ? profile.settings : null)
	$('div.listing-seed td.item-view div:empty').parent().remove()
	oo('listings-pod div.init-seed').slideDown('slow')
    },

    putOne: function(listing, clone) {
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
	oo('listings').append(clone)
    }
})


var BidsModel = oo.model.schema.extend({
    init: function(view, config) {
	var self = this,
	    args = arguments,
            tail = path,
            preloader = new oo.data.loader({prefix: '/api/v1/public/profile/'})
	preloader({
	    suffix: tail,
	    success: function(p) {
		var id64 = p.id64
		self.requests.push(
		    function() {
			oo.data.bids({
			    suffix: id64,
		            success: function(bids) {
				self.bids = bids
				if (BackpackModel.bids) {
				    self.view.join.apply(self.view, [self])
				}
			    }
			})
		    }
		)
		oo.model.schema.init.apply(self, args)
	    }
	})
    }
})


var BidsView = oo.view.schema.extend({
    join: function(model) {
	console.log('BidsView.join()', model)
	var self = this
	oo('bids-inner').slideDown(function() {
	    if (model.bids && model.bids.length) {
		self.putMany(model.bids, model.profile)
	    } else {
		oo('bids-pod h2.empty').fadeIn()
	    }
	})
	self.join = noop
    },

    putMany: function(bids, profile) {
	var self = this, proto = oo('bids div.prototype')
	$.each(bids, function(idx, bid) {
	    self.putOne(bid, proto.clone().addClass('bid-marker'))
	})
	$('div.bid-marker td.item-view div:empty').parent().remove()
	oo.schema.tool().putImages(profile ? profile.settings : null)
	oo('bids-pod div.init-seed').show()
    },

    putOne: function(bid, clone) {
	clone.removeClass('null prototype')
	var target = $('.items-view table.chooser', clone)
	oo.view.schema.putItems(target, bid.items)
	$('.profile-bid-view-link a', clone).attr('href', '/listing/'+ bid.listing.id)
	if (bid.message_public) {
	    $('.bid-message', clone).text(bid.message_public)
	} else {
	    $('.bid-message, .bid-message-label', clone).remove()
	}
	if (bid.message_private) {
	    $('.bid-message-private', clone).text(bid.message_private).parent().removeClass('null')
	}
	$('.bid-status', clone).text(bid.status)
	$('.bid-created', clone).text('' + new Date(bid.created))
	oo('bids').append(clone)
    }
})


var BackpackModel = oo.model.schema.extend({
    init: function(view, config) {
	var self = this,
	    args = arguments,
            tail = path,
            preloader = oo.data.loader({prefix: '/api/v1/public/profile/'})
	preloader({
	    suffix: tail,
	    success: function(p) {
		var id64 = p.id64
		self.requests.push(
		    function() {
			oo.data.listings({
			    suffix: id64,
			    success: function(listings) { self.listings = listings }
			})
		    },
		    function() {
			oo.data.bids({
			    suffix: id64,
		            success: function(bids) { self.bids = bids }
			})
		    },
		    function() {
			oo.data.backpack({
			    suffix: id64,
			    success: function(backpack) { self.backpack = backpack }
			})
		    }
		)
		oo.model.schema.init.apply(self, args)
	    }
	})
    }
})


var BackpackView = oo.view.schema.extend({
    join: function(model) {
	var self = this,
            bpTool = oo.backpack.itemTool({
		items: model.backpack.result.items.item,
		listingUids: oo.util.itemUids(model.listings),
		bidUids: oo.util.itemUids(model.bids),
		navigator: true,
		slug: 'profile',
		toolTips: true,
		outlineHover: true,
		showAll: true,
		rowGroups: oo.backpack.pageGroup.full(model.backpack.result.num_backpack_slots)
	    })
	bpTool.init(model.profile ? model.profile.settings : null)
	oo('backpack-inner').fadeIn()
    }
})


var SettingsModel = oo.model.schema.extend({
    ready: function(results) {
	this.results = results
	this.view.join.apply(this.view, [this])
    },

    save: function(values, success, error) {
	$.ajax({
	    url: '/api/v1/auth/save-settings',
	    type: 'POST',
	    dataType: 'json',
	    data: $.toJSON(values),
	    success: success,
	    error: error
	})
    }

})


var SettingsView = oo.view.extend({
    notifyTool: function() {
	return new function() {
	    this.schemaTool = oo.schema.tool()
	    var items = this.schemaTool.tradableBackpack(),
            bpTool = oo.backpack.itemTool({
		items: items,
		slug: 'nl',
		navigator: true,
		toolTips: true,
		select: true,
		outlineHover: true,
		filters: true,
		cols: 5,
		rowGroups: oo.backpack.pageGroup.slim(Math.round(items.length*0.01) / 0.01),
	    }),
            chTool = this.chooser = oo.backpack.chooserTool({
		backpackSlug: 'nl',
		chooserSlug: 'notify-listing',
		selectDeleteHover: true,
		copy: true,
            })
	    bpTool.init()
	    chTool.init()
	}
    },

    join: function(model) {
	var profile = model.profile, settings = profile.settings
	$.each(oo.keys(settings), function(index, key) {
	    var value = settings[key], pkey = 'profile-{0}'.fs(key)
	    if (typeof(value) == 'boolean') {
		$('#'+pkey).attr('checked', value)
	    }
	    if (typeof(value) == 'string') {
		$('#'+pkey).val(value)
	    }
	    oo('settings-pod').slideDown()
	})

	if (profile.subscription && profile.subscription.status == 'Verified') {
	    var nlt = this.notifyTool(),
	        removeFromChooser = function(e) {
		    $('img', this).fadeOut().remove()
		    $(this).removeClass('selected selected-delete')
		},
	        copyToChooser = function(e) {
		    var source = $(e.target),
		        target = $("#bp-chooser-notify-listing td div:empty").first()
		    if (target.length) {
			var clone = source.clone()
			clone.data('node', source.data('node'))
			target.prepend(clone)
		    }
		},
	        resetChooser = function() {
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
	    oo('notify-listing-reset').click(resetChooser)

	    oo('premium-settings-pod').fadeIn()
	} else {
	    oo('premium-signup-pod').fadeIn()
	}
    },

    saveSuccess: function() {
	oo('settings-save-message div.information')
	    .text('Saved!')
	    .fadeIn()
	    .delay(3000)
	    .fadeOut()
    },

    saveError: function(msg) {
	oo('settings-save-message div.error')
            .text('Error: {0}'.fs(msg))
	    .fadeIn()
	    .delay(5000)
	    .fadeOut()
    },

    emailError: function(v) {
	if (v) {
	    oo('email-error').text(v).parent().slideDown()
	} else {
	    oo('email-error').text('').parent().slideUp()
	}
    }

})

var SettingsControllerDefn = {
    model: SettingsModel,
    view: SettingsView,

    init: function() {
        this.validateNotifyBids()
	oo.controller.init.apply(this)
    },

    validateNotifyBids: function() {
	if (oo('notify-bids').attr('checked') && !oo('email').val().trim()) {
	    this.view.emailError("Error: we can't send you notifications without an email address.")
	} else {
	    this.view.emailError()
	}
    },

    saveSuccess: function() {
	// it would be nice to reinitalize the profile here, but
	// that's impractical because the listings/bids/backpack tabs
	// might be initialized.
	this.view.saveSuccess()
    },

    saveError: function(request, error, status) {
	try {
	    var msg = $.parseJSON(request.responseText).description
	} catch (e) {
	    var msg = 'unknown error.  this is bad.'
	}
	this.view.saveError(msg)
    },

    '#profile-notify-bids click' : function(e) { e.controller.validateNotifyBids() },

    '#profile-email keyup' : function(e) { e.controller.validateNotifyBids() },

    '#profile-settings-save click' : function() {
	var output = {}, 
	    trim = function(i) { return i.replace('profile-', '') }

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
	oo('settings-save-message div.error').fadeOut()
	oo('settings-save-message div.information').fadeOut()
	var self = this
	self.model.save(
	    output,
	    function() { self.saveSuccess.apply(self) },
	    function() { self.saveError.apply(self, arguments) }
	)
    }
}


var SubControllers = {
    details: {model: DetailsModel, view: DetailsView},
    listings: {model: ListingsModel, view: ListingsView},
    bids: { model: BidsModel, view: BidsView},
    backpack: {model: BackpackModel, view: BackpackView},
    settings: SettingsControllerDefn
}


var MainView = oo.view.extend({
    join: function(model) {
	if (owner(model)) {
	    $('h1 span.title').before('My ')
	    oo('settings-tab').fadeIn()
	    oo('is-you').text('This is you!').slideDown()
	} else {
	    oo('owner-links').slideDown()
	}
    }
})


var MainModel = oo.model.extend({
    loader: oo.data.loader({prefix: '/api/v1/public/profile/'}),
    loaderSuffix: path
})


var MainController = oo.controller.extend({
    config: {auth: {required: false, settings: true, complete: true}},
    model: MainModel,
    view: MainView,

    show: function(event, ui) {
	var name = ui.tab.text.toLowerCase(),
	    after = function() {
		$('#{0} h2.loading'.fs(ui.index)).slideUp(
		    function() { $('#{0} div:first'.fs(ui.index)).fadeIn() }
		)
	    }
	if (name in SubControllers) {
	    var c = SubControllers[name]
	    if (!c.config) {
		c.config = this.config
		oo.controller.extend(c).init()
		$('h1 span.title', ui.panel).parent().fadeIn(after)
	    }
	}
    },

    'ready': function(e) {
	var self = this
	$('#tabs').tabs({
	    fx: {opacity: 'toggle', duration: 'fast'},
	    // apply the hash in 'select', not 'show', to prevent
	    // scrolling to the div
	    select: function(e, ui) { window.location.hash = ui.tab.hash },
	    show: function() {self.show.apply(self, arguments) },
	})
	// force scroll on document load in case there is a hash
	document.body.scrollTop = 0
    }

})


//})()
