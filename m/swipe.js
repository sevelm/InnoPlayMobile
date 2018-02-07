'use strict';

//const THRESHOLD = 50;
//
//$(() => {
//
//    $('.carousel')
//        .on('touchstart', e => {
//
//            /* FIXME: Chrome warning, passive event listener.
//               https://github.com/jquery/jquery/issues/2871 */
//
//            if (!e.touches.length)
//                return;
//            let start = e.touches[0].pageX;
//            console.log("y: " + e.touches[0].pageY);
//            let y = e.touches[0].pageY;
//            let elOffset = $('.volume').position.top;
//            //if(y < elOffset) {
//                let $this = $(e.currentTarget);
//                $this.on('touchmove', e => {
//                    let x = e.touches[0].pageX;
//                    let diff = start - x;
//                    if (Math.abs(diff) >= THRESHOLD) {
//                        $this.off('touchmove');
//                        $this.carousel(diff > 0 ? 'next' : 'prev');
//                    }
//                });
//            //}
//        })
//        .on('touchcancel', e => {
//            $(e.currentTarget).off('touchmove');
//        });
//});

/*
    Source: https://codepen.io/andrearufo/pen/rVWpyE
 */

$('.carousel').swipe({

    swipe: function(event, direction, distance, duration, fingerCount, fingerData) {

        if (direction == 'left') $(this).carousel('next');
        if (direction == 'right') $(this).carousel('prev');

    },
    allowPageScroll:"vertical"

});