$(function() {
  $('#slides').present();
  $('#slide3').bind('slideEntered', function() {
    alert("Oh hai, I'm slide 3");
  });
});
