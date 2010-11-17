var $$ = function(suffix, next) { return $('#backpack-viewer-'+suffix, next) }
var defaultSearch = 'Enter a player name or Steam ID'


var PlayerSearchLoader = makeLoader({
    prefix: 'http://tf2apiproxy.appspot.com/api/v1/search/',
    dataType: 'jsonp',
    name: 'PlayerSearchLoader'
})


var showError = function(request, status, error) {
    siteMessage('Error.  Lame').delay(3000).fadeOut()
}

var showSearch = function(results) {
    siteMessage('Done.').delay(2000).fadeOut()
    new SchemaLoader({
	success: function() {
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
	        $$('result-many-choose').fadeBack()
	    }
	}
    })
}



var backpackReady = function(id64, name, backpack) {
    window.location.hash = id64
    siteMessage('Backpack loaded.').fadeOut()
    if (!backpack.length || backpack[0]==null) {
	$$('backpack-loading').text('Backpack is Private or Empty').fadeIn()
	clearBackpack()
	return
    }
    var loadWrapper = function (listings) {
	    clearBackpack()
	    new BidsLoader({
		suffix: id64,
		success: function(bids) {
		    $$('backpack-loading').fadeOut( function () {
			$$('backpack-title').html(hiliteSpan('Backpack'))
			putBackpack(backpack, listings, bids)
		    })
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
    var bpNav = new NewBackpackNavigator({slug: 'bv'})
    var bpTool = new NewBackpackItemsTool({
	items: backpack,
	listingUids: listingItemsUids(listings),
	bidUids: bidItemsUids(bids),
	slug: 'bv'
    })

    new AuthProfileLoader({
	suffix: '?settings=1&complete=1',
	success: function(profile) {
	    bpNav.init()
	    bpTool.init(profile.settings)
	},
	error: function(request, status, error) {
	    bpNav.init()
	    bpTool.init(null)
	}
    })
    if (!putBackpack.initOnce) {
	var schema = new SchemaTool()
	var tipTool = new TooltipView(schema)
	var hoverItem = function(e) {
            tipTool.show(e)
            try {
		var data = $('img', this).data('node')
       		if (!data.flag_cannot_trade) {
		    $(this).addClass('outline')
		}
            } catch (e) {}
	}
	var unhoverItem = function(e) {
            tipTool.hide(e)
	}
	$$('backpack-inner td').live('mouseover mouseout', function(e) {
	    if (e.type=='mouseover') { hoverItem(e) }
	    else { unhoverItem(e) }
	})
	$$('backpack-inner').fadeIn()
	// stupid tweaks
	$$('backpack-pod')
	    .width($$('backpack-pod').width()+32)
	$('#backpack-tools-profile')
	    .width($$('backpack-pod tbody:visible').first().width()-12)
	putBackpack.initOnce = true
    } else {
	bpNav.reset()
    }
//    $('#backpack-viewer-backpack-inner').slideDown()
}

var showSelection = function(event) {
    try {
	var data = $('option:selected', event.target).data('result')
    } catch (e) { return }
    if (data.id_type != 'id64') { return }
    var id64 = data.id
    siteMessage('Loading backpack...')
    $$('backpack-title').text('')
    $$('backpack-loading').text('Loading...').fadeIn()

    new BackpackLoader({
	suffix: id64,
	success: function(bp) { backpackReady(id64, data.persona, bp) }
    })
}


var doSearch = function(value) {
    if (value == defaultSearch) { return }
    siteMessage('Searching...')
    $$('search-controls').animate({'margin-left':0, 'width':'100%'})
    $$('result-none').text('')
    $$('result-one').html('')
    $$('result-many-label').text('')
    $$('result-many-choose').fadeAway()
    if (value.match(/\d{17}/)) {
	showSearch([{id:value, persona:''}])
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
    $$('result-many-choose').change(showSelection)
    if ($.param.fragment()) {
	doSearch($.param.fragment())
    }
})