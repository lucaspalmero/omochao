#!/bin/bash
unencoded=$(echo ${SRB2SERVERSTART} | base64 -d)
echo $unencoded
while true
do
	# pls don't kill me
	eval $unencoded
	sleep 1
done
