version := $(shell python -c "import yaml;d=yaml.load(open('app.yaml')); print d['version']")
dist_dir := dist-$(version)
dist_css := $(wildcard media/css/*.css)
dist_js  := $(wildcard media/js/*.js)
dist_subscribe_js  := $(wildcard media/js/subscribe/*.js)

.PHONY:	all dist bump_version $(dist_css) $(dist_js) $(dist_subscribe_js) prod_js


all:
	@echo "try make bump_version && make dist"


dist: $(dist_css) $(dist_js) $(dist_subscribe_js) prod_js
	@mkdir -p $(dist_dir)
	@cp *.yaml $(dist_dir)
	@cp admin_key.nodist $(dist_dir)
	@cp -r ext $(dist_dir)
	@cp -r aetycoon $(dist_dir)
	@cp -r chameleon $(dist_dir)
	@cp -r simplejson $(dist_dir)
	@cp -r htviews $(dist_dir)
	@mkdir -p $(dist_dir)/media/img
	@cp media/*.txt $(dist_dir)/media/
	@cp media/*.gz $(dist_dir)/media/
	@cp -r media/img/* $(dist_dir)/media/img
	@mkdir -p $(dist_dir)/media/ttf
	@cp -r media/ttf/* $(dist_dir)/media/ttf
	@cp -r tf2auctions $(dist_dir)

push:
	@cd $(dist_dir) && appcfg.py update .
	appcfg.py set_default_version .
	git commit -a -m "make dist."
	git tag v$(shell python -c "import yaml;d=yaml.load(open('app.yaml')); print d['version']")


$(dist_css):
	@mkdir -p $(dist_dir)/media/css
	@yuicompressor --type css $@ -o $(dist_dir)/media/css/$(notdir $@)


$(dist_js):
	@mkdir -p $(dist_dir)/media/js
	@yuicompressor --type js $@ -o $(dist_dir)/media/js/$(notdir $@)

$(dist_subscribe_js):
	@mkdir -p $(dist_dir)/media/js/subscribe
	@yuicompressor --type js $@ -o $(dist_dir)/media/js/subscribe/$(notdir $@)

prod_js:
	cd $(dist_dir)/media/js && cat ga.js jquery.json-2.2.js dateformat.js core.js > core.min.js

bump_version:
	@python -c "import yaml; d=yaml.load(open('app.yaml')); print 'Old Version', d['version']"
	@python -c "import yaml; d=yaml.load(open('app.yaml')); d['version']+=1; fh = open('app.yaml', 'w'); yaml.dump(d, fh, width=50, indent=4, default_flow_style=False); fh.flush(); fh.close()"
	@python -c "import yaml; d=yaml.load(open('app.yaml')); print 'New Version', d['version']"
