const Tail = require('tail').Tail;
const Discord = require('discord.js');
const fs = require('fs');
const { exec, execSync } = require('child_process');
const base64encode = require('nodejs-base64').base64encode;
const death = require('death');

const config = require('./config.json');
const msgs = config.messages;
const Logger = require('./modules/logs.js');
const logger = new Logger(fs, config.logLocation);
const regexes = require('./modules/regexes.js');

const logfile = '/tmp/srb2kartoutput';

// general vars
var playerAmount = 0;
var firstboot = true;

// touch the outputfile
execSync(`touch ${logfile}`);

// a function to track the amount of users
function changeUserAmount (amount) {
	playerAmount += amount;
	playerAmount = Math.min(15, Math.max(0, playerAmount));
	logger.log(`Player count modified by ${amount}`);
	
	if (client.user) {
		try {
			client.user.setActivity(msgs.playing.replace('$1', playerAmount), { type: 'PLAYING' });
		} catch (e) {
			logger.log("Error while updating activity", true);
			let error = JSON.stringify(e);
			logger.log(error, true);
			try {
				client.channels.cache.get(config.discord.errorChannelId).send(
					`Error while updating activity! Error: \`\`\`\n${error}\n\`\`\``
				);
			} catch(e) {
				logger.log("Discord alert failed as well!!!", true);
			}
		}
	}
}

// send Discord Messages to many channels
function sendDiscordMessage(message, channels, name = '', from = null) {
	try {
		channels.forEach((c) => {
			let username = (name) ? `[${name}] ` : '';
			if (c != from) {
				client.channels.cache.get(c).send(username + message);
			}
		});
	} catch (e) {
		logger.log("Error while sending message to Discord", true);
		let error = JSON.stringify(e);
		logger.log(error, true);
		try {
			client.channels.cache.get(config.discord.errorChannelId).send(
				`Error while posting to Discord! Error: \`\`\`\n${error}\n\`\`\``
			);
		} catch(e) {
			logger.log("Discord alert failed as well!!!", true);
		}
	}
}

function sendErrorMessage(message, channel) {
	try {
		client.channels.cache.get(config.discord.errorChannelId).send(message);
	} catch(e) {
		logger.log("Failed to send the following message to Discord: " + message, true);
	}
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
	return String(str).replace(/\*/g, "\\*")
		.replace(/_/g, "\\_")
		.replace(/~/g, "\\~")
		.replace(/`/g, "\\`")
		.replace(/@everyone/g, msgs.pingEveryone)
		.replace(/@here/g, msgs.pingEveryone);
}

// run the game on a tmux session
var srb2kartCommand = `${config.srb2.executable} -dedicated -port ${config.srb2.port} `
	+ (config.srb2.advertise ? "+advertise 1 " : "")
	+ `-file `
    + `$(find ${config.srb2.addonsfolder} -type f | sort | tr '\n' ' ') `
	+ `2>&1 | tee -a ${logfile}`;

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
	logger.log(`Discord bot: Logged in as ${client.user.tag}`);
	changeUserAmount(0);
	sendDiscordMessage(msgs.booting, config.discord.channelIds);
});

client.login(config.discord.token);

// run the game, tail the logs

var srb2k = exec(shCommand, function (err, stdout, stderr) { 
	if (stderr) {
		logger.log('ERROR: ' + stderr, true);
	}
	if (err) {
		logger.log('ERROR: ' + err, true);
	}
});

tail = new Tail(logfile, "\n", {}, true);

// here we'll check every line tailed from the console's logs.
tail.on("line", (data) => {
	logger.log(data);

	// server is up?
	if (regexes.serverStarted.test(data)) {
		if (firstboot) {
			firstboot = false
			sendDiscordMessage(msgs.firstBoot, config.discord.channelIds);
		} else {
			// maybe there was a crash, reset just in case
			changeUserAmount(-9999);
			sendDiscordMessage(msgs.boot, config.discord.channelIds);
		}
	}
	// is it a message?
	else if (regexes.chatMessage.test(data)) {
		let msg = escapeDiscordMarkup(data);
		//check if it's a server message
		if (!regexes.serverMessage.test(data)) {
			sendDiscordMessage(msg, config.discord.channelIds);
		}
	}
	// a login?
	else if (config.srb2.srb2mode && regexes.srb2PlayerLogin) {
		changeUserAmount(1);
		let name = escapeDiscordMarkup(data.match(regexes.matchNameFromSrb2Login));
		sendDiscordMessage(
			msgs.joinedGame.replace('$1', name).replace('$2', playerAmount),
			config.discord.channelIds
		);
	}
	else if (regexes.playerLogin.test(data)) {
		changeUserAmount(1);
	}
	else if (regexes.firstNameChange.test(data)) {
		let name = escapeDiscordMarkup(data.match(regexes.matchNameFromNameChange));
		sendDiscordMessage(
			msgs.joinedGame.replace('$1', name).replace('$2', playerAmount),
			config.discord.channelIds
		);
	}
	// a map change?
	else if (config.srb2.showMapChange && regexes.mapChange.test(data)) {
		let name = escapeDiscordMarkup(data.match(regexes.matchMapFromMapChange));
		sendDiscordMessage(
			msgs.mapChange.replace('$1', name),
			config.discord.channelIds
		)
	}
	// player left?
	else if (regexes.playerLeft.test(data)) {
		changeUserAmount(-1);
		let name = escapeDiscordMarkup(String(data.match((regexes.matchNameFromLeft))).substring(1));
		sendDiscordMessage(
			msgs.leftGame.replace('$1', name).replace('$2', playerAmount),
			config.discord.channelIds
		);
	}
	// maybe an error?
	else if (
		String(data).toLowerCase().includes("error") 
		&& !String(data).includes("Next map given")
		&& !String(data).includes("printchat")
	) {
		logger.log(`Possible error: ${data}`);
		sendErrorMessage(`Possible error: ${data}`, config.discord.errorCHannelId)
	}
});

// send messages to the server

client.on('message', async (msg) => {
	if (!msg.author.bot && config.discord.channelIds.includes(msg.channelId)) {
		var username = sanitizeString(msg.author.username);
		var message = sanitizeString(msg.content);
		var toSend = `[${username}] ${message}`;	

		sendDiscordMessage(message, config.discord.channelIds, username, msg.channelId);

		var tmuxSendKeys = exec(`tmux send-keys -t srb2kart:0 'printchat "${toSend}"' C-m`, function (err, stdout, stderr) { 
			if (stderr) {
				logger.log(stderr);
			}
		});
	}
})

// just in case something goes awry.
// source: https://stackoverflow.com/questions/32719923/redirecting-stdout-to-file-nodejs
 /*
process.on('uncaughtException', function(err) {
	  console.error((err && err.stack) ? err.stack : err);
});
*/

// cleanup when we exit, make sure to close that tmux session also

death(function(signal, err) {
	var emoji = config.discord.errorEmoji;
	var toTag = "";

	logger.log("Server's dead, giving some time to close everything...", err);

	var tmuxKill = exec('tmux kill-session -t srb2kart', function (err, stdout, stderr) { 
	});

	sendErrorMessage(
		`Signal: ${signal} - Error: ${err}`
		, config.discord.errorChannelId
	)
	sendDiscordMessage(
		msgs.serverShutdown,
		config.discord.channelIds
	);

	setTimeout(() => {
		logger.log("Closing server...");
		process.exit()
	}, 2000);
});
