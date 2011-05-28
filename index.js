var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var Seq = require('seq');

exports = module.exports = find;
exports.find = find;
function find (base, cb) {
    var em = new EventEmitter;
    
    function finder (dir, f) {
        Seq()
            .seq(fs.readdir, dir, Seq)
            .flatten()
            .seqEach(function (file) {
                var p = dir + '/' + file;
                fs.stat(p, this.into(p));
            })
            .seq(function () {
                this(null, Object.keys(this.vars));
            })
            .flatten()
            .seqEach(function (file) {
                var stat = this.vars[file];
                if (cb) cb(file, stat);
                em.emit('path', file, stat);
                
                if (stat.isDirectory()) {
                    em.emit('directory', file, stat);
                    finder(file, this);
                }
                else {
                    em.emit('file', file, stat);
                    this(null);
                }
            })
            .seq(f.bind({}, null))
            .catch(em.emit.bind(em, 'error'))
        ;
    }
    
    fs.stat(base, function (err, s) {
        if (err) {
            em.emit('error', err);
        }
        else if (s.isDirectory()) {
            finder(base, em.emit.bind(em, 'end'));
        }
        else {
            em.emit('file', base);
            em.emit('end');
        }
    });
    
    return em;
};

exports.findSync = function findSync (dir) {
    if (!fs.statSync(dir).isDirectory()) return [dir];
    
    return fs.readdirSync(dir)
        .reduce(function (files, file) {
            var p = dir + '/' + file;
            var stat = fs.statSync(p);
            files.push(p);
            
            if (stat.isDirectory()) {
                files.push.apply(files, findSync(p));
            }
            
            return files;
        }, [])
    ;
};

exports.find.sync = exports.findSync;
