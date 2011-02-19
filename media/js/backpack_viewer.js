var playerSearch = function(o) {
    return new oo.data.loader({
	prefix: 'http://tf2apiproxy.appspot.com/api/v1/search/',
	dataType: 'jsonp',
    })(o)
}


var BackpackModel = oo.model.schema.extend({
    name: 'BackpackModel',

    findId: function(options) {
        oo.data.status({
            error: options.error,
            success: function(status) {
	        options.success([{id: options.id, persona: status.name}])
	    },
            suffix: options.id
        })
    },

    findNames: function(options) {
	playerSearch({
	    error: options.error,
	    success: options.success,
            suffix: options.name
        })
    }
})


var BackpackView = oo.view.schema.extend({
    showSelection: function(event) {
	var self = this
	try {
	    var data = $('option:selected', event.target).data('result')
	} catch (e) {
	    return 
	}
	if (data.id_type != 'id64') {
	    return
	}
	self.message('Loading backpack...')
	oo.data.backpack({
	    success: function(bp) { self.ready(data.id, data.persona, bp) },
	    suffix: data.id
        })
    },

    searchText: function(v) {
	if (v) {
            return $('#backpack-viewer-search-value').val(v)
	} else {
	    return $('#backpack-viewer-search-value').val()
	}
    },

    showError: function(request, status, error) {
	var self = this
	self.reset()
        self.message('Error.  Lame').delay(3000).fadeOut()
    },

    showSearch: function(results) {
	var self = this
	self.reset()
        var ready = function() {
            self.message().hide()
            if (results.length == 0) {
		$('#backpack-viewer-result-none')
		    .text('Your search did not match any players.')
            } else if (results.length == 1) {
		var result = results[0]
		oo.data.backpack({
		    suffix: result.id,
		    success: function(bp) { self.ready(result.id, result.persona, bp) }
		})
	    } else if (results.length > 1) {
		$('#backpack-viewer-result-many-label')
		    .text('Matched {0} players: '.fs(results.length))
		var chooser = $('#backpack-viewer-result-many-choose')
		$('option', chooser).remove()
		chooser.append('<option>Select...</option>')
		$.each(results, function(index, result) {
		    chooser.append('<option>{0}</option>'.fs(result.persona))
		    $('option:last', chooser).data('result', result)
		})
                $('#backpack-viewer-result-many').fadeIn()
	    }
	}
	oo.data.schema({success: ready})
    },

    ready: function(id64, name, backpack) {
	var self = this, items = backpack.result.items.item
        window.location.hash = id64
        if (!items.length || items[0]==null) {
	    $('#backpack-viewer-backpack-title')
		.html(self.hiliteSpan('Backpack is Private or Empty'))
		.fadeIn()
            self.clear()
	    self.message().fadeOut()
	    return
        }
        var ready = function (listings) {
            self.clear()
	    oo.data.bids({
	        suffix: id64,
	        success: function(bids) {
		    $('#backpack-viewer-backpack-title')
			.html(self.hiliteSpan('Backpack - {0}'.fs(name)))
		    self.put(backpack, listings, bids)
	        }
	    })
        }
        self.message('Loading backpack...')
        oo.data.listings({suffix: id64, success: ready})
    },

    clear: function() {
	if (self.bpTool) { self.bpTool.reinit() }
    },

    reset: function() {
	$('#backpack-viewer-search-controls')
	    .animate({'margin-left':0, 'width':'100%'})
	$('#backpack-viewer-result-none').text('')
	$('#backpack-viewer-result-one').html('')
	$('#backpack-viewer-result-many').fadeOut()
    },

    put: function(backpack, listings, bids) {
	var self = this,
            bpTool = oo.backpack.itemTool({
	                 items: backpack.result.items.item,
	                 listingUids: oo.util.itemUids(listings),
                  	 bidUids: oo.util.itemUids(bids),
                         slug: 'bv',
	                 navigator: true,
	                 toolTips: true,
	                 select: true,
	                 selectMulti: true,
	                 outlineHover: true,
		         showAll: true,
		         rowGroups: oo.backpack.pageGroup.full(backpack.result.num_backpack_slots)
            })
        oo.data.auth({
	    suffix: '?settings=1&complete=1',
	    success: function(profile) { bpTool.init(profile.settings) },
	    error: function() { bpTool.init(null) }
        })
        self.message().fadeOut()
        if (!self.put.initOnce) {
	    $('#backpack-viewer-backpack-inner').fadeIn()
	    self.put.initOnce = true
        }
    }
})


var BackpackController = oo.controller.extend({
    model: BackpackModel,
    view: BackpackView,
    config: {auth: {required: false, settings: true, complete: true}},
    defaultSearchText: 'Enter Steam ID, Player Name, or Steam Community URL',

    '#backpack-viewer-search click' : function(e) {
	this.search(this.view.searchText())
    },

    '#backpack-viewer-search-value keypress' : function(e) {
	var code = (e.keyCode ? e.keyCode : e.which)
	if (code == 13) { this.search(this.view.searchText()) }
    },

    '#backpack-viewer-result-many-choose change' : function(e) {
	this.view.showSelection(e)
    },

    'ready' : function() {
        this.view.searchText(this.defaultSearchText).select()
	var hash = this.hash()
	if (hash) { this.search(hash) }
    },

    search: function(value) {
        if (value == this.defaultSearchText) { return }
        this.view.message('Searching...')
	var self = this,
            opts = {
		debug: true,
		success: function() { self.view.showSearch.apply(self.view, arguments) },
	        error: function() { self.view.showError.apply(self.view, arguments) }
	    }
	value = this.reformat(value)
	if (value.match(/\d{17}/)) {
            var find = this.model.findId
	    opts.id = value
	} else {
	    var find = this.model.findNames
	    opts.name = value
        }
        find(opts)
    },

    reformat: function(v) {
	v = v.trim()
	// http://steamcommunity.com/profiles/76561197992805111
	var m = v.match(/\d{17}/)
	if (m) {
	    return m[0]
	}
	// http://steamcommunity.com/id/propeller_headz
	// http://steamcommunity.com/id/propeller_headz/home
	var m = v.match(/steamcommunity.com\/id\/(.+)/)
	if (m) {
	    return m[1].split('/')[0]
	}
        // steam://friends/add/76561198031408075
	var m = v.match(/steam:\/\/friends\/add\/(\d{17})/)
	if (m) {
	    return m[1]
	}
	return v
    }
})


