var $$ = make$$('#front-')


var NewsModel = Model.make({name:'NewsModel'}, {
    prefix: 'http://tf2apiproxy.appspot.com/api/v1/news',
    dataType: 'jsonp',
    jsonpCallback: 'tf2auctionsNewsLoader',
    name: 'NewsLoader',
})



var NewsView = View.extend({
    cloneClass: 'news-seed',

    join: function(model) {
	var news = model.results
	if (!news || !news[0]) { return }
	$.each(news, function(idx, newsentry) {
            var clone = NewsView.proto()
	    if (newsentry.author) {
		$('.news-author-seed', clone).html('({0})'.fs(newsentry.author))
            }
            $('.news-title-seed', clone).text(newsentry.title)
            $('.news-title-seed', clone).parents('a').attr('href', newsentry.url)
            if (newsentry.url) {
                $('.news-contents-seed a', clone).attr('href', newsentry.url).text('more...')
	    }
	    $('.news-contents-seed', clone).prepend(newsentry.contents)
	    $$('news').append(clone)
       })
       $$('news').slideDown()
    }

})


var StatsModel = Model.make(
    {name:'StatsModel'}, {prefix: '/api/v1/public/stats', name: 'StatsLoader'}
)

var StatsView = View.extend({
    join: function(model) {
	var stats = model.results
	$.each(keys(stats), function(idx, key) {
	    $$(key.replace('_', '-')).text(stats[key])
	})
	$$('stats').slideDown()
    }
})


var BlogModel = Model.make(
    {name: 'BlogModel'}, {prefix: '/api/v1/public/blog-entries', name: 'BlogLoader'}
)


var BlogView = View.extend({
    cloneClass: 'blog-seed',

    join: function(model) {
	var entries = model.results
	$.each(entries, function(idx, blogpost) {
	    var clone = BlogView.proto()
	    $('.blog-title-seed', clone).text(blogpost.title)
	    if (blogpost.intro != '<p></p>') {
		$('.blog-intro-seed', clone).html(blogpost.intro)
	    } else {
		$('.blog-intro-seed', clone).remove()
	    }
	    $('.blog-encoded-seed', clone).html(blogpost.entry)
	    $$('blog').append(clone)
	})
        if (entries.length) { $$('blog').slideDown() }
    }
})


var SearchModel = Model.make({
    name: 'SearchModel',
    loader: SearchLoader,
    loaderSuffix: '?limit=5',

    init: function(view, config) {
	var self = this
	// request the schema
	this.requests.push(function() {
            new SchemaLoader({
                success: function(s) { self.tool = new SchemaTool(s) }
            })
        })
	Model.init.apply(this, [view, config])
    }
})


var SearchView = SearchBaseView.extend({
    authSuccess: function(profile) {
	$$('auth').slideDown()
	$$('auth > h1').text('Welcome, {0}!'.fs(profile.personaname))
	this.profile = profile
    },

    authError: function() {
	$$('no-auth').slideDown()
	this.profile = {}
    },

    join: function(model) {
	var results = model.results
	if (!results.listings.length) {
	    $$('no-listings').text('Nothing found.').show()
	    $$('some-listings').hide()
	    return
	} else {
	    $$('no-listings').hide()
	    $$('some-listings').text('Latest Listings:').show()
	}
	this.joinListings({
	    listings: results.listings,
	    prototype: $$('new-listings-pod .prototype'),
	    target: $$('results-pod'),
	    prefix: '.new-listings'
	})
	if (results.featured && results.featured.length) {
	    this.initFeatured(results.featured)
	}
	this.model.tool.putImages(this.profile.settings)
	$('div.listing-seed td.item-view div:empty').parent().remove()
	$$('new-listings-pod').slideDown()
    },

    putListing: function(listing, clone, target) {
	if (listing.description) {
	    $('.listing-description', clone).text(listing.description)
	} else {
	    $('.listing-description-label', clone).empty()
	    $('.listing-description', clone).empty()
	}
	$('.listing-owner', clone).text(listing.owner.personaname)
	$('.listing-owner', clone).parent()
	    .attr('href', profileUtil.defaultUrl(listing.owner))
	$('.listing-avatar', clone)
	    .attr('src', listing.owner.avatar)
	$('.listing-avatar', clone).parent()
	    .attr('href', profileUtil.defaultUrl(listing.owner))
	new StatusLoader({
	    suffix: listing.owner.id64,
	    success: function(status) {
	        $('.listing-avatar', clone).addClass('profile-status ' + status.online_state)
	    }
        })
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


// this one first because it has the most detailed auth requirements;
// the loaders don't discriminate between urls, so we work around that
// (for now) by creating the most specific one first.
var SearchController = Controller.extend({
    config: {auth: {required: false, settings: true}},
    model: SearchModel,
    view: SearchView,

    '#featured-listings div.listing-seed div.navs span.nav.next live:click' : function(e) {
	e.controller.view.navFeatured(1)
    },

    '#featured-listings div.listing-seed div.navs span.nav.prev live:click' : function(e) {
	e.controller.view.navFeatured(-1)
    }
})


var BlogController = Controller.extend({model: BlogModel, view: BlogView})
var StatsController = Controller.extend({model: StatsModel, view: StatsView})
var NewsController = Controller.extend({model: NewsModel, view: NewsView})
