version := $(shell python -c "import yaml;d=yaml.load(open('app.yaml')); print d['version']")
dist_dir := dist-$(version)
dist_css := $(wildcard media/css/*.css)
dist_js  := $(wildcard media/js/*.js)


.PHONY:	all dist bump_version $(dist_css) $(dist_js)


all:
	@echo "try make bump_version && make dist"


dist: $(dist_css) $(dist_js)
	@mkdir -p $(dist_dir)
	@cp *.yaml $(dist_dir)
	@cp -r ext $(dist_dir)
	@cp -r htviews $(dist_dir)
	@mkdir -p $(dist_dir)/media/img
	@cp -r media/img/* $(dist_dir)/media/img
	@mkdir -p $(dist_dir)/media/ttf
	@cp -r media/ttf/* $(dist_dir)/media/ttf
	@cp -r tf2bay $(dist_dir)


$(dist_css):
	@mkdir -p $(dist_dir)/media/css
	@yuicompressor --type css $@ -o $(dist_dir)/media/css/$(notdir $@)


$(dist_js):
	@mkdir -p $(dist_dir)/media/js
	@yuicompressor --type js $@ -o $(dist_dir)/media/js/$(notdir $@)


bump_version:
	@python -c "import yaml; d=yaml.load(open('app.yaml')); print 'Old Version', d['version']"
	@python -c "import yaml; d=yaml.load(open('app.yaml')); d['version']+=1; fh = open('app.yaml', 'w'); yaml.dump(d, fh, width=50, indent=4, default_flow_style=False); fh.flush(); fh.close()"
	@python -c "import yaml; d=yaml.load(open('app.yaml')); print 'New Version', d['version']"
