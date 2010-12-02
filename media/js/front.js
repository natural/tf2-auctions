var $$ = make$$('#front-')


var NewsView = View.extend({
    cloneClass: 'news-seed',
    model: Model.extend({
	loader: makeLoader({
	    prefix: 'http://tf2apiproxy.appspot.com/api/v1/news',
	    dataType: 'jsonp',
	    jsonpCallback: 'tf2auctionsNewsLoader',
	    name: 'NewsLoader',
            debug: true
	})
    }),

    join: function(news) {
	var self = this
	if (news && news[0]) {
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
	        $$('news').append(clone)
             })
	    $$('news').slideDown()
	}
    }

})


var StatsView = View.extend({
    model: Model.extend({
	loader: makeLoader({
	    prefix: '/api/v1/public/stats',
	    name: 'StatsLoader'
	})
    }),

    join: function(stats) {
	$.each(keys(stats), function(idx, key) {
	    $$(key.replace('_', '-')).text(stats[key])
	})
	$$('stats').slideDown()
    }
})


var BlogView = View.extend({
    cloneClass: 'blog-seed',
    model: Model.extend({
	loader: makeLoader({
	    prefix: '/api/v1/public/blog-entries',
	    name: 'BlogLoader'
	})
    }),

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


var FrontView = SchemaView.extend({
    authLoader: true,
    authSuffix: '?settings=1',
    model: Model.extend({
	loader: SearchLoader,
	loaderSuffix: '?limit=5'
    }),

    authSuccess: function(profile) {
	$$('auth').slideDown()
	$$('auth > h1').text('Welcome, {0}!'.fs(profile.personaname))
	this.authDone(profile.settings)
    },

    authError: function() {
	$$('no-auth').slideDown()
	this.authDone({})
    },

    authDone: function(settings) {
	new SchemaLoader({
	    success: function(schema) {
		new SchemaTool(schema).putImages(settings)
		$('div.listing-seed td.item-view div:empty').parent().remove()
		$$('new-listings-pod').slideDown()
	    }
	})
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
    }
})
