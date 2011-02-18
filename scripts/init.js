$(function() {
  jQuery.fx.interval = 1000 / 50;
  $('#slides').present();
  $('#slide3').bind('slideEntered', function() {
    alert("Oh hai, I'm slide 3");
  });
});
