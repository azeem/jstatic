/*
 * jstatic
 * https://github.com/z33m/jstatic
 *
 * Copyright (c) 2013 azeem
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    jshint: {
      all: [
        'Gruntfile.js',
        'tasks/*.js',
        '<%= nodeunit.tests %>',
      ],
      options: {
        jshintrc: '.jshintrc',
      },
    },

    // Before generating any new files, remove any previously-created files.
    clean: {
      tests: ['testtmp'],
    },

    // Unit tests.
    nodeunit: {
      tests: ['test/*_test.js'],
    },

    jstatic: {
        site: {
            options: {
                swig: {
                    root: ["test/cases/templates"],
                    layout: "test/cases/templates/layout1.html"
                },
                permalink: {
                    linkPrefix: "http://github.com/azeem/jstatic/",
                }
            },
            files: [
                {
                    src: "test/cases/content/simple-defaults.html",
                    dest: "testtmp"
                },
                {
                    name: "layout-override",
                    src: "test/cases/content/layout-override.html",
                    dest: "testtmp",
                    generators: [
                        {type: "swig", layout: "test/cases/templates/layout2.html"}
                    ]
                },
                {
                    name: "yafm-test",
                    src: "test/cases/content/yafm-test.html",
                    dest: "testtmp",
                    generators: ["yafm", "swig"]
                },
                {
                    name: "yafm_split_test",
                    src: "test/cases/content/yafm_split_test.html",
                    dest: "testtmp",
                    generators: [
                        {
                            type: "yafm",
                            multi: true
                        },
                        "swig"
                    ]
                },
                {
                    name: "markdown_test",
                    src: "test/cases/content/md/*.md",
                    dest: "testtmp/md",
                    generators: ["yafm", "permalink", "markdown", "swig"]
                },
                {
                    name: "depends-test",
                    src: "test/cases/content/md/depends.html",
                    dest: "testtmp/md",
                    depends: ["markdown_test"],
                    generators: ["yafm", "permalink", "swig"]
                },
                {
                    name: "extend_test",
                    src: "test/cases/content/extend_test.html",
                    dest: "testtmp"
                },
                {
                    name: "destination_test",
                    src: "test/cases/content/destination_test.html",
                    dest: "testtmp",
                    generators: [
                        "yafm",
                        {
                            type: "destination",
                            dest: "$(path)$(sep)$(slug)_$(uid).$(outExt)"
                        },
                        "swig"
                    ]
                },
                {
                    name: "paginator_test",
                    src: "test/cases/content/paginator_test.html",
                    dest: "testtmp",
                    depends: ["markdown_test"],
                    generators: [
                        {type:"paginator", pivot: "markdown_test", pageSize: 2},
                        "swig"
                    ]
                },
                {
                    name: "paginator_pageby_test",
                    src: "test/cases/content/paginator_test.html",
                    dest: "testtmp",
                    depends: ["markdown_test"],
                    generators: [
                        {
                            type:"paginator", 
                            pivot: "markdown_test", 
                            pageBy: function(entry) {
                                var months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
                                return months[entry.publishTime.getMonth()];
                            }
                        },
                        "swig"
                    ]
                },
                {
                    name: "sequencer_test",
                    src: "test/cases/content/sequencer_test.html",
                    dest: "testtmp",
                    depends: ["markdown_test"],
                    generators: [
                        {type:"paginator", pivot: "markdown_test", pageSize: 2},
                        "permalink",
                        "sequencer",
                        "swig"
                    ]
                },
                {
                    name: "permalink_test",
                    src: "test/cases/content/permalink_test.html",
                    dest: "testtmp",
                    generators: [
                        "yafm",
                        {
                            type: "permalink",
                            func: function(entry, prefix, pathElems, outExt) {
                                return prefix + pathElems.slice(0,-1).join("/") + entry.basename + entry.variable + outExt;
                            }
                        },
                        "swig"
                    ]
                }
            ]
        }
    }

  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');

  // Whenever the "test" task is run, first clean the "tmp" dir, then run this
  // plugin's task(s), then test the result.
  grunt.registerTask('test', ['clean', 'jstatic', "nodeunit"]);

  // By default, lint and run all tests.
  grunt.registerTask('default', ['jshint', 'test']);

};
