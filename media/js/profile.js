// BUG:  empty listings not showing.
// FIXME:  some text ("Messages") should only appear after init
// FIXME: some text ("Backpack") should only appear after ajax load;
//        fetch times are long and need better loading/waiting dispays.

//(function() {


oo.config({prefix: '#profile-', auth: {settings: 1, complete: 1}})


var path = oo.util.pathTail(),
    owner = function(m) {
	return (m.pageProfile && m.userProfile && m.pageProfile.id64 == m.userProfile.id64)
    }


var DetailsModel = oo.model.extend({
    init: function(view) {
	var self = this, args = arguments
	self.view = view
	oo.data.profile({suffix: path})
	    .success(function(pageProfile) {
		self.pageProfile = pageProfile
		oo.model.auth.init()
		    .success(function(p) {
			self.userProfile = p
			if (p.id64 == pageProfile.id64) {
			    oo.data.messages(p.id64)
				.success(function(m) {
				    self.messages = m
				    view.joinOwnerMsgs.apply(view, [self])
				})
			} else {
			    view.joinAuthMsgs.apply(view, [self])
			}
		    })
		    .error(function() {
			view.joinAnonMsgs.apply(view, [self])
		    })
		view.joinProfile.apply(view, [self])
		oo.data.feedback({suffix: pageProfile.id64})
		    .success(function(f) {
			self.feedback = f
			view.joinFeedback.apply(view, [self])
		    })
	    })
    },

    submitMsg: function(output) {
	var self = this
	$.ajax({
	    url: '/api/v1/auth/leave-message',
	    type: 'POST',
	    dataType:'json',
	    data: $.toJSON(output),
	    success: self.view.leaveMsgSuccess,
	    error: self.view.leaveMsgError
	})
    }
})


