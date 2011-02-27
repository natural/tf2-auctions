(function() {
    oo.config({prefix: '#front-', auth: {settings: 1, complete: 0}})

    var initJoin = function(view) {
	var self = this
	return oo.model.init.apply(self, arguments)
            .success(function() { view.join.apply(view, [self]) })
    },

    newsModel = oo.model.extend({loader: oo.data.news, init: initJoin}),
    newsView = oo.view.extend({
	cloneClass: 'news-seed',
	join: function(model) {
	    var self = this, news = model.data.appnews.newsitems.newsitem
	    if (!news || !news[0]) { return }
	    $.each(news, function(idx, newsentry) {
		var clone = self.proto()
		if (newsentry.author) {
		    $('.news-author-seed', clone).html('({0})'.fs(newsentry.author))
		}
		$('.news-title-seed', clone).text(newsentry.title)
		$('.news-title-seed', clone).parents('a').attr('href', newsentry.url)
		if (newsentry.url) {
                    $('.news-contents-seed a', clone).attr('href', newsentry.url).text('more...')
		}
		$('.news-contents-seed', clone).prepend(newsentry.contents)
		oo('news').append(clone)
	    })
		oo('news').slideDown()
	}
    }),


    statsModel = oo.model.extend({loader: oo.data.stats, init: initJoin}),
    statsView = oo.view.extend({
	join: function(model) {
	    var stats = model.data
	    $.each(oo.keys(stats), function(idx, key) {
		oo(key.replace('_', '-')).text(stats[key])
	    })
	    oo('stats').slideDown()
	}
    }),


    blogModel = oo.model.extend({loader: oo.data.blog, init: initJoin}),
    blogView = oo.view.extend({
	cloneClass: 'blog-seed',
	join: function(model) {
	    var entries = model.data, self = this
	    $.each(entries, function(idx, blogpost) {
		var clone = self.proto()
		$('.blog-title-seed', clone).text(blogpost.title)
		if (blogpost.intro != '<p></p>') {
		    $('.blog-intro-seed', clone).html(blogpost.intro)
		} else {
		    $('.blog-intro-seed', clone).remove()
		}
		$('.blog-encoded-seed', clone).html(blogpost.entry)
		oo('blog').append(clone)
	    })
	    if (entries.length) { oo('blog').slideDown() }
	}
    }),


    searchModel = oo.model.extend({
	loader: oo.data.search,
	suffix: '?limit=5',

	init: function(view) {
	    var self = this
            oo.model.auth.init().success(view.authSuccess).error(view.authError)
	    return $.when(
		oo.model.init.apply(this, arguments),
		oo.model.schema.init()
	    ).done(function(searchDone, schemaDone) {
		self.tool = oo.model.schema.tool
		view.join(self)
	    })
	}
    }),


    searchView = oo.view.searchbase.extend({
	authSuccess: function(profile) {
	    oo('auth').slideDown()
	    oo('auth > h1').text('Welcome, {0}!'.fs(profile.personaname))
	    this.profile = profile
	},

	authError: function() {
	    oo('no-auth').slideDown()
	},

	join: function(model) {
	    var results = model.data
	    if (!results.listings) { return }

	    if (!results.listings.length) {
		oo('no-listings').text('Nothing found.').show()
		oo('some-listings').hide()
		return
	    } else {
		oo('no-listings').hide()
		oo('some-listings').text('Latest Listings:').show()
	    }
	    this.joinListings({
		listings: results.listings,
		prototype: oo('new-listings-pod .prototype'),
		target: oo('results-pod'),
		prefix: '.new-listings'
	    })
	    this.joinFeatured(results)
	    oo.data.auth()
		.success(function(p) {model.tool.putImages(p.settings) })
	        .error(function() { model.tool.putImages() })
	    $('div.listing-seed td.item-view div:empty').parent().remove()
	    oo('new-listings-pod').slideDown()
	},

	putListing: function(listing, clone, target) {
	    // called to put a single featured listing; parent object 'putOne' called
	    // for each result.
	    if (listing.description) {
		$('.listing-description', clone).text(listing.description)
	    } else {
		$('.listing-description-label', clone).empty()
		$('.listing-description', clone).empty()
	    }
	    $('.bid-count-seed', clone).text(listing.bid_count || '0')
            var next = 0
	    $.each(listing.items, function(index, item) {
		$($('.item-view div', clone)[next]).append($.toJSON(item))
		next += 1
            })
		if (listing.min_bid.length) {
		    next = 0
		    $.each(listing.min_bid, function(index, defindex) {
			$($('.search-listing-view-min-bid .item-view div', clone)[next])
			    .append($.toJSON({defindex:defindex, quality:6}))
			next += 1
		    })
			$('.search-listing-view-min-bid', clone).removeClass('null')
		} else {
		    $('.search-listing-view-min-bid', clone).hide()
		}
	    $('.listing-view-link a', clone).attr('href', '/listing/{0}'.fs(listing.id))
	    //	$('.listing-view-link', clone)
	    //	    .append('<span class="mono">Expires: {0}</span>'.fs(''+new Date(listing.expires)) )
	    if (listing.featured) {clone.addClass('featured')}
	    target.append(clone)
	}
    })


    oo.controller.extend({
	model: searchModel,
	view: searchView,

	'#featured-listings div.listing-seed div.navs span.nav.next live:click' : function(e) {
	    e.controller.view.navFeatured(1)
	},

	'#featured-listings div.listing-seed div.navs span.nav.prev live:click' : function(e) {
	    e.controller.view.navFeatured(-1)
	}
    })
    oo.controller.extend({model: blogModel, view: blogView})
    oo.controller.extend({model: statsModel, view: statsView})
    oo.controller.extend({model: newsModel, view: newsView})
})()

