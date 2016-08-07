var gulp		= require('gulp'),
	imagemin 	= require('gulp-imagemin');
 
gulp.task('default', function () {
    return gulp.src('./../imgs/*')
        .pipe(imagemin({
            progressive: true
        }))
        .pipe(gulp.dest('./../imgs/'));
});