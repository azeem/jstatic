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
                    root: "test/cases/templates",
                    layout: "test/cases/templates/layout1.html"
                },
                permalink: {
                    linkPrefix: "http://github.com/azeem/jstatic/",
                }
            },
            files: [
                {
                    name: "simple-defaults",
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
