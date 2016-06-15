const fs = require('fs');
const path = require('path');
const sass = require('node-sass');
const nunjucks = require('nunjucks');

const currentDir = process.cwd();
const sourceDir = path.join(currentDir, "source");
const resourcesDir = path.join(currentDir, "resources");
const distDir = path.join(currentDir, "dist");

var nunjucksEnv;
var resources;

function processDirectory(directory) {
    var cbCount = 1;
    var list = fs.readdirSync(directory);
    for (var item of list) {
        switch (path.extname(item).toLowerCase()) {
            case ".html":
                if (path.basename(directory) != "translations" &&
                        fs.statSync(path.join(directory, item)).isFile()) {
                    htmlTranslate(directory, item);
                }
                break;
            case ".scss":
                cbCount++;
                sassCompileFile(directory, item, deploy);
                break;
        }
    }

    function deploy() {
        if (!--cbCount) {
            var list = fs.readdirSync(directory);
            for (var item of list) {
                var fullPath = path.join(directory, item);
                if (fs.statSync(fullPath).isDirectory()) {
                    processDirectory(fullPath);
                }
                else {
                    switch (path.extname(item).toLowerCase()) {
                        case ".css":
                        case ".js":
                            deployFile(directory, item);
                            break;
                        case ".html":
                            if (path.basename(directory) == "translations") {
                                htmlToJs(directory, item);
                            }
                            break;
                    }
                }
            }
        }
    }
    
    deploy();
}

function sassCompileFile(directory, file, cb) {
    file = path.join(directory, file);
    console.log('Compiling ' + file + '...');
    sass.render({
        file: file
    }, function(err, result) {
        if (err) {
            console.log('Failed to compile SCSS file (' + file + '):' + err);
            cb();
        }
        else {
            var targetFile = path.basename(file, path.extname(file)) + ".css";
            fs.writeFile(path.join(directory, targetFile), result.css, function(err) {
                if (err) {
                    console.log('Cannot save file (' + targetPath + '):' + err);
                }
                cb();
            });
        }
    });
}

function htmlToJs(directory, file) {
    file = path.join(directory, file);
    console.log('Deploying HTML as JS: ' + file + '...');
    
    var fileExt = path.extname(file);
    var baseName = path.basename(file, fileExt);
    var langExt = path.extname(baseName);
    var targetDir = path.join(distDir, path.relative(sourceDir, directory));
    var outPath = path.join(targetDir, baseName + '.js');
    var basePath = path.join(path.relative(sourceDir, path.dirname(directory)), path.basename(baseName, langExt) + '.js');

    var html = fs.readFileSync(file, {encoding: 'utf-8'});
    var js = "App.module.templates['" + basePath + "']=\"" +
        html.replace(/[\n]/g, '\\n').replace(/[\r]/g, '\\r').replace(/[\"]/g, '\\"') +
        "\";";

    ensureDir(targetDir);
    fs.writeFileSync(outPath, js);

    if (langExt == ".en") {
        fs.writeFileSync(path.join(distDir, basePath), js);
    }
}

function htmlTranslate(directory, file) {
    if (!nunjucksEnv) {
        resources = fs.readdirSync(resourcesDir);
        
        nunjucksEnv = new nunjucks.configure(sourceDir, {
            tags: {
                variableStart: '{{@',
                variableEnd: '}}'
            }});
            
        const escapeMap = {
            '&': '&amp;',
            '"': '&quot;',
            '\'': '&apos;',
            '<': '&lt;',
            '>': '&gt;'
        };

        nunjucksEnv.addFilter('params', function(str) {
            var args = arguments;
            return nunjucks.runtime.markSafe(str
                .replace(/[&"'<>]/g, function(ch) { return escapeMap[ch]; })
                .replace(/\{\d+\}/g, function(str) {
                    return args[1 + (str.slice(1, str.length - 1) | 0)];
                })); 
            });
    }
    
    var translationsDir = path.join(directory, "translations");
    ensureDir(translationsDir);
    
    for (var resource of resources)
    {
        var lang = path.basename(resource, path.extname(resource)).toLowerCase();
        var fileExt = path.extname(file);
        var outFile = path.basename(file, fileExt) + '.' + lang + fileExt;
        var outPath = path.join(translationsDir, outFile);
        var relativeDir = path.relative(sourceDir, directory);
        var result = nunjucksEnv.render(path.join(relativeDir, file),
            JSON.parse(fs.readFileSync(path.join(resourcesDir, resource))));

        fs.writeFileSync(outPath, result);
    }
}

function deployFile(directory, file, targetDir, targetFile) {
    if (!targetDir) {
        targetDir = path.join(distDir, path.relative(sourceDir, directory));
    }
    ensureDir(targetDir);

    var source = path.join(directory, file);
    var target = path.join(targetDir, targetFile || file);
    
    var rd = fs.createReadStream(source);
    rd.on("error", function(err) {
        console.log('Cannot read file (' + source + '):' + err);
    });
    var wr = fs.createWriteStream(target);
    wr.on("error", function(err) {
        console.log('Cannot write file (' + target + '):' + err);
    });
    wr.on("close", function(ex) {
        done();
    });
    rd.pipe(wr);

    function done(err) {
        console.log('Deployed ' + target);
    }
}

function exists(file) {
    var fileExists;
    try {
        fileExists = fs.statSync(file);
    }
    catch (err) {
        fileExists = false;
    }
    return fileExists;
}

function ensureDir(dir) {
    if (!exists(dir)) {
        ensureDir(path.dirname(dir));
        fs.mkdirSync(dir);
    }
}

processDirectory(sourceDir);