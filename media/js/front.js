var $$ = make$$('#front-')


var NewsModel = Model.make({name:'NewsModel'}, {
    prefix: 'http://tf2apiproxy.appspot.com/api/v1/news',
    dataType: 'jsonp',
    jsonpCallback: 'tf2auctionsNewsLoader',
    name: 'NewsLoader',
})



var NewsView = View.extend({
    cloneClass: 'news-seed',

    join: function(news) {
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
    join: function(stats) {
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

    join: function(entries) {
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


var SearchView = SchemaView.extend({
    authSuccess: function(profile) {
	$$('auth').slideDown()
	$$('auth > h1').text('Welcome, {0}!'.fs(profile.personaname))
	this.profile = profile
    },

    authError: function() {
	$$('no-auth').slideDown()
	this.profile = {}
    },

    join: function(results) {
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
	this.model.tool.putImages(this.profile.settings)
	$('div.listing-seed td.item-view div:empty').parent().remove()
	$$('new-listings-pod').slideDown()
    }
})


// this one first because it has the most detailed auth requirements;
// the loaders don't discriminate between urls, so we work around that
// (for now) by creating the most specific one first.
var SearchController = Controller.extend({
    config: {auth: {required: false, settings: true}},
    model: SearchModel,
    view: SearchView
})


var BlogController = Controller.extend({model: BlogModel, view: BlogView})
var StatsController = Controller.extend({model: StatsModel, view: StatsView})
var NewsController = Controller.extend({model: NewsModel, view: NewsView})
