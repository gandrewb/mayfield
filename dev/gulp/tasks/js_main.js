var gulp       = require('gulp'),
    source     = require('vinyl-source-stream'),
    browserify = require('browserify');

module.exports = function () {
  return browserify({
    entries: ['./src/js/main.js'],
    debug: true
  }).bundle()
    .pipe(source('main.built.js'))
    .pipe(gulp.dest('../scripts'));
};