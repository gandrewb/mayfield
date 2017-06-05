var gulp       = require('gulp'),
    source     = require('vinyl-source-stream'),
    browserify = require('browserify'),
    streamify  = require('gulp-streamify'),
    uglify     = require('gulp-uglify');

module.exports = function () {
  return browserify({
    entries: ['./src/js/music.js']
  }).bundle()
    .pipe(source('music.built.js'))
    .pipe(streamify(uglify()))
    .pipe(gulp.dest('../scripts'));
};