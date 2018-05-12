const gulp = require('gulp');
const uglify = require('gulp-uglify-es').default;
const cssmin = require('gulp-cssmin');

gulp.task('default', ['styles', 'scripts', 'copy-page'], () => {
  gulp.watch('css/*.css', ['styles']);
  gulp.watch('js/*.js', ['scripts']);
  gulp.watch('page/*', ['copy-page']);
});

gulp.task('dist', [
  'styles',
  'scripts',
  'copy-page'
]);

gulp.task('styles', () => {
  gulp.src('./css/*.css')
    .pipe(cssmin())
    .pipe(gulp.dest('./public/css'));
});

gulp.task('scripts', () => {
  gulp.src(['./js/register_sw.js', './js/dbhelper.js', './js/main.js','./js/restaurant_info.js'])
    .pipe(uglify())
    .pipe(gulp.dest('public/js'));

  gulp.src('./js/sw.js')
    // .pipe(uglify())
    .pipe(gulp.dest('public'));
});

gulp.task('copy-page', () => {
  gulp.src('./page/*')
    .pipe(gulp.dest('./public'));
});
