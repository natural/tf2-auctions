#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2auctions.lib import View, template_main


main = template_main('all_items.pt', related_js=(View.jq_ui, 'all_items.js', ))


if __name__ == '__main__':
    main()
