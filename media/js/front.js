var $$ = function(suffix, next) { return $('#front-'+suffix, next) }


var userAuthOkay = function(profile) {
    new ProfileTool(profile).defaultUserAuthOkay()
    $$('auth').slideDown()
    $$('auth > h1').text('Welcome, {0}!'.fs(profile.personaname))
}


var userAuthError = function(request, status, error) {
    new ProfileTool().defaultUserAuthError(request, status, error)
    $$('no-auth').slideDown()
}


var statsLoaded = function(stats) {
    $.each(keys(stats), function(idx, key) {
	$$(key.replace('_', '-')).text(stats[key])
    })
    $$('stats').slideDown()
}


var blogLoaded = function(entries) {
    $.each(entries, function(idx, blogpost) {
	var clone = $$('blog div.blog-seed').clone()
	clone.removeClass('blog-seed null prototype')
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


var BlogLoader = makeLoader({
    prefix: '/api/v1/public/blog-entries',
    name: 'BlogLoader'})


var showListing = function(listing, clone) {
    clone.removeClass('null prototype')
    if (listing.description) {
	$('.listing-description', clone).text(listing.description)
    } else {
	$('.listing-description-label', clone).empty()
	$('.listing-description', clone).empty()
    }
    $('.listing-owner', clone).text(listing.owner.personaname)
    $('.listing-owner', clone).parent().attr('href', '/profile/'+listing.owner.id64)

    $('.listing-avatar', clone).attr('src', listing.owner.avatar)
    $('.listing-avatar', clone).parent().attr('href', '/profile/'+listing.owner.id64)

    $('.bid-count-seed', clone).text(listing.bid_count || '0') // bid_count because bids aren't fetched.
    var next = 0
    $.each(listing.items, function(index, item) {
	$( $('.item-view div', clone)[next]).append( $.toJSON(item) )
	next += 1
    })
    if (listing.min_bid.length) {
	var next = 0
	$.each(listing.min_bid, function(index, defindex) {
            $( $('.new-listings-listing-view-min-bid .item-view div', clone)[next] ).append(
		$.toJSON({defindex:defindex, quality:6})
	    )
	    next += 1
	})
        $('.new-listings-listing-view-min-bid', clone).removeClass('null')
    } else {
        $('.new-listings-listing-view-min-bid', clone).hide()
    }
    $('.new-listings-listing-view-link a', clone)
	.attr('href', '/listing/'+listing.id)
    $('.new-listings-listing-view-link', clone)
	.append('<span class="mono float-right">Expires: {0}</span>'.fs(''+new Date(listing.expires)) )
    $$('results-pod').append(clone)
}




var showListings = function(results) {
    if (!results.listings.length) {
	$$('no-listings').text('Nothing found.').show()
	$$('some-listings').hide()
	return
    } else {
	$$('no-listings').hide()
	$$('some-listings').text('Latest Listings:').show()
    }
    var proto = $$('new-listings-pod .prototype')
    $.each(results.listings, function(idx, listing) {
	showListing(listing, proto.clone().addClass('listing-seed'))
    })
    new AuthProfileLoader({
	success: function(profile) {
	    new SchemaTool().putImages(profile.settings)
	},
	error: function(request, error, status) {
	    new SchemaTool().putImages({})
	},
	suffix: '?settings=1'
    })
    $('div.listing-seed td.item-view div:empty').parent().remove()
    $$('new-listings-pod').slideDown()
}


var newsReady = function(news) {
    $.each(news, function(idx, newsentry) {
	console.log(newsentry)
	var clone = $$('news div.news-seed').clone()
	clone.removeClass('news-seed null prototype')
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
    if (news.length) { $$('news').slideDown() }
}



var schemaReady = function(schema) {
    var st = new SchemaTool(schema)
    var tt = new TooltipView(st)
    var hoverItem = function(e) { tt.show(e); $(this).addClass('outline')  }
    var unhoverItem = function(e) {  tt.hide(e);  $(this).removeClass('outline') }
    $('div.ov td.item-view, #backpack-ac td').live('mouseover', hoverItem)
    $('div.ov td.item-view, #backpack-ac td').live('mouseout', unhoverItem)
    $('.listing-view').live('mouseover', function() { $(this).addClass('listing-hover') })
    $('.listing-view').live('mouseout', function() { $(this).removeClass('listing-hover') })
    new SearchLoader({success:showListings, suffix:'?limit=5'})
}


$(document).ready(function() {
    new AuthProfileLoader({
	success: userAuthOkay,
	error: userAuthError,
	suffix: '?settings=1'
    })
    new StatsLoader({success: statsLoaded})
    new BlogLoader({success: blogLoaded})
    new SchemaLoader({success: schemaReady})
    new NewsLoader({success: newsReady})
})
