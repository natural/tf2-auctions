var $$ = function(suffix, next) { return $('#backpack-viewer-'+suffix, next) }
var defaultSearch = 'Enter a player name or Steam ID'


var PlayerSearchLoader = makeLoader({
    prefix: 'http://tf2apiproxy.appspot.com/api/v1/search/',
    dataType: 'jsonp',
})


var showError = function(request, status, error) {
    siteMessage('Error.  Lame').delay(3000).fadeOut()
}

var showSearch = function(results) {
    siteMessage('Done.').delay(2000).fadeOut()
    new SchemaLoader({
	success: function() {
	    if (results.length == 0) {
		$$('result-none').slideDown()
	    } else if (results.length == 1) {
		var result = results[0]
		$$('result-one-name').html(result.persona)
		$$('result-one').slideDown()
		new BackpackLoader({
		    suffix: result.id,
		    success: function(bp) { backpackReady(result.id, bp) }
		})
	    } else if (results.length > 1) {
		var chooser = $$('result-many-choose')
		$('option', chooser).remove()
		chooser.append('<option>Select...</option>')
		$$('result-many-count').text(results.length)
		$.each(results, function(index, result) {
		    chooser.append('<option>{0}</option>'.fs(result.persona))
		    $('option:last', chooser).data('result', result)
		})
		    $$('result-many').slideDown()
	    }
	}
    })
}


var backpackReady = function(id64, backpack) {
    siteMessage('Backpack loaded.').fadeOut()
    new ListingsLoader({
	suffix: id64,
	success: function(listings) {
	    new BidsLoader({
		suffix: id64,
		success: function(bids) {
		    $$('backpack-loading').fadeOut( function () {
			putBackpack(backpack, listings, bids)
		    })
		}
	    })
	}
    })
}


var putBackpack = function(backpack, listings, bids) {
    $("#backpack-backpack-viewer td div").empty()
    $("#backpack-backpack-viewer td").removeClass()

    var schema = new SchemaTool()
    var tipTool = new TooltipView(schema)
    var bpNav = new BackpackNavigator('backpack-viewer')
    var bpTool = new BackpackItemsTool(backpack, listingItemsUids(listings), bidItemsUids(bids), 'backpack-viewer')
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
        $(this).removeClass('outline')
    }
    new AuthProfileLoader({
	suffix: '?settings=1&complete=1',
	success: function(profile) {
	    bpNav.init()
	    bpTool.init(profile.settings)
	},
	error: function(request, status, error) {
	    bpNav.init()
	    bpTool.init()
	}
    })
    $$('backpack-inner td').hover(hoverItem, unhoverItem)
    $$('backpack-inner').fadeIn()
    // stupid tweaks
    $$('backpack-pod')
	.width($$('backpack-pod').width()+32)
    $('#backpack-tools-profile')
	.width($$('backpack-pod tbody:visible').first().width()-12
    )
}



var showSelection = function(event) {
    try {
	var data = $('option:selected', event.target).data('result')
    } catch (e) { return }
    if (data.id_type != 'id64') { return }
    var id64 = data.id
    siteMessage('Loading backpack...')
    $$('backpack-loading').text('Loading...').fadeIn()
    new BackpackLoader({
	suffix: id64,
	success: function(bp) { backpackReady(id64, bp) }
    })
}


var doSearch = function(value) {
    if (value == defaultSearch) { return }
    $$('result-summary > div').slideUp()
    siteMessage('Searching...')
    new PlayerSearchLoader({
	suffix: value,
	success: showSearch,
	error: showError,
    })

}



$(document).ready(function() {
    new AuthProfileLoader({
	success: function(profile) {
	    new ProfileTool(profile).defaultUserAuthOkay()
	},
	error: function(request, error, status) {
	    new ProfileTool().defaultUserAuthError(request, error, status)
	}
    })

    $$('content-pod').fadeIn()
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
})
