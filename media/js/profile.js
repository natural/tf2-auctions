
var slug = '#profile-',
    $$ = make$$(slug),
    pathTail = function() { return window.location.pathname.split('/').pop() }


var makeStatusLoader = function(id) {
    return makeLoader({
        prefix: 'http://tf2apiproxy.appspot.com/api/v1/status/',
	dataType: 'jsonp',
	name: 'StatusLoader' + id
    })
}


var NotifyListingTool = function(model) {
    this.schemaTool = new SchemaTool()
    var items = this.schemaTool.tradableBackpack(),
        bpTool = new BackpackItemsTool({
	    items: items,
	    slug: 'nl',
	    navigator: true,
	    toolTips: true,
	    select: true,
	    outlineHover: true,
	    filters: true,
	    cols: 5,
	    rowGroups: BackpackPages.slim(Math.round(items.length*0.01) / 0.01),
	}),
        chTool = this.chooser = new BackpackChooserTool({
	    backpackSlug: 'nl',
	    chooserSlug: 'notify-listing',
	    selectDeleteHover: true,
	    copy: true,
        })
    bpTool.init()
    chTool.init()
}


//
// messages model and view for the details tab
//
var MessagesModel = Model.extend({
    loader: makeLoader({
	prefix: '/api/v1/auth/list-messages',
	name: 'MessagesLoader'
    }),

    authSuccess: function(profile) {
	this.profile = profile
    }
})


