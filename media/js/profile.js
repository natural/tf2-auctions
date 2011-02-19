//(function() {

// fix up details
//      anon: show feedback
//      auth: show leave msg
//      auth: show leave feedback
//      owner: show msgs
//      owner: remove msgs

// fix up listings
// fix up bids
// fix settings (checkboxes have break after)

// done:  backpack
// done:  settings


oo.config('#profile-')


// this needed?
var makeStatusLoader = function(id) {
    return oo.data.loader({
        prefix: 'http://tf2apiproxy.appspot.com/api/v1/status/',
	dataType: 'jsonp',
	name: 'StatusLoader' + id
    })
}


var NotifyListingTool = function(model) {
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


//
// messages model and view for the details tab
//
var MessagesModel = Model.extend({
    loader: oo.data.loader({
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
		    oo('view-msg-count').text('({0})'.fs(c) )
		} else {
		    oo('msg-none').text('No messages.  Too bad.').fadeIn()
		    oo('view-msg-count').text('')
		}
	    }
	oo('view-msg-title').text('My Messages')
	oo('view-msg-pod').slideDown()
	putCount(msgCount)
	if (!msgCount) { return }
	$.each(msgs.messages, function(idx, msg) {
	    var clone = oo('view-msg-pod div.prototype').clone()
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
		    oo.util.profile.put(MessagesView.model.profile, true) 
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
    }

})


//
// feedback loader, model, and view for the details tab
//

var FeedbackLoader = oo.data.loader({
    prefix: '/api/v1/public/profile-feedback/',
    name: 'FeedbackLoader'
})

var FeedbackModel = Model.extend({
    init: function(view, config) {
	var self = this
	self.requests.push(function() {
	    new FeedbackLoader({
		suffix: MainModel.id64(),
		success: function(feedback) { self.feedback = feedback }
	    })
	})
	Model.init.apply(self, arguments)
    }
})


var FeedbackView = View.extend({
    authSuccess: function(profile) {
	if (MainModel.isOwner(profile)) {
	    this.showReadOnly('My Feedback')
	} else {
	    // show leave feedback
	    this.showReadWrite('Feedback (Maybe From You)')
	}
    },

    authError: function() {
	this.showReadOnly('Feedback for {0}'.fs(MainModel.results.personaname))
    },

    showReadOnly: function(txt) {
	oo('feedback-existing-title').text(txt)
	oo('feedback-existing-pod').slideDown()
    },

    showReadWrite: function(txt) {
	oo('feedback-existing-title').text(txt)
	oo('feedback-existing-pod').slideDown()
    },

    join: function(model) {
	if (!model.feedback) {
	    oo('feedback-none').text('No feedback.').fadeIn()
	} else {
	    this.putFeedback(model.feedback)
	}
    },

    putFeedback: function(fbs) {
	var proto = $('.profile-feedback-seed')
	$.each(fbs, function(idx, fb) {
	    var clone = proto.clone().removeClass('null')
	    View.setRating($('.fb-rating', clone), fb.rating)
	    $('.fb-message', clone).text(fb.comment)
	    var loader = makeStatusLoader(fb.source)
	    new loader({
		suffix: fb.source,
		success: function(status) {
		    console.log('status of feedback source:', status)
		    var link = '<a href="/profile/{0}">{1}</a>'
		    if (status.avatar_icon) {
			var img = '<img src="{0}" class="msg-avatar" />&nbsp;'.fs(status.avatar_icon)
			$('.source-name', clone).append(link.fs(fb.source, img))
			$('.source-name img', clone).addClass('profile-status ' + status.online_state)
		    }
		    $('.source-name', clone).append(link.fs(fb.source, status.name))
		}
	    })
	    proto.after(clone)
	})
    }
})


//
// listings model and view for listings tab.
//
var ListingsModel = SchemaModel.extend({
    init: function(view, config) {
	var self = this
	self.requests.push(function() {
	    oo.data.listings({
		suffix: MainModel.id64(),
		success: function(listings) { self.listings = listings }
	    })
	})
	SchemaModel.init.apply(self, arguments)
    }
})


var ListingsView = SchemaView.extend({
    title: 'Recent Listings',

    authSuccess: function(profile) {
	if (MainModel.isOwner(profile)) {
	    this.title = 'My ' + this.title
	}
    },

    join: function(model) {
	var self = this
	oo('listings-title').text(self.title).parent().fadeIn()
	self.message('Listings loaded.').fadeOut()
	oo('listings-inner').fadeIn(function() {
	    if (!model.listings.length) {
		oo('listings-none').text('Nothing recent.').slideDown()
	    } else {
		self.putMany(model.listings, model.profile)
	    }
	})
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


//
// bids model and view for the bids tab
//
var BidsModel = SchemaModel.extend({
    init: function(view, config) {
	console.log('BidsModel.init()', view, config)
	var self = this
	self.requests.push(
	    function() {
	        oo.data.bids({
		    suffix: MainModel.id64(),
		    success: function(bids) { self.bids = bids }
	        })
	    }
        )
	SchemaModel.init.apply(self, arguments)
    }
})


var BidsView = SchemaView.extend({
    title: 'Recent Bids',

    authSuccess: function(profile) {
	if (MainModel.isOwner(profile)) {
	    this.title = 'My ' + this.title
	}
    },

    join: function(model) {
	console.log('BidsView.join()', model)
	var self = this
	oo('bids-title').text(self.title)
	oo('bids-pod').fadeIn(function() {
	    if (!model.bids.length) {
		oo('bids-none').text('Nothing recent.').slideDown()
	    } else {
		self.putMany(model.bids, model.profile)
	    }
	})
    },

    putMany: function(bids, profile) {
	var self = this, proto = oo('bids div.prototype')
	$.each(bids, function(idx, bid) {
	    self.putOne(bid, proto.clone().addClass('bid-marker'))
	})
	$('div.bid-marker td.item-view div:empty').parent().remove()
	oo.schema.tool().putImages(profile ? profile.settings : null)
	oo('bids-pod div.init-seed').slideDown('slow')
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
	oo('bids').append(clone)
    }
})


//
// backpack model and view for backpack tab
//
var BackpackModel = SchemaModel.extend({
    init: function(view, config) {
	var id64 = MainModel.id64(),
            self = this,
	    lloader = oo.data.loader({prefix: '/api/v1/public/listings/'}),
	    bloader = oo.data.loader({prefix: '/api/v1/public/bids/'})

	self.requests.push(
	    function() {
		new lloader({
		    suffix: id64,
		    success: function(listings) { self.listings = listings }
		})
	    },
	    function() {
		new bloader({
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
	SchemaModel.init.apply(self, arguments)
    }
})


var BackpackView = SchemaView.extend({
    title: 'Backpack',

    authSuccess: function(profile) {
	if (MainModel.isOwner(profile)) {
	    this.title = 'My ' + this.title
	}
    },

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
	    oo('backpack-title').text(self.title)
	    oo('backpack-title-pod').fadeIn(function() {
		oo('backpack-inner').fadeIn()
	    })
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

	$.each(settings.keys(), function(index, key) {
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
    view: SettingsView,
    model: SettingsModel,

    init: function() {
        this.validateNotifyBids()
	Controller.init.apply(this)
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


//
// main model, view and controller
//
var MainModel = Model.extend({
/*
    NB:  the MainModel has two profile attributes:

    1.  MainModel.results is the profile for the player page, this
        is present even when the user is not logged in.

    2.  MainModel.profile is the profile for the user, this is present
        only when the user is authenticated.  This object will be the
        same as .results when the user is viewing their own profile
        page.
*/
    loader: oo.data.loader({prefix: '/api/v1/public/profile/', name: 'MainLoader'}),
    loaderSuffix: oo.util.pathTail(),

    init: function(view, config) {
	var self = this
	Model.init.apply(self, [view, config])
    },

    ready: function(profile) {
	Model.ready.apply(this, arguments)
	MainController.modelProfileReady(this)
    },

    id64: function() {
	return this.results.id64
    },

    personaname: function() {
	return this.results.personaname
    },

    loadFeedback: function() {
	MainController.setSub('feedback', {view: FeedbackView, model: FeedbackModel})
    },


    loadMessages: function() {
	MainController.setSub('messages', {view: MessagesView, model: MessagesModel})
    },

    loadRating: function() {
	// fill it in
    },

    isOwner: function(p) {
	return (p && p.id64 == this.results.id64)
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
    join: function(model) {

	// auth and owner
	if (model.isOwner(model.profile)) {
	    model.loadMessages()
	    oo('is-you').text('This is you!').slideDown()
	    oo('settings-tab').fadeIn()
	}

	// auth but not owner
	if (model.profile && !model.isOwner(model.profile)) {
	    oo('leave-msg-title')
		.text('Leave a message for {0}:'.fs(model.personaname()))
	    oo('leave-msg-txt').width('90%').height(150)
	    oo('leave-msg-submit').parent().width('90%')
	    oo('leave-msg-pod').slideDown()
	}

	// 
	model.loadRating()
	model.loadFeedback()

	var profile = model.results,
	    ownerid = profile.steamid
	this.docTitle(profile.personaname)
	oo('title').text(profile.personaname)
	if (profile.avatarmedium) {
	    oo('avatar').attr('src', profile.avatarmedium)
	}

	var setStatus = function(status) {
	    var m = status.message_state
	    oo('avatar').addClass(status.online_state)
	    if (/In-Game<br \/>Team Fortress 2 - /.test(m)) {
		oo('join-game').attr('href', (/ - <a href="(.*)">Join<\/a>/)(m)[1]).parent().slideDown()
		m = m.replace(/ - .*/, '')
	    }
	    oo('status').html(m).addClass(status.online_state).slideDown()
	}
	oo.data.status({suffix: profile.id64, success: setStatus})
	oo('badge').slideDown()
	$('.init-seed').fadeIn()
	oo('owner-view-steam-profile').attr('href', profile.profileurl)
	oo('add-owner-friend').attr('href', 'steam://friends/add/{0}'.fs(ownerid))
	oo('chat-owner').attr('href', 'steam://friends/message/{0}'.fs(ownerid))
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
	    oo('leave-msg-title').text('Message sent!')
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
	    // if jQuery.active
	    sub.init()
	    console.log('sub init:', name, sub)
	    window.setTimeout(function() {MainView.message().fadeOut()}, 1000)
	}
    },

    modelProfileReady: function() {
	// callback after the page profile is ready; we need this
	// because we can't select a tab reliably until we know the
	// id64 of the profile.
	var hash = this.hash()
	if (hash && hash != '0') { this.tabCallbacks[parseInt(hash)].apply(this) }
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
	this.tabCallbacks = {
            0: this.detailsShow,
	    1: this.listingsShow,
	    2: this.bidsShow,
	    3: this.backpackShow,
	    4: this.settingsShow
	}
	var self = this,
	    tabs = $('#tabs').tabs({ fx: {opacity: 'toggle', duration: 'fast'} })
	tabs.bind('tabsselect', function(event, ui) {
	    window.location.href = ui.tab
	    self.tabCallbacks[ui.index].apply(self)
	})
    }
})


//})()
