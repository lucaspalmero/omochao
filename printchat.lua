local function printchat(p, text)
	 chatprint("\x84" .. text .. "\x80");
end
COM_AddCommand("printchat", printchat)
