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

    /**** formatters ****/
    var swigFilters = {
        jsonStringify : function(arg) {
            return JSON.stringify(arg);
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

        var layout = this.options.layout || params.layout;
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

    /*jstatic.format = function(fileContent, context, confs, options) {
        _.each(confs, function(conf) {
            var formatter = jstatic._formatters[conf.type];
            if(!formatter) {
                var formatterClass = jstatic.formatters[conf.type];
                if(!formatterClass) {
                    grunt.fail.warn("Unknown formatter " + conf.type);
                }
                formatter = new formatterClass(options);
                jstatic._formatters[conf.type] = formatter;
            }

            var formatterOptions = _.extend({}, options[conf.type] || {}, conf);
            fileContent = formatter(fileContent, context, formatterOptions);
        });
        return fileContent;
    }

    jstatic.preprocess = function(fileContent, context, confs, options) {
        _.each(confs, function(conf) {
            var preprocessor = jstatic._preprocessors[conf.type];
            if(!preprocessor) {
                var ppClass = jstatic.preprocessors[conf.type];
                if(!ppClass) {
                    grunt.fail.warn("Unknown preprocessor " + conf.type);
                }
                preprocessor = new ppClass(options);
                jstatic._preprocessors[conf.type] = 
            }
            var ppOptions = _.extend({}, options[conf.type] || {}, conf);
            fileContent = preprocessor(fileContent, context, ppOptions);
        });
        return fileContent;
    }*/


    return jstatic;
})();
