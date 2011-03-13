var init = function() {

oo.config({prefix: '#support-', auth: {settings: 0, complete: 0}})


var FaqModel = oo.model.extend({
    loader: oo.data.loader({prefix: '/api/v1/public/faq'}),
    init: oo.model.initJoin
}),


FaqView = oo.view.extend({
    join: function(model) {
	var cat = $('#faq .prototype.category-seed'),
            ent = $('#faq .prototype.entry-seed'),
	    target = $('#faq-content'),

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
	}

	$.each(model.data, function(_, grp) {
	    if (grp[1].length) {
		target.append(mktitle(grp[0].name))
		$.each(grp[1], function(_, qa) {
		    target.append(mkentry(qa.title, qa.entry))
		})
	    }
	})
	target.fadeIn()
    }
}),


ContactModel = oo.model.auth.extend({
    init: function(view) {
	var self = this
	self.view = view
	return oo.model.auth.init.apply(self, arguments)
	    .complete(function(p) { self.view.join(self) })
    },

    submit: function (data) {
	return $.ajax({
	    url: '/api/v1/public/send-feedback',
	    type: 'POST',
	    dataType:'json',
	    data: $.toJSON(feedback),
	    success: done,
	    error: done
        })
    }
}),


ContactView = oo.view.extend({
    join: function(model) {
	oo.error('contact view model:', model)
	if (model.data) {
	    var $$ = oo.prefix$('#contact-')
	    $$('id64').val(model.data.steamid)
	    $$('name').val(model.data.personaname)
	}
    },

    values: function() {
	var $$ = oo.prefix$('#contact-')
	return {
	    email: $$('email').val(),
	    id64: $$('id64').val(),
	    name: $$('name').val(),
	    msg: $$('message').val().slice(0, 2048)
	}
    },

    hideForm: function() { $('#contact-form').slideUp() },
    showComplete: function() { $('#contact-complete').slideDown() }
}),


SupportModel = oo.model.auth.extend({}),


SupportView = oo.view.extend({}),


SubControllers = {
    contact: {model: ContactModel, view: ContactView},
    issues: {},
    faq: {model: FaqModel, view: FaqView},
    changelog: {},
    todo: {}
},


SupportController = oo.controller.extend({
    config: {},
    model:SupportModel,
    view:SupportView,

    show: function(event, ui) {
	var n = ui.tab.hash.slice(1),
	    c = SubControllers[n]
	oo.info('show', n, c)
	if (c && c.model) {
	    if (!c.config) {
		c.config = this.config
		$('#{0} h2.loading'.fs(n)).fadeIn()
		oo.controller.extend(c).init().complete(function(m) {
		    $('#{0} h2.loading'.fs(n)).slideUp(function() {
			$('#{0} h1 span.title'.fs(n)).parent().fadeIn('slow', function() {
			    $('#{0} div:first'.fs(n)).fadeIn('slow')
			})
		    })
		})
	    }
	}
    },

    'ready' : function(e) {
	var self = this
	$('#tabs').tabs({
	    fx: {opacity: 'toggle', duration: 'fast'},
	    // apply the hash in 'select', not 'show', to prevent
	    // scrolling to the div
	    select: function(e, ui) { window.location.hash = ui.tab.hash },
	    show: function() {self.show.apply(self, arguments) }
	})
	// force scroll on document load in case there is a hash
	document.body.scrollTop = 0
    }

})

}
