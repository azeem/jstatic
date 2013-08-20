/*
 * jstatic
 * https://github.com/z33m/jstatic
 *
 * Copyright (c) 2013 azeem
 * Licensed under the MIT license.
 */

'use strict';

module.exports = function(grunt) {
  var jstatic = require("../lib/jstatic.js");

  grunt.registerMultiTask('jstatic', "A simple, easily extensible, static documents generation task for Grunt.", function() {
    var options = this.options({
        linkPrefix: "/",
        linkPathStrip: 1
    });

    var task = new jstatic.Task(this.files, options);
    task.run();
  });
};
