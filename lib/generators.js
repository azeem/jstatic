module.exports = function(jstatic) {
    var path = require("path");
    var jsYaml = require("js-yaml");
    var marked = require("marked");
    var swig = require("swig");
    var grunt = require("grunt");
    var _ = grunt.util._;

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
                entry.content = entry.content.substring(results[0].length);
            }
            return entry;
        };
    });

    jstatic.registerGenerator("permalink", function(iter, params) {
        params = _.defaults(params, {
            linkPrefix: "/",
            linkPathStrip: 1
        });
        return function() {
            var entry = iter();
            if(_.isUndefined(entry)) return;

            var destPathSplits = entry.destPath.split(path.sep);
            var sliceEnd = destPathSplits.length;
            if(entry.basename === "index") {
                sliceEnd--;
            }
            entry.permalink = params.linkPrefix + destPathSplits.slice(params.linkPathStrip, sliceEnd).join("/");
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
            layout = swig.compileFile(params.layout, _.extend({filename: params.layout}, params));
        }

        return function() {
            var entry = iter();
            if(_.isUndefined(entry)) return;

            var context = _.extend({}, entry, params.depends, params.data);
            var template = swig.compile(entry.content, _.extend({filename: entry.srcPath}, params));
            var result = template(context);

            if(layout) {
                var newContext = _.extend({body: result}, context);
                result = layout(newContext);
            }
            
            entry.content = result;
            return entry;
        };
    });
};
