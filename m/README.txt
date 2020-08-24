                                                    README
------------------------------------------------------------------------------------------------------------------------
Author:  Elmecker Alexander
Company: InnoTune elektrotechnik Severin Elmecker
Date:    24.08.2020
Project: InnoPlayMobile (LMS Skin)
------------------------------------------------------------------------------------------------------------------------

InnoTune LMS Skin mainly used for a unified design between the iOS and Android Apps.
This skin is used for controlling squeezeboxes and using functions of the InnoTune multiroom-system.

The project is base on following repository:
https://github.com/molobrakos/lms-mobileskin

Copy files to:
/usr/share/squeezeboxserver/HTML/m/

The skin is accessible by:
http://<Server-Address>:9000/m
Or the InnoPlay Mobile Apps (iOS/Android)

IDE of choice:
JetBrains WebStorm

Directory and File Descriptions
------------------------------------------------------------------------------------------------------------------------
Dir 'f7' contains the Framework files.
Dir 'html' contains images.
Dir 'lang' contains language json files.
Dir 'local' contains fonts/css/js libraries.
Dir 'pages' contains html files (not in use).

index.html    -> Main HTML file
mf7.js        -> Framework7 App
lms.js        -> lms rpc communication (base repo file)
m.js          -> main logic (custom/base repo file)
style.css     -> Custom Styles
sw.js         -> (base repo file)
swipe.js      -> carousel swipe (base repo file)
manifest.js   -> uses manifest.json
manifest.json -> contains infos about the project, theme and icon