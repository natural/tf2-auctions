(function() {
    var model = oo.model.schema.extend({
	init: function(view) {
	    var self = this
	    return oo.model.schema.init.apply(self, arguments)
	        .success(function() { view.join(self) })
	},

        attrs: function() {
	    var attrs = this.tool.schema.attributes.attribute
	    attrs.sort(function(a, b) {
	        return a.defindex - b.defindex
            })
            return attrs
	}

    }),

    protoRow = function() {
	return '<tr><td>{0}</td><td>{1}</td><td class="{2}">{3}</td> <td>{4}</td> <td>{5}</td> <td>{6}</td> <td>{7}</td> <td class="{8}">{9}</td> </tr>'
    },


    view = oo.view.schema.extend({
	join: function(model) {
	    var self = this
	    self.model = model
	    $.each(model.attrs(), function(idx, attr) {
		var clone = protoRow()
		clone = clone.fs(attr.defindex,
				 attr.name,
				 attr.effect_type,
				 attr.effect_type,
				 attr.min_value,
				 attr.max_value,
				 attr.attribute_class,
				 (attr.description_format || '').replace('value_is_', ''),
				 attr.effect_type,
				 attr.description_string || ''

				 )
		$('#all-attrs-pod .aa').append(clone)
	    })
	    self.putImages()
	    self.message().fadeOut()
	    $('#all-attrs-pod').fadeIn()
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

GMODEL = model
})()
