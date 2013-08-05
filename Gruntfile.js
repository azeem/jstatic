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

    // Configuration to be run (and then tested).
    jstatic: {
      options: {
        linkPrefix: "http://azeemarshad.in/",
        swig: {
            root: ["./", "azeemarshad.in/templates"],
            layout: "default.html"
        }
      },
      site: {
        files: [
            {src: ['azeemarshad.in/content/*.html'], dest: "testtmp"},
            {src: ['azeemarshad.in/content/*.md'],   dest: "testtmp", formatters: ["markdown", "swig"]},

            {src: ['azeemarshad.in/content/posts/*.html'], dest: "testtmp/posts"},
            {src: ['azeemarshad.in/content/posts/*.md'],   dest: "testtmp/posts", 
             formatters: ["markdown", {type: "swig", layout: "posts.html"}] }
        ],
      }
    },

    // Unit tests.
    nodeunit: {
      tests: ['test/*_test.js'],
    },

  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');
  grunt.loadNpmTasks('grunt-devtools');

  // Whenever the "test" task is run, first clean the "tmp" dir, then run this
  // plugin's task(s), then test the result.
  grunt.registerTask('test', ['clean', 'jstatic']);

  // By default, lint and run all tests.
  grunt.registerTask('default', ['jshint', 'test']);

};
