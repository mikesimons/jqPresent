(function($) {
  $.fn.present = function(options) {

    var defaults = {
      'slideSelector': '.slide',
      'pointSelector': '.point',
      'pagerSelector': '#pager',
      'nextSelector': '#next',
      'prevSelector': '#prev',
      'wrap': false,
      'keys': {
        'prevSlide': 'up',
        'nextSlide': 'down',
        'forward': 'right',
        'backward': 'left',
        'resetSlide': 'ctrl+x',
        'resetPresentation': 'ctrl+shift+x'
      }
    };

    var slideTransitions = {
      'slide-from-top': function(oldSlide, newSlide, completeFunc, direction) { 
        oldSlide.slideUp(500, function () {
          newSlide.slideDown(500, completeFunc)
        });
      },
      'slide-horizontal': function(oldSlide, newSlide, completeFunc, direction) {
        var start = direction > 0 ? $(document).width() : 0 - $(document).width();

        oldSlide.animate({ 'left': 0 - start, 'opacity': 0 }, 500, function() {
          $(this).hide().css({ 'left': 0, 'opacity': 1.0 });
        });

        newSlide.css({ 'left': start, 'opacity': 0 });
        newSlide.show();
        newSlide.animate({ left: 0, opacity: 1.0 }, 750, completeFunc);
      },
      'slide-vertical': function(oldSlide, newSlide, completeFunc, direction) {
        var start = direction > 0 ? $(document).height() : 0 - $(document).height();

        oldSlide.animate({ 'top': 0 - start, 'opacity': 0 }, 500, function() {
          $(this).hide().css({ 'top': 0, 'opacity': 1.0 });
        });

        newSlide.css({ 'top': start, 'opacity': 0 });
        newSlide.show();
        newSlide.animate({ top: 0, opacity: 1.0 }, 750, completeFunc);
      },
      'fade': function(oldSlide, newSlide, completeFunc, direction) {
        newSlide.css('opacity', 1.0);
        oldSlide.fadeOut(500, function() {
          newSlide.fadeIn(1000, completeFunc);
        });
      }
    };

    var pointTransitions = {
      'fade': function(point, direction) {
        var h = point.css('height');
        if(direction > 0) {
          point.css({ opacity: 0, height: 0 });
          point.show();
          point.animate({ opacity: 1.0, height: h }, 250);
        } else {
          point.animate({ opacity: 0, height: 0 }, 250, function() {
            point.hide();
            point.css({ opacity: 1.0, height: h });
          });
        }
        direction > 0 ? point.fadeIn(500) : point.fadeOut(500);
      }
    };

    return this.each(function() {

      var $present = $(this);

      // Previously visited slide
      $present.oldSlide = null;

      // Slide currently being shown
      $present.currentSlide = null;

      // true if a transition is happening
      $present.transitioning = false;

      // All slides
      $present.slides = null;

      // Plugin initialisation
      $present.init = function(options) {

        $present.options = $.extend(defaults, options);

        if(options && options.keys) {
          $present.options.keys = $.extend(defaults.keys, options.keys)
        }

        $present.slides = $present.find($present.options.slideSelector);
        $present.slides.hide();

        $present.resetPresentation($present.hash());

        // Next link hook
        $($present.options.nextSelector).click(function() {
          $present.forward(1);
          return false;
        });

        // Prev link hook
        $($present.options.prevSelector).click(function() {
          $present.backward(1);
          return false;
        });

        // key bindings
        $.each($present.options.keys, function(k,v) {
          $(document).bind('keyup', v, $present[k]);
        });

        // Pager link creation + event hook
        var pagerLinks = $present.slides.map(function(k,v) {
          return '<li><a href="#"' + (k+1) + '">' + (k+1) + '</a></li>';
        }).get().join("\n");
        $($present.options.pagerSelector).html(pagerLinks).click(function(e) {
          var t = parseInt($(e.target).text());
          if($present.hash() != t) $present.changeSlide(t);
          return false;
        });

      };

      // Reset presentation as if just loaded
      $present.resetPresentation = function(n) {
        if(typeof n != 'integer') n = null;
        $present.changeSlide(n || 1, { quietly: true });
        $present.hidePoints();
      };

      // Reset slide as if it had just been entered
      $present.resetSlide = function(slide) {
        if(slide.target) slide = null;
        if(typeof slide == 'integer') slide = $present.slides[slide - 1];
        $present.hidePoints(slide || $present.currentSlide);
      };

      // Go forward n steps (if there are hidden points they will be shown, oterwise next slide)
      // Note: Will only operate on either points or slides
      // As such if there is one hidden point and forward(2) is called then the point will be shown but the slide will not change
      $present.forward = function(n) {
        if(typeof n != 'integer') n = 1;
        $present.go(n);
      };

      // Go back n steps (if there are visible points they will be hidden, oterwise previous slide)
      // Note: Will only operate on either points or slides
      // As such if there is one visible point and backward(2) is called then the point will be hidden but the slide will not change
      $present.backward = function(n) {
        if(typeof n != 'integer') n = 1;
        $present.go(0-n);
      };

      // Go forward n slides
      $present.nextSlide = function(n) {
        if(typeof n != 'integer') n = 1;
        $present.goSlide(n);
      };

      // Go backwards n slides
      $present.prevSlide = function(n) {
        if(typeof n != 'integer') n = 1;
        $present.goSlide(0-n);
      };

      // Find points and hide those too but only those on slides >= to current
      $present.hidePoints = function(only) {
        var slides = only ? only : $present.slides;
        var hide = only ? true : false;
        slides.each(function(k,v) {
          if(!hide) hide = (v == $present.currentSlide[0]) ? true : false;
          if(hide) $present.pointsOnSlide($(v)).hide();
          $(v).data('visited', !hide);
        });
      };

      // Perform the next /prev action
      $present.go = function(n) {
        var filter = n > 0 || $present.currentSlide.data('visited') ? ':hidden' : ':visible';
        var points = $present.pointsOnSlide($present.currentSlide, filter);
        (points.filter(filter).length == 0) ? $present.goSlide(n) : $present.goPoint(n);
      };

      // Switch slides relatively
      $present.goSlide = function(n) {
        var newSlide = $present.hash() + n;

        if($present.options.wrap) {
          newSlide = newSlide % ($present.slides.length + 1);
          newSlide = n > 0 && newSlide == 0 ? 1 : (newSlide || $present.slides.length);
        } else if(newSlide <= 0 || newSlide > $present.slides.length) {
          return false;
        }

        $present.changeSlide(newSlide);
      };

      // Show points relatively
      $present.goPoint = function(n) {
        var filter = n > 0 || $present.currentSlide.data('visited') ? ':hidden' : ':visible';
        var points = $present.pointsOnSlide($present.currentSlide, filter);
        var toShow = n > 0 ? points.get().slice(0, n) : points.get().slice(n, points.length - n);

        $(toShow).each(function(k, v) {
          v = $(v);
          var t = pointTransitions[v.data('transition')];
          if(t) {
            t(v, n);
          } else {
            n > 0 ? v.show() : v.hide();
          }
        });

        if($present.pointsOnSlide($present.currentSlide, ':hidden').length == 0) {
          $present.currentSlide.data('visited', true);
        }
      };

      // Switch slide absolutely
      $present.changeSlide = function(newSlideNo, opts) {
        var direction = newSlideNo - $present.hash();
        $present.hash(newSlideNo);

        if($present.transitioning) {
          $present.oldSlide.stop(false, true);
          $present.currentSlide.stop(false, true);
        }

        var oldSlide = $present.currentSlide;
        var newSlide = $present.slides.filter(':nth-child(' + newSlideNo + ')');

        var t = null;
        if(!opts || (opts && !opts['quietly'])) {
          t = slideTransitions[newSlide.data('transition')];
        }

        if(t) {
          var overflow = $('body').css('overflow');
          var completeFunc = function() { 
            $present.transitioning = false;
            oldSlide.hide();
            newSlide.show();
            $('body').css('overflow', overflow);
          };

          $present.transitioning = true;
          $('body').css('overflow', 'hidden');
          t(oldSlide, newSlide, completeFunc, direction);

        } else {

          if(oldSlide) oldSlide.hide();
          newSlide.show();
          $present.transitioning = false;
        }

        if(oldSlide && $present.pointsOnSlide(oldSlide, ':hidden').length == 0) {
          oldSlide.data('visited', true);
        }

        $present.oldSlide = oldSlide;
        $present.currentSlide = newSlide;
      };

      $present.hash = function(v) {
        if(v) window.location.hash = '#' + v;
        return parseInt(window.location.hash.substr(1));
      };

      $present.pointsOnSlide = function(slide, filter) {
        var p = slide.find($present.options.pointSelector)
        if(filter) p = p.filter(filter);
        return p;
      };

      $present.init();

    });
  }
})(jQuery);

// vim:ts=2 sw=2 et
