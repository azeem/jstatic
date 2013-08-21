# jstatic

> A simple, easily extensible, static documents generation task for Grunt.

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

jstatic converts files using a very simple algorithm. Every [Files Array][1] entry
is treated as a separate conversion Flow. During each flow, file details are read into a dictionary.
This dictionary is then passed sequentially through a series of generators (which modify/add items 
int the dictionary etc.). The resulting data is then written at the destination.

### Configuring jstatic
The minimum configuration required is a [Files Array][1] for each target, specifying the 
source files and destination.

Each [File Array][1] entry can contain additional properties that determine the conversion.
The following file array properties are valid.

+ All standard [File Array][1] properties.
+ `name` String (default: generated): 
    This is a unique string that identifies this entry. Used
    when there are dependencies between conversions.
+ `outExt` String (default: ".html"): 
    The file extension for the output files.
+ `depends` Array&lt;String&gt; (default: []): 
    A list of names of File Array entries on which this
    conversions is dependant. The generated results of
    all these dependencies will be available for the 
    current conversion.
+ `generators` Array&lt;String|Object&gt; (default: ["yafm", "permalink", "swig"]):
    A list of generator names as string or optionally an object of the form 
    `{type:"<generator-name>", .. other params .. }` for cases where specific conversion
    parameters need to be specified. These params vary from generator to generator.

eg:
```js
  grunt.initConfig({
    jstatic: {
      site: {
        files: [
            {
                src: "content/index.html",
                dest: "site"
            },
            {
                name: "my-flow",
                src: ["content/post/*.md"],
                dest: "site/post",
                generators: [
                    "yafm",
                    "markdown",
                    {type: "swig", layout: "templates/blog_layout.html"}
                ]
            }
        ],
      }
    },
  });
```

# Options

The following global, or per-task options can be used with jstatic

* `extraContext` Array&lt;String|Object&gt; (default: []): 
    List containing either a) paths to json or yaml 
    files b) Objects. The data from this list will be passed as
    param `data` to the generators.
* `<generator-name>` Object: 
    This dictionary of params is merged with generator params passed in the
    file array list, thus allowing global configuration of generators.

# Builtin Generators

## yafm - YAml Front Matter Processor

> YFM is an optional section of valid YAML that is placed at the top of
> a page and is used for maintaining metadata for the page and its contents.

This generator extracts YAML Front Matter from the input file into the file dictionary
and sets the content to the remaining portion.

## swig

This generator applies swig templating engine to the file contents. The file dictionary
is available as context inside swig templates. The final generated results of dependencies
are also available inside the templates, as variable with same name as the file array entry.
Additionally fields in the global `extraContext` is also available.

### Params

+ `layout` String (defualt: undefined) - If provided, then after rendering an input file, the rendered
                                         contents is passed as a variable `body` to the layout file.

you can also include any [swig initialization options][2] to initialize the swig library.

## markdown

This generator formats the file contents using the [marked][3] markdown engine

## summary

This generator extracts a single paragraph summary of markdown contents and adds it as `summary`
field in the file dictionary.

## permalink

This generator generates a URL from the file destination path and adds it as a `permalink` 
field in the file dictionary.

### Params

* `linkPrefix` String (default: "/"): 
    This string is prefixed to the link field in a page's context.
* `linkPathStrip` Number (default: 1): 
    This many path elements are stripped off from the beginning 
    of a file's destination path, before building the link.

# Common Tasks

## Generating Collection Pages

During each conversion, an array of final file dictionaries of all dependencies are passed 
in a `depends` parameter to the generators. The swig generator makes this parameter available
inside the template, thus allowing us to generate collection summary pages, like blog
home pages, archive pages, tag/category pages etc..

Eg: 
If we configure the files array
```js
files: [
    {
        src: "content/index.html",
        dest: "site"
        depends: ["blog_flow"] // We need to put a list of blog entries in the index page
    },
    {
        name: "blog_flow",
        src: ["content/post/*.md"],
        dest: "site/post",
        generators: [
            "yafm",
            "markdown",
            "permalink",
            {type: "swig", layout: "templates/blog_layout.html"}
        ]
    }
]
```

then index.html can generate list of posts like so

```html
<ul>
    {% for file in blog_flow|sortBy("publishTime")|reverse %}
        <li>{{file.publishTime|date("d M Y")}} <a href="{{file.permalink}}">{{file.title}}</a></li>
    {% endfor %}
</ul>
```

[1]: http://gruntjs.com/configuring-tasks#files-array-format
[2]: http://paularmstrong.github.io/swig/docs/#api-init
[3]: https://github.com/chjj/marked
