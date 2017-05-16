# Table of Contents

* [Releases](#releases)
  * [Direclty from the `development` branch](#directly-from-the-development-branch)
  * [Creating a `release` branch](#creating-a-release-branch)
  * [Hot Fixes](#hot-fixes)


## Releases 
    
**For all merging between branches you should use the `--no-ff --log=100` option.**


### Directly from the `development` branch

1. Merge from the `development` branch to the `master` branch 
    ```
    git checkout master 
    git merge --no-ff --log=100 development
    ```
    Always use `--no-ff` **and** include the log messages using `--log=100`. The number 100 is picked to big large enough; git uses this number as an upper bound and will only copy git commit messages since the last merge from `development`. 
1. Perform the merge and leave the git commit message intact. 
1. Push the change to `master` 
  * Travis will build `master` and `semantic-release` upon success of the build will parse the commit messages and accordingly create 
    1. A new Git tag 
    1. A new Git release 
    1. An updated npm package with a new version 
    1. Push the new npm package to the npm repo
    1. Push all documentation to the `gh-pages` branch 
      * If `semantic-release` does **not** find any commit messages that require a version change, then only the last step (pushing the updated documentation to `gh-pages`) occurs. 
1. Merge `master` back to `development`. You might have to deal with some conflicts  
1. If we did create a new release then go to the [Github Release](releases) and update the name of the Release. 
  1. Click on edit and the Github page autopopulates the release name from the tag name. 
  1. Click save. 

### Creating a `release` branch 

If we would like to create a `release` branch in order to allow our `development` branch to continue to accept merges then the steps are slightly different. Steps in **bold** mark changes compared to the steps given in [the previous sub-section](#direclty-from-the-development-branch). 

1. **Create a new branch from the `development` branch. Give it a name that has the prefix `release`.**
1. **Merge from the `release` branch to the `master` branch**
    ```
    git checkout master 
    git merge --no-ff --log=100 release
    ```
    Always use `--no-ff` **and** include the log messages using
    `--log=100`. The number 100 is picked to big large enough; git uses
    this number as an upper bound and will only copy git commit messages
    since the last merge from `development`.
1. Perform the merge and leave the git commit message intact. 
1. Push the change to the `master` branch
  * Travis will build `master` and `semantic-release` upon success of
  the build will parse the commit messages and accordingly create
    1. A new Git tag 
    1. A new Git release 
    1. An updated npm package with a new version 
    1. Push the new npm package to the npm repo
    1. Push all documentation to the `gh-pages` branch 
      * If `semantic-release` does **not** find any commit messages
      that require a version change, then only the last step (pushing
      the updated documentation to `gh-pages`) occurs.
1. **Merge `release` back to `development`. You might have to deal with some conflicts**
1. If we did create a new release then go to the [Github Release](releases) and update the name of the Release. 
  1. Click on edit and the Github page auto-populates the release name from the tag name. 
  1. Click save. 

### Hot Fixes 

Hot fixes **must** be merged with 

1. `master` 
1. `development` 

The steps are similar to the steps for [Creating a `release` branch](#creating-a-release-branch) after replacing the branch names `release` with `hotfix`



