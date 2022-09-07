#!/bin/bash

DeBuG="false"
function _blueprint_update_debug
{
	if [ "${DeBuG}" == "true" ]
	then
		echo "$@"
	fi
}

cd /config/blueprints/
for file in ./*/*/*.yaml
do
	echo "> ${file}"

	# get source url from file
	blueprint_source_url=$(grep source_url $file | sed s/' *source_url: '//)
	_blueprint_update_debug "-> source_url: ${blueprint_source_url}"

	# check for a value in source_url
	if [ "${blueprint_source_url}" == "" ]
	then
		echo "-! no source_url in file"
		echo
		continue
	fi

	# check for custom source_url (the source_url doesn't exist in the source file)
	custom_source_url=""
	if [ "$(echo "${blueprint_source_url}" | grep '^custom-')" != "" ]
	then
		_blueprint_update_debug "-! custom source_url set"
		custom_source_url="${blueprint_source_url}"
		blueprint_source_url="$(echo "${blueprint_source_url}" | sed s/'^custom-'//)"
	fi

	# fix source if it's regular github
	if [ "$(echo "${blueprint_source_url}" | grep 'https://github.com/')" != "" ]
	then
		_blueprint_update_debug "-! fix github url to raw"
		blueprint_source_url=$(echo "${blueprint_source_url}" | sed -e s/'https:\/\/github.com\/'/'https:\/\/raw.githubusercontent.com\/'/ -e s/'\/blob\/'/'\/'/)
		_blueprint_update_debug "-> fixed source_url: ${blueprint_source_url}"
	fi

	# check filename is the same
	if [ "$(basename ${file})" != "$(basename ${blueprint_source_url})" ]
	then
		echo "-! non-matching filename"
		_blueprint_update_debug "-! [$(basename ${file})] != [$(basename ${blueprint_source_url})]"
		echo
		continue
	fi

	_blueprint_update_debug "-> download blueprint"
	wget -q -O /tmp/blueprint_update.yaml "${blueprint_source_url}"

	# insert the custom url, if it was in the original, and is not in the newly downloaded file
	if [ "${custom_source_url}" != "" ]
	then
		# check for source_url in the new source file
		new_blueprint_source_url=$(grep source_url /tmp/blueprint_update.yaml | sed s/' *source_url: '//)

		if [ "${new_blueprint_source_url}" == "" ]
		then
			_blueprint_update_debug "-! re-insert custom-url"
			sed -i "s;blueprint:;blueprint:\n  source_url: ${custom_source_url};" /tmp/blueprint_update.yaml
		fi
	fi

	_blueprint_update_debug "-> compare blueprints"
	blueprint_diff=$(diff ${file} /tmp/blueprint_update.yaml)
	if [ "${blueprint_diff}" == "" ]
	then
		echo "-> blueprint up-2-date"
	else
		echo "-! blueprint changed!"
		cp /tmp/blueprint_update.yaml ${file}
		need_reload="1"
	fi

	echo
done

if [ "${need_reload}" == "1" ]
then
	echo "! reload automations"
	hass-cli service call automation.reload
fi

echo "Process Completed"