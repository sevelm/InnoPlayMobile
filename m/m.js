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

    //let shortcuts = [
    //    {title: 'Favorites',   cmd: 'favorites',   icon: 'fa-star'},
    //    {title: 'Radio',       cmd: 'presets',     icon: 'fa-podcast'}, /* no fa-antenna */
    //    {title: 'Podcasts',    cmd: 'podcasts',    icon: 'fa-rss'}, /* later, switch to fa-podcast */
    //    {title: 'Pocketcasts', cmd: 'pocketcasts', icon: 'fa-rss'}, /* later, switch to brand icon */
    //    {title: 'Spotify',     cmd: 'spotty',      icon: 'fa-spotify'},
    //    {title: 'Blah',        cmd: 'dummy',       icon: 'fa-question'}];
    let shortcuts = [
        {title: 'Favoriten',    cmd: 'favorites',   icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAANHSURBVGhD7ZlJyE1RHMA/8xwW5iHFxlBsEEKJlZBhRQiJQsnGmAUlsjJsFBKSIiEyrChjpEjGIgsLypx5/P2O79Tnq89373v3fe8t7q9+vXdO75x7zr33TP9XlZOTk5OTU0YaY+u/X4uiTfVng9EBF+JJfI7f8Te+wlu4Efvj/2iGk/AwPsLPaB0f8R7uwHHYCDOnBa7EN+hFo9/wNf6skafHsAfWZjI+w5q//YRva+XpVRyNmdENr2C8wCmcjeZHvMvDcDv6dPzde7Th0hz3Y6zjJi7GXhjxZg3GtRg76w1ahUU/nS4YK32II7E+2uIetIxPzE6fqE7byRlYHy1xNcZX1xtUMFZ2Da3oAnbENMzHX2h5fYw1n0ASxqNjx/KLzCgEx4QV+CTam1EA69A6HAP1TQJ1MR29IXao5uucCO9+HNijzCgQ3+2zaGOK4SDall0hlQJfCwueDqniaFf9WQx90IH/AZ0UEuM6YUfmhFRlcAlt08SQSshTtFDPkKoMNqBtWhNSCfmCPsqmIVUZOGvZkZ0hlQAbbwE7U0n4mtsu16jEvEMLZbEhzIrlaJu2hlRC7qOFBoZUZbANbdOKkErIIbTQvJCqDK6jbRobUglZihY6ElLlpzO67/qK7uUS0x2dtTwreAYpN3F8HA+plJxBC7tfKiceEeK6NtWMtIxBC3tw6mRGmViCtuMuerQuiPNoJW7ayoE7i3h6nGZGofRFj6JWNMuMBqQJXkSv7cGsaOKj9Tww1IwGwiCE132Bqc8hdXEArdTxMsSMErMJvZ5TrmM1MzwDeECy8pc4CEvFevQ6ngrnmpE1rfAcxsc9ArPEGWkzxk64dpQMN5FxJnN3bIQkC1ytY6TFhbjgQEMajK7sQy+qW7CYc0s/vIPWZSxsCjYoPvofaAMuY29My0yMRwbDRQOwLExAB78NMeqSNFriq7QXLacGOdLGzTKnK8Z9me7G/+1QXYuMlflbN6XLsCQB60KwITYoRtaNstdePJ2VDIMaRvU3t7GSDm7/4Dt+A22oDTbiYQccP4ZdzXdcOc2mik+VA2cwOxDvvH8PuCPw+wPMev0pOcPxCdoB9W+FVKe7SsLT5VFcEFI5OTk5OYGqqj9XWeCu2RXOqAAAAABJRU5ErkJggg=='},
        {title: 'Apps',         _cmd: 'apps',        icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAKXSURBVGhD7ZZJyE1hGIB/ZCYzmSWSjTJlQ0JJhsQCGxtSslCKwspQimJlzEayEpJZyYaFoaREiUSZCQuU2fN83dP9O/8597/XUu9Tz+J9v/c7937nm05TEARBEARBEARBENRFexyMA7GtiQbpiENxQIoapzOOwD4p+gf88cP4Cf9UfI07sQe2xlg8jl8x6/8UN2MnbI0peAm/Y9b/Pq7GdlgXk/Ed2vk3PsPnlVgf4UgsYx5+QWt/4hN8W4n1FvbCMlah/ax1II/xQyXWs9gBa9IXsx89gcMxYxxeR9vuossujzORDWI/+ryMqfgAbbtgooAZ6CB0C3ZHcVnPxRdo/wNYE5eOheexjYkcXfAeWrPSRA6Xk237UtSSfugStWamiRw30bb1KWrJGHS5OtDRJspw2figiSkqZila42Cb43RnP+IfLsN9Yv+9KaoyBM2/x6LZzjiE1m1IUQk/8BcWzUbGKPRBD1NUZRia92XUYhZadzlFVaaj+SspKmcFWncwRSV8Rou6paiY8WjNnRRV6Y/m3WO1WIzWnUxRFQ8Z87dTVM46tG5Pikq4ihYtT1Ex29AapziPR6xtbuwyjqE1G1NUxf2XLc3mh0yea2j/ZSkqwUaL3qBLKM809FTyWJ5gIscmtL+nkzOUZwna12d40eZxudjfF1q0KjwEbH+JXU2U4d44jRZ7Ge7AObgA3Zzf0LZdWISX3Q205hU6sNm4CI+i+8+2NViEx7X3hjXutbXonvKAOYPmnbH52Cr+mSPom7Njcz0MtmOtz5XeeBHzfdWlUzaIDA8NL82i/h/Rl9IQk3A3nkPfxlb0HK8XLzfvEy+/U+ieGIT14ItaiH4m+ani/eTs9MQgCIIgCIIgCIIg+P9pavoLWBG3ImGgY+cAAAAASUVORK5CYII='},
        {title: 'Webradio',     _cmd: 'radios',      icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAN2SURBVGhD7dlbyE1pHMfx12BIJKeQw8WEFBeOJQrhiis0hskFmYhyg0RxgYhCiDEOaeSQS4e5cMgk5VSMG+eSKWpyyCEJ4/j97vd93pbdfr1r7b3be232rz6119rvXuv5r/WstZ71vDXVVPN9pwl24i3OowsqKj9gMNbhU8RapD7dMROH8AjRAoIVSF1aYzw24QayG30dG7Ee93EY7VD22F2GYCn+hv0+2nDPwkHMgGcnVbFBs2B3eYxowy3kNJZgECw0NbG7TMBm3ES04boGu4tdqhVSE4/iUNhdziCV3aUFmtd+/CI98RvsLk8QbfgbpKa7DMdFvIdH+C9MwRZUTHfxIfQK4ei+q/sclcq7i0fwp4hTsLHH0A8D8U/dOu/rk9EL0d+UQw84fMnEp2j2xVlJ7ObdUH+h3q1A4Zm0GvWVVWLmwrb/7kK1kCKlA7xwO2eWkqWshXiXcfjig/Qhwv71P85iISywsZStEJ/ylxH2KZ9Xd/AfPtat0zM4MmiKhpKokK5oX/uxoDj69Yi7rwewkXapaFpiIo4itOs4Gnr/iF3IcniUbMB0V+QZn/7haDuMcXTcWMbCgv3NBfyI7MQqpBkcnoTvfXvLJwMQHrh/wuFPXJNgF/O3u5Gd2GfkHsL3J1yRR3INMPPhGR2GaGIX4tE8gv1w2J40I+C2X8CLPF+34XayD2aii72Q7IHbXpxZyj9t8BK+UnRyRV1KVsi/cNuOUguNvcJt/ZpZqk2iQnojn4Z4K/2A5xhXBM402s5lCIldiDN6fmeD5rgiQfoibLuY7K4hsQrx9hseYLqFJHF+1t/55PZFrVBh8m4DQmKfkXC3kG+LSePd6jVyTV4kzRrYjvmZpdrELsTusQ/bkc/o9Bzc9sjMUmEJ23JSJCTRxV5Iwo4cO+W6gOOaCrfjkCU6tVSyQhzsFXM+wLFfNCUrxHhxhn1cQq4L+Wuewt86E589X1bSQnyfcNbRfVxFkv82LYJjLM/qaFdkpaSFmLa4AvfjzMc8fO1O1h8n4d/7CJiGXCl5IcZ3kAMI+7PL7MUCOOyYDad1QsHyVXgUGkpZCglxbtgXpbDfXCxyJRp7AStrISF9YEO2wjnkbXAcNQaOKuIkFYUUI99mIb6suPBzBdoF2273zPxnNZyVSvULajpiFXZUoD8QfWOsppripqbmM6qic+YPcHB3AAAAAElFTkSuQmCC'},
        {title: 'Medien',       _cmd: 'musicfolder', icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAIISURBVGhD7dm/S9xgAMbxWJWqqNClDtalgxRBsPgHVNzrZAeLP8Cxg9Kxmx1EcGyp0C5F6GLpJo5O4mBx1aUWddBJbFEE8Uft9wkXCPHucvGS3Pu27wMf9NVLeJ8ceS+XeC4uLhWnGe/xCzcVOMAgjMs7aILXOI7xG3rtKR7DqBzhD7r9UXwWoTLrqNcfTIkmpSNdadqxC233Fg9y0oaySVpEeYYraNs87eEFikYvSFpEGcYPFDuXshCcnzqA/biVuxapRWah+c75o0hsKvISmu+CP4okKNIELammeoTYIlp+Lwu/m+yi8LNkETnDT4PtQwe8bBF9quutMz0zKFvknzrZbYgrUk10TaZls9UfpZPci3TgBNq3LilW0INqk3uRXmi/YVoZlzCFMahs0hhRJOobksbIImtImpoV0WXPKnYK4zCrimz6I8+rwyT0xSgo8gVJU7MixY76Q2hZbvRHyWJUkWriitw1rkhMci/SByuL3MMTDOA5PsO6Iq9wCO0nypoibxCeeJQVRfSBFlyql2JFkU6EJ13MMtJMJkUaoO3CE496jTST2TkyinOEJx/4jhakmcyKKF3Qkf+Ir/iECdxH2sm0SJ75P4ropoDu+9qQcajIB38UyRb0z3nosZapRrABzXUatzIEGx4pBLZR8qbfU+gd0apjKn3H1+oY+3TXxcUliOf9BZfW+6GF1BL2AAAAAElFTkSuQmCC'}];

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
            {title: 'Favoriten', cmd: 'favorites',   icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAANHSURBVGhD7ZlJyE1RHMA/8xwW5iHFxlBsEEKJlZBhRQiJQsnGmAUlsjJsFBKSIiEyrChjpEjGIgsLypx5/P2O79Tnq89373v3fe8t7q9+vXdO75x7zr33TP9XlZOTk5OTU0YaY+u/X4uiTfVng9EBF+JJfI7f8Te+wlu4Efvj/2iGk/AwPsLPaB0f8R7uwHHYCDOnBa7EN+hFo9/wNf6skafHsAfWZjI+w5q//YRva+XpVRyNmdENr2C8wCmcjeZHvMvDcDv6dPzde7Th0hz3Y6zjJi7GXhjxZg3GtRg76w1ahUU/nS4YK32II7E+2uIetIxPzE6fqE7byRlYHy1xNcZX1xtUMFZ2Da3oAnbENMzHX2h5fYw1n0ASxqNjx/KLzCgEx4QV+CTam1EA69A6HAP1TQJ1MR29IXao5uucCO9+HNijzCgQ3+2zaGOK4SDall0hlQJfCwueDqniaFf9WQx90IH/AZ0UEuM6YUfmhFRlcAlt08SQSshTtFDPkKoMNqBtWhNSCfmCPsqmIVUZOGvZkZ0hlQAbbwE7U0n4mtsu16jEvEMLZbEhzIrlaJu2hlRC7qOFBoZUZbANbdOKkErIIbTQvJCqDK6jbRobUglZihY6ElLlpzO67/qK7uUS0x2dtTwreAYpN3F8HA+plJxBC7tfKiceEeK6NtWMtIxBC3tw6mRGmViCtuMuerQuiPNoJW7ayoE7i3h6nGZGofRFj6JWNMuMBqQJXkSv7cGsaOKj9Tww1IwGwiCE132Bqc8hdXEArdTxMsSMErMJvZ5TrmM1MzwDeECy8pc4CEvFevQ6ngrnmpE1rfAcxsc9ArPEGWkzxk64dpQMN5FxJnN3bIQkC1ytY6TFhbjgQEMajK7sQy+qW7CYc0s/vIPWZSxsCjYoPvofaAMuY29My0yMRwbDRQOwLExAB78NMeqSNFriq7QXLacGOdLGzTKnK8Z9me7G/+1QXYuMlflbN6XLsCQB60KwITYoRtaNstdePJ2VDIMaRvU3t7GSDm7/4Dt+A22oDTbiYQccP4ZdzXdcOc2mik+VA2cwOxDvvH8PuCPw+wPMev0pOcPxCdoB9W+FVKe7SsLT5VFcEFI5OTk5OYGqqj9XWeCu2RXOqAAAAABJRU5ErkJggg=='},
            {title: 'Apps',     _cmd: 'apps',        icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAKXSURBVGhD7ZZJyE1hGIB/ZCYzmSWSjTJlQ0JJhsQCGxtSslCKwspQimJlzEayEpJZyYaFoaREiUSZCQuU2fN83dP9O/8597/XUu9Tz+J9v/c7937nm05TEARBEARBEARBENRFexyMA7GtiQbpiENxQIoapzOOwD4p+gf88cP4Cf9UfI07sQe2xlg8jl8x6/8UN2MnbI0peAm/Y9b/Pq7GdlgXk/Ed2vk3PsPnlVgf4UgsYx5+QWt/4hN8W4n1FvbCMlah/ax1II/xQyXWs9gBa9IXsx89gcMxYxxeR9vuossujzORDWI/+ryMqfgAbbtgooAZ6CB0C3ZHcVnPxRdo/wNYE5eOheexjYkcXfAeWrPSRA6Xk237UtSSfugStWamiRw30bb1KWrJGHS5OtDRJspw2figiSkqZila42Cb43RnP+IfLsN9Yv+9KaoyBM2/x6LZzjiE1m1IUQk/8BcWzUbGKPRBD1NUZRia92XUYhZadzlFVaaj+SspKmcFWncwRSV8Rou6paiY8WjNnRRV6Y/m3WO1WIzWnUxRFQ8Z87dTVM46tG5Pikq4ihYtT1Ex29AapziPR6xtbuwyjqE1G1NUxf2XLc3mh0yea2j/ZSkqwUaL3qBLKM809FTyWJ5gIscmtL+nkzOUZwna12d40eZxudjfF1q0KjwEbH+JXU2U4d44jRZ7Ge7AObgA3Zzf0LZdWISX3Q205hU6sNm4CI+i+8+2NViEx7X3hjXutbXonvKAOYPmnbH52Cr+mSPom7Njcz0MtmOtz5XeeBHzfdWlUzaIDA8NL82i/h/Rl9IQk3A3nkPfxlb0HK8XLzfvEy+/U+ieGIT14ItaiH4m+ani/eTs9MQgCIIgCIIgCIIg+P9pavoLWBG3ImGgY+cAAAAASUVORK5CYII='},
            {title: 'Webradio',    _cmd: 'radios',      icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAN2SURBVGhD7dlbyE1pHMfx12BIJKeQw8WEFBeOJQrhiis0hskFmYhyg0RxgYhCiDEOaeSQS4e5cMgk5VSMG+eSKWpyyCEJ4/j97vd93pbdfr1r7b3be232rz6119rvXuv5r/WstZ71vDXVVPN9pwl24i3OowsqKj9gMNbhU8RapD7dMROH8AjRAoIVSF1aYzw24QayG30dG7Ee93EY7VD22F2GYCn+hv0+2nDPwkHMgGcnVbFBs2B3eYxowy3kNJZgECw0NbG7TMBm3ES04boGu4tdqhVSE4/iUNhdziCV3aUFmtd+/CI98RvsLk8QbfgbpKa7DMdFvIdH+C9MwRZUTHfxIfQK4ei+q/sclcq7i0fwp4hTsLHH0A8D8U/dOu/rk9EL0d+UQw84fMnEp2j2xVlJ7ObdUH+h3q1A4Zm0GvWVVWLmwrb/7kK1kCKlA7xwO2eWkqWshXiXcfjig/Qhwv71P85iISywsZStEJ/ylxH2KZ9Xd/AfPtat0zM4MmiKhpKokK5oX/uxoDj69Yi7rwewkXapaFpiIo4itOs4Gnr/iF3IcniUbMB0V+QZn/7haDuMcXTcWMbCgv3NBfyI7MQqpBkcnoTvfXvLJwMQHrh/wuFPXJNgF/O3u5Gd2GfkHsL3J1yRR3INMPPhGR2GaGIX4tE8gv1w2J40I+C2X8CLPF+34XayD2aii72Q7IHbXpxZyj9t8BK+UnRyRV1KVsi/cNuOUguNvcJt/ZpZqk2iQnojn4Z4K/2A5xhXBM402s5lCIldiDN6fmeD5rgiQfoibLuY7K4hsQrx9hseYLqFJHF+1t/55PZFrVBh8m4DQmKfkXC3kG+LSePd6jVyTV4kzRrYjvmZpdrELsTusQ/bkc/o9Bzc9sjMUmEJ23JSJCTRxV5Iwo4cO+W6gOOaCrfjkCU6tVSyQhzsFXM+wLFfNCUrxHhxhn1cQq4L+Wuewt86E589X1bSQnyfcNbRfVxFkv82LYJjLM/qaFdkpaSFmLa4AvfjzMc8fO1O1h8n4d/7CJiGXCl5IcZ3kAMI+7PL7MUCOOyYDad1QsHyVXgUGkpZCglxbtgXpbDfXCxyJRp7AStrISF9YEO2wjnkbXAcNQaOKuIkFYUUI99mIb6suPBzBdoF2273zPxnNZyVSvULajpiFXZUoD8QfWOsppripqbmM6qic+YPcHB3AAAAAElFTkSuQmCC'},
            {title: 'Medien',   _cmd: 'musicfolder', icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAIISURBVGhD7dm/S9xgAMbxWJWqqNClDtalgxRBsPgHVNzrZAeLP8Cxg9Kxmx1EcGyp0C5F6GLpJo5O4mBx1aUWddBJbFEE8Uft9wkXCPHucvGS3Pu27wMf9NVLeJ8ceS+XeC4uLhWnGe/xCzcVOMAgjMs7aILXOI7xG3rtKR7DqBzhD7r9UXwWoTLrqNcfTIkmpSNdadqxC233Fg9y0oaySVpEeYYraNs87eEFikYvSFpEGcYPFDuXshCcnzqA/biVuxapRWah+c75o0hsKvISmu+CP4okKNIELammeoTYIlp+Lwu/m+yi8LNkETnDT4PtQwe8bBF9quutMz0zKFvknzrZbYgrUk10TaZls9UfpZPci3TgBNq3LilW0INqk3uRXmi/YVoZlzCFMahs0hhRJOobksbIImtImpoV0WXPKnYK4zCrimz6I8+rwyT0xSgo8gVJU7MixY76Q2hZbvRHyWJUkWriitw1rkhMci/SByuL3MMTDOA5PsO6Iq9wCO0nypoibxCeeJQVRfSBFlyql2JFkU6EJ13MMtJMJkUaoO3CE496jTST2TkyinOEJx/4jhakmcyKKF3Qkf+Ir/iECdxH2sm0SJ75P4ropoDu+9qQcajIB38UyRb0z3nosZapRrABzXUatzIEGx4pBLZR8qbfU+gd0apjKn3H1+oY+3TXxcUliOf9BZfW+6GF1BL2AAAAAElFTkSuQmCC'}]};

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
        .appendTo('#volumes .modal-body');

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
                                       ? active_player.sync(player)
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


    /*$elm.find('.rs-vol')[0].setAttribute("onchange", function () {
        let THRESHOLD = 30;
        if ($('.rs-vol').value < THRESHOLD)
            player.volume = $('.rs-vol').value;
        else if ($('.rs-vol').value > player.volume)
            player.volume_up();
        else
        player.volume_down();
    });*/

    //$elm.find('.progress.volume').click(e => {
    //    /* FIXME: Also allow sliding the volume control */
    //    let $this = $(e.currentTarget);
    //    let x = e.pageX - $this.offset().left;
    //    let level = 100 * x / $this.width();
    //    /* Prevent accidental volume explosions */
    //    let THRESHOLD = 30;
    //    if (level < THRESHOLD)
    //        player.volume = level;
    //    else if (level > player.volume)
    //        player.volume_up();
    //    else
    //        player.volume_down();
    //});

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

    function browse_level(parent, ...params) {
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
            active_player._command(context, 'playlist', 'play', {item_id: item.id});
            $('.modal.show').modal('hide');
            $('#b').removeClass('tab-active');
            $('#index').addClass('tab-active');
        } else if (item.url && item.type == 'audio') {
            active_player.playlist_play(decodeURIComponent(item.url));
            $('.modal.show').modal('hide');
        } else if (item._cmd)
            browse_level(item, item._cmd, {want_url: 1})
        else if (item.cmd)
            browse_level(item, item.cmd, 'items', {want_url: 1})
        else if (item.id && item.hasitems)
            browse_level(item, context, 'items', {item_id: item.id, want_url: 1});
        else if (item.id && item.type == 'folder')
            browse_level(item, 'musicfolder', {type: 'audio', folder_id: item.id, tags: 'cdu'})
    }

    /* last item is the active leaf */
    let menu = menus.slice(-1)[0];
    menu.items.forEach(item => log('Menu item', item));

    $('#browser .menu')
        .empty()
        .append(menu.items.map(
            item =>
                from_template('#menu-item-template')
                .find('.title')
                .text(item.name || item.title || item.filename)
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
                .click(() => menu_item_clicked(menu.context, item))
        ));
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
               format_time(player.track_duration)/*,
               format_time(player.track_remaining)*/].join(' | '));
    /*$elm.find('.rs-vol').val(player.volume);*/
        /*.width(player.volume + '%');*/

    $elm.removeClass('on off playing paused stopped ' +
                     'stream file')
        .addClass([player.is_on ? 'on' : 'off',
                   player.is_playing ? 'playing' :
                   player.is_paused ? 'paused' :
                   player.is_stopped ? 'stopped' : '',
                   player.is_synced ? 'synced' : 'unsynced',
                   player.is_stream ? 'stream' : 'file'].join(' '));

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

    $('.dropdown-menu.syncing .dropdown-item').hide();
    server.players.forEach(other => {
        if (!other.is_slave && !player.group.includes(other))
            $('.dropdown-item.sync.'+other.html_id)
            .text(other
                  .group
                  .map(p => p.name).join('+'))
            .show();
        if (player.sync_partners.includes(other))
            $('.dropdown-item.unsync.'+other.html_id)
            .text(other.name)
            .show();
        if (player.group.length != server.players.length)
            $('.dropdown-item#party').show();
        /* FIXME: To be able to set the state of the 'Unsync all'
           menu item we must know the sync state for all players
           - by sending periodic 'syncgroups ?'-queries */
        /* $('.dropdown-item#no-party').show(); */
    });
}

$(() => {
    $(new Server())
        .on('player_created', player_created)
        .on('player_updated', player_updated)
        .one('server_ready', server_ready);
    ga('send', 'screenview', {
        screenName: 'Home'
    });
});
