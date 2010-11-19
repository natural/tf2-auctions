var $$ = function(suffix, next) { return $('#backpack-viewer-'+suffix, next) }
var defaultSearch = 'Enter a player name or Steam ID'


var showError = function(request, status, error) {
    siteMessage('Error.  Lame').delay(3000).fadeOut()
}


var showSearch = function(results) {
    new SchemaLoader({
	success: function() {
	    siteMessage().hide()
	    if (results.length == 0) {
		$$('result-none').text('Your search did not match any players.')
	    } else if (results.length == 1) {
		var result = results[0]
		new BackpackLoader({
		    suffix: result.id,
		    success: function(bp) { backpackReady(result.id, result.persona, bp) }
		})
	    } else if (results.length > 1) {
		$$('result-many-label').text('Matched {0} players: '.fs(results.length))
		var chooser = $$('result-many-choose')
		$('option', chooser).remove()
		chooser.append('<option>Select...</option>')
		$.each(results, function(index, result) {
		    chooser.append('<option>{0}</option>'.fs(result.persona))
		    $('option:last', chooser).data('result', result)
		})
                    $$('result-many').fadeIn()
	    }
	}
    })
}


var backpackReady = function(id64, name, backpack) {
    window.location.hash = id64
    if (!backpack.length || backpack[0]==null) {
	$$('backpack-title').html(hiliteSpan('Backpack is Private or Empty')).fadeIn()
	clearBackpack()
	siteMessage().fadeOut()
	return
    }
    siteMessage('Loading backpack...')
    var loadWrapper = function (listings) {
	clearBackpack()
	new BidsLoader({
	    suffix: id64,
	    success: function(bids) {
		$$('backpack-title').html(hiliteSpan('Backpack - {0}'.fs(name)))
		putBackpack(backpack, listings, bids)
	    }
	})
    }
    new ListingsLoader({suffix: id64, success: loadWrapper})
}


var clearBackpack = function() {
    $('.bp-unplaced tbody').remove()
    $('.bp-placed td div').empty()
    $('.bp-placed td').removeClass()
}


var putBackpack = function(backpack, listings, bids) {
    var bpTool = new NewBackpackItemsTool({
	items: backpack,
	listingUids: listingItemsUids(listings),
	bidUids: bidItemsUids(bids),
	slug: 'bv',
	navigator: true,
	toolTips: true,
	select: true,
	selectMulti: true,
	outlineHover: true
    })

    new AuthProfileLoader({
	suffix: '?settings=1&complete=1',
	success: function(profile) {
	    bpTool.init(profile.settings)
	},
	error: function(request, status, error) {
	    bpTool.init(null)
	}
    })

    siteMessage().fadeOut()
    if (!putBackpack.initOnce) {
	$$('backpack-inner').fadeIn()
	putBackpack.initOnce = true
    } else {
	bpTool.navigator.reinit()
    }
}


var showSelection = function(event) {
    try {
	var data = $('option:selected', event.target).data('result')
    } catch (e) { return }
    if (data.id_type != 'id64') { return }

    var id64 = data.id
    siteMessage('Loading backpack...')
    new BackpackLoader({
	suffix: id64,
	success: function(bp) {
	    backpackReady(id64, data.persona, bp)
	}
    })
}


var PlayerSearchLoader = makeLoader({
    prefix: 'http://tf2apiproxy.appspot.com/api/v1/search/',
    dataType: 'jsonp',
    name: 'PlayerSearchLoader'
})


var doSearch = function(value) {
    if (value == defaultSearch) { return }
    siteMessage('Searching...')
    $$('search-controls').animate({'margin-left':0, 'width':'100%'})
    $$('result-none').text('')
    $$('result-one').html('')
    $$('result-many').fadeOut()

    if (value.match(/\d{17}/)) {
	new StatusLoader({
	    suffix: value,
	    success: function(status) {
		showSearch([{id:value, persona:status.name}])
	    }
	})
    } else {
	new PlayerSearchLoader({
	    suffix: value,
	    success: showSearch,
	    error: showError,
	})
    }
}


$(function() {
    new AuthProfileLoader({
	success: function(profile) {
	    new ProfileTool(profile).defaultUserAuthOkay()
	},
	error: function(request, error, status) {
	    new ProfileTool().defaultUserAuthError(request, error, status)
	}
    })

    $$('result-many-choose').change(showSelection)
    $$('search-value').val(defaultSearch).select()
    $$('search').click(function() {
	doSearch( $$('search-value').val() )
    })
    $$('search-value').keypress(function(e) {
	var code = (e.keyCode ? e.keyCode : e.which)
	if (code == 13) {
	    doSearch ( $$('search-value').val() )
	    return
	}
    })

    if (getHash()) { doSearch(getHash()) }
})
