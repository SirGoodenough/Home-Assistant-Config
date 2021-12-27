# Welcome to my Home Assistant Configuration

For those that have asked, here is how I split out my scripts file and still use the UI to do editing and making blueprints:

🔀 [Split Configuration HA Official Instructions](https://home-assistant.io/docs/configuration/splitting_configuration/)

🔀 [Doc and Frenck with a live Demo](https://youtu.be/FfjSA2o_0KA)

AND if you want to split your scripts up so that the script UI editor works and your files are split, [look here](https://community.home-assistant.io/t/script-editor-and-split-up-files/40459/20) 

Or go into a terminal in HA and do this:

```ln -f /config/scripts.yaml /config/#path_to_your_subfolder ```

and in configuration.yaml do this:

```script: !include_dir_merge_named /config/#path_to_your_subfolder```

Then put your split folders here for scripts.

This creates a symbolic link from the main script.yaml located in the subfolder.  The UI editor can destroy and create the one in the main filder on UI edits, and the one looked for in creating the system workings is in the dub folder as wel via a sym link.

Let me know if you have a suggestion.

**If you have any questions, comments or additions be sure to add an issue and bring them up on my Discord Server:** 

Also feel free to check out the code segments and Blueprints that I have on my Gist here:  https://gist.github.com/SirGoodenough

### Contact Links:
* [Discord WhatAreWeFixingToday](https://discord.gg/Uhmhu3B)
* [What are we Fixing Today Homepage](https://www.WhatAreWeFixing.Today/)
* [YouYube Channel Link](https://bit.ly/WhatAreWeFixingTodaysYT)
* [What are we Fixing Today Facebook page](https://bit.ly/WhatAreWeFixingTodayFB)
* [What are we Fixing Today Twitter](https://bit.ly/WhatAreWeFixingTodayTW)

### Please help support the channel:
* [Patreon Membership](https://www.patreon.com/WhatAreWeFixingToday)
* [Buy me Coffee](https://www.buymeacoffee.com/SirGoodenough)
* [PayPal one-off donation link](https://www.paypal.me/SirGoodenough)
* [Cash App \$CASHTAG](https://cash.me/$SirGoodenough)
* [Venmo cash link](https://venmo.com/SirGoodenough)


## Disclaimer

:warning: **DANGER OF ELECTROCUTION** :warning:

If your device connects to mains electricity (AC power) there is danger of electrocution if not installed properly. If you don't know how to install it, please call an electrician (***Beware:*** certain countries prohibit installation without a licensed electrician present). Remember: _**SAFETY FIRST**_. It is not worth the risk to yourself, your family and your home if you don't know exactly what you are doing. Never tinker or try to flash a device using the serial programming interface while it is connected to MAINS ELECTRICITY (AC power).

We don't take any responsibility nor liability for using this software nor for the installation or any tips, advice, videos, etc. given by any member of this site or any related site.
