var app = new Framework7({
    // App root element
    root: '#app',
    // App Name
    name: 'InnoPlay Mobile',
    // App id
    id: 'at.innotune.innoplaymobile',
    theme: 'ios',
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
                '                   <span class="ios-only" data-langkey="back">Zurück</span>' +
                '               </a>' +
                '           </div>' +
                '           <div class="title" data-langkey="general">Allgemein</div>' +
                '       </div>' +
                '   </div>' +
                '   <div class="page-content side-padding">' +
                '       <div class="list" style="margin: 0">' +
                '           <ul>' +
                '               <li class="item-divider" data-langkey="innotune_version">InnoTune-Version</li>' +
                '               <li class="item-content">' +
                '                   <div class="item-inner">' +
                '                       <div id="actual" class="item-title text-color-white op" data-langkey="current_version">Aktuell: </div>' +
                '                   </div>' +
                '               </li>' +
                '               <li class="item-content">' +
                '                   <div class="item-inner">' +
                '                       <div id="available" class="item-title text-color-white op" data-langkey="newest_version">Neueste: </div>' +
                '                       <div class="item-after">' +
                '                           <button id="updatelink" class="button open-confirm text-color-white op" data-langkey="update">Update</button>' +
                '                       </div>' +
                '                   </div>' +
                '               </li>' +
                '               <li class="item-divider" data-langkey="server">Server</li>' +
                '               <li class="item-content">' +
                '                   <div id="address" class="item-inner text-color-white op"></div>' +
                '               </li>' +
                '               <li class="item-content">' +
                '                   <div id="port" class="item-inner text-color-white op"></div>' +
                '               </li>' +
                '               <li class="item-divider" data-langkey="vpn_title">Fernwartungszugang (VPN)</li>' +
                '               <li class="item-content">' +
                '                   <div id="vpn_state" class="item-inner text-color-white op"></div>' +
                '               </li>' +
                '               <li class="item-content">' +
                '                   <div class="item-inner">' +
                '                       <div id="vpn_conn" class="item-title text-color-white op" data-langkey="grant_access">Zugriff gewähren: </div>' +
                '                       <div class="item-after">' +
                '                           <label class="toggle toggle-init op">' +
                '                               <input id="vpn_checkbox" type="checkbox"/>' +
                '                               <span class="toggle-icon"></span>' +
                '                           </label>' +
                '                       </div>' +
                '                   </div>' +
                '               </li>' +
                '               <li class="item-divider" data-langkey="more_info">Weitere Informationen</li>' +
                '               <li>' +
                '                   <a class="item-link link external item-content text-color-white op" target="_blank"' +
                '                       data-href="http://www.innotune.at/" href="http://www.innotune.at/" data-langkey="innotune_web">InnoTune-Website</a>' +
                '               </li>' +
                '               <li>' +
                '                   <a class="item-link link external item-content text-color-white op" target="_blank"' +
                '                       data-href="https://icons8.com" href="https://icons8.com" data-langkey="iconpack">Icon pack by Icons8</a>' +
                '               </li>' +
                '           </ul>' +
                '       </div>' +
                '   </div>' +
                '</div>',
            on: {
                pageBeforeIn: function (event, page) {
                    processLangDocument();
                    $('#address').html(langDocument['hostname'] + document.location.hostname);
                    $('#port').html(langDocument['port'] + document.location.port);

                    $('#available').load('https://raw.githubusercontent.com/sevelm/InnoTune/master/version.txt',
                        function (response, status, xhr) {
                            if (status == "success") {
                                $('#available').html(langDocument['newest_version'] + response);
                            } else {
                                $('#available').html(langDocument['newest_error']);
                            }
                        });

                    $('#actual').load('http://' + document.location.hostname + '/api/helper.php?getversion',
                        function (response, status, xhr) {
                            if (status == "success") {
                                $('#actual').html(langDocument['current_version'] + response);
                            } else {
                                $('#actual').html(langDocument['current_error']);
                            }
                        });


                    $('#vpn_state').load('http://' + document.location.hostname + '/api/helper.php?vpn_running',
                        function (response, status, xhr) {
                            if (status == "success") {
                                if (response == "1\n") {
                                    $('#vpn_checkbox').attr('checked', 'checked');
                                    $('#vpn_state').html(langDocument['vpn_state_conn']);
                                } else {
                                    $('#vpn_state').html(langDocument['vpn_state_disc']);
                                }
                            } else {
                                $('#vpn_state').html(langDocument['vpn_state_error']);
                            }
                        });


                    $('#vpn_checkbox').change(function () {
                        console.log('checkbox: ' + this.checked);
                        var url = 'http://' + document.location.hostname + '/api/helper.php?';
                        if (this.checked) {
                            url = url + 'vpn_connect';
                        } else {
                            url = url + 'vpn_disconnect';
                        }
                        var dialog = app.dialog.create({
                            title: langDocument['vpn_title'],
                            text: langDocument['vpn_text'],
                            buttons: [
                                {
                                    text: langDocument['update_error_button']
                                }
                            ],
                            verticalButtons: false
                        }).open();

                        $('#vpn_checkbox').load(url,
                            function (response, status, xhr) {
                                setTimeout(function() {
                                    $('#vpn_state').load('http://' + document.location.hostname + '/api/helper.php?vpn_running',
                                        function (response, status, xhr) {
                                            if (status == "success") {
                                                if (response == "1\n") {
                                                    $('#vpn_state').html(langDocument['vpn_state_conn']);
                                                } else {
                                                    $('#vpn_state').html(langDocument['vpn_state_disc']);
                                                }
                                            } else {
                                                $('#vpn_state').html(langDocument['vpn_state_error']);
                                            }
                                            dialog.close();
                                        });
                                }, 5000);
                            });
                    });

                    $$('.open-confirm').on('click', function () {
                        if (!internetLost &&
                            $('#available').html() !== langDocument['current_version'] + ' ' &&
                            $('#available').html() !== langDocument['available_error']) {
                            app.dialog.create({
                                title: langDocument['update_title'],
                                text: langDocument['update_text'],
                                buttons: [
                                    {
                                        text: langDocument['update_cancel']
                                    },
                                    {
                                        text: langDocument['update_start'],
                                        onClick: function () {
                                            console.log('start update');
                                            app.dialog.preloader(langDocument['update_status']);
                                            $('#updatelink').load('http://' + document.location.hostname + '/api/helper.php?update',
                                                function (response, status, xhr) {
                                                    app.dialog.close();
                                                    if (status == "success") {
                                                        console.log('update finished');
                                                        app.dialog.preloader(langDocument['update_reboot']);
                                                        $('#updatelink').load('http://' + document.location.hostname +
                                                            '/api/helper.php?reboot',
                                                            function (response, status, xhr) {
                                                                console.log('reboot: ' + status);
                                                                setInterval(function () {
                                                                    $('#updatelink').load('http://' + document.location.hostname + ':' +
                                                                        document.location.port + '/m/',
                                                                        function (response, status, xhr) {
                                                                            if (status == "success") {
                                                                                setTimeout(function () {
                                                                                    location.reload(true);
                                                                                }, 10000);
                                                                            } else {
                                                                                console.log('error');
                                                                            }
                                                                        })
                                                                }, 4000);
                                                            });
                                                    } else {
                                                        console.log('update failed');
                                                        app.dialog.create({
                                                            title: langDocument['update_error_title'],
                                                            text: langDocument['update_error_text'],
                                                            buttons: [
                                                                {
                                                                    text: langDocument['update_error_button']
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
                        } else {
                            app.dialog.create({
                                title: langDocument['update_no_internet'],
                                text: langDocument['update_no_internet_text'],
                                buttons: [
                                    {
                                        text: langDocument['update_error_button']
                                    }
                                ],
                                verticalButtons: false
                            }).open();
                        }
                    });
                }
            }
        },
        {
            name: 'master-volume',
            path: '/master-volume/',
            content: '<div data-name="master-volume" class="page">' +
                '    <div class="navbar">' +
                '        <div class="navbar-inner">' +
                '            <div class="left">' +
                '                <a class="link back" href="/">' +
                '                    <i class="icon icon-back"></i>' +
                '                    <span class="ios-only" data-langkey="back">Zurück</span>' +
                '                </a>' +
                '            </div>' +
                '            <div class="title" data-langkey="master_volume">Master-Lautstärke</div>' +
                '        </div>' +
                '    </div>' +
                '    <div class="page-content side-padding" id="content">' +
                '       <div class="block" style="margin: 2% 0" data-langkey="master_vol_text">Wählen Sie eine Zone um die Master-Lautstärke zu regulieren.</div>' +
                '       <div class="list" style="margin: 0">' +
                '           <ul id="devicelist">' +
                '           </ul>' +
                '           <template id="devicetemplate">' +
                '               <li class="item-content">' +
                '                   <div class="item-media">' +
                '                        <img class="op" style="width: 40%;" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAK9SURBVGhD7Zk/aBRBGMVPLwkWahALFUTRRonEQhMQtAykMEIQRNFCxCZFCkEr0UJEEFOlCViolUIugihJoxaKgk1QtPEfCkZJYaGxUDHG0993vrvkuL25C2T3ZsP84PHtvpnJvo/LbG43mcBiIJ/Pr0RX0Ne/guMJdFJT0gGBbyh/BYwd0zS/Iesywk6j72i9bGvukBq5L8tvyLpBgT/IKsB5u/wXshoDGZrQqlqaE7hqI5Qsily/gFquS8+C2USA99S6cTVSPI4brnNCl/8P3lL0gIEvtcS8Kf0QVyNtNjdmfUZHdPn5Q1a/90i9LKZGbD/9QL/Qbs7tBrAanVIjY5rqP4QdtNBRMNajaf5D3mYCn0FP0TvpIdqvKYFAIFAJN4+1aLPULDs9cJdrR/YlswTnP9FpTfEfMtsf1jcKP0EZpz5H0+ZBr6b6DYGLX2leUrKyze+Tf02W35B1jwI/klWA873yR2XNDxauYf3OpMT1jlOdjVBaUbX126mlT7IARgsDpTciSeJqpHhcDcbPadksmFcZG09KXO8VtdYnYr9+1dY/Qd1a1jgIE88eSRpHIz3y78jyG4Kus8AwxfE+qm3gXWjETOolTfUfwtq+jMKa26hp/kPgLIH70W10TxpCmzQlEAg0AjanvT3poHZJW9ESDacDGtiCXhO8DLy7lMo3475C4McKbk90OepN9FHegKb5DVntv1R/qPYmvkW2NbdDjTyT5TdktecCC1z24hor8oV2QyGPPbAciBJBj1KdjVCs2cj1MakXle9NjFbC/KY6cTWCEvkv1Vy4ZuXexLzAWC5KjN2i1vpE7DhyfRzimtdRh6LUBwvTs0dcEHSFAk/KKoBlbwbNfyvLfwj7SaHPU+wGcBANmwc5TfMfQh9GMwpeAu8b2qZp6YDAnWS/SL0snUXpeZILJEYm8w+aOmYFewA5rAAAAABJRU5ErkJggg==">' +
                '                   </div>' +
                '                   <div class="item-inner" style="margin-left: 0">' +
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
                    processLangDocument();
                    $.ajax({
                        url: 'http://' + document.location.hostname + '/api/helper.php?activedevices',
                        success: function (data) {
                            var devices = [];
                            var devIds = data.split(';');
                            var count = 1;
                            var c = 1;
                            devIds.forEach(function (value) {
                                if (value != "") {
                                    if (count < 10) {
                                        value = "0" + count;
                                    } else {
                                        value = count;
                                    }
                                    count++;
                                    $.get('http://' + document.location.hostname + '/api/helper.php?getdevice&dev=' + value,
                                        function (data) {
                                            devData = data.split(';');
                                            var devId;
                                            if (c < 10) {
                                                devId = "0" + c;
                                            } else {
                                                devId = c;
                                            }
                                            var name;
                                            if (devData[1] != "") {
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
                                            var dev = {'id': devId, 'mode': mode, 'name': name, 'mac': devData[4]};
                                            devices.push(dev);
                                            c++;
                                            from_template('#devicetemplate')
                                                .attr('id', dev.id)
                                                .appendTo('#devicelist')
                                                .find('.item-title').text(dev.name).end()
                                                .find('.item-subtitle').text(dev.mode).end()
                                                .click(function () {
                                                    app.dialog.progress();
                                                    $.get('http://' + document.location.hostname + '/api/helper.php?vol&dev=' + dev.id,
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
                                                                    '       <ul id="vollist" class="side-padding"></ul>' +
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
                                                                    '       background: black" data-langkey="close">' + langDocument['close'] + '</button>' +
                                                                    '</div>',
                                                                on: {
                                                                    open: function (popup) {
                                                                        processLangDocument();
                                                                        app.dialog.close();
                                                                        $('#pop-title').text(dev.name).attr('dev', dev.id);
                                                                        var c2 = 0;
                                                                        vol.forEach(function (volEl) {
                                                                            if (volEl != "") {
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
                                                                                        $('#val' + id).text($(this).val());
                                                                                    })
                                                                                    .on('change', function () {
                                                                                        var id = parseInt($(this).attr('id')
                                                                                            .toString().replace("input", ""));
                                                                                        $.get('http://' + document.location.hostname
                                                                                            + '/api/helper.php?vol_set'
                                                                                            + '&dev=' + $('#pop-title').attr('dev')
                                                                                            + '&player=' + playersCmd[id]
                                                                                            + '&value=' + $(this).val(),
                                                                                            function (data) {
                                                                                            });
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
                        },
                        error: function () {
                            from_template('#devicetemplate')
                                .attr('id', "-1")
                                .appendTo('#devicelist')
                                .find('.item-title').text("Keine Zonen gefunden").end();
                        }
                    });
                },
                pageBeforeOut: function (event, page) {
                    app.dialog.close();
                }
            }
        },
        {
            name: 'equal',
            path: '/equal/',
            content: '<div data-name="equal" class="page">' +
                '    <div class="navbar">' +
                '        <div class="navbar-inner">' +
                '            <div class="left">' +
                '                <a class="link back" href="/">' +
                '                    <i class="icon icon-back"></i>' +
                '                    <span class="ios-only" data-langkey="back">Zurück</span>' +
                '                </a>' +
                '            </div>' +
                '            <div class="title" data-langkey="equalizer">Equalizer</div>' +
                '        </div>' +
                '    </div>' +
                '    <div class="page-content side-padding" id="content">' +
                '       <div class="block" style="margin: 2% 0" data-langkey="equalizer_text">Wählen Sie eine Zone um den Equalizer zu regulieren.</div>' +
                '       <div class="list" style="margin: 0">' +
                '           <ul id="devicelist">' +
                '           </ul>' +
                '           <template id="devicetemplate">' +
                '               <li class="item-content">' +
                '                   <div class="item-media">' +
                '                        <img class="op" style="width: 40%;" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAK9SURBVGhD7Zk/aBRBGMVPLwkWahALFUTRRonEQhMQtAykMEIQRNFCxCZFCkEr0UJEEFOlCViolUIugihJoxaKgk1QtPEfCkZJYaGxUDHG0993vrvkuL25C2T3ZsP84PHtvpnJvo/LbG43mcBiIJ/Pr0RX0Ne/guMJdFJT0gGBbyh/BYwd0zS/Iesywk6j72i9bGvukBq5L8tvyLpBgT/IKsB5u/wXshoDGZrQqlqaE7hqI5Qsily/gFquS8+C2USA99S6cTVSPI4brnNCl/8P3lL0gIEvtcS8Kf0QVyNtNjdmfUZHdPn5Q1a/90i9LKZGbD/9QL/Qbs7tBrAanVIjY5rqP4QdtNBRMNajaf5D3mYCn0FP0TvpIdqvKYFAIFAJN4+1aLPULDs9cJdrR/YlswTnP9FpTfEfMtsf1jcKP0EZpz5H0+ZBr6b6DYGLX2leUrKyze+Tf02W35B1jwI/klWA873yR2XNDxauYf3OpMT1jlOdjVBaUbX126mlT7IARgsDpTciSeJqpHhcDcbPadksmFcZG09KXO8VtdYnYr9+1dY/Qd1a1jgIE88eSRpHIz3y78jyG4Kus8AwxfE+qm3gXWjETOolTfUfwtq+jMKa26hp/kPgLIH70W10TxpCmzQlEAg0AjanvT3poHZJW9ESDacDGtiCXhO8DLy7lMo3475C4McKbk90OepN9FHegKb5DVntv1R/qPYmvkW2NbdDjTyT5TdktecCC1z24hor8oV2QyGPPbAciBJBj1KdjVCs2cj1MakXle9NjFbC/KY6cTWCEvkv1Vy4ZuXexLzAWC5KjN2i1vpE7DhyfRzimtdRh6LUBwvTs0dcEHSFAk/KKoBlbwbNfyvLfwj7SaHPU+wGcBANmwc5TfMfQh9GMwpeAu8b2qZp6YDAnWS/SL0snUXpeZILJEYm8w+aOmYFewA5rAAAAABJRU5ErkJggg==">' +
                '                   </div>' +
                '                   <div class="item-inner" style="margin-left: 0">' +
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
                    processLangDocument();
                    $.ajax({
                        url: 'http://' + document.location.hostname + '/api/helper.php?activedevices',
                        success: function (data) {
                            var devices = [];
                            var devIds = data.split(';');
                            var count = 1;
                            var c = 1;
                            devIds.forEach(function (value) {
                                if (value != "") {
                                    if (count < 10) {
                                        value = "0" + count;
                                    } else {
                                        value = count;
                                    }
                                    count++;
                                    $.get('http://' + document.location.hostname + '/api/helper.php?getdevice&dev=' + value,
                                        function (data) {
                                            devData = data.split(';');
                                            var devId;
                                            if (c < 10) {
                                                devId = "0" + c;
                                            } else {
                                                devId = c;
                                            }
                                            var name;
                                            if (devData[1] != "") {
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
                                            var dev = {'id': devId, 'mode': mode, 'name': name, 'mac': devData[4]};
                                            devices.push(dev);
                                            c++;
                                            from_template('#devicetemplate')
                                                .attr('id', dev.id)
                                                .appendTo('#devicelist')
                                                .find('.item-title').text(dev.name).end()
                                                .find('.item-subtitle').text(dev.mode).end()
                                                .click(function () {
                                                    app.dialog.progress();
                                                    $.get('http://' + document.location.hostname + '/api/helper.php?eq&dev=' + dev.id,
                                                        function (data) {
                                                            var eqdata = data.split(';');
                                                            var popup = app.popup.create({
                                                                content:
                                                                    '<div class="popup theme-dark popup-mv">' +
                                                                    '   <div id="pop-title" class="title text-color-white op"' +
                                                                    '       style="text-align: center; padding: 15px; font-weight: bold;' +
                                                                    '       background: black"></div>' +
                                                                    '   <div class="list" style="margin: 0">' +
                                                                    '       <ul id="eqlist" class="side-padding"></ul>' +
                                                                    '       <template id="eqtemplate">' +
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
                                                                    '       background: black" data-langkey="close">' + langDocument['close'] + '</button>' +
                                                                    '</div>',
                                                                on: {
                                                                    open: function (popup) {
                                                                        processLangDocument();
                                                                        app.dialog.close();
                                                                        $('#pop-title').text(dev.name).attr('dev', dev.id);
                                                                        var freqName = ['Tiefen', 'Mitten', 'Höhen'];
                                                                        var freqCmd = ['low', 'mid', 'high'];
                                                                        var c2 = 0;
                                                                        eqdata.forEach(function (eqVal) {
                                                                            if (eqVal != "") {
                                                                                var val = Math.round(parseInt(eqVal) / 10) * 10;
                                                                                from_template('#eqtemplate')
                                                                                    .appendTo('#eqlist')
                                                                                    .find('.title').text(freqName[c2]).end()
                                                                                    .find('.range-slider__value').text(val)
                                                                                    .attr('id', 'val' + c2).end()
                                                                                    .find('.range-slider__range')
                                                                                    .attr('id', 'input' + c2)
                                                                                    .attr('value', val)
                                                                                    .on('input', function () {
                                                                                        var id = parseInt($(this).attr('id')
                                                                                            .toString().replace("input", ""));
                                                                                        $('#val' + id).text($(this).val());
                                                                                    })
                                                                                    .on('change', function () {
                                                                                        var id = parseInt($(this).attr('id')
                                                                                            .toString().replace("input", ""));
                                                                                        $.get('http://' + document.location.hostname
                                                                                            + '/api/helper.php?eq_set'
                                                                                            + '&dev=' + $('#pop-title').attr('dev')
                                                                                            + '&freq=' + freqCmd[id]
                                                                                            + '&value=' + $(this).val(),
                                                                                            function (data) {
                                                                                            });
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
                        },
                        error: function () {
                            from_template('#devicetemplate')
                                .attr('id', "-1")
                                .appendTo('#devicelist')
                                .find('.item-title').text("Keine Zonen gefunden").end();
                        }
                    });
                },
                pageBeforeOut: function (event, page) {
                    app.dialog.close();
                }
            }
        }, {
            name: 'history',
            path: '/history/',
            content:
                '<div data-name="history" class="page">' +
                '    <div class="navbar">' +
                '        <div class="navbar-inner" style="background: black">' +
                '            <div class="left">' +
                '                <a class="link back" href="/">' +
                '                    <i class="icon icon-back"></i>' +
                '                    <span class="ios-only" data-langkey="back">Zurück</span>' +
                '                </a>' +
                '            </div>' +
                '            <div class="title" data-langkey="history">Verlauf</div>' +
                '        </div>' +
                '    </div>' +
                '    <div class="page-content side-padding" id="historycontent">' +
                '    </div>' +
                '</div>',
            on: {
                pageBeforeIn: function (event, page) {
                    processLangDocument();
                    $.ajax({
                        url: 'http://' + document.location.hostname + '/api/helper.php?radiohistory',
                        success: function (data) {
                            if (data !== '') {
                                let history = [];
                                let lines = data.split('\n');
                                lines.forEach(function (value, index, array) {
                                    if (index < (lines.length - 1)) {
                                        let fields = value.split(';');
                                        history.push({
                                            id: fields[0],
                                            name: fields[1],
                                            type: fields[2],
                                            image: fields[3],
                                            url: fields[4]
                                        });
                                    }
                                });
                                history.reverse().forEach(function (item) {
                                    from_template('#menu-item-template')
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
                                        .click(() => {
                                            history_item_clicked(item);
                                            window.location.href = "/m";
                                        })
                                        .appendTo('#historycontent');
                                });
                            } else {
                                from_template('#menu-item-template')
                                    .find('.title')
                                    .text(langDocument['history_empty'])
                                    .end()
                                    .click(() => {
                                    })
                                    .appendTo('#historycontent');
                            }
                        },
                        error: function () {
                            from_template('#menu-item-template')
                                .find('.title')
                                .text(langDocument['history_empty'])
                                .end()
                                .click(() => {
                                })
                                .appendTo('#historycontent');
                        }
                    });
                },
                pageBeforeOut: function (event, page) {
                    app.dialog.close();
                }
            }
        }, {
            name: 'linein',
            path: '/linein/',
            content:
                '<div data-name="linein" class="page">' +
                '    <div class="navbar">' +
                '        <div class="navbar-inner" style="background: black">' +
                '            <div class="left">' +
                '                <a class="link back" href="/">' +
                '                    <i class="icon icon-back"></i>' +
                '                    <span class="ios-only" data-langkey="back">Zurück</span>' +
                '                </a>' +
                '            </div>' +
                '            <div class="title" data-langkey="linein">Line-In</div>' +
                '        </div>' +
                '    </div>' +
                '    <div class="page-content side-padding">' +
                '       <div class="block-title" data-langkey="input">Eingang</div>' +
                '       <div class="list">' +
                '           <ul>' +
                '               <li>' +
                '                   <div class="item-content item-input">' +
                '                       <div class="item-inner">' +
                '                           <div class="item-input-wrap op">' +
                '                               <input type="text" placeholder="Amp auswählen" readonly="readonly" id="demo-picker-device"/>' +
                '                           </div>' +
                '                       </div>' +
                '                   </div>' +
                '               </li>' +
                '           </ul>' +
                '       </div>' +
                '       <div class="block-title" data-langkey="output">Ausgang</div>' +
                '       <div class="list">' +
                '           <ul id="lineincontent"></ul>' +
                '           <template id="lineintemplate">' +
                '               <li>' +
                '                   <label class="item-checkbox item-content op">' +
                '                       <input class="linecheckbox" name="lineincb" type="checkbox" />' +
                '                       <i class="icon icon-checkbox"></i>' +
                '                       <div class="item-inner">' +
                '                           <div class="item-title"></div>' +
                '                           <span class="item-after"></span>' +
                '                       </div>' +
                '                   </label>' +
                '               </li>' +
                '           </template>' +
                '       </div>' +
                '       <a href="#" id="linevol" class="button op" style="width: 94%; margin-left: 3%" data-langkey="volreg"></a>' +
                '       <div style="text-align: center; margin-top: 5%">' +
                '           <img id="lineplay" class="op" style="margin-right: 3%" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAQAAAC0NkA6AAAAAmJLR0QA/4ePzL8AAADuSURBVFjD7ZcxDgFRFEUnolDpFFo6hYSSygKUtqBV2oItqCRKW9ArjHZChWglOgUJ139RaGf+OJOIOd2vTjLz/v33BUFOjqG2DjpqqCIpmelNpD4nWejDSl1eIj3duU5LjLumqtAS46KxSrTEOLmZK9ASY6MeLzGWavIS6aG5qrTEuGqiMi0xzhp5xU8iibHTgJf4xI+XJGn8eEqSxU8KSfz4SSmJFz9fkBhrNXiJG+0sJFteEtKfC//x+AjjlzGDWMEDEo96/NHCn98MigReiUK63OE1FS/cN3p1sLio0etc54cX05b2+Iqd8x+8AM9nigEsE2kdAAAAAElFTkSuQmCC">' +
                '           <img id="linestop" class="op" style="margin-left: 3%" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAQAAAC0NkA6AAAAAmJLR0QA/4ePzL8AAABcSURBVFjD7dbBDYAwDMXQLAqqYGRSpon0WSEJUi+1F3hXmxHR9unSVKhSaGpUiFvd8ozeNuJ5JNpI5JEfgYCAgICAgIAsQJYs0WwjTx4ZbeQwqzBeHm7XaUS0fR9VcPL3YQju1wAAAABJRU5ErkJggg==">' +
                '       </div>' +
                '    </div>' +
                '    <div id="picker-backdrop" class="picker-backdrop"></div>' +
                '</div>',
            on: {
                pageBeforeIn: function (event, page) {
                    processLangDocument();
                    document.getElementById("demo-picker-device").placeholder = langDocument['select_amp'];

                    $.ajax({
                        url: 'http://' + document.location.hostname + '/api/helper.php?activedevices',
                        success: function (data) {
                            var sourceIds = [];
                            var sourceDisplay = [];
                            var outputDevices = [];
                            var devIds = data.split(';');
                            var count = 1;
                            var c = 1;
                            var i = 0;
                            devIds.forEach(function (value) {
                                if (value != "") {
                                    if (count < 10) {
                                        value = "0" + count;
                                    } else {
                                        value = count;
                                    }
                                    count++;
                                    $.get('http://' + document.location.hostname + '/api/helper.php?getdevice&dev=' + value,
                                        function (data) {
                                            let devData = data.split(';');

                                            sourceIds.push(value);

                                            let name = undefined;
                                            let nameL = undefined;
                                            let nameR = undefined;
                                            if (devData[1] != "") {
                                                name = devData[1];
                                                sourceDisplay.push(name);
                                                outputDevices.push({id: value, mode: undefined, name: name});

                                                from_template('#lineintemplate')
                                                    .find('.item-title')
                                                    .text(name)
                                                    .end()
                                                    .find('.linecheckbox')
                                                    .val(i)
                                                    .end()
                                                    .find('.item-after')
                                                    .attr('id', 'linestate' + value)
                                                    .end()
                                                    .appendTo('#lineincontent');

                                                i++;
                                            } else {
                                                nameL = devData[2];
                                                nameR = devData[3];
                                                sourceDisplay.push(nameL + ' - ' + nameR);
                                                outputDevices.push({id: value, mode: 'li', name: nameL});

                                                from_template('#lineintemplate')
                                                    .find('.item-title')
                                                    .text(nameL)
                                                    .end()
                                                    .find('.linecheckbox')
                                                    .val(i)
                                                    .end()
                                                    .find('.item-after')
                                                    .attr('id', 'linestate' + value + 'li')
                                                    .end()
                                                    .appendTo('#lineincontent');
                                                i++;

                                                outputDevices.push({id: value, mode: 're', name: nameR});

                                                from_template('#lineintemplate')
                                                    .find('.item-title')
                                                    .text(nameR)
                                                    .end()
                                                    .find('.linecheckbox')
                                                    .val(i)
                                                    .end()
                                                    .find('.item-after')
                                                    .attr('id', 'linestate' + value + 're')
                                                    .end()
                                                    .appendTo('#lineincontent');
                                                i++;
                                            }
                                            c++;
                                        });
                                }
                            });

                            let sourcePicker = app.picker.create({
                                inputEl: '#demo-picker-device',
                                cols: [
                                    {
                                        textAlign: 'center',
                                        values: sourceDisplay
                                    }
                                ],
                                renderToolbar: function () {
                                    return '<div class="toolbar">' +
                                        '<div class="toolbar-inner">' +
                                        '<div class="left"></div>' +
                                        '<div class="right">' +
                                        '<a href="#" class="link sheet-close popover-close" data-langkey="select_input">Eingang auswählen</a>' +
                                        '</div>' +
                                        '</div>' +
                                        '</div>';
                                },
                                on: {
                                    opened: function () {
                                        processLangDocument();
                                        let backdrop = document.getElementById('picker-backdrop');

                                        if (backdrop !== undefined && backdrop !== null) {
                                            backdrop.style.visibility = "visible";
                                            backdrop.style.opacity = 1;
                                            backdrop.onclick = function () {
                                                sourcePicker.close();
                                            };
                                        }
                                    },
                                    closed: function () {
                                        let backdrop = document.getElementById('picker-backdrop');

                                        if (backdrop !== undefined && backdrop !== null) {
                                            backdrop.style.opacity = 0;
                                            backdrop.style.visibility = "hidden";
                                            backdrop.onclick = function () {
                                            };
                                        }
                                    }
                                }
                            });

                            $('#lineplay').click(function () {
                                let elements = document.getElementsByName("lineincb");
                                if (sourcePicker.getValue() !== undefined && sourcePicker.getValue().length > 0) {
                                    let source = sourcePicker.getValue()[0];
                                    let sourceId = sourceIds[sourceDisplay.indexOf(source)];
                                    elements.forEach(function (element) {
                                        if (element.checked) {
                                            let out = outputDevices[element.value];

                                            let parameter = '&card_in=' + sourceId + '&card_out=' + out.id;
                                            if (out.mode !== undefined) {
                                                parameter = parameter + '&mode=' + out.mode;
                                            }

                                            $.get('http://' + document.location.hostname + '/api/helper.php?setlinein' + parameter,
                                                function () {
                                                    if (out.mode === undefined) {
                                                        $('#linestate' + out.id).text('(playing)');
                                                    } else {
                                                        $('#linestate' + out.id + out.mode).text('(playing)');
                                                    }
                                                });
                                        }
                                    });
                                }
                            });

                            $('#linestop').click(function () {
                                let elements = document.getElementsByName("lineincb");

                                elements.forEach(function (element) {
                                    if (element.checked) {
                                        let out = outputDevices[element.value];
                                        let parameter = out.id;
                                        if (out.mode !== undefined) {
                                            parameter = parameter + out.mode;
                                        }

                                        $.get('http://' + document.location.hostname + '/api/helper.php?setlinein&card_out=' + parameter,
                                            function () {
                                                if (out.mode === undefined) {
                                                    $('#linestate' + out.id).text('');
                                                } else {
                                                    $('#linestate' + out.id + out.mode).text('');
                                                }
                                            });
                                    }
                                });
                            });

                            setTimeout(function () {
                                count = 1;
                                devIds.forEach(function (value) {
                                    if (value != "") {
                                        if (count < 10) {
                                            value = "0" + count;
                                        } else {
                                            value = count;
                                        }
                                        count++;
                                        $.get('http://' + document.location.hostname + '/api/helper.php?lineinstatus&dev=' + value,
                                            function (lineinstatus) {
                                                if (lineinstatus.includes(';')) {
                                                    let data = lineinstatus.split(';');
                                                    if (data[0] !== "") {
                                                        $('#linestate' + value + 're').val('(playing)');
                                                    }
                                                    if (data[1] !== "") {
                                                        $('#linestate' + value + 'li').text('(playing)');
                                                    }
                                                } else {
                                                    if (lineinstatus.replace('\n', '') !== "") {
                                                        $('#linestate' + value).text('(playing)');
                                                    }
                                                }
                                            });
                                    }
                                });
                            }, 1000);


                            $('#linevol').click(function () {
                                app.dialog.progress();
                                var popup = app.popup.create({
                                    content:
                                        '<div class="popup theme-dark popup-mv">' +
                                        '   <div id="pop-title" class="title text-color-white op"' +
                                        '       style="text-align: center; padding: 15px; font-weight: bold;' +
                                        '       background: black" data-langkey="volreg">Lautstärkenregelung</div>' +
                                        '   <div class="list" style="margin: 0">' +
                                        '       <ul id="eqlist" class="side-padding"></ul>' +
                                        '       <template id="eqtemplate">' +
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
                                        '       background: black" data-langkey="close">' + langDocument['close'] + '</button>' +
                                        '</div>',
                                    on: {
                                        open: function (popup) {
                                            processLangDocument();

                                            sourceIds.forEach(function (id) {
                                                $.get('http://' + document.location.hostname + '/api/helper.php?vol&dev=' + id,
                                                    function (data) {
                                                        let voldata = data.split(';');
                                                        let linevol = Math.round(parseInt(voldata[3]) / 10) * 10;

                                                        from_template('#eqtemplate')
                                                            .appendTo('#eqlist')
                                                            .find('.title').text(sourceDisplay[sourceIds.indexOf(id)]).end()
                                                            .find('.range-slider__value').text(linevol)
                                                            .attr('id', 'val' + id).end()
                                                            .find('.range-slider__range')
                                                            .attr('id', 'input' + id)
                                                            .attr('value', linevol)
                                                            .on('input', function () {
                                                                $('#val' + id).text($(this).val());
                                                            })
                                                            .on('change', function () {
                                                                $.get('http://' + document.location.hostname
                                                                    + '/api/helper.php?vol_set'
                                                                    + '&dev=' + id
                                                                    + '&player=LineIn'
                                                                    + '&value=' + $(this).val(),
                                                                    function (data) {
                                                                    });
                                                            });
                                                    });
                                            });

                                            setTimeout(function () {
                                                app.dialog.close();
                                            }, 1000);
                                        }
                                    }
                                });
                                popup.open();
                            });
                        },
                        error: function () {
                            console.log("Keine Zonen gefunden");
                        }
                    });
                },
                pageBeforeOut: function (event, page) {
                    app.dialog.close();
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

var notification = app.notification.create({
    title: 'Internetverbindung unterbrochen',
    text: 'Ihr InnoServer hat derzeit keine Verbindung zum Internet.',
    closeButton: true,
    on: {
        opened: function () {
            console.log('notify opened')
        },
        closed: function () {
            console.log('notify closed')
        }
    }
});

var notificationShowing = false;
var internetLost = false;
var internetCheck = function () {
    $.get('http://' + document.location.hostname + '/api/helper.php?ping',
        function (data) {
            if (data !== '') {
                internetLost = data !== '0';
            } else {
                internetLost = true;
            }

            if (internetLost) {
                if (!notificationShowing) {
                    notificationShowing = true;
                    notification.open();
                }
            } else {
                notificationShowing = false;
                notification.close();
            }
        });
};

internetCheck();
setInterval(internetCheck, 60000);