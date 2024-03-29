module.exports = {
	chatMessage: /^<.{1,21}> .{0,223}/,
	playerLogin: /^\*Player [0-9]{1,2} has joined the game \(node [0-9]{1,2}\) \([0-9.:]{9,22}\)$/,
	srb2PlayerLogin: / has joined the game \(player [0-9]{1,2}\)$/,
	mapChange: /^Map is now.*/,
	firstNameChange: /^\*Player [0-9]{1,2} renamed to .{1,22}$/,
	nameChange: /^\*.{1,22} renamed to .{1,22}$/,
	playerLeft: /^\*.{1,22} left the game.*/,
	serverStarted: /^Entering main game loop\.\.\.$/,
	serverMessage: /^<~SERVER>.*/,
	matchNameFromNameChange: /(?<=Player [0-9]{1,2} renamed to ).{1,22}$/,
	matchNameFromSrb2Login: /.*(?= entered the game.)/,
	matchMapFromMapChange: /"MAP..: .*"/,
	matchNameFromLeft: /^.{1,22}(?= left the game)/
};
