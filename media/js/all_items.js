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
    authLoader: true,
    authSuffix: '',
    cloneClass: 'group-proto-seed',
    slug: '#all-items-',
    model: PageModel,

    join: function() {
	$.each(this.model.groups(), function(idx, group) {
	    var clone = PageView.proto()
	    PageView.putItems($('.group-items-seed', clone), group[1]())
	    $('.group-title-seed', clone).text(group[0])
	    PageView.$$('group-target-pod').append(clone)
	})
        this.putImages()
    },
})
