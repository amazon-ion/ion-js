# Amazon Ion JavaScript
An implementation of [Amazon Ion](https://amzn.github.io/ion-docs/) for JavaScript written in TypeScript.

[![NPM Version](https://img.shields.io/npm/v/ion-js.svg)](https://www.npmjs.com/package/ion-js)
[![License](https://img.shields.io/hexpm/l/plug.svg)](https://github.com/amzn/ion-js/blob/master/LICENSE)
[![Travis CI Status](https://api.travis-ci.org/amzn/ion-js.svg?branch=master)](https://travis-ci.org/amzn/ion-js)
[![Documentation](https://img.shields.io/badge/docs-api-green.svg)](https://amzn.github.io/ion-js/api/index.html)

This package is designed to work with Node JS major versions **8**, **10**, and **12**.  While this library
should be usable within browsers that support **ES5+**, please note that it is not currently being tested
in any browser environments.

## Getting Started

You can use this library either as a Node.js module or inside an HTML page.

### NPM

1. Add `ion-js` to your dependencies using `npm`
    ```
    npm install --save ion-js
    ```
1. Use the library to read/write Ion data. Here is an example that reads Ion data from a JavaScript string:
    ```javascript
    let ion = require("ion-js");
    
    // Reading
    let ionData = '{ greeting: "Hello", name: "Ion" }';
    let value = ion.load(ionData);
    console.log(value.greeting + ", " + value.name + "!");
   
    // Writing
    let ionText = ion.dumpText(value);
    console.log("Serialized Ion: " + ionText);
    ```
   
   For more examples, see the [Ion DOM `README`](/src/dom/README.md).

[Try it yourself](https://npm.runkit.com/ion-js).

**Note:** if your package's public interface exposes part of this library, this library should be specified
as a peer dependency in your package's package.json file.  Otherwise, packages that depend on your package
*and* this library may experience unexpected behavior, as two installations of this library (even if the same
version) are not designed or tested to behave correctly.

### Web Browser

You can include the Ion-js bundle (ES5 compatible) using the URLs

* [ion-bundle.min.js](https://amzn.github.io/ion-js/browser/scripts/ion-bundle.min.js)
* [ion-bundle.js](https://amzn.github.io/ion-js/browser/scripts/ion-bundle.js)

These will create and initialize `window.ion` which has the same exact API as our `npm` package. Here is an example

```html
<html>
<head>
  <meta charset="UTF-8"/>
  <script src="scripts/ion-bundle.min.js"></script>

  <!-- more HTML/JS code that can now use `window.ion` to create/write Ion -->
</head>
</html>
```

### API

[TypeDoc](https://typedoc.org/) generated documentation can be found at [here](https://amzn.github.io/ion-js/api/).
Please note that anything not documented in the the API documentation is not supported for public use and is
subject to change in any version.

## Git Setup

This repository contains a [git submodule](https://git-scm.com/docs/git-submodule)
called `ion-tests`, which holds test data used by `ion-js`'s unit tests.

The easiest way to clone the `ion-js` repository and initialize its `ion-tests`
submodule is to run the following command.

```
$ git clone --recursive https://github.com/amzn/ion-js.git ion-js
```

Alternatively, the submodule may be initialized independently from the clone
by running the following commands.

```
$ git submodule init
$ git submodule update
```

## Development

Use `npm` to setup the dependencies.  In the project directory you can run the following:

```
$ npm install
```

Building the package can be done with the release script (which runs the tests).

```
$ npm run release
```

Tests can be run using npm as well

```
$ npm test
```

This package uses [Grunt](https://gruntjs.com/) for its build tasks.  For convenience, you may want to install
this globally:

```
$ npm -g install grunt-cli
$ grunt release
```

Or you could use the locally installed Grunt:

```
$ ./node_modules/.bin/grunt release
```

### Build Output

The build above will compile the library into the `dist` directory.  This directory has subdirectories of
the form `<module type>/<target ES version>`.  In general, we target ES6 and rely on polyfills to support earlier
versions.

* `dist/es6/es6` - Targets the ES6 module system and ES6
* `dist/commonjs/es6` - Targets the CommonJS module system and ES6 
* `dist/amd/es6` - Targets the AMD module system and ES6

A distribution using `browserify` and `babelify` creates a browser friendly polyfilled distribution targeting ES5:
at `dist/browser/js/ion-bundle.js`.

## Ion Specification Support

| Types                     | IonText       | IonBinary     | Limitations                                   |
|:-------------------------:|:-------------:|:-------------:|:---------------------------------------------:|
| `null`                    | yes           | yes           | none                                          |
| `bool`                    | yes           | yes           | none                                          |
| `int`                     | yes           | yes           | underscores, binary digits                    |
| `float`                   | yes           | yes           | underscores                                   |
| `decimal`                 | yes           | yes           | none                                          |
| `timestamp`               | yes           | yes           | none                                          |
| `string`                  | yes           | yes           | none                                          |
| `symbol`                  | yes           | yes           | `$0`, symbol tokens                           |
| `blob`                    | yes           | yes           | none                                          |
| `clob`                    | yes           | yes           | none                                          |
| `struct`                  | yes           | yes           | none                                          |
| `list`                    | yes           | yes           | none                                          |
| `sexp`                    | yes           | yes           | none                                          |
| annotations               | yes           | yes           | none                                          |
| local symbol tables       | yes           | yes           | none                                          |
| shared symbol tables      | no            | no            | none                                          |

Notes:
* [test/iontests.ts](https://github.com/amzn/ion-js/blob/master/test/iontests.ts) defines multiple skipList variables
  referencing test vectors that are not expected to work at this time.

## Contributing

See [CONTRIBUTE.md](CONTRIBUTE.md)

## License

This library is licensed under [Apache License version 2.0](LICENSE)

## Links
For more information about Ion or its other impleemntation, please see:

* [Ion](https://amzn.github.io/ion-docs/)
* [Ion Specification](https://amzn.github.io/ion-docs/spec.html)
* [Ion Cookbook](https://amzn.github.io/ion-docs/cookbook.html) uses the Java library for its examples.
* [Ion C](https://github.com/amzn/ion-c)
* [Ion Java](https://github.com/amzn/ion-java)
* [Ion Python](https://github.com/amzn/ion-python)
