#!/bin/bash

self_file="$0"
self_source_url="https://gist.githubusercontent.com/koter84/86790850aa63354bda56d041de31dc70/raw/blueprints_update.sh"

# defaults
_do_update="false"
_debug="false"

# create a temp file for downloading
_tempfile=$(mktemp -t blueprints_update.XXXXXX)

# set options
options=$(getopt -a -l "help,debug,update" -o "hdu" -- "$@")
eval set -- "$options"
while true
do
	case "$1" in
		-h|--help) 
			echo "for help, look at the source..."
			exit 0
			;;
		-d|--debug)
			_debug="true"
			;;
		-u|--update)
			_do_update="true"
			;;
		--)
			shift
			break;;
	esac
	shift
	sleep 1
done

# print debug function
function _blueprint_update_debug
{
	if [ "${_debug}" == "true" ]
	then
		echo "$@"
	fi
}

# check for self-updates
echo "> ${self_file}"
wget -q -O "${_tempfile}" "${self_source_url}"
wget_result=$?
if [ "${wget_result}" != "0" ]
then
	echo "! something went wrong while downloading, exiting..."
	exit
fi
self_diff=$(diff "${self_file}" "${_tempfile}")
if [ "${self_diff}" == "" ]
then
	echo "-> self up-2-date"
else
	if [ "${_do_update}" == "true" ]
	then
		cp "${_tempfile}" "${self_file}"
		chmod +x "${self_file}"
		echo "-! self updated!"
	else
		echo "-! self changed!"
	fi
fi
echo

# check for blueprints updates
cd /config/blueprints/
find . -type f -name "*.yaml" -print0 | while read -d $'\0' file
do
	echo "> ${file}"

	# get source url from file
	blueprint_source_url=$(grep source_url "${file}" | sed s/' *source_url: '//)
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

	# fix source if it's github gist
	if [ "$(echo "${blueprint_source_url}" | grep 'https://gist.github.com/')" != "" ]
	then
		_blueprint_update_debug "-! fix github gist url to raw"
		blueprint_source_url=$(echo "${blueprint_source_url}" | sed -e s/'https:\/\/gist.github.com\/'/'https:\/\/gist.githubusercontent.com\/'/ -e s/"\$"/"\/raw\/$(basename "${file}")"/)
		_blueprint_update_debug "-> fixed source_url: ${blueprint_source_url}"
	fi

	# check filename is the same
	if [ "$(basename "${file}")" != "$(basename "${blueprint_source_url}")" ]
	then
		echo "-! non-matching filename"
		_blueprint_update_debug "-! [$(basename "${file}")] != [$(basename "${blueprint_source_url}")]"
		echo
		continue
	fi

	_blueprint_update_debug "-> download blueprint"
	wget -q -O "${_tempfile}" "${blueprint_source_url}"
	wget_result=$?
	if [ "${wget_result}" != "0" ]
	then
		echo "-! something went wrong while downloading, exiting..."
		exit
	fi

	# insert the custom url, if it was in the original, and is not in the newly downloaded file
	if [ "${custom_source_url}" != "" ]
	then
		# check for source_url in the new source file
		new_blueprint_source_url=$(grep source_url "${_tempfile}" | sed s/' *source_url: '//)

		if [ "${new_blueprint_source_url}" == "" ]
		then
			_blueprint_update_debug "-! re-insert custom-url"
			sed -i "s;blueprint:;blueprint:\n  source_url: ${custom_source_url};" "${_tempfile}"
		else
			echo "-! there is now a source_url in the blueprint"
			echo "-! switched from [${blueprint_source_url}] to [${new_blueprint_source_url}]"
		fi
	fi

	_blueprint_update_debug "-> compare blueprints"
	blueprint_diff=$(diff "${file}" "${_tempfile}")
	if [ "${blueprint_diff}" == "" ]
	then
		echo "-> blueprint up-2-date"
	else
		if [ "${_do_update}" == "true" ]
		then
			cp "${_tempfile}" "${file}"
			need_reload="1"
			echo "-! blueprint updated!"
		else
			echo "-! blueprint changed!"
		fi
	fi

	echo
done

if [ "${need_reload}" == "1" ]
then
	echo "! there were updates, you should reload home assistant !"
fi

if [ -f "${_tempfile}" ]
then
	rm "${_tempfile}"
fi

echo "Process Completed"