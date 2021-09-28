# omochao

**omochao** is a simple (and quite hacky) Discord bot slash Node.js app that wraps around an SRB2Kart server in order to read and write from it.

## features

- chat between a server and multiple discord channels
- post some basic info and a few error reports to discord
- auto reboot the server if it crashes
- log to a file, timestamp all entries (yay)
- server console is still somewhat accessible if needed

## requirements

- Node.js
- Tmux

## how-to & instalation

- set up an application and a bot. if you don't know how, you can follow [this tutorial](https://buddy.works/tutorials/how-to-build-a-discord-bot-in-node-js-for-beginners) until step 2. make sure to save that token
- make sure you're using an up-to-date node version ([here's some help](https://askubuntu.com/questions/426750/how-can-i-update-my-nodejs-to-the-latest-version)). clone/download this repo, run `npm install`
- load the included `printchat.lua` file in your server. feel free to redistribute, modify, repack, or anything else you'd like to do with it
- create a new file named `config.json`, copy the contents of `config.template.json` in it and modify it as per your needs

if you ever need to access your server's console, you can do so by attaching the `srb2kart` Tmux session (`tmux attach -t srb2kart`). be aware though that the way this app manages to send messages to the server is by (ab)using the `send-keys` command. if someone sends a message while the server is running their message will be inputted to the console as if you were typing it.

## the config file

the config file is a simple JSON file. let's go over what each field does:
- `srb2`
  - `executable` set the srb2kart executable location. if you've installed it through apt, leave it as it is
  - `port` the port which the server will listen
  - `advertise` should this server be advertised on the Master Server?
  - `addonsfolder` the location of your addons folder. **omochao** will load all your files in alphabetical order. if you need to load files in different order, put them under some folders so that they're loaded in a certain order (i have three folders, `a_first`, `main`, `z_last`)
- `discord`
  - `token` app token goes here. if you've followed the guide I left in the *how-to* section, put here the token you copied on step 1
  - `channelIds` **omochao** will write to and read from these channels
  - `errorChannelId` if there's a nasty error, **omochao** will print some details in this channel. you should use a channel that's only visible to your server's staff
- `messages` customize **omochao**'s messages. you'll see some messages that include a $1 and maybe a $2, those are the parts omochao will replace with the actual values. make sure to put them if the examples include them, or else the app will fail spectacularly
  - `playing` **omochao**'s bot will set this as their Discord presence. 
  - `booting` printed when omochao boots
  - `firstBoot` printed on the first boot
  - `boot` if the server reboots for whatever reason, this message will be printed. consider tagging someone here
  - `pingEverone` if someone types `@everyone` while in-game, it will be replaced by this. good place for a bit of tomfoolery
  - `serverShutdown` printed when the server shuts down. consider tagging someone
  - `joinedGame` whenever someone joins
  - `leftGame` whenever someone leaves
- `logLocation` logfiles will be created in this location

## wait how does this work

omochao works by running the srb2kart server through a Tmux session. in order to be able to *read* from the console, omochao stores the console's output to /tmp/srb2kartoutput. in order to *write* to it, it uses Tmux's `send-keys` command.

## i want to see it in action

join the server i host, [MauroKart 64](https://placeholder.com.ar/mauro) (mainly spanish-speaking, though most of us are good at english).

## contributing

feel free to send PRs and request features. if you're aware of any possible security holes (i'm sure there's a few lying around) **please** let me know asap so I can push a fix.

contact me at `daibutsu#5089` or shoot me an email to `lucas@placeholder.com.ar`
