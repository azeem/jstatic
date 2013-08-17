module.exports = (function() {
    var path = require("path");
    var grunt = require("grunt");
    var jsYaml = require("js-yaml");
    var marked = require("marked");
    var _ = grunt.util._;

    var jstatic = {
        _regGenList: {},
        registerGenerator: function(name, gen) {
            this._regGenList[name] = gen;
        },

        getGenerator: function(name) {
            return this._regGenList[name];
        }
    };

    jstatic.registerGenerator("yafm", function(iter, params) {
        var re = /^-{3,}([\w\W]+?)-{3,}/;

        return function() {
            var entry = iter();
            if(_.isUndefined(entry)) return;

            var results = re.exec(entry.content);
            if(results) {
                try {
                    var yaml = jsYaml.load(results[1]);
                    _.extend(entry, yaml);
                } catch(e) {
                    grunt.log.warn("Couldnt parse yaml front matter " + e + "\n" + results[1]);
                }
            }
            return entry;
        };
    });

    jstatic.registerGenerator("summary", function(iter, params) {
        var rHeading = /(^(.+)\n(-|=){3,}$)|(^#+.+$)/mg; //2
        var rLinkImg = /!?\[([^\]]+)\]((\([^\)]+\))|(\[\d+\]))/mg; //1
        var rLinkRef = /^\[\d+\]:.+$/mg;
        
        return function() {
            var entry = iter();
            if(_.isUndefined(entry)) return;

            var summary = entry.content.replace(rHeading, "")    // strip headings
                                       .replace(rLinkImg, "$1")  // replace links with text
                                       .replace(rLinkRef, "")    // strip link refs
                                       .split(/\n{2,}/mg);       // take first paragraph*/

            entry.summary = _.find(summary, function(line) {
                return _.trim(line).length > 0;
            });
            if(entry.link) {
                entry.summary += "<a href='"+context.link+"'> ... read more</a>";
            }
            return entry;
        };
    });

    jstatic.registerGenerator("markdown", function(iter, params) {
        return function() {
            var entry = iter();
            if(_.isUndefined(entry)) return;

            entry.content = marked(entry.content);
            return entry;
        };
    });

    swig.setFilter("jsonStringify", function(arg) {
        return JSON.stringify(arg);
    });
    swig.setFilter("head", function(arr, count) {
        return _.first(arr, count);
    });
    swig.setFilter("tail", function(arr, count) {
        return _.last(arr, count);
    });
    swig.setFilter("sortBy", function(arr, property) {
        return _.sortBy(arr, property)
    });
    swig.setFilter("having", function(arr, property, value) {
        return _.filter(arr, function(item) {
            if(_.isUndefined(value)) {
                return !_.isUndefined(item[property]);
            } else {
                return item[property] == value;
            }
        });
    });

    jstatic.registerGenerator("swig", function(iter, params) {
        var layout;
        if(params.layout) {
            layout = swig.compileFile(params.layout);
        }

        return function() {
            var entry = iter();
            if(_.isUndefined(entry)) return;

            var template = swig.compile(fileContent);
            var result = template(entry);

            if(layout) {
                var newContext = _.extend({}, entry, {
                    body: result
                });
                layout.render(newContext);
            }
            
            entry.content = result;
            return entry;
        };
    });

    var Flow = function(src, dest, options, parent) {
        this.name = options.name;
        this.src = src;
        this.dest = dest;
        this.outExt = options.outExt || ".html";

        var generators = options.generators || ["yafm", "swig"];
        this.generators = _.map(generators, function(declr) {
            if(_.isString(declr)) {
                return { type: declr };
            } else {
                return declr;
            }
        });

        this.parent = parent;
        this.entries = [];
        this.done = false;
    }
    _.extend(Flow.prototype, {
        execute: function() {
            var src = _.filter(this.src.slice(0), function(filePath) {
                if(!grunt.file.exists(filePath)) {
                    grunt.log.warn("Source file " + filePath + " not found");
                    return false;
                }
                return true;
            });

            var fileIter = function() {
                var filePath = src.shift();
                if(_.isUndefined(filePath)) {
                    return;
                }
                var ext = path.extname(filePath);
                var basename = path.basename(filePath, ext);
                var destPath = path.join(entry.dest, basename + entry.fileOptions.outExt);
                var fileContent = grunt.file.read(filePath);

                return {
                    srcPath: filePath,
                    destPath: destPath,
                    ext: ext,
                    basename: basename,
                    published: true,
                    content: fileContent
                };
            };

            var finalIter = _.reduce(this.generators, function(iter, genDeclr) {
                var generator = jstatic.getGenerator(genDeclr.type);
                if(_.isUndefined(generators)) {
                    grunt.log.error("Unknown generator '"+generator+"' in flow '"+this.name);
                }
                var params = _.extend({}, parent.options[genDeclr.type] || {}, genDeclr);
                return generator(iter, params);
            });

            var entry;
            while(entry = finalIter()) {
                this.entries.push(entry);
            }

            this.done = true;
        },
    });

})();
