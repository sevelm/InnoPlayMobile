/* -*- coding: utf-8 -*- */

'use strict';

/* FIXME: Use jekyll to generate installable file */
/* FIXME: Create proper plugin */
/* FIXME: Number of items returner currently capped */
/* FIXME: Pagination for large number of returned items */
/* FIXME: Plugin search (e.g. spotty) */
/* FIXME: Less space in browser modal */
/* FIXME: Full height album art in browser modal */
/* FIXME: Server rescaling of album art, request correct size for main view and browser/playlist view */
/* FIXME: Merge playlist, browser view */
/* FIXME: Global "mute all"-button */
/* FIXME: Implement search across local lib + plugins */
/* FIXME: Navbar att bottom of screen */
/* FIXME: Navbar larger size esp. on larger screens */
/* FIXME: Spinner when loading browser menu items. Also spinner when polling */
/* FIXME: Handle timeout/404/etc when loading browser menu items */
/* FIXME: Pre-load podcast icons in background. */
/* FIXME: Why no icons for favorites? */
/* FIXME: On screen/non-touch: hide playlist controls until hover,
          then display on top  */
/* FIXME: Terminology Unsync/Include */
/* FIXME: When selected player in group of >=3 players, offer to unlink it from
          the rest of group with one click, i.e. Unsync from P2+P3 */
/* FIXME: Option to save current sync setup, e.g. kitchen+bedroom etc (local storage only) */

/* ------------------------------------------------------------------------ */
/*                                                                          */
/* Some initialization                                                      */
/*                                                                          */
/* ------------------------------------------------------------------------ */

const DEBUG = /\/\?debug/.test(window.location.href);
const MOBILE = /Mobi/.test(navigator.userAgent);

const POLL_INTERVAL = DEBUG ? 3000 : 500; /* ms */

/* LocalStorage */
const STORAGE_KEY_ACTIVE_PLAYER = 'active_player';

/* DOM node storage */
const DATA_KEY_PLAYLIST_TIMESTAMP = 'playlist_timestamp';

/* ------------------------------------------------------------------------ */
/*                                                                          */
/* Debugging helpers                                                        */
/*                                                                          */
/* ------------------------------------------------------------------------ */

window.log = DEBUG ? console.log : () => { /* ignore */ }
DEBUG && $.getScript('debug.js').done(()=> {
    $('body').addClass('debug');
    log('Screen dimensions (w\u00D7h): ' +
        screen.width + '\u00D7' +
        screen.height);
});

/* ------------------------------------------------------------------------ */
/*                                                                          */
/* Serviceworker (only works if served over https)                          */
/*                                                                          */
/* ------------------------------------------------------------------------ */

if ('serviceWorker' in navigator) {
    log('Service Worker available');
    navigator.serviceWorker
        .register('./sw.js')
        .then(reg => log('Service worker installed'))
        .catch(err => log('Service Worker not registered: ' + err));
}

/* ------------------------------------------------------------------------ */
/*                                                                          */
/* Util
/*                                                                          */
/* ------------------------------------------------------------------------ */

function from_template(selector) {
    /* Instantiate a <template>-element */
    return $($(selector).html())
}

function format_time(s) {
    /* seconds -> 'mm:ss' or 'hh:mm:ss' */
    return s < 0 ?
        '-' + format_time(-s)
        : s > 3600 ?
        new Date(1000 * s).toISOString().slice(11, -5) :
        new Date(1000 * s).toISOString().slice(14, -5);
}

$(window).resize(() => {
    log('Deleteing image dimensions context cache');
    window.img_dims = {};
})
function rescaled($img, context, url) {
    /* Let the server handle image rescaling */
    return $img.attr('src', url);

    var img_dims = window.img_dims = window.img_dims || {};
    if (!img_dims[context] && $img.width()) {
        log('Has dimenstions, rescaling and storing ' + url);
        img_dims[context] = [$img.width(), $img.height()]
    }
    if (img_dims[context]) {
        let [w, h] = img_dims[context];
        log('Known context dimensions for ' + context +
            ', rescaling ' + url);
        let new_url = ''.concat(
            url.slice(0, url.lastIndexOf('.')),
            '_', w, 'x', h,
            url.slice(url.lastIndexOf('.')))
        log('Rescaling ' + url + ' to ' +
            new_url + ' (' +
            w + 'x' +
            h + ')');
        return $img.attr('src', new_url)
    }
    log('Not rescaling ' + url);
    return $img.attr('src', url);
}

/* ------------------------------------------------------------------------ */
/*                                                                          */
/* Init & events                                                            */
/*                                                                          */
/* ------------------------------------------------------------------------ */

var sliding = false;
var menuback = undefined;
var active_player = null;

$('.carousel').carousel({interval:false}); /* Do not auto-rotate */

/* ------------------------------------------------------------------------ */
/*                                                                          */
/* Startup                                                                  */
/*                                                                          */
/* ------------------------------------------------------------------------ */

