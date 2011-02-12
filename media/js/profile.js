var id64Internal = null
var pathTail = function() { return window.location.pathname.split('/').pop() }
var id64View = function() { return id64Internal || pathTail() }

// nulls for the lulz
var NullLoader = function(options) {}
var NullView = View.extend({})
var NullModel = Model.extend({loader: NullLoader})


// details tab -- messages, feedback and steam profile
var MessagesLoader = makeLoader({
    prefix: '/api/v1/auth/list-messages',
    name: 'MessagesLoader'
})
var MessagesControllerDefn = {
    name: 'MessagesController',
    view: NullView,
    model: NullModel
}
var MessagesModel = Model.extend({
    loader: MessagesLoader,
})

var MessagesView = View.extend({
})


var FeedbackControllerDefn = {
    name: 'FeedBackController',
    view: NullView,
    model: NullModel
}
var FeedbackModel = Model.extend({
})
var FeedbackView = View.extend({
})


var SteamControllerDefn = {
    name: 'SteamController',
    view: NullView,
    model: NullModel
}
var SteamModel = Model.extend({
})
var SteamView = View.extend({
})


// listings tab
var ListingsModel = SchemaModel.extend({
    init: function(view, config) {
	var self = this
	self.requests.push(function() {
	    new ListingsLoader({
		suffix: id64View(),
		success: function(ls) { self.listings = ls }
	    })
	})
	SchemaModel.init.apply(self, [view, config])
    }
})

