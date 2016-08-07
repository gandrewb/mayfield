var gulp       = require('gulp'),
    source     = require('vinyl-source-stream'),
    rename     = require('gulp-rename'),
    browserify = require('browserify'),
    es         = require('event-stream'),
	uglify 		= require('gulp-uglify');

module.exports = function() {
	var files = [
        './src/js/dashboard.js',
        './src/js/pages.js',
        './src/js/poll.js'
    ];
    
    var tasks = files.map(function(entry) {
        return browserify({ entries: [entry] })
            .bundle()
            .pipe(source(entry))
            .pipe(uglify())
            .pipe(rename({
                extname: '.conveyor.js'
            }))
            .pipe(gulp.dest('../../scripts/')); 
        });

    return es.merge.apply(null, tasks);
};