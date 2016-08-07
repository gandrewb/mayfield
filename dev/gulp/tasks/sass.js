var gulp 			= require('gulp'),
	sass 			= require('gulp-ruby-sass'),
	rename 			= require('gulp-rename'),
	autoprefixer 	= require('gulp-autoprefixer');
 
module.exports = function() {
	return sass('./src/sass/', { sourcemap: true, style: 'compact' }) 
		.on('error', function (err) {
		    console.error('Error!', err.message);
		})
		.pipe(autoprefixer({
			browsers: ['last 2 versions'],
			cascade: false
		}))
		.pipe(rename({
			extname: '.built.css'
		}))
		.pipe(gulp.dest('./../styles'));
};