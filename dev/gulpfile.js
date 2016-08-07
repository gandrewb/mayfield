var gulp = require('./gulp')([
    //'imagemin',
    'sass',
	'js',
	'production_js'
]);


 
gulp.task('default', [
	'sass',
	'js'
]);



gulp.task('production', [
	'sass',
	'production_js'
]);