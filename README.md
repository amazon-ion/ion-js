<p align="right">
 <a title="" href="https://api.travis-ci.org/amzn/ion-js.svg?branch=master">
 <img src="https://api.travis-ci.org/amzn/ion-js.svg?branch=master"/>
 </a>
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
