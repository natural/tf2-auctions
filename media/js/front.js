var init = function() {
    oo.config({prefix: '#front-', auth: {settings: 1, complete: 0}})


    var newsModel = oo.model.extend({loader: oo.data.news, init: oo.model.initJoin}),
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


    statsModel = oo.model.extend({loader: oo.data.stats, init: oo.model.initJoin}),
    statsView = oo.view.extend({
	join: function(model) {
	    var stats = model.data
	    $.each(oo.keys(stats), function(idx, key) {
		oo(key.replace('_', '-')).text(stats[key])
	    })
	    oo('stats').slideDown()
	}
    }),


    blogModel = oo.model.extend({loader: oo.data.blog, init: oo.model.initJoin}),
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
            oo.model.auth.init()
		.success(view.authSuccess)
		.error(view.authError)
	    return $.when(
		oo.model.init.apply(this, arguments),
		oo.model.schema.init()
	    ).done(function() {
		self.tool = oo.model.schema.tool
		view.putListings(self)
	    })
	}
    }),


    searchView = oo.view.extend({
	authSuccess: function(profile) {
	    oo('auth').slideDown()
	    oo('auth > h1').text('Welcome, {0}!'.fs(profile.personaname))
	    this.profile = profile
	},

	authError: function() {
	    oo('no-auth').slideDown()
	},

	putListings: function(model) {
	    var results = model.data
	    if (!results.listings.length) {
		oo('no-listings').text('Nothing found.').show().parent().show()
		return
	    } else {
		oo('no-listings').hide()
		oo('some-listings').text('Latest Listings:').addClass('mt1').show()
	    }
	    oo.util.listing.putFeatured(results)
	    var displays = oo.util.listing.many({
		listings: $(results.listings).filter(function(x) { return !results.listings[x].featured }),
		prototype: oo('new-listings-pod .prototype')
	    })
	    // hide the spans with the avatar names.  these are faded
	    // in and out by the controller on hover
	    $.each(displays, function(i, d) { $('div.pr span.av a span.av', d).hide() })
	    oo.util.listing.put(displays, oo('results-pod'))
	    oo.data.auth()
		.success(function(p) {model.tool.putImages(p.settings) })
	        .error(function() { model.tool.putImages() })
	    $('div.listing-seed td.item-view div:empty').parent().remove()
	    oo('new-listings-pod').slideDown()
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
	},

	'div.pr > span.av a img live:hover' : function(e) {
	    $('a span.av', $(e.target).parents('span')).fadeToggle()
	}
    })
    oo.controller.extend({model: blogModel, view: blogView})
    oo.controller.extend({model: statsModel, view: statsView})
    oo.controller.extend({model: newsModel, view: newsView})
}