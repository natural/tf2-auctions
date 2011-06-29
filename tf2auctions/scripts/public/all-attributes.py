#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2auctions.lib import View, template_main


main = template_main('all_attrs.pt', related_js=(View.jq_ui, 'all_attrs.js', ), related_css=('all_attrs.css', ))


if __name__ == '__main__':
    main()
