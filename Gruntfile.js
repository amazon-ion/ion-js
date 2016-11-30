/*
 * Copyright 2012-2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at:
 *
 *     http://aws.amazon.com/apache2.0/
 *
 * or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific
 * language governing permissions and limitations under the License.
 */
module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    intern: {
      default: {
        options: {
          config: 'tests/intern',
          reporters: ['Console', 'Lcov'],
        }
      }
    },
    jshint: {
      files: []
    },
    ts: {
      default: {
        src: ['src/**/*.ts'],
        outDir: 'dist',
        options: {
          module: "amd",
          target: "es6",
        }
      },
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-ts');
  grunt.loadNpmTasks('intern');

  grunt.registerTask('default', ['ts', 'intern']);
  grunt.registerTask('test', ['intern']);
};
