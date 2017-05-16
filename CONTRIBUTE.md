

# Table of Contents 

* [Contribute to `ion-js`](#contribute-to-ion-js) 
* [Issues](#issues)
* [Code](#code)
  * [Git Branching Model](#git-branching-model) 
  * [Pull Requests](#pull-requests)
  * [Hot Fixes](#hot-fixes)


# Contribute to `ion-js`

# Issues 

For questions and/or issues please use the projects [Github Issues](issues) page.
It is extremely helpful to provide as much information and context around your question/issue as possible in order to help us 
understand and reproduce your use case/issue while minimizing back and forth communication as much as possible. 

Please read the following guideline prior to creating a new issue 

1. Search through our existing [Github Issues](issues) first and ensure that you are not about to create a duplicate. 
1. Provide a descriptive title for the issue. 
1. If you are reporting a bug, please make sure that 
  1. You specify the version of `ion-js` that you are using (release version, or branch you are working on)
  1. Provide information on your environment, e.g., npm version, relevant dependencies 
  1. Any data/information to reproduce the issue on our end
  1. Any error messages or output with expected and actual clearly specified. If you can setup a Github repo that contains a test that we can clone and run that would be ideal. 
    
# Code 

## Git Branching Model

Our git branching model is based on [A succesful Git branching model](http://nvie.com/posts/a-successful-git-branching-model/). In short, 
there are two long lived git branches 

1. `development` 
1. `master` 

**All development occurs on the `development` branch**. Once we are ready to release features to the world, we then select the commits from 
the `development` branch to merge into `master`. You should therefore fork/branch off the `development` branch. 


## Pull Requests

Here is the proposed workflow for creating a pull request 

1. Fork `ion-js` into your account and configure the our repo as your upstream. See the documentation on [Form a Repo](https://help.github.com/articles/fork-a-repo/)
1. Clone your forked repo to your machine. `ion-js` contains a git submodule for testing make sure you check that out to by using `--recursive` in your git command, e.g., 
    ```
    git clone --recursive https://github.com/amzn/ion-js.git
    ```
1. Create your branch from the `developement` branch, 
    ```
    git checkout -b mynewfeature development
    ```
    where `mynewfeature` is the name to be given to your new branch 
1. Run `npm install`. This step will install all dependencies needed for `ion-js`
1. Make changes to the code. 
1. `ion-js` uses `grunt` to build and run tests. Use 
    ``` 
    grunt 
    ```
    to run the default target. See the [Gruntfile](Gruntfile.js) for all available targets. 
1. Use `git add` to add your changes to your local repo
1. Use `npm run commit` to create a well formed commit message. See this [video](https://egghead.io/lessons/javascript-how-to-write-a-javascript-library-writing-conventional-commits-with-commitizen). You can ignore the installation of dependencies from the video and you can focus on the process that starts at 2:17 in the video.
1. Repeat the previous three steps as many times as you need. 
1. Once you are ready with your code changes **and tests** you can [create a pull requests against the `development` branch](https://help.github.com/articles/creating-a-pull-request-from-a-fork/)
1. In the pull request make sure that you assign reviewers 
1. Make sure that the travis build for your build request succeeds

## Hot Fixes

For hot-fixes **only** you can branch from the `master` branch. Branches for hot fixes typically have the prefix `hotfix` in their name. 

All other steps remain the same as for [Pull Requests](#pull-requests). 