var ListingsView = SchemaView.extend({
    slug: '#profile-',
    titlePrefix: '',
    initOnce: false,

    authSuccess: function(profile) {
	if (id64View() == profile.id64) {
	    this.titlePrefix = 'My'
	}
    },

    join: function(data, model) {
	var self = this, prefix = self.titlePrefix
	self.$$('listings-title').text('{0}Recent Listings'.fs(prefix ? prefix+' ' : ''))
	self.message('Listings loaded.').fadeOut()
	self.$$('listings-inner').fadeIn(function() {
	    if (!model.listings.length) {
		self.$$('listings-none').text('Nothing recent.').slideDown()
	    } else {
		self.putMany(model.listings)
	    }
	})
    },

    putMany: function(listings) {
	var self = this
	if (!self.initOnce) {
	    var proto = self.$$('listings-inner div.prototype')
	    $.each(listings, function(idx, listing) {
		self.putOne(listing, proto.clone().addClass('listing-seed'))
	    })
	    new AuthProfileLoader({
		suffix: '?settings=1&complete=1',
		success: function(profile) { new SchemaTool().putImages(profile.settings) },
		error: function(request, status, error) { new SchemaTool().putImages() }
	    })
	    $('div.listing-seed td.item-view div:empty').parent().remove()
	    self.$$('listings-pod div.init-seed').slideDown('slow')
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
	this.$$('listings').append(clone)
    }
})



// bids tab
var BidsModel = SchemaModel.extend({
    init: function(view, config) {
	var self = this
	self.requests.push(function() {
	    var success = function(bs) { self.bidsReady(bs) }
	    new BidsLoader({success: success, suffix: id64View()})
	})
	SchemaModel.init.apply(self, [view, config])
    },

    bidsReady: function(bids) {
	this.view.bidsJoin(bids)
    }
})


var BidsView = SchemaView.extend({
    initOnce: false,
    slug: '#profile-',
    titlePrefix: '',

    authSuccess: function(profile) {
	if (id64View() == profile.id64) {
	    this.titlePrefix = 'My'
	}
    },

    bidsJoin: function(bids) {
	var self = this, prefix = self.titlePrefix
	self.$$('bids-title').text('{0}Recent Bids'.fs(prefix ? prefix+' ' : ''))
	self.$$('bids-inner').fadeIn(function() {
	    if (!bids.length) {
		self.$$('bids-none').text('Nothing recent.').slideDown()
	    } else {
		if (!self.initOnce) {
		    self.initOnce = true
		    self.putMany(bids)
		}
	    }
	})
    },

    putMany: function(bids) {
	console.log('put many bids', bids)
	var self = this, proto = self.$$('bids div.prototype')
	$.each(bids, function(idx, bid) {
	    self.putOne(bid, proto.clone().addClass('bid-marker'))
	})
	$('div.bid-marker td.item-view div:empty').parent().remove()
	new AuthProfileLoader({
	    suffix: '?settings=1&complete=1',
	    success: function(profile) { new SchemaTool().putImages(profile.settings) },
	    error: function(request, status, error) { new SchemaTool().putImages() }
	})
	self.$$('bids-pod div.init-seed').slideDown('slow')
    },

    putOne: function(bid, clone) {
	console.log('put one ', bid, clone)
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
	this.$$('bids').append(clone)
    }
})


// backpack tab
var BackpackModel = SchemaModel.extend({
    init: function(view, config) {
	var id64 = id64View(), self = this
	self.requests.push(function() {
	    new ListingsLoader({
		suffix: id64,
		success: function(listings) { self.listings = listings }
	    })
	})
	self.requests.push(function() {
	    new BidsLoader({
		suffix: id64,
		success: function(bids) { self.bids = bids }
	    })
	})
	self.requests.push(function() {
	    new BackpackLoader({
		suffix: id64,
		success: function(backpack) { self.backpack = backpack }
	    })
	})
	SchemaModel.init.apply(self, [view, config])
    },
})


var BackpackView = SchemaView.extend({
    initOnce: false,
    slug: '#profile-',
    titlePrefix: '',

    authSuccess: function(profile) {
	if (id64View() == profile.id64) {
	    this.titlePrefix = 'My'
	}
    },

    join: function(data, model) {
	var bpTool = new BackpackItemsTool({
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
	this.$$('backpack-inner').fadeIn()
    }
})


// settings tab
var SettingsModel = Model.extend({
})
var SettingsView = View.extend({
})


// page
var MainModel = Model.extend({
    loader: function() {},
    init: function(view, config) {
	Model.init.apply(this, [view, config])
    }
})
var MainView = View.extend({
    init: function(model) {
	View.init.apply(this, [model])
	console.log('profile MainView.init()')
    }
})

var MainController = Controller.extend({
    initHash: window.location.hash,
    model: MainModel,
    view: MainView,
    subs: {},

    detailsShow: function() {
	this.setSub(MessagesControllerDefn, 'Loading messages...')
	this.setSub(FeedbackControllerDefn, 'Loading feedback...')
	this.setSub(SteamControllerDefn, 'Loading status...')
    },

    listingsShow: function() {
	this.setSub(
	    {name: 'ListingsController', view: ListingsView, model: ListingsModel},
	    'Loading listings...'
	)
    },

    bidsShow: function() {
	this.setSub(
	    {name: 'BidsController', view: BidsView, model: BidsModel},
	    'Loading bids...'
	)
    },

    backpackShow: function() {
	this.setSub(
	    {name: 'BackpackController', view: BackpackView, model: BackpackModel},
	    'Loading backpack...'
	)
    },

    settingsShow: function() {
	this.setSub(
	    {name: 'SettingsController', view: NullView, model: NullModel},
	    'Loading settings...'
	)
    },

    setSub: function(defn, msg) {
	if (defn.name in this.subs) {
	    var sub = this.subs[defn.name]
	    console.log('reusing sub controller', sub.name, defn.name)
	} else {
	    this.view.message(msg || 'Loading...')
	    var sub = this.subs[defn.name] = Controller.extend(defn)
	    sub.init()
	    console.log('created new sub controller', sub.name, defn.name)
	    window.setTimeout(function() {MainView.message().fadeOut()}, 1000)
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
	    fx: {height: 'toggle', opacity: 'toggle', duration: 'slow'},
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
