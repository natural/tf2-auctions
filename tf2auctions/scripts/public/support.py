#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2auctions.lib import View, template_main


main = template_main('support.pt',
                     related_js=(View.jq_ui, 'support.js'),
                     related_css='support.css')


if __name__ == '__main__':
    main()
