<p align="right">
 <a title="npm-version" href="https://www.npmjs.com/package/ion-js"><img src="https://img.shields.io/npm/v/ion-js.svg"/></a>
 <a title="license" href="https://github.com/amzn/ion-js/blob/master/LICENSE"><img src="https://img.shields.io/hexpm/l/plug.svg"/></a>

</p>
<p align="right">
 <a title="travis" href="https://travis-ci.org/amzn/ion-js"><img src="https://api.travis-ci.org/amzn/ion-js.svg?branch=master"/></a>
 <a title="docs" href="https://amzn.github.io/ion-js/api/index.html"><img src="https://img.shields.io/badge/docs-api-green.svg?style=flat-square"/></a>
 <a title="semantic-release" href="https://github.com/amzn/ion-js/releases"><img src="https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square"/></a>
</p>

# Table of Contents 

* [About](#about)
* [Use](#use)
  * [NPM](#npm)
  * [Browser](#browser)
  * [API](#api)
* [Contribute](#contribute)
* [License](#license)
* [Links](#links)

# About 

Ion-JS is a JavaScript library for [Ion](https://amzn.github.io/ion-docs/) -- this is currently alpha software and is subject to change. The library allows for reading/writing Ion 
data from within JavaScript code. 

For more information on Ion have a look at the [Ion Specification](https://amzn.github.io/ion-docs/spec.html) as well as some of the other Ion language specific libraries such as 

* [Ion C](https://github.com/amzn/ion-c)
* [Ion Java](https://github.com/amzn/ion-java)
* [Ion Python](https://github.com/amzn/ion-python)


# Use

You can use ion-js either as a Node.js module or inside an html page. 

## NPM

1. Add `ion-js` to your dependencies using `npm`
    ```
    npm install --save-dev ion-js
    ```
1. Use the library to read/write ion data. Here is an example that reads Ion data from a JavaScript string
    ```javascript
    var ionJs = require("ion-js")

    var ionData = "{ hello: \"Ion\" }"; 
    var ionReader = ionJs.makeReader(ionData); 
    ionReader.next(); 
    ionReader.stepIn(); 
    ionReader.next(); 
    var hello = ionReader.fieldName(); 
    var ion = ionReader.stringValue(); 
    ionReader.stepOut(); 
    console.log(ion.concat(", ").concat(hello));
    ```
    [Try it yourself](https://npm.runkit.com/ion-js). 

## Browser

You can include the Ion-js bundle (ES5 compatible) using the URLs 

* [ion-bundle.min.js](https://amzn.github.io/ion-js/browser/scripts/ion-bundle.min.js)
* [ion-bundle.js](https://amzn.github.io/ion-js/browser/scripts/ion-bundle.js)

These will create and initialize `window.ion` which has the exact API as our `npm` package. Here is an example 

```html
<html>
<head>
  <meta charset="UTF-8"/>
  <script src="scripts/ion-bundle.min.js"></script>

  <!-- more HTML/JS code that can now use `window.ion` to create/write Ion -->
</head>
</html>
```

## API 

[Ion JS API](https://amzn.github.io/ion-js/api/)

# Contribute

[CONTRIBUTE.md](CONTRIBUTE.md)

# License

[Apache License 2.0](LICENSE)

# Links

* [Ion](https://amzn.github.io/ion-docs/)
* [Ion Specification](https://amzn.github.io/ion-docs/spec.html)
* [Ion Cookbook](https://amzn.github.io/ion-docs/cookbook.html) uses the Java library for its examples. 
* [Ion C](https://github.com/amzn/ion-c)
* [Ion Java](https://github.com/amzn/ion-java)
* [Ion Python](https://github.com/amzn/ion-python)
