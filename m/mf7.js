var app = new Framework7({
    // App root element
    root: '#app',
    // App Name
    name: 'InnoPlay Mobile',
    // App id
    id: 'at.innotune.innoplaymobile',
    // Enable swipe panel
    /*panel: {
        swipe: 'left'
    },*/
    // Add default routes
    routes: [
        {
            name: 'index',
            path: '/',
            url: 'index.html'
        },
        {
            name: 'general',
            path: "/general/",
            content: '<div data-name="general" class="page">' +
            '   <div class="navbar">' +
            '       <div class="navbar-inner">' +
            '           <div class="left">' +
            '               <a class="link back" href="/">' +
            '                   <i class="icon icon-back"></i>' +
            '                   <span class="ios-only">Zurück</span>' +
            '               </a>' +
            '           </div>' +
            '           <div class="title">Allgemein</div>' +
            '       </div>' +
            '   </div>' +
            '   <div class="page-content">' +
            '       <div class="list" style="margin: 0">' +
            '           <ul>' +
            '               <li class="item-divider ">InnoTune-Version</li>' +
            '               <li class="item-content">' +
            '                   <div class="item-inner">' +
            '                       <div id="actual" class="item-title text-color-white op">Aktuell: </div>' +
            '                   </div>' +
            '               </li>' +
            '               <li class="item-content">' +
            '                   <div class="item-inner">' +
            '                       <div id="available" class="item-title text-color-white op">Neueste: </div>' +
            '                       <div class="item-after">' +
            '                           <button id="updatelink" class="button open-confirm text-color-white op">Update</button>' +
            '                       </div>' +
            '                   </div>' +
            '               </li>' +
            '               <li class="item-divider">Server</li>' +
            '               <li class="item-content">' +
            '                   <div id="address" class="item-inner text-color-white op"></div>' +
            '               </li>' +
            '               <li class="item-content">' +
            '                   <div id="port" class="item-inner text-color-white op"></div>' +
            '               </li>' +
            '               <li class="item-divider">Weitere Informationen</li>' +
            '               <li>' +
            '                   <a class="item-link link external item-content text-color-white op" target="_blank"' +
            '                       data-href="http://www.innotune.at/" href="http://www.innotune.at/">InnoTune-Website</a>' +
            '               </li>' +
            '           </ul>' +
            '       </div>' +
            '   </div>' +
            '</div>',
            on : {
                pageBeforeIn: function (event, page) {
                    $('#address').html('Hostname: ' + document.location.hostname);
                    $('#port').html('Port: ' + document.location.port);

                    $('#available').load('https://raw.githubusercontent.com/JHoerbst/InnoTune/master/version.txt',
                        function (response, status, xhr) {
                            if(status == "success") {
                                $('#available').html('Neueste: ' + response);
                            } else {
                                $('#available').html('Neueste: Nicht abrufbar!');
                            }
                        });

                    $('#actual').load('https://' + document.location.hostname + '/api/helper.php?getversion',
                        function (response, status, xhr) {
                            if(status == "success") {
                                $('#actual').html('Aktuell: ' + response);
                            } else {
                                $('#actual').html('Aktuell: Nicht abrufbar!');
                            }
                    });

                    $$('.open-confirm').on('click', function () {
                        app.dialog.create({
                            title: 'InnoServer Update',
                            text: 'Wollen Sie das System wirklich updaten?',
                            buttons: [
                                {
                                    text: 'Abbrechen'
                                },
                                {
                                    text: 'Updaten',
                                    onClick: function () {
                                        console.log('start update');
                                        app.dialog.preloader('Updating...');
                                        $('#updatelink').load('https://' + document.location.hostname + '/api/helper.php?update',
                                            function(response, status, xhr) {
                                                app.dialog.close();
                                                if(status == "success") {
                                                    console.log('update finished');
                                                    app.dialog.preloader('Server-Reboot...');
                                                    $('#updatelink').load('https://' + document.location.hostname +
                                                        '/api/helper.php?reboot',
                                                        function(response, status, xhr) {
                                                            console.log('reboot: ' + status);
                                                            setInterval(function () {
                                                                $.ajax({
                                                                    url: 'http://' + document.location.hostname + ':' +
                                                                        document.location.port + '/m/',
                                                                    success: function (result) {
                                                                        setTimeout(function () {
                                                                            location.reload(true);
                                                                        }, 10000);
                                                                    },
                                                                    error: function () {
                                                                        console.log("down");
                                                                    }
                                                                })
                                                            }, 3000);
                                                    });
                                                } else {
                                                    console.log('update failed');
                                                    app.dialog.create({
                                                        title: 'Update fehlgeschlagen',
                                                        text: 'Es ist ein unerwarteter Fehler aufgetreten!',
                                                        buttons: [
                                                            {
                                                                text: 'Verstanden'
                                                            }
                                                        ],
                                                        verticalButtons: false
                                                    }).open();
                                                }
                                        });
                                    }
                                }
                            ],
                            verticalButtons: false
                        }).open();
                    });
                }
            }
        },
        {
            name: 'master-volume',
            path: '/master-volume/',
            content : '<div data-name="master-volume" class="page">' +
            '    <div class="navbar">' +
            '        <div class="navbar-inner">' +
            '            <div class="left">' +
            '                <a class="link back" href="/">' +
            '                    <i class="icon icon-back"></i>' +
            '                    <span class="ios-only">Zurück</span>' +
            '                </a>' +
            '            </div>' +
            '            <div class="title">Master-Lautstärke</div>' +
            '        </div>' +
            '    </div>' +
            '    <div class="page-content" id="content">' +
            '       <div class="list" style="margin: 0">' +
            '           <ul id="devicelist">' +
            '           </ul>' +
            '           <template id="devicetemplate">' +
            '               <li class="item-content">' +
            '                   <div class="item-inner">' +
            '                       <div class="item-title text-color-white op"></div>' +
            '                       <div class="item-subtitle text-color-white op"></div>' +
            '                   </div>' +
            '               </li>' +
            '           </template>' +
            '       </div>' +
            '    </div>' +
            '</div>',
            on: {
                pageBeforeIn: function (event, page) {
                    $.get('https://' + document.location.hostname + '/api/helper.php?activedevices', function (data) {
                        var devices = [];
                        var devIds = data.split(';');
                        var count = 1;
                        var c = 1;
                        devIds.forEach(function (value) {
                           if(value != "") {
                               if(count < 10) {
                                   value = "0" + count;
                               } else {
                                   value = count;
                               }
                               count++;
                               $.get('https://' + document.location.hostname + '/api/helper.php?getdevice&dev=' + value,
                                   function (data) {
                                    devData = data.split(';');
                                    var devId;
                                    if(c < 10) {
                                        devId = "0" + c;
                                    } else {
                                        devId = c;
                                    }
                                    var name;
                                    if(devData[1] != "") {
                                        name = devData[1];
                                    } else {
                                        name = devData[2] + " - " + devData[3];
                                    }
                                    var mode;
                                    switch (parseInt(devData[0])) {
                                        case 0:
                                            mode = "Aus";
                                            break;
                                        case 1:
                                            mode = "Normal";
                                            break;
                                        case 2:
                                            mode = "Geteilt";
                                            break;
                                    }
                                    var dev = {'id': devId,'mode': mode, 'name': name, 'mac': devData[4]};
                                    devices.push(dev);
                                    c++;
                                    from_template('#devicetemplate')
                                        .attr('id', dev.id)
                                        .appendTo('#devicelist')
                                        .find('.item-title').text(dev.name).end()
                                        .find('.item-subtitle').text(dev.mode).end()
                                        .click(function () {
                                            $.get('https://' + document.location.hostname + '/api/helper.php?vol&dev=' + dev.id,
                                                function (data) {
                                                var playersName = ["MPD", "Squeezebox", "Airplay & Spotify", "Line-In"];
                                                var playersCmd = ["mpd", "squeeze", "airplay", "LineIn"];
                                                var vol = data.split(';');
                                                var popup = app.popup.create({
                                                    content:
                                                    '<div class="popup theme-dark popup-mv">' +
                                                    '   <div id="pop-title" class="title text-color-white op"' +
                                                    '       style="text-align: center; padding: 15px; font-weight: bold;' +
                                                    '       background: black"></div>' +
                                                    '   <div class="list" style="margin: 0">' +
                                                    '       <ul id="vollist"></ul>' +
                                                    '       <template id="voltemplate">' +
                                                    '           <li class="item-content" style="display: block;' +
                                                    '               padding: 15px">' +
                                                    '               <div class="title text-color-white op"></div>' +
                                                    '               <div class="range-slider" style="display: table;' +
                                                    '                       margin: 5px auto; text-align: center">' +
                                                    '                   <input style="display: inline-block; width: 75%"' +
                                                    '                       class="range-slider__range" type="range"' +
                                                    '                       min="0" max="100" step="10">' +
                                                    '                   <span class="range-slider__value op"></span>' +
                                                    '               </div>' +
                                                    '           </li>' +
                                                    '       </template>' +
                                                    '   </div>' +
                                                    '   <button class="button link popup-close text-color-white op"' +
                                                    '       style="width: 80%; margin: 15px auto;' +
                                                    '       background: black">Schließen</button>' +
                                                    '</div>',
                                                    on: {
                                                        open: function (popup) {
                                                            $('#pop-title').text(dev.name).attr('dev', dev.id);
                                                            var c2 = 0;
                                                            vol.forEach(function (volEl) {
                                                                if(volEl != "") {
                                                                    from_template('#voltemplate')
                                                                        .appendTo('#vollist')
                                                                        .find('.title').text(playersName[c2]).end()
                                                                        .find('.range-slider__value').text(volEl)
                                                                        .attr('id', 'val' + c2).end()
                                                                        .find('.range-slider__range')
                                                                        .attr('id', 'input' + c2)
                                                                        .attr('value', parseInt(volEl))
                                                                        .on('input', function () {
                                                                            var id = parseInt($(this).attr('id')
                                                                                    .toString().replace("input", ""));
                                                                            $('#val'+id).text($(this).val());
                                                                        })
                                                                        .on('change', function () {
                                                                            var id = parseInt($(this).attr('id')
                                                                                .toString().replace("input", ""));
                                                                            $.get('https://' + document.location.hostname
                                                                                + '/api/helper.php?vol_set'
                                                                                + '&dev=' + $('#pop-title').attr('dev')
                                                                                + '&player=' + playersCmd[id]
                                                                                + '&value=' + $(this).val(),
                                                                                function (data) {});
                                                                        });
                                                                }
                                                                c2++;
                                                            });
                                                        }
                                                    }
                                                });
                                                popup.open();
                                            });
                                        });
                               });
                           }
                        });
                    });
                }
            }
        }
    ]
});

var mainView = app.views.create('.view-main');

var $$ = Dom7;

$$('.popup-volumes').on('popup:open', function (e, popup) {
    $('.popup-volumes').css('display', 'block');
    $('.popup-volumes').addClass('show');
});

$$('.popup-volumes').on('popup:closed', function (e, popup) {
    $('.popup-volumes').css('display', 'none');
    $('.popup-volumes').removeClass('show');
    $('.modal-open').removeClass('modal-open');
});