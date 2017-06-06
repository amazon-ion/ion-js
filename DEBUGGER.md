
# Debugging Intern Tests 

This is a rough guide on how to use Chrome to debug intern tests. If you know of a better way, please update. 

## Configure Chrome 

1. [Enable maps in Chrome](https://developers.google.com/web/tools/chrome-devtools/javascript/source-maps#enable_source_maps_in_settings)

## Debugging an Intern Test 

1. add `debugger;` to set a breakpoint in your source code 
1. build your source code using `grunt build:amd:debug`
    * `build:amd:debug` generates map files for `.ts` source code that other build targets do not. 
1. run the test suite using `node --inspect-brk  node_modules/intern/client.js config=tests/intern-debug`
    * note that we are using a *different* intern config file that disables code coverage
1. Open Chrome and paste `chrome://inspect/#devices` in the address bar. 
1. Under the section titled `Remote Target`  you should see 
   ```
   node_modules/intern/client.js file:///Users/joe/ion-js/node_modules/intern/client.js
   inspect
   ```
   with the last word `inspect` being a link. Click on it and the debugger pops-up in a new window


## Caveats 

1. The `inspect` link gets refreshed every time you run `node` with `--inspect-brk` 
1. Source files are not always refreshed by chrome. You might have to [clear your Chrome browsers cache](https://support.google.com/accounts/answer/32050?hl=en)

