var PlayerSearchLoader = makeLoader({
    prefix: 'http://tf2apiproxy.appspot.com/api/v1/search/',
    dataType: 'jsonp',
    name: 'PlayerSearchLoader'
})


var BackpackModel = SchemaModel.extend({
    name: 'BackpackModel',

    findId: function(options) {
        new StatusLoader({
            suffix: options.id,
            error: options.error,
            success: function(status) {
	        options.success([{id: options.id, persona: status.name}])
	    }
        })
    },

    findNames: function(options) {
	new PlayerSearchLoader({
            suffix: options.name, success: options.success, error: options.error
        })
    }
})


var BackpackView = SchemaView.extend({
    showSelection: function(event) {
	var self = BackpackView
	try {
	    var data = $('option:selected', event.target).data('result')
	} catch (e) { return }
	if (data.id_type != 'id64') { return }
	self.message('Loading backpack...')
	new BackpackLoader({
	    suffix: data.id,
	    success: function(bp) { self.ready(data.id, data.persona, bp) }
        })
    },

    searchText: function(v) {
        return $('#backpack-viewer-search-value').val(v)
    },

    showError: function(request, status, error) {
	var self = BackpackView
	self.reset()
        self.message('Error.  Lame').delay(3000).fadeOut()
    },

    showSearch: function(results) {
	var self = BackpackView
	self.reset()
        var ready = function() {
            self.message().hide()
            if (results.length == 0) {
		$('#backpack-viewer-result-none')
		    .text('Your search did not match any players.')
            } else if (results.length == 1) {
		var result = results[0]
		new BackpackLoader({
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
	new SchemaLoader({success: ready})
    },

    ready: function(id64, name, backpack) {
	var self = BackpackView
        window.location.hash = id64
        if (!backpack.length || backpack[0]==null) {
	    $('#backpack-viewer-backpack-title')
		.html(self.hiliteSpan('Backpack is Private or Empty'))
		.fadeIn()
            self.clear()
	    self.message().fadeOut()
	    return
        }
        var ready = function (listings) {
            self.clear()
	    new BidsLoader({
	        suffix: id64,
	        success: function(bids) {
		    $('#backpack-viewer-backpack-title')
			.html(self.hiliteSpan('Backpack - {0}'.fs(name)))
		    self.put(backpack, listings, bids)
	        }
	    })
        }
        self.message('Loading backpack...')
        new ListingsLoader({suffix: id64, success: ready})
    },

    clear: function() {
        $('.bp-unplaced tbody').remove()
        $('.bp-placed td div').empty()
        $('.bp-placed td').removeClass()
    },

    reset: function() {
	$('#backpack-viewer-search-controls')
	    .animate({'margin-left':0, 'width':'100%'})
	$('#backpack-viewer-result-none').text('')
	$('#backpack-viewer-result-one').html('')
	$('#backpack-viewer-result-many').fadeOut()
    },

    put: function(backpack, listings, bids) {
	var self = BackpackView,
            bpTool = new BackpackItemsTool({
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
	    success: function(profile) { bpTool.init(profile.settings) },
	    error: function(request, status, error) { bpTool.init(null) }
        })
        self.message().fadeOut()
        if (!self.put.initOnce) {
	    $('#backpack-viewer-backpack-inner').fadeIn()
	    self.put.initOnce = true
        } else {
	    bpTool.navigator.reinit()
        }
    }
})


var BackpackController = Controller.extend({
    model: BackpackModel,
    view: BackpackView,
    defaultSearchText: 'Enter a player name or Steam ID',

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
	var hash = this.hash()
        this.view.searchText(this.defaultSearchText).select()
	if (hash) { this.search(hash) }
    },

    search: function(value) {
        if (value == this.defaultSearchText) { return }
        this.view.message('Searching...')
	var opts = {success: this.view.showSearch, error: this.view.showError}
	if (value.match(/\d{17}/)) {
            var find = this.model.findId
	    opts.id = value
	} else {
	    var find = this.model.findNames
	    opts.name = value
        }
        find(opts)
    }

})
