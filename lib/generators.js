module.exports = function(jstatic) {
    var path = require("path");
    var jsYaml = require("js-yaml");
    var marked = require("marked");
    var swig = require("swig");
    var grunt = require("grunt");
    var _ = grunt.util._;

    jstatic.registerGenerator("yafm", function(iter, params, flow, depends, data) {
        var sep = params.sep || "-";
        var re = "(" + sep + "{3,})([\\w\\W]+?)" + sep + "{3,}";
        var multi = params.multi?true:false;
        if(!multi) {
            re = "^" + re;
        }
        re = new RegExp(re, "g");

        var newEntries = [];

        return function() {
            if(newEntries.length > 0) {
                return newEntries.shift();
            }

            var entry = iter();
            if(_.isUndefined(entry)) return;

            var splits = _.chain(entry.content.split(re)).map(_.trim).filter(function(split) {
                return split.length > 0;
            }).value();
            for(var i = 0;i < splits.length;i++) {
                var newEntry = _.clone(entry);
                if(splits[i].substring(0, 4) === sep + sep + sep) {
                    i++; // skip the separator
                    try {
                        var yaml = jsYaml.load(splits[i]);
                        _.extend(newEntry, yaml);
                    } catch(e) {
                        grunt.log.warn("generator#yafm: Couldnt parse yaml front matter " + e + "\n" + splits[i]);
                    }
                    i++; // position at the content
                }
                newEntry.content = splits[i] || "";
                if(multi) {
                    newEntry.split = newEntries.length;
                    if(flow.dest) {
                        var newName = newEntry.basename + newEntries.length + flow.outExt;
                        newEntry.destPath = path.join(flow.dest, newName);
                    }
                }
                newEntries.push(newEntry);
            }

            return newEntries.shift();
        };
    });

    jstatic.registerGenerator("paginator", function(iter, params, flow, depends) {
        var pivot = params.pivot;
        var pageSize = params.pageSize || 5;
        if(_.isUndefined(pivot)) {
            grunt.fail.warn("generator#paginator: pivot field required. specify a name from the depends list, to be used as paginatination pivot.");
        }

        var pageCount = Math.ceil(depends[pivot].length/pageSize);
        var entry;
        var page = 0;

        var paginatorIter = function() {
            if(page > 0) {
                var newEntry = _.clone(entry);
                newEntry.page = page;
                newEntry.pageCount = pageCount;
                newEntry.pageSize = pageSize;
                if(flow.dest) {
                    var newName = newEntry.basename + page + flow.outExt;
                    newEntry.destPath = path.join(flow.dest, newName);
                }
                page--;
                return newEntry;
            }

            entry = iter();
            if(_.isUndefined(entry)) return;

            page = pageCount;
            return paginatorIter();
        };

        return paginatorIter;
    });

    jstatic.registerGenerator("sequencer", function(iter, params, flow, depends, data) {
        var collected = false;
        var sequence = [];

        return function() {
            if(collected) {
                return sequence.shift();
            }

            var entry;
            while(entry = iter()) {
                sequence.push(entry);
            }

            for(var i = 0;i < sequence.length;i++) {
                entry = sequence[i];
                if(i != 0) {
                    entry.next = sequence[i-1];
                }
                if(i != sequence.length-1) {
                    entry.prev = sequence[i+1];
                }
                entry.sequence = sequence;
            }

            collected = true;

            return sequence.shift();
        };
    });

    jstatic.registerGenerator("destination", function(iter, params, flow, depends, data) {
        var pathFunc;
        if(_.isString(params.dest)) {
            pathFunc = function(entry, outExt, sep, dest) {
                var context = _.extend({sep: sep, outExt: outExt, dest: dest}, entry);
                return _.template(params.dest, context, {
                    interpolate: /\$\((.+?)\)/g
                });
            }
        } else if(_.isFunction(params.dest)){
            pathFunc = params.dest;
        } else {
            grunt.fail.warn("generator#destination: dest parameter must be string or a function");
        }

        return function() {
            var entry = iter();
            if(_.isUndefined(entry)) return;

            // override the destination path
            entry.destPath = path.join(flow.dest, pathFunc(entry, flow.outExt, path.sep, flow.dest));
            return entry;
        };
    });

    jstatic.registerGenerator("permalink", function(iter, params, flow, depends, data) {
        params = _.defaults(params, {
            linkPrefix: "/",
            linkPathStrip: 1
        });
        return function() {
            var entry = iter();
            if(_.isUndefined(entry)) return;


            // create the permalink
            var destPathSplits = entry.destPath.split(path.sep);
            var sliceEnd = destPathSplits.length;
            var destBasename = path.basename(entry.destPath, path.extname(entry.destPath))
            if(destBasename === "index") {
                sliceEnd--;
            }
            entry.permalink = params.linkPrefix + destPathSplits.slice(params.linkPathStrip, sliceEnd).join("/");
            return entry;
        };
    });

    jstatic.registerGenerator("unpublish", function(iter, params, flow, depends, data) {
        return function() {
            var entry;
            while(
                (entry = iter()) &&
                !_.isUndefined(entry.published) && 
                !entry.published
            );
            return entry;
        };
    });

    jstatic.registerGenerator("summary", function(iter, params, flow, depends, data) {
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
                entry.summary += "<a href='"+context.permalink+"'> ... read more</a>";
            }
            return entry;
        };
    });

    jstatic.registerGenerator("markdown", function(iter, params, flow, depends, data) {
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
    swig.setFilter("alt", function(value) {
        return ((value % 2) == 0);
    });
    swig.setFilter("pageSlice", function(arr, page, pageSize) {
        var start = (page-1)*pageSize;
        return arr.slice(start, start + pageSize);
    });

    jstatic.registerGenerator("swig", function(iter, params, flow, depends, data) {
        var layout;
        if(params.layout) {
            layout = swig.compileFile(params.layout, _.extend({filename: params.layout}, params));
        }

        return function() {
            var entry = iter();
            if(_.isUndefined(entry)) return;

            var context = _.extend({}, entry, depends, data);
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
