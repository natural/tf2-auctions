#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2bay.lib import View


class NotFound(View):
    template_name = '404.pt'

    def get(self):
	self.error(404)
	self.render()


main = View.make_main(NotFound)


if __name__ == '__main__':
    main()
