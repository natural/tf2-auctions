var $$ = function(suffix, next) { return $('#all-items-'+suffix, next) }


var userAuthOkay = function(profile) {
    new ProfileTool(profile).defaultUserAuthOkay()
}


var userAuthError = function(request, status, error) {
    new ProfileTool().defaultUserAuthError(request, status, error)
}

var putItems = function(target, items) {
    var col = 0
    $.each(items, function(idx, item) {
	if (!(col % 10)) { target.append('<tr></tr>') }
	col += 1
	$('tr:last', target).append(makeCell($.toJSON({defindex:item.defindex, quality:6})))
    })
    if ( col % 10 ) {
        var pad = new Array( 1 + (10 - col % 10)   ).join('<td><div></div></td>')
        $('tr:last', target).append(pad)
    }

}


var showSchema = function(schema) {
    var st = new SchemaTool(schema)
    var tt = new TooltipView(st)
    var groups = [['Weapons', st.weapons], ['Hats', st.hats],
		  ['Tools', st.tools], ['Crates', st.crates],
		  ['Tokens', st.tokens], ['Metal', st.metal],
		  ['Actions', st.actions], ['Misc', st.misc],
		  ['All', st.itemDefs]]
    $.each(groups, function(idx, group) {
	var title = group[0], item_func = group[1]
	var clone = $('.group-proto-seed').clone()
	clone.removeClass('prototype null group-proto-seed')
	putItems($('.group-items-seed', clone), item_func())
	$('.group-title-seed', clone).text(title)
	$$('group-target-pod').append(clone)
    })
    st.setImages()
    $('.backpack td').hover(tt.show, tt.hide)
}


$(document).ready(function() {
    new SchemaLoader({success: showSchema})
    new AuthProfileLoader({success: userAuthOkay, error: userAuthError})
})
