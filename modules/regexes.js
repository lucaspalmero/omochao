module.exports = {
	chatMessage: /^<.{1,21}> .{0,223}/,
	playerLogin: /^\*Player [0-9]{1,2} has joined the game \(node [0-9]{1,2}\) \([0-9.:]{9,22}\)$/,
	firstNameChange: /^\*Player [0-9]{1,2} renamed to .{1,22}$/,
	nameChange: /^\*.{1,22} renamed to .{1,22}$/,
	playerLeft: /^\*.{1,22} left the game.*/,
	matchNameFromNameChange: /(?<=Player [0-9]{1,2} renamed to ).{1,22}$/,
	serverStarted: /^Entering main game loop\.\.\.$/,
	serverMessage: /^<~SERVER>.*/,
	matchNameFromLeft: /^.{1,22}(?= left the game)/
};
