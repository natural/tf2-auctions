#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2bay.lib import View


class NotFound(View):
    """ Final catchall handler configured in app.yaml.  Sends 404 and
        a nice error page.
    """
    template_name = '404.pt'

    def get(self):
	self.error(404)
	self.render()


main = View.make_main(NotFound)


if __name__ == '__main__':
    main()
