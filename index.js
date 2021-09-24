const Tail = require('tail').Tail;
const Discord = require('discord.js');
const fs = require('fs');
const exec = require('child_process').exec;
const base64encode = require('nodejs-base64').base64encode;
const death = require('death');

const config = require('./config.json');
const msgs = config.messages;
const logger = require('./modules/logs.js');
const regexes = require('./modules/regexes.js');

const logfile = '/tmp/srb2kartoutput';

// general vars
var playerAmount = 0;
var firstboot = true;

// a function to track the amount of users
function changeUserAmount (amount) {
	playerAmount += amount;
	amount = Math.min(15, Math.max(0, amount));
	logger(`Player count modified by ${amount}`);

	client.user.setActivity(msgs.playing.replace('$1', playerAmount), { type: 'PLAYING' });
}

// some string functions
function sanitizeString(str){
	return String(str).replace("á", "a")
		.replace("é", "e")
		.replace("í", "i")
		.replace("ó", "o")
		.replace("ú", "u")
		.replace("ñ", "n")
		.replace(/[^a-zA-Z0-9: \.,_-]/gim,"")
		.trim();
}

function escapeDiscordMarkup(str) {
	return String(str).replace("*", "\\*")
		.replace("_", "\\_")
		.replace("~", "\\~")
		.replace("`", "\\`")
		.replace("@everyone", msgs.pingEveryone);
}

// run the game on a tmux session
var srb2kartCommand = `${config.srb2.executable} -dedicated -port ${config.srb2.port} `
	+ (config.srb2.advertise ? "+advertise 1 " : "")
	+ `-config ${config.srb2.configFile} -file `
    + `$(find ${config.srb2.addonsfolder} -type f | sort | tr '\n' ' ') `
	+ `2>&1 | tee ${logfile}`;

/** 
 * send srb2kart's command to a tmux session that will run the server inside a while true loop.
 *
 * in case you're wondering, i'm base64encoding and decoding that to avoid 
 * dealing with escaping a ton of characters. not my proudest moment.
 */
var shCommand = 'tmux new-session -d -s srb2kart \'SRB2SERVERSTART=\"' 
	+ base64encode(srb2kartCommand) + '\" ./sh/runindefinitely.sh\'';

// start the discord bot

const client = new Discord.Client({ intents: ["GUILDS", "GUILD_MESSAGES"] });

client.once('ready', () => {
	logger(`Discord bot: Logged in as ${client.user.tag}`);
	changeUserAmount(0);
	client.channels.cache.get(config.discord.channelId).send(msgs.booting);
});

client.login(config.discord.token);

// run the game, tail the logs

var srb2k = exec(shCommand, function (err, stdout, stderr) { 
	if (stderr) {
		logger('ERROR: ' + stderr, true);
	}
	if (err) {
		logger('ERROR: ' + err, true);
	}
});

tail = new Tail(logfile, "\n", {}, true);

// here we'll check every line tailed from the console's logs.
tail.on("line", (data) => {
	logger(data);

	// server is up?
	if (regexes.serverStarted.test(data)) {
		if (firstboot) {
			firstboot = false
			client.channels.cache.get(config.discord.channelId).send(msgs.firstBoot);
		} else {
			client.channels.cache.get(config.discord.channelId).send(msgs.boot);
		}
	}
	// is it a message?
	else if (regexes.chatMessage.test(data)) {
		let msg = escapeDiscordMarkup(data);
		//check if it's a server message
		if (!regexes.serverMessage.test(data)) {
			client.channels.cache.get(config.discord.channelId).send(msg);
		}
	}
	// a login?
	else if (regexes.playerLogin.test(data)) {
		changeUserAmount(1);
	}
	else if (regexes.firstNameChange.test(data)) {
		let name = escapeDiscordMarkup(data.match(regexes.matchNameFromNameChange));
		client.channels.cache.get(config.discord.channelId).send(
			msgs.joinedGame.replace('$1', name).replace('$2', playerAmount)
		);
	}
	// player left?
	else if (regexes.playerLeft.test(data)) {
		changeUserAmount(-1);
		let name = escapeDiscordMarkup(data.match((regexes.matchNameFromLeft)).substring(1));
		client.channels.cache.get(config.discord.channelId).send(
			msgs.leftGame.replace('$1', name).replace('$2', playerAmount)
		);
	}
});

// send messages to the server

client.on('message', async (msg) => {
	if (!msg.author.bot && msg.channelId == config.discord.channelId) {
		var username = sanitizeString(msg.author.username);
		var message = sanitizeString(msg.content);
		var toSend = `[${username}] ${message}`;	

		logger(`Sending message to server: ${toSend}`);

		var tmuxSendKeys = exec(`tmux send-keys -t srb2kart:0 'printchat "${toSend}"' C-m`, function (err, stdout, stderr) { 
			if (stderr) {
				logger(stderr);
			}
			logger(`Sent!`);
		});
	}
})

// cleanup when we exit, make sure to close that tmux session also

death(function(signal, err) {
	var emoji = config.discord.errorEmoji;
	var toTag = "";

	logger("Server's dead, giving some time to close everything...", err);

	client.channels.cache.get(config.discord.errorChannelId).send(
		`Signal: ${signal} - Error: ${err}`
	);
	client.channels.cache.get(config.discord.channelId).send(msgs.serverShutdown);

	var tmuxKill = exec('tmux kill-session -t srb2kart', function (err, stdout, stderr) { 
	});

	setTimeout(() => {
		logger("Closing server...");
		process.exit()
	}, 2000);
});