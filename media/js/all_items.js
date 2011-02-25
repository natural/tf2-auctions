(function() {
    var model = oo.model.schema.extend({
	init: function(view) {
	    var self = this
	    return oo.model.schema.init.apply(self, arguments)
	        .success(function() { view.join(self) })
	},

	groups: function() {
	    return [
		['Weapons', this.tool.weapons],
		['Hats', this.tool.hats],
		['Tools', this.tool.tools],
		['Crates', this.tool.crates],
		['Tokens', this.tool.tokens],
		['Metal', this.tool.metal],
		['Actions', this.tool.actions],
		['Misc', this.tool.misc],
		['All', this.tool.itemDefs]
	    ]
	}
    }),


    view = oo.view.schema.extend({
	cloneClass: 'group-proto-seed',

	join: function(model) {
	    var self = this
	    self.model = model
	    $.each(model.groups(), function(idx, group) {
		var clone = self.proto()
		self.putItems($('.group-items-seed', clone), group[1]())
		$('.group-title-seed', clone).text(group[0])
		$('#all-items-group-target-pod').append(clone)
	    })
	    self.putImages()
	    self.message().fadeOut()
	}
    })

    oo.controller.extend({
	model: model,
	view: view,
	'ready' : function() {
	    oo.view.message('Loading...')
	    oo.model.auth.init()
	}
    })


})()
