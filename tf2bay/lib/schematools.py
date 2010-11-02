#!/usr/bin/env python
# -*- coding: utf-8 -*-


known_categories = [
    ('hat', 'Hats'),
    ('weapon', 'Weapons'),
    ('tool', 'Tools'),
    ('craft_bar', 'Metal'),
    ('craft_token', 'Tokens'),
    ('supply_crate', 'Crates'),
]


def item_categories(items, schema):
    schema_items = schema['result']['items']['item']
    schema_cats = dict((s['defindex'], s.get('craft_class')) for s in schema_items)
    return set(schema_cats[i['defindex']] for i in items)


def item_type_map(schema):
    return dict((i['defindex'], i['item_type_name']) for i in schema['result']['items']['item'])
