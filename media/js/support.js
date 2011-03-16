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


ChangeLogModel = oo.model.extend({
    init: oo.model.initJoin,
    loader: oo.data.loader({
        prefix: '/api/v1/public/changelog', dataType:'text'
    })
}),


ChangeLogView = oo.view.extend({
    join: function(model) {
	$('#changelog-pod').html( model.data || '<em>Empty!</em>')
	    .parent().fadeIn()
    }
}),


ToDoModel = oo.model.extend({
    init: oo.model.initJoin,
    loader: oo.data.loader({
        prefix: '/api/v1/public/todo', dataType:'text'
    })
}),


ToDoView = oo.view.extend({
    join: function(model) {
	$('#todo-pod').html( model.data || '<em>Empty!</em>')
	    .parent().fadeIn()
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
        if (data.msg.length < 1) { return }
	return $.ajax({
	    url: '/api/v1/public/send-feedback',
	    type: 'POST',
	    dataType:'json',
	    data: $.toJSON(data)
        })
    }
}),


ContactView = oo.view.extend({
    join: function(model) {
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

    done: function() {
       $('#contact-complete').slideDown()
        $('#contact-form').slideUp()
    }
}),

ContactController = {
    model: ContactModel,
    view: ContactView,

    '#contact-form-submit click' : function(e) {
        var c = e.controller
	c.model.submit(c.view.values())
	c.view.done()
    }
},


IssuesModel = oo.model.extend({
    loader: oo.data.loader({prefix: '/api/v1/public/issues'}),

    init: function(view) {
	this.view = view
	return this.loadIssues('open')
    },

    loadIssues: function(type) {
	var self = this, view = self.view
	return self.loader({suffix:'?type={0}'.fs(type)})
	    .success(function(issues) {
                view.putIssues(issues)
                view.showIssues(type)
            })
    }

}),


IssuesView = oo.view.extend({
    seen: {},

    selectedIssueType: function() {
	return $('input[name=issue-type]:checked')[0]
    },

    setDefaultIssueType: function (){
	$('input[name=issue-type]:first').click()
    },

    putIssues: function(list) {
	var self = this,
	    build = function(idx, i) {
	        if (self.seen[i.number]) { return self.seen[i.number] }
		var proto = $('#issues .prototype'),
                    clone = $(proto.clone()
		              .removeClass('prototype')
			      .html().fs(i.number, i.title, i.body, i.votes, i.created_at)
			     )
                clone = clone.wrap('<div />')
		            .addClass('null issue-{0}'.fs(i.state))
		$('#issues-list').append(clone)
		clone.data('issue', i)
		self.seen[i.number] = clone
            }
        $.each(list.closed, build)
        $.each(list.open, build)
    },

    showIssues: function(type) {
	if (type=='open') {
	    $('.issue-open').slideDown()
	    $('.issue-closed').slideUp()
	} else if (type=='closed') {
	    $('.issue-open').slideUp()
	    $('.issue-closed').slideDown()
	} else {
	    $('.issue-open, .issue-closed').slideDown()
	}
    }

}),


IssuesController = {
    model: IssuesModel,
    view: IssuesView,

    init: function() {
	this.view.setDefaultIssueType()
	return oo.controller.init.apply(this, arguments)
    },

    'input[name=issue-type] click' : function(e) {
	var c = e.controller, t = e.target.value, v = c.view
	c.model.loadIssues(t)
    }
},


SupportModel = oo.model.auth.extend({}),


SupportView = oo.view.extend({}),


SubControllers = {
    changelog: {model: ChangeLogModel, view:ChangeLogView},
    contact: ContactController,
    faq: {model: FaqModel, view: FaqView},
    issues: IssuesController,
    todo: {model: ToDoModel, view:ToDoView}
},


SupportController = oo.controller.extend({
    config: {},
    model:SupportModel,
    view:SupportView,

    show: function(event, ui) {
	var n = ui.tab.hash.slice(1),
	    c = SubControllers[n]
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

    '#inner-contact click' : function(e) {
	$('#tabs').tabs("select", 0)
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
