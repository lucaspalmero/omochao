#!/usr/bin/env bash
session="srb2kart"

echo about to kill ${session}, ok?
read -n 1 -s -r -p "Press key..."
echo 

sessiontest=`tmux ls | grep ${session}`

if [ "${sessiontest}" == "" ]; 
then
        echo no running session ${session}
else        
        for name in `tmux list-windows -F '#{window_name}' -t ${session}` ; do 

        tmux select-window -n

        for pane in `tmux list-panes -F '#{pane_id}' -t ${session}` ; do 
        tmux send-keys -t $pane C-c
        # send SIGINT to all panes in selected window
        echo ${session}:$name.${pane//%}
        done

        for pane in `tmux list-panes -F '#{pane_pid}' -t ${session}` ; do 
        kill -TERM ${pane}
        # terminate pane
        done

        done 
fi
