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

    view = oo.view.schema.extend({
        protoRow: '<tbody><tr><td>{0}</td><td>{1}</td><td class="{2}">{3}</td> <td>{4}</td> <td>{5}</td> <td>{6}</td> <td>{7}</td> <td class="{8}">{9}</td> </tr></tbody>',

        selectedEffect: function() {
	    return $('#filter-effect :selected').val() || null
	},

        selectedType: function() {
	    return $('#filter-type :selected').val() || null
	},

	filterRows: function(effect, type) {
	    var f = '.aa tbody', tbl = $('.aw') // table wrapper
	    tbl.fadeOut(function() {
	        $('.aa tbody').hide()
	        if (effect) {f = f + '.' + effect }
	        if (type) {f = f + '.' + type }
	        $(f).show()
	        tbl.fadeIn()
	    })
	},

	join: function(model) {
	    var self = this, types = {}, effects = {}
	    self.model = model
	    $.each(model.attrs(), function(idx, attr) {
		var clone = self.protoRow.fs(
                    attr.defindex,
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
		$('#all-attrs-pod .aa tbody:last').addClass(attr.effect_type + ' ' + attr.description_format||'empty')
		effects[attr.effect_type] = 1
		types[attr.description_format] = 1
	    })
	    $.each(oo.keys(effects), function(idx, name) {
                $('#filter-effect').append('<option value="{0}">{1}</option>'.fs(name, name))
	    })
	    $.each(oo.keys(types), function(idx, name) {
		if (name) {
                    $('#filter-type').append('<option value="{0}">{1}</option>'.fs(name, name.replace('value_is_', '')))
                }
	    })
	    self.message().fadeOut()
	    $('#all-attrs-pod, #filter-controls').fadeIn()
	}

    })


    oo.controller.extend({
	model: model,
	view: view,

        '#filter-effect change': function(e) {
	    var v = e.controller.view
	    v.filterRows(v.selectedEffect(), v.selectedType())
	},

        '#filter-type change': function(e) {
	    var v = e.controller.view
	    v.filterRows(v.selectedEffect(), v.selectedType())
	},

	'ready' : function() {
	    oo.view.message('Loading...')
	    oo.model.auth.init()
	}
    })

GMODEL = model
})()
