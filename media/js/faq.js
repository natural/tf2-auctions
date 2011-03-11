var init = function() {
    oo.config({prefix:'#faq-'})

    var cat = $('.prototype.category-seed'),
        ent = $('.prototype.entry-seed'),

    mktitle = function(t) {
	var c = cat.clone().removeClass('null prototype')
	$('h2', c).text(t)
	return c
    },

    mkentry = function(t, h) {
	var e = ent.clone().removeClass('null prototype')
	$('.title', e).text(t)
	$('.entry', e).html(h)
	return e
    },

    model = oo.model.extend({
	loader: oo.data.loader({prefix: '/api/v1/public/faq'})
    })



    model.init().success(function(groups) {
	var target = oo('content-pod')
	$.each(groups, function(_, grp) {
	    if (grp[1].length) {
		target.append(mktitle(grp[0].name))
		$.each(grp[1], function(_, qa) {
		    target.append(mkentry(qa.title, qa.entry)) 
		})
	    }
	})
	target.fadeIn()
    })
}
