#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2bay.lib import View


class BrowseView(View):
    """ Displays a page for browsing listings.

    """
    template_name = 'browse.pt'
    related_css = ('browse.css', )
    related_js = ('browse.js', 'backpack.js')


main = View.make_main(BrowseView)


if __name__ == '__main__':
    main()
