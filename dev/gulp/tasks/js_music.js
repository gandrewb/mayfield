var gulp       = require('gulp'),
    source     = require('vinyl-source-stream'),
    browserify = require('browserify');

module.exports = function () {
  return browserify({
    entries: ['./src/js/music.js'],
    debug: true
  }).bundle()
    .pipe(source('music.built.js'))
    .pipe(gulp.dest('../scripts'));
};