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
Read [jstatic - Flexible static site generation](http://azeemarshad.in/posts/introducing_jstatic.html) for an introduction to jstatic concepts. In your project's Gruntfile, add a section named `jstatic` to the data object passed into `grunt.initConfig()`.

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
is treated as a separate conversion Flow. During each flow, file details are read into a dictionary with the following properties.

* `srcPath` - the source path of the file
* `basename` - the name part of the file
* `ext` - the extension of the source file
* `destPath` - the path where the file will be written to at the end of this flow.
* `content` - the file contents

This dictionary is then passed sequentially through a series of generators (which modify/add items in the dictionary etc.). The resulting data is then written at the destination.

### Configuring jstatic
The minimum configuration required is a [Files Array][1] for each target, specifying the source files and destination.

Each [File Array][1] entry can contain additional properties that determine the conversion. The following file array properties are valid.

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

### Options

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

+ `layout` String (defualt: undefined) - If provided, then after rendering an input file, the rendered contents is passed as a variable `body` to the layout file.

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

## paginator

This generator clones each file in the current flow based on the length of a dependency result. It generates as many clones as the number of pages required to accomodate the length. The following properties are inserted into each file entry

* `page` - 1 indexed page number of the clone
* `pageItems` - the Entries in the current page
* `pageCount` - the total number of pages
* `pageSize` - the size of each page.

### Params
* `pivot` String - name of the dependency whose length will be used to compute the number of pages
* `pageSize` Number (default: 5) - number of items per page.
* `pageBy` Fuction (default: `function(entry,index){return Math.floor(index/pageSize)+1;}`) - a function that identifies the page that an entry in the pivot belongs to. paginator groups entries into pages based this result.

## sequencer

sequencer adds next, previous and whole sequence references to each file entry. This can be used for building navigation between items in a flow. The following properties are inserted into each file entry

* `prev` - reference to the previous file entry in this flow
* `next` - reference to the next file entry in this flow
* `sequence` - reference to an array of all file entries in this flow

## destination

destination allows the user to modify the destination filename and location.

### Params
* `dest` String|function - A template string or a function that returns the filename

A template string can contain interpolated file entry properties eg: `"hello$(sep)$(basename)_$(page)$(outExt)"`.

The function should be of the form `function (entry, outExt, sep, dest)` where the parameters are

* `entry` - the file entry
* `outExt` - the output file extension
* `sep` - the path separator character
* `dest` - the flow destination directory

# Common Tasks

## Generating Collection Pages

During each conversion, an array of final file dictionaries of all dependencies are passed in a `depends` parameter to the generators. The swig generator makes this parameter available inside the template, thus allowing us to generate collection summary pages, like blog home pages, archive pages, tag/category pages etc..

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

## Pagination

Pagination can be done using the paginator. In the previous example if we want to paginate the index.html file by the entries in the "blog_flow", we simply add a paginator

```js
generators: [
  {type: "paginator", pivot: "blog_flow", pageSize: 5},
  "swig"
]
```

The index.html file can be modified to generate only the contents for the current page.

```html
<ul>
    {% for file in blog_flow|sortBy("publishTime")|reverse|pageSlice(page, pageSize) %}
        <li>{{file.publishTime|date("d M Y")}} <a href="{{file.permalink}}">{{file.title}}</a></li>
    {% endfor %}
</ul>
```

This will generate index1.html, index2.html etc. one for each page. Also check the sequencer on how to create page navigation.

## Writing Custom Generators

Generators can be registered using the `jstatic.registerGenerator` function

```js
jstatic.registerGenerator("myGenerator", function(iter, params, flow, depends) {
    ...
    return newIter;
});
```

where the parameters are

* `iter` - This is an iterator from the previous generator. calling `iter()` once will return one file entry. An `undefined` response indicates the end of the sequence.
* `params` - This dictionary contains paramters for the generator. This is a merge of the files array entry and the global options for this generator.
* `flow` - A reference to the flow object.
* `depends` - A dictionary containing the results of all the dependencies of this flow.

Each generator should return an iterator that generates its output.

eg: The following generator adds the length of the title into the file entry

```js
jstatic.registerGenerator("myGenerator", function(iter, params, flow, depends) {    
    return function() {
        var entry = iter();
        if(!entry) return;
        entry.titleLength = entry.title.length;
        return entry;
    };
});

```

[1]: http://gruntjs.com/configuring-tasks#files-array-format
[2]: http://paularmstrong.github.io/swig/docs/#api-init
[3]: https://github.com/chjj/marked