var DetailsView = oo.view.extend({
    joinFeedback: function(model) { 
	if (model.feedback && model.feedback.length) {
	    var proto = $('.profile-feedback-seed')
	    $.each(model.feedback, function(idx, fb) {
		var clone = proto.clone(), link = '<a href="/profile/{0}">{1}</a>'
		oo.view.setRating($('.fb-rating', clone), fb.rating)
		$('.fb-message', clone).text(fb.comment)
		oo.data.status({suffix: fb.source})
		    .success(function(status) {
			if (status.avatar_icon) {
			    var img = '<img src="{0}" class="msg-avatar" />&nbsp;'.fs(status.avatar_icon)
			    // TODO:  fetch fb.source profile + use oo.util.profile.defaultUrl
			    $('.source-name', clone).append(link.fs(fb.source, img))
			    $('.source-name img', clone).addClass('profile-status ' + status.online_state)
			}
			$('.source-name', clone).append(link.fs(fb.source, status.name))
			clone.removeClass('null')
		    })
		proto.after(clone)
	    })
	} else {
	    oo('feedback-pod h2.empty').fadeIn()
	}
	this.joinFeedback = oo.noop
    },

    joinOwnerMsgs: function(model) {
	var self = this,
	    msgs = model.messages ? model.messages.messages : [],
	    msgcount = msgs.length,
	    putcount = function(c) {
		if (c) {
		    oo('view-msg-count').text(' ({0})'.fs(c) )
		} else {
		    oo('view-msg-count').text('')
		    oo('view-msg-pod h2.empty').fadeIn().parent().fadeIn()
		}
	    }
	if (msgcount) {
	    putcount(msgcount)
	    oo('view-msg-pod h2.empty').parent().fadeIn()
	    $.each(msgs, function(idx, msg) {
		var clone = oo('view-msg-pod div.prototype').clone()
		$('.profile-msg-text-seed', clone).text(msg.message)
		oo.data.status({suffix: msg.source})
		    .success(function(status) {
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
		    })
		$('.profile-msg-created-seed', clone).text('Left: {0}'.fs(msg.created))
		clone.removeClass('null prototype')
		$('.profile-msg-remove', clone).click(function (e) {
		    var removeMessageOkay = function(results) {
			msgcount -= 1
			putcount(msgcount)
			model.userProfile.message_count -= 1
			oo.util.profile.put(model.userProfile, true) 
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
		oo('view-msg-pod').append(clone)
	    })
	    oo('view-msg-pod').slideDown()
	} else {
	    oo('view-msg-pod h2.empty').fadeIn().parent().fadeIn()
	}
	this.joinOwnerMsgs = oo.noop
    },

    joinAuthMsgs: function(model) {
	if (model && model.userProfile) {
	    oo('msg-pod span.title').text('Leave Message for {0}'.fs(model.pageProfile.personaname))
	    oo('leave-msg-txt').width('90%').height(150)
	    oo('leave-msg-submit').parent().width('90%')
	    oo('leave-msg-pod').slideDown()
	} else {
	    oo('msg-pod').hide()
	}
    },

    joinAnonMsgs: function(model) {
	oo('msg-pod').hide()
    },

    joinProfile: function(model) {
	var profile = model.pageProfile,
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
	oo.data.status({suffix: profile.id64}).success(setStatus)
	oo('badge').slideDown()
	oo('owner-view-steam-profile').attr('href', profile.profileurl)
	oo('add-owner-friend').attr('href', 'steam://friends/add/{0}'.fs(ownerid))
	oo('chat-owner').attr('href', 'steam://friends/message/{0}'.fs(ownerid))
        var possum = profile.rating[0],
            poscnt = profile.rating[1],
            negsum = profile.rating[2],
            negcnt = profile.rating[3],
            pos = Math.round(poscnt > 0 ? possum / poscnt : 0),
            neg = Math.round(negcnt > 0 ? negsum / negcnt : 0)
        oo('pos-label').text('{0}% Positive'.fs( pos ))
        oo('pos-bar').width('{0}%'.fs(pos ? pos : 1)).html('&nbsp;')
        $('div.padding', oo('pos-bar').parent()).width('{0}%'.fs(100-pos) )
        oo('neg-label').text('{0}% Negative'.fs( Math.abs(neg) ))
        oo('neg-bar').width('{0}%'.fs(neg ? neg : 1)).html('&nbsp;')
        $('div.padding', oo('neg-bar').parent()).width('{0}%'.fs(100-neg) )

	this.joinProfile = oo.noop
    },

    leaveMsgText: function() {
	return oo('leave-msg-txt').val().slice(0,400)
    },

    leaveMsgEmpty: function() {
	oo('leave-msg-form').slideUp(function() {
	    oo('leave-msg-title').text('Empty message?  Really?  Nothing sent!')
	})
    },

    leaveMsgSuccess: function() {
	oo('leave-msg-form').slideUp(function() {
	    oo('msg-pod h1 span.title').text('Message sent!').parent().delay(2000).slideUp()
	})
    },

    leaveMsgError: function(request, status, error) {
	if (request.status==500) {
	    try {
		var err = $.parseJSON( request.responseText )
		if (err.exception == 'Mailbox full') {
		    oo('leave-msg-form').slideUp(function() {
			oo('leave-msg-title').text('Your message was not sent!  Target mailbox is full.')
		    })
		}
	    } catch (e) {}
	}
    }

})


var DetailsControllerDefn = {
    model: DetailsModel,
    view: DetailsView,

    '#profile-leave-msg-submit click': function(e) {
	var c = e.controller,
            txt = c.view.leaveMsgText()
	if (txt) {
	    c.model.submitMsg({
		message: txt,
		target: c.model.pageProfile.id64
	    })
	} else {
	    c.view.leaveMsgEmpty()
	}
    }
}


var ListingsModel = oo.model.schema.extend({
    init: function(view) {
	var self = this
	return oo.model.schema.init.apply(self, arguments)
	    .success(function(s) {
		oo.data.profile({suffix: path})
	            .success(function(p) {
			oo.data.listings({suffix: p.id64})
			    .success(function(listings) {
				self.listings = listings
				view.join(self)
			    })
		    })
	    })
    }
})


var ListingsView = oo.view.schema.extend({
    join: function(model) {
	var self = this
	oo('listings-inner').slideDown(
	    function() {
		if (model.listings && model.listings.length) {
		    self.putMany(model.listings, model.userProfile)
		} else {
		    oo('bids-pod h2.empty').fadeIn()
		}
	    }
	)
	self.join = oo.noop
    },

    putMany: function(listings, profile) {
	var self = this,
            proto = oo('listings-inner div.prototype')
	$.each(listings, function(idx, listing) {
	    self.putOne(listing, proto.clone().addClass('listing-seed'))
	})
	oo.data.auth()
	    .success(function(p) { oo.util.schema().putImages(p.settings) })
	    .error(function() { oo.util.schema().putImages() })
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
    init: function(view) {
	var self = this
	return oo.model.schema.init.apply(self, arguments)
	    .success(function(s) {
		oo.data.profile({suffix: path})
	            .success(function(p) {
			oo.data.bids({suffix: p.id64})
			    .success(function(bids) {
				self.bids = bids
				view.join(self)
			    })
		    })
	    })
    }
})


var BidsView = oo.view.schema.extend({
    join: function(model) {
	console.log('BidsView.join()', model)
	var self = this
	oo('bids-inner').slideDown(function() {
	    if (model.bids && model.bids.length) {
		self.putMany(model.bids, model.userProfile)
	    } else {
		oo('bids-pod h2.empty').fadeIn()
	    }
	})
	self.join = oo.noop
    },

    putMany: function(bids, profile) {
	var self = this, proto = oo('bids div.prototype')
	$.each(bids, function(idx, bid) {
	    self.putOne(bid, proto.clone().addClass('bid-marker'))
	})
	$('div.bid-marker td.item-view div:empty').parent().remove()
	oo.data.auth()
	    .success(function(p) { oo.util.schema().putImages(p.settings) })
	    .error(function() { oo.util.schema().putImages() })
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
    init: function(view) {
	var self = this
	return oo.data.profile({suffix: path})
	    .success(function(p) {
		var sub = oo.model.backpack.extend({suffix: p.id64})
		sub.init().done( function() { view.join(sub) })
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
	oo.data.auth()
	    .success(function(p) { 
		bpTool.init(p.settings)
		oo('backpack-inner').fadeIn()
	    })
	    .error(function() {
		bpTool.init()
		oo('backpack-inner').fadeIn()
	    })
    }
})


var SettingsModel = oo.model.schema.extend({
    init: function(view) {
	var self = this
	return oo.model.schema.init.apply(self, arguments)
	    .success(function(s) {
		oo.model.auth.init()
		    .success(function(p) {
			self.userProfile = p
			view.join(self)
		    })
	    })
    },

    ready: function(results) {
	this.pageProfile = results
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
    notifyTool: function(schema) {
	return new function() {
	    this.schemaTool = oo.util.schema(schema)
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
	var profile = model.userProfile, settings = profile.settings, self = this
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
	    oo.data.schema()
	        .success(function(s) {
		    var nlt = self.notifyTool(s),
	                removeFromChooser = function(e) {
			    $('img', self).fadeOut().remove()
			    $(self).removeClass('selected selected-delete')
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
		})
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
    details: DetailsControllerDefn,
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
    init: function(view) {
	var self = this
	return oo.data.profile({suffix: path})
	    .success(function(p) {
		self.pageProfile = p 
		oo.model.auth.init()
		    .success(function (p) {
			self.userProfile = p
			view.join(self)
		    })
                    .error(function() { view.join(self) })
	    })
    }
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

