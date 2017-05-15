<p align="right">
 <a title="npm-version" href="https://www.npmjs.com/package/ion-js"><img src="https://img.shields.io/npm/v/ion-js.svg"/></a>
 <a title="license" href="https://github.com/amzn/ion-js/blob/master/LICENSE"><img src="https://img.shields.io/hexpm/l/plug.svg"/></a>

</p>
<p align="right">
 <a title="travis" href="https://travis-ci.org/amzn/ion-js"><img src="https://api.travis-ci.org/amzn/ion-js.svg?branch=master"/></a>
 <a title="docs" href="https://amzn.github.io/ion-js/api/index.html"><img src="https://img.shields.io/badge/docs-api-green.svg?style=flat-square"/></a>
 <a title="semantic-release" href="https://github.com/amzn/ion-js/releases"><img src="https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg?style=flat-square"/></a>
</p>

# About 

Ion-JS is a Javascript library for [Ion](https://amzn.github.io/ion-docs/). The library allows for reading/writing Ion 
data from within Javascript code. 

For more information on Ion have a look at the [Ion Specification](https://amzn.github.io/ion-docs/spec.html) as well as some of the other Ion language specific libraries such as 

* [Ion C](https://github.com/amzn/ion-c)
* [Ion Java](https://github.com/amzn/ion-java)
* [Ion Python](https://github.com/amzn/ion-python)


# Download

The library is written in typescript and uses `npm` for its dependencies. Make sure you have the latest, stable, release 
for [`npm`](https://nodejs.org/en/).

1. Clone this repo 
    ```
    git clone --recursive https://github.com/amzn/ion-js.git
    ```
1. Use `npm` to install all dependencies
    ```
    npm install 
    ```
1. We use [`grunt`](https://gruntjs.com/) for managing our build process, to see all of our build targets look at [`Gruntfile.js`](Gruntfile.js). 
    ```
    grunt all
    ```
Javascript code is generated under the folder `dist`. 
Documentation is generated under the folder `doc` and is also available [online](https://amzn.github.io/ion-js/api/). 


## Tests 

To debug the unit tests, use the following command:

```
node debug node_modules/intern/client config=tests/intern ionVersion=es6
```

## Browser 

To run Ion in a browser, see the example in the "browser" folder. You'll need to copy require.js and the Ion JavaScript files (Ion.js etc.) into the "scripts" folder.


