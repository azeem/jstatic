/*
 * jstatic
 * https://github.com/z33m/jstatic
 *
 * Copyright (c) 2013 azeem
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  var _      = grunt.util._;
  var path = require("path");
  var jstatic = require("../lib/jstatic.js");

  grunt.registerMultiTask('jstatic', 'Your task description goes here.', function() {
    var options = this.options({
        linkPrefix: "/",
        linkPathStrip: 1
    });

    grunt.log.subhead("Reading config");
    var faEntries = [];
    this.files.forEach(function(f) {
        var fileOptions = _.extend({
            outExt: ".html",
            preprocessors: "yafm",
            formatters: "swig"
        }, f.orig);

        fileOptions.preprocessors = jstatic.normalizeParamsArray(fileOptions.preprocessors);
        fileOptions.formatters = jstatic.normalizeParamsArray(fileOptions.formatters);

        var srcFiles = f.src.filter(function(filePath) {
            if(!grunt.file.exists(filePath)) {
                grunt.log.warn("Source file " + filePath + " not found");
                return false;
            }
            return true;
        });

        faEntries.push({
            dest: f.dest,
            fileOptions: fileOptions,
            srcFiles: srcFiles
        });
    });

    grunt.log.subhead("Initializing");
    var fmtInst = jstatic.buildInstances(faEntries, "formatters", options);
    var ppInst = jstatic.buildInstances(faEntries, "preprocessors", options);

    grunt.log.subhead("Preprocessing");
    _.each(faEntries, function(entry) {
        for(var i = 0;i < entry.srcFiles.length;i++) {
            var filePath = entry.srcFiles[i];
            var ext = path.extname(filePath);
            var basename = path.basename(filePath, ext);
            var destPath = path.join(entry.dest, basename + entry.fileOptions.outExt);

            var destPathSplits = destPath.split(path.sep);
            var sliceEnd = destPathSplits.length;
            if(basename === "index") {
                sliceEnd--;
            }
            var link = options.linkPrefix + destPathSplits.slice(options.linkPathStrip, sliceEnd).join("/");

            var context = {
                srcPath: filePath,
                destPath: destPath,
                ext: ext,
                basename: basename,
                link: link
            };
            var fileContent = grunt.file.read(filePath);
            for(var j in entry.fileOptions.preprocessors) {
                var conf = entry.fileOptions.preprocessors[j];
                fileContent = ppInst[conf.type].preprocess(fileContent, context, conf);
            }
            entry.srcFiles[i] = {
                content: fileContent,
                context: context
            };
            grunt.log.oklns(filePath);
        }
    });

    var fileContexts = _.chain(faEntries).map(function(entry) {
        return entry.srcFiles;
    }).flatten().map(function(file) {
        return file.context;
    }).value();

    // perform the formatting
    grunt.log.subhead("Formatting");
    _.each(faEntries, function(entry) {
        // for all the source files in the files array entry
        _.each(entry.srcFiles, function(srcFile) {
            // format the filecontent
            var finalContext = _.extend({fileContexts:fileContexts}, srcFile.context);
            var fileContent = srcFile.content;
            _.each(entry.fileOptions.formatters, function(conf){
                fileContent = fmtInst[conf.type].format(fileContent, finalContext, conf);
            });
            
            // write the file
            grunt.file.write(srcFile.context.destPath, fileContent);
            grunt.log.oklns(srcFile.context.destPath);
        });
    });

  });

};
