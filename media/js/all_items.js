var PageModel = SchemaModel.extend({
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
})


var PageView = SchemaView.extend({
    cloneClass: 'group-proto-seed',

    join: function(model) {
	var self = this
	$.each(model.groups(), function(idx, group) {
	    var clone = PageView.proto()
	    self.putItems($('.group-items-seed', clone), group[1]())
	    $('.group-title-seed', clone).text(group[0])
	    $('#all-items-group-target-pod').append(clone)
	})
        self.putImages()
    },
})


var PageController = Controller.extend({model: PageModel, view: PageView})
