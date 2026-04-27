#!/bin/bash
# Start the file server and the wrapper side by side. They run as
# independent processes — a crash in one does not affect the other.
# index.js is supervised: if it crashes, this script respawns it.
# Ctrl+C / SIGTERM breaks out cleanly and kills both via the trap.
trap 'kill 0; exit' INT TERM

node fileserver.js &

consec_fast=0
while true; do
	start=$(date +%s)
	node index.js
	ec=$?
	runtime=$(( $(date +%s) - start ))

	# 130 = SIGINT, 143 = SIGTERM — user asked us to stop, don't respawn
	if [ $ec -eq 130 ] || [ $ec -eq 143 ]; then
		break
	fi

	# crash-loop guard: if index.js keeps dying in <10s, give up so we
	# don't pin a CPU respawning a misconfigured wrapper
	if [ $runtime -lt 10 ]; then
		consec_fast=$((consec_fast + 1))
		if [ $consec_fast -ge 3 ]; then
			echo "[start.sh] index.js died 3 times in <10s — bailing out."
			exit 1
		fi
	else
		consec_fast=0
	fi

	echo "[start.sh] index.js exited with code $ec — restarting in 2s..."
	sleep 2
done
