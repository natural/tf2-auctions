#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2auctions.lib import View, template_main


main = template_main('search.pt',
                     related_css=(View.jq_ui_css, ),
                     related_js=(View.jq_ui, 'search.js', )
                     )


if __name__ == '__main__':
    main()
