var gulp = require('./gulp')([
    //'imagemin',
    'sass',
	'js_main',
	'js_main_prod',
	'js_music',
	'js_music_prod'
]);


 
gulp.task('default', [
	'sass',
	'js_main',
	'js_music'
]);



gulp.task('production', [
	'sass',
	'js_main_prod',
	'js_music_prod'
]);