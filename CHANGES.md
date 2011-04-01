v83 - 31 Mar 2011
-----------------

Bug fixes:

  * Fixed layout errors on front page.

Changes:

  * Moved to hosted blog at http://tf2auctions.blogspot.com/


v82 - 30 Mar 2011
-----------------

Changes:

  * Added hook to new listing to place listings in an email queue for
    external processing.


v81 - 28 Mar 2011
-----------------

Bug fixes:

  * Stupid is as stupid does.


v80 - 28 Mar 2011
-----------------

Bug fixes:

  * Removed async script loading in favor of tried and true scripts
    within &lt;head&gt;.



v79 - 24 Mar 2011
-----------------

Changes:

  * Reduced number of data store reads during search
  * Changed login prompt on front page
  * Made local profile links better on backpack viewer

Bug fixes:

  * Fixed item reverification to recognize v2 (full) schema structure.


v78 - 19 Mar 2011
-----------------

Bug fixes:

  * additional datastore index corrections.


v77 - 19 Mar 2011
-----------------

Bug fixes:

  * removed listing index with 7 categories; index was causing
    repeated errors.  updated known category map to exclude crates in
    order to reduce the category count.

v76 - 19 Mar 2011
-----------------

Bug fixes:

  * changed add-bid server code to check for zero items on monitary
    bid update


v75 - 19 Mar 2011
-----------------

Bug fixes:

  * removed unimplemented call to IE rounded corner script


v74 - 18 Mar 2011
-----------------

Bug fixes:

  * added bid count to listing summary displays
  * removed "minimum bid" label for money listings
  * added min-width property to listing summary displays
  * hide previous backpack on private/missing backpack search


Improvements:

  * hide "subscribe now" link for non-auth users
  * added better login prompt for non-auth users
  * reduced space needed for headers above listings on front
  * added inter-site links for backpack viewer
  * clear backpack viewer when selection is private
  * increased number of listings displayed on front
  * made prompts on front smaller
  * added consolidated "support center" which contains:
    * contact and feedback form
    * issues list (new)
    * faq
    * change log (new, this file)
    * todo list (new)


Other:

  * logging verbosity decreased in production

