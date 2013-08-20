module.exports = (function() {
    var path = require("path");
    var grunt = require("grunt");
    var toposort = require("toposort");
    var _ = grunt.util._;

    // jstatic module object
    var jstatic = {
        _regGenList: {},
        registerGenerator: function(name, gen) {
            this._regGenList[name] = gen;
        },

        getGenerator: function(name) {
            return this._regGenList[name];
        }
    };

    // register the generators
    var generators = require("./generators.js");
    generators(jstatic);

    /**
     * Flow represents src and dest along with a sequence
     * of generator applications that modify and generate the.
     * the file content.
     */
    jstatic.Flow = function(src, dest, options) {
        this.name = options.name;
        this.src = src;
        this.dest = dest;
        this.outExt = options.outExt || ".html";
        this.depends = options.depends || [];

        var generators = options.generators || ["yafm", "swig"];
        this.generators = _.map(generators, function(declr) {
            if(_.isString(declr)) {
                return { type: declr };
            } else {
                return declr;
            }
        });

        this.entries = [];
        this.done = false;
    }
    _.extend(jstatic.Flow.prototype, {
        execute: function(options, data, depends) {
            grunt.log.subhead("Running flow " + this.name);

            var src = _.filter(this.src.slice(0), function(filePath) {
                if(!grunt.file.exists(filePath)) {
                    grunt.log.warn("Source file " + filePath + " not found");
                    return false;
                }
                return true;
            });
            var dest = this.dest;
            var outExt = this.outExt;

            // an iterator that reads the files
            // and emits a base file entry object
            var fileIter = function() {
                var filePath = src.shift();
                if(_.isUndefined(filePath)) {
                    return;
                }
                var ext = path.extname(filePath);
                var basename = path.basename(filePath, ext);
                var destPath = path.join(dest, basename + outExt);
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

            // combine all the generators
            var finalIter = _.reduce(this.generators, function(iter, genDeclr) {
                var generator = jstatic.getGenerator(genDeclr.type);
                if(_.isUndefined(generators)) {
                    grunt.log.error("Unknown generator '"+generator+"' in flow '"+this.name);
                }
                var params = _.extend({depends: depends, data: data}, options[genDeclr.type] || {}, genDeclr);
                console.log(params);
                return generator(iter, params);
            }, fileIter);

            // write file contents
            var entry;
            while(entry = finalIter()) {
                this.entries.push(entry);
                grunt.file.write(entry.destPath, entry.content);
                grunt.log.oklns(entry.destPath);
            }

            this.done = true;
        }
    });

    /**
     * Jstatic task
     */
    jstatic.Task = function(filesArray, options) {
        this.flows = _.chain(filesArray).map(function(item) {
            var flow = new jstatic.Flow(item.src, item.dest, item);
            return [flow.name, flow]
        }).object().value();

        this.options = options;
        this._readData();
    };
    _.extend(jstatic.Task.prototype, {
        _readData: function() {
            var files = _.flatten([this.options.extraContext || []]);
            var data = {};
            _.each(files, function(filePath) {
                if(_.isString(filePath)) {
                    try {
                        var ext = path.extname(filePath);
                        if(ext == ".json") {
                            _.extend(data, grunt.file.readJSON(filePath));
                        } else if(ext == "yaml") {
                            _.extend(data, grunt.file.readYAML(filePath));
                        } else {
                            grunt.log.error("Context file must be .json or .yaml : " + filePath);
                        }
                    } catch(e) {
                        grunt.log.error("Error parsing data file " + filePath + " : " + e);
                    }
                } else {
                    _.extend(data, filePath);
                }
            });
            this.data = data;
        },

        run: function() {
            var edges = _.chain(this.flows).map(function(flow, flowName) {
                return _.map(flow.depends, function(depend) {
                    return [flowName, depend];
                });
            }).flatten().value();

            var execOrder = toposort(edges).reverse();

            // add disjoint items in graph
            execOrder = _.difference(_.keys(this.flows), execOrder).concat(execOrder);

            _.each(execOrder, function(flowName) {
                var flow = this.flows[flowName];
                if(!flow) {
                    grunt.log.error("Unknown flow " + flowName);
                }
                var depends = _.chain(flow.depends).each(function(flowName) {
                    return [flowName, this.flows[flowName].entries];
                }, this).object().value();
                flow.execute(this.options, this.data, depends);
            }, this);
        }
    });

    return jstatic;
})();