function server_ready(_, server) {
    log('Server ready');

    let last_active_idx = Math.max(
        0, /* fallback to first player */
        server.players.map(player => player.html_id)
            .indexOf(localStorage.getItem(STORAGE_KEY_ACTIVE_PLAYER)));

    $('.carousel').carousel(last_active_idx);
    player_activated(server.players[last_active_idx]);
    $('#players').slideDown();

    /* start polling for updates */
    /* FIXME: must update all players some times anyway (sync groups etc) */
    setInterval(() => {
        $('#volumes').is(':visible')
            ? server.update_players()
            : active_player.update();
    }, POLL_INTERVAL);

    $('.carousel').on('slide.bs.carousel', ev => {
        player_activated(server.players[ev.to]);
    });

    let shortcuts = [
        {title: langDocument['favorites'],    cmd: 'favorites',   icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAPTSURBVGhD7ZldaE5xHMe3eZuZ2IX3WYobo7hByJS4kom5ok1IU6jlZsxyQWlyZXOjkFhSJFuWcUV5jRQJo8iFC6vZ0Gw223x+Z98zVp495zzP2XN2cT717X/O9///vZzn/fyftIiIiIiIiLDo6+vLQFk6TZje3t4JOkwNND2ZortRPfqMuvH6GFvQc3QMzdfy/8LyMazZgK6gd6hDOdrRa1SD1mClKyQ4SDwOlaNWK+rCeRf6inpkOXB+Hc1S+AB4heiTljlw/pOhrf/sL/iP0CqFJg/JZqCHym8FbqJi87XEfZSXomrUonXfUaHmx3J80XzxjPM9aLaTADi2B2sROoyci2W0B+ggSu7ZIdG0f5I2oRWaiglLs1l3TjH2jNlF1+ncXoJbtDQmLM1k3SHkvnSrNeUfJXtsieAuytGUJ4jdiXr7w51m3qOBZ8ALhK0lpl3xpbL9QWC5EjQxTJLtC2IrLQe0cTzkh0AsiCtChn0YDLycPUHhHIKcNzbjStm+ITyd+EZUJCshiK9VL2dkeYOAnQpskJUw5Jiow4ShlTnk6UE/0DjZ8WFxvS6kRFbo0Mt99bReVnxY/FFBubJCh16OqqcKWfFhcSeyz/DRskKHfkp1IadlDY01r4BOWSMC+ilRX+dkxYfF3ywIkv5BGBT0VGYNMZ6UFR8Wv1HQAlmhQy+n1NMBWfFh8WUF7ZAVOvTyRD2tlhUfFu9T0FVZoUIfU1E3+kVb2bLjQ8BMZF9Adq8wWXZo0If7/rghyzsE3VJwpaxQoAW7RXC/1zbJ9g5BBQq2G6cpslMOtfeqj1cMGbL9QfAdJamVlVKom0t55+6R482y/UPwXGS3opZom+yUQMlR1Lyn2nWyE4ck7lNr9wNLZA871KpR3S/I331ILEh0SUm/MiyWPWxQ57jq2UdugezkIZltDDQqeTNaqKnAIfcR1TG2yw4Oko5Ht1XEnu7lmgoE0tpmX5XyG2WaCh5qZFHA/SSzn/rFmkoK0tnOi7vTYl/EiW00+IFameiCFTUoeoIh4fsW4uehl8ple2EbNZUaKFiGfquBBwx5mvIMcVuRc8vAaNtF+ZpKLRReh5rVSCvytFvCcnspnbc4g+MGBl/7ZoFDA9NpxPldZnB8liHmL1TmlyDbK7O1HWg/h8FvWCeCNWINWWNq0HbZB315Ymfg2TZol9a8QCPmxm0QNJaPnqpR2/etsAtAeci2Xc2391UVo/f9qTCgydF2AXYhatz+HrBfBHb8FgX6/TPs0PAy9MEuwODY/lbwfnc3kqBx+4frGtolKyIiIiIC0tL+AJigFSdcHTWuAAAAAElFTkSuQmCC'},
        {title: langDocument['apps'],         _cmd: 'apps',        icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAL4SURBVGhD7ZZLSFRhGIbV0OxGNzXKsghD3ARdpI0RJUR0IWyRbdoUQrQQAgNt1QWCglppKW4iWklFWJpBtKlFF4ggEkIJgy5mUS5SyGrs+Y7vHJr+GS/b+B54+f//fd9vTqc5M2OW4ziO4ziO4ziO40zO2NhYbiKRKEZL2efInjLMzUQr0BJZ04K5WVx3FetiWdNDF2/jRYZQBOcBdI7tfNUyQq+cXjvrSDQM7PvRCbb5qmWE3ibUjUbHp6P5V+gI2xmqTQzlCvRZw8Zb9M7OBvteltWqB5DvQsPq/kJv0KCdDfZPWRaqHkBea3PqjqI+9NXOBvvbLHmqp4dCAcXooqzX0UpFdoG16JGyFyy5imLwy1HyJi6xFCiy167E61HWJTsF/K3Ibt5u5CTrPPPZ57Dfid5r/nI0kAkK9uhYsZMlW3YM3myyl+oclh2D3a6sWVYK+IVoQJ1tsmPwniirl5UCfhkaQXaza2SHENpjY2yQFUCnxgqsnbIisPLwkhcplB1AZp8Tm2+SFcF5ufwvLMG7nYS8Vb3jskIIf6Lf9IJ3Iwl5qV7otawIrBL5vbLSQl6l3j1ZEZy3yL8vKy3kh9RrkRVC+N1KMFdWAJ11VmB9LiuCc5H8QVlpId+n3g1ZEZwr5D+TlRbyY+pdlBVC+EClg7ICyE6r0yorBq/fMqiUFUDnmjoNsiI42+cv+WjGXzL/QvbQhlkPyAqxUKVPqFR2DN5mNIyM9bJj8Bo134OKZMfg7UeGvUax7Bi8Fs3bf2jwVODXK/+A5sgOoZNN4ZaVYYj9WbQD7UFN6IcFrOc1kgJRPtljdT6iRrQdVaOryD5/lh3VSApE9vXfp04vqkNVqAZ1yLd3bLdGMkM3H12hnLDBv8GyL4MzbDP+uUK+CN0dn0gF3x6dtDeRhFoJHfvRDMD/hqpVnRoMbEQX0B3UgU6hMsWTQtd+3JpRF7rJv6OBdZniCaFrP4B7URvq5mx/7tSxLlDFcRzHcRzHcRzHcf5vsrL+ACxwI8ofIZf1AAAAAElFTkSuQmCC'},
        {title: langDocument['radio'],     _cmd: 'radios',      icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAQdSURBVGhD7ZlZiI1hGMfHzFiaSGPIyHIhNMWFtUQhXHGFrLkgIsoNEsUFGlFmQmMbEllyabuwRFK2stzYS9QojZElyRhjjt///Z5znOnMjPecOc7C+dd/nvd93mc93/utk5dDDv8xQqFQh6ampmr4Hd5iXmpL2QEKzoejKH4HMhrbzSRzQdH94GJ4Gr6zwpsB/WYzzxxQV1cKmwZ3wSdBqb+B7jGshDthDTyDutjc0weKyKeY0XADvAa/u4oNzN/BUwwXIfuZW2ZABcElUNulLig5AHOdwFcZrkeOROabW/pBMdou0+Fu+FQFRwPdI6jtMo1pkbmlHxSj7TIGbmB8HZl524XEnSmgo00jQDeAtaVQ2+W9Cg6DeT3MjO1CAePgHdgItY8vwDlwD8yO7UIhugl9tQL16/7QOBroMu/qQjFFcGCYFHYFqWLPw6FwBHxgOl3XZ8FBsk0nqaE/soNrgonuos1OzmwCtT+FfdWIO1GRL7OQ7p6ELNe2cnCHJ8tAAytUO3JfrpFkgSJKSK8Tt7epvJHWRkillyQ9vuhGWhtkD8C8Ad6Aa2CJubQKbNLTCAl1l78XZAyA7it8Ad/CJlNL/xGxHhaYewyw8W8Eoz6wh00TBjH09NugXMg3CBU50JYdmHdhbQY8JzuB8UVEi+8frPk1gsEmKOiQLzR13CC87v7u10ZUIrraUqvAbgpUw/K5jehkSxGg/3MjqAoxqA9WnfETW4oLuA7HN3zDPQpH+RK/mVBbTPkPW8gI0HkfkVe2LONLpo4L+MU8YCYC4ghjLawDc79GUOvXPAtPMB5gam/gN16xkZ8ROskTIv7PkTE/JnP/k709IMERxUauM1VCwL8b/AL1StHL1Clt5LViI/ubKmEQQ7tCsRaYKr5GMBoM4y6EkLqU/kR+glPbS2JVI1X0Rkvh3wjq7VpTQXC5qb2AW5l8kw3qOGIp/BpBpcuvu4EJjJ/ZkhdwKTU/3bmvJIHu4x2ywlL4HxEM3NVCYHze1N7A5zP8hnvMx4t4QZxtVscqU/k3groMo+NwP0zk6fSmYiMnmCphRMUaZyr/RtqLqER6dmrxJPYh/vOQiqNHlsinpaj4f7cRwhaTJGnfA4i1yUI7pKwRgSQVlkIJ78KWTuS2+MF8axDNvpehS10jhC4gkb46KuFDhPd/m7BfCwUd1UmmjgB96hoRCN+dZPeVB1kHVzJs9UrG+jB42ez1CjHflpoBfWobEUihL/Qng2wu+Qd4DK6GC1AtQ5ZD17DAuBZOtBAxYC31jYRBUv13Si9KrYJ1NbmFYZsvYNikr5EwSD5EhcAqeAruhRvhZMopNLM2gW36G0kG/s1G+NPoOgmFZmcbqf0QUo1UqZFrmmQz6GGutlZPBlvhwSzkARh5Y8whh6QjL+8XSdgtLh3gSdoAAAAASUVORK5CYII='},
        {title: langDocument['media'],       _cmd: 'musicfolder', icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAGDSURBVGhD7Zk9SgNRFIUHbBRUsE+Vwl5cgOACrEyhhVsQd6CFCJaK9oKV+7BwAdqIqIWdaEDS+DP63eTIM5C8TECSq9wPDnfmvvdmzsljGMgUQRBUoyzLKXSInj8rwLwHtKzlfsDUgQx+oKecmNbU3BdKXZfwAaYekTGvVhbmnSjMOWVC7fFjpqCp04EQYBbd2iLqDmVuFOJeM7LQGyYZlYMYXHQJvWvtyOCed5SGbHTTmTJcEIOLrqJr1PN5+m2ZRzPKsf2Ai7KRsEEYOsg4IMSumaXuqZVox/g7QdbNLPVYrUQ7RmfbJlHdqzBfGxiEAePNjj2Dx1fVvjtigy1041j3qJTXvjtib/WaWm7B6nY2CPyfh12nrokg3ogg3ogg3ogg3ogg3ogg3ogg3ogg3ogg3ogg3ogg3ogg3sgGoWl/l7Z06hp8bijIkVoJmpca3Kc0vAp/a+iCY/O6KfsJmivI/SeFb/B6RZmW/W4YXEC2I2dehb9TtIXyX3eDIPhBUXwBsS4cav+VeSIAAAAASUVORK5CYII='}];

    /* FIXME: Only display podcasts shortcuts if pocketcasts not available */

    $.when(... shortcuts.map(
        item => active_player.query('can', item.cmd, 'items', '?')))
        .then((...res) => {
            $('#toolbar')
                .prepend(shortcuts.filter(
                    (shortcut, idx) => res[idx].result._can).map(
                        item =>
                            from_template('#shortcut-template')
                            .attr('title', item.title)
                            .find('a')
                            .attr('data-shortcut', item.cmd)
                            .end()
                            .find('.fa')
                            .addClass(item.icon)
                            .end()
                    ));
        });

    let main_menu = {
        title: 'Browser', items: [
            {title: langDocument['favorites'],    cmd: 'favorites',   icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAPTSURBVGhD7ZldaE5xHMe3eZuZ2IX3WYobo7hByJS4kom5ok1IU6jlZsxyQWlyZXOjkFhSJFuWcUV5jRQJo8iFC6vZ0Gw223x+Z98zVp495zzP2XN2cT717X/O9///vZzn/fyftIiIiIiIiLDo6+vLQFk6TZje3t4JOkwNND2ZortRPfqMuvH6GFvQc3QMzdfy/8LyMazZgK6gd6hDOdrRa1SD1mClKyQ4SDwOlaNWK+rCeRf6inpkOXB+Hc1S+AB4heiTljlw/pOhrf/sL/iP0CqFJg/JZqCHym8FbqJi87XEfZSXomrUonXfUaHmx3J80XzxjPM9aLaTADi2B2sROoyci2W0B+ggSu7ZIdG0f5I2oRWaiglLs1l3TjH2jNlF1+ncXoJbtDQmLM1k3SHkvnSrNeUfJXtsieAuytGUJ4jdiXr7w51m3qOBZ8ALhK0lpl3xpbL9QWC5EjQxTJLtC2IrLQe0cTzkh0AsiCtChn0YDLycPUHhHIKcNzbjStm+ITyd+EZUJCshiK9VL2dkeYOAnQpskJUw5Jiow4ShlTnk6UE/0DjZ8WFxvS6kRFbo0Mt99bReVnxY/FFBubJCh16OqqcKWfFhcSeyz/DRskKHfkp1IadlDY01r4BOWSMC+ilRX+dkxYfF3ywIkv5BGBT0VGYNMZ6UFR8Wv1HQAlmhQy+n1NMBWfFh8WUF7ZAVOvTyRD2tlhUfFu9T0FVZoUIfU1E3+kVb2bLjQ8BMZF9Adq8wWXZo0If7/rghyzsE3VJwpaxQoAW7RXC/1zbJ9g5BBQq2G6cpslMOtfeqj1cMGbL9QfAdJamVlVKom0t55+6R482y/UPwXGS3opZom+yUQMlR1Lyn2nWyE4ck7lNr9wNLZA871KpR3S/I331ILEh0SUm/MiyWPWxQ57jq2UdugezkIZltDDQqeTNaqKnAIfcR1TG2yw4Oko5Ht1XEnu7lmgoE0tpmX5XyG2WaCh5qZFHA/SSzn/rFmkoK0tnOi7vTYl/EiW00+IFameiCFTUoeoIh4fsW4uehl8ple2EbNZUaKFiGfquBBwx5mvIMcVuRc8vAaNtF+ZpKLRReh5rVSCvytFvCcnspnbc4g+MGBl/7ZoFDA9NpxPldZnB8liHmL1TmlyDbK7O1HWg/h8FvWCeCNWINWWNq0HbZB315Ymfg2TZol9a8QCPmxm0QNJaPnqpR2/etsAtAeci2Xc2391UVo/f9qTCgydF2AXYhatz+HrBfBHb8FgX6/TPs0PAy9MEuwODY/lbwfnc3kqBx+4frGtolKyIiIiIC0tL+AJigFSdcHTWuAAAAAElFTkSuQmCC'},
            {title: langDocument['apps'],         _cmd: 'apps',        icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAL4SURBVGhD7ZZLSFRhGIbV0OxGNzXKsghD3ARdpI0RJUR0IWyRbdoUQrQQAgNt1QWCglppKW4iWklFWJpBtKlFF4ggEkIJgy5mUS5SyGrs+Y7vHJr+GS/b+B54+f//fd9vTqc5M2OW4ziO4ziO4ziO40zO2NhYbiKRKEZL2efInjLMzUQr0BJZ04K5WVx3FetiWdNDF2/jRYZQBOcBdI7tfNUyQq+cXjvrSDQM7PvRCbb5qmWE3ibUjUbHp6P5V+gI2xmqTQzlCvRZw8Zb9M7OBvteltWqB5DvQsPq/kJv0KCdDfZPWRaqHkBea3PqjqI+9NXOBvvbLHmqp4dCAcXooqzX0UpFdoG16JGyFyy5imLwy1HyJi6xFCiy167E61HWJTsF/K3Ibt5u5CTrPPPZ57Dfid5r/nI0kAkK9uhYsZMlW3YM3myyl+oclh2D3a6sWVYK+IVoQJ1tsmPwniirl5UCfhkaQXaza2SHENpjY2yQFUCnxgqsnbIisPLwkhcplB1AZp8Tm2+SFcF5ufwvLMG7nYS8Vb3jskIIf6Lf9IJ3Iwl5qV7otawIrBL5vbLSQl6l3j1ZEZy3yL8vKy3kh9RrkRVC+N1KMFdWAJ11VmB9LiuCc5H8QVlpId+n3g1ZEZwr5D+TlRbyY+pdlBVC+EClg7ICyE6r0yorBq/fMqiUFUDnmjoNsiI42+cv+WjGXzL/QvbQhlkPyAqxUKVPqFR2DN5mNIyM9bJj8Bo134OKZMfg7UeGvUax7Bi8Fs3bf2jwVODXK/+A5sgOoZNN4ZaVYYj9WbQD7UFN6IcFrOc1kgJRPtljdT6iRrQdVaOryD5/lh3VSApE9vXfp04vqkNVqAZ1yLd3bLdGMkM3H12hnLDBv8GyL4MzbDP+uUK+CN0dn0gF3x6dtDeRhFoJHfvRDMD/hqpVnRoMbEQX0B3UgU6hMsWTQtd+3JpRF7rJv6OBdZniCaFrP4B7URvq5mx/7tSxLlDFcRzHcRzHcRzHcf5vsrL+ACxwI8ofIZf1AAAAAElFTkSuQmCC'},
            {title: langDocument['radio'],     _cmd: 'radios',      icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAQdSURBVGhD7ZlZiI1hGMfHzFiaSGPIyHIhNMWFtUQhXHGFrLkgIsoNEsUFGlFmQmMbEllyabuwRFK2stzYS9QojZElyRhjjt///Z5znOnMjPecOc7C+dd/nvd93mc93/utk5dDDv8xQqFQh6ampmr4Hd5iXmpL2QEKzoejKH4HMhrbzSRzQdH94GJ4Gr6zwpsB/WYzzxxQV1cKmwZ3wSdBqb+B7jGshDthDTyDutjc0weKyKeY0XADvAa/u4oNzN/BUwwXIfuZW2ZABcElUNulLig5AHOdwFcZrkeOROabW/pBMdou0+Fu+FQFRwPdI6jtMo1pkbmlHxSj7TIGbmB8HZl524XEnSmgo00jQDeAtaVQ2+W9Cg6DeT3MjO1CAePgHdgItY8vwDlwD8yO7UIhugl9tQL16/7QOBroMu/qQjFFcGCYFHYFqWLPw6FwBHxgOl3XZ8FBsk0nqaE/soNrgonuos1OzmwCtT+FfdWIO1GRL7OQ7p6ELNe2cnCHJ8tAAytUO3JfrpFkgSJKSK8Tt7epvJHWRkillyQ9vuhGWhtkD8C8Ad6Aa2CJubQKbNLTCAl1l78XZAyA7it8Ad/CJlNL/xGxHhaYewyw8W8Eoz6wh00TBjH09NugXMg3CBU50JYdmHdhbQY8JzuB8UVEi+8frPk1gsEmKOiQLzR13CC87v7u10ZUIrraUqvAbgpUw/K5jehkSxGg/3MjqAoxqA9WnfETW4oLuA7HN3zDPQpH+RK/mVBbTPkPW8gI0HkfkVe2LONLpo4L+MU8YCYC4ghjLawDc79GUOvXPAtPMB5gam/gN16xkZ8ROskTIv7PkTE/JnP/k709IMERxUauM1VCwL8b/AL1StHL1Clt5LViI/ubKmEQQ7tCsRaYKr5GMBoM4y6EkLqU/kR+glPbS2JVI1X0Rkvh3wjq7VpTQXC5qb2AW5l8kw3qOGIp/BpBpcuvu4EJjJ/ZkhdwKTU/3bmvJIHu4x2ywlL4HxEM3NVCYHze1N7A5zP8hnvMx4t4QZxtVscqU/k3groMo+NwP0zk6fSmYiMnmCphRMUaZyr/RtqLqER6dmrxJPYh/vOQiqNHlsinpaj4f7cRwhaTJGnfA4i1yUI7pKwRgSQVlkIJ78KWTuS2+MF8axDNvpehS10jhC4gkb46KuFDhPd/m7BfCwUd1UmmjgB96hoRCN+dZPeVB1kHVzJs9UrG+jB42ez1CjHflpoBfWobEUihL/Qng2wu+Qd4DK6GC1AtQ5ZD17DAuBZOtBAxYC31jYRBUv13Si9KrYJ1NbmFYZsvYNikr5EwSD5EhcAqeAruhRvhZMopNLM2gW36G0kG/s1G+NPoOgmFZmcbqf0QUo1UqZFrmmQz6GGutlZPBlvhwSzkARh5Y8whh6QjL+8XSdgtLh3gSdoAAAAASUVORK5CYII='},
            {title: langDocument['media'],       _cmd: 'musicfolder', icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAGDSURBVGhD7Zk9SgNRFIUHbBRUsE+Vwl5cgOACrEyhhVsQd6CFCJaK9oKV+7BwAdqIqIWdaEDS+DP63eTIM5C8TECSq9wPDnfmvvdmzsljGMgUQRBUoyzLKXSInj8rwLwHtKzlfsDUgQx+oKecmNbU3BdKXZfwAaYekTGvVhbmnSjMOWVC7fFjpqCp04EQYBbd2iLqDmVuFOJeM7LQGyYZlYMYXHQJvWvtyOCed5SGbHTTmTJcEIOLrqJr1PN5+m2ZRzPKsf2Ai7KRsEEYOsg4IMSumaXuqZVox/g7QdbNLPVYrUQ7RmfbJlHdqzBfGxiEAePNjj2Dx1fVvjtigy1041j3qJTXvjtib/WaWm7B6nY2CPyfh12nrokg3ogg3ogg3ogg3ogg3ogg3ogg3ogg3ogg3ogg3ogg3ogg3sgGoWl/l7Z06hp8bijIkVoJmpca3Kc0vAp/a+iCY/O6KfsJmivI/SeFb/B6RZmW/W4YXEC2I2dehb9TtIXyX3eDIPhBUXwBsS4cav+VeSIAAAAASUVORK5CYII='}]};

    $('#browser').on('show.bs.modal', (ev) => {
        /* FIXME: make back button close modal
           https://gist.github.com/thedamon/9276193 */
        let modal = this;
        log(modal, this);
        let shortcut = $(ev.relatedTarget).data('shortcut');
        if (shortcut) {
            /* FIXME: reuse browse_level function below */
            /* FIXME: delay modal display until dynamic content finished loaded */
            let sc = shortcuts.find(s => s.cmd == shortcut);
            if(sc == undefined) {
                sc = shortcuts.find(s => s._cmd == shortcut);
                active_player.query(shortcut, 0, 99).then(
                    res => {
                    browse_menu([{title: sc.title,
                                    items: res.result[Object.keys(res.result).find(key => /loop/.test(key))],
                                    context: sc}])
                });
            } else {
                active_player.query(shortcut, 'items', 0, 99).then(
                    res => {
                    browse_menu([{title: sc.title,
                                    items: res.result[Object.keys(res.result).find(key => /loop/.test(key))],
                                    context: shortcut}])
                });
            }
        } else
            browse_menu([main_menu]);
    });
}

function player_created(_, server, player) {
    let idx = server.players.length - 1;

    log('New player', idx, player.name);

    from_template('#playerslist-template')
        .addClass(player.html_id)
        .appendTo('#playerslist.navbar-nav')
        .addClass(idx ? '' : 'active')
        .click(() => {
            $('.navbar-collapse').collapse('hide');
            $('.carousel').carousel(idx);
            $('#players').slideDown();
            $('#volumes').slideUp();
        });

    from_template('#player-template')
        .addClass(player.html_id)
        .addClass(idx ? '' : 'active')
        .appendTo('.carousel-inner');

    from_template('#carousel-indicator-template')
        .attr('data-slide-to', idx)
        .addClass(player.html_id)
        .addClass(idx ? '' : 'active')
        .appendTo('.carousel-indicators');

    from_template('#playlist-template')
        .addClass(player.html_id)
        .addClass(idx ? '' : 'active')
        .appendTo('#playlist .modal-body');

    from_template('#volumes template')
        .addClass(player.html_id)
        .appendTo('#volumes .modal-body').find('.vol-player-name').attr('data-slide-to', idx);

    [false, true]
        .forEach(sync =>
                 $('.dropdown-header.' + (sync ? 'sync' : 'unsync'))
                 .after($('<li class="item-content"><div class="item-inner"><a>')
                        .addClass('dropdown-item')
                        .addClass('op')
                        .addClass('text-color-white')
                        .addClass(player.html_id)
                        .addClass(sync ? 'sync' : 'unsync')
                        .attr('href', '#')
                        .text(player.name)
                        .click(() => { sync
                                       ? player.sync(active_player)
                                       : player.unsync(); })));
    $('.dropdown-item#party').click(() => {
        server
            .players
            .filter(player => player != active_player)
            .forEach(player => active_player.sync(player))});

    let $elm = $('.player.' + player.html_id);

    ['play', 'pause', 'stop', 'previous', 'next', 'volume_up', 'volume_down']
        .forEach(action => $elm.find('button.'+action)
                 .click(() => player[action]()));

    $elm.find('.volume .range-slider__range').on('change', function () {
        sliding = false;
        console.log('volume: ' + $(this).val() + ' ' + sliding);
    });

    $elm.find('.volume .range-slider__range').on('input', function () {
        sliding = true;
        player.volume = parseInt($(this).val());
        $elm.find('.volume .range-slider__value').text($(this).val());
        console.log('slide: ' + sliding);
    });

    $elm.find('.progress.duration').click(e => {
        let $this = $(e.currentTarget);
        let x = e.pageX - $this.offset().left;
        if (player.track_duration > 0) {
            player.track_position =
                Math.floor(player.track_duration * x / $this.width());
        }
    });
}

function player_activated(player) {
    let html_id = player.html_id;
    player.update();
    active_player = player;
    $('#playerslist.navbar-nav')
        .find('.active')
        .removeClass('active')
        .end()
        .find('.' + html_id)
        .addClass('active');
    $('#playlist')
        .find('.active')
        .removeClass('active')
        .end()
        .find('.' + html_id)
        .addClass('active');
    localStorage.setItem(STORAGE_KEY_ACTIVE_PLAYER,
                         html_id);
}

function browse_menu(menus) {
    menuback = menus;
    $('#browsetitle').text(menus[menus.length - 1].title);
    $('#browser .breadcrumb')
        .empty()
        .append(menus.map(
            (menu, idx) => $('<li>')
                .addClass('breadcrumb-item')
                .addClass(idx == menus.length - 1 ? 'active' : '')
                .append($('<a>')
                        .text(menu.title)
                        .click(ev => {
                            let idx= 1 + $(ev.currentTarget).parent().index();
                            browse_menu(menus.slice(0, idx));
                        })))
               );

    $('#browseback').off('click');
    $('#browseback').click(() => {
        if(menuback == undefined || menuback.length <= 1) {
            $('#browseback').attr('data-dismiss', 'modal');
            //window.location.href = "/m";
            $('#b').removeClass('tab-active');
            $('#index').addClass('tab-active');
        } else {
            $('#browseback').removeAttr('data-dismiss');
            browse_menu(menuback.slice(0, menuback.length-1));
        }
    });

    function browse_level(parent, ...params) {
        if(parent.cmd == "search") {
            parent.name = $('#search').val();
        }
        params.splice(params.slice(-1)[0] instanceof Object ? -1 : params.length, 0, 0, 99);
        active_player.query(...params).then(
            res => browse_menu(
                menus.concat([{title: parent.name || parent.title || parent.filename,
                               items: res.result[Object.keys(res.result).find(key => /loop/.test(key))],
                               context: params[0]}])))
    }

    function menu_item_clicked(context, item) {
        log('Clicked', item);
        if (item.id && item.isaudio) {
            $.get('http://' + document.location.hostname + '/api/helper.php?addradio&id=' + item.id +
                '&name=' + item.name + '&type=' + item.type + '&image=' + item.image + '&url=' + item.url,
                function () {
                    console.log('added radio to history');
                });
            active_player._command(context, 'playlist', 'play', {item_id: item.id});
            $('#b').removeClass('tab-active');
            $('#index').addClass('tab-active');
            $('#imgmenu').removeClass('panel-open');
            $('#imgmenuinno').removeClass('panel-open');
            var onclickimg = function () {
                browse_menu(menuback.slice(0, menuback.length));
                $('#index').removeClass('tab-active');
                $('#b').addClass('tab-active');
                $('#imgmenu').addClass('panel-open');
                $('#imgmenuinno').addClass('panel-open');
                $('#imgmenu').unbind('click.img', onclickimg);
                $('#imgmenuinno').unbind('click.img', onclickimg);
                $('#imgmenuinno').css('padding', '1% 2% 1% 1%');
                $('#imgmenu').css('padding', '1% 0 1% 1%');
                $('#imgmenu').css('width', '3.1%');
                $('#imgmenu').attr('src', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABySURBVGhD7dYxDcMwEAVQz91CICAaLGFQEAGRuSCKJVgKwc5VMoMog6/vSd+eT/rDLwBwRWttSpDH75Dh1VrfJZ5vguy9YAAA3CHG45Igc54ZH/+RIFsvGAAAd4jBtY6eWL/PVDP+M3rikFcvGAD8s1JOw45ozjHglY0AAAAASUVORK5CYII=');
            };
            $('#imgmenu').attr('src', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAACqSURBVGhD7dqxDYMwGERhj5AmBemzZEbIeqlSZw87B/JPQUF9h94nWUKWCz8ZKtMAeBpj3OZjrt77Q+Or8Z5TeSpCJ7KJjDlGFM295hJ/JxE/jedc5o0IF0S4IMIFES6IcEGECyJcaKPLFSLuGp+5911UxOoyISttOP/VKtpw/sdeiHFFjCtiXBHjihhXxLgixtVJTM7VWznG6Dn/Zjc6ougw8n8YAGK09gcbiWp3uUSN/gAAAABJRU5ErkJggg==');
            $('#imgmenu').bind('click.img', onclickimg);
            $('#imgmenuinno').bind('click.img', onclickimg);
            $('#imgmenuinno').css('padding', '1% 3% 1% 0');
            $('#imgmenu').css('padding', '1% 0 1% 0');
            $('#imgmenu').css('width', '2.6%');
        } else if (item.url && item.type == 'audio') {
            active_player.playlist_play(decodeURIComponent(item.url));
            //$('.modal.show').modal('hide');
            $('#b').removeClass('tab-active');
            $('#index').addClass('tab-active');
            $('#imgmenu').removeClass('panel-open');
            $('#imgmenuinno').removeClass('panel-open');
            var onclickimg = function () {
                browse_menu(menuback.slice(0, menuback.length));
                $('#index').removeClass('tab-active');
                $('#b').addClass('tab-active');
                $('#imgmenu').addClass('panel-open');
                $('#imgmenuinno').addClass('panel-open');
                $('#imgmenu').unbind('click.img', onclickimg);
                $('#imgmenuinno').unbind('click.img', onclickimg);
                $('#imgmenuinno').css('padding', '1% 2% 1% 1%');
                $('#imgmenu').css('padding', '1% 0 1% 1%');
                $('#imgmenu').css('width', '3.1%');
                $('#imgmenu').attr('src', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABySURBVGhD7dYxDcMwEAVQz91CICAaLGFQEAGRuSCKJVgKwc5VMoMog6/vSd+eT/rDLwBwRWttSpDH75Dh1VrfJZ5vguy9YAAA3CHG45Igc54ZH/+RIFsvGAAAd4jBtY6eWL/PVDP+M3rikFcvGAD8s1JOw45ozjHglY0AAAAASUVORK5CYII=');
            };
            $('#imgmenu').attr('src', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAACqSURBVGhD7dqxDYMwGERhj5AmBemzZEbIeqlSZw87B/JPQUF9h94nWUKWCz8ZKtMAeBpj3OZjrt77Q+Or8Z5TeSpCJ7KJjDlGFM295hJ/JxE/jedc5o0IF0S4IMIFES6IcEGECyJcaKPLFSLuGp+5911UxOoyISttOP/VKtpw/sdeiHFFjCtiXBHjihhXxLgixtVJTM7VWznG6Dn/Zjc6ougw8n8YAGK09gcbiWp3uUSN/gAAAABJRU5ErkJggg==');
            $('#imgmenu').bind('click.img', onclickimg);
            $('#imgmenuinno').bind('click.img', onclickimg);
            $('#imgmenuinno').css('padding', '1% 3% 1% 0');
            $('#imgmenu').css('padding', '1% 0 1% 0');
            $('#imgmenu').css('width', '2.6%');
        } else if (item._cmd)
            browse_level(item, item._cmd, {want_url: 1})
        else if (item.cmd) {
            if(item.cmd != "search") {
                browse_level(item, item.cmd, 'items', {want_url: 1})
            } else {
                if($('#search').val() != undefined && $('#search').val() != "") {
                    browse_level(item, item.cmd, 'items', {want_url: 1, search: $('#search').val()})
                }
            }
        } else if (item.id && item.hasitems)
            browse_level(item, context, 'items', {item_id: item.id, want_url: 1});
        else if (item.id && item.type == 'folder')
            browse_level(item, 'musicfolder', {type: 'audio', folder_id: item.id, tags: 'cdu'})
    }

    /* last item is the active leaf */
    let menu = menus.slice(-1)[0];
    if (menu !== undefined && menu.items !== undefined) {
        menu.items.forEach(item => log('Menu item', item));
        $('#browser .menu')
            .empty()
            .append(menu.items.map(
                item => {
                    if(item.cmd == "search")
                    {
                        return from_template('#menu-item-template')
                            .find('.title')
                            .attr('display', 'none')
                            .end()
                            .find('.search')
                            .addClass('active')
                            .keypress(function(e) {
                                if(e.keyCode == 13) {
                                    menu_item_clicked(menu.context, item);
                                }
                            })
                            .end()
                            .find('.item-content')
                            .addClass('item-input')
                            .end()
                            .find('img.icon2')
                            .attr('src', /fa-/.test(item.icon) ? item.icon : '')
                            .end()
                            .find('img.icon')
                            .each((_, img) => rescaled(
                                $(img),
                                'browser',
                                /fa-/.test(item.icon) ? '' :
                                    item.icon ||
                                    item.image ||
                                    '/music/' + (item.coverid || item.id) + '/cover.jpg', true))
                            .end()
                            .find('img.icon')
                            .click(() => menu_item_clicked(menu.context, item))
                            .end();
                    } else {
                        return from_template('#menu-item-template')
                            .find('.title')
                            .text(item.name || item.title || item.filename)
                            .end()
                            .find('.search')
                            .remove()
                            .end()
                            .find('img.icon2')
                            .attr('src', /fa-/.test(item.icon) ? item.icon : '')
                            .end()
                            .find('img.icon')
                            .each((_, img) => rescaled(
                                $(img),
                                'browser',
                                /fa-/.test(item.icon) ? '' :
                                    item.icon ||
                                    item.image ||
                                    '/music/' + (item.coverid || item.id) + '/cover.jpg', true))
                            .end()
                            .click(() => menu_item_clicked(menu.context, item));
                    }
                }
            ));
    }
}


function history_item_clicked(item) {
    if (item.id) {
        $.get('http://' + document.location.hostname + '/api/helper.php?addradio&id=' + item.id +
                '&name=' + item.name + '&type=' + item.type + '&image=' + item.image + '&url=' + item.url,
            function () {
                console.log('added radio to history');
            });
        active_player.playlist_play(decodeURIComponent(item.url));
    }
}

function player_updated(_, server, player) {
    log('Updated',
        player.id,
        player.track_title,
        player.track_artist,
        player.track_artwork_url);

    let $elm = $('.player.' + player.html_id);

    /* FIXME: Check first if a value really changed before setting it?
       (premature optimization?) */

    $elm.find('.player-name')
        .text(player.name);
    $elm.find('.nav-player-name')
        .append('<img style="width: 22px; height: 22px; margin-left: 10%" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAK9SURBVGhD7Zk/aBRBGMVPLwkWahALFUTRRonEQhMQtAykMEIQRNFCxCZFCkEr0UJEEFOlCViolUIugihJoxaKgk1QtPEfCkZJYaGxUDHG0993vrvkuL25C2T3ZsP84PHtvpnJvo/LbG43mcBiIJ/Pr0RX0Ne/guMJdFJT0gGBbyh/BYwd0zS/Iesywk6j72i9bGvukBq5L8tvyLpBgT/IKsB5u/wXshoDGZrQqlqaE7hqI5Qsily/gFquS8+C2USA99S6cTVSPI4brnNCl/8P3lL0gIEvtcS8Kf0QVyNtNjdmfUZHdPn5Q1a/90i9LKZGbD/9QL/Qbs7tBrAanVIjY5rqP4QdtNBRMNajaf5D3mYCn0FP0TvpIdqvKYFAIFAJN4+1aLPULDs9cJdrR/YlswTnP9FpTfEfMtsf1jcKP0EZpz5H0+ZBr6b6DYGLX2leUrKyze+Tf02W35B1jwI/klWA873yR2XNDxauYf3OpMT1jlOdjVBaUbX126mlT7IARgsDpTciSeJqpHhcDcbPadksmFcZG09KXO8VtdYnYr9+1dY/Qd1a1jgIE88eSRpHIz3y78jyG4Kus8AwxfE+qm3gXWjETOolTfUfwtq+jMKa26hp/kPgLIH70W10TxpCmzQlEAg0AjanvT3poHZJW9ESDacDGtiCXhO8DLy7lMo3475C4McKbk90OepN9FHegKb5DVntv1R/qPYmvkW2NbdDjTyT5TdktecCC1z24hor8oV2QyGPPbAciBJBj1KdjVCs2cj1MakXle9NjFbC/KY6cTWCEvkv1Vy4ZuXexLzAWC5KjN2i1vpE7DhyfRzimtdRh6LUBwvTs0dcEHSFAk/KKoBlbwbNfyvLfwj7SaHPU+wGcBANmwc5TfMfQh9GMwpeAu8b2qZp6YDAnWS/SL0snUXpeZILJEYm8w+aOmYFewA5rAAAAABJRU5ErkJggg==">');
    $elm.find('.player-group')
        .text(player
              .sync_partners
              .map(p => p.name).join('+'))
        .prepend(player.is_synced ?
                 $('<span>')
                 .addClass('sync-icon fa fa-link') : '');
    if(player.track_album !== player.track_title) {
        $elm.find('.album')
            .text(player.track_album || '');
    } else {
        $elm.find('.album')
            .text('');
    }
    $elm.find('.artist')
        .text(player.track_artist || '');
    $elm.find('.track')
        .text(player.track_title || '');

    let $overflowtext = $elm.find('.main-track');
    if($overflowtext.innerWidth() >= $elm.find('.track-wrapper').innerWidth()) {
        $overflowtext.addClass('marquee');
        $overflowtext.addClass('marquee-direction-alternate');
        $overflowtext.addClass('marquee-speed-fast');
        $overflowtext.attr('data-marquee', player.track_title);
        $overflowtext.text('');
    } else {
        $overflowtext.removeClass('marquee');
        $overflowtext.removeClass('marquee-direction-alternate');
        $overflowtext.removeClass('marquee-speed-fast');
        $overflowtext.attr('data-marquee', '');
        $overflowtext.text(player.track_title);
    }

    log('Cover dimensions (' +
        $elm.find('img.cover').width() + 'x' +
        $elm.find('img.cover').height() + '): ' +
        player.track_artwork_url);

    $elm.find('img.cover')
        .each((_, img) => rescaled(
            $(img), 'cover', player.track_artwork_url));
    $elm.find('.duration .progress-bar')
        .width((player.track_duration > 0 ?
                100 * player.track_position / player.track_duration : 0) + '%');
    $elm.find('.progress-title')
        .text(player.is_stream ?
              format_time(player.track_position) :
              [format_time(player.track_position),
               format_time(player.track_duration)].join(' | '));
    /*$elm.find('.volume .progress-bar')
        .width(player.volume + '%');*/
    if(player.volume != $elm.find('.volume .range-slider__range').val()
        && !sliding) {
        console.log('val: ' + player.volume);
        $elm.find('.volume .range-slider__range').val(player.volume);
        $elm.find('.volume .range-slider__value').text(player.volume);
    }

    $elm.removeClass('on off playing paused stopped ' +
                     'stream file')
        .addClass([player.is_on ? 'on' : 'off',
                   player.is_playing ? 'playing' :
                   player.is_paused ? 'paused' :
                   player.is_stopped ? 'stopped' : '',
                   player.is_synced ? 'synced' : 'unsynced',
                   player.is_stream ? 'stream' : 'file'].join(' '));

    if(player.is_playing) {
        $elm.find('.covermain').addClass('covermain_active');
    } else {
        $elm.find('.covermain').removeClass('covermain_active');
    }

    $elm = $('.playlist.' + player.html_id);
    if (player.playlist_timestamp &&
        player.playlist_timestamp != $elm.data(DATA_KEY_PLAYLIST_TIMESTAMP)) {
        log('Updating playlist', player.html_id);
        player.playlist_tracks.forEach(track => log('Playlist track', track.artist, track.title));
        $elm.data(DATA_KEY_PLAYLIST_TIMESTAMP,
                  player.playlist_timestamp)
            .empty()
            .append(player.playlist_tracks.map(
                track =>
                    from_template('#playlist-item-template')
                    .click(() => {
                        alert('track clicked');
                    })
                    .find('img.cover')
                    .each((_, img) => rescaled(
                        $(img),
                        'playlist',
                        track.artwork_url || '/music/' + track.id + '/cover.jpg', true))
                    .end()
                    .find('.track')
                    .text(track.title)
                    .end()
                    .find('.artist')
                    .text(track.artist)
                    .end()
                    .find('.album')
                    .text(track.album)
                    .end()
            ));
    }

    if(player.html_id == active_player.html_id) {
        $('.dropdown-menu.syncing .dropdown-item').hide();
    }
    server.players.forEach(other => {
        if (other.html_id != active_player.html_id) {
            if (!other.is_slave && !player.group.includes(other))
                $('.dropdown-item.sync.' + other.html_id).show();
            if (player.sync_partners.includes(other))
                $('.dropdown-item.unsync.' + other.html_id)
                    .text(other.name)
                    .show();
            if (player.group.length != server.players.length)
                $('.dropdown-item#party').show();
            /* FIXME: To be able to set the state of the 'Unsync all'
               menu item we must know the sync state for all players
               - by sending periodic 'syncgroups ?'-queries */
            /* $('.dropdown-item#no-party').show(); */
        }
    });
}

$(() => {
    $(new Server())
        .on('player_created', player_created)
        .on('player_updated', player_updated)
        .one('server_ready', server_ready);
});
