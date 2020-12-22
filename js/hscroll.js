var lastScrollFireTime = 0;

$.fn.hScroll = function(options) {
    var amount = options || 20

    function scroll(obj, e) {
        var minScrollTime = 50;
        var now = new Date().getTime();
        var evt = e.originalEvent;
        var direction = evt.detail ? evt.detail * (-amount) : evt.wheelDelta;

        if (direction > 0) {
            direction = $(obj).scrollLeft() - amount;
        } else {
            direction = $(obj).scrollLeft() + amount;
        }

        //$(obj).scrollLeft(direction);
        if (now - lastScrollFireTime > (minScrollTime)) {
            lastScrollFireTime = now;
            $(obj).animate({scrollLeft: direction}, minScrollTime, 'linear');
        }

        e.preventDefault();
    }

    //$(this).width($(this).find('div').width());

    $(this).bind('DOMMouseScroll mousewheel', function(e) {
        scroll(this, e);
    });
}

$(document).ready(function() {
    $(".highlight > pre").hScroll(35); // You can pass (optionally) scrolling amount
});