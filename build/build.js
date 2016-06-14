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
    var list = fs.readdirSync(directory);
    for (var item of list) {
        var fullPath = path.join(directory, item);
        if (fs.statSync(fullPath).isDirectory()) {
            if (item.toLowerCase() != "translations") {
                processDirectory(fullPath);
            }
        }
        else {
            switch (path.extname(item).toLowerCase()) {
                case ".scss":
                    sassCompileFile(directory, item);
                    break;
                case ".css":
                    if (!exists(path.join(directory, path.basename(item, path.extname(item)) + ".scss"))) {
                        deployFile(directory, item);
                    }
                    break;
                case ".js":
                case ".json":
                    deployFile(directory, item);
                    break;
                case ".html":
                    if (path.basename(directory) != "translations") {
                        htmlTranslate(directory, item);
                    }
                    else {
                        deployFile(directory, item);
                    }
                    break;
            }
        }
    }
    
    var translationsSubDir = path.join(directory, "translations");
    if (exists(translationsSubDir)) {
        processDirectory(translationsSubDir);
    }
}

function sassCompileFile(directory, file) {
    file = path.join(directory, file);
    console.log('Compiling ' + file + '...');
    sass.render({
        file: file
    }, function(err, result) {
        if (err) {
            console.log('Failed to compile SCSS file (' + file + '):' + err);
        }
        else {
            var targetFile = path.basename(file, path.extname(file)) + ".css";
            fs.writeFile(path.join(directory, targetFile), result.css, function(err) {
                if (err) {
                    console.log('Cannot save file (' + targetPath + '):' + err);
                }
                else {
                    deployFile(directory, targetFile);
                }
            });
        }
    });
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
        
        if (lang == "en") {
            deployFile(translationsDir, outFile,
                path.join(distDir, relativeDir), file);
        }
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