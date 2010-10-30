#!/usr/bin/env python
# -*- coding: utf-8 -*-
from tf2bay.lib import template_main


main = template_main('login.pt', related_js='login.js')


if __name__ == '__main__':
    main()
