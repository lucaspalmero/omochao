#!/bin/bash
# Start the file server and the wrapper side by side. They run as
# independent processes — a crash in one does not affect the other.
# Ctrl+C cleans up both via the EXIT trap.
trap 'kill 0' EXIT
node fileserver.js &
node index.js
wait
