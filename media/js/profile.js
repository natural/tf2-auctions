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
    //loader: ListingsLoader,
    //loaderSuffix: id64View(),
    init: function(view, config) {
	var self = this
	SchemaModel.init.apply(this, [view, config])
    },

    ready: function(listings) {
	this.results = listings
	console.log('listings', listings)
    }
})

var ListingsView = SchemaView.extend({
    slug: '#profile-',
    init: function() {
	//$$('listings-title').text('{0}Recent Listings'.fs(prefix ? prefix+' ' : ''))
	SchemaView.init.apply(this, [])
    },

    join: function(listings) {
	console.log('ListingsView.join()', listings)
	var prefix = 'WUT', self = this
	self.$$('listings-title').text('{0}Recent Listings'.fs(prefix ? prefix+' ' : ''))
	self.message('Listings loaded.').fadeOut()
	self.$$('listings-inner').fadeIn(function() {
	    if (!listings.length) {
		self.$$('listings-none').text('Nothing recent.').slideDown()
	    } else {
		self.putMany(listings)
	    }
	})

    },

    putMany: function(listings) {
	var self = this

	window.setTimeout(function() { self.$$('listings-loading').fadeAway() }, 500)
	if (!self.putMany.initOnce) {
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
	    self.putMany.initOnce = true
	}
    },

    putOne: function(listing, clone) {
	console.log('putOne', listing, clone)
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

var ListingsControllerDefn = {
    name: 'ListingsController',
    view: ListingsView,
    model: ListingsModel
}


// bids tab
var BidsControllerDefn = {
    name: 'BidsController',
    view: NullView,
    model: NullModel
}
var BidsModel = SchemaModel.extend({
})
var BidsView = SchemaView.extend({
})


// backpack tab
var BackpackControllerDefn = {
    name: 'BackpackController',
    view: NullView,
    model: NullModel
}
var BackpackModel = SchemaModel.extend({
})
var BackpackView = SchemaView.extend({
})


// settings tab
var SettingsControllerDefn = {
    name: 'SettingsController',
    view: NullView,
    model: NullModel
}
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
	this.setSub(ListingsControllerDefn, 'Loading listings...')
    },

    bidsShow: function() {
	this.setSub(BidsControllerDefn)
    },

    backpackShow: function() {
	this.setSub(BackpackControllerDefn)
    },

    settingsShow: function() {
	this.setSub(SettingsControllerDefn)
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
