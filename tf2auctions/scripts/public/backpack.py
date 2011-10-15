#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2auctions.lib import View, template_main


main = template_main('backpack_viewer.pt',
                     related_css=(View.jq_ui_css, 'backpack_viewer.css', ),
                     related_js=(View.jq_ui, 'backpack_viewer.js', )
                     )


if __name__ == '__main__':
    main()