var MessagesView = View.extend({
    join: function(model) {
	var msgs = model.results,
	    msgCount = msgs.messages.length,
	    putCount = function(c) {
		if (c) {
		    $$('view-msg-count').text('({0})'.fs(c) )
		} else {
		    $$('msg-none').text('No messages.  Too bad.').fadeIn()
		    $$('view-msg-count').text('')
		}
	    }
	$$('view-msg-title').text('My Messages')
	$$('view-msg-pod').slideDown()
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
		    model.profile.message_count -= 1
		    profileUtil.put(MessagesView.model.profile, true) 
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

})


//
// feedback model and view for the details tab
//
var FeedbackModel = Model.extend({
    loader: function() {}
})
var FeedbackView = View.extend({

    __authSuccess: function(profile) {
	if (MainModel.id64() != profile.id64) {
	    $$('leave-feedback-pod').slideDown()
	}
    }
})


//
// listings model and view for listings tab.
//
var ListingsModel = SchemaModel.extend({
    init: function(view, config) {
	var self = this
	self.requests.push(function() {
	    new ListingsLoader({
		suffix: MainModel.id64(),
		success: function(listings) { self.listings = listings }
	    })
	})
	SchemaModel.init.apply(self, [view, config])
    }
})


var ListingsView = SchemaView.extend({
    slug: slug,
    title: 'Recent Listings',
    initOnce: false,

    authSuccess: function(profile) {
	if (MainModel.id64() == profile.id64) {
	    this.title = 'My ' + this.title
	}
    },

    join: function(model) {
	var self = this
	$$('listings-title').text(self.title).parent().fadeIn()
	self.message('Listings loaded.').fadeOut()
	$$('listings-inner').fadeIn(function() {
	    if (!model.listings.length) {
		$$('listings-none').text('Nothing recent.').slideDown()
	    } else {
		self.putMany(model.listings, model.profile)
	    }
	})
    },

    putMany: function(listings, profile) {
	var self = this
	if (!self.initOnce) {
	    var proto = $$('listings-inner div.prototype')
	    $.each(listings, function(idx, listing) {
		self.putOne(listing, proto.clone().addClass('listing-seed'))
	    })
	    new SchemaTool().putImages(profile ? profile.settings : null)
	    $('div.listing-seed td.item-view div:empty').parent().remove()
	    $$('listings-pod div.init-seed').slideDown('slow')
	    self.initOnce = true
	}
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
	$$('listings').append(clone)
    }
})


//
// bids model and view for the bids tab
//
var BidsModel = SchemaModel.extend({
    init: function(view, config) {
	var self = this
	self.requests.push(function() {
	    new BidsLoader({
		suffix: MainModel.id64(),
		success: function(bids) { self.bids = bids }
	    })
	})
	SchemaModel.init.apply(self, [view, config])
    }
})


var BidsView = SchemaView.extend({
    initOnce: false,
    slug: slug,
    title: 'Recent Bids',

    authSuccess: function(profile) {
	if (MainModel.id64() == profile.id64) {
	    this.title = 'My ' + this.title
	}
    },

    join: function(model) {
	if (!this.initOnce) {
	    var self = this
	    self.initOnce = true
	    $$('bids-title').text(self.title)
	    $$('bids-inner').fadeIn(function() {
		if (!model.bids.length) {
		    $$('bids-none').text('Nothing recent.').slideDown()
		} else {
		    self.putMany(model.bids, model.profile)
		}
	    })
	}
    },

    putMany: function(bids, profile) {
	var self = this, proto = $$('bids div.prototype')
	$.each(bids, function(idx, bid) {
	    self.putOne(bid, proto.clone().addClass('bid-marker'))
	})
	$('div.bid-marker td.item-view div:empty').parent().remove()
	new SchemaTool().putImages(profile ? profile.settings : null)
	$$('bids-pod div.init-seed').slideDown('slow')
    },

    putOne: function(bid, clone) {
	clone.removeClass('null prototype')
	var target = $('.items-view table.chooser', clone)
	SchemaView.putItems(target, bid.items)
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
	$$('bids').append(clone)
    }
})


//
// backpack model and view for backpack tab
//
var BackpackModel = SchemaModel.extend({
    init: function(view, config) {
	var id64 = MainModel.id64(), self = this
	self.requests.push(
	    function() {
		new ListingsLoader({
		    suffix: id64,
		    success: function(listings) { self.listings = listings }
		})
	    },
	    function() {
		new BidsLoader({
		    suffix: id64,
		    success: function(bids) { self.bids = bids }
		})
	    },
	    function() {
		new BackpackLoader({
		    suffix: id64,
		    success: function(backpack) { self.backpack = backpack }
		})
	    }
	)
	SchemaModel.init.apply(self, [view, config])
    }
})


var BackpackView = SchemaView.extend({
    initOnce: false,
    slug: slug,
    title: 'Backpack',

    authSuccess: function(profile) {
	if (MainModel.id64() == profile.id64) {
	    this.title = 'My ' + this.title
	}
    },

    join: function(model) {
	if (!this.initOnce) {
	    var self = this,
	        bpTool = new BackpackItemsTool({
		    items: model.backpack.result.items.item,
		    listingUids: listingItemsUids(model.listings),
		    bidUids: bidItemsUids(model.bids),
		    navigator: true,
		    slug: 'profile',
		    toolTips: true,
		    outlineHover: true,
		    showAll: true,
		    rowGroups: BackpackPages.full(model.backpack.result.num_backpack_slots)
		})
	    bpTool.init(model.profile ? model.profile.settings : null)
	    self.initOnce = true
	    $$('backpack-title').text(self.title)
	    $$('backpack-title-pod').fadeIn(function() {
		$$('backpack-inner').fadeIn()
	    })
	}
    }
})


//
// settings controller definition, model and view for the settings tab
//

var SettingsModel = SchemaModel.extend({
    authSuccess: function(profile) {
	this.profile = profile
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


var SettingsView = View.extend({
    join: function(model) {
	var profile = model.profile, settings = profile.settings

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

	if (profile.subscription && profile.subscription.status == 'Verified') {
	    var nlt = new NotifyListingTool(model)
	    var removeFromChooser = function(e) {
		$('img', this).fadeOut().remove()
		$(this).removeClass('selected selected-delete')
	    }
	    var copyToChooser = function(e) {
		var source = $(e.target)
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
    },

    saveSuccess: function() {
	$$('settings-save-message div.information')
	    .text('Saved!')
	    .fadeIn()
	    .delay(3000)
	    .fadeOut()
    },

    saveError: function(msg) {
	$$('settings-save-message div.error')
            .text('Error: {0}'.fs(msg))
	    .fadeIn()
	    .delay(5000)
	    .fadeOut()
    },

    emailError: function(v) {
	if (v) {
	    $$('email-error').text(v).parent().slideDown()
	} else {
	    $$('email-error').text('').parent().slideUp()
	}
    }

})


var SettingsControllerDefn = {
    view: SettingsView,
    model: SettingsModel,

    init: function() {
        this.validateNotifyBids()
	Controller.init.apply(this)
    },

    validateNotifyBids: function() {
	if ($$('notify-bids').attr('checked') && !$$('email').val().trim()) {
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
	$$('settings-save-message div.error').fadeOut()
	$$('settings-save-message div.information').fadeOut()
	var self = this
	self.model.save(
	    output,
	    function() { self.saveSuccess.apply(self) },
	    function() { self.saveError.apply(self, arguments) }
	)
    }
}


//
// main model, view and controller
//
var MainModel = Model.extend({
    loader: makeLoader({prefix: '/api/v1/public/profile/', name: 'MainLoader'}),
    loaderSuffix: pathTail(),

    init: function(view, config) {
	var self = this
	Model.init.apply(self, [view, config])
    },

    id64: function() {
	return this.results.id64
    },

    personaname: function() {
	return this.results.personaname
    },

    loadMessages: function() {
	MainController.setSub('messages', {view: MessagesView, model: MessagesModel})
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


var MainView = View.extend({
    slug: slug,

    join: function(model) {
	if (model.profile && model.id64() == model.profile.id64) {
	    model.loadMessages()
	    $$('settings-tab').fadeIn()
	}
	if (model.profile && model.id64() != model.profile.id64) {
	    $$('leave-msg-title')
		.text('Leave a message for {0}:'.fs(model.personaname()))
	    $$('leave-msg-txt').width('90%').height(150)
	    $$('leave-msg-submit').parent().width('90%')
	    $$('leave-msg-pod').slideDown()
	}
	var profile = model.results,
	    ownerid = profile.steamid
	this.docTitle(profile.personaname)
	$$('title').text(profile.personaname)
	if (profile.avatarmedium) {
	    $$('avatar').attr('src', profile.avatarmedium)
	}
	new StatusLoader({
	    suffix: profile.id64,
	    success: function(status) {
		$$('avatar').addClass(status.online_state)
		$$('status').html(status.message_state).addClass(status.online_state).slideDown()
	    }
	})
	$$('badge').slideDown()
	$('.init-seed').fadeIn()
	$$('add-owner-friend').attr('href', 'steam://friends/add/{0}'.fs(ownerid))
	$$('chat-owner').attr('href', 'steam://friends/message/{0}'.fs(ownerid))
    },

    leaveMsgText: function() {
	return $$('leave-msg-txt').val().slice(0,400)
    },

    leaveMsgEmpty: function() {
	$$('leave-msg-form').slideUp(function() {
	    $$('leave-msg-title').text('Empty message?  Really?  Nothing sent!')
	})
    },

    leaveMsgSuccess: function() {
	$$('leave-msg-form').slideUp(function() {
	    $$('leave-msg-title').text('Message sent!')
	})
    },

    leaveMsgError: function(request, status, error) {
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
})


var MainController = Controller.extend({
    config: {auth: {required: false, settings: true, complete: true}},
    model: MainModel,
    subs: {},
    view: MainView,

    detailsShow: function() {
	//this.setSub('messages', {view: MessagesView, model: MessagesModel})
	//this.setSub('feedback', {view: FeedbackView, model: FeedbackModel})
    },

    listingsShow: function() {
	this.setSub('listings', {view: ListingsView, model: ListingsModel})
    },

    bidsShow: function() {
	this.setSub('bids', {view: BidsView, model: BidsModel})
    },

    backpackShow: function() {
	this.setSub('backpack', {view: BackpackView, model: BackpackModel})
    },

    settingsShow: function() {
	this.setSub('settings', SettingsControllerDefn)
    },

    setSub: function(name, defn) {
	if (name in this.subs) {
	    var sub = this.subs[name]
	} else {
	    this.view.message('Loading {0}...'.fs(name))
	    defn.config = this.config
	    var sub = this.subs[name] = Controller.extend(defn)
	    sub.init()
	    window.setTimeout(function() {MainView.message().fadeOut()}, 1000)
	}
    },

    '#profile-leave-msg-submit click': function(e) {
	var ctrl = e.controller,
            txt = ctrl.view.leaveMsgText()
	if (txt) {
	    ctrl.model.submitMsg({message: txt, target: ctrl.model.id64()})
	} else {
	    ctrl.view.leaveMsgEmpty()
	}
    },

    'ready' : function (e) {
	var self = this,
	    tabCallbacks = {
	        0: this.detailsShow,
		1: this.listingsShow,
		2: this.bidsShow,
		3: this.backpackShow,
		4: this.settingsShow
	    }
	$('#tabs').tabs({
	    fx: {opacity: 'toggle', duration: 'slow'},
	    show: function(event, ui) {
		if (ui.index in tabCallbacks) {
		    // munge the hash (to prevent the browser from jumping
		    // to the div automatically) and then set it:
		    window.location.hash = ui.tab.hash.replace('tabs-', '')
		    tabCallbacks[ui.index].apply(self)
		}
	    }
	})
    }
})
