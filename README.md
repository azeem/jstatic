# jstatic

> A simle, easily extensible, static documents generation task for Grunt.

## Getting Started
This plugin requires Grunt `~0.4.1`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install jstatic --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('jstatic');
```

## The "jstatic" task

### Overview
In your project's Gruntfile, add a section named `jstatic` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  jstatic: {
    options: {
      // Task-specific options go here.
    },
    your_target: {
      // Target-specific file lists and/or options go here.
    },
  },
})
```

jstatic page generation uses a two pass system. In the first pass, all the files are read
and a set of contexts (dictionary containing details about each page) is built. In
the second pass, all the output documents are generated. The processing and conversion
logic are implemented by two types of components.

* Preprocessors - Run in the first pass. Preprocessors modify the file content and or 
                  populates the context for each file.
* Formatters - Run in the second pass. Formatters format the file contents into some output format.

### Configuring jstatic
The minimum configuration required is a [Files Array][1] for each target, specifying the 
source files and destination.

Each [File Array][1] entry can contain a `preprocessors` and or `formatters` field which
contains the configuration for one or more preprocessors or formatters. These will be applied
on the file sequentially in the first and second pass respectively.

The `preprocessors` or `formatters` field in the Files Array can be a list of 

* Object of the form `{type: "component name", ... params ...}`
* String containing the component name. This is shortcut for case where only the type is required.

The params, depend on each component. The default value for `preprocessors` is `"yafm"` and for 
`formatters` is `"swig"`, thus in the absence of any configuration jstatic preprocesses the files
through yafm (YAml Front Matter Processor) and formats it with swig (templating engine).

eg:
```js
  grunt.initConfig({
    jstatic: {
      site: {
        files: [
            {
                src: ['src/content/index.html'], 
                dest: "site", 
                formatters: {type: "swig", layout: "simple.html"}
            },
            {
                src: ['src/content/*.html', '!src/content/index.html'], 
                dest: "site"
            },
            {
                src: ['src/content/*.md'],
                dest: "site",
                formatters: ["markdown", "swig"]
            },
            {
                src: ['src/content/posts/*.html'],
                dest: "site/posts"
            },
            {
                src: ['src/content/posts/*.md'],
                dest: "site/posts", 
                formatters: [
                    "markdown", 
                    {type: "swig", layout: "posts.html"}
                ]
            }
        ],
      }
    },
  });
```

# Options

The following global, or per-task options can be used with jstatic

* `linkPrefix` String (default: "/"): This string is prefixed to the link field in a page's context.
* `linkPathStrip` Number (default: 1): This many path elements are stripped off from the beginning 
                                       of a file's destination path, before building the link.
* `extraContext` Array of String or Object (default: []): List containing either a) paths to json or yaml 
                                                     files b) Objects. The data from this list will be merged
                                                     to the context during second pass

Additionally, jstatic options may contain initialization options for each component. These options
will be inside a field with same name as the component.

# Builtin Preprocessors

## yafm - YAml Front Matter Processor

> YFM is an optionalsection of valid YAML that is placed at the top of
> a page and is used for maintaining metadata for the page and its contents.

This components extracts YAML Front Matter from the input file into the file context
and passes on the remaining portion.

# Builtin Formatters

## swig

This component applies swig templating engine to the file contents. Each file's context is available
as template variables inside swig.

### Options

+ `layout` String (defualt: undefined) - If provided, then after rendering an input file, the rendered
                                         contents is passed as a variable `body` to the layout file.

you can also include any [swig initialization options][2] to initialize the swig library.

### File Array Params

+ `layout` String (default: undefined) - This overrides the layout option for the current files array entry.

## markdown

This component formats the file contents using the [marked][3] markdown engine

# Common Tasks

## Generating Collection Pages

The context passed during the second pass, contains an additional `fileContexts`
variable. This variable is a list of file contexts for all the files that were
parsed in the first pass.

Generating Collection summary pages, like blog home pages, archive pages, tag/category
pages simply involves creating a file with swig code to loop over the fileContexts
array.

Eg: This example generates a list of files, filtered by category and sorted in reverse chronological order
```html
<ul>
    {% for file in fileContexts|having("category","blog")|sortBy("publishTime")|reverse %}
        <li>{{file.publishTime|date("d M Y")}} <a href="{{file.link}}">{{file.title}}</a></li>
    {% endfor %}
</ul>
```

## Handling markdown files

Jstatic chains formatters and preprocessors. For example, to put a markdown converted content into a
swig layout we can chain "markdown" and "swig" formatters

eg: This files array entry converts any .md files to html and then wraps it in a swig template
```js
{
    src: ['src/content/posts/*.md'],
    dest: "site/posts", 
    formatters: [
        "markdown", 
        {type: "swig", layout: "posts.html"}
    ]
}
```

# Full Gruntfile Example
```js
  grunt.initConfig({
    jstatic: {
      options: {
        linkPrefix: "http://azeemarshad.in/",
        extraContext: ["src/context/meta.json"],
        swig: {
            root: ["./", "src/templates"],
            layout: "default.html"
        }
      },
      site: {
        files: [
            // convert main landing page using simple layout
            {src: ['src/content/index.html'], dest: "site", formatters: {type: "swig", layout: "simple.html"}},
            // convert all remaining root pages using default layout
            {src: ['src/content/*.html', '!src/content/index.html'], dest: "site"},
            // also convert root md files
            {src: ['src/content/*.md'],   dest: "site", formatters: ["markdown", "swig"]},

            // blog index file
            {src: ['src/content/posts/*.html'], dest: "site/posts"},
            // convert articles md files using special blog layout
            {src: ['src/content/posts/*.md'],   dest: "site/posts", 
             formatters: ["markdown", {type: "swig", layout: "posts.html"}] }
        ],
      }
    },
    clean: {
      site: ['site/*'],
    },
    copy: {
        site: {
            files: [{expand: true, cwd:"src/", src:["assets/**/*", "images/**/*"], dest: "site"}]
        }
    },
    watch: {
      site: {
        files: "src/**/*",
        tasks: ["default"]
      }
    }
  });

```

[1]: http://gruntjs.com/configuring-tasks#files-array-format
[2]: http://paularmstrong.github.io/swig/docs/#api-init
[3]: https://github.com/chjj/marked
