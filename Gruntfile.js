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
      /**
       * Tests configuration
       */
    intern: {
      es6: {
        options: {
          config: 'tests/intern',
          reporters: ['Console', 'node_modules/remap-istanbul/lib/intern-reporters/JsonCoverage'],
          ionVersion: 'es6',
        },
      },
    },
    clean: ['dist/',
            'docs/',
            'coverage-final.json',
            'browser/scripts/ion/'
           ],
    jshint: {
      files: []
    },
      /**
       * Typescript document generator
       */
    typedoc: {
      build: {
        options: {
          module: 'amd',
          target: 'es6',
          out: 'docs/api/',
          name: 'Ion Library',
        },
        src: 'src/**/*'
      }
    },
      /**
       * Coverage report that maps coverage results to .ts files instead
       * of the generated .js files.
       */
    remapIstanbul: {
      build: {
        src: 'coverage-final.json',
          options: {
            reports: {
              'html': 'docs/coverage/html',
              'json': 'docs/coverage/coverage-final-mapped.json'
            }
          }
      }
    },
    ts: {
      'amd-es6': {
        src: ['src/**/*.ts'],
        outDir: 'dist/amd/es6',
        options: {
          target: "es6",
          module: "amd",
          declaration: true
        }
      }
    },
      /**
       * Copy of generated .js files to
       *  1. the dist folder
       *  2. the browser folder for use within a browser
       */
    copy: {
      main: {
        files: [
          { expand: true,
            src: ['dist/amd/es6/*.js'],
            dest: 'browser/scripts/ion/',
            flatten: true
          }
        ]
      }
    },
    babel: { 
      options: { 
        sourceMap: true, 
        presets: ['es2015']
      },
      dist: { 
        files: [{ 
          'expand': true, 
          cwd: 'dist/amd/es6',
          'src': ['*.js'], 
          'dest': 'dist/amd/es5/', 
          'ext': '.js',
        }], 
      },
    },
  });

  grunt.loadNpmTasks('grunt-babel');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-ts');
  grunt.loadNpmTasks('grunt-typedoc');
  grunt.loadNpmTasks('remap-istanbul');
  grunt.loadNpmTasks('intern');

  grunt.registerTask('build', ['clean', 'ts:amd-es6','copy:main']);
  grunt.registerTask('toES5', ['build', 'babel']);
  grunt.registerTask('test', ['build', 'intern:es6']);
  grunt.registerTask('doc', ['test', 'typedoc']);
  grunt.registerTask('coverage', ['doc', 'remapIstanbul']);
  grunt.registerTask('all', ['coverage']);

  grunt.registerTask('default', ['test']);
};
