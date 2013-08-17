module.exports = (function() {
    var path = require("path");
    var grunt = require("grunt");
    var jsYaml = require("js-yaml");
    var marked = require("marked");
    var _ = grunt.util._;

    var jstatic = {
        preprocessors : {},
        formatters : {}
    };

    /**** preprocessors ****/

    /**
     * YAML Front Matter parser
     * takes out yaml front matter if it exists,
     * puts it in the file context and returns the
     * remaining content
     */
    jstatic.preprocessors.yafm = function(options) {
        this.options = options;
    }
    jstatic.preprocessors.yafm.prototype.preprocess = function(content, context, params) {
        var re = /^-{3,}([\w\W]+?)-{3,}/;
        var results = re.exec(content);
        if(!results) {
            return content;
        }

        try {
            var yaml = jsYaml.load(results[1]);
            _.extend(context, yaml);
        } catch(e) {
            grunt.log.warn("Couldnt parse yaml front matter " + e + "\n" + results[1]);
        }
        return content.substring(results[0].length);
    };

    jstatic.preprocessors.summary = function(options) {
        this.options = options;
    };
    jstatic.preprocessors.summary.prototype.preprocess = function(content, context, param) {
        var rHeading = /(^(.+)\n(-|=){3,}$)|(^#+.+$)/mg; //2
        var rLinkImg = /!?\[([^\]]+)\]((\([^\)]+\))|(\[\d+\]))/mg; //1
        var rLinkRef = /^\[\d+\]:.+$/mg;
        
        var summary = content.replace(rHeading, "")    // strip headings
                             .replace(rLinkImg, "$1")  // replace links with text
                             .replace(rLinkRef, "")    // strip link refs
                             .split(/\n{2,}/mg)           // take first paragraph*/

        context.summary = _.find(summary, function(line) {
            return _.trim(line).length > 0;
        });
        context.summary += "<a href='"+context.link+"'> ... read more</a>";

        return content;
    };

    /**** formatters ****/
    var swigFilters = {
        jsonStringify : function(arg) {
            return JSON.stringify(arg);
        },
        head: function(arr, count) {
            return _.first(arr, count);
        },
        tail: function(arr, count) {
            return _.last(arr, count);
        },
        sortBy: function(arr, property) {
            return _.sortBy(arr, property)
        },
        having: function(arr, property, value) {
            return _.filter(arr, function(item) {
                if(_.isUndefined(value)) {
                    return !_.isUndefined(item[property]);
                } else {
                    return item[property] == value;
                }
            });
        }
    };
    jstatic.formatters.swig = function(options) {
        this.options = options;
        this.swig = require("swig");

        this.options.filters = _.extend(this.options.filters || {}, swigFilters);

        this.swig.init(this.options);
    };
    jstatic.formatters.swig.prototype.format = function(fileContent, context, params) {
        var template = this.swig.compile(fileContent);
        var result = template(context);

        var layout = _.isUndefined(params.layout)?this.options.layout:params.layout;

        if(layout) {
            var layoutTemp = this.swig.compileFile(layout);
            var newContext = _.extend({}, context, {
                body: result
            });
            result = layoutTemp.render(newContext);
        }

        return result;
    }


    /**
     * Markdown formatter. 
     * Formats the content as markdown
     */
    jstatic.formatters.markdown = function(options) {
        this.options = options;
    }
    jstatic.formatters.markdown.prototype.format = function(fileContent, context, params) {
        return marked(fileContent);
    };


    /**** util functions ****/

    jstatic.normalizeParamsArray = function(param) {
        var arr = _.chain([param || []]).flatten();
        var normalized = arr.map(function(conf) {
            if(_.isString(conf)) {
                return {
                    type: conf
                };
            } else {
                return conf;
            }
        }).value();
        return normalized;
    };

    jstatic.buildInstances = function(farr, name, options) {
        var instances = _.chain(farr).map(function(entry) {
            return entry.fileOptions[name];
        }).flatten().map(function(conf) {
            return conf.type;
        }).uniq().map(function(type) {
            var _class = jstatic[name][type];
            if(!_class) {
                grunt.fail.warn("Unknown "+name+" type " + type);
            }
            return [type, new _class(options[type] || {})];
        }).object().value();
        return instances;
    };

    jstatic.readExtraContexts = function(options) {
        var files = _.flatten([options.extraContext || []]);
        var context = {};
        grunt.log.writeln("reading extra context");
        _.each(files, function(filePath) {
            if(_.isString(filePath)) {
                try {
                    var ext = path.extname(filePath);
                    if(ext == ".json") {
                        _.extend(context, grunt.file.readJSON(filePath));
                    } else if(ext == "yaml") {
                        _.extend(context, grunt.file.readYAML(filePath));
                    } else {
                        grunt.log.error("Context file must be .json or .yaml : " + filePath);
                    }
                } catch(e) {
                    grunt.log.error("Error parsing context file " + filePath + " : " + e);
                }
            } else {
                _.extend(context, filePath);
            }
        });
        return context;
    }

    return jstatic;
})();
